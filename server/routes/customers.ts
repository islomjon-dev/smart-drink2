import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all customers with search and sorting
router.get('/', (req: Request, res: Response) => {
  try {
    const { search, limit = 50 } = req.query;

    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params: any[] = [];

    if (search) {
      const s = `%${String(search).trim()}%`;
      sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(s, s, s);
    }

    sql += ' ORDER BY total_spent DESC, created_at DESC LIMIT ?';
    params.push(Number(limit));

    const customers = queryAll(sql, params);
    return res.json({ success: true, count: customers.length, customers });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Mijozlarni yuklashda xatolik' });
  }
});

// GET single customer by ID with orders
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Mijoz topilmadi' });
    }

    const orders = queryAll(
      `SELECT o.*, COUNT(oi.id) as item_count 
       FROM orders o 
       LEFT JOIN order_items oi ON o.id = oi.order_id 
       WHERE o.customer_id = ? 
       GROUP BY o.id 
       ORDER BY o.created_at DESC`,
      [id]
    );

    return res.json({ success: true, customer: { ...customer, orders } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Mijoz tafsilotlarini yuklashda xatolik' });
  }
});

// POST create customer
router.post('/', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { name, email = '', phone = '', avatar = '' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Mijoz ismini kiriting' });
    }

    const id = `c_${Date.now()}`;
    const now = new Date().toISOString();
    const custAvatar = avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`;

    run(
      `INSERT INTO customers (id, name, email, phone, avatar, total_orders, total_spent, last_order_date, created_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, NULL, ?)`,
      [id, name.trim(), email.trim(), phone.trim(), custAvatar, now]
    );

    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Mijoz q'hildi', ?, ?, ?)`,
      [`aud_${Date.now()}`, req.user!.id, req.user!.name, `Yangi mijoz yaratildi: ${name.trim()}`, req.ip || '127.0.0.1', now]
    );

    const created = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
    return res.status(201).json({ success: true, message: 'Mijoz muvaffaqiyatli saqlandi', customer: created });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Mijozni saqlashda xatolik' });
  }
});

// PUT update customer
router.put('/:id', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, avatar } = req.body;

    const current = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Mijoz topilmadi' });
    }

    run(
      `UPDATE customers SET 
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        avatar = COALESCE(?, avatar)
       WHERE id = ?`,
      [name?.trim(), email?.trim(), phone?.trim(), avatar, id]
    );

    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Mijoz yangilandi', ?, ?, ?)`,
      [`aud_${Date.now()}`, req.user!.id, req.user!.name, `Mijoz ma'lumotlari tahrirlandi: ${name || current.name}`, req.ip || '127.0.0.1', new Date().toISOString()]
    );

    const updated = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Mijoz yangilandi', customer: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Mijozni yangilashda xatolik' });
  }
});

// DELETE customer
router.delete('/:id', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const current = queryOne('SELECT * FROM customers WHERE id = ?', [id]);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Mijoz topilmadi' });
    }

    run('DELETE FROM customers WHERE id = ?', [id]);

    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Mijoz o'chirildi', ?, ?, ?)`,
      [`aud_${Date.now()}`, req.user!.id, req.user!.name, `Mijoz o'chirildi: ${current.name}`, req.ip || '127.0.0.1', new Date().toISOString()]
    );

    return res.json({ success: true, message: "Mijoz muvaffaqiyatli o'chirildi" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Mijozni o'chirishda xatolik" });
  }
});

export default router;
