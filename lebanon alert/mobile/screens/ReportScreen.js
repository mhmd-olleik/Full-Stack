import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useApp } from '../App';

const REGIONS = ['Beirut', 'South Lebanon', 'Bekaa', 'North Lebanon', 'Mount Lebanon', 'Nabatieh', 'Baalbek-Hermel', 'Akkar'];
const CATEGORIES = ['airstrike', 'drone', 'siren', 'shelling', 'rocket', 'explosion', 'news', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

export default function ReportScreen() {
  const { user } = useApp();
  const [form, setForm] = useState({ title: '', description: '', region: '', category: 'other', severity: 'medium', lat: null, lng: null });
  const [submitting, setSubmitting] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCat, setSelectedCat] = useState('other');
  const [selectedSev, setSelectedSev] = useState('medium');

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied'); return; }
      const loc = await Location.getCurrentPositionAsync({});
      setForm(f => ({ ...f, lat: loc.coords.latitude, lng: loc.coords.longitude }));
      Alert.alert('📍 Location captured');
    } catch (e) { Alert.alert('Error', 'Could not get location'); }
  };

  const submit = async () => {
    if (!form.title || !form.description || !selectedRegion) {
      Alert.alert('Missing fields', 'Please fill in title, description and region');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:5000/api/alerts/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, region: selectedRegion, category: selectedCat, severity: selectedSev })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('✅ Submitted', 'Your alert is pending admin verification');
        setForm({ title: '', description: '', region: '', category: 'other', severity: 'medium', lat: null, lng: null });
        setSelectedRegion(''); setSelectedCat('other'); setSelectedSev('medium');
      } else { Alert.alert('Error', data.message); }
    } catch { Alert.alert('Error', 'Network error'); }
    setSubmitting(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.header}>📢 Report Emergency Alert</Text>
      <Text style={styles.subtext}>Submit an alert for admin verification</Text>

      <Text style={styles.label}>Title *</Text>
      <TextInput style={styles.input} placeholder="Brief alert description" placeholderTextColor="#6b6b80" value={form.title} onChangeText={t => setForm(f => ({ ...f, title: t }))} />

      <Text style={styles.label}>Description *</Text>
      <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Detailed description..." placeholderTextColor="#6b6b80" multiline value={form.description} onChangeText={t => setForm(f => ({ ...f, description: t }))} />

      <Text style={styles.label}>Region *</Text>
      <View style={styles.chips}>
        {REGIONS.map(r => (
          <TouchableOpacity key={r} style={[styles.chip, selectedRegion === r && styles.chipActive]} onPress={() => setSelectedRegion(r)}>
            <Text style={[styles.chipText, selectedRegion === r && styles.chipTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Category</Text>
      <View style={styles.chips}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c} style={[styles.chip, selectedCat === c && styles.chipActive]} onPress={() => setSelectedCat(c)}>
            <Text style={[styles.chipText, selectedCat === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Severity</Text>
      <View style={styles.chips}>
        {SEVERITIES.map(s => {
          const colors = { low: '#3B82F6', medium: '#F59E0B', high: '#EF4444', critical: '#DC2626' };
          return (
            <TouchableOpacity key={s} style={[styles.chip, selectedSev === s && { backgroundColor: colors[s] + '30', borderColor: colors[s] }]} onPress={() => setSelectedSev(s)}>
              <Text style={[styles.chipText, selectedSev === s && { color: colors[s] }]}>{s.toUpperCase()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.locationBtn} onPress={getLocation}>
        <Text style={styles.locationBtnText}>📍 {form.lat ? `Location: ${form.lat.toFixed(4)}, ${form.lng.toFixed(4)}` : 'Attach My Location'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting}>
        <Text style={styles.submitBtnText}>{submitting ? '⏳ Submitting...' : '🚨 Submit Alert Report'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { fontSize: 22, fontWeight: '800', color: '#DC2626', marginBottom: 4 },
  subtext: { fontSize: 14, color: '#6b6b80', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#a0a0b8', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a3e', borderRadius: 10, padding: 14, color: '#f0f0f5', fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a3e' },
  chipActive: { backgroundColor: 'rgba(220,38,38,0.15)', borderColor: '#DC2626' },
  chipText: { fontSize: 13, color: '#6b6b80', fontWeight: '600' },
  chipTextActive: { color: '#DC2626' },
  locationBtn: { marginTop: 20, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a3e', borderRadius: 10, padding: 14, alignItems: 'center' },
  locationBtnText: { fontSize: 14, color: '#a0a0b8', fontWeight: '600' },
  submitBtn: { marginTop: 20, backgroundColor: '#DC2626', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: 'white' },
});
