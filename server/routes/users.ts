import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryAll, queryOne, run } from '../database/db';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all users (CEO only)
router.get('/', authenticate, requireRole('CEO'), (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.query;
    let sql = 'SELECT id, name, email, role, avatar, phone, created_at FROM users WHERE 1=1';
    const params: any[] = [];

    if (role && role !== 'all') {
      sql += ' AND role = ?';
      params.push(role);
    }

    sql += ' ORDER BY created_at DESC';
    const users = queryAll(sql, params);
    return res.json({ success: true, count: users.length, users });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Foydalanuvchilarni yuklashda xatolik' });
  }
});

// POST create user (Cashier or CEO)
router.post('/', authenticate, requireRole('CEO'), (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role = 'CASHIER', phone = '' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Ism, email va parolni kiriting' });
    }

    const existing = queryOne('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (existing) {
      return res.status(400).json({ success: false, message: "Ushbu email allaqachon r'xatdan 'gan" });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const id = `usr_${Date.now()}`;
    const now = new Date().toISOString();
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`;

    run(
      `INSERT INTO users (id, name, email, password_hash, role, avatar, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), email.trim(), passwordHash, role, avatar, phone.trim(), now]
    );

    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Foydalanuvchi yaratildi', ?, ?, ?)`,
      [`aud_${Date.now()}`, req.user!.id, req.user!.name, `Yangi foydalanuvchi yaratildi: ${name.trim()} (${role})`, req.ip || '127.0.0.1', now]
    );

    const created = queryOne('SELECT id, name, email, role, avatar, phone, created_at FROM users WHERE id = ?', [id]);
    return res.status(201).json({ success: true, message: 'Foydalanuvchi yaratildi', user: created });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Foydalanuvchini yaratishda xatolik' });
  }
});

// DELETE user
router.delete('/:id', authenticate, requireRole('CEO'), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (id === req.user!.id) {
      return res.status(400).json({ success: false, message: "' hisobingizni 'hira olmaysiz" });
    }

    const user = queryOne<any>('SELECT name, role FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
    }

    run('DELETE FROM users WHERE id = ?', [id]);

    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Foydalanuvchi o\'chirildi', ?, ?, ?)`,
      [`aud_${Date.now()}`, req.user!.id, req.user!.name, `Foydalanuvchi 'hirildi: ${user.name} (${user.role})`, req.ip || '127.0.0.1', new Date().toISOString()]
    );

    return res.json({ success: true, message: "Foydalanuvchi muvaffaqiyatli 'hirildi" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Foydalanuvchini 'hirishda xatolik" });
  }
});

export default router;
