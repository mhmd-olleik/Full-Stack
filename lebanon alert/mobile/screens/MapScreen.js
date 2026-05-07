import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { useApp } from '../App';

const SEVERITY_COLORS = { low: '#3B82F6', medium: '#F59E0B', high: '#EF4444', critical: '#DC2626' };
const CATEGORY_EMOJI = { airstrike: '💥', drone: '🛩️', siren: '📢', shelling: '💣', rocket: '🚀', explosion: '🔥', news: '📰', humanitarian: '🏥', other: '⚡' };

const LEBANON_CENTER = { latitude: 33.8547, longitude: 35.8623, latitudeDelta: 2.5, longitudeDelta: 2.0 };

export default function MapScreen() {
  const { alerts, lang } = useApp();
  const [mapAlerts, setMapAlerts] = useState([]);

  useEffect(() => {
    const withLocation = alerts.filter(a => a.location?.lat && a.location?.lng && a.status === 'verified');
    setMapAlerts(withLocation);
  }, [alerts]);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={LEBANON_CENTER}
        userInterfaceStyle="dark"
        customMapStyle={darkMapStyle}
      >
        {mapAlerts.map((alert, i) => {
          const color = SEVERITY_COLORS[alert.severity] || '#3B82F6';
          const title = alert.title?.[lang] || alert.title?.en || 'Alert';
          const radius = alert.severity === 'critical' ? 3000 : alert.severity === 'high' ? 2000 : 1000;

          return (
            <React.Fragment key={alert._id || i}>
              <Marker
                coordinate={{ latitude: alert.location.lat, longitude: alert.location.lng }}
                title={`${CATEGORY_EMOJI[alert.category] || '⚡'} ${title}`}
                description={`${alert.region} • ${alert.severity?.toUpperCase()}`}
                pinColor={color}
              />
              <Circle
                center={{ latitude: alert.location.lat, longitude: alert.location.lng }}
                radius={radius}
                fillColor={color + '20'}
                strokeColor={color + '60'}
                strokeWidth={1}
              />
            </React.Fragment>
          );
        })}
      </MapView>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Severity</Text>
        <View style={styles.legendItems}>
          {Object.entries(SEVERITY_COLORS).map(([key, color]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{key}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.counter}>
        <Text style={styles.counterText}>📍 {mapAlerts.length} alerts on map</Text>
      </View>
    </View>
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8b8ba0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#12121a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a3e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0a1a' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  map: { flex: 1 },
  legend: { position: 'absolute', bottom: 20, left: 16, backgroundColor: 'rgba(26,26,46,0.9)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#2a2a3e' },
  legendTitle: { fontSize: 12, fontWeight: '700', color: '#f0f0f5', marginBottom: 6 },
  legendItems: { flexDirection: 'row', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#a0a0b8', textTransform: 'capitalize' },
  counter: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(26,26,46,0.9)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#2a2a3e' },
  counterText: { fontSize: 12, color: '#a0a0b8', fontWeight: '600' },
});
