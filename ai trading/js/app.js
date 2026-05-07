/**
 * AIOK Trading — Main Application Controller
 * 100% REAL MODE — All data from MT5 backend
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('%c🤖 AIOK Trading — XAUUSD Trading Intelligence', 
        'color: #fbbf24; font-size: 18px; font-weight: bold;');
    console.log('%c⚡ 100% LIVE MODE — All data from MT5 backend', 
        'color: #00e676; font-size: 12px;');

    // ====== Initialize Modules ======
    initHeader();
    ChartModule.init('chart-container');
    SignalEngine.init();
    SignalEngine.initSignalHistoryUI();
    initEventListeners();
    loadRealChartData();

    // Periodically reload chart data
    setInterval(() => {
        if (SignalEngine.isConnected) {
            loadRealChartData();
        }
    }, 30000); // Every 30 seconds

    // ====== Header Clock ======
    function initHeader() {
        updateClock();
        setInterval(updateClock, 1000);
    }

    function updateClock() {
        const timeEl = document.getElementById('header-time');
        if (timeEl) {
            timeEl.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
        }
    }

    // ====== Load real chart data from MT5 ======
    async function loadRealChartData() {
        const tf = document.querySelector('.tf-btn.active')?.dataset.tf || 'M15';
        const candles = await SignalEngine.fetchRealCandles(tf, 200);
        
        if (candles && candles.length > 0) {
            ChartModule.updateCandles(candles);
            SignalEngine.addLog('info', `📊 Chart loaded: ${candles.length} real ${tf} candles from MT5`);
        }
    }

    // ====== Event Listeners ======
    function initEventListeners() {
        // Timeframe selector
        document.querySelectorAll('.tf-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tf = btn.dataset.tf;
                const tfLabel = document.getElementById('chart-tf-label');
                if (tfLabel) tfLabel.textContent = tf;
                SignalEngine.addLog('info', `Switched to ${tf} timeframe`);
                
                // Reload chart with real data for new timeframe
                loadRealChartData();
            });
        });

        // Mode selector
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const mode = btn.dataset.mode;
                
                const actionsEl = document.getElementById('signal-actions');
                if (actionsEl) {
                    actionsEl.style.display = mode === 'signal' ? 'none' : 'grid';
                }

                const modeNames = { signal: 'Signal Only', semi: 'Semi-Auto', auto: 'Full Auto' };
                SignalEngine.addLog('info', `Mode: ${modeNames[mode]}`);
                
                if (mode === 'auto') {
                    SignalEngine.addLog('warning', '⚠️ AUTO MODE — Trades will execute automatically on STRONG signals!');
                }

                // Send mode to backend
                fetch('http://localhost:5000/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode })
                }).catch(() => {});
            });
        });

        // Chart type controls
        document.querySelectorAll('.chart-ctrl-btn[data-type]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.chart-ctrl-btn[data-type]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                ChartModule.setChartType(btn.dataset.type);
            });
        });

        // Indicator toggle
        const toggleBtn = document.getElementById('toggle-indicators');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const visible = ChartModule.toggleIndicators();
                toggleBtn.classList.toggle('active', visible);
            });
        }

        // REAL Trade execution buttons
        const buyBtn = document.getElementById('execute-buy');
        const sellBtn = document.getElementById('execute-sell');
        
        if (buyBtn) {
            buyBtn.addEventListener('click', () => {
                if (confirm('⚠️ EXECUTE REAL BUY TRADE on MT5?\n\nThis will open a REAL position with real money.')) {
                    SignalEngine.executeRealTrade('buy');
                }
            });
        }
        if (sellBtn) {
            sellBtn.addEventListener('click', () => {
                if (confirm('⚠️ EXECUTE REAL SELL TRADE on MT5?\n\nThis will open a REAL position with real money.')) {
                    SignalEngine.executeRealTrade('sell');
                }
            });
        }

        // Trade filter
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                filterTrades(btn.dataset.filter);
            });
        });

        // Signal log toggle
        const logToggle = document.getElementById('log-toggle');
        const signalLog = document.getElementById('signal-log');
        if (logToggle && signalLog) {
            logToggle.addEventListener('click', () => {
                signalLog.classList.toggle('open');
                logToggle.textContent = signalLog.classList.contains('open') ? '▶' : '◀';
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'l' || e.key === 'L') {
                const log = document.getElementById('signal-log');
                const toggle = document.getElementById('log-toggle');
                if (log) {
                    log.classList.toggle('open');
                    if (toggle) toggle.textContent = log.classList.contains('open') ? '▶' : '◀';
                }
            }
        });
    }

    // ====== Trade Filtering ======
    function filterTrades(filter) {
        const rows = document.querySelectorAll('#trades-body tr:not(.empty-row)');
        rows.forEach(row => {
            const statusBadge = row.querySelector('.status-badge');
            if (!statusBadge) return;
            
            if (filter === 'all') {
                row.style.display = '';
            } else if (filter === 'open') {
                row.style.display = statusBadge.classList.contains('open') ? '' : 'none';
            } else if (filter === 'closed') {
                row.style.display = !statusBadge.classList.contains('open') ? '' : 'none';
            }
        });
    }
});
