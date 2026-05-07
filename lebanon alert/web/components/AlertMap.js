'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '@/lib/AppContext';
import { api, SEVERITY_COLORS, CATEGORY_EMOJI, REGION_COORDS } from '@/lib/constants';

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

export default function AlertMap() {
  const { lang } = useApp();
  const [mapAlerts, setMapAlerts] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/api/alerts/map', { hours: 72 });
        if (res.success) setMapAlerts(res.data);
      } catch {}
    };
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  const center = [33.8547, 35.8623];

  return (
    <div className="map-container">
      <MapContainer center={center} zoom={8} style={{ width: '100%', height: '500px' }} zoomControl={true}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapUpdater center={center} />
        {mapAlerts.map((alert, i) => {
          if (!alert.location?.lat || !alert.location?.lng) return null;
          const color = SEVERITY_COLORS[alert.severity] || '#3B82F6';
          const radius = alert.severity === 'critical' ? 14 : alert.severity === 'high' ? 11 : alert.severity === 'medium' ? 8 : 6;
          const title = alert.title?.[lang] || alert.title?.en || 'Alert';

          return (
            <CircleMarker
              key={alert._id || i}
              center={[alert.location.lat, alert.location.lng]}
              radius={radius}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.5, weight: 2 }}
            >
              <Popup>
                <div style={{ color: '#1a1a2e', minWidth: 200 }}>
                  <strong>{CATEGORY_EMOJI[alert.category]} {title}</strong>
                  <br />
                  <span style={{ fontSize: '0.8em', color: '#666' }}>
                    📍 {alert.region} &bull; {new Date(alert.createdAt).toLocaleString()}
                  </span>
                  <br />
                  <span style={{ display: 'inline-block', marginTop: 4, padding: '2px 6px', borderRadius: 4, background: color, color: 'white', fontSize: '0.75em', fontWeight: 700 }}>
                    {alert.severity?.toUpperCase()}
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Region heat indicators */}
        {Object.entries(REGION_COORDS).map(([region, coords]) => {
          const regionAlerts = mapAlerts.filter(a => a.region === region);
          if (!regionAlerts.length) return null;
          const hasCritical = regionAlerts.some(a => a.severity === 'critical');
          const hasHigh = regionAlerts.some(a => a.severity === 'high');
          const color = hasCritical ? '#DC2626' : hasHigh ? '#EF4444' : '#F59E0B';
          return (
            <CircleMarker
              key={`heat-${region}`}
              center={coords}
              radius={20 + regionAlerts.length * 2}
              pathOptions={{ color: 'transparent', fillColor: color, fillOpacity: 0.12 }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
