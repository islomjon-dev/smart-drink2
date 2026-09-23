import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { AccessDenied } from './components/common/AccessDenied';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { PosPage } from './pages/PosPage';
import { ProductsPage } from './pages/ProductsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { InventoryPage } from './pages/InventoryPage';
import { OrdersPage } from './pages/OrdersPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { ShiftsPage } from './pages/ShiftsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';
import { CustomersPage } from './pages/CustomersPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { CustomerShopPage } from './pages/CustomerShopPage';
import { LoginPage } from './pages/LoginPage';

function MainApp() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Set default tab based on user role when loaded
  React.useEffect(() => {
    if (user) {
      if (user.role === 'CUSTOMER') {
        setActiveTab('shop');
      } else if (user.role === 'CASHIER') {
        setActiveTab('pos');
      } else if (user.role === 'CEO') {
        setActiveTab('dashboard');
      }
    }
  }, [user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 rounded-2xl border-4 border-emerald-500/20 border-t-emerald-500 animate-spin mb-4"></div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          SMART DRINK POS yuklanmoqda...
        </p>
      </div>
    );
  }

  // Not logged in -> Show LoginPage
  if (!user) {
    return <LoginPage />;
  }

  // Role permissions checking
  const ceoOnlyTabs = ['dashboard', 'categories', 'reports', 'audit-logs', 'settings'];
  const posTabs = ['pos', 'products', 'inventory', 'orders', 'returns', 'shifts', 'expenses', 'customers', 'notifications'];

  const isCeo = user.role === 'CEO';
  const isCashier = user.role === 'CASHIER';
  const isCustomer = user.role === 'CUSTOMER';

  let hasAccess = true;
  if (isCustomer && activeTab !== 'shop' && activeTab !== 'notifications') {
    hasAccess = false;
  } else if (isCashier && ceoOnlyTabs.includes(activeTab)) {
    hasAccess = false;
  }

  const renderContent = () => {
    if (!hasAccess) {
      return (
        <AccessDenied
          onGoHome={() => {
            if (isCustomer) setActiveTab('shop');
            else if (isCashier) setActiveTab('pos');
            else setActiveTab('dashboard');
          }}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActiveTab} />;
      case 'pos':
        return <PosPage />;
      case 'products':
        return <ProductsPage />;
      case 'categories':
        return <CategoriesPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'orders':
        return <OrdersPage />;
      case 'returns':
        return <ReturnsPage />;
      case 'shifts':
        return <ShiftsPage />;
      case 'expenses':
        return <ExpensesPage />;
      case 'reports':
        return <ReportsPage />;
      case 'customers':
        return <CustomersPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'audit-logs':
        return <AuditLogsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'shop':
        return <CustomerShopPage />;
      default:
        return isCustomer ? <CustomerShopPage /> : <DashboardPage onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onNavigate={setActiveTab}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar (hidden for customers unless they want to see orders) */}
        {!isCustomer && (
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
