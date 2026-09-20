import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, LayersControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import api from '../api';

function normalizeId(value) {
  return value === undefined || value === null ? '' : String(value);
}

function getTripContainerId(trip) {
  return trip?.containerId
    ?? trip?.containerNo
    ?? trip?.containerNumber
    ?? trip?.container?.id
    ?? trip?.container?.containerId
    ?? trip?.container?.containerNo;
}

function getTripId(trip) {
  return trip?.id ?? trip?.tripId;
}

function getLocationCoordinates(responseData) {
  const data = responseData?.data ?? responseData;
  const locations = Array.isArray(data)
    ? data
    : data?.locations ?? data?.coordinates ?? data?.path ?? data?.track ?? [];

  if (!Array.isArray(locations)) return [];
  return locations.map((location) => {
    if (Array.isArray(location)) {
      return [Number(location[0]), Number(location[1])];
    }

    return [
      Number(location?.latitude ?? location?.lat),
      Number(location?.longitude ?? location?.lng ?? location?.lon),
    ];
  }).filter(([latitude, longitude]) => (
    Number.isFinite(latitude) && Number.isFinite(longitude)
  ));
}

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function TrackedMarker({ container }) {
  const markerRef = useRef(null);
  const map = useMap();
  const targetLatitude = container.latitude;
  const targetLongitude = container.longitude;
  const targetPosition = [targetLatitude, targetLongitude];

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return undefined;

    const startPosition = marker.getLatLng();
    const startedAt = performance.now();
    const duration = 900;
    let animationFrame;

    const animate = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const latitude = startPosition.lat + ((targetLatitude - startPosition.lat) * progress);
      const longitude = startPosition.lng + ((targetLongitude - startPosition.lng) * progress);
      marker.setLatLng([latitude, longitude]);
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    map.panTo([targetLatitude, targetLongitude], { animate: true, duration: 0.9 });
    return () => cancelAnimationFrame(animationFrame);
  }, [targetLatitude, targetLongitude, map]);

  return (
    <Marker ref={markerRef} position={targetPosition}>
      <Popup>
        <div className="text-sm min-w-[150px]">
          <strong className="text-[#0B3A5A] text-base">Tracked Container</strong>
          <p className="mt-2">{container.status || 'Status unavailable'}</p>
        </div>
      </Popup>
    </Marker>
  );
}

const LiveMap = ({ trackedContainer, showActiveContainers = true, onActiveContainersChange, plannedRoute = [], actualPath = [] }) => {
  
  const defaultPosition = [7.8731, 80.7718]; 
  const sriLankaBounds = [[5.7, 79.4], [10.0, 82.1]];
  const [activeContainers, setActiveContainers] = useState([]);
  
  
  const [plannedRoutes, setPlannedRoutes] = useState({});
  const [traveledPaths, setTraveledPaths] = useState({});
  const [actualPaths, setActualPaths] = useState({});
  const [tripStatuses, setTripStatuses] = useState({});
  const tripStatusesRef = useRef({});
  
  
  const fetchedTrips = useRef(new Set());

  useEffect(() => {
    if (!showActiveContainers) return undefined;

    const fetchLiveLocations = async () => {
      try {
        const response = await api.get('/api/monitoring/live-locations');
        const liveData = Array.isArray(response.data?.data) ? response.data.data : response.data;
        let latestTripStatuses = tripStatusesRef.current;

        try {
          const tripsResponse = await api.get('/api/trips');
          const tripsData = tripsResponse.data?.data ?? tripsResponse.data;
          const trips = Array.isArray(tripsData) ? tripsData : tripsData?.trips || [];
          latestTripStatuses = trips.reduce((statuses, trip) => {
            const containerId = getTripContainerId(trip);
            const tripId = getTripId(trip);
            const status = String(trip.status || 'UNKNOWN').toUpperCase();
            if (containerId !== undefined && containerId !== null) {
              statuses[normalizeId(containerId)] = status;
            }
            if (tripId !== undefined && tripId !== null) {
              statuses[normalizeId(tripId)] = status;
            }
            return statuses;
          }, {});
          tripStatusesRef.current = latestTripStatuses;
          setTripStatuses(latestTripStatuses);

          const activeTrips = trips.filter((trip) => String(trip.status || '').toUpperCase() === 'ACTIVE');
          const locationResults = await Promise.all(activeTrips.map(async (trip) => {
            const tripId = getTripId(trip);
            if (tripId === undefined || tripId === null) return null;

            try {
              const locationsResponse = await api.get(`/api/monitoring/trip/${tripId}/locations`);
              console.log('Fetched Map Data:', locationsResponse.data);
              const coordinates = getLocationCoordinates(locationsResponse.data);
              const pathKey = normalizeId(getTripContainerId(trip) ?? tripId);
              return coordinates.length > 0 ? [pathKey, coordinates] : null;
            } catch (locationError) {
              console.error(`Failed to fetch actual path for trip ${tripId}:`, locationError);
              return null;
            }
          }));

          setActualPaths(Object.fromEntries(locationResults.filter(Boolean)));
        } catch (tripError) {
          console.error('Failed to refresh trip statuses:', tripError);
        }

        const activeLiveData = liveData.filter((container) => (
          latestTripStatuses[normalizeId(container.containerId)] !== 'COMPLETED'
        ));
        setActiveContainers(activeLiveData);
        onActiveContainersChange?.(activeLiveData);

        
        setTraveledPaths(prevPaths => {
          const updatedPaths = { ...prevPaths };
          activeLiveData.forEach(container => {
            const id = container.containerId;
            if (!updatedPaths[id]) updatedPaths[id] = [];
            
            
            const lastCoord = updatedPaths[id][updatedPaths[id].length - 1];
            if (!lastCoord || lastCoord[0] !== container.latitude || lastCoord[1] !== container.longitude) {
              updatedPaths[id].push([container.latitude, container.longitude]);
            }
          });
          return updatedPaths;
        });

        
        activeLiveData.forEach(async (container) => {
          const id = container.containerId;
          
          if (!fetchedTrips.current.has(id)) {
            fetchedTrips.current.add(id); 
            
            try {
              const tripRes = await api.get(`/api/trips/container/${id}`);
              const tripData = tripRes.data;

              if (tripData && tripData.routeCoordinatesJson) {
                const osrmData = typeof tripData.routeCoordinatesJson === 'string' 
                  ? JSON.parse(tripData.routeCoordinatesJson) 
                  : tripData.routeCoordinatesJson;
                
                if (osrmData.routes && osrmData.routes.length > 0) {
                  const geojsonCoords = osrmData.routes[0].geometry.coordinates;
                  const leafletCoords = geojsonCoords.map(coord => [coord[1], coord[0]]);
                  
                  
                  setPlannedRoutes(prevRoutes => ({
                    ...prevRoutes,
                    [id]: leafletCoords
                  }));
                }
              }
            } catch (error) {
              console.error(`Failed to fetch route for container ${id}:`, error);
            }
          }
        });

      } catch (error) {
        console.error("Failed to fetch live locations:", error);
      }
    };

    fetchLiveLocations();
    const intervalId = setInterval(fetchLiveLocations, 10000);
    return () => clearInterval(intervalId);
  }, [onActiveContainersChange, showActiveContainers]);

  return (
    <div className="h-full w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm" style={{ zIndex: 0 }}>
      <MapContainer
        center={defaultPosition}
        zoom={10}
        minZoom={7}
        maxZoom={20}
        bounds={sriLankaBounds}
        maxBounds={sriLankaBounds}
        maxBoundsViscosity={1}
        style={{ height: '100%', width: '100%' }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Standard Map">
            <TileLayer
              maxZoom={20}
              attribution="&copy; Google Maps"
              url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite View">
            <TileLayer
              maxZoom={20}
              attribution="&copy; Google Maps"
              url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {trackedContainer && (
          <TrackedMarker container={trackedContainer} />
        )}

        {plannedRoute.length > 0 && (
          <Polyline positions={plannedRoute} pathOptions={{ color: '#2563eb', weight: 5 }} />
        )}

        {actualPath.length > 0 && (
          <>
            <Polyline positions={actualPath} pathOptions={{ color: 'red', weight: 5 }} />
            <Marker position={actualPath[actualPath.length - 1]}>
              <Popup>Current Location</Popup>
            </Marker>
          </>
        )}

        
        {Object.entries(plannedRoutes)
          .filter(([id]) => tripStatuses[id] !== 'COMPLETED')
          .map(([id, coords]) => (
          <React.Fragment key={`planned-${id}`}>
            <Polyline positions={coords} color="#ef4444" weight={40} opacity={0.3} />
            <Polyline positions={coords} color="#3B82F6" dashArray="5, 10" weight={4} />
          </React.Fragment>
          ))}

        
        {Object.entries(traveledPaths)
          .filter(([id]) => tripStatuses[id] !== 'COMPLETED')
          .map(([id, pathCoords]) => (
          pathCoords.length > 0 && (
            <Polyline key={`traveled-${id}`} positions={pathCoords} color="#EF4444" weight={4} />
          )
          ))}

        {Object.entries(actualPaths)
          .filter(([id]) => tripStatuses[id] === 'ACTIVE')
          .map(([id, actualPath]) => (
            <Polyline
              key={`actual-${id}`}
              positions={actualPath}
              pathOptions={{ color: 'red', weight: 5 }}
            />
          ))}

        
        {activeContainers.map((container) => (
          <Marker key={container.containerId} position={[container.latitude, container.longitude]}>
            <Popup>
              <div className="text-sm min-w-[150px]">
                <strong className="text-[#0B3A5A] text-base">Container {container.containerId}</strong>
                <div className="mt-2 space-y-1">
                  <p className="flex justify-between">
                    <span className="text-gray-500">Status:</span> 
                    <span className={`font-medium ${tripStatuses[normalizeId(container.containerId)] === 'COMPLETED' ? 'text-slate-500' : 'text-green-600'}`}>
                      {tripStatuses[normalizeId(container.containerId)] || container.status}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-500">Speed:</span> 
                    <span className="font-medium">{container.speed} km/h</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-500">Device ID:</span> 
                    <span className="font-medium">{container.deviceId}</span>
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default LiveMap;