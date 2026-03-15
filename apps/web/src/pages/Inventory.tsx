import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Package, Search, MapPin, SearchX, Layers, Boxes, Maximize,
  User, CheckCircle2, AlertTriangle, XCircle, Tag, Calendar, RefreshCw
} from 'lucide-react';
import { storageApi } from '../api';
import type { StorageLocation } from '../api/storage';
import type { Sample } from '../api/samples';
import { useAuthStore } from '../stores/authStore';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Fetch fully populated locations (with samples)
  const { data: locationsResponse, isLoading: isLoadingLocs, refetch } = useQuery({
    queryKey: ['storage-locations-full'],
    queryFn: () => storageApi.getLocations(),
    refetchInterval: 60000 // Refresh every minute
  });

  const locations = locationsResponse?.data || [];

  // Group locations by rack
  const racks = useMemo(() => {
    const map = new Map<string, StorageLocation[]>();
    locations.forEach((loc: StorageLocation) => {
      if (!map.has(loc.rack)) {
        map.set(loc.rack, []);
      }
      map.get(loc.rack)!.push(loc);
    });
    return Array.from(map.entries()).map(([rack, locs]) => ({
      rack,
      locations: locs
    }));
  }, [locations]);

  // Derived Statistics
  const stats = useMemo(() => {
    let totalCapacity = 0;
    let totalUsed = 0;
    let fullBins = 0;
    let availableBins = 0;

    locations.forEach(loc => {
      totalCapacity += loc.max_capacity;
      totalUsed += loc.current_count;
      if (loc.current_count >= loc.max_capacity) fullBins++;
      else availableBins++;
    });

    return {
      totalLocations: locations.length,
      totalCapacity,
      totalUsed,
      fullBins,
      availableBins,
      utilizationPerc: totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0
    };
  }, [locations]);

  // Aggregate and Filter Samples
  const displayedSamples = useMemo(() => {
    let allStoredSamples: Sample[] = [];

    if (selectedLocationId) {
      const loc = locations.find(l => l.id === selectedLocationId);
      if (loc?.samples) {
        allStoredSamples = loc.samples;
      }
    } else {
      locations.forEach(loc => {
        if (loc.samples && loc.samples.length > 0) {
          allStoredSamples = [...allStoredSamples, ...loc.samples];
        }
      });
    }

    if (!searchTerm) return allStoredSamples;

    const lowerTerm = searchTerm.toLowerCase();
    return allStoredSamples.filter(s =>
      s.sample_id.toLowerCase().includes(lowerTerm) ||
      s.description.toLowerCase().includes(lowerTerm) ||
      (s.sample_type || '').toLowerCase().includes(lowerTerm) ||
      (s.rfid_epc || '').toLowerCase().includes(lowerTerm)
    );
  }, [locations, selectedLocationId, searchTerm]);

  // Help functions for UI
  const getCapacityColor = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio >= 1) return 'text-red-600 bg-red-100 border-red-200'; // Full
    if (ratio >= 0.8) return 'text-orange-600 bg-orange-100 border-orange-200'; // Near full
    if (ratio === 0) return 'text-gray-500 bg-gray-100 border-gray-200'; // Empty
    return 'text-green-600 bg-green-100 border-green-200'; // Available
  };

  const getCapacityProgressColor = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio >= 1) return 'bg-red-500';
    if (ratio >= 0.8) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Storage View & Utilization
          </h1>
          <p className="text-gray-500 mt-1">Monitor storage availability, visualize racks, and find specific samples.</p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            title="Refresh View"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Utilization Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Bins Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 mt-1">
            <Layers className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">Total Bins</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{isLoadingLocs ? '—' : stats.totalLocations}</h3>
          </div>
        </div>

        {/* Overall Capacity Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 relative overflow-hidden">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 mt-1">
            <Boxes className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 text-left">Overall Capacity</p>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-2xl font-bold text-gray-900 leading-none">
                {isLoadingLocs ? '—' : stats.totalUsed} <span className="text-gray-400 text-base font-normal">/ {stats.totalCapacity}</span>
              </h3>
              <span className="text-sm font-semibold text-indigo-600">{stats.utilizationPerc}%</span>
            </div>
          </div>
          {!isLoadingLocs && (
            <div className="absolute bottom-0 left-0 right-0 w-full bg-gray-100 h-[6px]">
              <div
                className={`h-full ${getCapacityProgressColor(stats.totalUsed, stats.totalCapacity)}`}
                style={{ width: `${stats.utilizationPerc}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Available Bins Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-green-50 text-green-600 mt-1">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">Available Bins</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{isLoadingLocs ? '—' : stats.availableBins}</h3>
          </div>
        </div>

        {/* Full Bins Card */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
          <div className="p-3 rounded-xl bg-red-50 text-red-600 mt-1">
            <XCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">Full Bins</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{isLoadingLocs ? '—' : stats.fullBins}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Sidebar: Racks & Bins Explorer */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-500" /> Location Explorer
              </h2>
            </div>

            {isLoadingLocs ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse"></div>)}
              </div>
            ) : racks.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No racks configured in warehouse.</p>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                <button
                  onClick={() => setSelectedLocationId(null)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${!selectedLocationId
                    ? 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 shadow-sm border border-indigo-100'
                    : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span>All Locations Overview</span>
                    <Boxes className="w-4 h-4 opacity-50" />
                  </div>
                </button>

                {racks.map(r => (
                  <div key={r.rack} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5 mb-3 ml-1">
                      <Layers className="w-3.5 h-3.5" /> Rack {r.rack}
                    </h3>
                    <div className="space-y-1.5">
                      {r.locations.map(loc => {
                        const isSelected = selectedLocationId === loc.id;
                        const badgeColor = getCapacityColor(loc.current_count, loc.max_capacity);

                        return (
                          <button
                            key={loc.id}
                            onClick={() => setSelectedLocationId(loc.id)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all relative overflow-hidden group border ${isSelected
                              ? 'bg-white border-indigo-200 shadow-sm cursor-default'
                              : 'bg-white border-transparent hover:border-gray-200'
                              }`}
                          >
                            {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>}

                            <div className="flex justify-between items-start mb-1.5">
                              <span className={`font-medium ${isSelected ? 'text-indigo-900 ml-1' : 'text-gray-700'}`}>
                                Shelf {loc.shelf} - Bin {loc.bin_id}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badgeColor}`}>
                                {loc.current_count}/{loc.max_capacity}
                              </span>
                            </div>

                            {/* Affinity Badge */}
                            {loc.sample_type_affinity && (
                              <div className="flex items-center gap-1 text-[10px] text-gray-500 ml-[2px]">
                                <Tag className="w-3 h-3" /> Favors: {loc.sample_type_affinity}
                              </div>
                            )}

                            {/* Progress bar */}
                            <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
                              <div
                                className={`h-1 rounded-full ${getCapacityProgressColor(loc.current_count, loc.max_capacity)}`}
                                style={{ width: `${(loc.current_count / loc.max_capacity) * 100}%` }}
                              ></div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Area: Samples View */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-h-[500px]">

            {/* Toolbar */}
            <div className="p-5 border-b border-gray-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-500" />
                  {selectedLocationId ? (
                    <>
                      Samples in Bin
                      {(() => {
                        const l = locations.find(x => x.id === selectedLocationId);
                        return l ? <span className="text-gray-400 font-normal">({l.rack}-{l.shelf}-{l.bin_id})</span> : '';
                      })()}
                    </>
                  ) : (
                    'All Stored Samples Database'
                  )}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">{displayedSamples.length} samples found</p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Scan RFID or search ID..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-sm outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1 bg-gray-50/20">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                    <th className="px-5 py-4 font-semibold">Sample Ref & RFID</th>
                    <th className="px-5 py-4 font-semibold">Identity & Details</th>
                    <th className="px-5 py-4 font-semibold">Ownership</th>
                    <th className="px-5 py-4 font-semibold">Location</th>
                    <th className="px-5 py-4 font-semibold text-right">Stored Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoadingLocs ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                        <p className="text-gray-500 font-medium">Scanning warehouse database...</p>
                      </td>
                    </tr>
                  ) : displayedSamples.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <SearchX className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">No samples found</h3>
                        <p className="text-gray-500 mt-1 max-w-sm mx-auto">
                          {searchTerm
                            ? `We couldn't find any stored sample matching "${searchTerm}". Try a different search term or check active location.`
                            : 'This storage location is currently completely empty.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    displayedSamples.map((sample: Sample, i: number) => {
                      // We must derive storage location text since sample objects are hydrated inside loc.samples 
                      // For "All locations", we find which location owns this sample
                      let locationStr = '-';
                      let locColor = 'bg-gray-100';

                      const loc = locations.find(l => l.samples?.some(s => s.id === sample.id));
                      if (loc) {
                        locationStr = `${loc.rack}-${loc.shelf}-${loc.bin_id}`;
                        // If it matches affinity, green, else blue
                        if (loc.sample_type_affinity && loc.sample_type_affinity === sample.sample_type) {
                          locColor = 'bg-green-50 text-green-700 border-green-200';
                        } else {
                          locColor = 'bg-blue-50 text-blue-700 border-blue-200';
                        }
                      }

                      return (
                        <tr key={sample.id} className="bg-white hover:bg-indigo-50/40 transition-colors group animate-in fade-in" style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>

                          {/* Col 1: ID & RFID */}
                          <td className="px-5 py-4">
                            <div className="font-bold text-gray-900 font-mono text-sm">{sample.sample_id}</div>
                            {sample.rfid_epc ? (
                              <div className="text-[11px] text-gray-500 font-mono mt-1 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md inline-flex border border-gray-200">
                                📶 {sample.rfid_epc.slice(-8)}
                              </div>
                            ) : (
                              <div className="text-[11px] text-red-500 font-medium mt-1">No Tag</div>
                            )}
                          </td>

                          {/* Col 2: Details */}
                          <td className="px-5 py-4">
                            <div className="text-sm font-medium text-gray-800 line-clamp-1">{sample.description}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase">
                                {sample.sample_type}
                              </span>
                              <span className="text-xs text-gray-500 truncate mt-0.5 max-w-[120px]" title={sample.buyer?.name}>
                                {sample.buyer?.name || 'Unknown Buyer'}
                              </span>
                            </div>
                          </td>

                          {/* Col 3: Owner */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center shrink-0 border border-indigo-200">
                                <User className="w-3.5 h-3.5 text-indigo-600" />
                              </div>
                              <span className="text-sm text-gray-700 font-medium truncate max-w-[130px]" title={(sample as any).creator?.name || 'Unknown'}>
                                {(sample as any).creator?.name || 'Unknown Owner'}
                              </span>
                            </div>
                          </td>

                          {/* Col 4: Location */}
                          <td className="px-5 py-4">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-sm font-bold font-mono shadow-sm ${locColor}`}>
                              <MapPin className="w-3.5 h-3.5 opacity-70" />
                              {locationStr}
                            </div>
                          </td>

                          {/* Col 5: Date */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                {new Date(sample.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </div>
                              <span className="text-xs text-gray-400 mt-0.5">
                                {new Date(sample.updated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
