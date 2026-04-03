import { Link, useLocation } from 'react-router-dom';
import NotificationPanel from './NotificationPanel';
import { useClerk } from '@clerk/clerk-react';
import { 
  LayoutDashboard, Package, Truck, Database, 
  BarChart3, Settings, LogOut, ArrowLeftRight,
  SmartphoneNfc, User, Warehouse, SearchCode
} from 'lucide-react';
import logoUrl from '../assets/logo.png';
import { motion } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const { signOut } = useClerk();

  const isPath = (path: string) => location.pathname === path;

  // Journey context
  const isAdminJourney = location.pathname.startsWith('/admin');
  const isMerchandiserJourney = location.pathname.startsWith('/merchandiser');
  const isLocatorJourney = location.pathname.startsWith('/locator');

  const getJourneyName = () => {
    if (isAdminJourney) return 'Floor Admin';
    if (isMerchandiserJourney) return 'Merchandiser';
    if (isLocatorJourney) return 'Locator';
    return 'Hub';
  };

  const getMenuItems = () => {
    if (isAdminJourney) {
      return [
        { name: 'Floor Queue', path: '/admin', icon: LayoutDashboard },
        { name: 'RFID Encoding', path: '/admin', icon: SmartphoneNfc },
        { name: 'Reports', path: '/reports', icon: BarChart3 }
      ];
    }
    if (isMerchandiserJourney) {
      return [
        { name: 'My Current Flow', path: '/merchandiser', icon: Truck },
        { name: 'Storage Access', path: '/inventory', icon: Database },
        { name: 'Reports', path: '/reports', icon: BarChart3 }
      ];
    }
    if (isLocatorJourney) {
      return [
        { name: 'Item Search', path: '/locator', icon: SearchCode },
        { name: 'Warehouse View', path: '/inventory', icon: Warehouse },
        { name: 'Logistics Logs', path: '/reports', icon: BarChart3 }
      ];
    }
    return [
      { name: 'Digital Hub', path: '/', icon: LayoutDashboard },
      { name: 'Dispatch Logs', path: '/dispatch', icon: Truck },
      { name: 'Global Inventory', path: '/inventory', icon: Database },
      { name: 'System Reports', path: '/reports', icon: BarChart3 }
    ];
  };

  const menuItems = getMenuItems();

  return (
    <div className="h-screen flex overflow-hidden bg-[#F8FAFC] text-slate-900 font-['Inter']">
      
      {/* Left Sidebar - Premium Glassy Look */}
      <div className="w-72 bg-white border-r border-slate-100 flex flex-col shadow-[10px_0_40px_-20px_rgba(37,99,235,0.05)] z-30">
        
        {/* Logo/Branding */}
        <div className="h-24 flex items-center px-8 text-neutral-800">
          <Link to="/" className="flex items-center gap-4 group">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center rotate-3 group-hover:rotate-6 transition-transform shadow-xl shadow-blue-200">
               <img src={logoUrl} alt="" className="w-6 h-6 object-contain brightness-0 invert" />
            </div>
            <div>
               <h1 className="font-black text-xl tracking-tighter text-slate-900 uppercase">
                 Centro<span className="text-blue-600">Flow</span>
               </h1>
               <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getJourneyName()}</span>
               </div>
            </div>
          </Link>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-6 py-4 space-y-8 overflow-y-auto">
          
          <div>
            <h3 className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
              Operational Journey
            </h3>
            <div className="space-y-1.5">
              {menuItems.map((item) => {
                const active = isPath(item.path);
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                      active
                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 translate-x-1'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Hub Switcher */}
          <div className="pt-4 border-t border-slate-50">
             <Link
                to="/"
                className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-black text-blue-600 bg-blue-50/50 hover:bg-blue-100 transition-all border border-blue-100/50"
              >
                <ArrowLeftRight className="w-5 h-5" />
                <span>Switch Journey</span>
              </Link>
          </div>

          <div>
            <h3 className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
              Global Platform
            </h3>
            <Link
              to="/admin"
              className={`flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                isPath('/admin')
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Link>
          </div>
        </nav>

        {/* User Card / Logout */}
        <div className="p-6 border-t border-slate-50 mt-auto">
          <button
            onClick={() => signOut()}
            className="flex items-center justify-between w-full p-4 rounded-2xl bg-slate-50 hover:bg-red-50 hover:text-red-600 transition-all group"
          >
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[10px] font-bold text-slate-600 group-hover:text-red-600 uppercase">
                 User
               </div>
               <span className="text-[10px] font-bold font-mono text-slate-400">SESSION: CF-LIVE</span>
            </div>
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Dynamic Background Blurs */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full -z-10 animate-pulse"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[40%] bg-indigo-600/5 blur-[120px] rounded-full -z-10"></div>

        {/* Top Navigation / Status Header */}
        <header className="h-20 flex items-center justify-between px-8 z-20 shrink-0">
          <div className="flex flex-col">
            <h2 className="font-black text-lg text-slate-900 tracking-tight flex items-center gap-2">
               {menuItems.find(item => isPath(item.path))?.name || 'Dashboard'}
               <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
            </h2>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest -mt-1">Operational Environment</div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm items-center gap-3">
               <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
               <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Network Status: Live</span>
            </div>
            <NotificationPanel />
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-1 overflow-y-auto px-8 pb-8 relative z-10">
           <motion.div 
             key={location.pathname}
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.3 }}
           >
              {children}
           </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Layout;