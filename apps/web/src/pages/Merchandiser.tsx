import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package, Search, RefreshCw, SmartphoneNfc,
  ArrowRightLeft, MapPin, X, ChevronDown, ChevronUp,
  User, Calendar, Database, BellRing, Truck,
  CheckCircle2, XCircle, HandshakeIcon, Inbox,
  Minus, Maximize2, LayoutDashboard, Lock as LucideLock,
  BarChart3, Download, FileSpreadsheet, Warehouse
} from 'lucide-react';
import { samplesApi, api, transfersApi, storageApi } from '../api';
import type { Sample } from '../api/samples';
import type { Transfer, OutgoingTransfer } from '../api/transfers';
import { useAuthStore } from '../stores/authStore';
import { useToastActions } from '../stores/uiStore';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

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
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

function HandoverPopup({ transfer, onConfirm, isPending, isMinimized, onToggleMinimize }: HandoverPopupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0,
        height: isMinimized ? '80px' : 'auto',
        width: isMinimized ? '320px' : '400px'
      }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed bottom-8 right-8 z-[110] overflow-hidden"
    >
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(234,88,12,0.35)] border border-orange-100/50 h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`p-6 bg-gradient-to-br from-orange-500 to-red-600 text-white shrink-0 cursor-pointer ${isMinimized ? 'h-full flex items-center' : ''}`} onClick={() => isMinimized && onToggleMinimize()}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black tracking-widest uppercase">
                {isMinimized ? `Handover: ${transfer.sample.sample_id}` : 'Handover Request'}
              </div>
              {!isMinimized && <HandshakeIcon className="w-5 h-5 text-orange-200" />}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                title={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {!isMinimized && (
            <>
              <h4 className="text-xl font-bold leading-tight mt-4 italic tracking-tighter">Received — Yes or No?</h4>
              <p className="text-sm text-orange-100 mt-1 opacity-90 font-medium">
                Someone is physically requesting this sample.
              </p>
            </>
          )}
        </div>

        {/* Body */}
        {!isMinimized && (
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
        )}
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
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

function IncomingTransferPopup({ transfer, onAccept, onReject, isAccepting, isRejecting, isMinimized, onToggleMinimize }: IncomingPopupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0,
        height: isMinimized ? '80px' : 'auto',
        width: isMinimized ? '320px' : '400px'
      }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed bottom-[130px] right-8 z-[100] overflow-hidden"
    >
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(37,99,235,0.3)] border border-blue-100/50 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className={`p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shrink-0 cursor-pointer ${isMinimized ? 'h-full flex items-center' : ''}`} onClick={() => isMinimized && onToggleMinimize()}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black tracking-widest uppercase">
                {isMinimized ? `Incoming: ${transfer.sample.sample_id}` : 'Incoming Transfer'}
              </div>
              {!isMinimized && <Truck className="w-5 h-5 text-blue-200" />}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                title={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {!isMinimized && (
            <>
              <h4 className="text-xl font-bold leading-tight mt-4 italic tracking-tighter">Accept Possession?</h4>
              <p className="text-sm text-blue-100 mt-1 opacity-80 font-medium">Someone has transferred this sample to you.</p>
            </>
          )}
        </div>

        {!isMinimized && (
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
        )}
      </div>
    </motion.div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export default function Merchandiser() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'flow') as 'flow' | 'storage' | 'reports';
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Modals
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isTransferMinimized, setIsTransferMinimized] = useState(false);
  const [isStoreMinimized, setIsStoreMinimized] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);

  // Popup state — controlled queue
  const [incomingPopup, setIncomingPopup] = useState<Transfer | null>(null);
  const [outgoingPopup, setOutgoingPopup] = useState<OutgoingTransfer | null>(null);
  const [isIncomingMinimized, setIsIncomingMinimized] = useState(false);
  const [isOutgoingMinimized, setIsOutgoingMinimized] = useState(false);

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
    if (incoming.length > 0 && !incomingPopup) {
      setIncomingPopup(incoming[0]);
      setIsIncomingMinimized(false);
    }
  }, [pendingTransfersRes]);

  // Show OUTGOING HANDOVER popup if one exists
  useEffect(() => {
    const outgoing = outgoingTransfersRes?.data || [];
    if (outgoing.length > 0 && !outgoingPopup) {
      setOutgoingPopup(outgoing[0]);
      setIsOutgoingMinimized(false);
    }
  }, [outgoingTransfersRes]);

  // ─── Derived Data ─────────────────────────────────────────────────────────

  const allSamples = samplesRes?.data || [];
  const mySamples = allSamples; // Trust backend for role-based/ownership filtering

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
            isMinimized={isOutgoingMinimized}
            onToggleMinimize={() => setIsOutgoingMinimized(!isOutgoingMinimized)}
          />
        )}
      </AnimatePresence>

      {/* ── INCOMING TRANSFER POPUP ── */}
      <AnimatePresence>
        {incomingPopup && (
          <IncomingTransferPopup
            transfer={incomingPopup}
            onAccept={(id) => acceptTransferMutation.mutate(id)}
            onReject={(id) => rejectTransferMutation.mutate(id)}
            isAccepting={acceptTransferMutation.isPending}
            isRejecting={rejectTransferMutation.isPending}
            isMinimized={isIncomingMinimized}
            onToggleMinimize={() => setIsIncomingMinimized(!isIncomingMinimized)}
          />
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
            <User className="w-8 h-8 text-orange-500" />
            Sample Hub
          </h1>
          <p className="text-gray-500 mt-1 font-medium italic tracking-wide">Manage your sample portfolio: Accept, Transfer, Store, or confirm handovers.</p>
        </div>

        <div className="flex gap-3 items-center">


          {/* Outgoing pending badge */}
          {outgoingCount > 0 && (
            <button
              onClick={() => {
                const first = outgoingTransfersRes?.data?.[0];
                if (first) {
                  setOutgoingPopup(first);
                  setIsOutgoingMinimized(false);
                }
              }}
              id="show-handover-requests"
              className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-xs font-bold hover:bg-orange-100 transition-all active:scale-95 shadow-sm shadow-orange-100"
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
                if (first) {
                  setIncomingPopup(first);
                  setIsIncomingMinimized(false);
                }
              }}
              id="show-incoming-transfers"
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all active:scale-95 shadow-sm shadow-blue-100"
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

      {/* ── SAMPLE TABLE (My Current Flow tab) ── */}
      {activeTab === 'flow' && (
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
                            disabled={sample.current_status === 'PENDING_TRANSFER_APPROVAL'}
                            className={`bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 ${
                              sample.current_status === 'PENDING_TRANSFER_APPROVAL' ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-blue-100'
                            }`}
                          >
                            <ArrowRightLeft className="w-3 h-3" /> Transfer
                          </button>
                          {/* iii. Store */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenAction(sample, 'store'); }}
                            id={`store-${sample.id}`}
                            disabled={sample.current_status === 'PENDING_TRANSFER_APPROVAL'}
                            className={`bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 ${
                              sample.current_status === 'PENDING_TRANSFER_APPROVAL' ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-emerald-100'
                            }`}
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
      )} {/* end activeTab === 'flow' */}

      {/* ── STORAGE ACCESS TAB (inline) ── */}
      {activeTab === 'storage' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-emerald-500" /> Storage Access
            </h2>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['locations-list'] })}
              className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            {locationsList.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Warehouse className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="font-medium">No storage locations configured.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locationsList.map((loc: any) => {
                  const pct = Math.round((loc.current_count / loc.max_capacity) * 100);
                  const isHigh = pct >= 80;
                  const isFull = pct >= 100;
                  return (
                    <div key={loc.id} className="border border-gray-100 bg-gray-50 rounded-xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">Rack {loc.rack}</h3>
                          <p className="text-sm text-gray-500">Shelf {loc.shelf} • Bin {loc.bin_id}</p>
                        </div>
                        <div className={`px-2.5 py-1 rounded-md text-xs font-bold border ${isFull ? 'bg-red-100 text-red-800 border-red-200' : isHigh ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                          {pct}% Full
                        </div>
                      </div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-gray-600 font-medium">Used: {loc.current_count}</span>
                        <span className="text-gray-500">Capacity: {loc.max_capacity}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div className={`h-2.5 rounded-full ${isFull ? 'bg-red-500' : isHigh ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      {loc.sample_type_affinity && (
                        <p className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block mt-3 font-medium">
                          Affinity: {loc.sample_type_affinity}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REPORTS TAB (inline) ── */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" /> Reports
            </h2>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['merchandiser-samples'] })}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Sample ID</th>
                    <th className="px-6 py-4 font-semibold">Details</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Holder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoadingSamples ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                      <p className="mt-2 text-sm">Loading report data...</p>
                    </td></tr>
                  ) : allSamples.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-base font-medium text-gray-900">No data found</p>
                    </td></tr>
                  ) : (
                    allSamples.map((sample: Sample, i: number) => (
                      <tr key={sample.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{format(new Date(sample.created_at), 'MMM d, yyyy')}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">{sample.sample_id}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{sample.description}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Type: {sample.sample_type} • Buyer: {sample.buyer?.name || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4"><StatusBadge status={sample.current_status} /></td>
                        <td className="px-6 py-4 text-sm text-gray-700">{sample.current_owner?.name || sample.current_owner?.email || 'System'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isTransferModalOpen && selectedSample && (
        <>
          {/* Backdrop (visible only when not minimized) */}
          {!isTransferMinimized && (
            <div 
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[140] animate-in fade-in"
              onClick={() => setIsTransferModalOpen(false)}
            />
          )}
          
          <div 
            className={`fixed transition-all duration-500 ease-in-out ${
              isTransferMinimized 
                ? 'bottom-28 right-8 w-84 h-16 z-[60] pointer-events-auto' 
                : 'top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-[-20px_0_50px_-15px_rgba(0,0,0,0.1)] z-[150] pointer-events-auto'
            }`}
          >
            <div 
              className={`flex flex-col h-full transition-all duration-500 ${
                isTransferMinimized 
                  ? 'rounded-3xl border-2 border-blue-100 bg-white overflow-hidden shadow-2xl' 
                  : 'rounded-l-[40px] bg-white overflow-hidden'
              }`}
            >
              <div 
                className={`px-8 pt-36 pb-6 pr-10 flex justify-between items-center cursor-pointer transition-colors border-b border-gray-50 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.05)] ${
                  isTransferMinimized ? 'bg-blue-600 text-white h-full pr-8 pt-6 pb-6 shadow-none' : 'bg-white'
                }`}
                onClick={() => isTransferMinimized && setIsTransferMinimized(false)}
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className={`p-2.5 rounded-2xl ${isTransferMinimized ? 'bg-white/20' : 'bg-blue-50'}`}>
                    <ArrowRightLeft className={`w-5 h-5 ${isTransferMinimized ? 'text-white' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <h3 className={`font-black truncate tracking-tight ${isTransferMinimized ? 'text-sm' : 'text-xl text-gray-900 uppercase'}`}>
                      {isTransferMinimized ? `Transferring: ${selectedSample.sample_id}` : 'Transfer Handoff'}
                    </h3>
                    {!isTransferMinimized && (
                      <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-0.5">Asset Possession Portal</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsTransferMinimized(!isTransferMinimized); }}
                    className={`p-2 rounded-xl transition-all ${
                      isTransferMinimized 
                        ? 'hover:bg-white/20 text-white' 
                        : 'text-gray-400 hover:text-gray-600 bg-gray-50 border border-gray-100'
                    }`}
                    title={isTransferMinimized ? "Maximize" : "Minimize"}
                  >
                    {isTransferMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setIsTransferModalOpen(false)}
                    className={`p-2 rounded-xl transition-all ${
                      isTransferMinimized 
                        ? 'hover:bg-white/20 text-white' 
                        : 'text-gray-400 hover:text-gray-600 bg-gray-50 border border-gray-100'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {!isTransferMinimized && (
                <>
                  <div className="flex-1 p-8 space-y-8 overflow-y-auto">
                    {selectedSample.current_status === 'PENDING_TRANSFER_APPROVAL' ? (
                      <div className="bg-blue-50 border-2 border-blue-100 p-8 rounded-[38px] text-center space-y-4 animate-in zoom-in duration-300 mt-4">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-blue-600">
                          <LucideLock className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-black text-blue-900 uppercase tracking-tighter text-xl">Lifecycle Lock</h4>
                          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Process Management Notice</p>
                        </div>
                        <p className="text-xs text-blue-700 leading-relaxed font-medium bg-white/50 p-4 rounded-2xl">
                          A transfer request for <span className="font-bold underline">{selectedSample.sample_id}</span> is already in progress. 
                          Operational flows are anchored until the current handover is resolved.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                          <p className="text-xs text-blue-800 leading-relaxed font-medium">
                            You are initiating a legal transfer of <span className="font-black underline">{selectedSample.sample_id}</span>. 
                            The new holder will need to acknowledge receipt.
                          </p>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">New Holder (Recipient) *</label>
                            <select
                              id="transfer-recipient"
                              value={transferToUserId}
                              onChange={e => setTransferToUserId(e.target.value)}
                              className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-50 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-gray-800"
                            >
                              <option value="">Select recipient...</option>
                              {usersList?.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.name} — {u.role}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Transfer Logic / Reason *</label>
                            <textarea
                              id="transfer-reason"
                              value={transferNotes}
                              onChange={e => setTransferNotes(e.target.value)}
                              placeholder="e.g., Movement for buyer meeting, quality check, etc."
                              className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-50 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-gray-800 min-h-[120px]"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-8 border-t border-gray-50 flex flex-col gap-3 bg-white">
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
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-2xl shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 hover:bg-shadow-lg uppercase tracking-widest text-xs"
                    >
                      {transferMutation.isPending ? 'Processing...' : 'Authorize Transfer Request'}
                    </button>
                    <button
                      onClick={() => setIsTransferModalOpen(false)}
                      className="w-full py-4 text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-50 rounded-2xl transition-all"
                    >
                      Dismiss Portal
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── STORE MODAL ── */}
      {isStoreModalOpen && selectedSample && (
        <>
          {/* Backdrop */}
          {!isStoreMinimized && (
            <div 
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[140] animate-in fade-in"
              onClick={() => setIsStoreModalOpen(false)}
            />
          )}

          <div 
            className={`fixed transition-all duration-500 ease-in-out ${
              isStoreMinimized 
                ? 'bottom-28 right-8 w-84 h-16 z-[60] pointer-events-auto' 
                : 'top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-[-20px_0_50px_-15px_rgba(0,0,0,0.1)] z-[150] pointer-events-auto'
            }`}
          >
            <div 
              className={`flex flex-col h-full transition-all duration-500 ${
                isStoreMinimized 
                  ? 'rounded-3xl border-2 border-emerald-100 bg-white overflow-hidden shadow-2xl' 
                  : 'rounded-l-[40px] bg-white overflow-hidden'
              }`}
            >
              <div 
                className={`px-8 pt-36 pb-6 pr-10 flex justify-between items-center cursor-pointer transition-colors border-b border-gray-50 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.05)] ${
                  isStoreMinimized ? 'bg-emerald-600 text-white h-full pr-8 pt-6 pb-6 shadow-none' : 'bg-white'
                }`}
                onClick={() => isStoreMinimized && setIsStoreMinimized(false)}
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className={`p-2.5 rounded-2xl ${isStoreMinimized ? 'bg-white/20' : 'bg-emerald-50'}`}>
                    <MapPin className={`w-5 h-5 ${isStoreMinimized ? 'text-white' : 'text-emerald-600'}`} />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <h3 className={`font-black truncate tracking-tight ${isStoreMinimized ? 'text-sm' : 'text-xl text-gray-900 uppercase'}`}>
                      {isStoreMinimized ? `Storing: ${selectedSample.sample_id}` : 'Storage Placement'}
                    </h3>
                    {!isStoreMinimized && (
                      <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-0.5">Inventory Optimization</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsStoreMinimized(!isStoreMinimized); }}
                    className={`p-2 rounded-xl transition-all ${
                      isStoreMinimized 
                        ? 'hover:bg-white/20 text-white' 
                        : 'text-gray-400 hover:text-gray-600 bg-gray-50 border border-gray-100'
                    }`}
                    title={isStoreMinimized ? "Maximize" : "Minimize"}
                  >
                    {isStoreMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setIsStoreModalOpen(false)}
                    className={`p-2 rounded-xl transition-all ${
                      isStoreMinimized 
                        ? 'hover:bg-white/20 text-white' 
                        : 'text-gray-400 hover:text-gray-600 bg-gray-50 border border-gray-100'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {!isStoreMinimized && (
                <>
                  <div className="flex-1 p-8 space-y-8 overflow-y-auto">
                    {selectedSample.current_status === 'PENDING_TRANSFER_APPROVAL' ? (
                      <div className="bg-emerald-50 border-2 border-emerald-100 p-8 rounded-[38px] text-center space-y-4 animate-in zoom-in duration-300 mt-4">
                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto text-emerald-600">
                          <LucideLock className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-black text-emerald-900 uppercase tracking-tighter text-xl">Lifecycle Lock</h4>
                          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Storage Management Notice</p>
                        </div>
                        <p className="text-xs text-emerald-700 leading-relaxed font-medium bg-white/50 p-4 rounded-2xl">
                          Sample <span className="font-bold underline">{selectedSample.sample_id}</span> is currently pending a transfer. 
                          It cannot be committed to storage until its possession is finalized.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                          <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                            Assigning <span className="font-black underline">{selectedSample.sample_id}</span> to a permanent physical bank. 
                            This will update its global status to <span className="font-bold">IN_STORAGE</span>.
                          </p>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 px-1">Physical Bin Location *</label>
                            <select
                              id="store-location"
                              value={storeLocationId}
                              onChange={e => setStoreLocationId(e.target.value)}
                              className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-50 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-gray-800"
                            >
                              <option value="">Choose rack/bin...</option>
                              {locationsList?.map((loc: any) => (
                                <option key={loc.id} value={loc.id}>Rack: {loc.rack} | Shelf: {loc.shelf} | Bin: {loc.bin_id}</option>
                              ))}
                            </select>
                          </div>

                          {!selectedSample.rfid_epc && (
                            <div className="bg-orange-50 border border-orange-100/50 p-5 rounded-2xl flex items-start gap-4">
                              <div className="p-2 bg-white rounded-lg shadow-sm border border-orange-100 text-orange-600">
                                <SmartphoneNfc className="w-4 h-4" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest">Digital Link Warning</p>
                                <p className="text-xs text-orange-700 leading-normal font-medium leading-relaxed">
                                  This sample has no RFID tag. It will be stored physically but remain untraceable via RFID scanners.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-8 border-t border-gray-50 flex flex-col gap-3 bg-white">
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
                      className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-2xl shadow-emerald-200 transition-all active:scale-[0.98] disabled:opacity-50 hover:bg-shadow-lg uppercase tracking-widest text-xs"
                    >
                      {storeMutation.isPending ? 'Executing...' : 'Commit to Storage Bank'}
                    </button>
                    <button
                      onClick={() => setIsStoreModalOpen(false)}
                      className="w-full py-4 text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-50 rounded-2xl transition-all"
                    >
                      Cancel Operation
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
