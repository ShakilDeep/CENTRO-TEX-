import React, { useState, useEffect } from 'react';
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

  const isPath = (path: string) => {
    const [pathname, search] = path.split('?');
    if (search) {
      return location.pathname === pathname && location.search === `?${search}`;
    }
    return location.pathname === path;
  };

  const [activeJourney, setActiveJourney] = React.useState<string>(() => sessionStorage.getItem('centro_journey') || 'hub');

  React.useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      sessionStorage.setItem('centro_journey', 'admin');
      setActiveJourney('admin');
    } else if (location.pathname.startsWith('/merchandiser')) {
      sessionStorage.setItem('centro_journey', 'merchandiser');
      setActiveJourney('merchandiser');
    } else if (location.pathname.startsWith('/locator')) {
      sessionStorage.setItem('centro_journey', 'locator');
      setActiveJourney('locator');
    } else {
      sessionStorage.setItem('centro_journey', 'hub');
      setActiveJourney('hub');
    }
  }, [location.pathname]);

  const isAdminJourney = activeJourney === 'admin';
  const isMerchandiserJourney = activeJourney === 'merchandiser';
  const isLocatorJourney = activeJourney === 'locator';

  const getJourneyName = () => {
    if (isAdminJourney) return 'Floor Admin';
    if (isMerchandiserJourney) return 'Merchandiser';
    if (isLocatorJourney) return 'Locator';
    return 'Hub';
  };

  const getMenuItems = () => {
    if (isAdminJourney) {
      return [
        { name: 'Reports', path: '/reports', icon: BarChart3 }
      ];
    }
    if (isMerchandiserJourney) {
      return [
        { name: 'My Current Flow', path: '/merchandiser?tab=flow', icon: Truck },
        { name: 'Storage Access', path: '/merchandiser?tab=storage', icon: Database },
        { name: 'Reports', path: '/merchandiser?tab=reports', icon: BarChart3 }
      ];
    }
    if (isLocatorJourney) {
      return [
        { name: 'Item Search', path: '/locator?tab=finder', icon: SearchCode },
        { name: 'Warehouse View', path: '/locator?tab=warehouse', icon: Warehouse },
        { name: 'Logistics Logs', path: '/locator?tab=logs', icon: BarChart3 }
      ];
    }
    return [
      { name: 'Digital Hub', path: '/', icon: LayoutDashboard },
      { name: 'Dispatch Logs', path: '/dispatch', icon: Truck },
      { name: 'Global Inventory', path: '/inventory', icon: Database },
      { name: 'System Reports', path: '/reports', icon: BarChart3 },
    ];
  };

  // Switch Tab always exits to the Digital Hub from any journey
  const getSwitchTabDestination = () => '/';

  const switchTabDestination = getSwitchTabDestination();
  const menuItems = getMenuItems();

  return (
    <div className="h-screen flex overflow-hidden bg-[#F8FAFC] text-slate-900 font-['Inter']">
      
      {/* Left Sidebar - Premium Glassy Look */}
      <div className="w-[320px] bg-white flex flex-col z-30">
        
        {/* Logo/Branding */}
        <div className="h-32 flex items-center px-10 text-neutral-800">
          <Link to="/" className="flex items-center gap-5 group">
            <img
              src="/centro-logo.png"
              alt="Centro Tex Logo"
              className="w-14 h-14 rounded-full object-cover shadow-2xl shadow-red-500/20 group-hover:scale-105 transition-transform duration-300"
            />
            <div>
               <h1 className="font-bold text-2xl tracking-tighter text-slate-900">
                 CENTRO<span className="text-red-600">FLOW</span>
               </h1>
               <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-2 h-2 bg-[#10B981] rounded-full"></div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.25em]">{getJourneyName()}</span>
               </div>
            </div>
          </Link>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-8 py-6 space-y-10 overflow-y-auto custom-scrollbar">

          {/* Switch Tab — always visible on all pages */}
          <div>
            <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-6">
              Journey Flow
            </h3>
            <div className="space-y-1">
              <Link
                to={switchTabDestination}
                id="switch-tab-btn"
                className="flex items-center gap-4 px-5 py-4 rounded-[1.25rem] text-[15px] font-black text-blue-600 bg-blue-50/50 hover:bg-blue-100 transition-all border border-blue-100/50 mb-6 group shadow-sm"
              >
                <LayoutDashboard className="w-6 h-6 text-blue-600 group-hover:rotate-12 transition-transform duration-300" />
                <span className="tracking-tight">Switch Tab</span>
              </Link>

              {/* Journey-specific menu items — only when in a journey */}
              {activeJourney !== 'hub' && menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-4 px-5 py-4 rounded-[1.25rem] text-[15px] font-bold transition-all ${
                    isPath(item.path)
                      ? 'bg-slate-900 text-white shadow-xl shadow-slate-200'
                      : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <item.icon className={`w-6 h-6 ${isPath(item.path) ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-6">
              Global Platform
            </h3>
            <Link
              to="/admin"
              className={`flex items-center gap-4 px-5 py-4 rounded-[1.25rem] text-[15px] font-bold transition-all ${
                isPath('/admin')
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-200'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-6 h-6" />
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