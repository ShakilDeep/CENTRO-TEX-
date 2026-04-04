import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package, Search, RefreshCw, SmartphoneNfc,
  ArrowRightLeft, MapPin, X, ChevronDown, ChevronUp,
  User, Calendar, Database, BellRing, Truck,
  CheckCircle2, XCircle, HandshakeIcon, Inbox
} from 'lucide-react';
import { samplesApi, api, transfersApi, storageApi } from '../api';
import type { Sample } from '../api/samples';
import type { Transfer, OutgoingTransfer } from '../api/transfers';
import { useAuthStore } from '../stores/authStore';
import { useToastActions } from '../stores/uiStore';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ─────────────────────────────────────────────────────────────

const SAMPLE_STATUS_COLORS: Record<string, string> = {
  IN_TRANSIT_TO_DISPATCH: 'bg-blue-100 text-blue-800 border-blue-200',
  AT_DISPATCH: 'bg-blue-100 text-blue-800 border-blue-200',
  WITH_MERCHANDISER: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  IN_STORAGE: 'bg-gray-100 text-gray-800 border-gray-200',
  PENDING_TRANSFER_APPROVAL: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  DISPOSED: 'bg-black text-white border-black',
  LOST: 'bg-red-100 text-red-800 border-red-200',
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const colorClass = SAMPLE_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border uppercase ${colorClass}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

// ─── OUTGOING PULL REQUEST POPUP ("Received — Yes or No?") ─────────────────

interface HandoverPopupProps {
  transfer: OutgoingTransfer;
  onConfirm: (transferId: string, confirmed: boolean) => void;
  isPending: boolean;
}

function HandoverPopup({ transfer, onConfirm, isPending }: HandoverPopupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed bottom-8 right-8 z-[100] w-96 overflow-hidden"
    >
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(234,88,12,0.3)] border border-orange-100/50">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-orange-500 to-red-600 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black tracking-widest uppercase">
              Handover Request
            </div>
            <HandshakeIcon className="w-5 h-5 text-orange-200" />
          </div>
          <h4 className="text-xl font-bold leading-tight">Received — Yes or No?</h4>
          <p className="text-sm text-orange-100 mt-1 opacity-90">
            Someone is requesting your sample. Did they physically receive it?
          </p>
        </div>

        {/* Body */}
        <div className="p-8">
          {/* Requester Info */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requested By</p>
              <p className="text-base font-bold text-slate-900">{transfer.to_user.name}</p>
              <p className="text-[10px] text-slate-400 uppercase font-bold">{transfer.to_user.role}</p>
            </div>
          </div>

          {/* Sample Info */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-4 h-4 text-slate-400" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sample</p>
            </div>
            <p className="font-black text-slate-900 text-lg">
              [{transfer.sample.sample_id}] — {transfer.sample.sample_type}
            </p>
            <p className="text-xs text-slate-500 mt-1 italic truncate">"{transfer.sample.description}"</p>

            {transfer.reason && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Request Reason</p>
                <p className="text-sm text-slate-600 italic">"{transfer.reason}"</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => onConfirm(transfer.id, false)}
              disabled={isPending}
              id={`handover-no-${transfer.id}`}
              className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 border-2 border-transparent transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              No, Decline
            </button>
            <button
              onClick={() => onConfirm(transfer.id, true)}
              disabled={isPending}
              id={`handover-yes-${transfer.id}`}
              className="flex-[2] py-3.5 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all active:scale-95 text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Yes, Confirm
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── INCOMING TRANSFER POPUP (Accept / Reject) ─────────────────────────────

interface IncomingPopupProps {
  transfer: Transfer;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  isAccepting: boolean;
  isRejecting: boolean;
}

function IncomingTransferPopup({ transfer, onAccept, onReject, isAccepting, isRejecting }: IncomingPopupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed bottom-8 left-8 z-[90] w-96 overflow-hidden"
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
              <p className="text-lg font-bold text-slate-900">[{transfer.sample.sample_id}]</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Transfer Note</p>
            <p className="text-sm text-slate-600 italic">"{transfer.reason || 'No description provided'}"</p>
            <div className="flex items-center gap-1.5 mt-3 text-[11px] text-slate-500">
              <User className="w-3 h-3 text-blue-500" />
              <span>Sender: <span className="font-bold">{transfer.from_user.name}</span></span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onReject(transfer.id)}
              disabled={isRejecting || isAccepting}
              id={`reject-transfer-${transfer.id}`}
              className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => onAccept(transfer.id)}
              disabled={isAccepting || isRejecting}
              id={`accept-transfer-${transfer.id}`}
              className="flex-[2] py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 text-xs uppercase tracking-widest disabled:opacity-50"
            >
              Accept Sample
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export default function Merchandiser() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Modals
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);

  // Popup state — controlled queue
  const [incomingPopup, setIncomingPopup] = useState<Transfer | null>(null);
  const [outgoingPopup, setOutgoingPopup] = useState<OutgoingTransfer | null>(null);

  // Form States
  const [transferToUserId, setTransferToUserId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [storeLocationId, setStoreLocationId] = useState('');

  const queryClient = useQueryClient();
  const { addToast } = useToastActions();

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: samplesRes, isLoading: isLoadingSamples, refetch: refetchSamples } = useQuery({
    queryKey: ['merchandiser-samples'],
    queryFn: () => samplesApi.list()
  });

  /** INCOMING transfers — samples being sent TO this merchandiser */
  const { data: pendingTransfersRes, refetch: refetchIncoming } = useQuery({
    queryKey: ['merchandiser-pending-transfers'],
    queryFn: () => transfersApi.getPending(),
    refetchInterval: 10_000
  });

  /** OUTGOING pull requests — someone is requesting THIS user's samples */
  const { data: outgoingTransfersRes, refetch: refetchOutgoing } = useQuery({
    queryKey: ['merchandiser-outgoing-pending'],
    queryFn: () => transfersApi.getOutgoingPending(),
    refetchInterval: 10_000
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

  // ─── Auto-show Popups ─────────────────────────────────────────────────────

  // Show INCOMING TRANSFER popup if one exists (and nothing is queued)
  useEffect(() => {
    const incoming = pendingTransfersRes?.data || [];
    if (incoming.length > 0 && !incomingPopup && !outgoingPopup) {
      setIncomingPopup(incoming[0]);
    }
  }, [pendingTransfersRes]);

  // Show OUTGOING HANDOVER popup if one exists
  useEffect(() => {
    const outgoing = outgoingTransfersRes?.data || [];
    if (outgoing.length > 0 && !outgoingPopup && !incomingPopup) {
      setOutgoingPopup(outgoing[0]);
    }
  }, [outgoingTransfersRes]);

  // ─── Derived Data ─────────────────────────────────────────────────────────

  const allSamples = samplesRes?.data || [];
  const mySamples = allSamples.filter(
    (s: Sample) => s.current_owner_id === user?.id || s.current_status === 'WITH_MERCHANDISER'
  );

  const filteredSamples = mySamples.filter((s: Sample) =>
    s.sample_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const incomingCount = pendingTransfersRes?.data?.length || 0;
  const outgoingCount = outgoingTransfersRes?.data?.length || 0;

  // ─── Mutations ────────────────────────────────────────────────────────────

  const transferMutation = useMutation({
    mutationFn: (data: { id: string; to_user_id: string; reason: string; rfid_epc: string }) =>
      transfersApi.initiate(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchandiser-samples'] });
      addToast({ type: 'success', title: 'Transfer Sent', message: 'Request sent to recipient.' });
      setIsTransferModalOpen(false);
      setTransferToUserId('');
      setTransferNotes('');
      setSelectedSample(null);
    },
    onError: (err: any) =>
      addToast({ type: 'error', title: 'Transfer Failed', message: err.response?.data?.message || err.message })
  });

  const storeMutation = useMutation({
    mutationFn: (data: { id: string; location_id: string; rfid_epc: string }) =>
      storageApi.store(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchandiser-samples'] });
      addToast({ type: 'success', title: 'Stored', message: 'Sample moved to storage.' });
      setIsStoreModalOpen(false);
      setStoreLocationId('');
      setSelectedSample(null);
    },
    onError: (err: any) =>
      addToast({ type: 'error', title: 'Storage Failed', message: err.response?.data?.message || err.message })
  });

  const acceptTransferMutation = useMutation({
    mutationFn: (id: string) => transfersApi.accept(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchandiser-samples'] });
      queryClient.invalidateQueries({ queryKey: ['merchandiser-pending-transfers'] });
      addToast({ type: 'success', title: 'Accepted', message: 'Sample is now in your possession.' });
      setIncomingPopup(null);
    },
    onError: () => addToast({ type: 'error', title: 'Action Failed', message: 'Could not accept transfer.' })
  });

  const rejectTransferMutation = useMutation({
    mutationFn: (id: string) => transfersApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchandiser-pending-transfers'] });
      addToast({ type: 'info', title: 'Rejected', message: 'Transfer request declined.' });
      setIncomingPopup(null);
    },
    onError: () => addToast({ type: 'error', title: 'Action Failed', message: 'Could not reject transfer.' })
  });

  const confirmHandoverMutation = useMutation({
    mutationFn: ({ transferId, confirmed }: { transferId: string; confirmed: boolean }) =>
      transfersApi.confirmHandover(transferId, confirmed),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['merchandiser-samples'] });
      queryClient.invalidateQueries({ queryKey: ['merchandiser-outgoing-pending'] });
      if (variables.confirmed) {
        addToast({ type: 'success', title: 'Handover Confirmed', message: 'Sample transferred to requester.' });
      } else {
        addToast({ type: 'info', title: 'Handover Declined', message: 'Sample remains with you.' });
      }
      setOutgoingPopup(null);
    },
    onError: (err: any) =>
      addToast({ type: 'error', title: 'Handover Failed', message: err.response?.data?.message || err.message })
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleOpenAction = (sample: Sample, action: 'transfer' | 'store') => {
    setSelectedSample(sample);
    if (action === 'transfer') setIsTransferModalOpen(true);
    if (action === 'store') setIsStoreModalOpen(true);
  };

  const handleRefresh = () => {
    refetchSamples();
    refetchIncoming();
    refetchOutgoing();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">

      {/* ── OUTGOING HANDOVER POPUP ("Received — Yes or No?") ── */}
      <AnimatePresence>
        {outgoingPopup && (
          <HandoverPopup
            transfer={outgoingPopup}
            onConfirm={(transferId, confirmed) =>
              confirmHandoverMutation.mutate({ transferId, confirmed })
            }
            isPending={confirmHandoverMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* ── INCOMING TRANSFER POPUP ── */}
      <AnimatePresence>
        {incomingPopup && !outgoingPopup && (
          <IncomingTransferPopup
            transfer={incomingPopup}
            onAccept={(id) => acceptTransferMutation.mutate(id)}
            onReject={(id) => rejectTransferMutation.mutate(id)}
            isAccepting={acceptTransferMutation.isPending}
            isRejecting={rejectTransferMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
            <User className="w-8 h-8 text-orange-500" />
            Merchandiser Journey
          </h1>
          <p className="text-gray-500 mt-1">Manage your samples: Accept, Transfer, Store, or confirm handovers.</p>
        </div>

        <div className="flex gap-3 items-center">
          {/* Outgoing pending badge */}
          {outgoingCount > 0 && (
            <button
              onClick={() => {
                const first = outgoingTransfersRes?.data?.[0];
                if (first) setOutgoingPopup(first);
              }}
              id="show-handover-requests"
              className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-xs font-bold hover:bg-orange-100 transition-colors"
            >
              <BellRing className="w-4 h-4 animate-pulse" />
              {outgoingCount} Handover{outgoingCount > 1 ? 's' : ''} Pending
            </button>
          )}
          {/* Incoming pending badge */}
          {incomingCount > 0 && (
            <button
              onClick={() => {
                const first = pendingTransfersRes?.data?.[0];
                if (first) setIncomingPopup(first);
              }}
              id="show-incoming-transfers"
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
            >
              <Inbox className="w-4 h-4 animate-pulse" />
              {incomingCount} Incoming
            </button>
          )}
          <button
            onClick={handleRefresh}
            id="refresh-merchandiser"
            className="p-2.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors"
            title="Refresh All"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'My Active Samples', value: mySamples.length, icon: Package, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Incoming Transfers', value: incomingCount, icon: Inbox, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Handover Requests', value: outgoingCount, icon: BellRing, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'In Storage', value: mySamples.filter((s: Sample) => s.current_status === 'IN_STORAGE').length, icon: Database, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

      {/* ── SAMPLE TABLE ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Table toolbar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              id="search-samples"
              placeholder="Search my samples by ID or description..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
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
                <th className="px-6 py-4">Status & RFID</th>
                <th className="px-6 py-4 text-right">
                  Actions
                  <span className="ml-2 text-[8px] text-gray-300 normal-case tracking-normal">
                    (Accept · Transfer · Store · Received)
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoadingSamples ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange-500" />
                    <p className="mt-2 text-sm">Loading samples...</p>
                  </td>
                </tr>
              ) : filteredSamples.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-base font-semibold text-gray-900">No active samples</p>
                    <p className="text-xs text-gray-500 mt-1">Accept incoming transfers to start working.</p>
                  </td>
                </tr>
              ) : (
                filteredSamples.map((sample: Sample) => (
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
                          <SmartphoneNfc className="w-3 h-3" />
                          {sample.rfid_epc ? `LINKED: ${sample.rfid_epc.slice(-8)}` : 'TAG PENDING'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* i. Accept — available via popup */}
                          {/* ii. Transfer */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenAction(sample, 'transfer'); }}
                            id={`transfer-${sample.id}`}
                            className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-blue-100 transition-all flex items-center gap-1"
                          >
                            <ArrowRightLeft className="w-3 h-3" /> Transfer
                          </button>
                          {/* iii. Store */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenAction(sample, 'store'); }}
                            id={`store-${sample.id}`}
                            className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-emerald-100 transition-all flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3" /> Store
                          </button>
                          {/* iv. Received — shows outgoing popup */}
                          {outgoingCount > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const req = outgoingTransfersRes?.data?.find(
                                  (t: OutgoingTransfer) => t.sample.id === sample.id
                                );
                                if (req) setOutgoingPopup(req);
                                else addToast({ type: 'info', title: 'No Request', message: 'No handover request pending for this sample.' });
                              }}
                              id={`received-${sample.id}`}
                              className="bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-xl text-[10px] font-bold hover:bg-orange-100 transition-all flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Received?
                            </button>
                          )}
                          {expandedRow === sample.id
                            ? <ChevronUp className="w-4 h-4 text-gray-400 ml-1" />
                            : <ChevronDown className="w-4 h-4 text-gray-400 ml-1" />}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row Details */}
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
                                <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Technical Memo</label>
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

      {/* ── TRANSFER MODAL ── */}
      {isTransferModalOpen && selectedSample && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 bg-blue-50/50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ArrowRightLeft className="w-6 h-6 text-blue-600" />
                Transfer Handoff
              </h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-full shadow-sm border border-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-5">
              <p className="text-xs text-gray-500">
                Passing <span className="font-bold text-gray-900">{selectedSample.sample_id}</span> to another user.
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">New Holder (Recipient) *</label>
                <select
                  id="transfer-recipient"
                  value={transferToUserId}
                  onChange={e => setTransferToUserId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">Select recipient...</option>
                  {usersList.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Reason *</label>
                <textarea
                  id="transfer-reason"
                  value={transferNotes}
                  onChange={e => setTransferNotes(e.target.value)}
                  placeholder="Reason for this movement..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/20">
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="px-6 py-2.5 text-gray-400 font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                id="send-transfer-btn"
                onClick={() =>
                  transferMutation.mutate({
                    id: selectedSample.id,
                    to_user_id: transferToUserId,
                    reason: transferNotes,
                    rfid_epc: selectedSample.rfid_epc || ''
                  })
                }
                disabled={transferMutation.isPending || !transferToUserId || !transferNotes}
                className="px-8 py-2.5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
              >
                {transferMutation.isPending ? 'Sending...' : 'Send Transfer Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STORE MODAL ── */}
      {isStoreModalOpen && selectedSample && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 bg-emerald-50/50 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-emerald-600" />
                Move to Storage
              </h3>
              <button
                onClick={() => setIsStoreModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-full shadow-sm border border-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-5">
              <p className="text-xs text-gray-500">
                Finalizing storage placement for <span className="font-bold text-gray-900">{selectedSample.sample_id}</span>.
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Physical Bin Location *</label>
                <select
                  id="store-location"
                  value={storeLocationId}
                  onChange={e => setStoreLocationId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                >
                  <option value="">Choose location...</option>
                  {locationsList.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>Rack {loc.rack} : Shelf {loc.shelf} : Bin {loc.bin_id}</option>
                  ))}
                </select>
              </div>
              {!selectedSample.rfid_epc && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl text-xs text-orange-700 font-medium">
                  <b>Note:</b> This sample has no RFID tag. It will be stored without digital linkage. Encode a tag in the Admin journey first.
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/20">
              <button
                onClick={() => setIsStoreModalOpen(false)}
                className="px-6 py-2.5 text-gray-400 font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                id="confirm-store-btn"
                onClick={() =>
                  storeMutation.mutate({
                    id: selectedSample.id,
                    location_id: storeLocationId,
                    rfid_epc: selectedSample.rfid_epc || ''
                  })
                }
                disabled={storeMutation.isPending || !storeLocationId}
                className="px-8 py-2.5 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50"
              >
                {storeMutation.isPending ? 'Storing...' : 'Confirm Placement'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
