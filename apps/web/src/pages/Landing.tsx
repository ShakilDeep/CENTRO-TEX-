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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-100/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-orange-100/30 rounded-full blur-3xl"></div>
      </div>

      {/* Hero Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-12 text-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <img src={logoUrl} alt="CentroFlow Logo" className="w-24 h-24 mx-auto mb-6 object-contain" />
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-4">
            Welcome to <span className="text-blue-600">CentroFlow</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">
            The next-generation operations dashboard for high-performance enterprise sample tracking.
          </p>
        </motion.div>

        {/* Pathways Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full mt-12 px-4 shadow-sm z-10">
          {pathways.map((path, idx) => (
            <motion.div
              key={path.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + (idx * 0.1) }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              onClick={() => navigate(path.path)}
              className="group relative bg-white rounded-3xl p-8 shadow-xl border border-slate-100 cursor-pointer overflow-hidden transition-all hover:shadow-2xl hover:shadow-blue-200/50"
            >
              {/* Card Gradient Bar */}
              <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${path.color}`}></div>
              
              {/* Icon Container */}
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${path.color} flex items-center justify-center text-white mb-6 transform group-hover:scale-110 transition-transform duration-300`}>
                <path.icon className="w-8 h-8" />
              </div>

              {/* Text Content */}
              <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                {path.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                {path.description}
              </p>

              {/* Feature Tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {path.features.map(f => (
                  <span key={f} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-slate-50 text-slate-400 rounded-md border border-slate-100">
                    {f}
                  </span>
                ))}
              </div>

              {/* Action Button */}
              <div className="mt-auto flex items-center text-slate-900 font-bold group-hover:text-blue-600 transition-all">
                Access Workspace
                <ArrowRight className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* System Motto */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-16 text-slate-400 text-xs font-semibold tracking-widest uppercase flex items-center gap-4"
        >
          <div className="h-px w-12 bg-slate-200"></div>
          Powered by Advanced Agentic Operations
          <div className="h-px w-12 bg-slate-200"></div>
        </motion.div>
      </div>

      {/* Footer Branding */}
      <footer className="py-8 text-center text-slate-400 text-sm border-t border-slate-100">
        &copy; {new Date().getFullYear()} Centro Tex. Real-time Logistics Platform.
      </footer>
    </div>
  );
}
