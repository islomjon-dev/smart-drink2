import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run } from '../database/db';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all products with search, category, stock status filters, sorting
router.get('/', (req: Request, res: Response) => {
  try {
    const { search, category, stockStatus, status, sortBy, sortOrder } = req.query;

    let sql = `
      SELECT p.*, c.name as category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search) {
      const s = `%${String(search).trim()}%`;
      sql += ` AND (p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)`;
      params.push(s, s, s, s);
    }

    if (category && category !== 'all') {
      sql += ` AND p.category_id = ?`;
      params.push(category);
    }

    if (status && status !== 'all') {
      sql += ` AND p.status = ?`;
      params.push(status);
    }

    if (stockStatus) {
      if (stockStatus === 'in_stock') {
        sql += ` AND p.quantity > p.min_stock`;
      } else if (stockStatus === 'low_stock') {
        sql += ` AND p.quantity > 0 AND p.quantity <= p.min_stock`;
      } else if (stockStatus === 'out_of_stock') {
        sql += ` AND p.quantity <= 0`;
      }
    }

    // Sorting
    let orderClause = 'ORDER BY p.name ASC';
    const dir = String(sortOrder).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    if (sortBy === 'price') {
      orderClause = `ORDER BY p.selling_price ${dir}`;
    } else if (sortBy === 'quantity') {
      orderClause = `ORDER BY p.quantity ${dir}`;
    } else if (sortBy === 'created_at') {
      orderClause = `ORDER BY p.created_at ${dir}`;
    } else if (sortBy === 'name') {
      orderClause = `ORDER BY p.name ${dir}`;
    }

    sql += ` ${orderClause}`;

    const products = queryAll(sql, params);
    return res.json({ success: true, count: products.length, products });
  } catch (err: any) {
    console.error('Products error:', err);
    return res.status(500).json({ success: false, message: 'Mahsulotlarni yuklashda xatolik yuz berdi' });
  }
});

// GET single product by ID or barcode
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let product = queryOne(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = ? OR p.barcode = ?`,
      [id, id]
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' });
    }

    return res.json({ success: true, product });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Mahsulotni yuklashda xatolik' });
  }
});

// POST create new product (CEO only)
router.post('/', authenticate, requireRole('CEO'), (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      category_id,
      description = '',
      purchase_price,
      selling_price,
      quantity = 0,
      min_stock = 5,
      unit = 'dona',
      barcode,
      sku,
      image_url = '',
      status = 'active'
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Mahsulot nomini kiritish shart' });
    }
    if (!category_id) {
      return res.status(400).json({ success: false, message: 'Toifani tanlang' });
    }
    if (purchase_price == null || purchase_price < 0) {
      return res.status(400).json({ success: false, message: "Kelish narxini t''ri kiriting" });
    }
    if (selling_price == null || selling_price < 0) {
      return res.status(400).json({ success: false, message: "Sotish narxini t''ri kiriting" });
    }

    const pBarcode = barcode ? barcode.trim() : `478${Date.now().toString().slice(-9)}`;
    const pSku = sku ? sku.trim() : `SKU-${Date.now().toString().slice(-6)}`;

    // Check barcode conflict
    const existing = queryOne('SELECT id FROM products WHERE barcode = ?', [pBarcode]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Ushbu shtrix-kod boshqa mahsulotga biriktirilgan' });
    }

    const id = `p_${Date.now()}`;
    const now = new Date().toISOString();

    run(
      `INSERT INTO products (id, name, category_id, description, purchase_price, selling_price, quantity, min_stock, unit, barcode, sku, image_url, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name.trim(),
        category_id,
        description.trim(),
        Number(purchase_price),
        Number(selling_price),
        Number(quantity),
        Number(min_stock),
        unit,
        pBarcode,
        pSku,
        image_url || '/src/assets/images/smart_drink_hero_1790182172012.jpg',
        status,
        now,
        now
      ]
    );

    // Initial movement
    if (Number(quantity) > 0) {
      run(
        `INSERT INTO inventory_movements (id, product_id, product_name, quantity, type, reason, user_id, user_name, created_at)
         VALUES (?, ?, ?, ?, 'purchase', 'Mahsulot yaratildi va boshlan'ch qoldiq kiritildi', ?, ?, ?)`,
        [`mov_${Date.now()}`, id, name.trim(), Number(quantity), req.user!.id, req.user!.name, now]
      );
    }

    // Audit log
    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Mahsulot q'hildi', ?, ?, ?)`,
      [`aud_${Date.now()}`, req.user!.id, req.user!.name, `Yangi mahsulot yaratildi: ${name.trim()} (${pBarcode})`, req.ip || '127.0.0.1', now]
    );

    const created = queryOne('SELECT * FROM products WHERE id = ?', [id]);
    return res.status(201).json({ success: true, message: 'Mahsulot muvaffaqiyatli yaratildi', product: created });
  } catch (err: any) {
    console.error('Create product error:', err);
    return res.status(500).json({ success: false, message: 'Mahsulotni saqlashda xatolik yuz berdi' });
  }
});

// PUT update product (CEO only)
router.put('/:id', authenticate, requireRole('CEO'), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const current = queryOne<any>('SELECT * FROM products WHERE id = ?', [id]);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' });
    }

    const {
      name,
      category_id,
      description,
      purchase_price,
      selling_price,
      quantity,
      min_stock,
      unit,
      barcode,
      sku,
      image_url,
      status
    } = req.body;

    const now = new Date().toISOString();
    const newQty = quantity != null ? Number(quantity) : current.quantity;
    const qtyDiff = newQty - current.quantity;

    run(
      `UPDATE products SET 
        name = ?, 
        category_id = ?, 
        description = ?, 
        purchase_price = ?, 
        selling_price = ?, 
        quantity = ?, 
        min_stock = ?, 
        unit = ?, 
        barcode = ?, 
        sku = ?, 
        image_url = ?, 
        status = ?, 
        updated_at = ?
       WHERE id = ?`,
      [
        name != null ? name.trim() : current.name,
        category_id || current.category_id,
        description != null ? description : current.description,
        purchase_price != null ? Number(purchase_price) : current.purchase_price,
        selling_price != null ? Number(selling_price) : current.selling_price,
        newQty,
        min_stock != null ? Number(min_stock) : current.min_stock,
        unit || current.unit,
        barcode != null ? barcode.trim() : current.barcode,
        sku != null ? sku.trim() : current.sku,
        image_url || current.image_url,
        status || current.status,
        now,
        id
      ]
    );

    // Record stock movement if quantity was adjusted manually
    if (qtyDiff !== 0) {
      run(
        `INSERT INTO inventory_movements (id, product_id, product_name, quantity, type, reason, user_id, user_name, created_at)
         VALUES (?, ?, ?, ?, 'manual_adjustment', ?, ?, ?, ?)`,
        [
          `mov_${Date.now()}`,
          id,
          name || current.name,
          Math.abs(qtyDiff),
          `Qoldiq q'da 'gartirildi (${current.quantity} -> ${newQty})`,
          req.user!.id,
          req.user!.name,
          now
        ]
      );
    }

    // Audit log
    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Mahsulot tahrirlandi', ?, ?, ?)`,
      [`aud_${Date.now()}`, req.user!.id, req.user!.name, `Mahsulot m'umotlari 'gartirildi: ${name || current.name}`, req.ip || '127.0.0.1', now]
    );

    const updated = queryOne('SELECT * FROM products WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Mahsulot muvaffaqiyatli yangilandi', product: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Mahsulotni yangilashda xatolik yuz berdi' });
  }
});

// DELETE product (CEO only)
router.delete('/:id', authenticate, requireRole('CEO'), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const current = queryOne<any>('SELECT * FROM products WHERE id = ?', [id]);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Mahsulot topilmadi' });
    }

    // Check if product is referenced in orders
    const orderItem = queryOne('SELECT id FROM order_items WHERE product_id = ? LIMIT 1', [id]);
    if (orderItem) {
      // Safely deactivate instead of breaking order history
      run(`UPDATE products SET status = 'inactive', updated_at = ? WHERE id = ?`, [new Date().toISOString(), id]);
      return res.json({
        success: true,
        message: "Mahsulot avvalgi buyurtmalarda mavjud b'gani sababli faolsizlantirildi (tarix saqlanib qoldi)"
      });
    }

    run('DELETE FROM products WHERE id = ?', [id]);

    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Mahsulot o\'chirildi', ?, ?, ?)`,
      [`aud_${Date.now()}`, req.user!.id, req.user!.name, `Mahsulot bazadan 'hirildi: ${current.name}`, req.ip || '127.0.0.1', new Date().toISOString()]
    );

    return res.json({ success: true, message: "Mahsulot muvaffaqiyatli 'hirildi" });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: "Mahsulotni 'hirishda xatolik yuz berdi" });
  }
});

export default router;
