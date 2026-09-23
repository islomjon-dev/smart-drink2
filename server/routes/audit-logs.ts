import { Router, Request, Response } from 'express';
import { queryAll } from '../database/db';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET audit logs (CEO only)
router.get('/', authenticate, requireRole('CEO'), (req: AuthRequest, res: Response) => {
  try {
    const { search, limit = 100 } = req.query;

    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (search) {
      const s = `%${String(search).trim()}%`;
      sql += ' AND (user_name LIKE ? OR action LIKE ? OR description LIKE ?)';
      params.push(s, s, s);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Number(limit));

    const logs = queryAll(sql, params);
    return res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Audit jurnallarini yuklashda xatolik' });
  }
});

export default router;
