import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Package, Search, RefreshCw, SmartphoneNfc, 
  ArrowRightLeft, MapPin, X, ChevronDown, ChevronUp,
  User, Calendar, Database, CheckCircle2, XCircle,
  BellRing, Truck
} from 'lucide-react';
import { samplesApi, api, transfersApi, storageApi } from '../api';
import type { Sample } from '../api/samples';
import type { Transfer } from '../api/transfers';
import { useAuthStore } from '../stores/authStore';
import { useToastActions } from '../stores/uiStore';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SAMPLE_STATUS_COLORS: Record<string, string> = {
  IN_TRANSIT_TO_DISPATCH: 'bg-blue-100 text-blue-800 border-blue-200',
  AT_DISPATCH: 'bg-blue-100 text-blue-800 border-blue-200',
  WITH_MERCHANDISER: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  IN_STORAGE: 'bg-gray-100 text-gray-800 border-gray-200',
  PENDING_TRANSFER_APPROVAL: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  DISPOSED: 'bg-black text-white border-black',
  LOST: 'bg-red-100 text-red-800 border-red-200',
};

const StatusBadge = ({ status }: { status: string }) => {
  const colorClass = SAMPLE_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border uppercase ${colorClass}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export default function Merchandiser() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  // Modals/Popups
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [transferToApprove, setTransferToApprove] = useState<Transfer | null>(null);
  
  // Selected Sample for Actions
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  
  // Form States
  const [transferToUserId, setTransferToUserId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [storeLocationId, setStoreLocationId] = useState('');

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToastActions();

  // --- Queries ---
  const { data: samplesRes, isLoading: isLoadingSamples, refetch: refetchSamples } = useQuery({
    queryKey: ['merchandiser-samples'],
    queryFn: () => samplesApi.list()
  });

  const { data: pendingTransfersRes, refetch: refetchTransfers } = useQuery({
    queryKey: ['merchandiser-pending-transfers'],
    queryFn: () => transfersApi.getPending(),
    refetchInterval: 10000 // Pull for "pop-up" every 10s
  });

  const { data: usersResponse } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
        const res = await api.get('/api/v1/auth/users');
        return res.data;
    }
  });
  const usersList = usersResponse?.data || [];

  const { data: locationsResponse } = useQuery({
    queryKey: ['locations-list'],
    queryFn: () => storageApi.getLocations()
  });
  const locationsList = locationsResponse?.data || [];

  // --- Auto-show Pop-up for Transfer Request ---
  useEffect(() => {
    const pendingTransfers = pendingTransfersRes?.data || [];
    if (pendingTransfers.length > 0 && !transferToApprove) {
        setTransferToApprove(pendingTransfers[0]);
    }
  }, [pendingTransfersRes, transferToApprove]);

  const allSamples = samplesRes?.data || [];
  // Filter for samples currently with this merchandiser
  const mySamples = allSamples.filter(s => s.current_owner_id === user?.id || s.current_status === 'WITH_MERCHANDISER');

  const filteredSamples = mySamples.filter((s: Sample) => {
    const matchesSearch = s.sample_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // --- Mutations ---
  const transferMutation = useMutation({
    mutationFn: (data: { id: string; to_user_id: string; reason: string; rfid_epc: string }) => transfersApi.initiate(data.id, data),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['merchandiser-samples'] });
        addToast({ type: 'success', title: 'Transfer Sent', message: 'Request sent to recipient.' });
        setIsTransferModalOpen(false);
        setSelectedSample(null);
    },
    onError: (err: any) => addToast({ type: 'error', title: 'Transfer Failed', message: err.response?.data?.message || err.message })
  });

  const storeMutation = useMutation({
    mutationFn: (data: { id: string; location_id: string; rfid_epc: string }) => storageApi.store(data.id, data),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['merchandiser-samples'] });
        addToast({ type: 'success', title: 'Stored', message: 'Sample move to storage complete.' });
        setIsStoreModalOpen(false);
        setSelectedSample(null);
    },
    onError: (err: any) => addToast({ type: 'error', title: 'Storage Failed', message: err.response?.data?.message || err.message })
  });

  const acceptTransferMutation = useMutation({
    mutationFn: (id: string) => transfersApi.accept(id),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['merchandiser-samples'] });
        queryClient.invalidateQueries({ queryKey: ['merchandiser-pending-transfers'] });
        addToast({ type: 'success', title: 'Accepted', message: 'Sample is now in your possession.' });
        setTransferToApprove(null);
    },
    onError: (err: any) => addToast({ type: 'error', title: 'Action Failed', message: 'Could not accept transfer.' })
  });

  const rejectTransferMutation = useMutation({
    mutationFn: (id: string) => transfersApi.reject(id),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['merchandiser-pending-transfers'] });
        addToast({ type: 'info', title: 'Rejected', message: 'Transfer request declined.' });
        setTransferToApprove(null);
    },
    onError: (err: any) => addToast({ type: 'error', title: 'Action Failed', message: 'Could not reject transfer.' })
  });

  const handleAction = (sample: Sample, action: 'transfer' | 'store') => {
    setSelectedSample(sample);
    if (action === 'transfer') setIsTransferModalOpen(true);
    if (action === 'store') setIsStoreModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      
      {/* PREMIUM TRANSFER SIGNAL POPUP ( Journey Real-time Context ) */}
      <AnimatePresence>
        {transferToApprove && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-8 right-8 z-[100] w-96 overflow-hidden"
          >
            <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(37,99,235,0.25)] border border-blue-100/50">
               <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                  <div className="flex items-center justify-between mb-4">
                     <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black tracking-widest uppercase">New Transfer Signal</div>
                     <Truck className="w-5 h-5 text-blue-200" />
                  </div>
                  <h4 className="text-xl font-bold leading-tight">Incoming Sample Handoff</h4>
                  <p className="text-sm text-blue-100 mt-1 opacity-80">Action required to update possession state.</p>
               </div>
               
               <div className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                       <Package className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                       <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sample Ref</p>
                       <p className="text-lg font-bold text-slate-900">[{transferToApprove.sample.sample_id}]</p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-8">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Transfer Note</p>
                     <p className="text-sm text-slate-600 italic">"{transferToApprove.reason || 'No description provided'}"</p>
                     <div className="flex items-center gap-1.5 mt-3 text-[11px] text-slate-500">
                        <User className="w-3 h-3 text-blue-500" />
                        <span>Sender: <span className="font-bold">{transferToApprove.from_user.name}</span></span>
                     </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => rejectTransferMutation.mutate(transferToApprove.id)}
                      disabled={rejectTransferMutation.isPending || acceptTransferMutation.isPending}
                      className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => acceptTransferMutation.mutate(transferToApprove.id)}
                      disabled={acceptTransferMutation.isPending || rejectTransferMutation.isPending}
                      className="flex-[2] py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 text-xs uppercase tracking-widest"
                    >
                      Accept Sample
                    </button>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
            <User className="w-8 h-8 text-orange-500" />
            Merchandiser Journey
          </h1>
          <p className="text-gray-500 mt-1">Manage samples assigned to you and track your operational flow.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { refetchSamples(); refetchTransfers(); }}
            className="p-2.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
            title="Refresh All"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'My Current Balance', value: mySamples.length, icon: Package, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Awaiting Receipt', value: pendingTransfersRes?.data?.length || 0, icon: BellRing, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Recently Stored', value: mySamples.filter(s => s.current_status === 'IN_STORAGE').length, icon: Database, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Sample Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search my samples..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-orange-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                <th className="px-6 py-4">Sample ID / Type</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Status & Tech</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoadingSamples ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500" />
                  </td>
                </tr>
              ) : filteredSamples.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-base font-semibold text-gray-900">You don't have any active samples</p>
                    <p className="text-xs text-gray-500 mt-1">Accept incoming transfers to start working.</p>
                  </td>
                </tr>
              ) : (
                filteredSamples.map((sample: Sample, i: number) => (
                  <React.Fragment key={sample.id}>
                    <tr 
                      onClick={() => setExpandedRow(expandedRow === sample.id ? null : sample.id)} 
                      className="hover:bg-orange-50/20 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-mono text-[11px] font-bold text-gray-400">{sample.sample_id}</div>
                        <div className="font-black text-gray-900 text-sm mt-0.5">{sample.sample_type}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-700 line-clamp-1">{sample.description}</div>
                        <div className="text-[10px] text-orange-600 mt-1 font-black bg-orange-50 px-2 py-0.5 rounded-full inline-block">
                          {sample.buyer?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={sample.current_status} />
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1 uppercase font-bold">
                          {sample.rfid_epc ? `TAG: ${sample.rfid_epc.slice(-8)}` : 'TAG PENDING'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                            onClick={(e) => { e.stopPropagation(); handleAction(sample, 'transfer'); }} 
                            className="bg-white border-2 border-gray-100 text-blue-600 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-50 transition-all flex items-center gap-1.5"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" /> TRANSFER
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleAction(sample, 'store'); }} 
                            className="bg-white border-2 border-gray-100 text-emerald-600 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-all flex items-center gap-1.5"
                          >
                            <MapPin className="w-3.5 h-3.5" /> STORE
                          </button>
                          {expandedRow === sample.id ? <ChevronUp className="w-4 h-4 text-gray-400 ml-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />}
                        </div>
                      </td>
                    </tr>
                    {expandedRow === sample.id && (
                        <tr className="bg-gray-50/70">
                            <td colSpan={4} className="px-10 py-6">
                                <div className="flex gap-10 items-start">
                                     <div className="shrink-0">
                                        <div className="w-24 h-24 bg-white rounded-3xl border-2 border-gray-100 flex items-center justify-center">
                                            <Package className="w-10 h-10 text-gray-200" />
                                        </div>
                                     </div>
                                     <div className="flex-1 grid grid-cols-3 gap-6">
                                         <div>
                                            <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Ownership Date</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Calendar className="w-4 h-4 text-orange-400" />
                                                <p className="font-bold text-gray-800 text-sm">{new Date(sample.updated_at).toLocaleDateString()}</p>
                                            </div>
                                         </div>
                                         <div>
                                            <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">RFID Status</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <SmartphoneNfc className="w-4 h-4 text-blue-400" />
                                                <p className="font-mono text-gray-800 text-xs font-bold">{sample.rfid_epc || 'NOT_ENCODED'}</p>
                                            </div>
                                         </div>
                                         <div>
                                            <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Storage Status</label>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Database className="w-4 h-4 text-emerald-400" />
                                                <p className="font-bold text-gray-800 text-sm">
                                                    {sample.current_status === 'IN_STORAGE' ? 'ACTIVE_STORAGE' : 'IN_HAND'}
                                                </p>
                                            </div>
                                         </div>
                                         <div className="col-span-3">
                                            <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Merchandiser's Technical Memo</label>
                                            <p className="mt-1 text-gray-600 text-sm italic">"{sample.description}"</p>
                                         </div>
                                     </div>
                                </div>
                            </td>
                        </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TRANSFER MODAL */}
      {isTransferModalOpen && selectedSample && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 bg-blue-50/50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ArrowRightLeft className="w-6 h-6 text-blue-600" />
                Transfer Handoff
              </h3>
              <p className="text-xs text-gray-500 mt-1">Passing {selectedSample.sample_id} to another merchandiser.</p>
            </div>
            <div className="p-8 space-y-5">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">New Holder (Recipient) *</label>
                    <select value={transferToUserId} onChange={e => setTransferToUserId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                        <option value="">Select recipient...</option>
                        {usersList.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Action Reason</label>
                    <textarea value={transferNotes} onChange={e => setTransferNotes(e.target.value)} placeholder="Reason for this movement..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm" rows={2}></textarea>
                </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/20">
              <button onClick={() => setIsTransferModalOpen(false)} className="px-6 py-2.5 text-gray-400 font-bold text-xs uppercase">Cancel</button>
              <button 
                onClick={() => transferMutation.mutate({ id: selectedSample.id, to_user_id: transferToUserId, reason: transferNotes, rfid_epc: selectedSample.rfid_epc || '' })} 
                disabled={transferMutation.isPending || !transferToUserId || !transferNotes}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95"
              >
                Send Transfer Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STORE MODAL */}
      {isStoreModalOpen && selectedSample && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 bg-emerald-50/50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-emerald-600" />
                Move to Storage
              </h3>
              <p className="text-xs text-gray-500 mt-1">Finalizing placement for {selectedSample.sample_id}</p>
            </div>
            <div className="p-8 space-y-5">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Physical Bin Location *</label>
                    <select value={storeLocationId} onChange={e => setStoreLocationId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm transition-all focus:ring-2 focus:ring-emerald-500 outline-none">
                        <option value="">Choose location...</option>
                        {locationsList.map((loc: any) => <option key={loc.id} value={loc.id}>Rack {loc.rack} : Bin {loc.bin_id}</option>)}
                    </select>
                </div>
                {!selectedSample.rfid_epc && (
                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl text-xs text-orange-700 font-medium">
                        <b>Critical Note:</b> This sample has no RFID tag. It will be stored without digital linkage. Merchandiser is advised to encode a tag in the Admin journey first.
                    </div>
                )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/20">
              <button onClick={() => setIsStoreModalOpen(false)} className="px-6 py-2.5 text-gray-400 font-bold text-xs uppercase">Hold</button>
              <button 
                onClick={() => storeMutation.mutate({ id: selectedSample.id, location_id: storeLocationId, rfid_epc: selectedSample.rfid_epc || '' })} 
                disabled={storeMutation.isPending || !storeLocationId}
                className="px-8 py-2.5 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95"
              >
                Confirm Storage Placement
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
