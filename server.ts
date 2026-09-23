import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { getDb } from './server/database/db';

import authRouter from './server/routes/auth';
import productsRouter from './server/routes/products';
import categoriesRouter from './server/routes/categories';
import inventoryRouter from './server/routes/inventory';
import ordersRouter from './server/routes/orders';
import customersRouter from './server/routes/customers';
import returnsRouter from './server/routes/returns';
import shiftsRouter from './server/routes/shifts';
import expensesRouter from './server/routes/expenses';
import reportsRouter from './server/routes/reports';
import notificationsRouter from './server/routes/notifications';
import auditLogsRouter from './server/routes/audit-logs';
import settingsRouter from './server/routes/settings';
import usersRouter from './server/routes/users';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Initialize SQLite Database
  await getDb();
  console.log('✅ SQLite Database successfully initialized with SMART DRINK schema and seed data.');

  app.use(cors());
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/customers', customersRouter);
  app.use('/api/returns', returnsRouter);
  app.use('/api/shifts', shiftsRouter);
  app.use('/api/expenses', expensesRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/audit-logs', auditLogsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/users', usersRouter);

  // Serve generated image assets if requested directly
  app.use('/src/assets', express.static(path.resolve(__dirname, 'src/assets')));

  if (!isProd) {
    // In dev mode, mount Vite middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // In production mode, serve built static files
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 SMART DRINK POS server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
