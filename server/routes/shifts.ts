import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run } from '../database/db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET current active shift
router.get('/current', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const shift = queryOne('SELECT * FROM shifts WHERE status = "open" ORDER BY opened_at DESC LIMIT 1');
    if (!shift) {
      return res.json({ success: true, active: false, shift: null });
    }

    // Dynamic calculations for the current shift
    const expectedCash = shift.opening_cash + shift.cash_sales - shift.refunds - shift.expenses;

    return res.json({
      success: true,
      active: true,
      shift: {
        ...shift,
        expected_cash: expectedCash
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Smena ma'lumotlarini yuklashda xatolik" });
  }
});

// GET all shifts (CEO & Cashier)
router.get('/', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const shifts = queryAll('SELECT * FROM shifts ORDER BY opened_at DESC LIMIT 50');
    return res.json({ success: true, count: shifts.length, shifts });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Smenalar tarixini yuklashda xatolik' });
  }
});

// POST start shift
router.post('/start', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { openingCash = 0, notes = '' } = req.body;

    // Check if an open shift already exists
    const existing = queryOne('SELECT id, cashier_name FROM shifts WHERE status = "open" LIMIT 1');
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Hozirda ochiq smena mavjud (${existing.cashier_name} tomonidan). Yangi smena ochishdan oldin amaldagini yoping.`
      });
    }

    const id = `shf_${Date.now()}`;
    const now = new Date().toISOString();
    const openingAmt = Math.max(0, Number(openingCash) || 0);

    run(
      `INSERT INTO shifts (id, cashier_id, cashier_name, opening_cash, actual_cash, expected_cash, cash_sales, card_sales, other_sales, refunds, expenses, status, notes, opened_at, closed_at)
       VALUES (?, ?, ?, ?, NULL, ?, 0, 0, 0, 0, 0, 'open', ?, ?, NULL)`,
      [id, req.user!.id, req.user!.name, openingAmt, openingAmt, notes || 'Yangi kassa smenasi ochildi', now]
    );

    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Smena ochildi', ?, ?, ?)`,
      [
        `aud_${Date.now()}`,
        req.user!.id,
        req.user!.name,
        `Kassa smenasi ochildi. Boshlan'ch naqd pul: ${openingAmt.toLocaleString('uz-UZ')} UZS`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    run(
      `INSERT INTO notifications (id, title, message, type, read, created_at)
       VALUES (?, 'Kassa smenasi ochildi', ?, 'shift_open', 0, ?)`,
      [`notif_${Date.now()}`, `${req.user!.name} yangi smenani ${openingAmt.toLocaleString('uz-UZ')} UZS bilan boshladi`, now]
    );

    const created = queryOne('SELECT * FROM shifts WHERE id = ?', [id]);
    return res.status(201).json({ success: true, message: 'Smena muvaffaqiyatli ochildi', shift: created });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Smenani ochishda xatolik yuz berdi' });
  }
});

// POST close shift
router.post('/close', authenticate, (req: AuthRequest, res: Response) => {
  try {
    const { actualCash, notes = '' } = req.body;

    const shift = queryOne<any>('SELECT * FROM shifts WHERE status = "open" ORDER BY opened_at DESC LIMIT 1');
    if (!shift) {
      return res.status(400).json({ success: false, message: "Hozirda yopish uchun ochiq smena y'" });
    }

    if (actualCash == null || isNaN(Number(actualCash))) {
      return res.status(400).json({ success: false, message: 'Kassadagi amaldagi naqd pul miqdorini kiriting' });
    }

    const actual = Number(actualCash);
    const expected = shift.opening_cash + shift.cash_sales - shift.refunds - shift.expenses;
    const difference = actual - expected;
    const now = new Date().toISOString();

    run(
      `UPDATE shifts SET 
        actual_cash = ?, 
        expected_cash = ?, 
        status = 'closed', 
        notes = ?, 
        closed_at = ?
       WHERE id = ?`,
      [actual, expected, notes || `Yopilish hisob-kitobi: Kutilgan=${expected}, Haqiqiy=${actual}, Farq=${difference}`, now, shift.id]
    );

    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Smena yopildi', ?, ?, ?)`,
      [
        `aud_${Date.now()}`,
        req.user!.id,
        req.user!.name,
        `Smena yopildi. Kutilgan: ${expected.toLocaleString('uz-UZ')} UZS, Haqiqiy: ${actual.toLocaleString('uz-UZ')} UZS, Farq: ${difference.toLocaleString('uz-UZ')} UZS`,
        req.ip || '127.0.0.1',
        now
      ]
    );

    run(
      `INSERT INTO notifications (id, title, message, type, read, created_at)
       VALUES (?, 'Kassa smenasi yopildi', ?, 'shift_close', 0, ?)`,
      [
        `notif_${Date.now()}`,
        `${shift.cashier_name} smenani yakunladi. Kutilgan: ${expected.toLocaleString('uz-UZ')} UZS, Haqiqiy: ${actual.toLocaleString('uz-UZ')} UZS (Farq: ${difference.toLocaleString('uz-UZ')} UZS)`,
        now
      ]
    );

    const closedShift = queryOne('SELECT * FROM shifts WHERE id = ?', [shift.id]);
    return res.json({
      success: true,
      message: 'Smena muvaffaqiyatli yopildi',
      shift: {
        ...closedShift,
        difference
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Smenani yopishda xatolik yuz berdi' });
  }
});

export default router;
