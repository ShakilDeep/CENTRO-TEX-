import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { RoleBasedGuard, AdminOnly, ManagerOrAbove } from './RoleBasedGuard';
import { useRoleCheck } from '../hooks/useRoleCheck';
import { api } from '../api';

interface Location {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

interface Sample {
  id: string;
  sample_id: string;
  sample_type: string;
  description: string;
  created_at: string;
  expected_return_date?: string | null;
  buyer_name?: string | null;
  location: {
    id: string;
    name: string;
    type: string;
  };
  checkout_user?: {
    id: string;
    name: string;
    office: string;
  } | null;
  inventory?: {
    id: string;
    status: string;
  } | null;
}

const DashboardContent = () => {
  const { canManageSamples, canDeleteSamples, canApproveSamples } = useRoleCheck();
  const authUser = useAuthStore(state => state.user);
  const userEmail = authUser?.email || '';
  const userId = authUser?.id || '';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    sample_type: '',
    description: '',
    location_id: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [isLoadingSamples, setIsLoadingSamples] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOffice, setFilterOffice] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [filterHolder, setFilterHolder] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/v1/locations?limit=100');
        if (!response.ok) {
          throw new Error('Failed to fetch locations');
        }
        const result = await response.json();
        setLocations(result.data?.items || (Array.isArray(result.data) ? result.data : []));
      } catch (err) {
        console.error('Error fetching locations:', err);
      }
    };

    fetchLocations();
  }, []);

  useEffect(() => {
    const fetchSamples = async () => {
      setIsLoadingSamples(true);
      try {
        const params = new URLSearchParams();
        params.append('limit', '1000'); // Fetch more for client-side filtering

        const response = await fetch(`/api/v1/samples?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch samples');
        }
        const result = await response.json();
        console.log('Samples API response:', result);
        setSamples(result.data || []);
      } catch (err) {
        console.error('Error fetching samples:', err);
      } finally {
        setIsLoadingSamples(false);
      }
    };

    fetchSamples();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId && !(event.target as Element).closest('.action-menu')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const refreshSamples = async () => {
    try {
      const response = await fetch('/api/v1/samples?limit=1000');
      if (!response.ok) {
        throw new Error('Failed to fetch samples');
      }
      const result = await response.json();
      setSamples(result.data || []);
    } catch (err) {
      console.error('Error fetching samples:', err);
    }
  };

  // Helper function to get status badge colors
  const getStatusColor = (status: string, isOverdue: boolean) => {
    if (isOverdue) return { bg: 'bg-red-100', text: 'text-red-800', color: '#E74C3C' };
    switch (status) {
      case 'IN_SHOWROOM':
        return { bg: 'bg-green-100', text: 'text-green-800', color: '#27AE60' };
      case 'AT_STATION':
        return { bg: 'bg-blue-100', text: 'text-blue-800', color: '#2E86AB' };
      case 'WITH_BUYER':
        return { bg: 'bg-amber-100', text: 'text-amber-800', color: '#F39C12' };
      case 'ARCHIVED':
        return { bg: 'bg-gray-100', text: 'text-gray-800', color: '#95A5A6' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', color: '#95A5A6' };
    }
  };

  // Check if sample is overdue (>48 hours at station)
  const isOverdue = (sample: Sample) => {
    if (sample.inventory?.status !== 'AT_STATION') return false;
    if (!sample.created_at) return false;
    const hoursSinceCheckout = (Date.now() - new Date(sample.created_at).getTime()) / (1000 * 60 * 60);
    return hoursSinceCheckout > 48;
  };

  // Filter and sort samples
  const filteredAndSortedSamples = useMemo(() => {
    let filtered = [...samples];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.sample_id.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        (s.buyer_name && s.buyer_name.toLowerCase().includes(query)) ||
        s.checkout_user?.name.toLowerCase().includes(query)
      );
    }

    // Office filter
    if (filterOffice) {
      filtered = filtered.filter(s => s.sample_id.startsWith(filterOffice));
    }

    // Type filter
    if (filterType) {
      filtered = filtered.filter(s => s.sample_type === filterType);
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter(s => {
        if (filterStatus === 'Overdue') return isOverdue(s);
        return s.inventory?.status === filterStatus;
      });
    }

    // Holder filter
    if (filterHolder) {
      if (filterHolder === 'me') {
        filtered = filtered.filter(s => s.checkout_user?.id === userId);
      } else if (filterHolder === 'others') {
        filtered = filtered.filter(s => s.checkout_user && s.checkout_user.id !== userId);
      }
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(s => new Date(s.created_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(s => new Date(s.created_at) <= new Date(dateTo));
    }

    // Sort: overdue samples first, then by created date desc
    filtered.sort((a, b) => {
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return filtered;
  }, [samples, searchQuery, filterOffice, filterType, filterStatus, filterHolder, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedSamples.length / itemsPerPage);
  const paginatedSamples = filteredAndSortedSamples.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterOffice, filterType, filterStatus, filterHolder, dateFrom, dateTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/api/v1/samples', {
        sample_type: formData.sample_type,
        description: formData.description,
        location_id: formData.location_id,
        user_id: userId
      });
      setIsModalOpen(false);
      setFormData({ sample_type: '', description: '', location_id: '' });
      await refreshSamples();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckout = (sample: Sample) => {
    setSelectedSample(sample);
    setCheckoutModalOpen(true);
    setOpenMenuId(null);
  };

  const handleCheckin = async (sample: Sample) => {
    try {
      await api.patch('/api/v1/inventory/checkin', {
        sampleId: sample.sample_id,
        userId: userId,
        notes: 'Checked in from dashboard'
      });

      await refreshSamples();
      setOpenMenuId(null);
    } catch (err) {
      console.error('Error checking in sample:', err);
      alert('Failed to check in sample');
    }
  };

  const handleCheckoutSubmit = async (locationId: string) => {
    if (!selectedSample) return;

    try {
      await api.patch('/api/v1/inventory/checkout', {
        sampleId: selectedSample.sample_id,
        locationId: locationId,
        userId: userId,
        status: 'WITH_BUYER',
        notes: 'Checked out from dashboard'
      });

      await refreshSamples();
      setCheckoutModalOpen(false);
      setSelectedSample(null);
    } catch (err) {
      console.error('Error checking out sample:', err);
      alert('Failed to check out sample');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filters and Controls */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)] p-4 shadow-sm z-10 w-full shrink-0">
        <div className="flex flex-wrap items-center gap-3 w-full">
          {/* Search container */}
          <div className="relative w-full sm:w-auto sm:flex-1 md:flex-none md:w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
              placeholder="Search Sample ID or Buyer..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Clear Filter Icon */}
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterOffice('');
              setFilterType('');
              setFilterStatus('');
              setFilterHolder('');
              setDateFrom('');
              setDateTo('');
            }}
            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-50 flex items-center justify-center transition-colors border border-transparent shrink-0"
            title="Reset Filters"
          >
            <span className="material-symbols-outlined text-[22px]">filter_alt_off</span>
          </button>

          {/* Selects */}
          <select
            className="px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[110px]"
            value={filterOffice}
            onChange={(e) => setFilterOffice(e.target.value)}
          >
            <option value="">All Offices</option>
            <option value="UK">UK Office</option>
            <option value="BD">BD Office</option>
          </select>
          <select
            className="px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Sample Type</option>
            <option value="FABRIC">Fabric</option>
            <option value="YARN">Yarn</option>
            <option value="THREAD">Thread</option>
            <option value="TRIM">Trim / Accessory</option>
          </select>
          <select
            className="px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[110px]"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Status</option>
            <option value="IN_SHOWROOM">In Showroom</option>
            <option value="AT_STATION">At Station</option>
            <option value="WITH_BUYER">With Buyer</option>
            <option value="Overdue">Overdue</option>
          </select>
          <select
            className="px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[110px]"
            value={filterHolder}
            onChange={(e) => setFilterHolder(e.target.value)}
          >
            <option value="">Holder</option>
            <option value="me">My Samples</option>
            <option value="others">Others</option>
          </select>

          <div className="hidden sm:block h-6 w-[1px] bg-slate-200 mx-1"></div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              className="px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              className="px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
            />
          </div>

          {canManageSamples() && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors shadow-sm ml-auto cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Sample
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-auto bg-white custom-scrollbar relative">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-40">Sample ID</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Buyer</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Type</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-24">Office</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Current Location</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Last Holder</th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoadingSamples ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                  Loading samples...
                </td>
              </tr>
            ) : filteredAndSortedSamples.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                    <p className="text-sm">No samples match your filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedSamples.map((sample) => {
                const status = sample.inventory?.status || 'IN_SHOWROOM';
                const sampleIsOverdue = isOverdue(sample);
                const statusColors = getStatusColor(status, sampleIsOverdue);
                const userName = sample.checkout_user?.name || '--';
                const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const office = sample.checkout_user?.office || '--';
                const sampleIdParts = sample.sample_id.split('-');
                const sampleOffice = sampleIdParts.length > 1 ? sampleIdParts[0] : office;

                return (
                  <tr key={sample.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {sampleIsOverdue && (
                          <span className="material-symbols-outlined text-[18px]" style={{ color: '#E74C3C' }} title="Overdue (>48h)">warning</span>
                        )}
                        <Link to={`/samples/${sample.sample_id}`} className="text-sm font-medium text-slate-900 hover:text-blue-600 hover:underline">
                          {sample.sample_id}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">
                      {sample.buyer_name || '--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {sample.sample_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {sampleOffice}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColors.color }}></span>
                        {sampleIsOverdue ? 'Overdue' : status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {sample.location?.name || '--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {sample.checkout_user ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] text-blue-800 font-bold">
                            {userInitials}
                          </div>
                          <span className="text-sm text-slate-700">{userName}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 italic">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium relative action-menu">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === sample.id ? null : sample.id)}
                        className="text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors p-1.5 rounded-md inline-flex items-center justify-center"
                        title="Actions"
                      >
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                      </button>

                      {openMenuId === sample.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-50 min-w-[160px] action-menu">
                          <div className="py-1">
                            <Link
                              to={`/samples/${sample.sample_id}`}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              onClick={() => setOpenMenuId(null)}
                            >
                              <span className="material-symbols-outlined text-[18px]">visibility</span>
                              View Details
                            </Link>
                            {sample.inventory?.status === 'IN_SHOWROOM' || sample.inventory?.status === 'CHECKED_IN' ? (
                              <button
                                onClick={() => handleCheckout(sample)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                              >
                                <span className="material-symbols-outlined text-[18px]">logout</span>
                                Check Out
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCheckin(sample)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                              >
                                <span className="material-symbols-outlined text-[18px]">login</span>
                                Check In
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredAndSortedSamples.length > itemsPerPage && (
        <div className="bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-700">
            Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAndSortedSamples.length)}</span> of <span className="font-medium">{filteredAndSortedSamples.length}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm border rounded-md ${currentPage === pageNum
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* New Sample Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Create New Sample</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                    {error}
                  </div>
                )}
                <div>
                  <label htmlFor="sample_type" className="block text-sm font-medium text-slate-700 mb-1">
                    Sample Type *
                  </label>
                  <select
                    id="sample_type"
                    name="sample_type"
                    value={formData.sample_type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select type...</option>
                    <option value="FABRIC">Fabric Swatch</option>
                    <option value="YARN">Yarn</option>
                    <option value="THREAD">Thread</option>
                    <option value="TRIM">Trim / Accessory</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Sample description..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="location_id" className="block text-sm font-medium text-slate-700 mb-1">
                    Location *
                  </label>
                  <select
                    id="location_id"
                    name="location_id"
                    value={formData.location_id}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select location...</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Sample'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutModalOpen && selectedSample && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Check Out Sample</h3>
              <button
                onClick={() => {
                  setCheckoutModalOpen(false);
                  setSelectedSample(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="mb-4 p-3 bg-slate-50 rounded-md">
                <p className="text-sm text-slate-600">Sample ID</p>
                <p className="text-base font-semibold text-slate-900">{selectedSample.sample_id}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="checkout_location" className="block text-sm font-medium text-slate-700 mb-1">
                    Check Out To Location *
                  </label>
                  <select
                    id="checkout_location"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onChange={(e) => {
                      if (e.target.value) {
                        handleCheckoutSubmit(e.target.value);
                      }
                    }}
                  >
                    <option value="">Select destination...</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-sm text-slate-500">
                  <p>Sample will be marked as checked out to the selected location.</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setCheckoutModalOpen(false);
                  setSelectedSample(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardContent;
