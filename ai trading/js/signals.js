/**
 * AIOK Trading — REAL Signal Engine
 * 100% Live Data — NO simulation, NO fake data
 * All data comes from the Python backend connected to MT5
 */

const SignalEngine = (() => {
    let currentSignal = null;
    let signalHistory = [];
    let isConnected = false;
    let pollInterval = null;
    let pricePollInterval = null;

    // Strong signal history (saved locally)
    let strongSignalHistory = JSON.parse(localStorage.getItem('AIOK_signal_history') || '[]');
    let lastSignalTime = '';
    let currentHistFilter = 'all';

    // Real state from backend
    const indicators = {
        rsi: { value: 0, signal: 'waiting' },
        macd: { value: 0, signal: 'waiting', histogram: 0 },
        bb: { upper: 0, middle: 0, lower: 0, signal: 'waiting' },
        ema: { ema50: 0, ema200: 0, signal: 'waiting', cross: '--' },
        ichimoku: { tenkan: 0, kijun: 0, signal: 'waiting', cloud: '--' },
        stochrsi: { value: 0, signal: 'waiting' },
        atr: { value: 0, signal: 'waiting', volatility: '--' },
        volume: { value: 0, signal: 'waiting', avgRatio: 0 }
    };

    const priceState = {
        current: 0,
        bid: 0,
        ask: 0,
        high: 0,
        low: 0,
        open: 0,
        prevClose: 0,
        spread: 0,
        lastTick: 'neutral'
    };

    const accountState = {
        balance: 0,
        equity: 0,
        margin: 0,
        dailyPnl: 0,
        openPositions: 0,
        lotSize: 0.01
    };

    const performance = {
        totalTrades: 0,
        winTrades: 0,
        lossTrades: 0,
        totalProfit: 0,
        totalLoss: 0,
        maxDrawdown: 0,
        winRate: 0,
        profitFactor: 0
    };

    /**
     * Initialize — connect to real backend
     */
    function init() {
        addLog('info', 'AIOK Trading initializing...');
        addLog('info', 'Connecting to backend server...');
        
        // Show waiting state on all indicators
        updateIndicatorsUI();
        updatePriceUI();
        updateAccountUI();
        updatePerformanceUI();

        // Start polling the real backend
        startRealDataPolling();
    }

    /**
     * Start polling real data from backend API
     */
    function startRealDataPolling() {
        // Check backend health first
        checkBackendConnection();

        // Poll price every 1 second
        pricePollInterval = setInterval(() => {
            if (isConnected) fetchRealPrice();
        }, 1000);

        // Poll analysis + signals every 5 seconds
        pollInterval = setInterval(() => {
            if (isConnected) {
                fetchRealAnalysis();
                fetchRealSignals();
                fetchRealAccount();
                fetchRealTrades();
            }
        }, 5000);

        // Check connection health every 10 seconds
        setInterval(() => {
            checkBackendConnection();
        }, 10000);
    }

    /**
     * Check if backend is running
     */
    async function checkBackendConnection() {
        try {
            const response = await fetch('http://localhost:5000/api/status');
            if (response.ok) {
                const data = await response.json();
                
                if (!isConnected) {
                    isConnected = true;
                    addLog('info', '🟢 Backend connected!');
                    
                    if (data.mt5_connected) {
                        addLog('info', `✅ MT5 LIVE — Symbol: ${data.symbol}`);
                        addLog('info', `🧠 ML Model: ${data.ml_trained ? 'Trained (' + data.ml_accuracy.toFixed(1) + '%)' : 'Training...'}`);
                        updateConnectionStatus(true, 'LIVE');
                    } else {
                        addLog('warning', '⚠️ Backend running but MT5 NOT connected');
                        addLog('warning', 'Start MetaTrader 5 and login to your Bybit account');
                        updateConnectionStatus(true, 'MT5 OFFLINE');
                    }

                    // Initial full data fetch
                    fetchRealPrice();
                    fetchRealAnalysis();
                    fetchRealSignals();
                    fetchRealAccount();
                }
            } else {
                handleDisconnect();
            }
        } catch (e) {
            handleDisconnect();
        }
    }

    function handleDisconnect() {
        if (isConnected || !pollInterval) {
            isConnected = false;
            updateConnectionStatus(false, 'OFFLINE');
            addLog('warning', '❌ Backend not reachable at localhost:5000');
            addLog('info', 'Start the backend: cd backend → python server.py');
        }
    }

    function updateConnectionStatus(connected, text) {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            if (connected) {
                statusEl.classList.add('connected');
            } else {
                statusEl.classList.remove('connected');
            }
            const textEl = statusEl.querySelector('.status-text');
            if (textEl) textEl.textContent = text;
        }
    }

    // ============ REAL Data Fetchers ============

    async function fetchRealPrice() {
        try {
            const response = await fetch('http://localhost:5000/api/price');
            if (!response.ok) return;
            const data = await response.json();
            if (data.error) return;

            const prevPrice = priceState.current;
            priceState.current = data.current || data.bid || 0;
            priceState.bid = data.bid || 0;
            priceState.ask = data.ask || 0;
            priceState.high = data.high || 0;
            priceState.low = data.low || 0;
            priceState.open = data.open || 0;
            priceState.prevClose = data.prevClose || 0;
            priceState.spread = data.spread || 0;
            priceState.lastTick = priceState.current >= prevPrice ? 'up' : 'down';

            updatePriceUI();
        } catch (e) {
            // Silent fail — will retry
        }
    }

    async function fetchRealAnalysis() {
        try {
            const tf = document.querySelector('.tf-btn.active')?.dataset.tf || 'M15';
            const response = await fetch(`http://localhost:5000/api/analysis?timeframe=${tf}`);
            if (!response.ok) return;
            const data = await response.json();
            if (data.error) return;

            // Update indicators from real backend data
            if (data.rsi) {
                indicators.rsi = {
                    value: data.rsi.value || 0,
                    signal: data.rsi.signal || 'neutral'
                };
            }
            if (data.macd) {
                indicators.macd = {
                    value: data.macd.value || 0,
                    signal: data.macd.signal || 'neutral',
                    histogram: data.macd.histogram || 0,
                    signal_line: data.macd.signal_line || 0
                };
            }
            if (data.bb) {
                indicators.bb = {
                    upper: data.bb.upper || 0,
                    middle: data.bb.middle || 0,
                    lower: data.bb.lower || 0,
                    signal: data.bb.signal || 'neutral',
                    position: data.bb.position || 0.5,
                    is_squeeze: data.bb.is_squeeze || false
                };
            }
            if (data.ema) {
                indicators.ema = {
                    ema50: data.ema.ema50 || 0,
                    ema200: data.ema.ema200 || 0,
                    signal: data.ema.signal || 'neutral',
                    cross: data.ema.cross || '--'
                };
            }
            if (data.ichimoku) {
                indicators.ichimoku = {
                    tenkan: data.ichimoku.tenkan || 0,
                    kijun: data.ichimoku.kijun || 0,
                    signal: data.ichimoku.signal || 'neutral',
                    cloud: data.ichimoku.cloud_position || '--'
                };
            }
            if (data.stochrsi) {
                indicators.stochrsi = {
                    value: data.stochrsi.value || data.stochrsi.k || 0,
                    signal: data.stochrsi.signal || 'neutral'
                };
            }
            if (data.atr) {
                indicators.atr = {
                    value: data.atr.value || 0,
                    signal: data.atr.signal || 'neutral',
                    volatility: data.atr.volatility || '--',
                    sl_distance: data.atr.sl_distance || 0,
                    tp_distance: data.atr.tp_distance || 0
                };
            }
            if (data.volume) {
                indicators.volume = {
                    value: data.volume.value || 0,
                    signal: data.volume.signal || 'neutral',
                    avgRatio: data.volume.ratio || 0,
                    level: data.volume.level || '--'
                };
            }

            updateIndicatorsUI();
        } catch (e) {
            // Silent fail
        }
    }

    async function fetchRealSignals() {
        try {
            const response = await fetch('http://localhost:5000/api/signals');
            if (!response.ok) return;
            const data = await response.json();
            if (data.error) return;

            if (data.current) {
                const signal = data.current;
                currentSignal = signal;
                updateSignalUI(signal);
                updateLifecycleUI(signal, data);

                // Play sound on new signal
                if (signal.is_new && signal.signal_id && signal.signal_id !== lastSignalTime) {
                    lastSignalTime = signal.signal_id;
                    playSignalSound();
                    saveStrongSignal(signal);
                    addLog(signal.direction,
                        `🔥 NEW ${signal.direction.toUpperCase()} @ ${signal.entry_price} | Score: ${signal.score}/10 | TP1: ${signal.tp1} | TP2: ${signal.tp2} | TP3: ${signal.tp3} | SL: ${signal.sl}`);
                }
            }

            if (data.history) {
                signalHistory = data.history;
            }
        } catch (e) {
            // Silent fail
        }
    }

    function updateLifecycleUI(signal, data) {
        const badge = document.getElementById('lifecycle-badge');
        const targets = document.getElementById('signal-targets');
        const actions = document.getElementById('signal-actions');
        const tracking = document.getElementById('tracking-actions');
        const completed = document.getElementById('completed-actions');
        const msgEl = document.getElementById('signal-message');
        const card = document.getElementById('signal-card');

        if (!badge) return;

        const lifecycle = signal.lifecycle || data.lifecycle || 'WAITING';

        badge.textContent = lifecycle;
        badge.className = 'signal-lifecycle-badge ' + lifecycle.toLowerCase();

        if (msgEl) msgEl.textContent = signal.message || '';

        if (lifecycle === 'ACTIVE' || lifecycle === 'TRACKING' || lifecycle === 'COMPLETED') {
            if (targets) {
                targets.style.display = 'block';
                const ep = document.getElementById('entry-price');
                if (ep) ep.textContent = signal.entry_price ? signal.entry_price.toFixed(2) : '---';
                const t1 = document.getElementById('tp1-price');
                if (t1) t1.textContent = signal.tp1 ? signal.tp1.toFixed(2) : '---';
                const t2 = document.getElementById('tp2-price');
                if (t2) t2.textContent = signal.tp2 ? signal.tp2.toFixed(2) : '---';
                const t3 = document.getElementById('tp3-price');
                if (t3) t3.textContent = signal.tp3 ? signal.tp3.toFixed(2) : '---';
                const sp = document.getElementById('sl-price');
                if (sp) sp.textContent = signal.sl ? signal.sl.toFixed(2) : '---';

                document.getElementById('tp1-status').textContent = signal.tp1_hit ? '✅' : '⏳';
                document.getElementById('tp2-status').textContent = signal.tp2_hit ? '✅' : '⏳';
                document.getElementById('tp3-status').textContent = signal.tp3_hit ? '✅' : '⏳';
                document.getElementById('sl-status').textContent = signal.sl_hit ? '❌' : '🛡️';

                document.getElementById('tp1-row').className = 'target-row tp-row' + (signal.tp1_hit ? ' hit' : '');
                document.getElementById('tp2-row').className = 'target-row tp-row' + (signal.tp2_hit ? ' hit' : '');
                document.getElementById('tp3-row').className = 'target-row tp-row' + (signal.tp3_hit ? ' hit' : '');

                // Optimal Entry Display
                const optRow = document.getElementById('optimal-entry-row');
                if (optRow && signal.entry_type === 'LIMIT' && signal.optimal_entry) {
                    optRow.style.display = 'flex';
                    const optPrice = document.getElementById('optimal-entry-price');
                    const optReason = document.getElementById('optimal-entry-reason');
                    if (optPrice) optPrice.textContent = signal.optimal_entry.toFixed(2);
                    if (optReason) optReason.textContent = signal.entry_reason || '';
                } else if (optRow) {
                    optRow.style.display = 'none';
                }
            }
            if (card) card.classList.toggle('new-signal', lifecycle === 'ACTIVE');
        } else {
            if (targets) targets.style.display = 'none';
            if (card) card.classList.remove('new-signal');
            const optRow = document.getElementById('optimal-entry-row');
            if (optRow) optRow.style.display = 'none';
        }

        if (actions) actions.style.display = lifecycle === 'ACTIVE' ? 'flex' : 'none';
        if (tracking) tracking.style.display = lifecycle === 'TRACKING' ? 'flex' : 'none';
        if (completed) completed.style.display = lifecycle === 'COMPLETED' ? 'flex' : 'none';

        // NEWS EVENTS DISPLAY
        if (data.news) {
            renderNews(data.news);
        }
    }

    function renderNews(news) {
        const warningsEl = document.getElementById('news-warnings');
        const eventsEl = document.getElementById('news-events');
        const countEl = document.getElementById('news-count');
        if (!warningsEl || !eventsEl) return;

        // Warnings
        if (news.warnings && news.warnings.length > 0) {
            warningsEl.innerHTML = news.warnings.map(w => {
                const color = w.type === 'DANGER' ? '#ff4444' : w.type === 'CAUTION' ? '#ff8800' : '#ffd700';
                return '<div style="padding:8px 12px;margin:4px 0;background:' + color + '22;border-left:3px solid ' + color + ';border-radius:4px;color:' + color + ';font-size:12px;font-weight:600;">' + w.message + '</div>';
            }).join('');
        } else {
            warningsEl.innerHTML = '';
        }

        // Events list
        if (news.events && news.events.length > 0) {
            const impactIcon = {high: '🔴', medium: '🟡', low: '🟢'};
            eventsEl.innerHTML = news.events.map(e => {
                const icon = impactIcon[e.impact] || '⚪';
                const actual = e.actual !== null ? ' <span style="color:#00ff88;">✓ ' + e.actual + e.unit + '</span>' : '';
                return '<div style="padding:4px 0;border-bottom:1px solid #1a1a2e;display:flex;justify-content:space-between;align-items:center;">' +
                    '<span>' + icon + ' <strong>' + e.time + '</strong> ' + e.event + actual + '</span>' +
                    '<span style="color:#666;font-size:10px;">' + e.country + '</span>' +
                    '</div>';
            }).join('');
            if (countEl) countEl.textContent = news.total_high_impact + ' high impact';
        } else {
            eventsEl.innerHTML = '<div style="color:#555;padding:8px 0;">No major events today</div>';
        }
    }

    function playSignalSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 880; osc.type = 'sine'; gain.gain.value = 0.3;
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.stop(ctx.currentTime + 0.5);
            setTimeout(() => {
                const o2 = ctx.createOscillator();
                const g2 = ctx.createGain();
                o2.connect(g2); g2.connect(ctx.destination);
                o2.frequency.value = 1100; o2.type = 'sine'; g2.gain.value = 0.3;
                o2.start();
                g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                o2.stop(ctx.currentTime + 0.5);
            }, 200);
        } catch(e) {}
    }

    async function fetchRealAccount() {
        try {
            const response = await fetch('http://localhost:5000/api/account');
            if (!response.ok) return;
            const data = await response.json();
            if (data.error) return;

            accountState.balance = data.balance || 0;
            accountState.equity = data.equity || 0;
            accountState.margin = data.margin || 0;
            accountState.dailyPnl = data.daily_pnl || data.profit || 0;
            
            updateAccountUI();
        } catch (e) {
            // Silent fail
        }
    }

    async function fetchRealTrades() {
        try {
            const response = await fetch('http://localhost:5000/api/trades');
            if (!response.ok) return;
            const data = await response.json();
            if (data.error) return;

            // Update open positions count
            const openPositions = data.open_positions || [];
            accountState.openPositions = openPositions.length;

            // Update trade history table
            updateTradeHistoryTable(data.active || [], data.history || [], openPositions);

            // Calculate performance from history
            const allTrades = [...(data.history || []), ...(data.active || [])];
            if (allTrades.length > 0) {
                let wins = 0, losses = 0, totalProfit = 0, totalLoss = 0;
                allTrades.forEach(t => {
                    if (t.pnl !== undefined) {
                        if (t.pnl >= 0) { wins++; totalProfit += t.pnl; }
                        else { losses++; totalLoss += Math.abs(t.pnl); }
                    }
                });
                performance.totalTrades = wins + losses;
                performance.winTrades = wins;
                performance.lossTrades = losses;
                performance.totalProfit = totalProfit;
                performance.totalLoss = totalLoss;
                performance.winRate = performance.totalTrades > 0 ? 
                    parseFloat(((wins / performance.totalTrades) * 100).toFixed(1)) : 0;
                performance.profitFactor = totalLoss > 0 ? 
                    parseFloat((totalProfit / totalLoss).toFixed(2)) : totalProfit > 0 ? 999 : 0;
                updatePerformanceUI();
            }
        } catch (e) {
            // Silent fail
        }
    }

    /**
     * Fetch real candle data for chart
     */
    async function fetchRealCandles(timeframe = 'M15', count = 200) {
        try {
            const response = await fetch(`http://localhost:5000/api/candles?timeframe=${timeframe}&count=${count}`);
            if (!response.ok) return null;
            const data = await response.json();
            if (data.error) return null;
            return data;
        } catch (e) {
            return null;
        }
    }

    /**
     * Execute real trade via backend
     */
    async function executeRealTrade(type) {
        if (!isConnected) {
            addLog('warning', '❌ Cannot trade — backend not connected');
            return null;
        }

        if (!currentSignal || !currentSignal.is_tradeable) {
            addLog('warning', '❌ Cannot trade — no tradeable signal');
            return null;
        }

        addLog('info', `⏳ Executing ${type.toUpperCase()} trade...`);

        try {
            const response = await fetch('http://localhost:5000/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: type,
                    price: currentSignal.price,
                    sl: currentSignal.sl,
                    tp: currentSignal.tp,
                    sl_distance: currentSignal.sl_distance,
                    tp_distance: currentSignal.tp_distance,
                    score: currentSignal.score
                })
            });

            const result = await response.json();

            if (result.success) {
                addLog(type, `✅ TRADE EXECUTED — Ticket #${result.ticket}`);
                addLog(type, `   Entry: ${currentSignal.price} | SL: ${currentSignal.sl} | TP: ${currentSignal.tp}`);
                // Refresh trades
                setTimeout(() => fetchRealTrades(), 1000);
                return result;
            } else {
                addLog('warning', `❌ Trade FAILED: ${result.error}`);
                return result;
            }
        } catch (e) {
            addLog('warning', `❌ Trade error: ${e.message}`);
            return null;
        }
    }

    /**
     * Close trade via backend
     */
    async function closeRealTrade(ticket) {
        if (!isConnected) return null;

        try {
            const response = await fetch('http://localhost:5000/api/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticket })
            });
            const result = await response.json();
            
            if (result.success) {
                addLog('info', `Trade #${ticket} closed — P&L: $${result.pnl?.toFixed(2)}`);
                setTimeout(() => fetchRealTrades(), 1000);
            }
            return result;
        } catch (e) {
            return null;
        }
    }

    // ============ UI Update Functions ============

    function updatePriceUI() {
        const priceEl = document.getElementById('price-value');
        const changeEl = document.getElementById('price-change');
        const bidEl = document.getElementById('bid-price');
        const askEl = document.getElementById('ask-price');
        const highEl = document.getElementById('high-price');
        const lowEl = document.getElementById('low-price');
        const spreadEl = document.getElementById('spread-display');

        if (priceState.current === 0) {
            if (priceEl) priceEl.textContent = 'WAITING...';
            return;
        }

        if (priceEl) {
            priceEl.textContent = priceState.current.toFixed(2);
            priceEl.classList.remove('tick-up', 'tick-down');
            priceEl.classList.add(priceState.lastTick === 'up' ? 'tick-up' : 'tick-down');
            setTimeout(() => priceEl.classList.remove('tick-up', 'tick-down'), 300);
        }

        const change = priceState.current - priceState.open;
        const changePct = priceState.open > 0 ? ((change / priceState.open) * 100) : 0;
        if (changeEl) {
            changeEl.className = `price-change ${change >= 0 ? 'up' : 'down'}`;
            changeEl.innerHTML = `
                <span class="change-arrow">${change >= 0 ? '▲' : '▼'}</span>
                <span class="change-value">${change >= 0 ? '+' : ''}${change.toFixed(2)}</span>
                <span class="change-pct">(${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%)</span>
            `;
        }

        if (bidEl) bidEl.textContent = priceState.bid > 0 ? priceState.bid.toFixed(2) : '--';
        if (askEl) askEl.textContent = priceState.ask > 0 ? priceState.ask.toFixed(2) : '--';
        if (highEl) highEl.textContent = priceState.high > 0 ? priceState.high.toFixed(2) : '--';
        if (lowEl) lowEl.textContent = priceState.low > 0 ? priceState.low.toFixed(2) : '--';
        if (spreadEl) spreadEl.textContent = `Spread: ${priceState.spread > 0 ? priceState.spread.toFixed(1) : '--'}`;
    }

    function updateSignalUI(signal) {
        if (!signal) return;

        const dirEl = document.getElementById('signal-direction');
        const confBar = document.getElementById('confidence-bar');
        const confVal = document.getElementById('confidence-value');
        const mlProb = document.getElementById('ml-prob');
        const rrEl = document.getElementById('risk-reward');
        const timeEl = document.getElementById('signal-time');
        const slEl = document.getElementById('sl-value');
        const tpEl = document.getElementById('tp-value');
        const riskAmt = document.getElementById('risk-amount');
        const rewardAmt = document.getElementById('reward-amount');

        if (dirEl) {
            dirEl.className = `signal-direction ${signal.direction || 'waiting'}`;
            let icon = '⏳', text = 'ANALYZING';
            if (signal.direction === 'buy') { icon = '🟢'; text = 'BUY'; }
            if (signal.direction === 'sell') { icon = '🔴'; text = 'SELL'; }
            dirEl.innerHTML = `
                <span class="signal-icon">${icon}</span>
                <span class="signal-text">${text}</span>
                ${signal.is_tradeable ? '<span class="signal-badge" style="background:rgba(251,191,36,0.2);color:#fbbf24;padding:2px 8px;border-radius:4px;font-size:0.6rem;font-weight:800;letter-spacing:1px;margin-left:8px;">STRONG</span>' : ''}
            `;
        }

        const maxScore = signal.max_score || 10;
        if (confBar) confBar.style.width = `${(signal.score / maxScore) * 100}%`;
        if (confVal) confVal.textContent = `${signal.score}/${maxScore}`;
        if (mlProb) mlProb.textContent = `${signal.ml_probability || 0}%`;
        if (rrEl) rrEl.textContent = signal.risk_reward || '--';
        if (timeEl) timeEl.textContent = signal.time || '--';

        if (signal.sl) {
            if (slEl) slEl.textContent = typeof signal.sl === 'number' ? signal.sl.toFixed(2) : signal.sl;
            if (tpEl) tpEl.textContent = typeof signal.tp === 'number' ? signal.tp.toFixed(2) : signal.tp;
            
            const slDist = signal.sl_distance || 0;
            const tpDist = signal.tp_distance || 0;
            const lot = accountState.lotSize || 0.01;
            if (riskAmt) riskAmt.textContent = `-$${(slDist * lot * 100).toFixed(2)}`;
            if (rewardAmt) rewardAmt.textContent = `+$${(tpDist * lot * 100).toFixed(2)}`;
        }

        // Update action buttons
        const buyBtn = document.getElementById('execute-buy');
        const sellBtn = document.getElementById('execute-sell');
        if (buyBtn) buyBtn.disabled = !(signal.is_tradeable && signal.direction === 'buy');
        if (sellBtn) sellBtn.disabled = !(signal.is_tradeable && signal.direction === 'sell');
    }

    function updateIndicatorsUI() {
        // RSI
        updateSingleIndicator('rsi', indicators.rsi.value, indicators.rsi.signal, 
            indicators.rsi.value > 0 ? indicators.rsi.value.toFixed(1) : '--');
        const rsiBar = document.getElementById('rsi-bar');
        if (rsiBar && indicators.rsi.value > 0) {
            rsiBar.style.width = `${indicators.rsi.value}%`;
            rsiBar.style.background = indicators.rsi.signal === 'buy' ? 'var(--buy-color)' : 
                                      indicators.rsi.signal === 'sell' ? 'var(--sell-color)' : 'var(--gold-500)';
        }

        // MACD
        updateSingleIndicator('macd', indicators.macd.value, indicators.macd.signal,
            indicators.macd.value !== 0 ? indicators.macd.value.toFixed(2) : '--');
        const histBar = document.querySelector('.hist-bar');
        if (histBar && indicators.macd.histogram !== 0) {
            histBar.style.height = `${Math.min(100, Math.abs(indicators.macd.histogram) * 20)}%`;
            histBar.style.background = indicators.macd.histogram > 0 ? 'var(--buy-color)' : 'var(--sell-color)';
        }

        // Bollinger Bands
        updateSingleIndicator('bb', null, indicators.bb.signal, 
            indicators.bb.middle > 0 ? `Mid: ${indicators.bb.middle.toFixed(0)}` : '--');

        // EMA
        updateSingleIndicator('ema', null, indicators.ema.signal, indicators.ema.cross || '--');
        const ema50Val = document.getElementById('ema50-val');
        const ema200Val = document.getElementById('ema200-val');
        if (ema50Val) ema50Val.textContent = indicators.ema.ema50 > 0 ? indicators.ema.ema50.toFixed(2) : '--';
        if (ema200Val) ema200Val.textContent = indicators.ema.ema200 > 0 ? indicators.ema.ema200.toFixed(2) : '--';

        // Ichimoku
        updateSingleIndicator('ichimoku', null, indicators.ichimoku.signal, indicators.ichimoku.cloud || '--');

        // Stochastic RSI
        updateSingleIndicator('stochrsi', indicators.stochrsi.value, indicators.stochrsi.signal,
            indicators.stochrsi.value > 0 ? indicators.stochrsi.value.toFixed(1) : '--');
        const stochBar = document.getElementById('stochrsi-bar');
        if (stochBar && indicators.stochrsi.value > 0) {
            stochBar.style.width = `${indicators.stochrsi.value}%`;
            stochBar.style.background = indicators.stochrsi.signal === 'buy' ? 'var(--buy-color)' : 
                                        indicators.stochrsi.signal === 'sell' ? 'var(--sell-color)' : 'var(--gold-500)';
        }

        // ATR
        const atrSignalEl = document.getElementById('atr-signal');
        if (atrSignalEl) {
            atrSignalEl.textContent = indicators.atr.volatility || '--';
            atrSignalEl.className = `ind-signal ${indicators.atr.volatility === 'HIGH' ? 'sell' : indicators.atr.volatility === 'MEDIUM' ? 'neutral' : 'buy'}`;
        }
        const atrValEl = document.getElementById('atr-value');
        if (atrValEl) atrValEl.textContent = indicators.atr.value > 0 ? indicators.atr.value.toFixed(2) : '--';
        const atrFill = document.querySelector('.atr-fill');
        if (atrFill) atrFill.style.width = `${Math.min(100, indicators.atr.value * 10)}%`;

        // Volume
        const volSignalEl = document.getElementById('volume-signal');
        if (volSignalEl) {
            volSignalEl.textContent = indicators.volume.level || indicators.volume.signal?.toUpperCase() || '--';
            volSignalEl.className = `ind-signal ${indicators.volume.signal}`;
        }
        const volValEl = document.getElementById('volume-value');
        if (volValEl) volValEl.textContent = indicators.volume.value > 0 ? indicators.volume.value.toLocaleString() : '--';
    }

    function updateSingleIndicator(name, value, signal, displayText) {
        const signalEl = document.getElementById(`${name}-signal`);
        const valueEl = document.getElementById(`${name}-value`);
        
        if (signalEl) {
            const displaySignal = signal === 'waiting' ? 'neutral' : signal;
            signalEl.className = `ind-signal ${displaySignal}`;
            signalEl.textContent = signal === 'waiting' ? 'WAITING' : signal.toUpperCase();
        }
        if (valueEl && displayText) valueEl.textContent = displayText;
    }

    function updateAccountUI() {
        const balEl = document.getElementById('account-balance');
        const eqEl = document.getElementById('account-equity');
        const marginEl = document.getElementById('account-margin');
        const pnlEl = document.getElementById('daily-pnl');
        const posEl = document.getElementById('open-positions');
        const lotEl = document.getElementById('lot-size');

        if (balEl) balEl.textContent = accountState.balance > 0 ? `$${accountState.balance.toFixed(2)}` : '--';
        if (eqEl) eqEl.textContent = accountState.equity > 0 ? `$${accountState.equity.toFixed(2)}` : '--';
        if (marginEl) marginEl.textContent = accountState.margin > 0 ? `$${accountState.margin.toFixed(2)}` : '--';
        if (pnlEl) {
            if (accountState.dailyPnl !== 0) {
                pnlEl.textContent = `${accountState.dailyPnl >= 0 ? '+' : ''}$${accountState.dailyPnl.toFixed(2)}`;
                pnlEl.className = `stat-value ${accountState.dailyPnl >= 0 ? 'profit' : 'loss'}`;
            } else {
                pnlEl.textContent = '--';
                pnlEl.className = 'stat-value';
            }
        }
        if (posEl) posEl.textContent = accountState.openPositions;
        if (lotEl) lotEl.textContent = accountState.lotSize.toFixed(2);
    }

    function updatePerformanceUI() {
        const wrEl = document.getElementById('win-rate');
        const ttEl = document.getElementById('total-trades');
        const pfEl = document.getElementById('profit-factor');
        const mdEl = document.getElementById('max-drawdown');

        if (wrEl) wrEl.textContent = performance.totalTrades > 0 ? `${performance.winRate}%` : '--%';
        if (ttEl) ttEl.textContent = performance.totalTrades;
        if (pfEl) pfEl.textContent = performance.profitFactor > 0 ? performance.profitFactor.toFixed(2) : '--';
        if (mdEl) mdEl.textContent = performance.maxDrawdown > 0 ? `${performance.maxDrawdown}%` : '--%';
    }

    function updateTradeHistoryTable(activeTrades, tradeHistory, openPositions) {
        const tbody = document.getElementById('trades-body');
        if (!tbody) return;

        // Combine and show all trades
        const allTrades = [
            ...openPositions.map(p => ({
                time: p.time || '--',
                type: p.type,
                entry: p.price_open,
                sl: p.sl,
                tp: p.tp,
                lot: p.volume,
                score: '--',
                pnl: p.profit,
                status: 'open',
                ticket: p.ticket
            })),
            ...tradeHistory.map(t => ({
                time: t.time || t.close_time || '--',
                type: t.type,
                entry: t.price || t.price_open,
                sl: t.sl || '--',
                tp: t.tp || '--',
                lot: t.volume,
                score: t.score || '--',
                pnl: t.pnl || t.profit || 0,
                status: 'closed'
            }))
        ];

        if (allTrades.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="9">
                        <div class="empty-state">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            <span>No trades yet — waiting for signals from MT5</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = allTrades.map(trade => `
            <tr>
                <td>${typeof trade.time === 'string' ? trade.time.split('T').pop()?.substring(0,8) || trade.time : '--'}</td>
                <td class="type-${trade.type}">${(trade.type || '').toUpperCase()}</td>
                <td>${typeof trade.entry === 'number' ? trade.entry.toFixed(2) : trade.entry}</td>
                <td>${typeof trade.sl === 'number' ? trade.sl.toFixed(2) : trade.sl}</td>
                <td>${typeof trade.tp === 'number' ? trade.tp.toFixed(2) : trade.tp}</td>
                <td>${typeof trade.lot === 'number' ? trade.lot.toFixed(2) : trade.lot}</td>
                <td>${trade.score}</td>
                <td class="${trade.pnl >= 0 ? 'pnl-profit' : 'pnl-loss'}">${trade.pnl >= 0 ? '+' : ''}$${typeof trade.pnl === 'number' ? trade.pnl.toFixed(2) : '0.00'}</td>
                <td><span class="status-badge ${trade.status === 'open' ? 'open' : (trade.pnl >= 0 ? 'closed-win' : 'closed-loss')}">${trade.status === 'open' ? 'OPEN' : (trade.pnl >= 0 ? 'WIN' : 'LOSS')}</span></td>
            </tr>
        `).join('');
    }

    /**
     * Add log entry
     */
    function addLog(type, message) {
        const logEntries = document.getElementById('log-entries');
        if (!logEntries) return;

        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = `
            <span class="log-time">${new Date().toLocaleTimeString()}</span>
            <span class="log-msg">${message}</span>
        `;
        logEntries.appendChild(entry);
        logEntries.scrollTop = logEntries.scrollHeight;

        while (logEntries.children.length > 200) {
            logEntries.removeChild(logEntries.firstChild);
        }
    }

    // ============ Signal History Functions ============

    function saveStrongSignal(signal) {
        const entry = {
            time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            date: new Date().toLocaleDateString('en-GB'),
            direction: signal.direction,
            score: signal.score,
            maxScore: signal.max_score || 10,
            price: signal.price,
            sl: signal.sl,
            tp: signal.tp,
            rr: signal.risk_reward || 'N/A',
            pattern: signal.candle_pattern || 'NONE',
            session: signal.session || '--',
            strength: signal.strength || 'MODERATE',
            ml: signal.ml_probability || 0,
            edge: signal.edge || 0,
            is_tradeable: signal.is_tradeable || false,
        };

        strongSignalHistory.unshift(entry);  // Add to top

        // Keep last 200
        if (strongSignalHistory.length > 200) {
            strongSignalHistory = strongSignalHistory.slice(0, 200);
        }

        // Save to localStorage
        localStorage.setItem('AIOK_signal_history', JSON.stringify(strongSignalHistory));

        // Update UI
        renderSignalHistory();
    }

    function renderSignalHistory(filter) {
        if (filter) currentHistFilter = filter;

        const tbody = document.getElementById('signal-history-body');
        const countEl = document.getElementById('history-count');
        if (!tbody) return;

        // Apply filter
        let filtered = strongSignalHistory;
        if (currentHistFilter === 'strong') {
            filtered = filtered.filter(s => s.score >= 8);
        } else if (currentHistFilter === 'buy') {
            filtered = filtered.filter(s => s.direction === 'buy');
        } else if (currentHistFilter === 'sell') {
            filtered = filtered.filter(s => s.direction === 'sell');
        }

        if (countEl) countEl.textContent = `${filtered.length} signals`;

        if (filtered.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="10">
                        <div class="empty-state">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                            <span>Waiting for strong signals (6+/10)...</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filtered.map((s, i) => {
            const dirClass = s.direction === 'buy' ? 'dir-buy' : 'dir-sell';
            const scoreClass = s.score >= 10 ? 'score-high' : 'score-med';
            let strengthClass = 'moderate';
            if (s.strength === 'VERY STRONG') strengthClass = 'very-strong';
            else if (s.strength === 'STRONG') strengthClass = 'strong';
            const isNew = i === 0 ? 'new-signal' : '';
            const tradeIcon = s.is_tradeable ? ' *' : '';

            return `
                <tr class="${isNew}">
                    <td>${s.date ? s.date + ' ' : ''}${s.time}</td>
                    <td class="${dirClass}">${s.direction.toUpperCase()}${tradeIcon}</td>
                    <td class="${scoreClass}">${s.score}/${s.maxScore}</td>
                    <td>${typeof s.price === 'number' ? s.price.toFixed(2) : s.price}</td>
                    <td>${s.sl ? (typeof s.sl === 'number' ? s.sl.toFixed(2) : s.sl) : '--'}</td>
                    <td>${s.tp ? (typeof s.tp === 'number' ? s.tp.toFixed(2) : s.tp) : '--'}</td>
                    <td>${s.rr}</td>
                    <td>${s.pattern !== 'NONE' ? s.pattern : '--'}</td>
                    <td>${s.session || '--'}</td>
                    <td><span class="strength-badge ${strengthClass}">${s.strength}</span></td>
                </tr>
            `;
        }).join('');
    }

    function initSignalHistoryUI() {
        // Render saved history on load
        renderSignalHistory();

        // Filter buttons
        document.querySelectorAll('[data-hist-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-hist-filter]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderSignalHistory(btn.dataset.histFilter);
            });
        });

        // Clear button
        const clearBtn = document.getElementById('hist-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Clear all signal history?')) {
                    strongSignalHistory = [];
                    localStorage.removeItem('AIOK_signal_history');
                    renderSignalHistory();
                }
            });
        }
    }

    return {
        init,
        fetchRealCandles,
        executeRealTrade,
        closeRealTrade,
        addLog,
        initSignalHistoryUI,
        get currentSignal() { return currentSignal; },
        get indicators() { return indicators; },
        get priceState() { return priceState; },
        get accountState() { return accountState; },
        get performance() { return performance; },
        get isConnected() { return isConnected; },
        get strongSignalHistory() { return strongSignalHistory; },
    };
})();

// Global button handlers for signal lifecycle
async function enterTrade() {
    try {
        const res = await fetch('http://localhost:5000/api/signal/enter', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            console.log('[SIGNAL] Entered trade — tracking TPs...');
        }
    } catch(e) { console.error('Enter failed:', e); }
}

async function skipSignal() {
    try {
        const res = await fetch('http://localhost:5000/api/signal/skip', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            console.log('[SIGNAL] Skipped — scanning for next...');
        }
    } catch(e) { console.error('Skip failed:', e); }
}

async function closeTrade() {
    try {
        const res = await fetch('http://localhost:5000/api/signal/close', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            console.log('[SIGNAL] Trade closed manually');
        }
    } catch(e) { console.error('Close failed:', e); }
}
