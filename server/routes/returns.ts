import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all return records
router.get('/', (req: Request, res: Response) => {
  try {
    const returns = queryAll(`
      SELECT r.*, 
        COUNT(ri.id) as item_count,
        SUM(ri.quantity) as total_returned_units
      FROM returns r
      LEFT JOIN return_items ri ON r.id = ri.return_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `);
    return res.json({ success: true, count: returns.length, returns });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Qaytarishlar tarixini yuklashda xatolik' });
  }
});

// POST process return / refund
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { orderId, items, reason, notes = '' } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: "Buyurtma ID si k'satilmagan" });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Qaytariladigan mahsulotlarni tanlang' });
    }
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Qaytarish sababini tanlang' });
    }

    const order = queryOne<any>('SELECT * FROM orders WHERE id = ? OR order_number = ?', [orderId, orderId]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: "Bekor qilingan buyurtmadan qaytarish qilib b'maydi" });
    }

    const orderItems = queryAll<any>('SELECT * FROM order_items WHERE order_id = ?', [order.id]);

    let totalRefundAmount = 0;
    const validatedReturnItems: any[] = [];

    for (const returnReqItem of items) {
      const targetOrderItem = orderItems.find(oi => oi.id === returnReqItem.orderItemId || oi.product_id === returnReqItem.productId);
      if (!targetOrderItem) {
        return res.status(400).json({ success: false, message: 'Buyurtmada bunday mahsulot mavjud emas' });
      }

      const availableToReturn = targetOrderItem.quantity - (targetOrderItem.returned_quantity || 0);
      const requestedQty = Number(returnReqItem.quantity);

      if (requestedQty <= 0) {
        return res.status(400).json({ success: false, message: "Qaytarish miqdori 0 dan katta b'ishi kerak" });
      }

      if (requestedQty > availableToReturn) {
        return res.status(400).json({
          success: false,
          message: `${targetOrderItem.product_name} dan maksimal ${availableToReturn} dona qaytarish mumkin. Xarid qilinganidan k' qaytarish mumkin emas!`
        });
      }

      const itemRefund = requestedQty * targetOrderItem.unit_price;
      totalRefundAmount += itemRefund;

      validatedReturnItems.push({
        orderItemId: targetOrderItem.id,
        productId: targetOrderItem.product_id,
        productName: targetOrderItem.product_name,
        quantity: requestedQty,
        refundPrice: targetOrderItem.unit_price
      });
    }

    const returnId = `ret_${Date.now()}`;
    const now = new Date().toISOString();

    // 1. Insert return record
    run(
      `INSERT INTO returns (id, order_id, order_number, cashier_id, cashier_name, total_refund_amount, payment_method, reason, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        returnId,
        order.id,
        order.order_number,
        req.user!.id,
        req.user!.name,
        totalRefundAmount,
        order.payment_method,
        reason,
        notes,
        now
      ]
    );

    // 2. Insert return items, restore stock and inventory movement
    for (const vItem of validatedReturnItems) {
      run(
        `INSERT INTO return_items (id, return_id, order_item_id, product_id, product_name, quantity, refund_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`ret_it_${Date.now()}_${Math.random()}`, returnId, vItem.orderItemId, vItem.productId, vItem.productName, vItem.quantity, vItem.refundPrice]
      );

      // Update order_item returned quantity
      run('UPDATE order_items SET returned_quantity = returned_quantity + ? WHERE id = ?', [vItem.quantity, vItem.orderItemId]);

      // Restore product stock
      run('UPDATE products SET quantity = quantity + ?, updated_at = ? WHERE id = ?', [vItem.quantity, now, vItem.productId]);

      // Record inventory movement
      run(
        `INSERT INTO inventory_movements (id, product_id, product_name, quantity, type, reason, user_id, user_name, created_at)
         VALUES (?, ?, ?, ?, 'return', ?, ?, ?, ?)`,
        [
          `mov_${Date.now()}_ret`,
          vItem.productId,
          vItem.productName,
          vItem.quantity,
          `Mijozdan qaytarildi (Sabab: ${reason}, Buyurtma: ${order.order_number})`,
          req.user!.id,
          req.user!.name,
          now
        ]
      );
    }

    // 3. Update order status: check if fully or partially returned
    const refreshedItems = queryAll<any>('SELECT quantity, returned_quantity FROM order_items WHERE order_id = ?', [order.id]);
    const totalOrdered = refreshedItems.reduce((acc, it) => acc + it.quantity, 0);
    const totalReturned = refreshedItems.reduce((acc, it) => acc + (it.returned_quantity || 0), 0);

    const newOrderStatus = totalReturned >= totalOrdered ? 'returned' : 'partially_returned';
    run('UPDATE orders SET status = ? WHERE id = ?', [newOrderStatus, order.id]);

    // 4. Update shift refunds if open shift
    const activeShift = queryOne<any>('SELECT * FROM shifts WHERE status = "open" LIMIT 1');
    if (activeShift) {
      run('UPDATE shifts SET refunds = refunds + ? WHERE id = ?', [totalRefundAmount, activeShift.id]);
    }

    // 5. Audit log
    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Mahsulot qaytarildi', ?, ?, ?)`,
      [
        `aud_${Date.now()}`,
        req.user!.id,
        req.user!.name,
        `Buyurtma ${order.order_number} b'icha ${totalRefundAmount.toLocaleString('uz-UZ')} UZS qaytarildi. Sabab: ${reason}`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    // 6. Notification
    run(
      `INSERT INTO notifications (id, title, message, type, read, created_at)
       VALUES (?, 'Mahsulot qaytarilishi amalga oshirildi', ?, 'return', 0, ?)`,
      [`notif_${Date.now()}`, `Buyurtma: ${order.order_number} - Qaytarilgan summa: ${totalRefundAmount.toLocaleString('uz-UZ')} UZS`, now]
    );

    return res.status(201).json({
      success: true,
      message: "Qaytarish muvaffaqiyatli amalga oshirildi va ombor qoldi' qayta tiklandi",
      refundAmount: totalRefundAmount,
      orderStatus: newOrderStatus
    });
  } catch (err: any) {
    console.error('Return processing error:', err);
    return res.status(500).json({ success: false, message: 'Qaytarish jarayonida xatolik yuz berdi' });
  }
});

export default router;
