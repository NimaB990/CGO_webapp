import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, LayersControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import api from '../api';

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

const LiveMap = ({ trackedContainer, showActiveContainers = true, onActiveContainersChange }) => {
  // ලංකාවම පෙනෙන සේ මධ්‍ය ලක්ෂ්‍යය සහ Zoom එක වෙනස් කර ඇත
  const defaultPosition = [7.8731, 80.7718]; 
  const sriLankaBounds = [[5.7, 79.4], [10.0, 82.1]];
  const [activeContainers, setActiveContainers] = useState([]);
  
  // මාර්ග සහ ගමන් කළ පථයන් Container ID එක අනුව වෙන් වෙන්ව ගබඩා කිරීම
  const [plannedRoutes, setPlannedRoutes] = useState({});
  const [traveledPaths, setTraveledPaths] = useState({});
  
  // එකම මාර්ගය නැවත නැවත Fetch වීම වැළැක්වීමට Reference එකක්
  const fetchedTrips = useRef(new Set());

  useEffect(() => {
    if (!showActiveContainers) return undefined;

    const fetchLiveLocations = async () => {
      try {
        const response = await api.get('/api/monitoring/live-locations');
        const liveData = response.data;
        setActiveContainers(liveData);
        onActiveContainersChange?.(liveData);

        // 1. ගමන් කළ පථය (Traveled Path) එක් එක් කන්ටේනරයට වෙන් වෙන්ව Update කිරීම
        setTraveledPaths(prevPaths => {
          const updatedPaths = { ...prevPaths };
          liveData.forEach(container => {
            const id = container.containerId;
            if (!updatedPaths[id]) updatedPaths[id] = [];
            
            // එකම ලොකේෂන් එක නැවත ඇතුළත් වීම වැළැක්වීම
            const lastCoord = updatedPaths[id][updatedPaths[id].length - 1];
            if (!lastCoord || lastCoord[0] !== container.latitude || lastCoord[1] !== container.longitude) {
              updatedPaths[id].push([container.latitude, container.longitude]);
            }
          });
          return updatedPaths;
        });

        // 2. අලුත් Container එකක් ආවොත්, ඊට අදාළ Planned Route එක පමණක් Fetch කිරීම
        liveData.forEach(async (container) => {
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
                  
                  // අදාළ Container ID එකට අදාළව මාර්ගය State එකට සේව් කිරීම
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

        {/* සියලුම කන්ටේනර් වල ආරක්ෂිත කලාප (Buffer) සහ සැලසුම් කළ මාර්ග (Planned Route) ඇඳීම */}
        {Object.entries(plannedRoutes).map(([id, coords]) => (
          <React.Fragment key={`planned-${id}`}>
            <Polyline positions={coords} color="#ef4444" weight={40} opacity={0.3} />
            <Polyline positions={coords} color="#3B82F6" dashArray="5, 10" weight={4} />
          </React.Fragment>
        ))}

        {/* සියලුම කන්ටේනර් වල ගමන් කළ පථයන් (Traveled Paths) ඇඳීම */}
        {Object.entries(traveledPaths).map(([id, pathCoords]) => (
          pathCoords.length > 0 && (
            <Polyline key={`traveled-${id}`} positions={pathCoords} color="#EF4444" weight={4} />
          )
        ))}

        {/* සජීවී ලොකේෂන් පෙන්වන Markers */}
        {activeContainers.map((container) => (
          <Marker key={container.containerId} position={[container.latitude, container.longitude]}>
            <Popup>
              <div className="text-sm min-w-[150px]">
                <strong className="text-[#0B3A5A] text-base">Container {container.containerId}</strong>
                <div className="mt-2 space-y-1">
                  <p className="flex justify-between">
                    <span className="text-gray-500">Status:</span> 
                    <span className="font-medium text-green-600">{container.status}</span>
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