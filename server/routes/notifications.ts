import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all notifications
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const notifications = queryAll('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
    const unreadCount = queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM notifications WHERE read = 0')?.cnt || 0;
    return res.json({ success: true, count: notifications.length, unreadCount, notifications });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Bildirishnomalarni yuklashda xatolik' });
  }
});

// PATCH mark single notification as read
router.patch('/:id/read', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    run('UPDATE notifications SET read = 1 WHERE id = ?', [id]);
    return res.json({ success: true, message: "'ilgan deb belgilandi" });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Xatolik' });
  }
});

// POST mark all as read
router.post('/mark-all-read', authenticate, (req: AuthRequest, res: Response) => {
  try {
    run('UPDATE notifications SET read = 1 WHERE read = 0');
    return res.json({ success: true, message: "Barcha bildirishnomalar 'ildi" });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Xatolik' });
  }
});

export default router;
