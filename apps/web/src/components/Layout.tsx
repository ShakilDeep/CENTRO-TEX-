import { Link, useLocation } from 'react-router-dom';
import NotificationPanel from './NotificationPanel';
import { useClerk } from '@clerk/clerk-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { signOut } = useClerk();

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: '📊'
    },
    {
      name: 'Dispatch Queue',
      path: '/dispatch',
      icon: '🚚'
    },
    {
      name: 'Storage View',
      path: '/inventory',
      icon: '📦'
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: '📈'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/' && (location.pathname === '/' || location.pathname === '/dashboard')) return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--background)] text-[var(--primary)] font-['Inter']">
      {/* Left Sidebar */}
      <div className="w-64 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col shadow-sm">
        {/* Logo/Header */}
        <div className="h-16 flex items-center px-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[var(--primary)] rounded text-white flex items-center justify-center font-bold text-lg">P</div>
            <h1 className="font-bold text-xl tracking-tight text-[var(--primary)]">
              প্রবাহ <span className="text-sm font-normal text-[var(--secondary)] ml-2">ADMIN</span>
            </h1>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${isActive(item.path)
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                  : 'text-[var(--secondary)] hover:text-[var(--primary)] hover:bg-slate-50'
                  }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </div>

          {/* Configuration Section */}
          <div className="mt-8">
            <h3 className="px-3 text-xs font-semibold text-[var(--secondary)] uppercase tracking-wider mb-3">
              CONFIGURATION
            </h3>
            <Link
              to="/admin"
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${isActive('/admin')
                ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600'
                : 'text-[var(--secondary)] hover:text-[var(--primary)] hover:bg-slate-50'
                }`}
            >
              <span className="text-lg">👤</span>
              <span>Admin Panel</span>
            </Link>
          </div>
        </nav>

        {/* Logout Section */}
        <div className="p-4 border-t border-[var(--border)] mt-auto">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium transition-colors text-red-600 hover:bg-red-50 hover:text-red-700 focus:outline-none"
          >
            <span className="text-lg">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-16 flex items-center justify-between px-6 shrink-0 z-20">
          <div className="flex items-center gap-8">
            <h2 className="font-semibold text-lg text-[var(--primary)]">
              {isActive('/admin') ? 'Admin Panel' : (menuItems.find(item => isActive(item.path))?.name || 'Dashboard')}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Live notification bell — fetches from DB, updates every 30s */}
            <NotificationPanel />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;