/**
 * AIOK Trading — Auto Bot Dashboard Controller
 * Controls the autonomous trading bot from the UI
 */

class AutoBotController {
    constructor() {
        this.BASE_URL = 'http://localhost:5000';
        this.status = null;
        this.updateInterval = null;
        this.isUpdating = false;
    }

    /**
     * Initialize the bot panel and start polling
     */
    init() {
        this.bindEvents();
        this.startPolling();
        console.log('[AutoBot] Controller initialized');
    }

    /**
     * Bind click events to bot control buttons
     */
    bindEvents() {
        const startBtn = document.getElementById('bot-start-btn');
        const stopBtn = document.getElementById('bot-stop-btn');
        const emergencyBtn = document.getElementById('bot-emergency-btn');
        const settingsBtn = document.getElementById('bot-save-settings');

        if (startBtn) startBtn.addEventListener('click', () => this.startBot());
        if (stopBtn) stopBtn.addEventListener('click', () => this.stopBot());
        if (emergencyBtn) emergencyBtn.addEventListener('click', () => this.emergencyStop());
        if (settingsBtn) settingsBtn.addEventListener('click', () => this.saveSettings());
    }

    /**
     * Start polling bot status every 3 seconds
     */
    startPolling() {
        this.fetchStatus();
        this.updateInterval = setInterval(() => this.fetchStatus(), 3000);
    }

    /**
     * Fetch bot status from API
     */
    async fetchStatus() {
        if (this.isUpdating) return;
        this.isUpdating = true;

        try {
            const resp = await fetch(this.BASE_URL + '/api/auto/status');
            if (resp.ok) {
                this.status = await resp.json();
                this.updateUI();
            }
        } catch (e) {
            console.warn('[AutoBot] Status fetch failed:', e.message);
        } finally {
            this.isUpdating = false;
        }
    }

    /**
     * Start the auto trading bot
     */
    async startBot() {
        try {
            const resp = await fetch(this.BASE_URL + '/api/auto/start', { method: 'POST' });
            const data = await resp.json();
            if (data.success) {
                this.status = data.status;
                this.updateUI();
                this.showNotification('🟢 Bot ENABLED — scanning for trades...', 'success');
            }
        } catch (e) {
            this.showNotification('Failed to start bot: ' + e.message, 'error');
        }
    }

    /**
     * Stop the auto trading bot
     */
    async stopBot() {
        try {
            const resp = await fetch(this.BASE_URL + '/api/auto/stop', { method: 'POST' });
            const data = await resp.json();
            if (data.success) {
                this.status = data.status;
                this.updateUI();
                this.showNotification('🔴 Bot DISABLED', 'warning');
            }
        } catch (e) {
            this.showNotification('Failed to stop bot: ' + e.message, 'error');
        }
    }

    /**
     * Emergency stop — close all trades and disable
     */
    async emergencyStop() {
        if (!confirm('⚠️ EMERGENCY STOP!\n\nThis will:\n- Disable the bot\n- Close ALL open trades immediately\n\nAre you sure?')) {
            return;
        }
        try {
            const resp = await fetch(this.BASE_URL + '/api/auto/emergency', { method: 'POST' });
            const data = await resp.json();
            if (data.success) {
                this.status = data.status;
                this.updateUI();
                this.showNotification('🚨 EMERGENCY STOP — all trades closed', 'error');
            }
        } catch (e) {
            this.showNotification('Emergency stop failed: ' + e.message, 'error');
        }
    }

    /**
     * Save bot settings
     */
    async saveSettings() {
        const settings = {
            lot_size: parseFloat(document.getElementById('bot-lot-size')?.value || 0.01),
            scalp_tp: parseFloat(document.getElementById('bot-tp')?.value || 5),
            scalp_sl: parseFloat(document.getElementById('bot-sl')?.value || 4),
            daily_target: parseFloat(document.getElementById('bot-daily-target')?.value || 3),
            daily_loss: parseFloat(document.getElementById('bot-daily-loss')?.value || 2),
            min_score: parseInt(document.getElementById('bot-min-score')?.value || 7),
            max_trades: parseInt(document.getElementById('bot-max-trades')?.value || 5),
        };

        try {
            const resp = await fetch(this.BASE_URL + '/api/auto/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            const data = await resp.json();
            if (data.success) {
                this.showNotification('✅ Settings saved!', 'success');
            }
        } catch (e) {
            this.showNotification('Failed to save settings: ' + e.message, 'error');
        }
    }

    /**
     * Update the dashboard UI with current bot status
     */
    updateUI() {
        if (!this.status) return;
        const s = this.status;

        // Power button state
        const powerIndicator = document.getElementById('bot-power-indicator');
        const startBtn = document.getElementById('bot-start-btn');
        const stopBtn = document.getElementById('bot-stop-btn');

        if (powerIndicator) {
            if (s.enabled) {
                powerIndicator.className = 'bot-power-indicator active';
                powerIndicator.textContent = '🟢 BOT ACTIVE';
            } else {
                powerIndicator.className = 'bot-power-indicator inactive';
                powerIndicator.textContent = '🔴 BOT OFF';
            }
        }

        if (startBtn) startBtn.style.display = s.enabled ? 'none' : 'inline-flex';
        if (stopBtn) stopBtn.style.display = s.enabled ? 'inline-flex' : 'none';

        // Status message
        const statusMsg = document.getElementById('bot-status-message');
        if (statusMsg) statusMsg.textContent = s.status_message || 'Idle';

        // Daily P&L
        const pnlEl = document.getElementById('bot-daily-pnl');
        if (pnlEl) {
            const pnl = s.daily_pnl || 0;
            pnlEl.textContent = (pnl >= 0 ? '+$' : '-$') + Math.abs(pnl).toFixed(2);
            pnlEl.className = 'bot-stat-value ' + (pnl >= 0 ? 'positive' : 'negative');
        }

        // P&L progress bar
        const pnlBar = document.getElementById('bot-pnl-bar');
        if (pnlBar) {
            const pnl = s.daily_pnl || 0;
            const target = s.daily_profit_target || 3;
            const lossLimit = s.daily_loss_limit || 2;
            // Normalize: -lossLimit to +target mapped to 0-100%
            const total = lossLimit + target;
            const percent = Math.min(100, Math.max(0, ((pnl + lossLimit) / total) * 100));
            pnlBar.style.width = percent + '%';
            pnlBar.className = 'bot-pnl-bar-fill ' + (pnl >= 0 ? 'positive' : 'negative');
        }

        // Stats
        this._setText('bot-daily-trades', s.daily_trades || 0);
        this._setText('bot-daily-wins', s.daily_wins || 0);
        this._setText('bot-daily-losses', s.daily_losses || 0);
        this._setText('bot-win-rate', (s.win_rate || 0) + '%');
        this._setText('bot-streak', s.consecutive_losses > 0 ? 'L' + s.consecutive_losses : 'W');

        // Current trade
        const tradePanel = document.getElementById('bot-current-trade');
        if (tradePanel) {
            if (s.has_open_trade && s.current_trade) {
                const t = s.current_trade;
                tradePanel.style.display = 'block';
                tradePanel.innerHTML = `
                    <div class="bot-trade-info">
                        <span class="bot-trade-direction ${t.direction}">${t.direction.toUpperCase()}</span>
                        <span class="bot-trade-price">@ ${t.entry_price?.toFixed(2)}</span>
                        <span class="bot-trade-detail">SL: ${t.sl?.toFixed(2)} | TP: ${t.tp?.toFixed(2)}</span>
                        <span class="bot-trade-detail">${t.break_even ? '🛡️ Break-Even Active' : '⏳ Monitoring...'}</span>
                    </div>
                `;
            } else {
                tradePanel.style.display = 'none';
            }
        }

        // Trade history
        const historyEl = document.getElementById('bot-history-list');
        if (historyEl && s.history && s.history.length > 0) {
            historyEl.innerHTML = s.history.slice().reverse().map(t => `
                <div class="bot-history-item ${t.result === 'WIN' ? 'win' : 'loss'}">
                    <span class="bot-hist-dir">${t.direction?.toUpperCase()}</span>
                    <span class="bot-hist-price">@ ${t.entry_price?.toFixed(2)}</span>
                    <span class="bot-hist-pnl ${t.pnl >= 0 ? 'positive' : 'negative'}">
                        ${t.pnl >= 0 ? '+' : ''}$${t.pnl?.toFixed(2)}
                    </span>
                    <span class="bot-hist-time">${t.close_time ? new Date(t.close_time).toLocaleTimeString() : ''}</span>
                </div>
            `).join('');
        } else if (historyEl) {
            historyEl.innerHTML = '<div class="bot-history-empty">No trades yet today</div>';
        }

        // Update settings inputs to reflect current values
        if (s.settings) {
            this._setInput('bot-lot-size', s.settings.lot_size);
            this._setInput('bot-tp', s.settings.scalp_tp);
            this._setInput('bot-sl', s.settings.scalp_sl);
            this._setInput('bot-min-score', s.settings.min_score);
            this._setInput('bot-max-trades', s.settings.max_trades);
            this._setInput('bot-daily-target', s.daily_profit_target);
            this._setInput('bot-daily-loss', s.daily_loss_limit);
        }

        // Target/Loss status badges
        const targetBadge = document.getElementById('bot-target-badge');
        if (targetBadge) {
            if (s.target_reached) {
                targetBadge.textContent = '🎯 TARGET REACHED!';
                targetBadge.className = 'bot-badge success';
                targetBadge.style.display = 'inline-block';
            } else if (s.loss_limit_hit) {
                targetBadge.textContent = '🛑 LOSS LIMIT HIT';
                targetBadge.className = 'bot-badge danger';
                targetBadge.style.display = 'inline-block';
            } else {
                targetBadge.style.display = 'none';
            }
        }
    }

    /**
     * Helper: set text content by ID
     */
    _setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    /**
     * Helper: set input value (only if not focused)
     */
    _setInput(id, value) {
        const el = document.getElementById(id);
        if (el && document.activeElement !== el) {
            el.value = value;
        }
    }

    /**
     * Show a notification toast
     */
    showNotification(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'bot-toast ' + type;
        toast.textContent = message;
        
        // Find or create container
        let container = document.getElementById('bot-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'bot-toast-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(toast);

        // Auto remove after 4s
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    }
}

// Initialize on page load
const autoBotCtrl = new AutoBotController();
document.addEventListener('DOMContentLoaded', () => autoBotCtrl.init());
