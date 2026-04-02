import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Search, Plus, Filter, RefreshCw, Archive, ArrowRightLeft, MapPin, X, ChevronDown, ChevronUp, SmartphoneNfc } from 'lucide-react';
import { samplesApi, api } from '../api';
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

export default function Dashboard() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEncodeModalOpen, setIsEncodeModalOpen] = useState(false);
  const [targetSample, setTargetSample] = useState<Sample | null>(null);
  const [encodeRfid, setEncodeRfid] = useState('');
  const [formData, setFormData] = useState({ buyer_id: '', sample_type: 'Proto', description: '', photo_url: '' });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToastActions();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev: any) => ({ ...prev, photo_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['samples'],
    queryFn: () => samplesApi.list()
  });

  const { data: buyersRes } = useQuery({
    queryKey: ['buyers'],
    queryFn: () => api.get('/api/v1/samples/buyers').then(r => r.data)
  });
  const buyersList = buyersRes?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => samplesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      setIsCreateModalOpen(false);
      setFormData({ buyer_id: '', sample_type: 'Proto', description: '', photo_url: '' });
      addToast({ type: 'success', title: 'Success', message: 'Sample created successfully. Next: Encode RFID.' });
    },
    onError: (err: any) => alert(err.response?.data?.message || err.message || 'Failed to create')
  });

  const encodeMutation = useMutation({
    mutationFn: (data: { id: string; rfid_epc: string }) => samplesApi.encode(data.id, data.rfid_epc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      setIsEncodeModalOpen(false);
      setEncodeRfid('');
      addToast({ type: 'success', title: 'Encoded', message: 'RFID tag assigned successfully.' });
    },
    onError: (err: any) => addToast({ type: 'error', title: 'Encoding Failed', message: err.response?.data?.message || err.message })
  });

  const samples = response?.data || [];

  const filteredSamples = samples.filter((s: Sample) => {
    const matchesSearch = s.sample_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.sample_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType ? s.sample_type === filterType : true;
    return matchesSearch && matchesFilter;
  });

  const StatusBadge = ({ status }: { status: string }) => {
    const colorClass = SAMPLE_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Sample Center
          </h1>
          <p className="text-gray-500 mt-1">Manage your active samples and track their lifecycle.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => refetch()}
            className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-blue-200 hover:shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Create Sample</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Samples', value: samples.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'With Me', value: samples.filter(s => s.current_status === 'WITH_MERCHANDISER').length, icon: Package, color: 'text-green-600', bg: 'bg-green-100' },
          { label: 'In Transit', value: samples.filter(s => ['IN_TRANSIT_TO_DISPATCH', 'AT_DISPATCH'].includes(s.current_status)).length, icon: ArrowRightLeft, color: 'text-orange-600', bg: 'bg-orange-100' },
          { label: 'In Storage', value: samples.filter(s => s.current_status === 'IN_STORAGE').length, icon: Archive, color: 'text-indigo-600', bg: 'bg-indigo-100' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
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

      {/* Filter and Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 gap-4 flex flex-col md:flex-row justify-between items-center bg-gray-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, Description or Type..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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

        {/* Dynamic Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Sample ID</th>
                <th className="px-6 py-4 font-semibold">Details</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">RFID Tag</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                    <p className="mt-2 text-sm">Loading samples...</p>
                  </td>
                </tr>
              ) : filteredSamples.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-base font-medium text-gray-900">No samples found</p>
                    <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredSamples.map((sample: Sample, i: number) => (
                  <React.Fragment key={sample.id}>
                    <tr onClick={() => setExpandedRow(expandedRow === sample.id ? null : sample.id)} className="hover:bg-gray-50/50 transition-colors group cursor-pointer animate-in slide-in-from-bottom flex-grow" style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                      <td className="px-6 py-4">
                        <div className="text-gray-500 font-mono text-sm">{sample.sample_id}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{new Date(sample.created_at).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 text-base">{sample.sample_type}</div>
                        <div className="font-semibold text-blue-600 mt-0.5">{sample.buyer?.name || 'Unknown Buyer'}</div>
                        <div className="text-sm text-gray-700 mt-1">{sample.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={sample.current_status} />
                      </td>
                      <td className="px-6 py-4">
                        {sample.rfid_epc ? (
                          <span className="flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-md border border-green-100 w-max">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                            {sample.rfid_epc.slice(-6)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium px-2 py-1 bg-gray-50 rounded-md border border-gray-100">Pending Tag</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {sample.storage_location ? (
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            <MapPin className="w-4 h-4 text-indigo-500" />
                            <span>{sample.storage_location.rack}-{sample.storage_location.shelf}-{sample.storage_location.bin_id}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/samples/${sample.id}`); }} className="text-blue-600 font-medium text-sm hover:underline hover:text-blue-700">
                            View Details
                          </button>
                          {expandedRow === sample.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </td>
                    </tr>
                    {expandedRow === sample.id && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 text-xs uppercase tracking-wide">Category</p>
                              <p className="font-medium text-gray-900 mt-1">{sample.sample_type}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs uppercase tracking-wide">Buyer Group</p>
                              <p className="font-medium text-gray-900 mt-1">{sample.buyer?.name || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs uppercase tracking-wide">Barcode / ID</p>
                              <p className="font-medium text-gray-600 mt-1 font-mono text-xs max-w-xs break-all border border-gray-200 p-1.5 rounded bg-white inline-block">
                                ID: {sample.sample_id}
                                {sample.rfid_epc && <><br/>RFID: {sample.rfid_epc}</>}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs uppercase tracking-wide">Actions</p>
                              {!sample.rfid_epc && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTargetSample(sample);
                                    setIsEncodeModalOpen(true);
                                  }}
                                  className="mt-1 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-blue-600 font-medium hover:bg-blue-50 rounded transition-colors text-xs"
                                >
                                  <SmartphoneNfc className="w-4 h-4" />
                                  Encode RFID
                                </button>
                              )}
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

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Create New Sample</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white shadow-sm border p-1 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer *</label>
                <select
                  value={formData.buyer_id}
                  onChange={e => setFormData({ ...formData, buyer_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select a buyer...</option>
                  {buyersList.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sample Type *</label>
                <select
                  value={formData.sample_type}
                  onChange={e => setFormData({ ...formData, sample_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Proto">Proto</option>
                  <option value="Fit">Fit</option>
                  <option value="Size Set">Size Set</option>
                  <option value="PP">PP</option>
                  <option value="Shipment">Shipment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Men's Cotton T-shirt - V2"
                  rows={3}
                  className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attach Photo (Optional)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/jpeg, image/png"
                    onChange={handleFileChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 outline-none"
                  />
                  {formData.photo_url && (
                    <img src={formData.photo_url} alt="Preview" className="w-10 h-10 object-cover rounded-md border border-gray-200" />
                  )}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate(formData)}
                disabled={createMutation.isPending || !formData.buyer_id || !formData.description}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-medium shadow-md hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEncodeModalOpen && targetSample && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-blue-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <SmartphoneNfc className="w-5 h-5 text-blue-600" />
                Encode RFID Tag
              </h3>
              <button onClick={() => setIsEncodeModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-white shadow-sm border p-1 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-sm text-gray-600">
                Assigning a permanent RFID hard tag to <span className="font-bold">{targetSample.sample_id}</span>.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RFID EPC Code *</label>
                <input
                  type="text"
                  value={encodeRfid}
                  onChange={e => setEncodeRfid(e.target.value)}
                  placeholder="Scan or enter tag ID..."
                  className="w-full px-3 py-2 border rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => { setIsEncodeModalOpen(false); setEncodeRfid(''); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => encodeMutation.mutate({ id: targetSample.id, rfid_epc: encodeRfid })}
                disabled={encodeMutation.isPending || !encodeRfid}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl font-medium shadow-md hover:bg-blue-700 disabled:opacity-50"
              >
                {encodeMutation.isPending ? 'Encoding...' : 'Apply Tag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
