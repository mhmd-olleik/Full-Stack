import { io } from 'socket.io-client';
import { Vibration } from 'react-native';

const API_URL = 'http://localhost:5000';

export function connectSocket(onNewAlert) {
  const socket = io(API_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected');
  });

  socket.on('new-alert', (alert) => {
    console.log('🚨 New alert:', alert.title?.en);
    
    // Vibrate for high/critical
    if (alert.severity === 'critical') {
      Vibration.vibrate([0, 1000, 500, 1000, 500, 1000]);
    } else if (alert.severity === 'high') {
      Vibration.vibrate([0, 500, 200, 500]);
    }

    if (onNewAlert) onNewAlert(alert);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  return socket;
}
