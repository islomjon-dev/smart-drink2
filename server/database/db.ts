import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

let dbInstance: Database | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'smart_drink.sqlite');

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (e) {
      console.error('Error reading existing SQLite database, creating new one', e);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initTables(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to save SQLite DB to disk:', err);
  }
}

// Database helper functions
export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  const lastId = queryOne<{ id: number }>('SELECT last_insert_rowid() as id')?.id ?? 0;
  saveDb();
  return { changes: 1, lastInsertRowid: lastId };
}

function initTables(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      role TEXT NOT NULL CHECK(role IN ('CEO', 'CASHIER', 'CUSTOMER')),
      avatar TEXT,
      phone TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      display_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category_id TEXT NOT NULL,
      description TEXT,
      purchase_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 5,
      unit TEXT DEFAULT 'dona',
      barcode TEXT UNIQUE,
      sku TEXT UNIQUE,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      avatar TEXT,
      total_orders INTEGER DEFAULT 0,
      total_spent REAL DEFAULT 0,
      last_order_date TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      cashier_id TEXT NOT NULL,
      cashier_name TEXT NOT NULL,
      opening_cash REAL NOT NULL DEFAULT 0,
      actual_cash REAL,
      expected_cash REAL,
      cash_sales REAL DEFAULT 0,
      card_sales REAL DEFAULT 0,
      other_sales REAL DEFAULT 0,
      refunds REAL DEFAULT 0,
      expenses REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
      notes TEXT,
      opened_at TEXT NOT NULL,
      closed_at TEXT,
      FOREIGN KEY (cashier_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_id TEXT,
      customer_name TEXT,
      cashier_id TEXT,
      cashier_name TEXT,
      shift_id TEXT,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'card', 'other')),
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'cancelled', 'returned', 'partially_returned')),
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (shift_id) REFERENCES shifts(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      purchase_price REAL NOT NULL,
      total_price REAL NOT NULL,
      returned_quantity INTEGER DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('purchase', 'sale', 'return', 'manual_adjustment', 'damaged', 'other')),
      reason TEXT,
      user_id TEXT,
      user_name TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      order_number TEXT NOT NULL,
      cashier_id TEXT,
      cashier_name TEXT,
      total_refund_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      reason TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS return_items (
      id TEXT PRIMARY KEY,
      return_id TEXT NOT NULL,
      order_item_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      refund_price REAL NOT NULL,
      FOREIGN KEY (return_id) REFERENCES returns(id),
      FOREIGN KEY (order_item_id) REFERENCES order_items(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('electricity', 'rent', 'salary', 'transport', 'maintenance', 'other')),
      amount REAL NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT NOT NULL,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      store_name TEXT NOT NULL,
      store_logo TEXT,
      store_address TEXT,
      phone TEXT,
      email TEXT,
      currency TEXT NOT NULL DEFAULT 'UZS',
      tax_rate REAL DEFAULT 0,
      receipt_footer TEXT,
      low_stock_threshold INTEGER DEFAULT 5,
      theme TEXT DEFAULT 'dark',
      language TEXT DEFAULT 'uz'
    );
  `);

  seedInitialData(db);
}

function seedInitialData(db: Database) {
  // Check if users already seeded
  const userCountRes = db.exec('SELECT COUNT(*) as cnt FROM users');
  const count = userCountRes[0]?.values[0]?.[0] as number;
  if (count > 0) return;

  const now = new Date().toISOString();
  const passwordSalt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('admin123', passwordSalt);
  const cashierHash = bcrypt.hashSync('kassir123', passwordSalt);
  const customerHash = bcrypt.hashSync('customer123', passwordSalt);

  // 1. Settings
  db.run(
    `INSERT INTO settings (id, store_name, store_logo, store_address, phone, email, currency, tax_rate, receipt_footer, low_stock_threshold, theme, language)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'st_1',
      'SMART DRINK POS',
      '',
      "Toshkent sh., Amir Temur shox ko'chasi, 45-uy",
      '+998 71 200 44 88',
      'info@smartdrink.uz',
      'UZS',
      0,
      'Xaridingiz uchun tashakkur! Yana kutib qolamiz!',
      5,
      'dark',
      'uz'
    ]
  );

  // 2. Users
  const users = [
    { id: 'usr_ceo', name: 'Jamshid Aliyev (Bosh Direktor)', email: 'ceo@smartdrink.uz', hash: adminHash, role: 'CEO', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', phone: '+998 90 123 45 67' },
    { id: 'usr_cashier', name: 'Azizbek Qosimov (Kassir)', email: 'kassir@smartdrink.uz', hash: cashierHash, role: 'CASHIER', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', phone: '+998 93 987 65 43' },
    { id: 'usr_customer', name: 'Islomjon Ismatullaev', email: 'islomjonismatullaev3@gmail.com', hash: customerHash, role: 'CUSTOMER', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', phone: '+998 99 555 44 33' }
  ];

  for (const u of users) {
    db.run(
      `INSERT INTO users (id, name, email, password_hash, role, avatar, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.id, u.name, u.email, u.hash, u.role, u.avatar, u.phone, now]
    );
  }

  // 3. 10 Categories
  const categories = [
    { id: 'cat_cola', name: 'Cola & Gazli', description: 'Gazlangan shirin ichimliklar', icon: 'Sparkles', order: 1 },
    { id: 'cat_water', name: 'Suvlar', description: 'Tabiiy toza va mineral suvlar', icon: 'Droplets', order: 2 },
    { id: 'cat_energy', name: 'Energetiklar', description: 'Energiya beruvchi tetiklashtiruvchi ichimliklar', icon: 'Zap', order: 3 },
    { id: 'cat_tea', name: 'Muzdek Choylar', description: 'Yozgi yaxna mevali choylar', icon: 'Coffee', order: 4 },
    { id: 'cat_juice', name: 'Sharbatlar', description: 'Tabiiy meva sharbatlari va nektarlar', icon: 'Apple', order: 5 },
    { id: 'cat_coffee', name: 'Qahvalar', description: 'Tayyor sovuq va issiq kofe turlari', icon: 'CupSoda', order: 6 },
    { id: 'cat_lemonade', name: 'Limonadlar', description: "Klassik va sitrusli qo'lbola limonadlar", icon: 'Citrus', order: 7 },
    { id: 'cat_sport', name: 'Sport Ichimliklari', description: 'Izotonik va elektrolitli ichimliklar', icon: 'Activity', order: 8 },
    { id: 'cat_milk', name: 'Sutli Ichimliklar', description: 'Sutli kokteyllar va milkshakelar', icon: 'Milk', order: 9 },
    { id: 'cat_other', name: 'Boshqa Ichimliklar', description: 'Boshqa turdagi dorivor va ekzotik ichimliklar', icon: 'Wine', order: 10 }
  ];

  for (const c of categories) {
    db.run(
      `INSERT INTO categories (id, name, description, icon, display_order, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [c.id, c.name, c.description, c.icon, c.order, now]
    );
  }

  // 4. 32 Products
  const products = [
    { id: 'p_1', name: 'Coca-Cola Classic 0.5L', cat: 'cat_cola', desc: 'Klassik gazlangan tetiklantiruvchi ichimlik', p_price: 6000, s_price: 9000, qty: 85, min: 10, unit: 'dona', barcode: '478000100101', sku: 'CC-05L', img: '/src/assets/images/drink_cola_craft_1790182188927.jpg' },
    { id: 'p_2', name: 'Coca-Cola 1.5L', cat: 'cat_cola', desc: "Oila va do'stlar uchun katta hajm", p_price: 10500, s_price: 15000, qty: 54, min: 10, unit: 'dona', barcode: '478000100102', sku: 'CC-15L', img: '/src/assets/images/drink_cola_craft_1790182188927.jpg' },
    { id: 'p_3', name: 'Coca-Cola Zero 0.5L', cat: 'cat_cola', desc: 'Shakarsiz va kaloriyasiz Coca-Cola', p_price: 6500, s_price: 9500, qty: 42, min: 8, unit: 'dona', barcode: '478000100103', sku: 'CC-ZERO-05L', img: '/src/assets/images/drink_cola_craft_1790182188927.jpg' },
    { id: 'p_4', name: 'Pepsi Classic 0.5L', cat: 'cat_cola', desc: "Yorqin ta'mli original Pepsi", p_price: 5800, s_price: 8500, qty: 65, min: 10, unit: 'dona', barcode: '478000100104', sku: 'PEP-05L', img: '/src/assets/images/drink_cola_craft_1790182188927.jpg' },
    { id: 'p_5', name: 'Pepsi 1.5L', cat: 'cat_cola', desc: 'Katta qulay idishdagi Pepsi', p_price: 10000, s_price: 14500, qty: 38, min: 8, unit: 'dona', barcode: '478000100105', sku: 'PEP-15L', img: '/src/assets/images/drink_cola_craft_1790182188927.jpg' },
    { id: 'p_6', name: 'Fanta Orange 0.5L', cat: 'cat_cola', desc: "Apelsinli shirin xushbo'y ichimlik", p_price: 6000, s_price: 9000, qty: 48, min: 8, unit: 'dona', barcode: '478000100106', sku: 'FAN-05L', img: '/src/assets/images/drink_energy_spark_1790182205238.jpg' },
    { id: 'p_7', name: 'Sprite 0.5L', cat: 'cat_cola', desc: "Limon va laym ta'mli tetiklantiruvchi ichimlik", p_price: 6000, s_price: 9000, qty: 50, min: 8, unit: 'dona', barcode: '478000100107', sku: 'SPR-05L', img: '/src/assets/images/drink_energy_spark_1790182205238.jpg' },
    { id: 'p_8', name: 'Mountain Dew 0.5L', cat: 'cat_cola', desc: "Ekstremal sitrusli baquvvat ta'm", p_price: 6500, s_price: 9500, qty: 28, min: 5, unit: 'dona', barcode: '478000100108', sku: 'MD-05L', img: '/src/assets/images/drink_energy_spark_1790182205238.jpg' },
    
    // Energetiklar
    { id: 'p_9', name: 'Red Bull Energy 250ml', cat: 'cat_energy', desc: 'Dunyo miqyosidagi afsonaviy energetik ichimlik', p_price: 16000, s_price: 24000, qty: 60, min: 10, unit: 'dona', barcode: '478000100201', sku: 'RB-250ML', img: '/src/assets/images/drink_energy_spark_1790182205238.jpg' },
    { id: 'p_10', name: 'Red Bull Sugarfree 250ml', cat: 'cat_energy', desc: 'Shakarsiz Red Bull energiyasi', p_price: 16500, s_price: 25000, qty: 32, min: 8, unit: 'dona', barcode: '478000100202', sku: 'RB-SF-250ML', img: '/src/assets/images/drink_energy_spark_1790182205238.jpg' },
    { id: 'p_11', name: 'Monster Energy 500ml', cat: 'cat_energy', desc: 'Katta quti, kuchli energiya va vitaminlar', p_price: 19000, s_price: 28000, qty: 35, min: 8, unit: 'dona', barcode: '478000100203', sku: 'MON-500ML', img: '/src/assets/images/drink_energy_spark_1790182205238.jpg' },
    { id: 'p_12', name: 'Flash Up Max 450ml', cat: 'cat_energy', desc: 'Kuchli mevali baquvvat energetik', p_price: 7500, s_price: 12000, qty: 45, min: 10, unit: 'dona', barcode: '478000100204', sku: 'FLSH-450ML', img: '/src/assets/images/drink_energy_spark_1790182205238.jpg' },
    { id: 'p_13', name: 'Adrenaline Rush 449ml', cat: 'cat_energy', desc: "To'liq quvvat va tetiklik manbai", p_price: 12500, s_price: 18000, qty: 22, min: 6, unit: 'dona', barcode: '478000100205', sku: 'ADR-449ML', img: '/src/assets/images/drink_energy_spark_1790182205238.jpg' },

    // Suvlar
    { id: 'p_14', name: 'Hydrolife Still 0.5L', cat: 'cat_water', desc: "Tog' manbaidan olingan toza gazsiz ichimlik suvi", p_price: 2200, s_price: 4000, qty: 110, min: 15, unit: 'dona', barcode: '478000100301', sku: 'HL-05L', img: '/src/assets/images/smart_drink_hero_1790182172012.jpg' },
    { id: 'p_15', name: 'Hydrolife Sparkling 0.5L', cat: 'cat_water', desc: "Gazlangan tog' mineral suvi", p_price: 2500, s_price: 4500, qty: 70, min: 12, unit: 'dona', barcode: '478000100302', sku: 'HL-SPK-05L', img: '/src/assets/images/smart_drink_hero_1790182172012.jpg' },
    { id: 'p_16', name: 'Nestle Pure Life 0.5L', cat: 'cat_water', desc: 'Premium tozalangan sifatli ichimlik suvi', p_price: 2800, s_price: 5000, qty: 95, min: 15, unit: 'dona', barcode: '478000100303', sku: 'NST-05L', img: '/src/assets/images/smart_drink_hero_1790182172012.jpg' },
    { id: 'p_17', name: 'Nestle Pure Life 1.5L', cat: 'cat_water', desc: 'Katta idishdagi toza mineral suv', p_price: 4500, s_price: 7500, qty: 60, min: 10, unit: 'dona', barcode: '478000100304', sku: 'NST-15L', img: '/src/assets/images/smart_drink_hero_1790182172012.jpg' },
    { id: 'p_18', name: 'Borjomi Mineral 0.5L', cat: 'cat_water', desc: 'Shifobaxsh tabiiy vulkanik mineral suv', p_price: 11000, s_price: 16000, qty: 3, min: 8, unit: 'dona', barcode: '478000100305', sku: 'BORJ-05L', img: '/src/assets/images/smart_drink_hero_1790182172012.jpg' }, // Low stock!
    { id: 'p_19', name: 'Chortoq Tabiiy Mineral 0.5L', cat: 'cat_water', desc: "O'zbekistonning shifobaxsh yer osti suvi", p_price: 5500, s_price: 9000, qty: 0, min: 5, unit: 'dona', barcode: '478000100306', sku: 'CHORT-05L', img: '/src/assets/images/smart_drink_hero_1790182172012.jpg' }, // Out of stock!

    // Muzdek Choylar
    { id: 'p_20', name: 'Lipton Ice Tea Shaftoli 0.5L', cat: 'cat_tea', desc: "Shirali shaftoli ta'mli muzdek qora choy", p_price: 6000, s_price: 9500, qty: 55, min: 10, unit: 'dona', barcode: '478000100401', sku: 'LIP-PEACH-05L', img: '/src/assets/images/drink_peach_tea_1790182220504.jpg' },
    { id: 'p_21', name: 'Lipton Ice Tea Limon 0.5L', cat: 'cat_tea', desc: 'Nordon limonli klassik sovuq choy', p_price: 6000, s_price: 9500, qty: 45, min: 8, unit: 'dona', barcode: '478000100402', sku: 'LIP-LEMON-05L', img: '/src/assets/images/drink_peach_tea_1790182220504.jpg' },
    { id: 'p_22', name: 'Nestea Yashil Choy 0.5L', cat: 'cat_tea', desc: 'Yalpiz va limonli tetiklantiruvchi yashil choy', p_price: 5800, s_price: 9000, qty: 38, min: 6, unit: 'dona', barcode: '478000100403', sku: 'NES-GREEN-05L', img: '/src/assets/images/drink_peach_tea_1790182220504.jpg' },

    // Sharbatlar
    { id: 'p_23', name: 'Rich Olma Sharbati 1L', cat: 'cat_juice', desc: '100% tabiiy tiniq olma sharbati', p_price: 14000, s_price: 21000, qty: 30, min: 5, unit: 'dona', barcode: '478000100501', sku: 'RICH-APPLE-1L', img: '/src/assets/images/drink_peach_tea_1790182220504.jpg' },
    { id: 'p_24', name: 'Rich Apelsin Sharbati 1L', cat: 'cat_juice', desc: 'Vitamin C ga boy tabiiy apelsin etli nektari', p_price: 14500, s_price: 22000, qty: 25, min: 5, unit: 'dona', barcode: '478000100502', sku: 'RICH-ORANGE-1L', img: '/src/assets/images/drink_energy_spark_1790182205238.jpg' },
    { id: 'p_25', name: 'Bliss Anor Sharbati 1L', cat: 'cat_juice', desc: "Quvvat bag'ishlovchi tabiiy anor sharbati", p_price: 13000, s_price: 19500, qty: 28, min: 5, unit: 'dona', barcode: '478000100503', sku: 'BLISS-POM-1L', img: '/src/assets/images/drink_peach_tea_1790182220504.jpg' },
    { id: 'p_26', name: 'Dena Multimeva 1L', cat: 'cat_juice', desc: 'Turli xil mevalarning vitaminli aralashmasi', p_price: 9500, s_price: 15000, qty: 40, min: 8, unit: 'dona', barcode: '478000100504', sku: 'DENA-MULTI-1L', img: '/src/assets/images/drink_peach_tea_1790182220504.jpg' },

    // Qahvalar
    { id: 'p_27', name: 'Cold Brew Espresso 250ml', cat: 'cat_coffee', desc: '12 soat sovuq damlangan haqiqiy espresso', p_price: 12000, s_price: 18000, qty: 34, min: 6, unit: 'dona', barcode: '478000100601', sku: 'CB-ESP-250ML', img: '/src/assets/images/drink_cola_craft_1790182188927.jpg' },
    { id: 'p_28', name: 'Iced Latte Vanilla 250ml', cat: 'cat_coffee', desc: 'Yumshoq sut va tabiiy vanil siropi bilan kofe', p_price: 13500, s_price: 20000, qty: 26, min: 5, unit: 'dona', barcode: '478000100602', sku: 'LATTE-VAN-250ML', img: '/src/assets/images/drink_peach_tea_1790182220504.jpg' },

    // Limonadlar
    { id: 'p_29', name: 'Klassik Limonad 1L', cat: 'cat_lemonade', desc: "Tabiiy limon sharbati va yalpizli qo'lbola limonad", p_price: 9000, s_price: 14000, qty: 35, min: 6, unit: 'dona', barcode: '478000100701', sku: 'LIM-CLASSIC-1L', img: '/src/assets/images/drink_energy_spark_1790182205238.jpg' },
    { id: 'p_30', name: 'Tarxun Gazli Limonad 0.5L', cat: 'cat_lemonade', desc: "Zümrad rangli xushbo'y tarxun o'ti ekstrakti", p_price: 5000, s_price: 8000, qty: 45, min: 8, unit: 'dona', barcode: '478000100702', sku: 'TARX-05L', img: '/src/assets/images/drink_energy_spark_1790182205238.jpg' },

    // Sport va Sutli
    { id: 'p_31', name: 'Gatorade Orange 0.5L', cat: 'cat_sport', desc: 'Elektrolitlar balansi va tezkor gidratatsiya', p_price: 15000, s_price: 23000, qty: 20, min: 5, unit: 'dona', barcode: '478000100801', sku: 'GAT-ORG-05L', img: '/src/assets/images/drink_energy_spark_1790182205238.jpg' },
    { id: 'p_32', name: 'Shokoladli Milkshake 300ml', cat: 'cat_milk', desc: 'Quyuq shokolad va qaymoqli tabiiy sutli ichimlik', p_price: 11000, s_price: 17000, qty: 18, min: 5, unit: 'dona', barcode: '478000100901', sku: 'SHOK-MS-300ML', img: '/src/assets/images/drink_cola_craft_1790182188927.jpg' }
  ];

  for (const p of products) {
    db.run(
      `INSERT INTO products (id, name, category_id, description, purchase_price, selling_price, quantity, min_stock, unit, barcode, sku, image_url, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [p.id, p.name, p.cat, p.desc, p.p_price, p.s_price, p.qty, p.min, p.unit, p.barcode, p.sku, p.img, now, now]
    );

    // Initial stock movement
    db.run(
      `INSERT INTO inventory_movements (id, product_id, product_name, quantity, type, reason, user_id, user_name, created_at)
       VALUES (?, ?, ?, ?, 'purchase', ?, 'usr_ceo', 'Jamshid Aliyev (Bosh Direktor)', ?)`,
      [`mov_${p.id}_init`, p.id, p.name, p.qty, "Boshlang'ich partiya qabul qilindi", now]
    );
  }

  // 5. 12 Customers
  const customers = [
    { id: 'c_1', name: 'Alisher Navoiy', email: 'alisher@mail.uz', phone: '+998 90 111 22 33', spent: 185000, orders: 8 },
    { id: 'c_2', name: 'Sardor Rahimov', email: 'sardor.r@gmail.com', phone: '+998 93 222 33 44', spent: 94000, orders: 4 },
    { id: 'c_3', name: 'Jasur Bekmurodov', email: 'jasur@bek.uz', phone: '+998 97 333 44 55', spent: 260000, orders: 11 },
    { id: 'c_4', name: 'Madina Karimova', email: 'madina.k@inbox.uz', phone: '+998 91 444 55 66', spent: 142000, orders: 6 },
    { id: 'c_5', name: 'Nilufar Usmonova', email: 'nilufar.u@gmail.com', phone: '+998 94 555 66 77', spent: 78000, orders: 3 },
    { id: 'c_6', name: 'Bobur Zokirov', email: 'bobur@itclub.uz', phone: '+998 95 666 77 88', spent: 310000, orders: 14 },
    { id: 'c_7', name: 'Dilshod Mirzaev', email: 'dilshod.m@mail.ru', phone: '+998 98 777 88 99', spent: 125000, orders: 5 },
    { id: 'c_8', name: 'Kamola Ergasheva', email: 'kamola.e@gmail.com', phone: '+998 90 888 99 00', spent: 65000, orders: 3 },
    { id: 'c_9', name: 'Shahzod Qodirov', email: 'shahzod@qodirov.uz', phone: '+998 99 999 00 11', spent: 215000, orders: 9 },
    { id: 'c_10', name: 'Umid Nazarov', email: 'umid.n@gmail.com', phone: '+998 93 000 11 22', spent: 89000, orders: 4 },
    { id: 'c_11', name: 'Otabek Rustamov', email: 'otabek@rustam.uz', phone: '+998 97 123 32 10', spent: 160000, orders: 7 },
    { id: 'c_12', name: 'Islomjon Ismatullaev', email: 'islomjonismatullaev3@gmail.com', phone: '+998 99 555 44 33', spent: 345000, orders: 15 }
  ];

  for (const c of customers) {
    db.run(
      `INSERT INTO customers (id, name, email, phone, avatar, total_orders, total_spent, last_order_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.name, c.email, c.phone, `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`, c.orders, c.spent, now, now]
    );
  }

  // 6. Active Shift for Cashier
  const shiftId = 'shf_current';
  db.run(
    `INSERT INTO shifts (id, cashier_id, cashier_name, opening_cash, actual_cash, expected_cash, cash_sales, card_sales, other_sales, refunds, expenses, status, notes, opened_at, closed_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 0, 0, 0, 'open', ?, ?, NULL)`,
    [shiftId, 'usr_cashier', 'Azizbek Qosimov (Kassir)', 250000, 625000, 240000, 135000, 'Bugungi ertalabki smena ochildi', now]
  );

  // 7. Seed 22 Orders with items across dates
  const demoOrders = [
    {
      id: 'ord_101', num: 'SD-20260923-01', custId: 'c_12', custName: 'Islomjon Ismatullaev',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'card', total: 47000, subtotal: 47000,
      status: 'completed', date: new Date(Date.now() - 3600000 * 2).toISOString(),
      items: [
        { pid: 'p_1', name: 'Coca-Cola Classic 0.5L', qty: 2, u_price: 9000, p_price: 6000 },
        { pid: 'p_9', name: 'Red Bull Energy 250ml', qty: 1, u_price: 24000, p_price: 16000 },
        { pid: 'p_16', name: 'Nestle Pure Life 0.5L', qty: 1, u_price: 5000, p_price: 2800 }
      ]
    },
    {
      id: 'ord_102', num: 'SD-20260923-02', custId: 'c_1', custName: 'Alisher Navoiy',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'cash', total: 34000, subtotal: 34000,
      status: 'completed', date: new Date(Date.now() - 3600000 * 4).toISOString(),
      items: [
        { pid: 'p_2', name: 'Coca-Cola 1.5L', qty: 1, u_price: 15000, p_price: 10500 },
        { pid: 'p_20', name: 'Lipton Ice Tea Shaftoli 0.5L', qty: 2, u_price: 9500, p_price: 6000 }
      ]
    },
    {
      id: 'ord_103', num: 'SD-20260923-03', custId: 'c_3', custName: 'Jasur Bekmurodov',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'cash', total: 64000, subtotal: 64000,
      status: 'completed', date: new Date(Date.now() - 3600000 * 5).toISOString(),
      items: [
        { pid: 'p_11', name: 'Monster Energy 500ml', qty: 2, u_price: 28000, p_price: 19000 },
        { pid: 'p_14', name: 'Hydrolife Still 0.5L', qty: 2, u_price: 4000, p_price: 2200 }
      ]
    },
    {
      id: 'ord_104', num: 'SD-20260923-04', custId: 'c_6', custName: 'Bobur Zokirov',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'card', total: 58000, subtotal: 58000,
      status: 'completed', date: new Date(Date.now() - 3600000 * 6).toISOString(),
      items: [
        { pid: 'p_27', name: 'Cold Brew Espresso 250ml', qty: 2, u_price: 18000, p_price: 12000 },
        { pid: 'p_28', name: 'Iced Latte Vanilla 250ml', qty: 1, u_price: 20000, p_price: 13500 },
        { pid: 'p_16', name: 'Nestle Pure Life 0.5L', qty: 0, u_price: 5000, p_price: 2800 }
      ]
    },
    {
      id: 'ord_105', num: 'SD-20260922-01', custId: 'c_4', custName: 'Madina Karimova',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'cash', total: 42000, subtotal: 42000,
      status: 'completed', date: new Date(Date.now() - 86400000 * 1).toISOString(),
      items: [
        { pid: 'p_23', name: 'Rich Olma Sharbati 1L', qty: 2, u_price: 21000, p_price: 14000 }
      ]
    },
    {
      id: 'ord_106', num: 'SD-20260922-02', custId: 'c_2', custName: 'Sardor Rahimov',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'card', total: 37500, subtotal: 37500,
      status: 'completed', date: new Date(Date.now() - 86400000 * 1 - 3600000).toISOString(),
      items: [
        { pid: 'p_9', name: 'Red Bull Energy 250ml', qty: 1, u_price: 24000, p_price: 16000 },
        { pid: 'p_20', name: 'Lipton Ice Tea Shaftoli 0.5L', qty: 1, u_price: 9500, p_price: 6000 },
        { pid: 'p_14', name: 'Hydrolife Still 0.5L', qty: 1, u_price: 4000, p_price: 2200 }
      ]
    },
    {
      id: 'ord_107', num: 'SD-20260921-01', custId: 'c_9', custName: 'Shahzod Qodirov',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'cash', total: 68000, subtotal: 68000,
      status: 'completed', date: new Date(Date.now() - 86400000 * 2).toISOString(),
      items: [
        { pid: 'p_31', name: 'Gatorade Orange 0.5L', qty: 2, u_price: 23000, p_price: 15000 },
        { pid: 'p_24', name: 'Rich Apelsin Sharbati 1L', qty: 1, u_price: 22000, p_price: 14500 }
      ]
    },
    {
      id: 'ord_108', num: 'SD-20260920-01', custId: 'c_7', custName: 'Dilshod Mirzaev',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'card', total: 46000, subtotal: 46000,
      status: 'completed', date: new Date(Date.now() - 86400000 * 3).toISOString(),
      items: [
        { pid: 'p_32', name: 'Shokoladli Milkshake 300ml', qty: 2, u_price: 17000, p_price: 11000 },
        { pid: 'p_12', name: 'Flash Up Max 450ml', qty: 1, u_price: 12000, p_price: 7500 }
      ]
    },
    {
      id: 'ord_109', num: 'SD-20260919-01', custId: 'c_11', custName: 'Otabek Rustamov',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'cash', total: 54000, subtotal: 54000,
      status: 'completed', date: new Date(Date.now() - 86400000 * 4).toISOString(),
      items: [
        { pid: 'p_27', name: 'Cold Brew Espresso 250ml', qty: 3, u_price: 18000, p_price: 12000 }
      ]
    },
    {
      id: 'ord_110', num: 'SD-20260918-01', custId: 'c_5', custName: 'Nilufar Usmonova',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'other', total: 39000, subtotal: 39000,
      status: 'completed', date: new Date(Date.now() - 86400000 * 5).toISOString(),
      items: [
        { pid: 'p_25', name: 'Bliss Anor Sharbati 1L', qty: 2, u_price: 19500, p_price: 13000 }
      ]
    },
    {
      id: 'ord_111', num: 'SD-20260917-01', custId: 'c_10', custName: 'Umid Nazarov',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'cash', total: 32000, subtotal: 32000,
      status: 'completed', date: new Date(Date.now() - 86400000 * 6).toISOString(),
      items: [
        { pid: 'p_29', name: 'Klassik Limonad 1L', qty: 2, u_price: 14000, p_price: 9000 },
        { pid: 'p_14', name: 'Hydrolife Still 0.5L', qty: 1, u_price: 4000, p_price: 2200 }
      ]
    },
    {
      id: 'ord_112', num: 'SD-20260916-01', custId: 'c_8', custName: 'Kamola Ergasheva',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'card', total: 27000, subtotal: 27000,
      status: 'completed', date: new Date(Date.now() - 86400000 * 7).toISOString(),
      items: [
        { pid: 'p_1', name: 'Coca-Cola Classic 0.5L', qty: 3, u_price: 9000, p_price: 6000 }
      ]
    },
    {
      id: 'ord_113', num: 'SD-20260915-01', custId: 'c_12', custName: 'Islomjon Ismatullaev',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'card', total: 72000, subtotal: 72000,
      status: 'completed', date: new Date(Date.now() - 86400000 * 8).toISOString(),
      items: [
        { pid: 'p_9', name: 'Red Bull Energy 250ml', qty: 3, u_price: 24000, p_price: 16000 }
      ]
    },
    {
      id: 'ord_114', num: 'SD-20260914-01', custId: 'c_3', custName: 'Jasur Bekmurodov',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'cash', total: 45000, subtotal: 45000,
      status: 'completed', date: new Date(Date.now() - 86400000 * 9).toISOString(),
      items: [
        { pid: 'p_2', name: 'Coca-Cola 1.5L', qty: 3, u_price: 15000, p_price: 10500 }
      ]
    },
    {
      id: 'ord_115', num: 'SD-20260912-01', custId: 'c_6', custName: 'Bobur Zokirov',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'cash', total: 84000, subtotal: 84000,
      status: 'completed', date: new Date(Date.now() - 86400000 * 11).toISOString(),
      items: [
        { pid: 'p_11', name: 'Monster Energy 500ml', qty: 3, u_price: 28000, p_price: 19000 }
      ]
    },
    {
      id: 'ord_116', num: 'SD-20260910-01', custId: 'c_1', custName: 'Alisher Navoiy',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'card', total: 39000, subtotal: 39000,
      status: 'completed', date: new Date(Date.now() - 86400000 * 13).toISOString(),
      items: [
        { pid: 'p_26', name: 'Dena Multimeva 1L', qty: 2, u_price: 15000, p_price: 9500 },
        { pid: 'p_7', name: 'Sprite 0.5L', qty: 1, u_price: 9000, p_price: 6000 }
      ]
    },
    {
      id: 'ord_117', num: 'SD-20260908-01', custId: 'c_9', custName: 'Shahzod Qodirov',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'card', total: 54000, subtotal: 54000,
      status: 'completed', date: new Date(Date.now() - 86400000 * 15).toISOString(),
      items: [
        { pid: 'p_13', name: 'Adrenaline Rush 449ml', qty: 3, u_price: 18000, p_price: 12500 }
      ]
    },
    {
      id: 'ord_118', num: 'SD-20260906-01', custId: 'c_4', custName: 'Madina Karimova',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'cash', total: 30000, subtotal: 30000,
      status: 'completed', date: new Date(Date.now() - 86400000 * 17).toISOString(),
      items: [
        { pid: 'p_30', name: 'Tarxun Gazli Limonad 0.5L', qty: 3, u_price: 8000, p_price: 5000 },
        { pid: 'p_6', name: 'Fanta Orange 0.5L', qty: 1, u_price: 6000, p_price: 4000 }
      ]
    },
    {
      id: 'ord_119', num: 'SD-20260904-01', custId: 'c_12', custName: 'Islomjon Ismatullaev',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'cash', total: 48000, subtotal: 48000,
      status: 'completed', date: new Date(Date.now() - 86400000 * 19).toISOString(),
      items: [
        { pid: 'p_9', name: 'Red Bull Energy 250ml', qty: 2, u_price: 24000, p_price: 16000 }
      ]
    },
    {
      id: 'ord_120', num: 'SD-20260902-01', custId: 'c_2', custName: 'Sardor Rahimov',
      cashierId: 'usr_cashier', cashierName: 'Azizbek Qosimov', pay: 'card', total: 45000, subtotal: 45000,
      status: 'completed', date: new Date(Date.now() - 86400000 * 21).toISOString(),
      items: [
        { pid: 'p_23', name: 'Rich Olma Sharbati 1L', qty: 1, u_price: 21000, p_price: 14000 },
        { pid: 'p_9', name: 'Red Bull Energy 250ml', qty: 1, u_price: 24000, p_price: 16000 }
      ]
    }
  ];

  for (const ord of demoOrders) {
    db.run(
      `INSERT INTO orders (id, order_number, customer_id, customer_name, cashier_id, cashier_name, shift_id, subtotal, discount, tax, total, payment_method, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?)`,
      [ord.id, ord.num, ord.custId, ord.custName, ord.cashierId, ord.cashierName, shiftId, ord.subtotal, ord.total, ord.pay, ord.status, "Do'kondan xarid qilindi", ord.date]
    );

    let itemIdx = 1;
    for (const it of ord.items) {
      if (it.qty <= 0) continue;
      db.run(
        `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, purchase_price, total_price, returned_quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [`${ord.id}_it_${itemIdx++}`, ord.id, it.pid, it.name, it.qty, it.u_price, it.p_price, it.qty * it.u_price]
      );
    }
  }

  // 8. Demo Return
  db.run(
    `INSERT INTO returns (id, order_id, order_number, cashier_id, cashier_name, total_refund_amount, payment_method, reason, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['ret_1', 'ord_102', 'SD-20260923-02', 'usr_cashier', 'Azizbek Qosimov', 9500, 'cash', 'Mijoz fikridan qaytdi', '1 dona Lipton qaytarildi', now]
  );
  
  db.run(
    `INSERT INTO return_items (id, return_id, order_item_id, product_id, product_name, quantity, refund_price)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['ret_it_1', 'ret_1', 'ord_102_it_2', 'p_20', 'Lipton Ice Tea Shaftoli 0.5L', 1, 9500]
  );

  db.run(`UPDATE order_items SET returned_quantity = 1 WHERE id = 'ord_102_it_2'`);
  db.run(`UPDATE orders SET status = 'partially_returned' WHERE id = 'ord_102'`);

  // 9. Real Expenses
  const demoExpenses = [
    { id: 'exp_1', title: "Savdo zali elektr energiyasi to'lovi", cat: 'electricity', amt: 650000, desc: "Sentabr oyi uchun elektr energiya to'lovi", by: 'Jamshid Aliyev (Bosh Direktor)' },
    { id: 'exp_2', title: 'Sovutgich vitrinalar profilaktikasi', cat: 'maintenance', amt: 220000, desc: "Freon to'ldirish va kompressor diagnostikasi", by: 'Jamshid Aliyev (Bosh Direktor)' },
    { id: 'exp_3', title: 'Ichimliklar yetkazib berish transport xarajati', cat: 'transport', amt: 180000, desc: "Omborxona va do'kon orasidagi logistika", by: 'Azizbek Qosimov (Kassir)' }
  ];

  for (const ex of demoExpenses) {
    db.run(
      `INSERT INTO expenses (id, title, category, amount, description, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ex.id, ex.title, ex.cat, ex.amt, ex.desc, ex.by, now]
    );
  }

  // 10. Real Notifications
  const demoNotifications = [
    { id: 'notif_1', title: 'Qoldiq kam qoldi: Borjomi Mineral 0.5L', msg: 'Omborda ushbu mahsulotdan atigi 3 dona qoldi. Yangi partiya buyurtma qiling.', type: 'low_stock', read: 0 },
    { id: 'notif_2', title: 'Mahsulot tugadi: Chortoq Tabiiy Mineral 0.5L', msg: 'Mahsulot qoldigʻi 0 ga tushdi!', type: 'out_of_stock', read: 0 },
    { id: 'notif_3', title: 'Yangi savdo smenasi ochildi', msg: 'Kassir Azizbek Qosimov bugungi smenani 250,000 UZS qoldiq bilan boshladi.', type: 'shift_open', read: 0 },
    { id: 'notif_4', title: 'Muvaffaqiyatli mahsulot qaytarilishi', msg: "Buyurtma SD-20260923-02 bo'yicha 9,500 UZS lik qaytarish amalga oshirildi.", type: 'return', read: 1 }
  ];

  for (const n of demoNotifications) {
    db.run(
      `INSERT INTO notifications (id, title, message, type, read, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [n.id, n.title, n.msg, n.type, n.read, now]
    );
  }

  // 11. Real Audit Logs
  const demoLogs = [
    { id: 'aud_1', user_id: 'usr_ceo', user_name: 'Jamshid Aliyev (Bosh Direktor)', action: 'Tizimga kirish', desc: 'CEO hisobidan tizimga muvaffaqiyatli kirildi' },
    { id: 'aud_2', user_id: 'usr_ceo', user_name: 'Jamshid Aliyev (Bosh Direktor)', action: 'Baza ishga tushirildi', desc: "Boshlang'ich 32 ta ichimlik mahsulotlari va toifalar yuklandi" },
    { id: 'aud_3', user_id: 'usr_cashier', user_name: 'Azizbek Qosimov (Kassir)', action: 'Smena ochildi', desc: "Kassa smenasi 250,000 UZS kassa qoldig'i bilan ochildi" },
    { id: 'aud_4', user_id: 'usr_cashier', user_name: 'Azizbek Qosimov (Kassir)', action: 'Savdo amalga oshirildi', desc: 'Buyurtma SD-20260923-01 rasmiylashtirildi (47,000 UZS)' }
  ];

  for (const l of demoLogs) {
    db.run(
      `INSERT INTO audit_logs (id, user_id, user_name, action, description, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [l.id, l.user_id, l.user_name, l.action, l.desc, '127.0.0.1', now]
    );
  }
}
