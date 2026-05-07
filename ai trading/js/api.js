/**
 * AIOK Trading — API Communication Layer
 * Handles all communication with the Python backend
 */

const API = (() => {
    const BASE_URL = 'http://localhost:5000/api';
    const WS_URL = 'ws://localhost:5000/ws/live';
    
    let ws = null;
    let isConnected = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT = 10;
    const RECONNECT_DELAY = 3000;
    
    // Callbacks for WebSocket events
    const listeners = {
        price: [],
        signal: [],
        trade: [],
        account: [],
        analysis: [],
        error: [],
        connect: [],
        disconnect: []
    };

    /**
     * HTTP GET request
     */
    async function get(endpoint) {
        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.warn(`[API] GET ${endpoint} failed:`, error.message);
            return null;
        }
    }

    /**
     * HTTP POST request
     */
    async function post(endpoint, data) {
        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.warn(`[API] POST ${endpoint} failed:`, error.message);
            return null;
        }
    }

    /**
     * WebSocket connection
     */
    function connectWebSocket() {
        try {
            ws = new WebSocket(WS_URL);
            
            ws.onopen = () => {
                isConnected = true;
                reconnectAttempts = 0;
                console.log('[API] WebSocket connected');
                emit('connect');
            };
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type && listeners[data.type]) {
                        emit(data.type, data.payload);
                    }
                } catch (e) {
                    console.warn('[API] Failed to parse WS message:', e);
                }
            };
            
            ws.onclose = () => {
                isConnected = false;
                console.log('[API] WebSocket disconnected');
                emit('disconnect');
                scheduleReconnect();
            };
            
            ws.onerror = (error) => {
                console.warn('[API] WebSocket error');
                emit('error', error);
            };
        } catch (error) {
            console.warn('[API] WebSocket connection failed:', error.message);
            scheduleReconnect();
        }
    }

    function scheduleReconnect() {
        if (reconnectAttempts < MAX_RECONNECT) {
            reconnectAttempts++;
            setTimeout(() => connectWebSocket(), RECONNECT_DELAY * reconnectAttempts);
        }
    }

    function emit(type, data) {
        if (listeners[type]) {
            listeners[type].forEach(cb => {
                try { cb(data); } catch(e) { console.error('[API] Listener error:', e); }
            });
        }
    }

    /**
     * Subscribe to events
     */
    function on(type, callback) {
        if (!listeners[type]) listeners[type] = [];
        listeners[type].push(callback);
        return () => {
            listeners[type] = listeners[type].filter(cb => cb !== callback);
        };
    }

    /**
     * API Endpoints
     */
    return {
        // Connection
        connect: connectWebSocket,
        on,
        get isConnected() { return isConnected; },

        // REST Endpoints
        getPrice: () => get('/price'),
        getSignals: () => get('/signals'),
        getAnalysis: (tf) => get(`/analysis?timeframe=${tf || 'M15'}`),
        getTrades: () => get('/trades'),
        getAccount: () => get('/account'),
        getCandles: (tf, count) => get(`/candles?timeframe=${tf || 'M15'}&count=${count || 200}`),
        
        // Trade Execution
        executeTrade: (type, params) => post('/execute', { type, ...params }),
        closeTrade: (ticketId) => post('/close', { ticket: ticketId }),
        
        // Settings
        updateSettings: (settings) => post('/settings', settings),
    };
})();
