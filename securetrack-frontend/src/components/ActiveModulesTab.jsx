import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Cpu, RefreshCw, AlertCircle } from 'lucide-react';

const ActiveModulesTab = () => {
  const [activeModules, setActiveModules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchActiveModules = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8080/api/iot-modules/active', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveModules(response.data);
    } catch (err) {
      console.error('Active modules ලබා ගැනීමේ දෝෂයකි:', err);
      setError('Active devices ලබා ගැනීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveModules();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header කොටස */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Cpu className="text-sky-600" size={26} />
            Active IoT Devices
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            දැනට Active තත්වයේ පවතින සියලුම IoT උපාංග ලැයිස්තුව
          </p>
        </div>

        <button
          onClick={fetchActiveModules}
          disabled={loading}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          නැවත පූරණය කරන්න
        </button>
      </div>

      {/* දෝෂ පණිවිඩය */}
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-sm">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Active Modules Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            උපාංග පූරණය වෙමින් පවතී...
          </div>
        ) : activeModules.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            Active තත්වයේ පවතින උපාංග කිසිවක් හමු නොවීය.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-6">Module ID</th>
                  <th className="py-3.5 px-6">Device UID</th>
                  <th className="py-3.5 px-6">තත්වය</th>
                  <th className="py-3.5 px-6">සම්බන්ධතාවය</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeModules.map((item) => (
                  <tr key={item.moduleId} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-6 font-semibold text-slate-700">
                      #{item.moduleId}
                    </td>
                    <td className="py-4 px-6 font-mono font-medium text-slate-900">
                      {item.deviceUid}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500">
                      Live (Active)
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

export default ActiveModulesTab;