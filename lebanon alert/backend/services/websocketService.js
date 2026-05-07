const setupWebSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join region-specific rooms
    socket.on('subscribe-region', (region) => {
      socket.join(`region:${region}`);
      console.log(`📍 ${socket.id} subscribed to ${region}`);
    });

    socket.on('unsubscribe-region', (region) => {
      socket.leave(`region:${region}`);
    });

    // Admin room
    socket.on('join-admin', (token) => {
      socket.join('admins');
      console.log(`🛡️ Admin joined: ${socket.id}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  console.log('✅ WebSocket server initialized');
};

const broadcastAlert = (io, alert) => {
  io.emit('new-alert', alert);
  if (alert.region) {
    io.to(`region:${alert.region}`).emit('region-alert', alert);
  }
};

const broadcastStats = async (io, Alert) => {
  try {
    const stats = await Alert.getStats();
    io.emit('alert-stats', stats);
  } catch (e) { /* silent */ }
};

module.exports = { setupWebSocket, broadcastAlert, broadcastStats };
