import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, UserPlus, Search, ArrowRight } from 'lucide-react';
import logoUrl from '../assets/logo.png';

const pathways = [
  {
    id: 'admin',
    title: 'Admin',
    description: 'Manage samples, encode RFID tags, and monitor system-wide sample tracking across all departments.',
    icon: Shield,
    color: 'from-blue-600 to-indigo-700',
    path: '/admin',
    features: ['Create Sample', 'Encode RFID', 'Transfer Control', 'Storage Management']
  },
  {
    id: 'merchandiser',
    title: 'Merchandiser',
    description: 'Access samples in your care, accept new transfers, and manage your localized sample storage.',
    icon: UserPlus,
    color: 'from-orange-500 to-red-600',
    path: '/merchandiser',
    features: ['Real-time Receiving', 'Owner Transfers', 'Storage Bin Control', 'Inventory Access']
  },
  {
    id: 'locator',
    title: 'Sample Locator',
    description: 'Quickly find and identify any sample within the entire organization using powerful keyword search.',
    icon: Search,
    color: 'from-emerald-500 to-teal-600',
    path: '/locator',
    features: ['Instant Search', 'Live Location Tracking', 'Assign to Self', 'Request Transfers']
  }
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col font-['Inter'] space-y-12 py-8 max-w-[1400px]">
      
      {/* Hub Hero */}
      <div className="flex flex-col">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-2"
          >
            <h1 className="text-5xl font-black text-slate-900 tracking-tight">
              Digital <span className="text-blue-600">Hub</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-3xl font-medium leading-relaxed">
              Orchestrate your enterprise logistics through journey-aware operational workspaces and real-time intelligence.
            </p>
          </motion.div>
      </div>

      {/* Pathways Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {pathways.map((path, idx) => (
          <motion.div
            key={path.id}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 + (idx * 0.1) }}
            whileHover={{ y: -10, transition: { duration: 0.2 } }}
            onClick={() => navigate(path.path)}
            className="group relative bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 cursor-pointer overflow-hidden transition-all hover:shadow-[0_40px_70px_-20px_rgba(29,97,255,0.15)]"
          >
            {/* Card Gradient Bar */}
            <div className={`absolute top-0 left-0 w-full h-3 bg-gradient-to-r ${path.color}`}></div>
            
            {/* Icon Container */}
            <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${path.color} flex items-center justify-center text-white mb-8 transform group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-blue-100`}>
              <path.icon className="w-10 h-10" />
            </div>

            {/* Text Content */}
            <h3 className="text-3xl font-bold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">
              {path.title}
            </h3>
            <p className="text-slate-500 text-[15px] leading-relaxed mb-10 font-medium">
              {path.description}
            </p>

            {/* Feature Tags */}
            <div className="flex flex-wrap gap-2.5 mb-10">
              {path.features.map(f => (
                <span key={f} className="text-[11px] uppercase font-bold tracking-widest px-3 py-1.5 bg-slate-50 text-slate-400 rounded-xl border border-slate-100 group-hover:border-blue-100 group-hover:text-blue-400 transition-colors">
                  {f}
                </span>
              ))}
            </div>

            {/* Action Button */}
            <div className="mt-auto flex items-center text-slate-900 font-bold group-hover:text-blue-600 transition-all text-sm uppercase tracking-widest bg-slate-50 group-hover:bg-blue-50 -mx-10 -mb-10 p-10 mt-4 border-t border-slate-50">
              Enter Workspace
              <ArrowRight className="w-5 h-5 ml-auto transform group-hover:translate-x-2 transition-transform" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* System Status Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="pt-12 text-slate-400 text-[11px] font-bold tracking-[0.3em] uppercase flex items-center gap-6"
      >
        <div className="h-px flex-1 bg-slate-100"></div>
        CentroFlow Operational Intelligence Environment
        <div className="h-px flex-1 bg-slate-100"></div>
      </motion.div>
      {/* Footer Branding */}
      <footer className="py-12 mt-12 text-center text-slate-400 text-xs font-bold tracking-widest uppercase border-t border-slate-100">
        &copy; {new Date().getFullYear()} Centro Tex. High-Performance Logistics.
      </footer>
    </div>
  );
}
