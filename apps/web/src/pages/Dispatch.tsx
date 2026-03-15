import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, SmartphoneNfc, Search, RefreshCw, Layers, Clock, CheckCircle2, AlertCircle, User, Calendar, Tag } from 'lucide-react';
import { dispatchApi, rfidApi } from '../api';
import type { Sample } from '../api/samples';
import { useToastActions } from '../stores/uiStore';

export default function Dispatch() {
    const queryClient = useQueryClient();
    const { addToast } = useToastActions();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
    const [rfidEpc, setRfidEpc] = useState('');
    const [senderName, setSenderName] = useState('');
    const [showRfidModal, setShowRfidModal] = useState(false);
    const [rfidValidationState, setRfidValidationState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

    const { data: pendingResponse, isLoading, refetch } = useQuery({
        queryKey: ['dispatch-pending'],
        queryFn: () => dispatchApi.getPending(),
        refetchInterval: 30000 // Auto-refresh every 30 seconds
    });

    const pendingSamples = pendingResponse?.data || [];

    const receiveMutation = useMutation({
        mutationFn: (data: { id: string; sender: string; rfid_epc: string }) => dispatchApi.receive(data.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dispatch-pending'] });
            queryClient.invalidateQueries({ queryKey: ['samples'] });
            addToast({
                type: 'success',
                title: 'Sample Received',
                message: 'Sample successfully received and RFID tag assigned. Merchandiser notified.',
                duration: 4000
            });
            setShowRfidModal(false);
            setRfidEpc('');
            setSenderName('');
            setSelectedSample(null);
            setRfidValidationState('idle');
        },
        onError: (error: any) => {
            addToast({
                type: 'error',
                title: 'Action Failed',
                message: error?.response?.data?.message || 'Failed to receive sample',
                duration: 5000
            });
        }
    });

    const filteredSamples = pendingSamples.filter((s: Sample) =>
        s.sample_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.sample_type || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleReceiveClick = (sample: Sample) => {
        setSelectedSample(sample);
        setShowRfidModal(true);
        setRfidValidationState('idle');
        setRfidEpc('');
        setSenderName('');
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
                addToast({ type: 'error', title: 'Tag Not Available', message: val.data?.message || val.message || 'This RFID tag is already assigned to an active sample. Please use a different tag.' });
            }
        } catch (e: any) {
            setRfidValidationState('invalid');
            addToast({ type: 'error', title: 'Validation Error', message: e.message || 'Failed to validate RFID tag' });
        }
    };

    const handleReceiveConfirm = async () => {
        if (!selectedSample || !rfidEpc || !senderName) return;

        // If not yet validated, validate first
        if (rfidValidationState !== 'valid') {
            try {
                setRfidValidationState('validating');
                const val: any = await rfidApi.validate(rfidEpc);
                const isValid = val.data ? val.data.valid : val.valid;
                if (!isValid) {
                    setRfidValidationState('invalid');
                    addToast({ type: 'error', title: 'Invalid Tag', message: val.data?.message || val.message || 'Tag is not available' });
                    return;
                }
                setRfidValidationState('valid');
            } catch (e: any) {
                setRfidValidationState('invalid');
                addToast({ type: 'error', title: 'Tag Validation Error', message: e.message || '' });
                return;
            }
        }

        receiveMutation.mutate({
            id: selectedSample.id,
            sender: senderName,
            rfid_epc: rfidEpc
        });
    };

    const closeModal = () => {
        setShowRfidModal(false);
        setRfidEpc('');
        setSenderName('');
        setSelectedSample(null);
        setRfidValidationState('idle');
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                        Dispatch Queue
                    </h1>
                    <p className="text-gray-500 mt-1">Receive pending samples from couriers/senders and link RFID tags.</p>
                </div>

                <div className="flex items-center gap-3">
                    {!isLoading && (
                        <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-700 px-4 py-2 rounded-xl font-semibold text-sm">
                            <Clock className="w-4 h-4" />
                            {pendingSamples.length} Pending
                        </div>
                    )}
                    <button
                        onClick={() => refetch()}
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
                        <p className="text-sm font-medium text-gray-500">Awaiting Receipt</p>
                        <h3 className="text-2xl font-bold text-gray-900">{isLoading ? '—' : pendingSamples.length}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-green-100 text-green-600">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Ready to Tag</p>
                        <h3 className="text-2xl font-bold text-gray-900">{isLoading ? '—' : pendingSamples.length}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                        <SmartphoneNfc className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">RFID Tags Required</p>
                        <h3 className="text-2xl font-bold text-gray-900">{isLoading ? '—' : pendingSamples.length}</h3>
                    </div>
                </div>
            </div>

            {/* Queue Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
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
                    <div className="hidden md:flex items-center text-xs text-gray-400 ml-4">
                        Auto-refreshes every 30s
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Sample ID</th>
                                <th className="px-6 py-4 font-semibold">Sample Details</th>
                                <th className="px-6 py-4 font-semibold">Type</th>
                                <th className="px-6 py-4 font-semibold">Creator</th>
                                <th className="px-6 py-4 font-semibold">Created Date</th>
                                <th className="px-6 py-4 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500" />
                                        <p className="mt-2 text-sm">Loading queue...</p>
                                    </td>
                                </tr>
                            ) : filteredSamples.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                                        <Layers className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                        <p className="text-base font-semibold text-gray-900">No pending samples</p>
                                        <p className="text-sm mt-1 text-gray-500">
                                            {searchTerm ? 'No samples match your search.' : 'All samples have been received. Check back later.'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredSamples.map((sample: Sample, i: number) => (
                                    <tr key={sample.id} className="hover:bg-orange-50/30 transition-colors animate-in slide-in-from-bottom" style={{ animationDelay: `${i * 50}ms` }}>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900 font-mono">{sample.sample_id}</div>
                                            <div className="text-xs text-orange-600 mt-0.5 font-medium flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                IN TRANSIT TO DISPATCH
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{sample.description}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                Buyer: {sample.buyer?.name || 'Unknown'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                {sample.sample_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <User className="w-3.5 h-3.5 text-gray-500" />
                                                </div>
                                                <span className="text-sm text-gray-700">{(sample as any).creator?.name || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                {new Date(sample.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleReceiveClick(sample)}
                                                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow-md inline-flex items-center gap-2 text-sm active:scale-95"
                                            >
                                                <SmartphoneNfc className="w-4 h-4" />
                                                Receive & Tag
                                            </button>
                                        </td>
                                    </tr>
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
                                    <h2 className="text-lg font-bold text-gray-900">Receive & Tag Sample</h2>
                                    <p className="text-sm text-gray-500 mt-0.5">Assign an RFID hard tag to sample <span className="font-semibold text-orange-600">{selectedSample.sample_id}</span></p>
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
                                        <span className="font-semibold text-gray-900">{(selectedSample as any).creator?.name || 'Original Merchandiser'}</span>
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

                            {/* RFID Tag Input (PRD 5.2.3 & 5.2.4) */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    RFID Tag EPC <span className="text-red-500">*</span>
                                    <span className="text-xs font-normal text-gray-400 ml-1">(scan physical hard tag)</span>
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <SmartphoneNfc className="absolute text-gray-400 left-3 top-1/2 -translate-y-1/2 w-5 h-5" />
                                        <input
                                            type="text"
                                            value={rfidEpc}
                                            onChange={(e) => {
                                                setRfidEpc(e.target.value);
                                                setRfidValidationState('idle');
                                            }}
                                            placeholder="Scan tag or enter EPC manually..."
                                            className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-2 transition-colors outline-none text-sm font-mono ${rfidValidationState === 'valid' ? 'border-green-400 focus:ring-green-500/20 bg-green-50' :
                                                    rfidValidationState === 'invalid' ? 'border-red-400 focus:ring-red-500/20 bg-red-50' :
                                                        'border-gray-200 focus:ring-orange-500/20 focus:border-orange-500'
                                                }`}
                                        />
                                    </div>
                                    <button
                                        onClick={handleValidateRfid}
                                        disabled={!rfidEpc || rfidValidationState === 'validating'}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl font-medium text-sm transition-colors"
                                    >
                                        {rfidValidationState === 'validating' ? 'Checking...' : 'Verify'}
                                    </button>
                                </div>
                                {rfidValidationState === 'valid' && (
                                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1 font-medium">
                                        <CheckCircle2 className="w-3 h-3" /> Tag verified ✅ — this tag is available for assignment.
                                    </p>
                                )}
                                {rfidValidationState === 'invalid' && (
                                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                                        <AlertCircle className="w-3 h-3" /> This RFID tag is already assigned to an active sample. Please use a different tag.
                                    </p>
                                )}
                                {rfidValidationState === 'idle' && rfidEpc && (
                                    <p className="text-xs text-gray-400 mt-1">Click "Verify" to check tag availability before confirming.</p>
                                )}
                                {!rfidEpc && (
                                    <p className="text-xs text-red-500 mt-1">RFID scan is required to proceed.</p>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReceiveConfirm}
                                disabled={receiveMutation.isPending || !senderName || !rfidEpc || rfidValidationState === 'invalid'}
                                className="px-5 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium shadow-md transition-all active:scale-95 inline-flex items-center gap-2"
                            >
                                {receiveMutation.isPending ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Tag className="w-4 h-4" />
                                        Confirm Receipt & Tag
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
