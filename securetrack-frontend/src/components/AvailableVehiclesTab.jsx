import React, { useState, useEffect } from 'react';
import { Truck, RefreshCw, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../api';

const AvailableVehiclesTab = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/vehicles/available');
      if (Array.isArray(response.data)) {
        setVehicles(response.data);
      } else {
        setVehicles([]);
      }
    } catch (err) {
      console.error('Error fetching available vehicles:', err);
      setError('Available vehicles could not be loaded. Please try again later.');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const safeList = Array.isArray(vehicles) ? vehicles : [];
  const filteredVehicles = safeList.filter((v) =>
    (v.vehicleNo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Truck className="text-emerald-600" size={26} />
            Available Vehicles
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            
          </p>
        </div>

        <button
          onClick={loadVehicles}
          disabled={loading}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
        <input
          type="text"
          placeholder=" Search by Vehicle No"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            Loading available vehicles...
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            {searchTerm ? 'No vehicles found' : 'No available vehicles at the moment.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">Vehicle Number</th>
                  <th className="py-3.5 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map((item) => (
                  <tr key={item.driverId} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-6 font-mono font-bold text-slate-900 text-base">
                      {item.vehicleNo}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        AVAILABLE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailableVehiclesTab;