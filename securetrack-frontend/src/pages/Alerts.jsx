import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, MapPin, Clock, Truck, X } from 'lucide-react';
import api from '../api'; 


function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const PRIORITY_FILTERS = ['All', 'High', 'Medium'];
const STATUS_FILTERS = ['All', 'Active', 'Investigating', 'Resolved'];

const PRIORITY_STYLES = {
  High: { border: 'border-l-4 border-red-400', badge: 'bg-red-50 text-red-600', icon: 'bg-red-50 text-red-500' },
  Medium: { border: 'border-l-4 border-amber-400', badge: 'bg-amber-50 text-amber-600', icon: 'bg-amber-50 text-amber-500' },
  Low: { border: 'border-l-4 border-blue-400', badge: 'bg-blue-50 text-blue-600', icon: 'bg-blue-50 text-blue-500' },
};

function FilterPillGroup({ label, options, active, onChange }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active === option ? 'bg-[#0B3A5A] text-white' : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

    </div>
  );
}

const getUIStatus = (dbStatus) => {
  if (dbStatus === 'PENDING') return 'Active';
  if (dbStatus === 'ACKNOWLEDGED') return 'Investigating';
  if (dbStatus === 'RESOLVED') return 'Resolved';
  return 'Active';
};

const formatEnum = (str) => {
  if (!str) return 'System Alert';
  return str.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

function Alerts() {
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  
  const [userRole, setUserRole] = useState('UNKNOWN');
  const [investigationAlert, setInvestigationAlert] = useState(null);
  const [investigationDescription, setInvestigationDescription] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState(
    () => localStorage.getItem('ownerVehicleNumber') || ''
  );
  const [vehicleAlerts, setVehicleAlerts] = useState([]);
  const [vehicleAlertsLoading, setVehicleAlertsLoading] = useState(false);

  
  const fetchAlerts = async () => {
    try {
      const response = await api.get('/api/alerts');
      const sortedAlerts = response.data.sort((a, b) => new Date(b.sentAt || b.createdAt || b.timestamp) - new Date(a.sentAt || a.createdAt || a.timestamp));
      setAlerts(sortedAlerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = parseJwt(token);
      if (decoded && decoded.role) {
        setUserRole(decoded.role);
        if (decoded.role === 'OWNER' && vehicleNumber.trim()) {
          fetchVehicleAlerts();
        }
      }
    }
    fetchAlerts();
  }, []);

  
  const handleInvestigate = (alert) => {
    setInvestigationAlert(alert);
    setInvestigationDescription('');
  };

  const submitInvestigation = async () => {
    try {
      const response = await api.post(
        `/api/alerts/${investigationAlert.alertId || investigationAlert.id}/investigate`,
        { description: investigationDescription }
      );
      const updated = response.data;
      setAlerts((current) => current.map((alert) =>
        (alert.alertId || alert.id) === (investigationAlert.alertId || investigationAlert.id)
          ? { ...alert, ...updated, status: 'ACKNOWLEDGED' }
          : alert
      ));
      setInvestigationAlert(null);
    } catch (error) {
      console.error('Failed to submit investigation:', error);
      window.alert('Failed to submit investigation. Please try again.');
    }
  };

  const fetchVehicleAlerts = async (event) => {
    if (event) event.preventDefault();
    const normalizedVehicleNumber = vehicleNumber.trim();
    if (!normalizedVehicleNumber) return;
    setVehicleAlertsLoading(true);
    try {
      const response = await api.get(
        `/api/alerts/vehicle/${encodeURIComponent(normalizedVehicleNumber)}`
      );
      const alertsData = response.data?.data || response.data;
      setVehicleAlerts(Array.isArray(alertsData) ? alertsData : []);
      localStorage.setItem('ownerVehicleNumber', normalizedVehicleNumber);
    } catch (error) {
      console.error('Failed to fetch vehicle alerts:', error);
      setVehicleAlerts([]);
    } finally {
      setVehicleAlertsLoading(false);
    }
  };

  
  const handleDismiss = async (alertId) => {
    try {
      
      await api.put(`/api/alerts/${alertId}/resolve`);
      
      
      setAlerts(alerts.map(a => 
        (a.alertId === alertId || a.id === alertId) ? { ...a, status: 'RESOLVED' } : a
      ));
    } catch (error) {
      console.error("Failed to dismiss alert:", error);
      alert("Failed to dismiss alert. Please try again.");
    }
  };

  const alertsForView = userRole === 'OWNER' ? vehicleAlerts : alerts;

  const filteredAlerts = useMemo(() => {
    return alertsForView.filter((alert) => {
      const defaultPriority = alert.type === 'ROUTE_DEVIATION' ? 'High' : 'Medium';
      const uiPriority = alert.severity ? formatEnum(alert.severity) : defaultPriority;
      const uiStatus = getUIStatus(alert.status);

      const matchesPriority = priorityFilter === 'All' || uiPriority === priorityFilter;
      const matchesStatus = statusFilter === 'All' || uiStatus === statusFilter;
      return matchesPriority && matchesStatus;
    });
  }, [alertsForView, priorityFilter, statusFilter]);

  const summary = useMemo(
    () => ({
      total: alertsForView.length,
      high: alertsForView.filter((a) => (a.severity === 'HIGH' || a.type === 'ROUTE_DEVIATION')).length,
      investigating: alertsForView.filter((a) => a.status === 'ACKNOWLEDGED').length,
      resolvedToday: alertsForView.filter((a) => a.status === 'RESOLVED').length,
    }),
    [alertsForView]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Alerts &amp; Notifications</h2>
        <p className="mt-1 text-sm text-slate-500">Real-time security alerts and system notifications</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-5 text-center shadow-sm">
          <p className="text-3xl font-bold text-slate-900">{summary.total}</p>
          <p className="mt-1 text-sm text-slate-500">Total Alerts</p>
        </div>
        <div className="rounded-xl bg-white p-5 text-center shadow-sm">
          <p className="text-3xl font-bold text-red-500">{summary.high}</p>
          <p className="mt-1 text-sm text-slate-500">High Priority</p>
        </div>
        <div className="rounded-xl bg-white p-5 text-center shadow-sm">
          <p className="text-3xl font-bold text-amber-500">{summary.investigating}</p>
          <p className="mt-1 text-sm text-slate-500">Under Investigation</p>
        </div>
        <div className="rounded-xl bg-white p-5 text-center shadow-sm">
          <p className="text-3xl font-bold text-green-600">{summary.resolvedToday}</p>
          <p className="mt-1 text-sm text-slate-500">Resolved</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2">
        {userRole === 'OWNER' && (
          <section className="rounded-xl border border-slate-100 p-4 sm:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <Truck size={18} className="text-[#0B3A5A]" />
              <h3 className="font-semibold text-slate-900">Alerts by Vehicle</h3>
            </div>
            <form onSubmit={fetchVehicleAlerts} className="flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                value={vehicleNumber}
                onChange={(event) => setVehicleNumber(event.target.value)}
                placeholder="Enter Vehicle Number"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-lg bg-[#0B3A5A] px-4 py-2 text-sm font-medium text-white">
                Search Alerts
              </button>
            </form>
            {vehicleAlertsLoading && <p className="mt-2 text-sm text-slate-500">Loading vehicle alerts...</p>}
          </section>
        )}
        <FilterPillGroup label="Filter by Priority" options={PRIORITY_FILTERS} active={priorityFilter} onChange={setPriorityFilter} />
        <FilterPillGroup label="Filter by Status" options={STATUS_FILTERS} active={statusFilter} onChange={setStatusFilter} />
      </div>

      <div className="space-y-4">
        {isLoading && (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Loading alerts...
          </div>
        )}

        {!isLoading && filteredAlerts.length === 0 && (
          <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            No alerts found in this category.
          </div>
        )}

        {!isLoading && filteredAlerts.map((alert) => {
          const alertId = alert.alertId || alert.id;
          const defaultPriority = alert.type === 'ROUTE_DEVIATION' ? 'High' : 'Medium';
          const uiPriority = alert.severity ? formatEnum(alert.severity) : defaultPriority;
          const styles = PRIORITY_STYLES[uiPriority] || PRIORITY_STYLES.Medium;
          const alertTitle = formatEnum(alert.type || alert.alertType);
          const alertDate = alert.sentAt || alert.createdAt || alert.timestamp || alert.date;
          const timeString = alertDate ? new Date(alertDate).toLocaleString() : new Date().toLocaleString();
          const containerIdentifier = alert.container?.containerId || alert.container?.id || alert.containerId || 'Unknown Container';
          
          const isResolved = alert.status === 'RESOLVED';
          const isInvestigating = alert.status === 'ACKNOWLEDGED';

          return (
            <div key={alertId} className={`rounded-xl bg-white p-5 shadow-sm ${styles.border} ${isResolved ? 'opacity-70' : ''}`}>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="flex gap-3">
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${styles.icon}`}>
                    <AlertTriangle size={18} />
                  </span>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {alertTitle} 
                        {isResolved && <span className="ml-2 text-sm text-green-600">(Resolved)</span>}
                        {isInvestigating && <span className="ml-2 text-sm text-amber-500">(Investigating)</span>}
                      </h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles.badge}`}>
                        {uiPriority.toUpperCase()} PRIORITY
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{alert.message || 'No details provided.'}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={13} /> {alert.gpsLocation || 'Location unavailable'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} /> {timeString}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
                      <span>
                        Container ID: <span className="font-medium text-slate-900">#{containerIdentifier}</span>
                      </span>
                      <span>
                        Vehicle Number: <span className="font-medium text-slate-900">{alert.vehicleNumber || alert.vehicleNo || 'N/A'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                
                {!isResolved && userRole === 'CUSTOM_OFFICER' && (
                  <div className="flex flex-shrink-0 gap-2 sm:flex-col">
                    {!isInvestigating && (
                      <button
                        type="button"
                        onClick={() => handleInvestigate(alert)}
                        className="rounded-lg bg-[#0B3A5A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0a2f4a]"
                      >
                        Investigate
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDismiss(alertId)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-gray-50"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {investigationAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Investigation Notes / Remarks</h3>
              <button type="button" onClick={() => setInvestigationAlert(null)} aria-label="Close investigation modal">
                <X size={20} />
              </button>
            </div>
            <textarea
              value={investigationDescription}
              onChange={(event) => setInvestigationDescription(event.target.value)}
              rows={5}
              placeholder="Enter investigation notes"
              className="w-full rounded-lg border border-gray-300 p-3 text-sm"
            />
            <button
              type="button"
              onClick={submitInvestigation}
              disabled={!investigationDescription.trim()}
              className="mt-4 rounded-lg bg-[#0B3A5A] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Submit Investigation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Alerts;