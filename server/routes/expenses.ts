import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run } from '../database/db';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all expenses with category and date filter
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { category, startDate, endDate, limit = 100 } = req.query;

    let sql = 'SELECT * FROM expenses WHERE 1=1';
    const params: any[] = [];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (startDate) {
      sql += ' AND created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND created_at <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Number(limit));

    const expenses = queryAll(sql, params);
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    return res.json({ success: true, count: expenses.length, totalAmount, expenses });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Xarajatlarni yuklashda xatolik' });
  }
});

// POST create expense
router.post('/', authenticate, requireRole('CEO', 'CASHIER'), (req: AuthRequest, res: Response) => {
  try {
    const { title, category, amount, description = '' } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Xarajat nomini kiriting' });
    }
    if (!category) {
      return res.status(400).json({ success: false, message: 'Toifani tanlang' });
    }
    const amtNum = Number(amount);
    if (!amtNum || amtNum <= 0) {
      return res.status(400).json({ success: false, message: "Xarajat summasi 0 dan katta bo'lishi kerak" });
    }

    const id = `exp_${Date.now()}`;
    const now = new Date().toISOString();

    run(
      `INSERT INTO expenses (id, title, category, amount, description, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, title.trim(), category, amtNum, description.trim(), req.user!.name, now]
    );

    // If there is an active shift, track expense in shift
    const activeShift = queryOne<any>('SELECT id FROM shifts WHERE status = "open" LIMIT 1');
    if (activeShift) {
      run('UPDATE shifts SET expenses = expenses + ? WHERE id = ?', [amtNum, activeShift.id]);
    }

    // Audit log
    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Xarajat q'hildi', ?, ?, ?)`,
      [
        `aud_${Date.now()}`,
        req.user!.id,
        req.user!.name,
        `Yangi xarajat kiritildi: ${title.trim()} (${amtNum.toLocaleString('uz-UZ')} UZS)`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    const created = queryOne('SELECT * FROM expenses WHERE id = ?', [id]);
    return res.status(201).json({ success: true, message: 'Xarajat muvaffaqiyatli saqlandi', expense: created });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Xarajatni saqlashda xatolik' });
  }
});

// DELETE expense (CEO only)
router.delete('/:id', authenticate, requireRole('CEO'), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const current = queryOne<any>('SELECT * FROM expenses WHERE id = ?', [id]);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Xarajat topilmadi' });
    }

    run('DELETE FROM expenses WHERE id = ?', [id]);

    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Xarajat o'chirildi', ?, ?, ?)`,
      [`aud_${Date.now()}`, req.user!.id, req.user!.name, `Xarajat o'chirildi: ${current.title}`, req.ip || '127.0.0.1', new Date().toISOString()]
    );

    return res.json({ success: true, message: "Xarajat o'chirildi" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Xarajatni o'chirishda xatolik" });
  }
});

export default router;
