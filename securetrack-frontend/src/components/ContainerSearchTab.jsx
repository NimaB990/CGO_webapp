import React, { useState } from 'react';
import { Search, Truck, User, Navigation, AlertCircle } from 'lucide-react';
import api from '../api';

function ContainerSearchTab() {
  const [containerId, setContainerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    const query = containerId.trim().toUpperCase();
    if (!query) {
      setError('කරුණාකර වලංගු Container Number එකක් ඇතුළත් කරන්න.');
      return;
    }

    setLoading(true);
    setError(null);
    setDetails(null);

    try {
      const response = await api.get(`/api/trips/container/${encodeURIComponent(query)}`);
      const data = response.data?.data || response.data;
      if (!data) throw new Error('No data');
      setDetails(data);
    } catch (err) {
      console.error('Container search error:', err);
      const msg = err.response?.data?.message || 'මෙම Container ID එකට අදාළ Active Trip එකක් හෝ තොරතුරු හමු නොවීය.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar Container */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-900 text-lg mb-1">Container Lookup & Transit Info</h3>
        <p className="text-xs text-slate-500 mb-4">Enter Container ID to search for assigned route, vehicle, and driver details.</p>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
            <input
              type="text"
              value={containerId}
              onChange={(e) => setContainerId(e.target.value)}
              placeholder="e.g. CONT-9876"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm text-slate-900 uppercase focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#0B3A5A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#092f49] disabled:opacity-70"
          >
            {loading ? 'Searching...' : 'Search Container'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Details Cards */}
      {details && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Route */}
          <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-[#0B3A5A] font-semibold mb-3">
              <Navigation size={18} />
              <h4>Assigned Route</h4>
            </div>
            <div className="space-y-2.5 text-sm text-slate-700">
              <div>
                <span className="text-xs text-slate-400 block">Route Name</span>
                <span className="font-semibold text-slate-900">
                  {details.route || details.routeName || details.assignedRoute || 'Direct Transit'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Status</span>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-[#0B3A5A] border border-sky-200">
                  {details.status || 'ACTIVE'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Vehicle Details */}
          <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-3">
              <Truck size={18} />
              <h4>Vehicle Details</h4>
            </div>
            <div className="space-y-2.5 text-sm text-slate-700">
              <div>
                <span className="text-xs text-slate-400 block">Vehicle Number</span>
                <span className="text-base font-mono font-bold text-slate-900">
                  {details.vehicleNumber || details.vehicleNo || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Container No</span>
                <span className="font-mono text-slate-800">
                  {details.containerNumber || containerId.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Driver Details */}
          <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-indigo-700 font-semibold mb-3">
              <User size={18} />
              <h4>Driver Details</h4>
            </div>
            <div className="space-y-2.5 text-sm text-slate-700">
              <div>
                <span className="text-xs text-slate-400 block">Driver Name</span>
                <span className="font-semibold text-slate-900">
                  {details.driverName || 'Assigned Driver'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Contact Number</span>
                <span className="font-mono text-slate-800">
                  {details.driverPhone || details.phone || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContainerSearchTab;