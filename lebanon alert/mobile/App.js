import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import ReportScreen from './screens/ReportScreen';
import SettingsScreen from './screens/SettingsScreen';
import { setupNotifications } from './services/notifications';
import { connectSocket } from './services/socket';

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

const Tab = createBottomTabNavigator();

const DarkTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#0a0a0f', card: '#12121a', text: '#f0f0f5', border: '#2a2a3e', primary: '#DC2626' }
};

const TAB_ICONS = { Home: '🏠', Map: '🗺️', Report: '📢', Settings: '⚙️' };

export default function App() {
  const [alerts, setAlerts] = useState([]);
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState('en');
  const socketRef = useRef(null);

  useEffect(() => {
    loadCachedData();
    setupNotifications();
    const socket = connectSocket((alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 99)]);
    });
    socketRef.current = socket;
    fetchAlerts();
    return () => socket?.disconnect();
  }, []);

  const loadCachedData = async () => {
    try {
      const cached = await AsyncStorage.getItem('alerts_cache');
      if (cached) setAlerts(JSON.parse(cached));
      const savedLang = await AsyncStorage.getItem('lang');
      if (savedLang) setLang(savedLang);
      const savedUser = await AsyncStorage.getItem('user');
      if (savedUser) setUser(JSON.parse(savedUser));
    } catch {}
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/alerts?limit=50');
      const data = await res.json();
      if (data.success) {
        setAlerts(data.data);
        await AsyncStorage.setItem('alerts_cache', JSON.stringify(data.data));
      }
    } catch {}
  };

  const value = { alerts, setAlerts, user, setUser, lang, setLang, fetchAlerts };

  return (
    <AppContext.Provider value={value}>
      <NavigationContainer theme={DarkTheme}>
        <StatusBar style="light" />
        <Tab.Navigator screenOptions={({ route }) => ({
          tabBarIcon: () => <Text style={{ fontSize: 22 }}>{TAB_ICONS[route.name]}</Text>,
          tabBarActiveTintColor: '#DC2626',
          tabBarInactiveTintColor: '#6b6b80',
          tabBarStyle: { backgroundColor: '#12121a', borderTopColor: '#2a2a3e', height: 60, paddingBottom: 8 },
          headerStyle: { backgroundColor: '#12121a', borderBottomColor: '#2a2a3e' },
          headerTintColor: '#f0f0f5',
          headerTitleStyle: { fontWeight: '700' }
        })}>
          <Tab.Screen name="Home" component={HomeScreen} options={{ title: '🚨 Alerts' }} />
          <Tab.Screen name="Map" component={MapScreen} options={{ title: '🗺️ Map' }} />
          <Tab.Screen name="Report" component={ReportScreen} options={{ title: '📢 Report' }} />
          <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '⚙️ Settings' }} />
        </Tab.Navigator>
      </NavigationContainer>
    </AppContext.Provider>
  );
}
