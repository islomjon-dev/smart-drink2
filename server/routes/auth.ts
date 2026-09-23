import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryOne, run } from '../database/db';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Login with Email and Password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email va parolni kiriting' });
    }

    const user = queryOne<any>('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Bunday email mavjud emas' });
    }

    // Verify password hash
    let isValid = false;
    if (user.password_hash) {
      isValid = bcrypt.compareSync(password, user.password_hash);
    }

    // Allow default passwords if hash matched or testing
    if (!isValid && (password === 'admin123' && user.role === 'CEO' || password === 'kassir123' && user.role === 'CASHIER' || password === 'customer123')) {
      isValid = true;
    }

    if (!isValid) {
      return res.status(401).json({ success: false, message: "Parol noto'g'ri" });
    }

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    });

    const now = new Date().toISOString();
    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Tizimga kirish', ?, ?, ?)`,
      [`aud_${Date.now()}`, user.id, user.name, `${user.name} (${user.role}) email orqali kirdi`, req.ip || '127.0.0.1', now]
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        createdAt: user.created_at
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Tizimda xatolik yuz berdi' });
  }
});

// Google Authentication (Sign in / Sign up via Google account)
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { email, name, avatar, rolePreference } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Google akkaunt emaili taqdim etilmadi' });
    }

    let user = queryOne<any>('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    const now = new Date().toISOString();

    if (!user) {
      // Create new customer account with Google
      const newId = `usr_${Date.now()}`;
      const role = rolePreference === 'CASHIER' ? 'CASHIER' : 'CUSTOMER';
      const userAvatar = avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`;

      run(
        `INSERT INTO users (id, name, email, password_hash, role, avatar, phone, created_at)
         VALUES (?, ?, ?, NULL, ?, ?, '', ?)`,
        [newId, name || email.split('@')[0], email.trim(), role, userAvatar, now]
      );

      // Create corresponding customer entry if customer role
      if (role === 'CUSTOMER') {
        run(
          `INSERT INTO customers (id, name, email, phone, avatar, total_orders, total_spent, last_order_date, created_at)
           VALUES (?, ?, ?, '', ?, 0, 0, NULL, ?)`,
          [`c_${Date.now()}`, name || email.split('@')[0], email.trim(), userAvatar, now]
        );
      }

      user = queryOne<any>('SELECT * FROM users WHERE id = ?', [newId]);

      run(
        `INSERT INTO notifications (id, title, message, type, read, created_at)
         VALUES (?, 'Yangi mijoz ro'yxatdan 'di', ?, 'customer', 0, ?)`,
        [`notif_${Date.now()}`, `${name || email} Google orqali akkaunt ochdi`, now]
      );
    }

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    });

    run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at)
       VALUES (?, ?, ?, 'Google orqali kirish', ?, ?, ?)`,
      [`aud_${Date.now()}`, user.id, user.name, `${user.name} (${user.role}) Google hisobi orqali tizimga kirdi`, req.ip || '127.0.0.1', now]
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        createdAt: user.created_at
      }
    });
  } catch (err: any) {
    console.error('Google auth error:', err);
    return res.status(500).json({ success: false, message: 'Google orqali kirishda xatolik' });
  }
});

// Quick switch for role testing & demonstration (CEO, Cashier, Customer)
router.post('/switch-demo', async (req: Request, res: Response) => {
  try {
    const { targetRole } = req.body;
    let user: any = null;

    if (targetRole === 'CEO') {
      user = queryOne('SELECT * FROM users WHERE role = "CEO" LIMIT 1');
    } else if (targetRole === 'CASHIER') {
      user = queryOne('SELECT * FROM users WHERE role = "CASHIER" LIMIT 1');
    } else {
      user = queryOne('SELECT * FROM users WHERE role = "CUSTOMER" LIMIT 1');
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
    }

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        createdAt: user.created_at
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Rolni almashtirishda xatolik' });
  }
});

// Get current user profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = queryOne<any>('SELECT id, name, email, role, avatar, phone, created_at FROM users WHERE id = ?', [req.user!.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
    }
    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Foydalanuvchi ma'lumotlarini yuklashda xatolik" });
  }
});

export default router;
