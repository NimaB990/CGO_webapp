import React, { useState, useEffect, useMemo } from 'react';
import { Users, Map, Activity, Search, Plus, Trash2, Shield, X, MapPin, Clock, Wifi, Navigation, Flag, Box, Cpu, Edit, Power } from 'lucide-react';
import api from '../api';
import { formatUserDateTime } from '../userPreferences';

const TABS = [
  { key: 'users', label: 'User Management', icon: Users },
  { key: 'geofence', label: 'Geofence Zones', icon: Map },
  { key: 'logs', label: 'System Logs', icon: Activity },
];

function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users');
  const [search, setSearch] = useState('');
  
  const [usersList, setUsersList] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [logs, setLogs] = useState([]);
  
  const [loading, setLoading] = useState(true);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddGeofence, setShowAddGeofence] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '', firstname: '', lastname: '', email: '', password: '', accountType: 'CUSTOM_OFFICER', vehicleNo: ''
  });

  const [editFormData, setEditFormData] = useState({
    id: '', type: '', username: '', firstname: '', lastname: '', email: '', role: '', vehicleNo: ''
  });

  const [geofenceData, setGeofenceData] = useState({
    name: '', latitude: '', longitude: '', radius: '', startPoint: '', endPoint: '', signalStrength: '100', containerNo: '', iotId: ''
  });

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'geofence') fetchGeofences();
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [staffRes, driversRes, ownersRes] = await Promise.all([
        api.get('/api/admin/users/staff'),
        api.get('/api/admin/users/drivers'),
        api.get('/api/admin/users/owners')
      ]);

      const staffData = staffRes.data.map(u => ({
        id: u.staffId, type: 'STAFF', firstname: u.firstname, lastname: u.lastname, username: u.username, email: u.email, role: u.role, isActive: u.active !== false
      }));

      const driverData = driversRes.data.map(u => ({
        id: u.driverId, type: 'DRIVER', firstname: u.firstname, lastname: u.lastname, username: u.username, email: u.email, role: 'DRIVER', vehicleNo: u.vehicleNo, isActive: u.active !== false
      }));

      const ownerData = ownersRes.data.map(u => ({
        id: u.ownerId, type: 'OWNER', firstname: u.firstname, lastname: u.lastname, username: u.username, email: u.email, role: 'OWNER', isActive: u.active !== false
      }));

      setUsersList([...staffData, ...driverData, ...ownerData]);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGeofences = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/geofences'); 
      setGeofences(res.data);
    } catch (err) {
      console.error("Failed to fetch geofences", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/audit-logs');
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to fetch logs", err);
      setLogs([
        { id: 1, action: "User 'johndoe' logged in", timestamp: new Date().toISOString(), user: "System" },
        { id: 2, action: "Container 4 assigned to Galle Route", timestamp: new Date(Date.now() - 3600000).toISOString(), user: "Admin" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleEditInputChange = (e) => setEditFormData({ ...editFormData, [e.target.name]: e.target.value });

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/users', formData);
      setFormData({ username: '', firstname: '', lastname: '', email: '', password: '', accountType: 'CUSTOM_OFFICER', vehicleNo: '' });
      setShowAddForm(false);
      fetchUsers(); 
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleEditClick = (user) => {
    setEditFormData({
      id: user.id,
      type: user.type,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      vehicleNo: user.vehicleNo || ''
    });
    setShowEditForm(true);
    setShowAddForm(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    const requestPayload = {
      firstname: editFormData.firstname,
      lastname: editFormData.lastname,
      email: editFormData.email,
      accountType: editFormData.role,
      vehicleNo: editFormData.vehicleNo
    };

    try {
      await api.put(`/api/admin/users/${editFormData.type}/${editFormData.id}`, requestPayload);
      
      setUsersList((currentUsers) => 
        currentUsers.map((user) => 
          (user.id === editFormData.id && user.type === editFormData.type)
            ? { ...user, ...editFormData } 
            : user
        )
      );
      setShowEditForm(false);
    } catch (err) {
      console.error('Failed to update user', err);
      alert(err.response?.data?.message || 'Failed to update user. Please check permissions.');
    }
  };

  const handleDeleteUser = async (id, type) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.delete(`/api/admin/users/${type}/${id}`);
      setUsersList((currentUsers) => currentUsers.filter((user) => !(user.id === id && user.type === type)));
    } catch (err) {
      console.error('Failed to delete user', err);
      alert(err.response?.data?.message || 'Failed to delete user. Please check permissions.');
    }
  };

  const handleToggleStatus = async (id, type, currentStatus) => {
    const newStatus = !currentStatus;
    try {
      await api.put(`/api/admin/users/${type}/${id}/status?isActive=${newStatus}`);
      setUsersList((currentUsers) => 
        currentUsers.map((user) => 
          (user.id === id && user.type === type)
            ? { ...user, isActive: newStatus } 
            : user
        )
      );
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Failed to change user status.');
    }
  };

  const handleGeofenceInputChange = (e) => setGeofenceData({ ...geofenceData, [e.target.name]: e.target.value });

  const handleAddGeofence = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/geofences', geofenceData);
      setGeofenceData({ name: '', latitude: '', longitude: '', radius: '', startPoint: '', endPoint: '', signalStrength: '100', containerNo: '', iotId: '' });
      setShowAddGeofence(false);
      fetchGeofences();
    } catch (err) {
      alert('Failed to add geofence. Check backend endpoints.');
    }
  };

  const handleDeleteGeofence = async (id) => {
    if(window.confirm('Are you sure you want to delete this Geofence?')) {
      try {
        await api.delete(`/api/geofences/${id}`);
        fetchGeofences();
      } catch (err) { console.error("Failed to delete geofence", err); }
    }
  };

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return usersList;
    return usersList.filter(
      (user) => (user.firstname + ' ' + user.lastname).toLowerCase().includes(query) || user.email?.toLowerCase().includes(query) || user.role?.toLowerCase().includes(query)
    );
  }, [search, usersList]);

  const getRoleStyle = (role, type) => {
    if (role === 'OWNER') return 'bg-purple-50 text-purple-600';
    if (role === 'INSPECTOR') return 'bg-emerald-50 text-emerald-600';
    if (type === 'DRIVER' || role === 'DRIVER') return 'bg-orange-50 text-orange-600';
    return 'bg-blue-50 text-blue-600'; 
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Admin Panel</h2>
          <p className="mt-1 text-sm text-slate-500">System administration and user management</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-600">
          <Shield size={14} /> Administrator Access
        </span>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex flex-wrap gap-6">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setActiveTab(key); setShowAddForm(false); setShowEditForm(false); setShowAddGeofence(false); }}
              className={`flex items-center gap-1.5 border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === key ? 'border-[#0B3A5A] text-[#0B3A5A]' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'users' && (
        <div className="rounded-xl bg-white shadow-sm">
          {!showAddForm && !showEditForm && (
            <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..."
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15"
                />
              </div>
              <button
                type="button" onClick={() => setShowAddForm(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-[#0B3A5A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0a2f4a]"
              >
                <Plus size={16} /> Add User
              </button>
            </div>
          )}

          {showAddForm && (
             <div className="border-b border-gray-100 p-6 bg-slate-50 rounded-t-xl">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-slate-800">Add New User</h3>
                 <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
               </div>
               <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div><label className="block text-xs font-medium text-slate-700 mb-1">First Name</label><input required type="text" name="firstname" value={formData.firstname} onChange={handleUserInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#0B3A5A]" /></div>
                 <div><label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label><input required type="text" name="lastname" value={formData.lastname} onChange={handleUserInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#0B3A5A]" /></div>
                 <div><label className="block text-xs font-medium text-slate-700 mb-1">Email</label><input required type="email" name="email" value={formData.email} onChange={handleUserInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#0B3A5A]" /></div>
                 <div>
                   <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
                   <select name="accountType" value={formData.accountType} onChange={handleUserInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#0B3A5A]">
                     <option value="ADMIN">Admin</option>
                     <option value="CUSTOM_OFFICER">Customs Officer</option>
                     <option value="INSPECTOR">Field Inspector</option>
                     <option value="DRIVER">Truck Driver</option>
                     <option value="OWNER">Cargo Owner</option> 
                   </select>
                 </div>
                 {formData.accountType === 'DRIVER' && (<div><label className="block text-xs font-medium text-slate-700 mb-1">Vehicle No</label><input required type="text" name="vehicleNo" value={formData.vehicleNo} onChange={handleUserInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#0B3A5A]" /></div>)}
                 <div><label className="block text-xs font-medium text-slate-700 mb-1">Username</label><input required type="text" name="username" value={formData.username} onChange={handleUserInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#0B3A5A]" /></div>
                 <div><label className="block text-xs font-medium text-slate-700 mb-1">Password</label><input required type="password" name="password" value={formData.password} onChange={handleUserInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#0B3A5A]" /></div>
                 <div className="md:col-span-2 pt-2"><button type="submit" className="w-full sm:w-auto rounded-lg bg-[#0B3A5A] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0a2f4a]">Save User</button></div>
               </form>
             </div>
          )}

          {showEditForm && (
             <div className="border-b border-gray-100 p-6 bg-blue-50 rounded-t-xl">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-slate-800">Edit User Details</h3>
                 <button onClick={() => setShowEditForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
               </div>
               <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div><label className="block text-xs font-medium text-slate-700 mb-1">First Name</label><input required type="text" name="firstname" value={editFormData.firstname} onChange={handleEditInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#0B3A5A]" /></div>
                 <div><label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label><input required type="text" name="lastname" value={editFormData.lastname} onChange={handleEditInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#0B3A5A]" /></div>
                 <div><label className="block text-xs font-medium text-slate-700 mb-1">Email</label><input required type="email" name="email" value={editFormData.email} onChange={handleEditInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#0B3A5A]" /></div>
                 <div>
                   <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
                   <select name="role" value={editFormData.role} onChange={handleEditInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#0B3A5A]">
                     <option value="ADMIN">Admin</option>
                     <option value="CUSTOM_OFFICER">Customs Officer</option>
                     <option value="INSPECTOR">Field Inspector</option>
                     <option value="DRIVER">Truck Driver</option>
                     <option value="OWNER">Cargo Owner</option> 
                   </select>
                 </div>
                 {editFormData.type === 'DRIVER' && (<div><label className="block text-xs font-medium text-slate-700 mb-1">Vehicle No</label><input required type="text" name="vehicleNo" value={editFormData.vehicleNo} onChange={handleEditInputChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-[#0B3A5A]" /></div>)}
                 <div><label className="block text-xs font-medium text-slate-700 mb-1">Username (Cannot Change)</label><input disabled type="text" name="username" value={editFormData.username} className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm focus:outline-none text-gray-500" /></div>
                 <div className="md:col-span-2 pt-2 flex gap-3">
                    <button type="submit" className="w-full sm:w-auto rounded-lg bg-[#0B3A5A] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0a2f4a]">Update User</button>
                    <button type="button" onClick={() => setShowEditForm(false)} className="w-full sm:w-auto rounded-lg bg-gray-200 px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-gray-300">Cancel</button>
                 </div>
               </form>
             </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Name</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr> : filteredUsers.map((user) => (
                  <tr key={`${user.type}-${user.id}`} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 ${!user.isActive ? 'opacity-60 bg-gray-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {user.firstname} {user.lastname}
                      {!user.isActive && <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-sm font-bold">INACTIVE</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{user.username}</td><td className="px-4 py-3 text-slate-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleStyle(user.role, user.type)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-3">
                      <button onClick={() => handleToggleStatus(user.id, user.type, user.isActive)} className={`${user.isActive ? 'text-amber-500 hover:text-amber-700' : 'text-emerald-500 hover:text-emerald-700'}`} title={user.isActive ? "Deactivate User" : "Activate User"}><Power size={16} /></button>
                      <button onClick={() => handleEditClick(user)} className="text-blue-500 hover:text-blue-700" title="Edit User"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteUser(user.id, user.type)} className="text-red-500 hover:text-red-700" title="Delete User"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'geofence' && (
        <div className="rounded-xl bg-white shadow-sm">
          {!showAddGeofence && (
            <div className="flex justify-end border-b border-gray-100 p-4">
              <button onClick={() => setShowAddGeofence(true)} className="flex items-center gap-1.5 rounded-lg bg-[#0B3A5A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0a2f4a]">
                <Plus size={16} /> Create Geofence
              </button>
            </div>
          )}

          {showAddGeofence && (
            <div className="border-b border-gray-100 p-6 bg-slate-50 rounded-t-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Add New Geofence</h3>
                <button onClick={() => setShowAddGeofence(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddGeofence} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div><label className="block text-xs font-medium text-slate-700 mb-1">Location Name</label><input required type="text" name="name" value={geofenceData.name} onChange={handleGeofenceInputChange} placeholder="e.g. Colombo Port" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
                 <div><label className="block text-xs font-medium text-slate-700 mb-1">Latitude</label><input required type="text" name="latitude" value={geofenceData.latitude} onChange={handleGeofenceInputChange} placeholder="6.9497" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
                 <div><label className="block text-xs font-medium text-slate-700 mb-1">Longitude</label><input required type="text" name="longitude" value={geofenceData.longitude} onChange={handleGeofenceInputChange} placeholder="79.8433" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
                 <div><label className="block text-xs font-medium text-slate-700 mb-1">Radius (Meters)</label><input required type="number" name="radius" value={geofenceData.radius} onChange={handleGeofenceInputChange} placeholder="2000" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
                 
                 <div><label className="block text-xs font-medium text-slate-700 mb-1">Start Point</label><input type="text" name="startPoint" value={geofenceData.startPoint} onChange={handleGeofenceInputChange} placeholder="e.g. Warehouse A" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
                 <div><label className="block text-xs font-medium text-slate-700 mb-1">End Point</label><input type="text" name="endPoint" value={geofenceData.endPoint} onChange={handleGeofenceInputChange} placeholder="e.g. Kandy Terminal" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
                 <div><label className="block text-xs font-medium text-slate-700 mb-1">Container No</label><input type="text" name="containerNo" value={geofenceData.containerNo} onChange={handleGeofenceInputChange} placeholder="e.g. CONT-1234" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
                 <div><label className="block text-xs font-medium text-slate-700 mb-1">IoT Module ID</label><input type="text" name="iotId" value={geofenceData.iotId} onChange={handleGeofenceInputChange} placeholder="e.g. ESP32-001" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
                 
                 <div className="md:col-span-4 pt-2"><button type="submit" className="w-full sm:w-auto rounded-lg bg-[#0B3A5A] px-6 py-2 text-sm font-semibold text-white">Save Geofence</button></div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 p-5">
            {loading ? <p className="text-sm text-slate-500">Loading Geofences...</p> : geofences.length === 0 ? <p className="text-sm text-slate-500">No Geofence zones configured.</p> : (
              geofences.map((zone) => (
                <div key={zone.id || zone.geofenceId} className="border border-gray-200 bg-white rounded-xl p-5 relative hover:border-[#0B3A5A] transition-colors shadow-sm flex flex-col">
                  <button onClick={() => handleDeleteGeofence(zone.id || zone.geofenceId)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                  
                  <div className="flex items-center gap-2 mb-3 text-[#0B3A5A]">
                    <MapPin size={20} />
                    <h4 className="font-semibold text-base">{zone.name || zone.destination || 'Custom Zone'}</h4>
                  </div>
                  
                  <div className="space-y-3 mb-4 flex-grow">
                    <div className="flex items-center text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <Navigation size={14} className="mr-2 text-slate-400" />
                      <span className="font-medium text-slate-800 mr-1">Lat:</span> {zone.latitude} 
                      <span className="mx-2 text-slate-300">|</span> 
                      <span className="font-medium text-slate-800 mr-1">Lng:</span> {zone.longitude}
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs text-slate-600 mt-2">
                      <div className="flex items-center"><MapPin size={12} className="mr-2 text-emerald-500"/> <span className="font-medium mr-1">Start:</span> {zone.startPoint || 'N/A'}</div>
                      <div className="flex items-center"><Flag size={12} className="mr-2 text-rose-500"/> <span className="font-medium mr-1">End:</span> {zone.endPoint || 'N/A'}</div>
                      <div className="flex items-center"><Box size={12} className="mr-2 text-indigo-500"/> <span className="font-medium mr-1">Container:</span> {zone.containerNo || 'N/A'}</div>
                      <div className="flex items-center"><Cpu size={12} className="mr-2 text-teal-500"/> <span className="font-medium mr-1">IoT Module:</span> {zone.iotId || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="flex items-center flex-wrap gap-2 pt-3 border-t border-gray-100 mt-auto">
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                      Radius: {zone.radius || 2000}m
                    </span>
                    {zone.signalStrength && (
                      <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 flex items-center gap-1.5">
                        <Wifi size={12} /> {zone.signalStrength} dBm
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-slate-50">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2"><Activity size={18}/> Activity Audit Logs</h3>
          </div>
          <ul className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {loading ? <li className="p-8 text-center text-slate-500">Loading logs...</li> : logs.map((log, index) => (
              <li key={index} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
                <div>
                  <p className="text-sm font-medium text-slate-900">{log.action || log.message}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">User: <span className="font-medium text-slate-700">{log.staff?.username || log.user || 'System'}</span></p>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock size={12} /> {formatUserDateTime(log.activeTime || log.timestamp || log.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;