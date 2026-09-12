import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2, MapPin, Truck, X } from 'lucide-react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import api from '../api';

const DEFAULT_MAP_CENTER = [7.8731, 80.7718];
const DEFAULT_MARKER_ICON = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const START_ICON = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DEFAULT_MARKER_ICON;

function getRouteCoordinates(trip) {
  const geometry = trip?.routeCoordinatesJson ?? trip?.routeJson ?? trip?.routeGeometry ?? trip?.geometry;
  if (!geometry) return [];

  try {
    const parsed = typeof geometry === 'string' ? JSON.parse(geometry) : geometry;
    const coordinates = parsed?.routes?.[0]?.geometry?.coordinates
      ?? parsed?.geometry?.coordinates
      ?? parsed?.coordinates
      ?? parsed;
    const usesLongitudeFirst = Boolean(
      parsed?.routes?.[0]?.geometry?.coordinates
      || parsed?.geometry?.type === 'LineString'
      || parsed?.type === 'LineString'
    );

    if (!Array.isArray(coordinates)) return [];
    return coordinates
      .map((coordinate) => {
        if (!Array.isArray(coordinate) || coordinate.length < 2) return null;
        const [first, second] = coordinate;
        const firstNumber = Number(first);
        const secondNumber = Number(second);
        return Number.isFinite(firstNumber) && Number.isFinite(secondNumber)
          ? [firstNumber, secondNumber]
          : null;
      })
      .filter(Boolean)
      .map(([first, second]) => (usesLongitudeFirst ? [second, first] : [first, second]));
  } catch (error) {
    console.error('Unable to parse active trip route:', error);
    return [];
  }
}

function getTrackingCoordinates(responseData) {
  const data = responseData?.data ?? responseData;
  const locations = Array.isArray(data)
    ? data
    : data?.locations ?? data?.coordinates ?? data?.path ?? data?.track ?? [];

  if (!Array.isArray(locations)) return [];
  return locations.map((location) => {
    if (Array.isArray(location)) {
      const [first, second] = location;
      return [Number(first), Number(second)];
    }

    const latitude = Number(location?.latitude ?? location?.lat);
    const longitude = Number(location?.longitude ?? location?.lng ?? location?.lon);
    return [latitude, longitude];
  }).filter(([latitude, longitude]) => (
    Number.isFinite(latitude) && Number.isFinite(longitude)
  ));
}

function FitRoute({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length > 1) map.fitBounds(coordinates, { padding: [24, 24] });
  }, [coordinates, map]);

  return null;
}

function DriverDashboard() {
  const [trip, setTrip] = useState(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [plannedRoute, setPlannedRoute] = useState([]);
  const [actualCoordinates, setActualCoordinates] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueMessage, setIssueMessage] = useState('');

  const mapCoordinates = useMemo(() => [...plannedRoute, ...actualCoordinates], [plannedRoute, actualCoordinates]);
  const status = String(trip?.status || 'ASSIGNED').toUpperCase();
  const tripId = trip?.id ?? trip?.tripId;

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timeoutId);
  }, [toast]);

  const fetchTripByVehicle = useCallback(async (requestedVehicleNumber) => {
    const vehicleNo = requestedVehicleNumber.trim().toUpperCase();
    if (!vehicleNo) {
      setTrip(null);
      setPlannedRoute([]);
      setActualCoordinates([]);
      setError('Enter a vehicle number to load its active route.');
      return false;
    }

    setIsSearching(true);
    setTrip(null);
    setPlannedRoute([]);
    setActualCoordinates([]);
    setError('');
    try {
      const response = await api.get(`/api/trips/vehicle/${encodeURIComponent(vehicleNo)}/active`);
      const data = response.data?.data ?? response.data;
      const loadedTrip = Array.isArray(data) ? data[0] || null : data || null;
      if (!loadedTrip) {
        setError('No active trip was found for this vehicle.');
        return false;
      }
      const loadedRoute = getRouteCoordinates(loadedTrip);
      setPlannedRoute(loadedRoute);
      localStorage.setItem('vehicleNumber', vehicleNo);
      setVehicleNumber(vehicleNo);
      setTrip(loadedTrip);
      setToast('Active trip loaded successfully.');
      return true;
    } catch (requestError) {
      setError(requestError.response?.status === 404
        ? 'No active trip was found for this vehicle.'
        : 'Unable to load the active trip for this vehicle.');
      return false;
    } finally {
      setIsSearching(false);
    }
  }, []);

  const searchVehicleTrip = async (event) => {
    event.preventDefault();
    await fetchTripByVehicle(vehicleNumber);
  };

  useEffect(() => {
    const savedVehicleNumber = localStorage.getItem('vehicleNumber');
    if (savedVehicleNumber) fetchTripByVehicle(savedVehicleNumber);
  }, [fetchTripByVehicle]);

  const fetchActualPath = useCallback(async () => {
    if (!tripId) return;
    try {
      const response = await api.get(`/api/monitoring/trip/${tripId}/locations`);
      console.log('Fetched Map Data:', response.data);
      setActualCoordinates(getTrackingCoordinates(response.data));
    } catch (requestError) {
      setActualCoordinates([]);
      console.error('Unable to load actual trip locations:', requestError);
    }
  }, [tripId]);

  useEffect(() => {
    setActualCoordinates([]);
    if (!tripId || status !== 'ACTIVE') return undefined;

    fetchActualPath();
    const intervalId = setInterval(fetchActualPath, 5000);
    return () => clearInterval(intervalId);
  }, [fetchActualPath, status, tripId]);

  const updateTripStatus = async (nextStatus) => {
    if (!tripId) return;
    setAction(nextStatus);
    setError('');
    try {
      const response = await api.put(`/api/trips/${tripId}/status`, { status: nextStatus });
      const updatedTrip = response.data?.data ?? response.data;
      setTrip((currentTrip) => ({ ...currentTrip, ...(updatedTrip || {}), status: nextStatus }));
      setToast(`Trip ${nextStatus === 'ACTIVE' ? 'started' : 'ended'} successfully.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Unable to change trip status to ${nextStatus}.`);
    } finally {
      setAction('');
    }
  };

  const submitIssue = async (event) => {
    event.preventDefault();
    const message = issueMessage.trim();
    if (!message) return;

    setAction('REPORT');
    try {
      await api.post('/api/alerts/driver-report', { tripId, message });
      setIssueMessage('');
      setIsIssueModalOpen(false);
      setToast('Your report was sent successfully.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to send your report.');
    } finally {
      setAction('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Driver Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500">Your assigned trip and route status.</p>
        </div>
      </div>

      {toast && <div role="status" className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700"><CheckCircle size={17} />{toast}</div>}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <section className="overflow-hidden rounded-xl bg-white shadow-sm" aria-label="Vehicle route search and map">
        <form onSubmit={searchVehicleTrip} className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="driver-vehicle-number" className="block text-sm font-medium text-slate-700">Vehicle Number</label>
            <input id="driver-vehicle-number" type="search" value={vehicleNumber} onChange={(event) => setVehicleNumber(event.target.value)} placeholder="Enter vehicle number" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0B3A5A] focus:ring-2 focus:ring-[#0B3A5A]/15" />
          </div>
          <button type="submit" disabled={isSearching} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B3A5A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#092f49] disabled:cursor-wait disabled:opacity-60">
            {isSearching && <Loader2 className="animate-spin" size={17} />}
            {isSearching ? 'Loading...' : 'Search / Load Route'}
          </button>
        </form>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><h3 className="font-semibold text-slate-900">Planned Route</h3><span className="text-xs text-slate-500">Google Maps</span></div>
        <div className="w-full" style={{ height: '500px' }}>
          <MapContainer center={DEFAULT_MAP_CENTER} zoom={7} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution="&copy; Google Maps" url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" />
            <FitRoute coordinates={mapCoordinates} />
            {plannedRoute.length > 0 && <Polyline positions={plannedRoute} pathOptions={{ color: '#2563eb', weight: 5 }} />}
            {actualCoordinates.length > 0 && <Polyline positions={actualCoordinates} pathOptions={{ color: 'red', weight: 5 }} />}
            {actualCoordinates.length > 0 && (
              <>
                <Marker position={actualCoordinates[0]} icon={START_ICON}>
                  <Popup>Start Location</Popup>
                </Marker>
                <Marker position={actualCoordinates[actualCoordinates.length - 1]}>
                  <Popup>Current Location</Popup>
                </Marker>
              </>
            )}
          </MapContainer>
        </div>
      </section>

      {trip && (
        <>
          <section className="rounded-xl bg-white p-5 shadow-sm" aria-labelledby="trip-status-heading">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">Current trip status</p>
                <h3 id="trip-status-heading" className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
                  <span className={`h-3 w-3 rounded-full ${status === 'ACTIVE' ? 'bg-green-500' : status === 'COMPLETED' ? 'bg-slate-400' : 'bg-amber-500'}`} />
                  {status}
                </h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setIsIssueModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"><AlertTriangle size={17} />Report Issue / Emergency</button>
                {status !== 'ACTIVE' && status !== 'COMPLETED' && <button type="button" disabled={Boolean(action)} onClick={() => updateTripStatus('ACTIVE')} className="rounded-lg bg-[#0B3A5A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#092f49] disabled:opacity-60">{action === 'ACTIVE' ? 'Starting...' : 'Start Trip'}</button>}
                {status === 'ACTIVE' && <button type="button" disabled={Boolean(action)} onClick={() => updateTripStatus('COMPLETED')} className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-60">{action === 'COMPLETED' ? 'Ending...' : 'End Trip'}</button>}
              </div>
            </div>
            <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
              <div className="flex items-center gap-2 text-slate-600"><Truck size={17} /><span>{trip.vehicleNumber || trip.vehicleNo || trip.truckNumber || 'Vehicle not specified'}</span></div>
              <div className="flex items-center gap-2 text-slate-600"><MapPin size={17} /><span>{trip.routeName || trip.route || `${trip.startLocation || 'Origin'} to ${trip.endLocation || 'Destination'}`}</span></div>
              <div className="text-slate-500">Trip ID: <span className="font-medium text-slate-700">{tripId || 'N/A'}</span></div>
            </div>
          </section>

        </>
      )}

      {isIssueModalOpen && <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="issue-modal-heading">
        <form onSubmit={submitIssue} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
          <div className="flex items-center justify-between"><h3 id="issue-modal-heading" className="text-lg font-bold text-slate-900">Report Issue / Emergency</h3><button type="button" onClick={() => setIsIssueModalOpen(false)} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close report dialog"><X size={19} /></button></div>
          <label htmlFor="driver-issue-message" className="mt-4 block text-sm font-medium text-slate-700">Message</label>
          <textarea id="driver-issue-message" required rows="5" value={issueMessage} onChange={(event) => setIssueMessage(event.target.value)} placeholder="Describe the issue or emergency" className="mt-2 w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" />
          <div className="mt-4 flex justify-end gap-3"><button type="button" onClick={() => setIsIssueModalOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button><button type="submit" disabled={action === 'REPORT'} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{action === 'REPORT' ? 'Sending...' : 'Send Report'}</button></div>
        </form>
      </div>}
    </div>
  );
}

export default DriverDashboard;