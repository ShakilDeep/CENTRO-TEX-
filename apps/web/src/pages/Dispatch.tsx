import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Package, SmartphoneNfc, Search, RefreshCw, Layers, Clock,
    User, Calendar, ChevronDown, ChevronUp, Plus, X, ImagePlus, Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dispatchApi, samplesApi, transfersApi, storageApi, api } from '../api';
import type { Sample } from '../api/samples';
import { useToastActions } from '../stores/uiStore';
import { compressImage } from '../utils/compressImage';
import { buildCreateSamplePayload } from '../utils/samplePayload';

// ─── Status badge ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
    IN_TRANSIT_TO_DISPATCH:    'bg-blue-100 text-blue-800 border-blue-200',
    AT_DISPATCH:               'bg-blue-100 text-blue-800 border-blue-200',
    WITH_MERCHANDISER:         'bg-yellow-100 text-yellow-800 border-yellow-200',
    IN_STORAGE:                'bg-gray-100 text-gray-800 border-gray-200',
    PENDING_TRANSFER_APPROVAL: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    DISPOSED:                  'bg-black text-white border-black',
    LOST:                      'bg-red-100 text-red-800 border-red-200',
};

const StatusBadge = ({ status }: { status: string }) => (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border uppercase ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {status.replace(/_/g, ' ')}
    </span>
);

// ─── Form initial state ───────────────────────────────────────────────────────
const INIT_CREATE = {
    buyer_id: '',
    sample_type: 'Proto',
    description: '',
    photo_url: '',
    factory_id: '',
    assigned_merchandiser_id: '',
    purpose: 'OTHER',
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function Dispatch() {
    const queryClient  = useQueryClient();
    const { addToast } = useToastActions();
    const navigate     = useNavigate();

    // Table
    const [searchTerm,  setSearchTerm]  = useState('');
    const [filterType,  setFilterType]  = useState('');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    // Modals
    const [selectedSample,    setSelectedSample]    = useState<Sample | null>(null);
    const [showReceiveModal,  setShowReceiveModal]  = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showStoreModal,    setShowStoreModal]    = useState(false);
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [showCreateModal,   setShowCreateModal]   = useState(false);

    // Action fields
    const [rfidEpc,          setRfidEpc]          = useState('');
    const [senderName,       setSenderName]       = useState('');
    const [transferToUserId, setTransferToUserId] = useState('');
    const [transferNotes,    setTransferNotes]    = useState('');
    const [storeLocationId,  setStoreLocationId]  = useState('');
    const [reassignMerchId,  setReassignMerchId]  = useState('');

    // Create form
    const [createForm,   setCreateForm]   = useState(INIT_CREATE);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const photoRef = useRef<HTMLInputElement>(null);

    // ─── Queries ──────────────────────────────────────────────────────────────
    const { data: samplesRes, isLoading, refetch } = useQuery({
        queryKey: ['dispatch-samples'],
        queryFn:  () => samplesApi.list(),
        refetchInterval: 30_000,
    });
    const { data: usersRes }       = useQuery({ queryKey: ['users-list'],    queryFn: async () => (await api.get('/api/v1/auth/users')).data });
    const { data: buyersRes }      = useQuery({ queryKey: ['buyers'],         queryFn: () => api.get('/api/v1/samples/buyers').then(r => r.data) });
    const { data: factoriesRes }   = useQuery({ queryKey: ['factories'],      queryFn: () => api.get('/api/v1/samples/factories').then(r => r.data) });
    const { data: merchandisersRes}= useQuery({ queryKey: ['merchandisers'],  queryFn: () => api.get('/api/v1/samples/merchandisers').then(r => r.data) });
    const { data: locationsRes }   = useQuery({ queryKey: ['locations-list'], queryFn: () => storageApi.getLocations() });

    const allSamples    = samplesRes?.data          || [];
    const usersList     = usersRes?.data            || [];
    const buyersList    = buyersRes?.data           || [];
    const factoriesList = factoriesRes?.data        || [];
    const merchandisers = merchandisersRes?.data    || [];
    const locationsList = locationsRes?.data        || [];

    // ─── Mutations ────────────────────────────────────────────────────────────
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dispatch-samples'] });

    const receiveMutation = useMutation({
        mutationFn: (d: { id: string; sender: string; rfid_epc: string }) => dispatchApi.receive(d.id, d),
        onSuccess: () => { invalidate(); addToast({ type: 'success', title: 'Received', message: 'Sample received. Merchandiser will encode RFID.', duration: 4500 }); closeAll(); },
        onError:   (e: any) => addToast({ type: 'error', title: 'Failed', message: e?.response?.data?.message || e.message }),
    });

    const transferMutation = useMutation({
        mutationFn: (d: { id: string; to_user_id: string; reason: string; rfid_epc: string }) => transfersApi.initiate(d.id, d),
        onSuccess: () => { invalidate(); addToast({ type: 'success', title: 'Transfer Initiated', message: 'Transfer request sent.', duration: 4000 }); closeAll(); },
        onError:   (e: any) => addToast({ type: 'error', title: 'Failed', message: e?.response?.data?.message || e.message }),
    });

    const storeMutation = useMutation({
        mutationFn: (d: { id: string; location_id: string; rfid_epc: string }) => storageApi.store(d.id, d),
        onSuccess: () => { invalidate(); addToast({ type: 'success', title: 'Stored', message: 'Sample placed into storage.', duration: 4000 }); closeAll(); },
        onError:   (e: any) => addToast({ type: 'error', title: 'Failed', message: e?.response?.data?.message || e.message }),
    });

    // ST-DISP-002: Reassign sample to a different merchandiser
    const reassignMutation = useMutation({
        mutationFn: (d: { id: string; new_merchandiser_id: string }) => dispatchApi.reassign(d.id, { new_merchandiser_id: d.new_merchandiser_id }),
        onSuccess: () => { invalidate(); addToast({ type: 'success', title: 'Reassigned', message: 'Sample reassigned. Both merchandisers notified.', duration: 4000 }); closeAll(); },
        onError:   (e: any) => addToast({ type: 'error', title: 'Reassign Failed', message: e?.response?.data?.message || e.message }),
    });

    // ST-DISP-001: Create sample with factory + merchandiser linkage
    const createMutation = useMutation({
        mutationFn: (d: typeof INIT_CREATE) => samplesApi.create(buildCreateSamplePayload(d)),
        onSuccess: () => { invalidate(); setShowCreateModal(false); setCreateForm(INIT_CREATE); handleRemovePhoto(); addToast({ type: 'success', title: 'Sample Created', message: 'Sample registered and merchandiser notified.' }); },
        onError:   (e: any) => addToast({ type: 'error', title: 'Creation Failed', message: e.message || e?.response?.data?.message || 'Failed to create sample' }),
    });

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const closeAll = () => {
        setSelectedSample(null);
        setShowReceiveModal(false); setShowTransferModal(false);
        setShowStoreModal(false);   setShowReassignModal(false);
        setRfidEpc(''); setSenderName('');
        setTransferToUserId(''); setTransferNotes('');
        setStoreLocationId(''); setReassignMerchId('');
    };

    const openAction = (sample: Sample, type: 'receive' | 'transfer' | 'store' | 'reassign') => {
        setSelectedSample(sample);
        setRfidEpc(type === 'receive' ? '' : (sample.rfid_epc || ''));
        setSenderName(sample.sender_origin || '');
        setStoreLocationId(''); setTransferToUserId('');
        setTransferNotes('');   setReassignMerchId('');
        if (type === 'receive')  setShowReceiveModal(true);
        if (type === 'transfer') setShowTransferModal(true);
        if (type === 'store')    setShowStoreModal(true);
        if (type === 'reassign') setShowReassignModal(true);
    };

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await compressImage(file);
            setPhotoPreview(compressed);
            setCreateForm(p => ({ ...p, photo_url: compressed }));
        } catch {
            addToast({ type: 'error', title: 'Image Error', message: 'Could not process the selected image. Try a smaller file.' });
            handleRemovePhoto();
        }
    };

    const handleRemovePhoto = () => {
        setPhotoPreview(null);
        setCreateForm(p => ({ ...p, photo_url: '' }));
        if (photoRef.current) photoRef.current.value = '';
    };

    const filteredSamples = allSamples.filter((s: Sample) => {
        const term = searchTerm.toLowerCase();
        return (s.sample_id.toLowerCase().includes(term) || s.description.toLowerCase().includes(term) || (s.sample_type || '').toLowerCase().includes(term))
            && (filterType ? s.sample_type === filterType : true);
    });

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Dispatch</h1>
                    <p className="text-gray-500 mt-1">Manage incoming samples — create, receive, reassign, and store.</p>
                </div>
                <div className="flex items-center gap-3">
                    {!isLoading && (
                        <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-700 px-4 py-2 rounded-xl font-semibold text-sm">
                            <Clock className="w-4 h-4" />{allSamples.length} Total
                        </div>
                    )}
                    <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md transition-all active:scale-95">
                        <Plus className="w-5 h-5" /> Create Sample
                    </button>
                    <button onClick={() => { refetch(); addToast({ type: 'success', title: 'Refreshed', message: '', duration: 1500 }); }} className="p-2.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors" title="Refresh">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[{ label:'In Dispatch', s:'AT_DISPATCH', c:'bg-orange-100 text-orange-600' },
                  { label:'With Merch',  s:'WITH_MERCHANDISER', c:'bg-blue-100 text-blue-600' },
                  { label:'Stored',      s:'IN_STORAGE', c:'bg-green-100 text-green-600' }].map(({ label, s, c }) => (
                    <div key={s} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${c}`}><Layers className="w-6 h-6" /></div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{label}</p>
                            <h3 className="text-2xl font-bold text-gray-900">{isLoading ? '—' : allSamples.filter((x: Sample) => x.current_status === s).length}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" placeholder="Search by ID, description or type..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20">
                        <option value="">All Types</option>
                        {['Proto','Fit','Size Set','PP','Shipment'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Sample ID</th>
                                <th className="px-6 py-4 font-semibold">Sender / Receiver</th>
                                <th className="px-6 py-4 font-semibold">Description</th>
                                <th className="px-6 py-4 font-semibold">Status / Date</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500" />
                                    <p className="mt-2 text-sm text-gray-500">Loading...</p>
                                </td></tr>
                            ) : filteredSamples.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-16 text-center">
                                    <Layers className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                    <p className="text-base font-semibold text-gray-900">No samples found</p>
                                    <p className="text-sm mt-1 text-gray-500">{searchTerm ? 'No samples match your search.' : 'All clear!'}</p>
                                </td></tr>
                            ) : filteredSamples.map((sample: Sample, i: number) => (
                                <React.Fragment key={sample.id}>
                                    <tr onClick={() => setExpandedRow(expandedRow === sample.id ? null : sample.id)} className="hover:bg-orange-50/30 transition-colors cursor-pointer animate-in slide-in-from-bottom" style={{ animationDelay: `${i * 40}ms` }}>
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-xs text-gray-500">{sample.sample_id}</div>
                                            <div className="font-bold text-gray-900 mt-0.5">{sample.sample_type}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-blue-600 text-sm"><span className="text-gray-400">S: </span>{sample.sender_origin || 'Unknown'}</div>
                                            <div className="text-gray-900 text-sm mt-0.5"><span className="text-gray-400">R: </span>{sample.receiver_name || 'Unassigned'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-semibold text-gray-900 line-clamp-2">{sample.description}</div>
                                            <div className="flex items-center gap-1.5 mt-1.5"><User className="w-3.5 h-3.5 text-gray-400" /><span className="text-xs text-gray-600">{(sample as any).creator?.name || 'Unknown'}</span></div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={sample.current_status} />
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2"><Calendar className="w-3.5 h-3.5" />{new Date(sample.created_at).toLocaleDateString('en-GB')}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 flex-wrap">
                                                <button onClick={e => { e.stopPropagation(); navigate(`/samples/${sample.id}`); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 hover:bg-gray-600 hover:text-white rounded-lg transition-all shadow-sm border border-gray-200 text-xs font-medium">
                                                    <Package className="w-3.5 h-3.5" /> Details
                                                </button>
                                                {/* RECEIVE — pending dispatch */}
                                                {sample.current_status === 'IN_TRANSIT_TO_DISPATCH' && (
                                                    <button onClick={e => { e.stopPropagation(); openAction(sample, 'receive'); }} className="px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-lg text-xs font-bold transition-all">
                                                        RECEIVE
                                                    </button>
                                                )}
                                                {/* REASSIGN — ST-DISP-002 */}
                                                {(sample.current_status === 'IN_TRANSIT_TO_DISPATCH' || sample.current_status === 'AT_DISPATCH') && (
                                                    <button onClick={e => { e.stopPropagation(); openAction(sample, 'reassign'); }} className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-bold transition-all">
                                                        REASSIGN
                                                    </button>
                                                )}
                                                {/* TRANSFER / STORE */}
                                                {sample.current_status !== 'IN_TRANSIT_TO_DISPATCH' && (
                                                    <>
                                                        <button onClick={e => { e.stopPropagation(); openAction(sample, 'transfer'); }} className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold transition-all">
                                                            TRANSFER
                                                        </button>
                                                        <button onClick={e => { e.stopPropagation(); openAction(sample, 'store'); }} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold transition-all">
                                                            STORE
                                                        </button>
                                                    </>
                                                )}
                                                {expandedRow === sample.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedRow === sample.id && (
                                        <tr className="bg-gray-50/50">
                                            <td colSpan={5} className="px-6 py-4">
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm animate-in fade-in duration-200">
                                                    <div><p className="text-gray-500 text-xs uppercase tracking-wide">Type</p><p className="font-medium text-gray-900 mt-1">{sample.sample_type}</p></div>
                                                    <div><p className="text-gray-500 text-xs uppercase tracking-wide">Buyer</p><p className="font-medium text-gray-900 mt-1">{sample.buyer?.name || '—'}</p></div>
                                                    <div className="md:col-span-2"><p className="text-gray-500 text-xs uppercase tracking-wide">Description</p><p className="font-medium text-gray-900 mt-1">{sample.description}</p></div>
                                                    <div><p className="text-gray-500 text-xs uppercase tracking-wide">ID & RFID</p><p className="font-mono text-xs text-gray-600 mt-1 border border-gray-200 p-1.5 rounded bg-white inline-block break-all">{sample.sample_id}{sample.rfid_epc && <><br />RFID: {sample.rfid_epc}</>}</p></div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RECEIVE MODAL */}
            {showReceiveModal && selectedSample && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-red-50 flex items-center gap-3">
                            <div className="p-2.5 bg-orange-100 rounded-xl"><SmartphoneNfc className="w-6 h-6 text-orange-600" /></div>
                            <div><h2 className="text-lg font-bold text-gray-900">Receive Sample</h2><p className="text-sm text-gray-500">Confirm receipt of <span className="font-semibold text-orange-600">{selectedSample.sample_id}</span></p></div>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-2 gap-3 text-sm">
                                {[['Sample ID', selectedSample.sample_id], ['Type', selectedSample.sample_type], ['Buyer', selectedSample.buyer?.name || '—'], ['Receiver', selectedSample.receiver_name || '—'], ['Created', new Date(selectedSample.created_at).toLocaleDateString()], ['Description', selectedSample.description]].map(([l, v]) => (
                                    <div key={l} className={l === 'Description' ? 'col-span-2' : ''}><span className="text-gray-500 text-xs block">{l}</span><span className="font-semibold text-gray-900">{v}</span></div>
                                ))}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sender <span className="text-red-500">*</span> <span className="text-xs font-normal text-gray-400">(who brought the sample)</span></label>
                                <input type="text" value={senderName} onChange={e => setSenderName(e.target.value)} placeholder="e.g. John from Logistics" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm outline-none transition-colors" />
                                {!senderName && <p className="text-xs text-red-500 mt-1">Sender is required.</p>}
                            </div>
                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-xs text-orange-800">
                                <b>Note:</b> RFID encoding is handled by the Merchandiser, not at Dispatch.
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button type="button" onClick={closeAll} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={() => receiveMutation.mutate({ id: selectedSample.id, sender: senderName, rfid_epc: rfidEpc })} disabled={receiveMutation.isPending || !senderName} className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium shadow-md transition-all active:scale-95">
                                {receiveMutation.isPending ? 'Processing…' : 'Confirm Receipt'}
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* REASSIGN MODAL — ST-DISP-002 */}
            {showReassignModal && selectedSample && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-100 rounded-xl"><User className="w-6 h-6 text-purple-600" /></div>
                                <div><h2 className="text-lg font-bold text-gray-900">Reassign Merchandiser</h2><p className="text-sm text-gray-500">Sample <span className="font-semibold text-purple-600">{selectedSample.sample_id}</span></p></div>
                            </div>
                            <button type="button" onClick={closeAll} className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-full shadow-sm border border-gray-100 transition-colors relative z-10"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Current Receiver</label>
                                <input readOnly value={selectedSample.receiver_name || 'Not assigned'} className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-600 cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">New Merchandiser <span className="text-red-500">*</span></label>
                                <select value={reassignMerchId} onChange={e => setReassignMerchId(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all">
                                    <option value="">Select merchandiser…</option>
                                    {merchandisers.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-xs text-purple-800">
                                <b>Note:</b> Only available while sample is at Dispatch. Both the current and new merchandiser will be notified.
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button type="button" onClick={closeAll} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={() => reassignMutation.mutate({ id: selectedSample.id, new_merchandiser_id: reassignMerchId })} disabled={reassignMutation.isPending || !reassignMerchId} className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium shadow-md transition-all active:scale-95">
                                {reassignMutation.isPending ? 'Reassigning…' : 'Confirm Reassignment'}
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* TRANSFER MODAL */}
            {showTransferModal && selectedSample && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 bg-blue-50 flex items-center justify-between">
                            <div><h2 className="text-lg font-bold text-gray-900">Transfer Ownership</h2><p className="text-sm text-gray-500">Sample <b>{selectedSample.sample_id}</b></p></div>
                            <button type="button" onClick={closeAll} className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-full shadow-sm border border-gray-100 relative z-10"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Current Holder</label><input readOnly value={selectedSample.current_owner?.name || (selectedSample as any).creator?.name || '—'} className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm cursor-not-allowed" /></div>
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">New Holder <span className="text-red-500">*</span></label>
                                <select value={transferToUserId} onChange={e => setTransferToUserId(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500">
                                    <option value="">Select recipient…</option>
                                    {usersList.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                </select>
                            </div>
                            {selectedSample.rfid_epc ? (
                                <div><label className="block text-sm font-semibold text-gray-700 mb-1">RFID Validation <span className="text-red-500">*</span></label>
                                    <input type="text" value={rfidEpc} onChange={e => setRfidEpc(e.target.value)} placeholder="Scan tag…" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono outline-none focus:border-blue-500" /></div>
                            ) : <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-xs text-yellow-700"><b>No RFID:</b> Transfer proceeds without tag validation.</div>}
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
                                <textarea value={transferNotes} onChange={e => setTransferNotes(e.target.value)} rows={2} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500" /></div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button type="button" onClick={closeAll} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700">Cancel</button>
                            <button onClick={() => transferMutation.mutate({ id: selectedSample.id, to_user_id: transferToUserId, reason: transferNotes, rfid_epc: rfidEpc })} disabled={transferMutation.isPending || !transferToUserId || (selectedSample.rfid_epc ? !rfidEpc : false) || !transferNotes} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 font-medium">
                                {transferMutation.isPending ? 'Processing…' : 'Initiate Transfer'}
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* STORE MODAL */}
            {showStoreModal && selectedSample && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 bg-emerald-50 flex items-center justify-between">
                            <div><h2 className="text-lg font-bold text-gray-900">Store Inventory</h2><p className="text-sm text-gray-500">Sample <b>{selectedSample.sample_id}</b></p></div>
                            <button type="button" onClick={closeAll} className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-full shadow-sm border border-gray-100 relative z-10"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Location / Bin <span className="text-red-500">*</span></label>
                                <select value={storeLocationId} onChange={e => setStoreLocationId(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500">
                                    <option value="">Select rack & bin…</option>
                                    {locationsList.map((loc: any) => <option key={loc.id} value={loc.id}>RACK {loc.rack} : SHELF {loc.shelf} : BIN {loc.bin_id}</option>)}
                                </select>
                            </div>
                            {selectedSample.rfid_epc ? (
                                <div><label className="block text-sm font-semibold text-gray-700 mb-1">RFID Verification <span className="text-red-500">*</span></label>
                                    <input type="text" value={rfidEpc} onChange={e => setRfidEpc(e.target.value)} placeholder="Scan tag…" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono outline-none focus:border-emerald-500" /></div>
                            ) : <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-xs text-yellow-700"><b>No RFID:</b> Storage proceeds without tag validation.</div>}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button type="button" onClick={closeAll} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700">Cancel</button>
                            <button onClick={() => storeMutation.mutate({ id: selectedSample.id, location_id: storeLocationId, rfid_epc: rfidEpc })} disabled={storeMutation.isPending || !storeLocationId || (selectedSample.rfid_epc ? !rfidEpc : false)} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50 font-medium">
                                {storeMutation.isPending ? 'Processing…' : 'Confirm Placement'}
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* CREATE SAMPLE MODAL — ST-DISP-001 */}
            {showCreateModal && createPortal(
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 bg-orange-50 flex justify-between items-center shrink-0">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Plus className="w-6 h-6 text-orange-600" />New Incoming Sample</h3>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setShowCreateModal(false); handleRemovePhoto(); }} className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-full shadow-sm border border-gray-100 transition-colors relative z-10"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            {/* Buyer */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Buyer *</label>
                                <select value={createForm.buyer_id} onChange={e => setCreateForm(p => ({ ...p, buyer_id: e.target.value }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all">
                                    <option value="">Select buyer group…</option>
                                    {buyersList.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            {/* Type */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Type *</label>
                                <select value={createForm.sample_type} onChange={e => setCreateForm(p => ({ ...p, sample_type: e.target.value }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all">
                                    {['Proto','Fit','Size Set','PP','Shipment'].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Description *</label>
                                <textarea value={createForm.description} onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Blue Denim – XL – Summer V1" rows={2} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all" />
                            </div>
                            {/* Factory — ERP-sourced dropdown (optional) per ST-DISP-001 spec */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Factory (Optional)</label>
                                <select value={createForm.factory_id} onChange={e => setCreateForm(p => ({ ...p, factory_id: e.target.value }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all">
                                    <option value="">Select factory (optional)…</option>
                                    {factoriesList.map((f: any) => <option key={f.id} value={f.id}>{f.name}{f.code ? ` (${f.code})` : ''}</option>)}
                                </select>
                            </div>
                            {/* Receiver — ERP-sourced dropdown (mandatory) per ST-DISP-001 spec */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Intended Receiver (Merchandiser) *</label>
                                <select value={createForm.assigned_merchandiser_id} onChange={e => setCreateForm(p => ({ ...p, assigned_merchandiser_id: e.target.value }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all">
                                    <option value="">Select merchandiser…</option>
                                    {merchandisers.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            {/* Purpose */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Purpose</label>
                                <select value={createForm.purpose} onChange={e => setCreateForm(p => ({ ...p, purpose: e.target.value }))} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all">
                                    <option value="ORDER_CONFIRMATION">Order Confirmation</option>
                                    <option value="STORAGE">Storage</option>
                                    <option value="EVALUATION">Evaluation</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            {/* Photo */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Sample Image</label>
                                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                                {photoPreview ? (
                                    <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
                                        <img src={photoPreview} alt="Preview" className="w-full h-36 object-cover" />
                                        <button type="button" onClick={handleRemovePhoto} className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow border border-gray-200 text-red-500 hover:text-red-700 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => photoRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-500 font-medium hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50/50 transition-all">
                                        <ImagePlus className="w-4 h-4" /> Upload Image
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setShowCreateModal(false); handleRemovePhoto(); }} className="px-6 py-2.5 text-gray-600 font-bold hover:text-gray-900 transition-colors">Cancel</button>
                            <button onClick={() => createMutation.mutate(createForm)} disabled={createMutation.isPending || !createForm.buyer_id || !createForm.description || !createForm.assigned_merchandiser_id} className="px-8 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 disabled:opacity-50 transition-all active:scale-95">
                                {createMutation.isPending ? 'Processing…' : 'Register Sample'}
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}

        </div>
    );
}
