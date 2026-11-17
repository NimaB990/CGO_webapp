import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import api from '../api';
import { formatUserDateTime } from '../userPreferences';

const normalizeVehicle = (value) => String(value || '').trim().toUpperCase();

export default function DriverVehicleAlerts({ vehicleNumber }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const vehicle = normalizeVehicle(vehicleNumber);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    setAlerts([]);
    setError('');
    setLoading(Boolean(vehicle));
    if (!vehicle) return undefined;

    const fetchAlerts = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        // The general alerts endpoint allows DRIVER; the vehicle endpoint does not.
        const response = await api.get('/api/alerts');
        const data = response.data?.data ?? response.data;
        if (!Array.isArray(data)) throw new Error('Invalid alerts response');
        const matching = data.filter((alert) => normalizeVehicle(alert.vehicleNumber) === vehicle)
          .sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0));
        if (!cancelled) {
          setAlerts(matching);
          setError('');
        }
      } catch (requestError) {
        if (!cancelled) {
          setAlerts([]);
          setError('Unable to load vehicle alerts. Retrying automatically.');
        }
      } finally {
        inFlight = false;
        if (!cancelled) setLoading(false);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [vehicle]);

  return (
    <section aria-label="Vehicle alerts" className="rounded-xl bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900"><AlertTriangle size={18} />Vehicle Alerts{vehicle ? ` — ${vehicle}` : ''}</h3>
      <p className="mt-1 text-sm text-slate-500">Alerts for the searched vehicle only. Updates every 10 seconds.</p>
      {!vehicle ? <p className="mt-4 text-sm text-slate-500">Search a vehicle number to view its alerts.</p>
        : loading ? <p role="status" className="mt-4 text-sm text-slate-500">Loading vehicle alerts...</p>
          : error ? <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>
            : alerts.length === 0 ? <p className="mt-4 text-sm text-slate-500">No alerts found for this vehicle.</p>
              : <ul className="mt-4 space-y-3">{alerts.map((alert, index) => (
                <li key={alert.alertId ?? alert.id ?? index} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{String(alert.type || 'Vehicle alert').replace(/_/g, ' ')}</span>
                    <span className="text-xs font-medium text-slate-600">{alert.severity || 'MEDIUM'} · {alert.status || 'PENDING'}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{alert.message}</p>
                  {alert.sentAt && <p className="mt-2 text-xs text-slate-500">{formatUserDateTime(alert.sentAt)}</p>}
                </li>
              ))}</ul>}
    </section>
  );
}
