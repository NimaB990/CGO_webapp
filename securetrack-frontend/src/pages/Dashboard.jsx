import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Truck, Activity } from 'lucide-react';
import LiveMap from '../components/LiveMap';
import AssignRouteModal from '../components/AssignRouteModal';
import api from '../api'; 

const ALERT_TONE_CLASSES = {
  red: 'border-l-4 border-red-400 bg-red-50',
  yellow: 'border-l-4 border-amber-400 bg-amber-50',
};

function Dashboard() {
  const role = localStorage.getItem('role') || 'OWNER';
  const isGlobalRole = role === 'ADMIN' || role === 'CUSTOM_OFFICER';
  const [containerNumber, setContainerNumber] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [activeContainerId, setActiveContainerId] = useState(null);
  const [trackedContainer, setTrackedContainer] = useState(null);
  const [containerAlerts, setContainerAlerts] = useState([]);
  const [isAlertsLoading, setIsAlertsLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [activeContainers, setActiveContainers] = useState([]);
  const [globalAlerts, setGlobalAlerts] = useState([]);
  const [isGlobalAlertsLoading, setIsGlobalAlertsLoading] = useState(false);
  const trackingIntervalRef = useRef(null);

  useEffect(() => () => {
    if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
  }, []);

  useEffect(() => {
    if (!isGlobalRole) return undefined;

    const fetchGlobalAlerts = async () => {
      setIsGlobalAlertsLoading(true);
      try {
        const response = await api.get('/api/alerts');
        const alerts = response.data?.data || response.data;
        setGlobalAlerts(Array.isArray(alerts) ? alerts : []);
      } catch (error) {
        console.error('Failed to fetch global alerts:', error);
        setGlobalAlerts([]);
      } finally {
        setIsGlobalAlertsLoading(false);
      }
    };

    fetchGlobalAlerts();
    return undefined;
  }, [isGlobalRole]);

  const fetchTrackedContainer = async (containerNo) => {
    const response = await api.get(`/api/dashboard/track/${encodeURIComponent(containerNo)}`);
    const data = response.data?.data || response.data;
    const location = data.location || data.gps || data.latestLocation || data;

    return {
      ...data,
      latitude: Number(data.latitude ?? data.lat ?? location.latitude ?? location.lat),
      longitude: Number(data.longitude ?? data.lng ?? data.lon ?? location.longitude ?? location.lng ?? location.lon),
    };
  };

  const fetchContainerAlerts = async (containerNo) => {
    setIsAlertsLoading(true);
    try {
      const response = await api.get(`/api/alerts/container/${encodeURIComponent(containerNo)}`);
      const alerts = response.data?.data || response.data;
      setContainerAlerts(Array.isArray(alerts) ? alerts : []);
    } catch (error) {
      console.error('Failed to fetch container alerts:', error);
      setContainerAlerts([]);
    } finally {
      setIsAlertsLoading(false);
    }
  };

  const handleTrackContainer = async (event) => {
    event.preventDefault();
    const containerNo = containerNumber.trim();
    if (!containerNo) {
      setHasSearched(false);
      setActiveContainerId(null);
      setTrackedContainer(null);
      setTrackingError('Enter a valid Container ID.');
      return;
    }

    if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    trackingIntervalRef.current = null;
    setHasSearched(false);
    setActiveContainerId(null);
    setTrackedContainer(null);
    setTrackingError('');
    setIsTracking(true);
    setContainerAlerts([]);

    const pollTrackingData = async () => {
      try {
        const trackedData = await fetchTrackedContainer(containerNo);
        if (!Number.isFinite(trackedData.latitude) || !Number.isFinite(trackedData.longitude)) {
          throw new Error('Tracking response did not include valid GPS coordinates.');
        }
        setTrackedContainer(trackedData);
        setTrackingError('');
        return trackedData;
      } catch (error) {
        console.error('Failed to track container:', error);
        setHasSearched(false);
        setTrackedContainer(null);
        setTrackingError(error.response?.status === 404
          ? 'Active trip not found for this Container ID.'
          : 'Unable to find live tracking data for this Container ID.');
        return null;
      }
    };

    try {
      const initialTrackingData = await pollTrackingData();
      if (!initialTrackingData) return;
      setActiveContainerId(containerNo);
      setHasSearched(true);
      await fetchContainerAlerts(containerNo);
      trackingIntervalRef.current = setInterval(pollTrackingData, 10000);
    } catch (error) {
      console.error('Failed to track container:', error);
      if (error.response?.status === 404) {
        setTrackingError('Active trip not found for this Container ID.');
      } else {
        setTrackingError('Unable to find live tracking data for this Container ID.');
      }
    } finally {
      setIsTracking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500">Monitor active container routes and alerts.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {role === 'OWNER' && <form onSubmit={handleTrackContainer} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="tracking-container-number" className="sr-only">Container ID</label>
            <input
              id="tracking-container-number"
              type="search"
              value={containerNumber}
              onChange={(event) => setContainerNumber(event.target.value)}
              placeholder="Container ID"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15 sm:w-48"
            />
            <button type="submit" disabled={isTracking && !trackingError} className="flex items-center justify-center gap-2 rounded-lg bg-[#0B3A5A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#092f49] disabled:cursor-wait disabled:opacity-70">
              <Search size={16} />
              {isTracking && !trackingError ? 'Tracking...' : 'Track Container'}
            </button>
        </form>}
        </div>
      </div>

      {trackingError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{trackingError}</p>
      )}

      {role === 'OWNER' && !hasSearched && !trackingError && (
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Please enter a Container ID to view live tracking and alerts.
        </p>
      )}

      {isGlobalRole && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ['Active Containers', activeContainers.length, Truck],
            ['Active Alerts', globalAlerts.length, Activity],
            ['Monitored Routes', new Set(activeContainers.map((container) => container.route || container.routeName)).size, MapPin],
          ].map(([label, value, Icon]) => (
            <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Icon size={15} />{label}</div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {hasSearched && activeContainerId && trackedContainer && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ['Vehicle Number', trackedContainer.vehicleNumber || trackedContainer.vehicleNo || trackedContainer.truckNumber || trackedContainer.truckNo || 'N/A', Truck],
            ['Route', trackedContainer.route || trackedContainer.routeName || trackedContainer.assignedRoute || 'N/A', MapPin],
            ['Status', trackedContainer.status || 'Unknown', Activity],
          ].map(([label, value, Icon]) => (
            <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Icon size={15} />{label}</div>
              <p className="mt-2 break-words text-sm font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {(
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ---- Left: map ---- */}
        <div className="relative overflow-hidden rounded-xl bg-white shadow-sm lg:col-span-2">
          <div className="absolute right-4 top-4 z-[500] rounded-lg bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
            <p className="text-sm font-semibold text-slate-900">Sri Lanka – Live Tracking</p>
            <p className="text-xs text-slate-400">Updated just now</p>
          </div>
          
          {/* අලුත් Live Map Component එක පමණි (පරණ සිතියම ඉවත් කර ඇත) */}
          <div className="h-[420px] w-full lg:h-[500px]">
            <LiveMap
              trackedContainer={trackedContainer}
              showActiveContainers={isGlobalRole}
              onActiveContainersChange={setActiveContainers}
            />
          </div>

          <div className="absolute bottom-4 left-4 z-[500] rounded-lg bg-white/95 px-4 py-3 text-sm shadow-sm backdrop-blur">
            <p className="mb-2 font-semibold text-slate-900">Status</p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Active
              </li>
              <li className="flex items-center gap-2 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Alert
              </li>
              <li className="flex items-center gap-2 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Completed
              </li>
            </ul>
          </div>
        </div>

        {isGlobalRole && (
          <div className="lg:col-span-1">
            <AssignRouteModal onAssignSuccess={() => undefined} />
          </div>
        )}

      </div>
      )}

    </div>
  );
}

export default Dashboard;