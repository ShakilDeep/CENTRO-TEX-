import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Package, Search, RefreshCw, MapPin, 
  ArrowRightLeft, UserCheck, LayoutGrid, List,
  Filter, Calendar, Database, X, Info,
  SearchCode, Warehouse, Layers
} from 'lucide-react';
import { samplesApi, storageApi, transfersApi } from '../api';
import type { Sample } from '../api/samples';
import type { StorageLocation } from '../api/storage';
import { useAuthStore } from '../stores/authStore';
import { useToastActions } from '../stores/uiStore';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_TEXT_COLORS: Record<string, string> = {
    IN_STORAGE: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    AT_DISPATCH: 'text-blue-700 bg-blue-50 border-blue-100',
    WITH_MERCHANDISER: 'text-yellow-700 bg-yellow-50 border-yellow-100',
    LOST: 'text-red-700 bg-red-50 border-red-100'
};

export default function Locator() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const { addToast } = useToastActions();

    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBuyer, setFilterBuyer] = useState('');
    const [selectedSample, setSelectedSample] = useState<Sample | null>(null);

    // --- Queries ---
    const { data: samplesRes, isLoading: isLoadingSamples, refetch: refetchSamples } = useQuery({
        queryKey: ['locator-samples-search'],
        queryFn: () => samplesApi.list()
    });

    const { data: locationsRes, isLoading: isLoadingLocations } = useQuery({
        queryKey: ['locator-storage-locations'],
        queryFn: () => storageApi.getLocations()
    });

    const samples = samplesRes?.data || [];
    const locations = locationsRes?.data || [];

    // --- Mutations ---
    const assignToMeMutation = useMutation({
        mutationFn: (sample: Sample) => transfersApi.initiate(sample.id, { 
            to_user_id: user?.id || '', 
            reason: 'Self-assignment by Sample Locator',
            rfid_epc: sample.rfid_epc || ''
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locator-samples-search'] });
            addToast({ type: 'success', title: 'Assigned', message: 'Sample transfer request to yourself initiated.' });
            setSelectedSample(null);
        },
        onError: (err: any) => addToast({ type: 'error', title: 'Assignment Failed', message: 'Could not assign sample.' })
    });

    const requestTransferMutation = useMutation({
        mutationFn: (data: { id: string; to_id: string; rfid: string }) => 
            transfersApi.initiate(data.id, { to_user_id: data.to_id, reason: 'Requested by Locator', rfid_epc: data.rfid }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locator-samples-search'] });
            addToast({ type: 'success', title: 'Requested', message: 'Pull out transfer request sent.' });
            setSelectedSample(null);
        }
    });

    // --- Filter Logic ---
    const filteredSamples = samples.filter(s => {
        const matchesSearch = s.sample_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBuyer = filterBuyer ? s.buyer?.name === filterBuyer : true;
        return matchesSearch && matchesBuyer;
    });

    const buyers = Array.from(new Set(samples.map(s => s.buyer?.name).filter(Boolean)));

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
            
            {/* Header / Search Dashboard */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-center bg-gradient-to-br from-white to-slate-50">
                <div className="shrink-0 p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-100 rotate-3">
                    <SearchCode className="w-10 h-10 text-white" />
                </div>
                
                <div className="flex-1 space-y-4 w-full">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Digital Sample Finder</h1>
                        <p className="text-slate-500 text-sm font-medium">Scan the global sample warehouse instantly. Request and assign in one click.</p>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-3 pt-2">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Universal ID search (Sample Code, Details, RFID...)" 
                                className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-600/30 focus:ring-4 focus:ring-indigo-600/5 transition-all text-sm font-semibold"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select 
                            className="px-6 py-3.5 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-600 outline-none hover:border-slate-200 transition-colors"
                            value={filterBuyer}
                            onChange={e => setFilterBuyer(e.target.value)}
                        >
                            <option value="">All Buyers</option>
                            {buyers.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Storage Warehouse Visualization (Quick Stats) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Samples in Storage', value: samples.filter(s => s.current_status === 'IN_STORAGE').length, icon: Warehouse, color: 'text-emerald-500' },
                    { label: 'Active Transfers', value: samples.filter(s => s.current_status === 'PENDING_TRANSFER_APPROVAL').length, icon: ArrowRightLeft, color: 'text-indigo-500' },
                    { label: 'Merch Possession', value: samples.filter(s => s.current_status === 'WITH_MERCHANDISER').length, icon: UserCheck, color: 'text-orange-500' },
                    { label: 'Warehouse Bins', value: locations.length, icon: Layers, color: 'text-slate-500' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                       <div className={`${stat.color} p-3.5 bg-slate-50 rounded-2xl`}>
                            <stat.icon className="w-6 h-6" />
                       </div>
                       <div>
                           <div className="text-2xl font-black text-slate-900 leading-tight">{stat.value}</div>
                           <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{stat.label}</div>
                       </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence>
                        {filteredSamples.map((sample, i) => (
                            <motion.div 
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={sample.id} 
                                className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:shadow-indigo-600/5 transition-all group cursor-pointer active:scale-[0.98]"
                                onClick={() => setSelectedSample(sample)}
                            >
                                <div className="p-6 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 font-mono text-[10px] font-bold text-slate-400">
                                            {sample.sample_id}
                                        </div>
                                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${STATUS_TEXT_COLORS[sample.current_status] || 'text-slate-500 bg-slate-50'}`}>
                                            {sample.current_status.replace(/_/g, ' ')}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase truncate">{sample.sample_type} - {sample.buyer?.name}</h3>
                                        <p className="text-xs text-slate-500 line-clamp-2 mt-1 font-medium leading-relaxed italic">"{sample.description}"</p>
                                    </div>

                                    <div className="pt-2 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {sample.storage_location ? `Bin ${sample.storage_location.bin_id}` : 'FLOOR FLOW'}
                                        </div>
                                        <div className="flex -space-x-2">
                                             <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm" title="Owner">
                                                 {sample.current_owner?.name?.slice(0,1) || 'SYSTEM'}
                                             </div>
                                        </div>
                                    </div>
                                </div>
                                 <div className="p-2 border-t border-slate-50 flex gap-2">
                                     {sample.current_status === 'IN_STORAGE' ? (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); assignToMeMutation.mutate(sample); }}
                                            className="flex-1 bg-emerald-600 text-white py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <UserCheck className="w-3 h-3" /> Assign Me
                                        </button>
                                     ) : (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); requestTransferMutation.mutate({ id: sample.id, to_id: user?.id || '', rfid: sample.rfid_epc || '' }); }}
                                            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ArrowRightLeft className="w-3 h-3" /> Request Transfer
                                        </button>
                                     )}
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedSample(sample); }}
                                        className="w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-colors"
                                     >
                                         <Info className="w-4 h-4" />
                                     </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                                <th className="px-8 py-5">Full Registry ID</th>
                                <th className="px-8 py-5">Global Status</th>
                                <th className="px-8 py-5">Physical Bin</th>
                                <th className="px-8 py-5 text-right">Rapid Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredSamples.map(sample => (
                                <tr key={sample.id} className="hover:bg-indigo-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="font-mono text-[10px] font-bold text-slate-400">#CF-{sample.sample_id}</div>
                                        <div className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{sample.sample_type} Sample ({sample.buyer?.name})</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider inline-block ${STATUS_TEXT_COLORS[sample.current_status] || 'text-slate-500 bg-slate-50 font-bold'}`}>
                                            {sample.current_status.replace(/_/g, ' ')}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2 text-slate-600 text-sm font-bold">
                                            <Database className="w-4 h-4 text-emerald-500" />
                                            {sample.storage_location ? `RACK ${sample.storage_location.rack} / BIN ${sample.storage_location.bin_id}` : 'UNSTORED (FLOOR)'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        {sample.current_status === 'IN_STORAGE' ? (
                                            <button 
                                                onClick={() => assignToMeMutation.mutate(sample)}
                                                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:translate-y-[-2px] hover:shadow-emerald-200 transition-all active:scale-95"
                                            >
                                                Assign To Me
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => requestTransferMutation.mutate({ id: sample.id, to_id: user?.id || '', rfid: sample.rfid_epc || '' })}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:translate-y-[-2px] hover:shadow-indigo-200 transition-all active:scale-95"
                                            >
                                                Request Transfer
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Sample Detail Sidebar / Overlay */}
            <AnimatePresence>
                {selectedSample && (
                    <div className="fixed inset-0 z-[70] flex justify-end">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedSample(null)} 
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
                        />
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-lg bg-white h-full shadow-2xl p-8 overflow-y-auto"
                        >
                            <button 
                                onClick={() => setSelectedSample(null)} 
                                className="absolute right-8 top-8 p-2 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-2xl transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="space-y-10 pt-10">
                                <div className="space-y-2">
                                    <div className="text-[10px] text-indigo-600 font-black uppercase tracking-[0.3em]">Registry Details</div>
                                    <h2 className="text-4xl font-black text-slate-900 leading-tight">[{selectedSample.sample_id}] <br/> {selectedSample.sample_type}</h2>
                                    <div className="flex gap-2 pt-2">
                                        <StatusBadge status={selectedSample.current_status} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                     <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                         <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 block">Current Custodian</label>
                                         <div className="flex items-center gap-3">
                                              <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                                                  {selectedSample.current_owner?.name?.slice(0,2).toUpperCase() || '??'}
                                              </div>
                                              <div>
                                                  <div className="font-bold text-slate-900">{selectedSample.current_owner?.name || 'In Storage'}</div>
                                                  <div className="text-[10px] text-slate-500 font-bold uppercase">{selectedSample.current_owner?.email || 'SYSTEM CONTROL'}</div>
                                              </div>
                                         </div>
                                     </div>
                                     <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100/50">
                                         <label className="text-[10px] text-emerald-600/60 font-black uppercase tracking-widest mb-2 block">Warehouse Path</label>
                                         <div className="flex items-center gap-3">
                                              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-emerald-600">
                                                  <MapPin className="w-5 h-5" />
                                              </div>
                                              <div>
                                                  <div className="font-bold text-emerald-900">{selectedSample.storage_location ? `BIN ${selectedSample.storage_location.bin_id}` : 'NOT STORED'}</div>
                                                  <div className="text-[10px] text-emerald-600/60 font-bold uppercase">{selectedSample.storage_location ? `RACK ${selectedSample.storage_location.rack}` : 'LOCATION PENDING'}</div>
                                              </div>
                                         </div>
                                     </div>
                                </div>

                                <div className="space-y-4">
                                     <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-widest pl-2">Available Logistics Actions</h4>
                                     <div className="flex flex-col gap-3">
                                         <button 
                                            onClick={() => assignToMeMutation.mutate(selectedSample)}
                                            className="w-full bg-indigo-600 text-white p-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center justify-center gap-3 group"
                                         >
                                             <UserCheck className="w-4 h-4 group-hover:scale-110 transition-transform" /> 
                                             Pull Sample to my Possession
                                         </button>
                                         <button 
                                            onClick={() => requestTransferMutation.mutate({ id: selectedSample.id, to_id: user?.id || '', rfid: selectedSample.rfid_epc || '' })}
                                            className="w-full bg-white border-2 border-slate-100 text-slate-600 p-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-3"
                                         >
                                             <ArrowRightLeft className="w-4 h-4" />
                                             Request Official Transfer
                                         </button>
                                     </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-widest pl-2">System Metadata</h4>
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-500 font-medium">Buyer Group:</span>
                                            <span className="font-bold text-slate-900">{selectedSample.buyer?.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-500 font-medium">RFID Tag (EPC):</span>
                                            <span className="font-mono font-bold text-indigo-600">{selectedSample.rfid_epc || 'UNREGISTERED'}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-500 font-medium">Created On:</span>
                                            <span className="font-bold text-slate-900">{new Date(selectedSample.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      IN_TRANSIT_TO_DISPATCH: 'bg-blue-100 text-blue-800 border-blue-200',
      AT_DISPATCH: 'bg-blue-100 text-blue-800 border-blue-200',
      WITH_MERCHANDISER: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      IN_STORAGE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      PENDING_TRANSFER_APPROVAL: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
    const colorClass = colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest border uppercase ${colorClass}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };
