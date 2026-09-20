// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { Search, MapPin, Truck, Activity } from 'lucide-react';
// import LiveMap from '../components/LiveMap';
// import api from '../api'; 

// const ALERT_TONE_CLASSES = {
//   red: 'border-l-4 border-red-400 bg-red-50',
//   yellow: 'border-l-4 border-amber-400 bg-amber-50',
// };

// function getPlannedRouteCoordinates(trip) {
//   const routeData = trip?.routeCoordinatesJson ?? trip?.routeJson ?? trip?.routeGeometry ?? trip?.geometry;
//   if (!routeData) return [];

//   try {
//     const parsed = typeof routeData === 'string' ? JSON.parse(routeData) : routeData;
//     const coordinates = parsed?.routes?.[0]?.geometry?.coordinates
//       ?? parsed?.geometry?.coordinates
//       ?? parsed?.coordinates
//       ?? parsed;
//     const usesLongitudeFirst = Boolean(
//       parsed?.routes?.[0]?.geometry?.coordinates
//       || parsed?.geometry?.type === 'LineString'
//       || parsed?.type === 'LineString'
//     );

//     if (!Array.isArray(coordinates)) return [];
//     return coordinates.map((coordinate) => {
//       if (!Array.isArray(coordinate) || coordinate.length < 2) return null;
//       const first = Number(coordinate[0]);
//       const second = Number(coordinate[1]);
//       if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
//       return usesLongitudeFirst ? [second, first] : [first, second];
//     }).filter(Boolean);
//   } catch (error) {
//     console.error('Unable to parse planned vehicle route:', error);
//     return [];
//   }
// }

// function OwnerDashboard() {
//   const [vehicleSearch, setVehicleSearch] = useState('');
//   const [hasSearched, setHasSearched] = useState(false);
//   const [activeTrip, setActiveTrip] = useState(null);
//   const [plannedRoute, setPlannedRoute] = useState([]);
//   const [actualPath, setActualPath] = useState([]);
//   const [trackedContainer, setTrackedContainer] = useState(null);
//   const [alerts, setAlerts] = useState([]);
//   const [isAlertsLoading, setIsAlertsLoading] = useState(false);
//   const [trackingError, setTrackingError] = useState('');
//   const [isTracking, setIsTracking] = useState(false);
//   const trackingIntervalRef = useRef(null);

//   useEffect(() => () => {
//     if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
//   }, []);

//   const fetchTripAlerts = useCallback(async (tripId) => {
//     setIsAlertsLoading(true);
//     try {
//       const response = await api.get(`/api/alerts/trip/${encodeURIComponent(tripId)}`);
//       const alertsData = response.data?.data || response.data;
//       setAlerts(Array.isArray(alertsData) ? alertsData : []);
//     } catch (error) {
//       console.error('Failed to fetch trip alerts:', error);
//       setAlerts([]);
//     } finally {
//       setIsAlertsLoading(false);
//     }
//   }, []);

//   const fetchTripByVehicle = useCallback(async (requestedVehicle) => {
//     const queryVehicle = requestedVehicle.trim().toUpperCase();
//     if (!queryVehicle) {
//       setHasSearched(false);
//       setActiveTrip(null);
//       setPlannedRoute([]);
//       setTrackedContainer(null);
//       setActualPath([]);
//       setAlerts([]);
//       setTrackingError('Enter a valid Vehicle Number.');
//       return;
//     }

//     if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
//     trackingIntervalRef.current = null;
//     setHasSearched(false);
//     setActiveTrip(null);
//     setPlannedRoute([]);
//     setTrackedContainer(null);
//     setActualPath([]);
//     setTrackingError('');
//     setIsTracking(true);
//     setAlerts([]);

//     try {
//       const response = await api.get(`/api/trips/vehicle/${encodeURIComponent(queryVehicle)}/active`, {
//         skipAuthRedirect: true,
//       });
//       const data = response.data?.data || response.data;
//       const trip = Array.isArray(data) ? data[0] : data;
//       if (!trip) throw new Error('No active trip found');
//       const tripId = trip.id ?? trip.tripId;
//       if (!tripId) throw new Error('Loaded trip did not include an ID');
//       localStorage.setItem('ownerVehicleNumber', queryVehicle);
//       setPlannedRoute(getPlannedRouteCoordinates(trip));
//       setActiveTrip(trip);
//       setHasSearched(true);
//       setVehicleSearch(queryVehicle);
//       await fetchTripAlerts(tripId);
//     } catch (error) {
//       setHasSearched(false);
//       setActiveTrip(null);
//       setTrackingError(error.response?.status === 401 || error.response?.status === 403
//         ? 'You are not authorized to track this vehicle. Please sign in again or contact an administrator.'
//         : error.response?.status === 404
//           ? 'Active trip not found for this Vehicle Number.'
//           : 'Unable to load the active trip for this Vehicle Number.');
//     } finally {
//       setIsTracking(false);
//     }
//   }, [fetchTripAlerts]);

//   const handleTrackVehicle = async (event) => {
//     event.preventDefault();
//     await fetchTripByVehicle(vehicleSearch);
//   };

//   useEffect(() => {
//     const savedVehicleNumber = localStorage.getItem('ownerVehicleNumber');
//     if (savedVehicleNumber) fetchTripByVehicle(savedVehicleNumber);
//   }, [fetchTripByVehicle]);

//   const fetchActualPath = useCallback(async () => {
//     const tripId = activeTrip?.id ?? activeTrip?.tripId;
//     if (!tripId) return;

//     try {
//       const response = await api.get(`/api/monitoring/trip/${tripId}/locations`);
//       const locations = response.data?.data || response.data;
//       const path = (Array.isArray(locations) ? locations : locations?.locations || [])
//         .map((point) => [Number(point.latitude), Number(point.longitude)])
//         .filter(([latitude, longitude]) => Number.isFinite(latitude) && Number.isFinite(longitude));
//       setActualPath(path);
//       if (path.length > 0) {
//         setTrackedContainer((current) => ({
//           ...(current || {}),
//           latitude: path[path.length - 1][0],
//           longitude: path[path.length - 1][1],
//           vehicleNumber: vehicleSearch,
//           status: activeTrip.status,
//         }));
//       }
//     } catch (error) {
//       console.error('Failed to fetch live vehicle data:', error);
//     }
//   }, [activeTrip, vehicleSearch]);

//   useEffect(() => {
//     setActualPath([]);
//     if (!activeTrip || activeTrip.status !== 'ACTIVE') return undefined;

//     fetchActualPath();
//     trackingIntervalRef.current = setInterval(fetchActualPath, 5000);
//     return () => {
//       clearInterval(trackingIntervalRef.current);
//       trackingIntervalRef.current = null;
//     };
//   }, [activeTrip, fetchActualPath]);

//   return (
//     <div className="space-y-6">
//       <div className="flex items-center justify-between gap-4">
//         <div>
//           <h2 className="text-2xl font-bold text-slate-900">Cargo Owner Dashboard</h2>
//           <p className="mt-1 text-sm text-slate-500">Track and monitor your vehicle routes and alerts.</p>
//         </div>
//         <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
//           <form onSubmit={handleTrackVehicle} className="flex flex-col gap-2 sm:flex-row sm:items-center">
//               <label htmlFor="tracking-vehicle-number" className="sr-only">Vehicle Number</label>
//               <input
//                 id="tracking-vehicle-number"
//                 type="search"
//                 value={vehicleSearch}
//                 onChange={(event) => setVehicleSearch(event.target.value)}
//                 placeholder="Enter Vehicle Number"
//                 className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0B3A5A] focus:outline-none focus:ring-2 focus:ring-[#0B3A5A]/15 sm:w-48"
//               />
//               <button type="submit" disabled={isTracking && !trackingError} className="flex items-center justify-center gap-2 rounded-lg bg-[#0B3A5A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#092f49] disabled:cursor-wait disabled:opacity-70">
//                 <Search size={16} />
//                 {isTracking && !trackingError ? 'Tracking...' : 'Track Vehicle'}
//               </button>
//           </form>
//         </div>
//       </div>

//       {trackingError && (
//         <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{trackingError}</p>
//       )}

//       {!hasSearched && !trackingError && (
//         <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
//           Please enter a Vehicle Number to view live tracking and alerts.
//         </p>
//       )}

//       {hasSearched && activeTrip && (
//         <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
//           {[
//             ['Vehicle Number', vehicleSearch, Truck],
//             ['Route', activeTrip.route || activeTrip.routeName || activeTrip.assignedRoute || 'N/A', MapPin],
//             ['Status', activeTrip.status || 'Unknown', Activity],
//           ].map(([label, value, Icon]) => (
//             <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
//               <div className="flex items-center gap-2 text-xs font-medium text-slate-500"><Icon size={15} />{label}</div>
//               <p className="mt-2 break-words text-sm font-semibold text-slate-900">{value}</p>
//             </div>
//           ))}
//         </div>
//       )}

//       {hasSearched && (
//         <section className="rounded-xl bg-white p-5 shadow-sm" aria-labelledby="vehicle-alerts-heading">
//           <div className="flex items-center justify-between gap-3">
//             <h3 id="vehicle-alerts-heading" className="font-semibold text-slate-900">Vehicle Alerts</h3>
//             {isAlertsLoading && <span className="text-xs text-slate-500">Refreshing...</span>}
//           </div>
//           {alerts.length === 0 && !isAlertsLoading && <p className="mt-3 text-sm text-slate-500">No alerts for this vehicle.</p>}
//           <div className="mt-3 space-y-2">
//             {alerts.map((alert) => {
//               const tone = String(alert.severity || alert.priority || '').toUpperCase() === 'HIGH' ? 'red' : 'yellow';
//               return (
//                 <div key={alert.id || alert.alertId || `${alert.createdAt}-${alert.message}`} className={`rounded-lg px-3 py-2 text-sm text-slate-700 ${ALERT_TONE_CLASSES[tone]}`}>
//                   <p className="font-medium">{alert.message || alert.type || 'Vehicle alert'}</p>
//                   {alert.createdAt && <p className="mt-1 text-xs text-slate-500">{new Date(alert.createdAt).toLocaleString()}</p>}
//                 </div>
//               );
//             })}
//           </div>
//         </section>
//       )}

//       <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
//         <div className="relative overflow-hidden rounded-xl bg-white shadow-sm lg:col-span-3">
//           <div className="absolute right-4 top-4 z-[500] rounded-lg bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
//             <p className="text-sm font-semibold text-slate-900">Sri Lanka – Live Tracking</p>
//             <p className="text-xs text-slate-400">Updated just now</p>
//           </div>
          
//           <div className="h-[420px] w-full lg:h-[500px]">
//             <LiveMap
//               trackedContainer={trackedContainer}
//               plannedRoute={plannedRoute}
//               actualPath={actualPath}
//               showActiveContainers={false} // Owner ට අදාළ වාහනය පමණක් පෙන්වීමට මෙය false කර ඇත
//             />
//           </div>

//           <div className="absolute bottom-4 left-4 z-[500] rounded-lg bg-white/95 px-4 py-3 text-sm shadow-sm backdrop-blur">
//             <p className="mb-2 font-semibold text-slate-900">Status</p>
//             <ul className="space-y-1.5">
//               <li className="flex items-center gap-2 text-slate-600">
//                 <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Active
//               </li>
//               <li className="flex items-center gap-2 text-slate-600">
//                 <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Alert
//               </li>
//               <li className="flex items-center gap-2 text-slate-600">
//                 <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Completed
//               </li>
//             </ul>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }

// export default OwnerDashboard;