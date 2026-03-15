import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, ArrowLeft, Archive, Trash2, Send, Activity, User, MapPin, Tag, Check, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { samplesApi, storageApi, transfersApi, api } from '../api';
import { format } from 'date-fns';

type ModalType = 'TRANSFER' | 'STORE' | 'DISPOSE' | 'RECEIVE' | null;

export default function SampleDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [rfidEpc, setRfidEpc] = useState('');

    // Form states
    const [transferToUserId, setTransferToUserId] = useState('');
    const [transferReason, setTransferReason] = useState('');
    const [storeLocationId, setStoreLocationId] = useState('');
    const [disposeReason, setDisposeReason] = useState('');
    const [disposeComment, setDisposeComment] = useState('');

    // Fetch Sample data
    const { data: sampleRes, isLoading } = useQuery({
        queryKey: ['sample', id],
        queryFn: () => samplesApi.get(id as string),
        enabled: !!id
    });
    const sample = sampleRes?.data;

    // Fetch System Users (for transfer)
    const { data: usersRes } = useQuery({
        queryKey: ['users'],
        queryFn: () => api.get('/api/v1/auth/users').then(res => res.data),
        enabled: activeModal === 'TRANSFER'
    });
    const usersList = usersRes?.data || [];

    // Fetch Storage Locations (for store)
    const { data: locationsRes } = useQuery({
        queryKey: ['locations'],
        queryFn: () => storageApi.getLocations(),
        enabled: activeModal === 'STORE'
    });
    const locationsList = locationsRes?.data || [];

    // Fetch Smart Suggestion
    const { data: suggestionRes } = useQuery({
        queryKey: ['suggest-location', sample?.sample_type],
        queryFn: () => storageApi.suggestLocation(sample?.sample_type),
        enabled: activeModal === 'STORE' && !!sample?.sample_type
    });
    const suggestedLocationId = suggestionRes?.data?.id;

    // Auto-select suggestion
    React.useEffect(() => {
        if (activeModal === 'STORE' && suggestedLocationId && !storeLocationId) {
            setStoreLocationId(suggestedLocationId);
        }
    }, [activeModal, suggestedLocationId]);

    // Fetch Pending Transfers (to see if current user is recipient)
    const { data: pendingTransfersRes } = useQuery({
        queryKey: ['transfers', 'pending'],
        queryFn: () => transfersApi.getPending()
    });
    const pendingTransfers = pendingTransfersRes?.data || [];
    const pendingTransferForMe = pendingTransfers.find(
        (t: any) => t.sample_id === sample?.id && t.to_user_id === user?.id
    );

    // Mutations
    const actionMutation = useMutation({
        mutationFn: async ({ action, payload }: { action: string, payload: any }) => {
            if (action === 'TRANSFER') return transfersApi.initiate(id as string, payload);
            if (action === 'STORE') return storageApi.store(id as string, payload);
            if (action === 'DISPOSE') return samplesApi.dispose(id as string, payload);
            if (action === 'RECEIVE') return samplesApi.merchandiserReceive(id as string, payload.rfid_epc);
            if (action === 'ACCEPT') return transfersApi.accept(payload.transferId);
            if (action === 'REJECT') return transfersApi.reject(payload.transferId);
            throw new Error('Unknown action');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sample', id] });
            queryClient.invalidateQueries({ queryKey: ['samples'] });
            queryClient.invalidateQueries({ queryKey: ['transfers', 'pending'] });
            closeModal();
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || err.message || 'Action failed');
        }
    });

    const closeModal = () => {
        setActiveModal(null);
        setRfidEpc('');
        setTransferToUserId('');
        setTransferReason('');
        setStoreLocationId('');
        setDisposeReason('');
        setDisposeComment('');
    };

    const handleAction = (action: string) => {
        if (action === 'TRANSFER') {
            actionMutation.mutate({
                action, payload: { to_user_id: transferToUserId, reason: transferReason, rfid_epc: rfidEpc }
            });
        } else if (action === 'STORE') {
            actionMutation.mutate({
                action, payload: { location_id: storeLocationId, rfid_epc: rfidEpc }
            });
        } else if (action === 'DISPOSE') {
            actionMutation.mutate({
                action, payload: { reason: disposeReason, comment: disposeComment, rfid_epc: rfidEpc }
            });
        } else if (action === 'RECEIVE') {
            actionMutation.mutate({
                action, payload: { rfid_epc: rfidEpc }
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!sample) {
        return (
            <div className="p-6 text-center">
                <p className="text-gray-500">Sample not found.</p>
                <Link to="/" className="text-blue-500 hover:underline mt-4 inline-block">Return to Dashboard</Link>
            </div>
        );
    }

    const isOwner = sample.current_owner?.id === user?.id || sample.current_owner_id === user?.id;
    const canAct = sample.current_status === 'WITH_MERCHANDISER' && (isOwner || user?.role === 'ADMIN');
    const canReceive = sample.current_status === 'AT_DISPATCH' && (sample.created_by === user?.id || user?.role === 'ADMIN');

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 border border-gray-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            {sample.sample_id}
                        </h1>
                        <p className="text-sm text-gray-500">Sample Type: {sample.sample_type}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* Action Buttons */}
                    {canReceive && (
                        <button
                            onClick={() => setActiveModal('RECEIVE')}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 border border-purple-200 font-medium transition-colors"
                        >
                            <Check className="w-4 h-4" /> Receive Sample
                        </button>
                    )}
                    {pendingTransferForMe && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => actionMutation.mutate({ action: 'ACCEPT', payload: { transferId: pendingTransferForMe.id } })}
                                disabled={actionMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl shadow-sm shadow-green-200 hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
                            >
                                <Check className="w-4 h-4" /> Accept Transfer
                            </button>
                            <button
                                onClick={() => actionMutation.mutate({ action: 'REJECT', payload: { transferId: pendingTransferForMe.id } })}
                                disabled={actionMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 font-medium transition-colors disabled:opacity-50"
                            >
                                <X className="w-4 h-4" /> Reject
                            </button>
                        </div>
                    )}
                    {canAct && (
                        <>
                            <button
                                onClick={() => setActiveModal('STORE')}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 border border-indigo-200 font-medium transition-colors"
                            >
                                <Archive className="w-4 h-4" /> Store
                            </button>
                            <button
                                onClick={() => setActiveModal('TRANSFER')}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 border border-blue-200 font-medium transition-colors"
                            >
                                <Send className="w-4 h-4" /> Transfer
                            </button>
                            <button
                                onClick={() => setActiveModal('DISPOSE')}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 border border-red-200 font-medium transition-colors"
                            >
                                <Trash2 className="w-4 h-4" /> Dispose
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Col: Details */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                            <Package className="w-5 h-5 text-gray-400" /> Information
                        </h2>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                            {(sample as any).photo_url && (
                                <div className="col-span-2 mb-2">
                                    <img src={(sample as any).photo_url} alt="Sample" className="w-32 h-32 object-cover rounded-xl border border-gray-200 shadow-sm" />
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-medium text-gray-500">Description</p>
                                <p className="mt-1 text-sm text-gray-900">{sample.description}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Status</p>
                                <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-medium border ${sample.current_status === 'DISPOSED' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                                    {sample.current_status.replace(/_/g, ' ')}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Buyer</p>
                                <p className="mt-1 text-sm text-gray-900">{sample.buyer?.name || 'Unknown'}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Current Owner</p>
                                <div className="mt-1 flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                        <User className="w-3 h-3 text-blue-600" />
                                    </div>
                                    <span className="text-sm text-gray-900">{sample.current_owner?.name || sample.current_owner?.email || 'N/A'}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Storage Location</p>
                                <div className="mt-1">
                                    {sample.storage_location ? (
                                        <div className="flex items-center gap-1.5 text-sm text-indigo-700 bg-indigo-50 px-2 py-1 rounded w-max">
                                            <MapPin className="w-3.5 h-3.5" />
                                            Rack {sample.storage_location.rack}, Shelf {sample.storage_location.shelf}, Bin {sample.storage_location.bin_id}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-gray-400">Not stored</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">RFID Tag EPC</p>
                                <div className="mt-1 flex items-center gap-1.5">
                                    <Tag className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-mono text-gray-800">{sample.rfid_epc || 'Pending Request'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-6">
                            <Activity className="w-5 h-5 text-gray-400" /> Movement History
                        </h2>
                        <div className="relative border-l border-gray-200 ml-3 space-y-6">
                            {(sample.movements || []).map((movement: any, idx: number) => (
                                <div key={idx} className="relative pl-6">
                                    <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900">{movement.action_type.replace(/_/g, ' ')}</h4>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {format(new Date(movement.timestamp), 'PPpp')} • by {movement.user?.name || movement.user?.email || 'System'}
                                        </p>
                                        {(movement.notes || movement.rfid_epc) && (
                                            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 border border-gray-100">
                                                {movement.rfid_epc && <p className="font-mono mb-1">Scanned EPC: {movement.rfid_epc}</p>}
                                                {movement.notes && <p>{movement.notes}</p>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals Handling */}
            {activeModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">
                                {activeModal === 'TRANSFER' && 'Transfer Ownership'}
                                {activeModal === 'STORE' && 'Store Sample'}
                                {activeModal === 'DISPOSE' && 'Dispose Sample'}
                                {activeModal === 'RECEIVE' && 'Receive Sample'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 bg-white shadow-sm border p-1 rounded-full"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-6 space-y-4">

                            {/* Common RFID Field */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Verify RFID Tag *</label>
                                <input
                                    type="text"
                                    value={rfidEpc}
                                    placeholder="Enter physical EPC (simulate scan)"
                                    onChange={e => setRfidEpc(e.target.value)}
                                    className="w-full text-sm px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-gray-50"
                                />
                                <p className="text-xs text-gray-500 mt-1">Must match {sample.rfid_epc}</p>
                            </div>

                            {activeModal === 'TRANSFER' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">New Merchandiser *</label>
                                        <select
                                            value={transferToUserId}
                                            onChange={e => setTransferToUserId(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            <option value="">Select a user...</option>
                                            {usersList
                                                .filter((u: any) => u.id !== user?.id && u.role === 'MERCHANDISER')
                                                .map((u: any) => (
                                                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                                ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                                        <input
                                            type="text"
                                            value={transferReason}
                                            onChange={e => setTransferReason(e.target.value)}
                                            placeholder="Why are you transferring?"
                                            className="w-full text-sm px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </>
                            )}

                            {activeModal === 'STORE' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Location *</label>
                                        <select
                                            value={storeLocationId}
                                            onChange={e => setStoreLocationId(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            <option value="">Choose a bin...</option>
                                            {locationsList.map((loc: any) => (
                                                <option key={loc.id} value={loc.id} disabled={loc.current_count >= loc.max_capacity}>
                                                    Rack {loc.rack} - Shelf {loc.shelf} - Bin {loc.bin_id} ({loc.current_count}/{loc.max_capacity} items)
                                                    {suggestedLocationId === loc.id ? ' (★ Suggested)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                        {suggestedLocationId === storeLocationId && (
                                            <p className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1">
                                                <Check className="w-3 h-3" /> System recommended location
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}

                            {activeModal === 'DISPOSE' && (
                                <>
                                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                                        <p className="text-xs text-orange-800">
                                            This action is irreversible. The tag will be unlinked and the sample will be permanently locked.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                                        <select
                                            value={disposeReason}
                                            onChange={e => setDisposeReason(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            <option value="">Select a reason...</option>
                                            <option value="Damaged">Damaged</option>
                                            <option value="Expired">Expired</option>
                                            <option value="Approved for Disposal">Approved for Disposal</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                                        <textarea
                                            value={disposeComment}
                                            onChange={e => setDisposeComment(e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                            <button onClick={closeModal} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100">
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAction(activeModal)}
                                disabled={actionMutation.isPending || !rfidEpc || (activeModal === 'TRANSFER' && (!transferToUserId || !transferReason)) || (activeModal === 'STORE' && !storeLocationId) || (activeModal === 'DISPOSE' && !disposeReason)}
                                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-medium shadow-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {actionMutation.isPending ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
