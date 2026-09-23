import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run } from '../database/db';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET inventory summary and product stock levels
router.get('/', (req: Request, res: Response) => {
  try {
    const products = queryAll(`
      SELECT 
        p.id, 
        p.name, 
        p.category_id, 
        c.name as category_name,
        p.purchase_price, 
        p.selling_price, 
        p.quantity, 
        p.min_stock, 
        p.unit, 
        p.barcode, 
        p.sku, 
        p.image_url, 
        p.status,
        (p.purchase_price * p.quantity) as total_purchase_value,
        (p.selling_price * p.quantity) as total_retail_value,
        CASE 
          WHEN p.quantity <= 0 THEN 'out_of_stock'
          WHEN p.quantity <= p.min_stock THEN 'low_stock'
          ELSE 'in_stock'
        END as stock_status
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY 
        CASE 
          WHEN p.quantity <= 0 THEN 1
          WHEN p.quantity <= p.min_stock THEN 2
          ELSE 3
        END ASC,
        p.name ASC
    `);

    // Summary calculations
    let totalItems = 0;
    let totalPurchaseVal = 0;
    let totalRetailVal = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      totalItems += p.quantity;
      totalPurchaseVal += p.total_purchase_value;
      totalRetailVal += p.total_retail_value;
      if (p.stock_status === 'low_stock') lowStockCount++;
      if (p.stock_status === 'out_of_stock') outOfStockCount++;
    }

    return res.json({
      success: true,
      summary: {
        totalProducts: products.length,
        totalUnits: totalItems,
        totalPurchaseValue: Math.round(totalPurchaseVal),
        totalRetailValue: Math.round(totalRetailVal),
        expectedProfit: Math.round(totalRetailVal - totalPurchaseVal),
        lowStockCount,
        outOfStockCount
      },
      products
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Ombor ma'lumotlarini yuklashda xatolik" });
  }
});

// GET stock movement history
router.get('/movements', (req: Request, res: Response) => {
  try {
    const { productId, type, limit = 100 } = req.query;

    let sql = `
      SELECT m.*, p.barcode, p.unit
      FROM inventory_movements m
      LEFT JOIN products p ON m.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (productId) {
      sql += ` AND m.product_id = ?`;
      params.push(productId);
    }

    if (type && type !== 'all') {
      sql += ` AND m.type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY m.created_at DESC LIMIT ?`;
    params.push(Number(limit));

    const movements = queryAll(sql, params);
    return res.json({ success: true, count: movements.length, movements });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Harakatlar tarixini yuklashda xatolik' });
  }
});

// POST stock adjustment (Stock-In, Stock-Out, Damaged, Adjustment)
router.post('/adjust', authenticate, requireRole('CEO'), (req: AuthRequest, res: Response) => {
  try {
    const { productId, type, quantity, reason } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Mahsulotni tanlang' });
    }
    const qtyNum = Number(quantity);
    if (!qtyNum || qtyNum <= 0) {
      return res.status(400).json({ success: false, message: 'Miqdorni musbat son sifatida kiriting' });
    }
    if (!['purchase', 'manual_adjustment', 'damaged', 'other'].includes(type)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri harakat turi" });
    }

    const product = queryOne<any>('SELECT * FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' });
    }

    let newQuantity = product.quantity;
    if (type === 'purchase') {
      newQuantity += qtyNum;
    } else if (type === 'damaged') {
      if (product.quantity < qtyNum) {
        return res.status(400).json({ success: false, message: "Ombordagi mavjud qoldiqdan ortiq yaroqsiz deb chiqarib bo'lmaydi" });
      }
      newQuantity -= qtyNum;
    } else if (type === 'manual_adjustment') {
      // In manual adjustment, quantity can replace or delta. Here quantity represents new set value if specified or delta.
      newQuantity = qtyNum;
    } else {
      newQuantity = Math.max(0, newQuantity - qtyNum);
    }

    const now = new Date().toISOString();

    run('UPDATE products SET quantity = ?, updated_at = ? WHERE id = ?', [newQuantity, now, productId]);

    // Record movement
    run(
      `INSERT INTO inventory_movements (id, product_id, product_name, quantity, type, reason, user_id, user_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `mov_${Date.now()}`,
        productId,
        product.name,
        qtyNum,
        type,
        reason || "Ombor balansi o'zgartirildi",
        req.user!.id,
        req.user!.name,
        now
      ]
    );

    // If low stock, trigger notification
    if (newQuantity <= product.min_stock) {
      const notifType = newQuantity <= 0 ? 'out_of_stock' : 'low_stock';
      const notifTitle = newQuantity <= 0 ? `Mahsulot tugadi: ${product.name}` : `Kam qoldiq ogohlantirishi: ${product.name}`;
      run(
        `INSERT INTO notifications (id, title, message, type, read, created_at)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [`notif_${Date.now()}`, notifTitle, `Omborda ${product.name} qoldi': ${newQuantity} ${product.unit}`, notifType, now]
      );
    }

    // Audit log
    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Ombor harakati', ?, ?, ?)`,
      [
        `aud_${Date.now()}`,
        req.user!.id,
        req.user!.name,
        `${product.name} uchun ${type} harakati: ${qtyNum} dona (${product.quantity} -> ${newQuantity})`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    return res.json({
      success: true,
      message: "Ombor qoldi' muvaffaqiyatli yangilandi",
      currentQuantity: newQuantity
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Ombor harakatini bajarishda xatolik' });
  }
});

export default router;
