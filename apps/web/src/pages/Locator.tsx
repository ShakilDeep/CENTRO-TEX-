import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package, Search, RefreshCw, MapPin,
  ArrowRightLeft, UserCheck, LayoutGrid, List,
  Calendar, Database, X, Info,
  SearchCode, Warehouse, Layers, Send,
  Download, FileSpreadsheet, FileText, BarChart2, LayoutDashboard
} from 'lucide-react';
import { samplesApi, storageApi, transfersApi, api } from '../api';
import type { Sample } from '../api/samples';
import { useToastActions } from '../stores/uiStore';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

// ─── Status Colors ──────────────────────────────────────────────────────────

const STATUS_TEXT_COLORS: Record<string, string> = {
  IN_STORAGE: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  AT_DISPATCH: 'text-blue-700 bg-blue-50 border-blue-100',
  WITH_MERCHANDISER: 'text-yellow-700 bg-yellow-50 border-yellow-100',
  PENDING_TRANSFER_APPROVAL: 'text-indigo-700 bg-indigo-50 border-indigo-100',
  LOST: 'text-red-700 bg-red-50 border-red-100'
};

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

// ─── Pull Request Reason Modal ──────────────────────────────────────────────

interface PullRequestModalProps {
  sample: Sample;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isPending: boolean;
}

function PullRequestModal({ sample, onConfirm, onCancel, isPending }: PullRequestModalProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="p-6 border-b border-gray-100 bg-indigo-50/60 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Send className="w-6 h-6 text-indigo-600" />
            Request Transfer
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-full shadow-sm border border-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-5">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Requesting Sample</p>
            <p className="font-black text-slate-900">[{sample.sample_id}] — {sample.sample_type}</p>
            <p className="text-xs text-slate-500 mt-1 italic truncate">"{sample.description}"</p>
            <p className="text-[10px] text-slate-400 mt-2">
              Currently with: <span className="font-bold text-slate-700">{sample.current_owner?.name || 'Unknown'}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Reason for Request *
            </label>
            <textarea
              id="pull-request-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Need to review for client presentation..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-all"
              rows={3}
              autoFocus
            />
          </div>

          <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl border border-gray-100">
            ℹ️ The current owner will receive a <strong>"Received — Yes or No?"</strong> notification and must confirm the handover.
          </p>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/20">
          <button onClick={onCancel} className="px-6 py-2.5 text-gray-400 font-bold text-xs uppercase">
            Cancel
          </button>
          <button
            id="confirm-pull-request"
            onClick={() => onConfirm(reason)}
            disabled={isPending || !reason.trim()}
            className="px-8 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isPending ? 'Sending...' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function Locator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToastActions();

  // ─── Tab State (driven by URL ?tab= param) ───────────────────────────────
  const [searchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'finder') as 'finder' | 'warehouse' | 'logs';

  // ─── Finder State ─────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBuyer, setFilterBuyer] = useState('');
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);

  // Pull request modal state
  const [pullRequestTarget, setPullRequestTarget] = useState<Sample | null>(null);

  // ─── Report Filter State ──────────────────────────────────────────────────
  const [reportSearch, setReportSearch] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const [reportType, setReportType] = useState('');
  const [reportBuyer, setReportBuyer] = useState('');
  const [reportHolder, setReportHolder] = useState('');
  const [reportLocation, setReportLocation] = useState('');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // ─── Queries ─────────────────────────────────────────────────────────────

  const { data: samplesRes, isLoading: isLoadingSamples, refetch: refetchSamples } = useQuery({
    queryKey: ['locator-samples-search'],
    queryFn: () => samplesApi.list()
  });

  const { data: locationsRes } = useQuery({
    queryKey: ['locator-storage-locations'],
    queryFn: () => storageApi.getLocations()
  });

  const { data: usersRes } = useQuery({
    queryKey: ['locator-users-list'],
    queryFn: () => api.get('/api/v1/auth/users').then(r => r.data)
  });

  const { data: buyersRes } = useQuery({
    queryKey: ['locator-buyers-list'],
    queryFn: () => api.get('/api/v1/samples/buyers').then(r => r.data)
  });

  const samples = samplesRes?.data || [];
  const locations = locationsRes?.data || [];
  const usersList = usersRes?.data || [];
  const buyersList = buyersRes?.data || [];

  // ─── Mutations ────────────────────────────────────────────────────────────

  /**
   * Pick / Assign to Me — for IN_STORAGE samples.
   * Calls the dedicated /pick endpoint: backend resolves the correct DB user ID
   * from the authenticated session. No user ID or RFID sent from the frontend.
   */
  const assignToMeMutation = useMutation({
    mutationFn: (sample: Sample) => transfersApi.pick(sample.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locator-samples-search'] });
      addToast({ type: 'success', title: 'Assigned!', message: 'Sample is now in your possession.' });
      setSelectedSample(null);
    },
    onError: (err: any) =>
      addToast({ type: 'error', title: 'Assignment Failed', message: err.response?.data?.message || err.message || 'Could not assign sample.' })
  });

  /**
   * Request Transfer (Pull Request) — for samples WITH_MERCHANDISER.
   * Creates a pull request that notifies the current owner.
   * The owner receives "Received — Yes or No?" and must confirm.
   */
  const pullRequestMutation = useMutation({
    mutationFn: ({ sampleId, reason }: { sampleId: string; reason: string }) =>
      transfersApi.pullRequest(sampleId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locator-samples-search'] });
      addToast({
        type: 'success',
        title: 'Request Sent!',
        message: 'The sample owner has been notified. They must confirm the handover.'
      });
      setPullRequestTarget(null);
      setSelectedSample(null);
    },
    onError: (err: any) =>
      addToast({ type: 'error', title: 'Request Failed', message: err.response?.data?.message || 'Could not send request.' })
  });

  // ─── Filter Logic (Finder) ────────────────────────────────────────────────

  const filteredSamples = samples.filter((s: Sample) => {
    const matchesSearch =
      s.sample_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.rfid_epc || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBuyer = filterBuyer ? s.buyer?.name === filterBuyer : true;
    return matchesSearch && matchesBuyer;
  });

  const buyers = Array.from(new Set(samples.map((s: Sample) => s.buyer?.name).filter(Boolean)));

  // ─── Filter Logic (Report) ────────────────────────────────────────────────

  const filteredReportSamples = samples.filter((s: Sample) => {
    const matchesSearch = !reportSearch ||
      s.sample_id.toLowerCase().includes(reportSearch.toLowerCase()) ||
      s.description.toLowerCase().includes(reportSearch.toLowerCase());
    const matchesStatus = !reportStatus || s.current_status === reportStatus;
    const matchesType = !reportType || s.sample_type === reportType;
    const matchesBuyer = !reportBuyer || (s as any).buyer_id === reportBuyer;
    const matchesHolder = !reportHolder || (s as any).current_owner_id === reportHolder;
    const matchesLocation = !reportLocation || s.storage_location?.id === reportLocation;
    let matchesStart = true;
    let matchesEnd = true;
    if (reportStartDate) matchesStart = new Date(s.created_at) >= new Date(reportStartDate);
    if (reportEndDate) {
      const end = new Date(reportEndDate);
      end.setHours(23, 59, 59, 999);
      matchesEnd = new Date(s.created_at) <= end;
    }
    return matchesSearch && matchesStatus && matchesType && matchesBuyer && matchesHolder && matchesLocation && matchesStart && matchesEnd;
  });

  // ─── Export CSV ───────────────────────────────────────────────────────────

  const exportToCSV = () => {
    try {
      const headers = ['Date', 'Sample ID', 'Sample Type', 'Buyer', 'Description', 'Current Status', 'Current Holder', 'RFID Tag', 'Storage Bin'];
      
      const rows = filteredReportSamples.map((s: Sample) => {
        return [
          format(new Date(s.created_at), 'yyyy-MM-dd HH:mm'),
          s.sample_id,
          s.sample_type,
          `"${(s.buyer?.name || 'N/A').replace(/"/g, '""')}"`,
          `"${s.description.replace(/"/g, '""')}"`,
          s.current_status || 'N/A',
          `"${(s.current_owner?.name || s.current_owner?.email || 'N/A').replace(/"/g, '""')}"`,
          s.rfid_epc || 'Untagged',
          s.storage_location ? `${s.storage_location.rack}-${s.storage_location.shelf}-${s.storage_location.bin_id}` : 'Not stored'
        ].join(',');
      });

      // Include UTF-8 BOM for Excel and use Blob URL which is more reliable for filename preservation
      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const filename = `centro_samples_report_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;

      // Create a physical link in the DOM to trigger download reliably
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none'; // Use display none as visibility hidden can sometimes still affect layout
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup after a delay to ensure the OS/browser started the download process
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 5000);

      addToast({
        type: 'success',
        title: 'CSV Exported',
        message: `${filteredReportSamples.length} records saved to ${filename}`
      });
    } catch (err: any) {
      console.error('CSV export error:', err);
      addToast({ type: 'error', title: 'Export Failed', message: err?.message || 'Could not generate CSV file.' });
    }
  };

  // ─── Button Logic ─────────────────────────────────────────────────────────

  const handleActionButton = (e: React.MouseEvent, sample: Sample) => {
    e.stopPropagation();
    if (sample.current_status === 'IN_STORAGE') {
      assignToMeMutation.mutate(sample);
    } else {
      // With Merchandiser or AT_DISPATCH → open pull request modal
      setPullRequestTarget(sample);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">


      {/* Pull Request Modal */}
      <AnimatePresence>
        {pullRequestTarget && (
          <PullRequestModal
            sample={pullRequestTarget}
            onConfirm={(reason) =>
              pullRequestMutation.mutate({ sampleId: pullRequestTarget.id, reason })
            }
            onCancel={() => setPullRequestTarget(null)}
            isPending={pullRequestMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* ══════════════════════ SAMPLE FINDER TAB ══════════════════════════ */}
      {activeTab === 'finder' && (
        <>
      {/* ── HERO SEARCH HEADER ── */}
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-center bg-gradient-to-br from-white to-slate-50">
        <div className="shrink-0 p-4 bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-100 rotate-3">
          <SearchCode className="w-10 h-10 text-white" />
        </div>

        <div className="flex-1 space-y-4 w-full">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Digital Sample Finder</h1>
            <p className="text-slate-500 text-sm font-medium">
              Find any sample instantly. Request transfers or assign to yourself.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type="text"
                id="locator-search"
                placeholder="Search by Sample Code, Description, RFID tag..."
                className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-600/30 focus:ring-4 focus:ring-indigo-600/5 transition-all text-sm font-semibold"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              id="filter-buyer"
              className="px-6 py-3.5 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-600 outline-none hover:border-slate-200 transition-colors"
              value={filterBuyer}
              onChange={e => setFilterBuyer(e.target.value)}
            >
              <option value="">All Buyers</option>
              {buyers.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <button
              id="refresh-locator"
              onClick={() => refetchSamples()}
              className="px-4 py-3.5 bg-white border-2 border-slate-100 rounded-2xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
              <button
                id="view-grid"
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                id="view-list"
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Samples in Storage', value: samples.filter((s: Sample) => s.current_status === 'IN_STORAGE').length, icon: Warehouse, color: 'text-emerald-500' },
          { label: 'Active Transfers', value: samples.filter((s: Sample) => s.current_status === 'PENDING_TRANSFER_APPROVAL').length, icon: ArrowRightLeft, color: 'text-indigo-500' },
          { label: 'With Merchandiser', value: samples.filter((s: Sample) => s.current_status === 'WITH_MERCHANDISER').length, icon: UserCheck, color: 'text-orange-500' },
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

      {/* ── RESULTS ── */}
      {isLoadingSamples ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
          <p className="mt-3 text-slate-500 font-medium">Searching global warehouse...</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredSamples.map((sample: Sample, i: number) => {
              const isInStorage = sample.current_status === 'IN_STORAGE';
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
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
                      <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase truncate">
                        {sample.sample_type} — {sample.buyer?.name}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 font-medium leading-relaxed italic">
                        "{sample.description}"
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                        <MapPin className="w-3.5 h-3.5" />
                        {sample.storage_location ? `Bin ${sample.storage_location.bin_id}` : 'FLOOR FLOW'}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                        {sample.current_owner?.name?.slice(0, 1) || '?'}
                      </div>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="p-2 border-t border-slate-50 flex gap-2">
                    {isInStorage ? (
                      /* Button 1: Assign to Me (sample is in storage) */
                      <button
                        id={`assign-me-${sample.id}`}
                        onClick={(e) => handleActionButton(e, sample)}
                        disabled={assignToMeMutation.isPending}
                        className="flex-1 bg-emerald-600 text-white py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <UserCheck className="w-3 h-3" /> Assign Me
                      </button>
                    ) : (
                      /* Button 2: Request Transfer (sample is with a person) */
                      <button
                        id={`request-transfer-${sample.id}`}
                        onClick={(e) => handleActionButton(e, sample)}
                        disabled={pullRequestMutation.isPending || sample.current_status === 'PENDING_TRANSFER_APPROVAL'}
                        className="flex-1 bg-indigo-600 text-white py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        {sample.current_status === 'PENDING_TRANSFER_APPROVAL' ? 'Transfer Pending' : 'Request Transfer'}
                      </button>
                    )}
                    <button
                      id={`detail-${sample.id}`}
                      onClick={(e) => { e.stopPropagation(); setSelectedSample(sample); }}
                      className="w-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-colors"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredSamples.length === 0 && (
            <div className="col-span-4 py-20 text-center">
              <Package className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="text-slate-600 font-semibold">No samples match your search</p>
              <p className="text-slate-400 text-sm mt-1">Try different keywords or clear the filter</p>
            </div>
          )}
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
                <th className="px-8 py-5">Full Registry ID</th>
                <th className="px-8 py-5">Global Status</th>
                <th className="px-8 py-5">Physical Bin</th>
                <th className="px-8 py-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSamples.map((sample: Sample) => {
                const isInStorage = sample.current_status === 'IN_STORAGE';
                return (
                  <tr key={sample.id} className="hover:bg-indigo-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="font-mono text-[10px] font-bold text-slate-400">#{sample.sample_id}</div>
                      <div className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">
                        {sample.sample_type} ({sample.buyer?.name})
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 italic truncate max-w-xs">"{sample.description}"</div>
                    </td>
                    <td className="px-8 py-5">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider inline-block ${STATUS_TEXT_COLORS[sample.current_status] || 'text-slate-500 bg-slate-50'}`}>
                        {sample.current_status.replace(/_/g, ' ')}
                      </div>
                      {sample.current_owner && (
                        <div className="text-[10px] text-slate-400 mt-1">
                          Owner: <span className="font-bold">{sample.current_owner.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-slate-600 text-sm font-bold">
                        <Database className="w-4 h-4 text-emerald-500" />
                        {sample.storage_location
                          ? `RACK ${sample.storage_location.rack} / BIN ${sample.storage_location.bin_id}`
                          : 'UNSTORED (FLOOR)'}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      {isInStorage ? (
                        <button
                          id={`list-assign-${sample.id}`}
                          onClick={() => assignToMeMutation.mutate(sample)}
                          disabled={assignToMeMutation.isPending}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 hover:-translate-y-0.5 hover:shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                          Assign To Me
                        </button>
                      ) : (
                        <button
                          id={`list-request-${sample.id}`}
                          onClick={() => setPullRequestTarget(sample)}
                          disabled={pullRequestMutation.isPending || sample.current_status === 'PENDING_TRANSFER_APPROVAL'}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:-translate-y-0.5 hover:shadow-indigo-200 transition-all active:scale-95 disabled:opacity-60"
                        >
                          {sample.current_status === 'PENDING_TRANSFER_APPROVAL' ? 'Pending...' : 'Request Transfer'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── SAMPLE DETAIL SIDEBAR ── */}
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
                  <h2 className="text-4xl font-black text-slate-900 leading-tight">
                    [{selectedSample.sample_id}]<br />{selectedSample.sample_type}
                  </h2>
                  <div className="flex gap-2 pt-2">
                    <StatusBadge status={selectedSample.current_status} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 block">Current Custodian</label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                        {selectedSample.current_owner?.name?.slice(0, 2).toUpperCase() || '??'}
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
                        <div className="font-bold text-emerald-900">
                          {selectedSample.storage_location ? `BIN ${selectedSample.storage_location.bin_id}` : 'NOT STORED'}
                        </div>
                        <div className="text-[10px] text-emerald-600/60 font-bold uppercase">
                          {selectedSample.storage_location ? `RACK ${selectedSample.storage_location.rack}` : 'LOCATION PENDING'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-widest pl-2">Available Actions</h4>

                  {selectedSample.current_status === 'IN_STORAGE' ? (
                    /* Button 1: Assign to Me */
                    <button
                      id="sidebar-assign-me"
                      onClick={() => assignToMeMutation.mutate(selectedSample)}
                      disabled={assignToMeMutation.isPending}
                      className="w-full bg-indigo-600 text-white p-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
                    >
                      <UserCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Pull Sample to my Possession
                    </button>
                  ) : (
                    /* Button 2: Request Transfer */
                    <button
                      id="sidebar-request-transfer"
                      onClick={() => {
                        setPullRequestTarget(selectedSample);
                        setSelectedSample(null);
                      }}
                      disabled={pullRequestMutation.isPending || selectedSample.current_status === 'PENDING_TRANSFER_APPROVAL'}
                      className="w-full bg-indigo-600 text-white p-5 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all flex items-center justify-center gap-3 disabled:opacity-60"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      {selectedSample.current_status === 'PENDING_TRANSFER_APPROVAL'
                        ? 'Transfer Already Pending'
                        : 'Request Transfer from Owner'}
                    </button>
                  )}
                </div>

                {/* Metadata */}
                <div className="space-y-4">
                  <h4 className="text-[10px] text-slate-400 font-black uppercase tracking-widest pl-2">System Metadata</h4>
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                    {[
                      { label: 'Buyer Group', value: selectedSample.buyer?.name || 'N/A' },
                      { label: 'RFID Tag (EPC)', value: selectedSample.rfid_epc || 'UNREGISTERED', mono: true },
                      { label: 'Created On', value: new Date(selectedSample.created_at).toLocaleString() },
                    ].map(({ label, value, mono }) => (
                      <div key={label} className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">{label}:</span>
                        <span className={`font-bold ${mono ? 'font-mono text-indigo-600' : 'text-slate-900'}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}

      {/* ══════════════════════ WAREHOUSE VIEW TAB ══════════════════════════ */}
      {activeTab === 'warehouse' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                <Warehouse className="w-6 h-6 text-emerald-500" /> Warehouse View
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">{locations.length} storage locations configured.</p>
            </div>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['locator-storage-locations'] })}
              className="p-2.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors border border-gray-100 bg-white shadow-sm"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {locations.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <Warehouse className="w-16 h-16 mx-auto text-gray-200 mb-4" />
              <p className="text-base font-semibold text-gray-800">No storage locations configured.</p>
              <p className="text-sm text-gray-400 mt-1">Contact your system administrator.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((loc: any) => {
                const pct = loc.max_capacity > 0 ? Math.round((loc.current_count / loc.max_capacity) * 100) : 0;
                const isHigh = pct >= 80;
                const isFull = pct >= 100;
                const samplesHere = samples.filter((s: Sample) => s.storage_location?.id === loc.id);
                return (
                  <div key={loc.id} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-black text-gray-900 text-xl">Rack {loc.rack}</h3>
                        <p className="text-sm text-gray-500">Shelf {loc.shelf} &bull; Bin {loc.bin_id}</p>
                      </div>
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        isFull ? 'bg-red-100 text-red-700 border-red-200'
                          : isHigh ? 'bg-orange-100 text-orange-700 border-orange-200'
                          : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}>
                        {isFull ? 'FULL' : isHigh ? 'HIGH' : 'OK'}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-600">Occupancy</span>
                        <span className="font-bold text-gray-900">{loc.current_count} / {loc.max_capacity}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all ${
                            isFull ? 'bg-red-500' : isHigh ? 'bg-orange-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>

                    {samplesHere.length > 0 && (
                      <div className="border-t border-gray-50 pt-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Samples Here</p>
                        <div className="space-y-1.5 max-h-28 overflow-y-auto">
                          {samplesHere.map((s: Sample) => (
                            <div key={s.id} className="flex items-center justify-between bg-gray-50 px-3 py-1.5 rounded-lg">
                              <span className="font-mono text-xs font-bold text-gray-700">{s.sample_id}</span>
                              <StatusBadge status={s.current_status} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {loc.sample_type_affinity && (
                      <p className="text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg inline-block font-medium">
                        Affinity: {loc.sample_type_affinity}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ SAMPLES REPORT TAB ═════════════════════════ */}
      {activeTab === 'logs' && (
        <div className="space-y-5 animate-in fade-in duration-300">

          {/* Report Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Samples Report</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Showing {filteredReportSamples.length} of {samples.length} total records.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="report-refresh"
                onClick={() => refetchSamples()}
                className="flex items-center justify-center p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-gray-100 bg-white shadow-sm"
                title="Refresh data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                id="report-export-csv"
                onClick={exportToCSV}
                disabled={filteredReportSamples.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Filters Card */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">

            {/* Row 1: Search + Date Range */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="report-search"
                  type="text"
                  placeholder="Search IDs or description..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                  value={reportSearch}
                  onChange={e => setReportSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    id="report-start-date"
                    type="date"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    value={reportStartDate}
                    onChange={e => setReportStartDate(e.target.value)}
                    title="Start Date"
                  />
                </div>
                <div className="flex-1">
                  <input
                    id="report-end-date"
                    type="date"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    value={reportEndDate}
                    onChange={e => setReportEndDate(e.target.value)}
                    title="End Date"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Dropdown Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                id="report-filter-status"
                value={reportStatus}
                onChange={e => setReportStatus(e.target.value)}
                className="flex-1 min-w-[150px] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="IN_TRANSIT_TO_DISPATCH">In Transit to Dispatch</option>
                <option value="AT_DISPATCH">At Dispatch</option>
                <option value="WITH_MERCHANDISER">With Merchandiser</option>
                <option value="IN_STORAGE">In Storage</option>
                <option value="PENDING_TRANSFER_APPROVAL">Pending Transfer</option>
                <option value="DISPOSED">Disposed</option>
              </select>

              <select
                id="report-filter-type"
                value={reportType}
                onChange={e => setReportType(e.target.value)}
                className="flex-1 min-w-[150px] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer"
              >
                <option value="">All Sample Types</option>
                <option value="Proto">Proto</option>
                <option value="Fit">Fit</option>
                <option value="Size Set">Size Set</option>
                <option value="PP">PP</option>
                <option value="Shipment">Shipment</option>
              </select>

              <select
                id="report-filter-buyer"
                value={reportBuyer}
                onChange={e => setReportBuyer(e.target.value)}
                className="flex-1 min-w-[150px] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer"
              >
                <option value="">All Buyers</option>
                {buyersList.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <select
                id="report-filter-holder"
                value={reportHolder}
                onChange={e => setReportHolder(e.target.value)}
                className="flex-1 min-w-[150px] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer"
              >
                <option value="">All Holders</option>
                {usersList.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>

              <select
                id="report-filter-location"
                value={reportLocation}
                onChange={e => setReportLocation(e.target.value)}
                className="flex-1 min-w-[150px] px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all cursor-pointer"
              >
                <option value="">All Locations</option>
                {locations.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>
                    Rack {loc.rack} · Shelf {loc.shelf} · Bin {loc.bin_id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Report Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Date', 'Sample ID', 'Details', 'Status', 'Holder'].map(col => (
                      <th key={col} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoadingSamples ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
                        <p className="mt-2 text-sm text-gray-500">Loading report data...</p>
                      </td>
                    </tr>
                  ) : filteredReportSamples.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                        <p className="text-base font-semibold text-gray-800">No records found</p>
                        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters above.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredReportSamples.map((sample: Sample) => (
                      <tr
                        key={sample.id}
                        className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                        onClick={() => { setSelectedSample(sample); }}
                        title="Click to view details in Sample Finder"
                      >
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {format(new Date(sample.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-bold text-gray-900">{sample.sample_id}</span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <div className="font-semibold text-gray-900 text-sm leading-tight">{sample.description}</div>
                          <div className="text-xs text-indigo-500 mt-0.5 font-medium">
                            Type: {sample.sample_type} · Buyer: {sample.buyer?.name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest border uppercase ${
                            {
                              IN_STORAGE: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                              AT_DISPATCH: 'bg-blue-50 text-blue-700 border-blue-100',
                              WITH_MERCHANDISER: 'bg-yellow-50 text-yellow-700 border-yellow-100',
                              PENDING_TRANSFER_APPROVAL: 'bg-indigo-50 text-indigo-700 border-indigo-100',
                              IN_TRANSIT_TO_DISPATCH: 'bg-sky-50 text-sky-700 border-sky-100',
                            }[sample.current_status] || 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}>
                            {sample.current_status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {sample.current_owner?.name || sample.current_owner?.email || 'System'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            {filteredReportSamples.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {filteredReportSamples.length} record{filteredReportSamples.length !== 1 ? 's' : ''} matched
                </span>
                <button
                  id="report-footer-export"
                  onClick={exportToCSV}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
