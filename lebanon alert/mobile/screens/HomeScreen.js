import React, { useContext } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useApp } from '../App';

const SEVERITY_COLORS = { low: '#3B82F6', medium: '#F59E0B', high: '#EF4444', critical: '#DC2626' };
const CATEGORY_EMOJI = { airstrike: '💥', drone: '🛩️', siren: '📢', shelling: '💣', rocket: '🚀', explosion: '🔥', news: '📰', humanitarian: '🏥', other: '⚡' };
const SEVERITY_EMOJI = { low: 'ℹ️', medium: '⚠️', high: '🔴', critical: '🚨' };

function AlertCard({ alert }) {
  const { lang } = useApp();
  const title = alert.title?.[lang] || alert.title?.en || 'Alert';
  const desc = alert.description?.[lang] || alert.description?.en || '';
  const color = SEVERITY_COLORS[alert.severity] || '#3B82F6';
  const time = alert.createdAt ? new Date(alert.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <TouchableOpacity style={[styles.card, { borderLeftColor: color }]} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardEmoji}>{CATEGORY_EMOJI[alert.category] || '⚡'}</Text>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>{desc}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <View style={[styles.badge, { backgroundColor: color + '30' }]}>
          <Text style={[styles.badgeText, { color }]}>{SEVERITY_EMOJI[alert.severity]} {alert.severity?.toUpperCase()}</Text>
        </View>
        <Text style={styles.metaText}>📍 {alert.region}</Text>
        <Text style={styles.metaText}>🕐 {time}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { alerts, fetchAlerts } = useApp();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚨 Lebanon Red Alert</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {alerts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 48 }}>📡</Text>
          <Text style={styles.emptyText}>No alerts at this time</Text>
          <Text style={styles.emptySubtext}>Pull down to refresh</Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item, i) => item._id || String(i)}
          renderItem={({ item }) => <AlertCard alert={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" colors={['#DC2626']} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2a2a3e' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#DC2626' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: 'rgba(220,38,38,0.15)', borderWidth: 1, borderColor: 'rgba(220,38,38,0.3)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#DC2626' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#DC2626' },
  card: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderWidth: 1, borderColor: '#2a2a3e' },
  cardHeader: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  cardEmoji: { fontSize: 28, marginTop: 2 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#f0f0f5', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#a0a0b8', lineHeight: 18 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  metaText: { fontSize: 12, color: '#6b6b80' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: '#a0a0b8', fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: '#6b6b80' },
});
