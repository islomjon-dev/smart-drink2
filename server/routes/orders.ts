import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run } from '../database/db';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET list orders
router.get('/', optionalAuth, (req: AuthRequest, res: Response) => {
  try {
    const { search, status, paymentMethod, startDate, endDate, customerId, limit = 50 } = req.query;

    let sql = `
      SELECT o.*, 
        COUNT(oi.id) as item_count,
        SUM(oi.quantity) as total_units
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    const params: any[] = [];

    // If customer role, restrict to their own orders
    if (req.user && req.user.role === 'CUSTOMER') {
      sql += ` AND (o.customer_id = ? OR LOWER(o.customer_name) = LOWER(?))`;
      params.push(req.user.id, req.user.name);
    } else if (customerId) {
      sql += ` AND o.customer_id = ?`;
      params.push(customerId);
    }

    if (search) {
      const s = `%${String(search).trim()}%`;
      sql += ` AND (o.order_number LIKE ? OR o.customer_name LIKE ? OR o.cashier_name LIKE ?)`;
      params.push(s, s, s);
    }

    if (status && status !== 'all') {
      sql += ` AND o.status = ?`;
      params.push(status);
    }

    if (paymentMethod && paymentMethod !== 'all') {
      sql += ` AND o.payment_method = ?`;
      params.push(paymentMethod);
    }

    if (startDate) {
      sql += ` AND o.created_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND o.created_at <= ?`;
      params.push(endDate);
    }

    sql += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT ?`;
    params.push(Number(limit));

    const orders = queryAll(sql, params);
    return res.json({ success: true, count: orders.length, orders });
  } catch (err: any) {
    console.error('Fetch orders error:', err);
    return res.status(500).json({ success: false, message: 'Buyurtmalarni yuklashda xatolik yuz berdi' });
  }
});

// GET single order details with items and return info
router.get('/:id', optionalAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const order = queryOne('SELECT * FROM orders WHERE id = ? OR order_number = ?', [id, id]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
    }

    // Check customer permission
    if (req.user && req.user.role === 'CUSTOMER' && order.customer_id && order.customer_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Ruxsat berilmagan' });
    }

    const items = queryAll(
      `SELECT oi.*, p.image_url, p.barcode, p.unit
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [order.id]
    );

    const returns = queryAll('SELECT * FROM returns WHERE order_id = ?', [order.id]);

    return res.json({
      success: true,
      order: {
        ...order,
        items,
        returns
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Buyurtma ma'lumotlarini yuklashda xatolik" });
  }
});

// POST create order (from POS or Customer Shop)
router.post('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      customerId,
      customerName,
      items,
      paymentMethod = 'cash',
      discount = 0,
      notes = ''
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Savat bo'sh! Mahsulot qo'shing" });
    }

    // Step 1: Validate stock for all items
    for (const it of items) {
      const p = queryOne<any>('SELECT * FROM products WHERE id = ?', [it.productId]);
      if (!p) {
        return res.status(400).json({ success: false, message: `Mahsulot topilmadi: ${it.productId}` });
      }
      if (p.status !== 'active') {
        return res.status(400).json({ success: false, message: `Mahsulot nofaol: ${p.name}` });
      }
      if (p.quantity < it.quantity) {
        return res.status(400).json({
          success: false,
          message: `Yetarli qoldiq mavjud emas! ${p.name} mahsulotidan atigi ${p.quantity} dona bor.`
        });
      }
    }

    // Calculate totals
    let subtotal = 0;
    const validatedItems: any[] = [];

    for (const it of items) {
      const p = queryOne<any>('SELECT * FROM products WHERE id = ?', [it.productId]);
      const qty = Number(it.quantity);
      const unitPrice = Number(p.selling_price);
      const itemTotal = qty * unitPrice;
      subtotal += itemTotal;

      validatedItems.push({
        productId: p.id,
        productName: p.name,
        quantity: qty,
        unitPrice,
        purchasePrice: Number(p.purchase_price),
        totalPrice: itemTotal,
        barcode: p.barcode,
        unit: p.unit
      });
    }

    const discountAmount = Math.max(0, Number(discount) || 0);
    const total = Math.max(0, subtotal - discountAmount);

    const now = new Date().toISOString();
    const orderId = `ord_${Date.now()}`;
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `SD-${dateCode}-${randomSuffix}`;

    // Cashier info
    const isCustomer = req.user?.role === 'CUSTOMER';
    const cashierId = isCustomer ? null : (req.user?.id || 'usr_cashier');
    const cashierName = isCustomer ? 'Onlayn Buyurtma' : (req.user?.name || 'Kassir');

    // Customer info
    let finalCustId = customerId || (req.user?.role === 'CUSTOMER' ? req.user.id : null);
    let finalCustName = customerName || (req.user?.role === 'CUSTOMER' ? req.user.name : 'Umumiy Xaridor');

    // Get active shift if any
    const activeShift = queryOne<any>('SELECT * FROM shifts WHERE status = "open" LIMIT 1');
    const shiftId = activeShift ? activeShift.id : null;

    // Step 2: Insert order
    run(
      `INSERT INTO orders (id, order_number, customer_id, customer_name, cashier_id, cashier_name, shift_id, subtotal, discount, tax, total, payment_method, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'completed', ?, ?)`,
      [
        orderId,
        orderNumber,
        finalCustId,
        finalCustName,
        cashierId,
        cashierName,
        shiftId,
        subtotal,
        discountAmount,
        total,
        paymentMethod,
        notes || (isCustomer ? "Onlayn d'on orqali xarid qilindi" : "Kassadan xarid qilindi"),
        now
      ]
    );

    // Step 3, 4, 5: Order items and Inventory deduction
    let itemCounter = 1;
    for (const it of validatedItems) {
      const orderItemId = `${orderId}_it_${itemCounter++}`;
      run(
        `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, purchase_price, total_price, returned_quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [orderItemId, orderId, it.productId, it.productName, it.quantity, it.unitPrice, it.purchasePrice, it.totalPrice]
      );

      // Decrement inventory
      run('UPDATE products SET quantity = quantity - ?, updated_at = ? WHERE id = ?', [it.quantity, now, it.productId]);

      // Record movement
      run(
        `INSERT INTO inventory_movements (id, product_id, product_name, quantity, type, reason, user_id, user_name, created_at)
         VALUES (?, ?, ?, ?, 'sale', ?, ?, ?, ?)`,
        [
          `mov_${Date.now()}_${itemCounter}`,
          it.productId,
          it.productName,
          it.quantity,
          `Savdo amalga oshirildi (Buyurtma: ${orderNumber})`,
          cashierId || 'system',
          cashierName,
          now
        ]
      );

      // Check if low stock reached
      const refreshed = queryOne<any>('SELECT quantity, min_stock, unit FROM products WHERE id = ?', [it.productId]);
      if (refreshed && refreshed.quantity <= refreshed.min_stock) {
        const notifType = refreshed.quantity <= 0 ? 'out_of_stock' : 'low_stock';
        run(
          `INSERT INTO notifications (id, title, message, type, read, created_at)
           VALUES (?, ?, ?, ?, 0, ?)`,
          [
            `notif_${Date.now()}_${refreshed.id}`,
            refreshed.quantity <= 0 ? `Mahsulot tugadi: ${it.productName}` : `Kam qoldiq ogohlantirishi: ${it.productName}`,
            `Qoldiq: ${refreshed.quantity} ${refreshed.unit}`,
            notifType,
            now
          ]
        );
      }
    }

    // Step 6: Update customer statistics if known
    if (finalCustId) {
      run(
        `UPDATE customers SET 
          total_orders = total_orders + 1, 
          total_spent = total_spent + ?, 
          last_order_date = ?
         WHERE id = ?`,
        [total, now, finalCustId]
      );
    }

    // Step 7: Update active shift amounts
    if (shiftId) {
      if (paymentMethod === 'cash') {
        run('UPDATE shifts SET cash_sales = cash_sales + ? WHERE id = ?', [total, shiftId]);
      } else if (paymentMethod === 'card') {
        run('UPDATE shifts SET card_sales = card_sales + ? WHERE id = ?', [total, shiftId]);
      } else {
        run('UPDATE shifts SET other_sales = other_sales + ? WHERE id = ?', [total, shiftId]);
      }
    }

    // Step 8: Audit log
    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Savdo amalga oshirildi', ?, ?, ?)`,
      [
        `aud_${Date.now()}`,
        cashierId || 'system',
        cashierName,
        `Yangi buyurtma rasmiylashtirildi: ${orderNumber} (${total.toLocaleString('uz-UZ')} UZS)`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    // Step 9: Notification
    run(
      `INSERT INTO notifications (id, title, message, type, read, created_at)
       VALUES (?, 'Yangi buyurtma rasmiylashtirildi', ?, 'order', 0, ?)`,
      [`notif_${Date.now()}`, `Buyurtma: ${orderNumber} - Summa: ${total.toLocaleString('uz-UZ')} UZS`, now]
    );

    // Step 10: Receipt payload
    const receipt = {
      storeName: 'SMART DRINK POS',
      storeAddress: "Toshkent sh., Amir Temur shox k'hasi, 45-uy",
      storePhone: '+998 71 200 44 88',
      orderId,
      orderNumber,
      date: new Date().toLocaleDateString('uz-UZ'),
      time: new Date().toLocaleTimeString('uz-UZ'),
      cashier: cashierName,
      customer: finalCustName,
      items: validatedItems,
      subtotal,
      discount: discountAmount,
      tax: 0,
      total,
      paymentMethod,
      footer: 'Xaridingiz uchun tashakkur! SMART DRINK - Har doim yangi va tetiklantiruvchi!',
      verificationUrl: `https://smartdrink.uz/receipt/${orderNumber}`
    };

    return res.status(201).json({
      success: true,
      message: 'Buyurtma muvaffaqiyatli rasmiylashtirildi',
      orderId,
      orderNumber,
      receipt
    });
  } catch (err: any) {
    console.error('Order creation error:', err);
    return res.status(500).json({ success: false, message: 'Buyurtmani rasmiylashtirishda xatolik yuz berdi' });
  }
});

// Cancel Order (CEO only)
router.patch('/:id/cancel', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const order = queryOne<any>('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Buyurtma allaqachon bekor qilingan' });
    }

    const items = queryAll<any>('SELECT * FROM order_items WHERE order_id = ?', [id]);
    const now = new Date().toISOString();

    // Restore stock
    for (const it of items) {
      const restorableQty = it.quantity - (it.returned_quantity || 0);
      if (restorableQty > 0) {
        run('UPDATE products SET quantity = quantity + ?, updated_at = ? WHERE id = ?', [restorableQty, now, it.product_id]);

        run(
          `INSERT INTO inventory_movements (id, product_id, product_name, quantity, type, reason, user_id, user_name, created_at)
           VALUES (?, ?, ?, ?, 'return', 'Buyurtma bekor qilingani sababli qoldiq qaytarildi', ?, ?, ?)`,
          [`mov_${Date.now()}_${it.id}`, it.product_id, it.product_name, restorableQty, req.user!.id, req.user!.name, now]
        );
      }
    }

    run('UPDATE orders SET status = "cancelled" WHERE id = ?', [id]);

    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Buyurtma bekor qilindi', ?, ?, ?)`,
      [`aud_${Date.now()}`, req.user!.id, req.user!.name, `Buyurtma bekor qilindi: ${order.order_number}`, req.ip || '127.0.0.1', now]
    );

    return res.json({ success: true, message: 'Buyurtma bekor qilindi va qoldiqlar qaytarildi' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Buyurtmani bekor qilishda xatolik' });
  }
});

export default router;
