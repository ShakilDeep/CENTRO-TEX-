import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Package, Search, Plus, RefreshCw, SmartphoneNfc, 
  ArrowRightLeft, MapPin, X, ChevronDown, ChevronUp,
  LayoutDashboard, User, Calendar, Database
} from 'lucide-react';
import { samplesApi, api, rfidApi, transfersApi, storageApi } from '../api';
import type { Sample } from '../api/samples';
import { useAuthStore } from '../stores/authStore';
import { useToastActions } from '../stores/uiStore';
import { useNavigate } from 'react-router-dom';

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

export default function Admin() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEncodeModalOpen, setIsEncodeModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  
  // Selected Sample for Actions
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  
  // Form States
  const [createFormData, setCreateFormData] = useState({ buyer_id: '', sample_type: 'Proto', description: '', photo_url: '' });
  const [encodeRfid, setEncodeRfid] = useState('');
  const [transferToUserId, setTransferToUserId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [storeLocationId, setStoreLocationId] = useState('');

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToastActions();

  // Queries
  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['admin-samples-queue'],
    queryFn: () => samplesApi.list()
  });

  const { data: buyersRes } = useQuery({
    queryKey: ['buyers'],
    queryFn: () => api.get('/api/v1/samples/buyers').then(r => r.data)
  });
  const buyersList = buyersRes?.data || [];

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

  const samples = response?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => samplesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-samples-queue'] });
      setIsCreateModalOpen(false);
      setCreateFormData({ buyer_id: '', sample_type: 'Proto', description: '', photo_url: '' });
      addToast({ type: 'success', title: 'Success', message: 'Sample created successfully. Now encode RFID.' });
    },
    onError: (err: any) => addToast({ type: 'error', title: 'Creation Failed', message: err.response?.data?.message || err.message })
  });

  const encodeMutation = useMutation({
    mutationFn: (data: { id: string; rfid_epc: string }) => samplesApi.encode(data.id, data.rfid_epc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-samples-queue'] });
      setIsEncodeModalOpen(false);
      setEncodeRfid('');
      addToast({ type: 'success', title: 'Encoded', message: 'RFID tag assigned successfully.' });
    },
    onError: (err: any) => addToast({ type: 'error', title: 'Encoding Failed', message: err.response?.data?.message || err.message })
  });

  const transferMutation = useMutation({
    mutationFn: (data: { id: string; to_user_id: string; reason: string; rfid_epc: string }) => transfersApi.initiate(data.id, data),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin-samples-queue'] });
        addToast({ type: 'success', title: 'Transfer Initiated', message: 'Transfer request sent.' });
        setIsTransferModalOpen(false);
        setSelectedSample(null);
        setTransferToUserId('');
        setTransferNotes('');
    },
    onError: (err: any) => addToast({ type: 'error', title: 'Transfer Failed', message: err.response?.data?.message || err.message })
  });

  const storeMutation = useMutation({
    mutationFn: (data: { id: string; location_id: string; rfid_epc: string }) => storageApi.store(data.id, data),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin-samples-queue'] });
        addToast({ type: 'success', title: 'Stored', message: 'Sample moved to storage.' });
        setIsStoreModalOpen(false);
        setSelectedSample(null);
        setStoreLocationId('');
    },
    onError: (err: any) => addToast({ type: 'error', title: 'Storage Failed', message: err.response?.data?.message || err.message })
  });

  // Filter Logic
  const filteredSamples = samples.filter((s: Sample) => {
    const matchesSearch = s.sample_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType ? s.sample_type === filterType : true;
    return matchesSearch && matchesFilter;
  });

  const handleAction = (sample: Sample, action: 'encode' | 'transfer' | 'store') => {
    setSelectedSample(sample);
    // Reset relevant states before opening modal
    if (action === 'transfer') {
      setTransferToUserId('');
      setTransferNotes('');
      setIsTransferModalOpen(true);
    }
    if (action === 'store') {
      setStoreLocationId('');
      setIsStoreModalOpen(true);
    }
    if (action === 'encode') {
      setEncodeRfid('');
      setIsEncodeModalOpen(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-blue-600" />
            Floor Counter Admin
          </h1>
          <p className="text-gray-500 mt-1">Digitalize merchandiser floor counter work: Create, Encode, Transfer, and Store.</p>
        </div>

        <div className="flex items-center gap-2">
          
          <button
            onClick={() => refetch()}
            className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100"
            title="Refresh Queue"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Create Sample</span>
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Samples', value: samples.length, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Pending Encode', value: samples.filter(s => !s.rfid_epc).length, icon: SmartphoneNfc, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'At Counter', value: samples.filter(s => s.current_status === 'AT_DISPATCH').length, icon: LayoutDashboard, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'In Storage', value: samples.filter(s => s.current_status === 'IN_STORAGE').length, icon: Database, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

      {/* Main Queue Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID or Description..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium outline-none text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="Proto">Proto</option>
              <option value="Fit">Fit</option>
              <option value="Size Set">Size Set</option>
              <option value="PP">PP</option>
              <option value="Shipment">Shipment</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Sample ID</th>
                <th className="px-6 py-4 font-semibold">Details</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Counter Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                    <p className="mt-2 text-sm">Loading queue...</p>
                  </td>
                </tr>
              ) : filteredSamples.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-base font-semibold text-gray-900">No samples in queue</p>
                  </td>
                </tr>
              ) : (
                filteredSamples.map((sample: Sample, i: number) => (
                  <React.Fragment key={sample.id}>
                    <tr 
                      onClick={() => setExpandedRow(expandedRow === sample.id ? null : sample.id)} 
                      className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-semibold text-gray-500">{sample.sample_id}</div>
                        <div className="font-bold text-gray-900 mt-0.5">{sample.sample_type}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 line-clamp-1">{sample.description}</div>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-600 font-semibold">
                          {sample.buyer?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={sample.current_status} />
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1 uppercase font-bold">
                          {sample.rfid_epc ? 'LINKED' : 'TAG PENDING'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!sample.rfid_epc ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleAction(sample, 'encode'); }} 
                              className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-orange-700 transition-all flex items-center gap-1.5"
                            >
                              <SmartphoneNfc className="w-3.5 h-3.5" /> ENCODE
                            </button>
                          ) : (
                            <>
                              {sample.current_status !== 'PENDING_TRANSFER_APPROVAL' && (
                                <>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleAction(sample, 'transfer'); }} 
                                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700 transition-all flex items-center gap-1.5"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5" /> TRANSFER
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleAction(sample, 'store'); }} 
                                    className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all flex items-center gap-1.5"
                                  >
                                    <MapPin className="w-3.5 h-3.5" /> STORE
                                  </button>
                                </>
                              )}
                              {sample.current_status === 'PENDING_TRANSFER_APPROVAL' && (
                                <span className="text-[10px] font-bold text-indigo-500 uppercase italic px-2 py-1 bg-indigo-50 rounded-md">
                                  Action Locked
                                </span>
                              )}
                            </>
                          )}
                          {expandedRow === sample.id ? <ChevronUp className="w-4 h-4 text-gray-400 ml-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />}
                        </div>
                      </td>
                    </tr>
                    {expandedRow === sample.id && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={4} className="px-10 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                            <div>
                              <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Assigned Merch</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-700 font-bold">
                                  {(sample as any).creator?.name?.slice(0,2).toUpperCase() || '??'}
                                </div>
                                <p className="font-semibold text-gray-900 border-b border-gray-200">{(sample as any).creator?.name || 'Unknown'}</p>
                              </div>
                            </div>
                            <div>
                                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Registered Date</p>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <p className="font-medium text-gray-700">{new Date(sample.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Technical Notes</p>
                                <p className="mt-1.5 text-gray-600 text-xs italic">"{sample.description}"</p>
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

      {/* CREATE SAMPLE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 bg-blue-50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-6 h-6 text-blue-600" />
                New Floor Sample
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-full shadow-sm border border-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Buyer *</label>
                <select
                  value={createFormData.buyer_id}
                  onChange={e => setCreateFormData({ ...createFormData, buyer_id: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                >
                  <option value="">Select buyer group...</option>
                  {buyersList.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Type *</label>
                <select
                  value={createFormData.sample_type}
                  onChange={e => setCreateFormData({ ...createFormData, sample_type: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                >
                  <option value="Proto">Proto</option>
                  <option value="Fit">Fit</option>
                  <option value="Size Set">Size Set</option>
                  <option value="PP">PP</option>
                  <option value="Shipment">Shipment</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Brief Description *</label>
                <textarea
                  value={createFormData.description}
                  onChange={e => setCreateFormData({ ...createFormData, description: e.target.value })}
                  placeholder="e.g. Blue Denim - XL - Summer V1"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-6 py-2.5 text-gray-600 font-bold hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(createFormData)}
                disabled={createMutation.isPending || !createFormData.buyer_id || !createFormData.description}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
              >
                {createMutation.isPending ? 'Processing...' : 'Register Sample'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENCODE MODAL */}
      {isEncodeModalOpen && selectedSample && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 bg-orange-50/50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <SmartphoneNfc className="w-6 h-6 text-orange-600" />
                RFID Hot-Swap
              </h3>
              <p className="text-xs text-gray-500 mt-1">Assigning hard tag to {selectedSample.sample_id}</p>
            </div>
            <div className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Scan Tag ID *</label>
                <input
                  type="text"
                  value={encodeRfid}
                  onChange={e => setEncodeRfid(e.target.value)}
                  placeholder="EPC Code..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-mono outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  autoFocus
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button onClick={() => { setIsEncodeModalOpen(false); setEncodeRfid(''); }} className="px-6 py-2.5 text-gray-600 font-bold uppercase text-xs">Cancel</button>
              <button
                onClick={() => encodeMutation.mutate({ id: selectedSample.id, rfid_epc: encodeRfid })}
                disabled={encodeMutation.isPending || !encodeRfid}
                className="px-8 py-2.5 bg-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 disabled:opacity-50 transition-all"
              >
                {encodeMutation.isPending ? 'Linking...' : 'Confirm Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {isTransferModalOpen && selectedSample && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 bg-blue-50/50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ArrowRightLeft className="w-6 h-6 text-blue-600" />
                Quick Transfer
              </h3>
              <p className="text-xs text-gray-500 mt-1">Handoff {selectedSample.sample_id} to another user.</p>
            </div>
            <div className="p-8 space-y-5">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Recipient Merchandiser *</label>
                    <select value={transferToUserId} onChange={e => setTransferToUserId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm">
                        <option value="">Select recipient...</option>
                        {usersList.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Tag Verification (Scan Required)</label>
                    <input 
                      type="text" 
                      readOnly 
                      value={selectedSample.rfid_epc || 'N/A'} 
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl text-sm font-mono text-gray-500" 
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Action Reason</label>
                    <textarea value={transferNotes} onChange={e => setTransferNotes(e.target.value)} placeholder="Why are you transferring this?" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm" rows={2}></textarea>
                </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setIsTransferModalOpen(false)} className="px-6 py-2.5 text-gray-600 font-bold uppercase text-xs">Close</button>
              <button 
                onClick={() => transferMutation.mutate({ id: selectedSample.id, to_user_id: transferToUserId, reason: transferNotes, rfid_epc: selectedSample.rfid_epc || '' })} 
                disabled={transferMutation.isPending || !transferToUserId || !transferNotes}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Send Request
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
                Bin Placement
              </h3>
              <p className="text-xs text-gray-500 mt-1">Finalizing storage for {selectedSample.sample_id}</p>
            </div>
            <div className="p-8 space-y-5">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Target Location Rack/Shelf/Bin *</label>
                    <select value={storeLocationId} onChange={e => setStoreLocationId(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm">
                        <option value="">Choose available bin...</option>
                        {locationsList.map((loc: any) => <option key={loc.id} value={loc.id}>RACK {loc.rack} : SH {loc.shelf} : BIN {loc.bin_id}</option>)}
                    </select>
                </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setIsStoreModalOpen(false)} className="px-6 py-2.5 text-gray-600 font-bold uppercase text-xs">Back</button>
              <button 
                onClick={() => storeMutation.mutate({ id: selectedSample.id, location_id: storeLocationId, rfid_epc: selectedSample.rfid_epc || '' })} 
                disabled={storeMutation.isPending || !storeLocationId}
                className="px-8 py-2.5 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                Confirm Storage
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
