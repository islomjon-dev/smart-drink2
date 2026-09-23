import { Router, Request, Response } from 'express';
import { queryOne, run } from '../database/db';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET store settings
router.get('/', (req: Request, res: Response) => {
  try {
    const settings = queryOne('SELECT * FROM settings LIMIT 1');
    return res.json({ success: true, settings });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Sozlamalarni yuklashda xatolik' });
  }
});

// PUT update store settings (CEO only)
router.put('/', authenticate, requireRole('CEO'), (req: AuthRequest, res: Response) => {
  try {
    const {
      store_name,
      store_logo,
      store_address,
      phone,
      email,
      currency,
      tax_rate,
      receipt_footer,
      low_stock_threshold,
      theme,
      language
    } = req.body;

    const current = queryOne<any>('SELECT * FROM settings LIMIT 1');
    if (!current) {
      return res.status(404).json({ success: false, message: 'Sozlamalar topilmadi' });
    }

    run(
      `UPDATE settings SET 
        store_name = COALESCE(?, store_name),
        store_logo = COALESCE(?, store_logo),
        store_address = COALESCE(?, store_address),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        currency = COALESCE(?, currency),
        tax_rate = COALESCE(?, tax_rate),
        receipt_footer = COALESCE(?, receipt_footer),
        low_stock_threshold = COALESCE(?, low_stock_threshold),
        theme = COALESCE(?, theme),
        language = COALESCE(?, language)
       WHERE id = ?`,
      [
        store_name?.trim(),
        store_logo,
        store_address?.trim(),
        phone?.trim(),
        email?.trim(),
        currency || 'UZS',
        tax_rate != null ? Number(tax_rate) : current.tax_rate,
        receipt_footer,
        low_stock_threshold != null ? Number(low_stock_threshold) : current.low_stock_threshold,
        theme,
        language,
        current.id
      ]
    );

    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Sozlamalar yangilandi', ?, ?, ?)`,
      [`aud_${Date.now()}`, req.user!.id, req.user!.name, "D'on asosiy sozlamalari yangilandi", req.ip || '127.0.0.1', new Date().toISOString()]
    );

    const updated = queryOne('SELECT * FROM settings LIMIT 1');
    return res.json({ success: true, message: 'Sozlamalar muvaffaqiyatli saqlandi', settings: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Sozlamalarni saqlashda xatolik' });
  }
});

export default router;
