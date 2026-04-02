import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { samplesApi, storageApi, api } from '../api';
import type { Sample } from '../api/samples';
import { Download, Search, FileSpreadsheet, RefreshCw, BarChart, Package, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function Reports() {
  const [viewMode, setViewMode] = useState<'SAMPLES' | 'STORAGE'>('SAMPLES');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [buyerFilter, setBuyerFilter] = useState('');
  const [merchandiserFilter, setMerchandiserFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: response, isLoading: isSamplesLoading, refetch: refetchSamples } = useQuery({
    queryKey: ['samples-report'],
    queryFn: () => samplesApi.list()
  });

  const { data: usersRes } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/api/v1/auth/users').then(r => r.data)
  });
  const usersList = usersRes?.data || [];

  const { data: buyersRes } = useQuery({
    queryKey: ['buyers'],
    queryFn: () => api.get('/api/v1/samples/buyers').then(r => r.data)
  });
  const buyersList = buyersRes?.data || [];

  const { data: storageRes, isLoading: isStorageLoading, refetch: refetchStorage } = useQuery({
    queryKey: ['locations-report'],
    queryFn: () => storageApi.getLocations()
  });
  const locationsList = storageRes?.data || [];

  const samples = response?.data || [];

  const filteredSamples = samples.filter((s: Sample) => {
    const matchesSearch = s.sample_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? s.current_status === statusFilter : true;
    const matchesType = typeFilter ? s.sample_type === typeFilter : true;
    const matchesBuyer = buyerFilter ? (s as any).buyer_id === buyerFilter : true;
    const matchesMerch = merchandiserFilter ? (s as any).current_owner_id === merchandiserFilter : true;
    const matchesLoc = locationFilter ? s.storage_location?.id === locationFilter : true;

    let matchesStartDate = true;
    let matchesEndDate = true;
    if (startDate) {
      matchesStartDate = new Date(s.created_at) >= new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesEndDate = new Date(s.created_at) <= end;
    }

    return matchesSearch && matchesStatus && matchesType && matchesBuyer && matchesMerch && matchesLoc && matchesStartDate && matchesEndDate;
  });

  const exportToCSV = () => {
    const headers = ['Date', 'Sample ID', 'Sample Type', 'Buyer', 'Description', 'Current Status', 'Current Holder', 'RFID Tag', 'Storage Bin'];
    const rows = filteredSamples.map((s: Sample) => {
      return [
        format(new Date(s.created_at), 'yyyy-MM-dd HH:mm'),
        s.sample_id,
        s.sample_type,
        s.buyer?.name || 'N/A',
        `"${s.description.replace(/"/g, '""')}"`,
        s.current_status,
        s.current_owner?.name || s.current_owner?.email || 'N/A',
        s.rfid_epc || 'Untagged',
        s.storage_location ? `${s.storage_location.rack}-${s.storage_location.shelf}-${s.storage_location.bin_id}` : 'Not stored'
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `centro_samples_report_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Reports & Analytics
          </h1>
          <p className="text-gray-500 mt-1">Generate lists, apply filters, and export movement histories.</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('SAMPLES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'SAMPLES' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Package className="w-4 h-4" /> Samples
          </button>
          <button
            onClick={() => setViewMode('STORAGE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'STORAGE' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <BarChart className="w-4 h-4" /> Storage Utilisation
          </button>
        </div>
      </div>

      {viewMode === 'SAMPLES' && (
        <>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-gray-800">Samples Report</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetchSamples()}
                className="flex items-center justify-center p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors h-9 w-9"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={exportToCSV}
                disabled={filteredSamples.length === 0}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-4 h-9 rounded-xl text-sm font-medium shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 gap-4 flex flex-col">

            <div className="w-full flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search IDs or description..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 flex-1 relative">
                <Calendar className="absolute left-3 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  className="w-1/2 pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-l-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  title="Start Date"
                />
                <input
                  type="date"
                  className="w-1/2 px-3 py-2 bg-gray-50 border border-l-0 border-gray-200 rounded-r-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  title="End Date"
                />
              </div>
            </div>

            <div className="w-full flex flex-wrap gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 min-w-[140px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="flex-1 min-w-[140px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Sample Types</option>
                <option value="Proto">Proto</option>
                <option value="Fit">Fit</option>
                <option value="Size Set">Size Set</option>
                <option value="PP">PP</option>
                <option value="Shipment">Shipment</option>
              </select>

              <select
                value={buyerFilter}
                onChange={(e) => setBuyerFilter(e.target.value)}
                className="flex-1 min-w-[140px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Buyers</option>
                {buyersList.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <select
                value={merchandiserFilter}
                onChange={(e) => setMerchandiserFilter(e.target.value)}
                className="flex-1 min-w-[140px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Holders</option>
                {usersList
                  .map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                  ))}
              </select>

              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="flex-1 min-w-[140px] px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Locations</option>
                {locationsList.map((loc: any) => (
                  <option key={loc.id} value={loc.id}>
                    Rack {loc.rack} - Shelf {loc.shelf} - Bin {loc.bin_id}
                  </option>
                ))}
              </select>
            </div>
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
                  {isSamplesLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                        <p className="mt-2 text-sm">Loading report data...</p>
                      </td>
                    </tr>
                  ) : filteredSamples.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-base font-medium text-gray-900">No data found</p>
                        <p className="text-sm mt-1">Try adjusting your filters.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSamples.map((sample: Sample, i: number) => (
                      <tr key={sample.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                          {format(new Date(sample.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">
                          {sample.sample_id}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{sample.description}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Type: {sample.sample_type} • Buyer: {sample.buyer?.name || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-gray-600">
                          {sample.current_status.replace(/_/g, ' ')}
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
          </div>
          <div className="text-right text-sm text-gray-500 px-2">
            Showing {filteredSamples.length} of {samples.length} total records.
          </div>
        </>
      )}

      {viewMode === 'STORAGE' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Storage Utilisation</h2>
            <button
              onClick={() => refetchStorage()}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
              title="Refresh Storage Data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            {isStorageLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                <p className="text-sm">Loading storage details...</p>
              </div>
            ) : locationsList.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No storage locations configured.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locationsList.map((loc: any) => {
                  const utilizationPct = Math.round((loc.current_count / loc.max_capacity) * 100);
                  const isHigh = utilizationPct >= 80;
                  const isFull = utilizationPct >= 100;

                  return (
                    <div key={loc.id} className="border border-gray-100 bg-gray-50 rounded-xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">Rack {loc.rack}</h3>
                          <p className="text-sm text-gray-500">Shelf {loc.shelf} • Bin {loc.bin_id}</p>
                        </div>
                        <div className={`px-2.5 py-1 rounded-md text-xs font-bold border ${isFull ? 'bg-red-100 text-red-800 border-red-200' : isHigh ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                          {utilizationPct}% Full
                        </div>
                      </div>

                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-gray-600 font-medium">Used: {loc.current_count}</span>
                        <span className="text-gray-500">Capacity: {loc.max_capacity}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3 overflow-hidden">
                        <div className={`h-2.5 rounded-full ${isFull ? 'bg-red-500' : isHigh ? 'bg-orange-500' : 'bg-green-500'}`} style={{ width: `${Math.min(utilizationPct, 100)}%` }}></div>
                      </div>
                      {loc.sample_type_affinity && (
                        <p className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block mt-2 font-medium">
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
    </div>
  );
}
