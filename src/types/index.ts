export type Role = 'CEO' | 'CASHIER' | 'CUSTOMER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  phone?: string;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  display_order: number;
  product_count?: number;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  category_id: string;
  category_name?: string;
  description: string;
  purchase_price: number;
  selling_price: number;
  quantity: number;
  min_stock: number;
  unit: string;
  barcode: string;
  sku: string;
  image_url: string;
  status: 'active' | 'inactive';
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  total_purchase_value?: number;
  total_retail_value?: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  purchase_price: number;
  total_price: number;
  returned_quantity: number;
  image_url?: string;
  barcode?: string;
  unit?: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name?: string;
  cashier_id?: string;
  cashier_name?: string;
  shift_id?: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: 'cash' | 'card' | 'other';
  status: 'completed' | 'cancelled' | 'returned' | 'partially_returned';
  notes?: string;
  created_at: string;
  item_count?: number;
  total_units?: number;
  items?: OrderItem[];
  returns?: any[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  total_orders: number;
  total_spent: number;
  last_order_date?: string;
  created_at: string;
  notes?: string;
  loyalty_points?: number;
  orders?: Order[];
}

export interface Shift {
  id: string;
  cashier_id: string;
  cashier_name: string;
  opening_cash: number;
  actual_cash?: number;
  expected_cash: number;
  cash_sales: number;
  card_sales: number;
  other_sales: number;
  refunds: number;
  expenses: number;
  status: 'open' | 'closed';
  notes?: string;
  opened_at: string;
  closed_at?: string;
  difference?: number;
}

export interface Expense {
  id: string;
  title: string;
  category: 'electricity' | 'rent' | 'salary' | 'transport' | 'maintenance' | 'other';
  amount: number;
  description: string;
  created_by: string;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  type: 'purchase' | 'sale' | 'return' | 'manual_adjustment' | 'damaged' | 'other';
  reason: string;
  user_id: string;
  user_name: string;
  barcode?: string;
  unit?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'low_stock' | 'out_of_stock' | 'order' | 'return' | 'shift_open' | 'shift_close' | 'customer' | 'system';
  read: number;
  is_read?: boolean | number;
  created_at: string;
}

export type Notification = NotificationItem;

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  description: string;
  ip_address: string;
  created_at: string;
  entity_type?: string;
  entity_id?: string;
  details?: string;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  store_logo: string;
  store_address: string;
  phone: string;
  email: string;
  currency: string;
  tax_rate: number;
  receipt_footer: string;
  low_stock_threshold: number;
  theme: string;
  language: string;
}
