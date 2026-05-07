import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../App';

const REGIONS = ['Beirut', 'South Lebanon', 'Bekaa', 'North Lebanon', 'Mount Lebanon', 'Nabatieh', 'Baalbek-Hermel', 'Akkar'];

export default function SettingsScreen() {
  const { lang, setLang } = useApp();
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [minSeverity, setMinSeverity] = useState('medium');

  const toggleRegion = (region) => {
    setSelectedRegions(prev => prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]);
  };

  const toggleLang = async () => {
    const newLang = lang === 'en' ? 'ar' : 'en';
    setLang(newLang);
    await AsyncStorage.setItem('lang', newLang);
  };

  const sevColors = { low: '#3B82F6', medium: '#F59E0B', high: '#EF4444', critical: '#DC2626' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.header}>⚙️ Settings</Text>

      {/* Language */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌍 Language</Text>
        <TouchableOpacity style={styles.langBtn} onPress={toggleLang}>
          <Text style={styles.langBtnText}>{lang === 'en' ? '🇬🇧 English → عربي' : '🇱🇧 عربي → English'}</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Notifications</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Push Notifications</Text>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: '#2a2a3e', true: '#DC262660' }} thumbColor={notifications ? '#DC2626' : '#6b6b80'} />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Alert Sound</Text>
          <Switch value={sound} onValueChange={setSound} trackColor={{ false: '#2a2a3e', true: '#DC262660' }} thumbColor={sound ? '#DC2626' : '#6b6b80'} />
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Vibration</Text>
          <Switch value={vibration} onValueChange={setVibration} trackColor={{ false: '#2a2a3e', true: '#DC262660' }} thumbColor={vibration ? '#DC2626' : '#6b6b80'} />
        </View>
      </View>

      {/* Min Severity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Minimum Alert Severity</Text>
        <Text style={styles.hint}>Only receive notifications at this level or above</Text>
        <View style={styles.chips}>
          {['low', 'medium', 'high', 'critical'].map(s => (
            <TouchableOpacity key={s} style={[styles.chip, minSeverity === s && { backgroundColor: sevColors[s] + '25', borderColor: sevColors[s] }]} onPress={() => setMinSeverity(s)}>
              <Text style={[styles.chipText, minSeverity === s && { color: sevColors[s] }]}>{s.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Preferred Regions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Preferred Regions</Text>
        <Text style={styles.hint}>Select regions for targeted alerts (none = all regions)</Text>
        <View style={styles.chips}>
          {REGIONS.map(r => (
            <TouchableOpacity key={r} style={[styles.chip, selectedRegions.includes(r) && styles.chipActive]} onPress={() => toggleRegion(r)}>
              <Text style={[styles.chipText, selectedRegions.includes(r) && styles.chipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ About</Text>
        <Text style={styles.aboutText}>Lebanon Red Alert 🚨</Text>
        <Text style={styles.hint}>Real-time emergency alert system for Lebanon. Community-driven alerts with admin verification.</Text>
        <Text style={[styles.hint, { marginTop: 8 }]}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { fontSize: 22, fontWeight: '800', color: '#f0f0f5', marginBottom: 24 },
  section: { backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#2a2a3e' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#f0f0f5', marginBottom: 12 },
  hint: { fontSize: 13, color: '#6b6b80', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a3e' },
  rowLabel: { fontSize: 15, color: '#a0a0b8' },
  langBtn: { backgroundColor: '#12121a', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' },
  langBtnText: { fontSize: 15, color: '#a0a0b8', fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#12121a', borderWidth: 1, borderColor: '#2a2a3e' },
  chipActive: { backgroundColor: 'rgba(220,38,38,0.15)', borderColor: '#DC2626' },
  chipText: { fontSize: 13, color: '#6b6b80', fontWeight: '600' },
  chipTextActive: { color: '#DC2626' },
  aboutText: { fontSize: 18, fontWeight: '800', color: '#DC2626', marginBottom: 6 },
});
