import { Router, Request, Response } from 'express';
import { queryAll, queryOne } from '../database/db';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

function getDateRange(timeFilter: string, customStart?: string, customEnd?: string): { start: string; end: string } {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  if (timeFilter === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (timeFilter === 'yesterday') {
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  } else if (timeFilter === '7days') {
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else if (timeFilter === '30days') {
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  } else if (timeFilter === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (timeFilter === 'custom' && customStart && customEnd) {
    start = new Date(customStart);
    end = new Date(customEnd);
  } else {
    // Default to last 30 days
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

// GET comprehensive reports & dashboard statistics
router.get('/', authenticate, requireRole('CEO'), (req: AuthRequest, res: Response) => {
  try {
    const { timeFilter = 'today', customStart, customEnd } = req.query;
    const { start, end } = getDateRange(String(timeFilter), customStart ? String(customStart) : undefined, customEnd ? String(customEnd) : undefined);

    // 1. Orders within range
    const orders = queryAll<any>(
      `SELECT * FROM orders 
       WHERE created_at >= ? AND created_at <= ? AND status != 'cancelled'
       ORDER BY created_at ASC`,
      [start, end]
    );

    let totalSales = 0;
    let cashSales = 0;
    let cardSales = 0;
    let otherSales = 0;
    const orderIds = orders.map(o => o.id);

    for (const o of orders) {
      totalSales += o.total;
      if (o.payment_method === 'cash') cashSales += o.total;
      else if (o.payment_method === 'card') cardSales += o.total;
      else otherSales += o.total;
    }

    // 2. Order items & Profit calculation
    let totalProfit = 0;
    let totalSoldUnits = 0;

    if (orderIds.length > 0) {
      // Chunked or in list
      const placeholders = orderIds.map(() => '?').join(',');
      const items = queryAll<any>(
        `SELECT oi.*, p.category_id, c.name as category_name
         FROM order_items oi
         LEFT JOIN products p ON oi.product_id = p.id
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE oi.order_id IN (${placeholders})`,
        orderIds
      );

      for (const it of items) {
        const netQty = it.quantity - (it.returned_quantity || 0);
        if (netQty > 0) {
          totalSoldUnits += netQty;
          const profitPerItem = (it.unit_price - it.purchase_price) * netQty;
          totalProfit += profitPerItem;
        }
      }
    }

    // 3. Expenses within range
    const expensesRes = queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE created_at >= ? AND created_at <= ?`,
      [start, end]
    );
    const totalExpenses = expensesRes?.total || 0;

    // 4. Returns within range
    const returnsRes = queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(total_refund_amount), 0) as total FROM returns WHERE created_at >= ? AND created_at <= ?`,
      [start, end]
    );
    const totalReturns = returnsRes?.total || 0;

    // Net Profit = Gross Profit - Expenses - Returns loss
    const netProfit = Math.round(totalProfit - totalExpenses);

    // 5. Inventory Overview
    const invRes = queryAll<any>(`
      SELECT 
        COUNT(*) as total_products,
        SUM(quantity) as total_units,
        SUM(purchase_price * quantity) as inventory_purchase_value,
        SUM(selling_price * quantity) as inventory_retail_value,
        SUM(CASE WHEN quantity <= min_stock AND quantity > 0 THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock_count,
        SUM(CASE WHEN quantity > min_stock THEN 1 ELSE 0 END) as available_count
      FROM products WHERE status = 'active'
    `);
    const inventory = invRes[0] || {};

    // 6. Customers Overview
    const customerStats = queryAll<any>(`
      SELECT 
        COUNT(*) as total_customers,
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as new_customers,
        SUM(CASE WHEN total_orders > 0 THEN 1 ELSE 0 END) as active_customers
      FROM customers
    `, [start])[0] || {};

    // 7. Time series chart data (group by date)
    const salesChartMap: { [date: string]: { date: string; sales: number; profit: number; orders: number } } = {};
    for (const o of orders) {
      const d = o.created_at.slice(0, 10);
      if (!salesChartMap[d]) {
        salesChartMap[d] = { date: d, sales: 0, profit: 0, orders: 0 };
      }
      salesChartMap[d].sales += o.total;
      salesChartMap[d].orders += 1;
    }
    const salesChart = Object.values(salesChartMap).sort((a, b) => a.date.localeCompare(b.date));

    // 8. Top 5 Products by Sales
    const topProducts = queryAll(`
      SELECT 
        oi.product_id, 
        oi.product_name, 
        SUM(oi.quantity - oi.returned_quantity) as units_sold,
        SUM((oi.quantity - oi.returned_quantity) * oi.unit_price) as total_revenue,
        SUM((oi.quantity - oi.returned_quantity) * (oi.unit_price - oi.purchase_price)) as total_profit
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= ? AND o.created_at <= ? AND o.status != 'cancelled'
      GROUP BY oi.product_id
      ORDER BY total_revenue DESC
      LIMIT 6
    `, [start, end]);

    // 9. Category Sales Breakdown
    const categorySales = queryAll(`
      SELECT 
        c.name as category_name,
        SUM((oi.quantity - oi.returned_quantity) * oi.unit_price) as revenue,
        SUM(oi.quantity - oi.returned_quantity) as units
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE o.created_at >= ? AND o.created_at <= ? AND o.status != 'cancelled'
      GROUP BY c.id
      ORDER BY revenue DESC
    `, [start, end]);

    // 10. Cashier Performance
    const cashierSales = queryAll(`
      SELECT 
        cashier_name,
        COUNT(id) as orders_count,
        SUM(total) as total_amount
      FROM orders
      WHERE created_at >= ? AND created_at <= ? AND status != 'cancelled'
      GROUP BY cashier_name
      ORDER BY total_amount DESC
    `, [start, end]);

    return res.json({
      success: true,
      timeFilter,
      dateRange: { start, end },
      kpis: {
        totalSales,
        totalProfit: Math.round(totalProfit),
        netProfit,
        totalOrders: orders.length,
        totalSoldUnits,
        cashSales,
        cardSales,
        otherSales,
        totalExpenses,
        totalReturns
      },
      inventory: {
        totalProducts: inventory.total_products || 0,
        availableProducts: inventory.available_count || 0,
        lowStockProducts: inventory.low_stock_count || 0,
        outOfStockProducts: inventory.out_of_stock_count || 0,
        inventoryValue: Math.round(inventory.inventory_purchase_value || 0),
        retailValue: Math.round(inventory.inventory_retail_value || 0)
      },
      customers: {
        total: customerStats.total_customers || 0,
        new: customerStats.new_customers || 0,
        active: customerStats.active_customers || 0
      },
      charts: {
        salesChart,
        topProducts,
        categorySales,
        cashierSales,
        paymentDistribution: [
          { method: 'Naqd pul', amount: cashSales, percentage: totalSales > 0 ? Math.round((cashSales / totalSales) * 100) : 0 },
          { method: 'Plastik karta', amount: cardSales, percentage: totalSales > 0 ? Math.round((cardSales / totalSales) * 100) : 0 },
          { method: "Boshqa t'ov", amount: otherSales, percentage: totalSales > 0 ? Math.round((otherSales / totalSales) * 100) : 0 }
        ]
      }
    });
  } catch (err: any) {
    console.error('Reports error:', err);
    return res.status(500).json({ success: false, message: 'Hisobotlarni shakllantirishda xatolik yuz berdi' });
  }
});

export default router;
