import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, SmartphoneNfc, Search, RefreshCw, Layers, Clock, CheckCircle2, AlertCircle, User, Calendar, Tag, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dispatchApi, rfidApi, samplesApi, transfersApi, storageApi, api } from '../api';
import type { Sample } from '../api/samples';
import { useToastActions } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';

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

export default function Dispatch() {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const { addToast } = useToastActions();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
    const [rfidEpc, setRfidEpc] = useState('');
    const [senderName, setSenderName] = useState('');
    const [transferReason, setTransferReason] = useState('');
    const [transferToUserId, setTransferToUserId] = useState('');
    const [transferNotes, setTransferNotes] = useState('');
    const [storeLocationId, setStoreLocationId] = useState('');
    const [showRfidModal, setShowRfidModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showStoreModal, setShowStoreModal] = useState(false);
    const [rfidValidationState, setRfidValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

    const { data: pendingResponse, isLoading, refetch } = useQuery({
        queryKey: ['dispatch-samples'],
        queryFn: () => samplesApi.list(),
        refetchInterval: 30000
    });

    const { data: usersResponse } = useQuery({
        queryKey: ['users-list'],
        queryFn: async () => {
            const res = await api.get('/api/v1/auth/users');
            return res.data;
        }
    });

    const { data: locationsResponse } = useQuery({
        queryKey: ['locations-list'],
        queryFn: () => storageApi.getLocations()
    });

    const allSamples = pendingResponse?.data || [];
    const usersList = usersResponse?.data || [];
    const locationsList = locationsResponse?.data || [];

    const receiveMutation = useMutation({
        mutationFn: (data: { id: string; sender: string; rfid_epc: string }) => dispatchApi.receive(data.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dispatch-samples'] });
            addToast({ type: 'success', title: 'Sample Received', message: 'Sample successfully received. Next: Merchandiser will encode RFID.', duration: 4500 });
            closeAllModals();
        },
        onError: (error: any) => {
            const errData = error?.response?.data;
            const errorMsg = errData?.message || (errData?.error && typeof errData.error === 'string' ? errData.error : errData?.error?.message) || 'Failed to receive sample';
            addToast({ type: 'error', title: 'Action Failed', message: errorMsg });
        }
    });

    const transferMutation = useMutation({
        mutationFn: (data: { id: string; to_user_id: string; reason: string; rfid_epc: string }) => transfersApi.initiate(data.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dispatch-samples'] });
            addToast({ type: 'success', title: 'Transfer Initiated', message: 'Transfer request sent securely.', duration: 4000 });
            closeAllModals();
        },
        onError: (error: any) => {
            const errData = error?.response?.data;
            const errorMsg = errData?.message || (errData?.error && typeof errData.error === 'string' ? errData.error : errData?.error?.message) || 'Failed to transfer sample';
            addToast({ type: 'error', title: 'Action Failed', message: errorMsg });
        }
    });

    const storeMutation = useMutation({
        mutationFn: (data: { id: string; location_id: string; rfid_epc: string }) => storageApi.store(data.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dispatch-samples'] });
            addToast({ type: 'success', title: 'Stored', message: 'Sample placed into active storage inventory.', duration: 4000 });
            closeAllModals();
        },
        onError: (error: any) => {
            const errData = error?.response?.data;
            const errorMsg = errData?.message || (errData?.error && typeof errData.error === 'string' ? errData.error : errData?.error?.message) || 'Failed to store sample';
            addToast({ type: 'error', title: 'Action Failed', message: errorMsg });
        }
    });

    const handleRefresh = () => {
        refetch();
        addToast({ type: 'success', title: 'Refreshed', message: 'Refreshed Samples', duration: 2000 });
    };

    const filteredSamples = allSamples.filter((s: Sample) => {
        const matchesSearch = s.sample_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.sample_type || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType ? s.sample_type === filterType : true;
        return matchesSearch && matchesFilter;
    });

    const handleActionClick = (sample: Sample, type: 'receive' | 'transfer' | 'store') => {
        setSelectedSample(sample);
        setRfidValidationState('idle');
        setRfidEpc(type === 'receive' ? '' : (sample.rfid_epc || '')); // If already has RFID, auto-fill it for Transfer/Store checks
        setSenderName(sample.sender_origin || '');
        setStoreLocationId('');
        setTransferToUserId('');
        setTransferReason('');
        if (type === 'receive') setShowRfidModal(true);
        if (type === 'transfer') setShowTransferModal(true);
        if (type === 'store') setShowStoreModal(true);
    };

    // Validate RFID tag availability
    const handleValidateRfid = async () => {
        if (!rfidEpc.trim()) return;
        setRfidValidationState('validating');
        try {
            const val: any = await rfidApi.validate(rfidEpc);
            const isValid = val.data ? val.data.valid : val.valid;
            setRfidValidationState(isValid ? 'valid' : 'invalid');
            if (!isValid) {
                addToast({ type: 'warning', title: 'Tag Not Available', message: val.data?.message || val.message || 'This RFID tag is already assigned. You can still receive the sample without a tag.' });
            }
        } catch (e: any) {
            addToast({ type: 'error', title: 'Validation Error', message: e.message || 'Failed to validate RFID tag' });
        } finally {
            setRfidValidationState('idle');
        }
    };

    const handleActionConfirm = async (action: 'receive' | 'transfer' | 'store') => {
        if (!selectedSample) return;
        if (action !== 'receive' && selectedSample.rfid_epc && !rfidEpc) {
            addToast({ type: 'error', title: 'Error', message: 'RFID validation is required for this action since the sample has an encoded tag.' });
            return;
        }

        if (action === 'receive') {
            receiveMutation.mutate({ id: selectedSample.id, sender: senderName, rfid_epc: rfidEpc });
        } else if (action === 'transfer') {
            transferMutation.mutate({ id: selectedSample.id, to_user_id: transferToUserId, reason: transferReason || transferNotes, rfid_epc: rfidEpc });
        } else if (action === 'store') {
            storeMutation.mutate({ id: selectedSample.id, location_id: storeLocationId, rfid_epc: rfidEpc });
        }
    };

    const closeAllModals = () => {
        setShowRfidModal(false);
        setShowTransferModal(false);
        setShowStoreModal(false);
        setRfidEpc('');
        setSenderName('');
        setTransferReason('');
        setTransferToUserId('');
        setStoreLocationId('');
        setSelectedSample(null);
        setRfidValidationState('idle');
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                        Dispatch
                    </h1>
                    <p className="text-gray-500 mt-1">Receive pending samples from couriers/senders and link RFID tags.</p>
                </div>

                <div className="flex items-center gap-3">
                    {!isLoading && (
                        <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-700 px-4 py-2 rounded-xl font-semibold text-sm">
                            <Clock className="w-4 h-4" />
                            {allSamples.length} Total
                        </div>
                    )}
                    <button
                        onClick={handleRefresh}
                        className="p-2.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
                        title="Refresh Queue"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-orange-100 text-orange-600">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">In Dispatch</p>
                        <h3 className="text-2xl font-bold text-gray-900">{isLoading ? '—' : allSamples.filter(s => s.current_status === 'AT_DISPATCH').length}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">With Merchandiser</p>
                        <h3 className="text-2xl font-bold text-gray-900">{isLoading ? '—' : allSamples.filter(s => s.current_status === 'WITH_MERCHANDISER').length}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-green-100 text-green-600">
                        <Layers className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Stored / Final</p>
                        <h3 className="text-2xl font-bold text-gray-900">{isLoading ? '—' : allSamples.filter(s => s.current_status === 'IN_STORAGE').length}</h3>
                    </div>
                </div>
            </div>

            {/* Queue Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by Sample ID, Description or Type..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 w-full md:w-auto items-center">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium outline-none text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        >
                            <option value="">All Types</option>
                            <option value="Proto">Proto</option>
                            <option value="Fit">Fit</option>
                            <option value="Size Set">Size Set</option>
                            <option value="PP">PP</option>
                            <option value="Shipment">Shipment</option>
                        </select>
                        <div className="hidden md:flex items-center text-xs text-gray-400 ml-4">
                            Auto-refreshes every 30s
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Sample ID & Flow</th>
                                <th className="px-6 py-4 font-semibold">Sender / Receiver</th>
                                <th className="px-6 py-4 font-semibold">Purpose & Assgd Merch</th>
                                <th className="px-6 py-4 font-semibold">Status / Date</th>
                                <th className="px-6 py-4 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500" />
                                        <p className="mt-2 text-sm">Loading queue...</p>
                                    </td>
                                </tr>
                            ) : filteredSamples.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                                        <Layers className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                        <p className="text-base font-semibold text-gray-900">No pending samples</p>
                                        <p className="text-sm mt-1 text-gray-500">
                                            {searchTerm ? 'No samples match your search.' : 'All samples have been received. Check back later.'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredSamples.map((sample: Sample, i: number) => (
                                    <React.Fragment key={sample.id}>
                                        <tr onClick={() => setExpandedRow(expandedRow === sample.id ? null : sample.id)} className="hover:bg-orange-50/30 transition-colors cursor-pointer animate-in slide-in-from-bottom" style={{ animationDelay: `${i * 50}ms` }}>
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-500 font-mono text-xs">{sample.sample_id}</div>
                                                <div className="text-base text-gray-900 font-bold mt-0.5">
                                                    {sample.sample_type}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-blue-600"><span className="text-gray-400 font-normal">S: </span>{sample.sender_origin || 'Unknown'}</div>
                                                <div className="font-medium text-gray-900 mt-0.5"><span className="text-gray-400 font-normal">R: </span>{sample.receiver_name || 'Unknown'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-gray-900 line-clamp-2" title={sample.description}>
                                                    {sample.description}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-2">
                                                    <User className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-xs text-gray-600">{(sample as any).creator?.name || 'Unknown User'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={sample.current_status} />
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(sample.created_at).toLocaleDateString('en-GB')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/samples/${sample.id}`); }}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 font-medium hover:bg-gray-600 hover:text-white rounded-lg transition-all shadow-sm border border-gray-200 text-xs"
                                                    >
                                                        <Package className="w-4 h-4" />
                                                        View Details
                                                    </button>
                                                    {sample.current_status === 'IN_TRANSIT_TO_DISPATCH' && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleActionClick(sample, 'receive'); }} className="bg-orange-50 text-orange-700 hover:bg-orange-100 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex border border-orange-200 items-center justify-center">
                                                            RECEIVE
                                                        </button>
                                                    )}
                                                    {sample.current_status !== 'IN_TRANSIT_TO_DISPATCH' && (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); handleActionClick(sample, 'transfer'); }} className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all uppercase items-center justify-center flex">
                                                                TRANSFER
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleActionClick(sample, 'store'); }} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all uppercase items-center justify-center flex">
                                                                STORE
                                                            </button>
                                                        </>
                                                    )}
                                                    {expandedRow === sample.id ? <ChevronUp className="w-4 h-4 text-gray-400 ml-2" /> : <ChevronDown className="w-4 h-4 text-gray-400 ml-2" />}
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedRow === sample.id && (
                                            <tr className="bg-gray-50/50 overflow-hidden">
                                                <td colSpan={5} className="px-6 py-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm animate-in fade-in duration-200">
                                                        <div>
                                                            <p className="text-gray-500 text-xs uppercase tracking-wide">Category / Type</p>
                                                            <p className="font-medium text-gray-900 mt-1">{sample.sample_type}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 text-xs uppercase tracking-wide">Buyer Group</p>
                                                            <p className="font-medium text-gray-900 mt-1">{sample.buyer?.name || 'Unknown'}</p>
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <p className="text-gray-500 text-xs uppercase tracking-wide">Sample Details</p>
                                                            <p className="font-medium text-gray-900 mt-1">{sample.description}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500 text-xs uppercase tracking-wide">Sample ID & RFID</p>
                                                            <p className="font-medium text-gray-600 mt-1 font-mono text-xs max-w-xs break-all border border-gray-200 p-1.5 rounded bg-white inline-block">
                                                                ID: {sample.sample_id}
                                                                {sample.rfid_epc && <><br />RFID: {sample.rfid_epc}</>}
                                                            </p>
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

            {/* Receive & RFID Tag Modal */}
            {showRfidModal && selectedSample && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-red-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-orange-100 rounded-xl">
                                    <SmartphoneNfc className="w-6 h-6 text-orange-600" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">Receive Sample</h2>
                                    <p className="text-sm text-gray-500 mt-0.5">Confirm physical receipt of sample <span className="font-semibold text-orange-600">{selectedSample.sample_id}</span></p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Read-Only Sample Details (PRD 5.2.2) */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Sample Information</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-gray-500 text-xs block">Sample ID</span>
                                        <span className="font-semibold text-gray-900 font-mono">{selectedSample.sample_id}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-xs block">Buyer</span>
                                        <span className="font-semibold text-gray-900">{selectedSample.buyer?.name || 'Unknown'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-xs block">Sample Type</span>
                                        <span className="font-semibold text-gray-900">{selectedSample.sample_type}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-xs block">Created By (Merchandiser)</span>
                                        <span className="font-semibold text-gray-900">{(selectedSample as any).creator?.name || 'Unknown'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-xs block">Created Date</span>
                                        <span className="font-semibold text-gray-900">{new Date(selectedSample.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-xs block">Receiver (Auto-filled)</span>
                                        <span className="font-semibold text-gray-900">{selectedSample.receiver_name}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-xs block">Timestamp</span>
                                        <span className="font-semibold text-gray-900">{new Date().toLocaleString()}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-gray-500 text-xs block">Description</span>
                                        <span className="font-semibold text-gray-900">{selectedSample.description}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Sender Field (PRD 5.2.3) */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Sender <span className="text-red-500">*</span>
                                    <span className="text-xs font-normal text-gray-400 ml-1">(who brought the sample to dispatch)</span>
                                </label>
                                <input
                                    type="text"
                                    value={senderName}
                                    onChange={(e) => setSenderName(e.target.value)}
                                    placeholder="e.g. John from Sales Team"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm transition-colors outline-none"
                                />
                                {!senderName && <p className="text-xs text-red-500 mt-1">Sender is a required field.</p>}
                            </div>

                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-xs text-orange-800">
                                <b>Note:</b> RFID Encoding is not required at Dispatch. The Merchandiser will encode the tag from the Sample Center.
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={closeAllModals}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleActionConfirm('receive')}
                                disabled={receiveMutation.isPending || !senderName}
                                className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium shadow-md transition-all active:scale-95 inline-flex items-center gap-2"
                            >
                                {receiveMutation.isPending ? 'Processing...' : 'Confirm Receipt'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {showTransferModal && selectedSample && (
                <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 bg-blue-50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-600">swap_horiz</span> Transfer Ownership
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Initiating transfer for sample ID: <b>{selectedSample.sample_id}</b></p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Current Holder</label>
                                <input type="text" readOnly className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-not-allowed" value={selectedSample.current_owner?.name || (selectedSample as any).creator?.name || 'Unknown'} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">New Holder *</label>
                                <select value={transferToUserId} onChange={e => setTransferToUserId(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                    <option value="">Select recipient...</option>
                                    {usersList.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                </select>
                            </div>
                            {selectedSample.rfid_epc ? (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">RFID Validation *</label>
                                    <input type="text" value={rfidEpc} onChange={e => setRfidEpc(e.target.value)} placeholder="Required verification tag..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono" />
                                </div>
                            ) : (
                                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-xs text-yellow-700">
                                    <b>No RFID Tag:</b> This sample does not have an RFID tag assigned yet. Transfer will proceed without validation.
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Reason / Notes</label>
                                <textarea value={transferNotes} onChange={e => setTransferNotes(e.target.value)} placeholder="Reason for transfer..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" rows={2}></textarea>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                                <b>Timestamp Tracking:</b> {new Date().toLocaleString()} (this event will be automatically logged to SampleMovements after recipient acceptance).
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={closeAllModals} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700">Cancel</button>
                            <button onClick={() => handleActionConfirm('transfer')} disabled={transferMutation.isPending || !transferToUserId || (selectedSample.rfid_epc ? !rfidEpc : false) || !transferNotes} className="px-5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl disabled:opacity-50">Initiate Transfer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Store Modal */}
            {showStoreModal && selectedSample && (
                <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 bg-emerald-50">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-600">inventory</span> Store Inventory
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Placing Sample ID: <b>{selectedSample.sample_id}</b> into storage bins.</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Location / Bin *</label>
                                <select value={storeLocationId} onChange={e => setStoreLocationId(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                                    <option value="">Select location rack & bin...</option>
                                    {locationsList.map((loc: any) => <option key={loc.id} value={loc.id}>RACK {loc.rack} : SHELF {loc.shelf} : BIN {loc.bin_id}</option>)}
                                </select>
                            </div>
                            {selectedSample.rfid_epc ? (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">RFID Verification Scanner *</label>
                                    <input type="text" value={rfidEpc} onChange={e => setRfidEpc(e.target.value)} placeholder="Wait for tag scan..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono" />
                                </div>
                            ) : (
                                <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-xs text-yellow-700">
                                    <b>No RFID Tag:</b> This sample does not have an RFID tag assigned yet. Storage will proceed without validation.
                                </div>
                            )}
                            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-emerald-700 flex justify-between items-center">
                                <span><b>Timestamp Log:</b> {new Date().toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={closeAllModals} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700">Cancel</button>
                            <button onClick={() => handleActionConfirm('store')} disabled={storeMutation.isPending || !storeLocationId || (selectedSample.rfid_epc ? !rfidEpc : false)} className="px-5 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl disabled:opacity-50">Confirm Placement</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
