import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Check, X, ShieldAlert, RefreshCw, Power, MapPin, Users, Key } from 'lucide-react';
import { rfidApi, storageApi, api } from '../api';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'RFID' | 'LOCATIONS' | 'USERS'>('LOCATIONS');

  // RFID State
  const [newEpc, setNewEpc] = useState('');

  // Location State
  const [locForm, setLocForm] = useState({ rack: '', shelf: '', bin_id: '', max_capacity: '', sample_type_affinity: '' });

  // User State
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'MERCHANDISER', office: '' });

  const queryClient = useQueryClient();

  // --- Queries ---
  const { data: tagsRes, isLoading: isLoadingTags } = useQuery({
    queryKey: ['admin-rfid-tags'],
    queryFn: () => rfidApi.getTags()
  });
  const tags = tagsRes?.data || [];

  const { data: locsRes, isLoading: isLoadingLocs } = useQuery({
    queryKey: ['admin-locations'],
    queryFn: () => storageApi.getLocations()
  });
  const locations = locsRes?.data || [];

  const { data: usersRes, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/api/v1/auth/users').then(r => r.data)
  });
  const users = usersRes?.data || [];

  // --- Mutations ---
  const createTagMutation = useMutation({
    mutationFn: (epc: string) => rfidApi.createTag(epc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-rfid-tags'] });
      setNewEpc('');
    },
    onError: (err: any) => alert(err.response?.data?.message || err.message)
  });

  const updateTagStatusMutation = useMutation({
    mutationFn: ({ epc, status }: { epc: string, status: string }) => rfidApi.updateTagStatus(epc, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-rfid-tags'] }),
    onError: (err: any) => alert(err.response?.data?.message || err.message)
  });

  const createLocMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/v1/storage/locations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-locations'] });
      setLocForm({ rack: '', shelf: '', bin_id: '', max_capacity: '', sample_type_affinity: '' });
    },
    onError: (err: any) => alert(err.response?.data?.message || err.message)
  });

  const updateLocMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/api/v1/storage/locations/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-locations'] }),
    onError: (err: any) => alert(err.response?.data?.message || err.message)
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/v1/auth/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setUserForm({ name: '', email: '', role: 'MERCHANDISER', office: '' });
    },
    onError: (err: any) => alert(err.response?.data?.message || err.message)
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.patch(`/api/v1/auth/users/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err: any) => alert(err.response?.data?.message || err.message)
  });

  // --- Form Handlers ---
  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEpc.trim()) createTagMutation.mutate(newEpc.trim());
  };

  const handleCreateLoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (locForm.rack && locForm.shelf && locForm.max_capacity) createLocMutation.mutate(locForm);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (userForm.name && userForm.email) createUserMutation.mutate(userForm);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        System Administration
      </h1>
      <p className="text-gray-500">Manage locations, users, and RFID tags.</p>

      {/* TABS */}
      <div className="flex bg-gray-100 p-1 rounded-xl w-max mt-6">
        <button onClick={() => setActiveTab('LOCATIONS')} className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'LOCATIONS' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}>
          <MapPin className="w-4 h-4" /> Locations
        </button>
        <button onClick={() => setActiveTab('USERS')} className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'USERS' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}>
          <Users className="w-4 h-4" /> Users
        </button>
        <button onClick={() => setActiveTab('RFID')} className={`flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'RFID' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}>
          <Tag className="w-4 h-4" /> RFID Tags
        </button>
      </div>

      {/* ------------- LOCATIONS TAB ------------- */}
      {activeTab === 'LOCATIONS' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" /> Location Management
              </h2>
              <p className="text-sm text-gray-500 mt-1">Add, rename, and manage warehouse storage locations.</p>
            </div>
          </div>
          <div className="p-6 border-b border-gray-100">
            <form onSubmit={handleCreateLoc} className="flex gap-4 items-end flex-wrap">
              <div>
                <label className="text-xs font-semibold text-gray-500">Rack</label>
                <input type="text" required placeholder="A" className="w-20 px-3 py-2 border rounded-xl" value={locForm.rack} onChange={e => setLocForm({ ...locForm, rack: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Shelf</label>
                <input type="text" required placeholder="1" className="w-20 px-3 py-2 border rounded-xl" value={locForm.shelf} onChange={e => setLocForm({ ...locForm, shelf: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Bin</label>
                <input type="text" required placeholder="12" className="w-20 px-3 py-2 border rounded-xl" value={locForm.bin_id} onChange={e => setLocForm({ ...locForm, bin_id: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Type Affinity</label>
                <select className="px-3 py-2 border rounded-xl w-32" value={locForm.sample_type_affinity} onChange={e => setLocForm({ ...locForm, sample_type_affinity: e.target.value })}>
                  <option value="">None</option>
                  <option value="Proto">Proto</option>
                  <option value="Fit">Fit</option>
                  <option value="Size Set">Size Set</option>
                  <option value="PP">PP</option>
                  <option value="Shipment">Shipment</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Capacity</label>
                <input type="number" required placeholder="10" className="w-24 px-3 py-2 border rounded-xl" value={locForm.max_capacity} onChange={e => setLocForm({ ...locForm, max_capacity: e.target.value })} />
              </div>
              <button type="submit" disabled={createLocMutation.isPending} className="bg-indigo-600 text-white px-5 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50">
                <Plus className="w-4 h-4" /> Add Bin
              </button>
            </form>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Type Affinity</th>
                <th className="px-6 py-4 font-semibold">Capacity</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoadingLocs ? <tr><td colSpan={5} className="py-12 text-center text-gray-500"><RefreshCw className="animate-spin text-indigo-500 mx-auto" /></td></tr> : locations.map((loc: any) => (
                <tr key={loc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">Rack {loc.rack} - Shelf {loc.shelf} - Bin {loc.bin_id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{loc.sample_type_affinity || 'None'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{loc.current_count} / {loc.max_capacity}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded text-xs font-semibold ${loc.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{loc.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {loc.is_active ? (
                      <button onClick={() => updateLocMutation.mutate({ id: loc.id, is_active: false })} className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-100 flex items-center gap-1 ml-auto">
                        <X className="w-3.5 h-3.5" /> Deactivate
                      </button>
                    ) : (
                      <button onClick={() => updateLocMutation.mutate({ id: loc.id, is_active: true })} className="text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg text-xs font-medium border border-green-100 flex items-center gap-1 ml-auto">
                        <Check className="w-3.5 h-3.5" /> Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ------------- USERS TAB ------------- */}
      {activeTab === 'USERS' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" /> User Management
              </h2>
              <p className="text-sm text-gray-500 mt-1">Provision roles, enforce deactivation, and manage permissions.</p>
            </div>
          </div>
          <div className="p-6 border-b border-gray-100">
            <form onSubmit={handleCreateUser} className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-semibold text-gray-500">Full Name</label>
                <input type="text" required placeholder="John Doe" className="w-full px-3 py-2 border rounded-xl" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
              </div>
              <div className="flex-1 min-w-[220px]">
                <label className="text-xs font-semibold text-gray-500">Email Address (Unique)</label>
                <input type="email" required placeholder="john@centrotex.com" className="w-full px-3 py-2 border rounded-xl" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500">Role</label>
                <select className="px-3 py-2 border rounded-xl w-40" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                  <option value="MERCHANDISER">Merchandiser</option>
                  <option value="DISPATCH">Dispatch User</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              <button type="submit" disabled={createUserMutation.isPending} className="bg-indigo-600 text-white px-5 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50">
                <Key className="w-4 h-4" /> Provision User
              </button>
            </form>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4 font-semibold">User Details</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoadingUsers ? <tr><td colSpan={4} className="py-12 text-center text-gray-500"><RefreshCw className="animate-spin text-indigo-500 mx-auto" /></td></tr> : users.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-bold text-sm text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-gray-600 border border-gray-200 bg-white px-2 py-1 rounded-md">{u.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded text-xs font-semibold ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u.is_active ? (
                      <button onClick={() => updateUserMutation.mutate({ id: u.id, is_active: false })} className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-100 flex items-center gap-1 ml-auto">
                        <X className="w-3.5 h-3.5" /> Revoke Access
                      </button>
                    ) : (
                      <button onClick={() => updateUserMutation.mutate({ id: u.id, is_active: true })} className="text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg text-xs font-medium border border-green-100 flex items-center gap-1 ml-auto">
                        <Check className="w-3.5 h-3.5" /> Restore Access
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}


      {/* ------------- RFID TAB ------------- */}
      {activeTab === 'RFID' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600" /> RFID Tag Provisioning
              </h2>
              <p className="text-sm text-gray-500 mt-1">Register new tags to be used by merchandisers at dispatch, or disable lost/damaged tags.</p>
            </div>

            <form onSubmit={handleCreateTag} className="flex gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="Enter new EPC (simulate scan)..."
                value={newEpc}
                onChange={(e) => setNewEpc(e.target.value)}
                className="flex-1 md:w-64 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-sm"
              />
              <button
                type="submit"
                disabled={!newEpc.trim() || createTagMutation.isPending}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Provision Tag
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-4 font-semibold">EPC String</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Current Sample</th>
                  <th className="px-6 py-4 font-semibold">Created Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoadingTags ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                      <p className="text-sm">Loading registered tags...</p>
                    </td>
                  </tr>
                ) : tags.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500">
                      <ShieldAlert className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                      <p className="font-medium text-gray-900">No tags provisioned</p>
                      <p className="text-sm">Scan a new tag to add it to the system pool.</p>
                    </td>
                  </tr>
                ) : (
                  tags.map((tag: any) => (
                    <tr key={tag.epc} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-sm text-gray-900">{tag.epc}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border ${tag.status === 'AVAILABLE' ? 'bg-green-100 text-green-800 border-green-200' :
                          tag.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            'bg-red-100 text-red-800 border-red-200'
                          }`}>
                          {tag.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {tag.current_sample ? (
                          <span className="text-sm font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded">
                            {tag.current_sample.sample_id}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(tag.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {tag.status === 'AVAILABLE' ? (
                          <button
                            onClick={() => updateTagStatusMutation.mutate({ epc: tag.epc, status: 'DISABLED' })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                            title="Deactivate tag permanently"
                          >
                            <X className="w-3.5 h-3.5" /> Disable
                          </button>
                        ) : tag.status === 'DISABLED' ? (
                          <button
                            onClick={() => updateTagStatusMutation.mutate({ epc: tag.epc, status: 'AVAILABLE' })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-100"
                          >
                            <Power className="w-3.5 h-3.5" /> Re-enable
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Locked (In Use)</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
