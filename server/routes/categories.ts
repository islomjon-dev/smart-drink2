import { Router, Request, Response } from 'express';
import { queryAll, queryOne, run } from '../database/db';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all categories with count of active products
router.get('/', (req: Request, res: Response) => {
  try {
    const categories = queryAll(`
      SELECT c.*, COUNT(p.id) as product_count 
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active'
      GROUP BY c.id
      ORDER BY c.display_order ASC, c.name ASC
    `);
    return res.json({ success: true, categories });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Toifalarni yuklashda xatolik' });
  }
});

// POST create category (CEO only)
router.post('/', authenticate, requireRole('CEO'), (req: AuthRequest, res: Response) => {
  try {
    const { name, description = '', icon = 'Tag', display_order = 0 } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Toifa nomini kiriting' });
    }

    const id = `cat_${Date.now()}`;
    const now = new Date().toISOString();

    run(
      `INSERT INTO categories (id, name, description, icon, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), description.trim(), icon, Number(display_order) || 0, now]
    );

    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Toifa q'hildi', ?, ?, ?)`,
      [`aud_${Date.now()}`, req.user!.id, req.user!.name, `Yangi toifa q'hildi: ${name.trim()}`, req.ip || '127.0.0.1', now]
    );

    const created = queryOne('SELECT * FROM categories WHERE id = ?', [id]);
    return res.status(201).json({ success: true, message: 'Toifa yaratildi', category: created });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Toifani yaratishda xatolik' });
  }
});

// PUT update category (CEO only)
router.put('/:id', authenticate, requireRole('CEO'), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, icon, display_order } = req.body;

    const current = queryOne('SELECT * FROM categories WHERE id = ?', [id]);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Toifa topilmadi' });
    }

    run(
      `UPDATE categories SET 
        name = COALESCE(?, name), 
        description = COALESCE(?, description), 
        icon = COALESCE(?, icon), 
        display_order = COALESCE(?, display_order)
       WHERE id = ?`,
      [name?.trim(), description?.trim(), icon, display_order != null ? Number(display_order) : null, id]
    );

    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Toifa tahrirlandi', ?, ?, ?)`,
      [`aud_${Date.now()}`, req.user!.id, req.user!.name, `Toifa ma'lumotlari yangilandi: ${name || current.name}`, req.ip || '127.0.0.1', new Date().toISOString()]
    );

    const updated = queryOne('SELECT * FROM categories WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Toifa yangilandi', category: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Toifani yangilashda xatolik' });
  }
});

// DELETE category (CEO only)
router.delete('/:id', authenticate, requireRole('CEO'), (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reassignToId } = req.body;

    const current = queryOne<any>('SELECT * FROM categories WHERE id = ?', [id]);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Toifa topilmadi' });
    }

    // Check products using this category
    const productCountRes = queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM products WHERE category_id = ?', [id]);
    const productCount = productCountRes?.cnt || 0;

    if (productCount > 0) {
      if (!reassignToId) {
        return res.status(400).json({
          success: false,
          message: `Ushbu toifada ${productCount} ta mahsulot mavjud! Toifani o'chirishdan oldin mahsulotlarni boshqa toifaga 'kazing yoki boshqa toifa ID sini k'sating.`
        });
      }

      // Reassign products
      run('UPDATE products SET category_id = ? WHERE category_id = ?', [reassignToId, id]);
    }

    run('DELETE FROM categories WHERE id = ?', [id]);

    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Toifa o'chirildi', ?, ?, ?)`,
      [`aud_${Date.now()}`, req.user!.id, req.user!.name, `Toifa o'chirildi: ${current.name}`, req.ip || '127.0.0.1', new Date().toISOString()]
    );

    return res.json({ success: true, message: "Toifa muvaffaqiyatli o'chirildi" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Toifani o'chirishda xatolik" });
  }
});

export default router;
