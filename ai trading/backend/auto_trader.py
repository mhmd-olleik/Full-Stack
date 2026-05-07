"""
AIOK Trading — FLASH SCALPING BOT ⚡
==================================
Ultra-fast scalping bot: NO signal waiting.
Uses quick momentum detection → opens immediately → closes on small profit.
Repeats until daily target reached.

Strategy: Open → TP hit ($1-3) → Close → Re-open instantly → Repeat
         Open → SL hit ($2)   → Close → Stop or cooldown
"""

import threading
import time
import logging
from datetime import datetime, timedelta

import MetaTrader5 as mt5

from mt5_connector import connector
from signal_generator import signal_generator, news_calendar
from trade_executor import trade_executor
from risk_manager import risk_manager

logger = logging.getLogger('FlashBot')


class AutoTrader(threading.Thread):
    """
    Flash Scalping Bot — ultra fast, no AI signal dependency.
    Uses simple EMA + momentum to pick direction, then enters immediately.
    """

    def __init__(self):
        super().__init__(daemon=True)
        self.name = 'FlashBot'

        # === STATE ===
        self.enabled = False
        self.running = False
        self.paused = False

        # === FLASH SETTINGS ===
        self.lot_size = 0.01          # Micro lot
        self.scalp_tp_points = 3.0    # ⚡ TP: $3 move
        self.scalp_sl_points = 2.0    # ⚡ SL: $2 move
        self.max_trade_duration = 10  # ⚡ Max 10 min per trade
        self.max_trades_per_day = 20  # ⚡ Many trades allowed

        # === DAILY TARGETS ===
        self.daily_profit_target = 10.0
        self.daily_loss_limit = 2.0
        self.daily_pnl = 0.0
        self.daily_trades = 0
        self.daily_wins = 0
        self.daily_losses = 0
        self.last_reset_date = None

        # === CURRENT TRADE ===
        self.current_trade = None
        self.trade_open_time = None

        # === LOSS STREAK ===
        self.consecutive_losses = 0
        self.max_consecutive_losses = 2   # ⚡ Stop after 2 losses
        self.cooldown_until = None

        # === HISTORY ===
        self.trade_history = []
        self.all_time_history = []

        # === FLASH TIMING ===
        self.scan_interval = 3        # ⚡ Scan every 3 seconds
        self.monitor_interval = 1     # ⚡ Monitor every 1 second
        self.last_scan_time = 0
        self.flash_mode = True

        # === QUICK DIRECTION SETTINGS ===
        self.ema_fast = 5             # Fast EMA period
        self.ema_slow = 13            # Slow EMA period
        self.momentum_candles = 3     # Check last N candles

        # === STATUS ===
        self.status_message = 'Bot stopped'
        self.last_action = ''
        self.last_action_time = None

        # Expose settings names for dashboard
        self.min_score = 0   # Not used in flash mode, but needed for API compat
        self.min_edge = 0

    # ============================================
    # MAIN LOOP
    # ============================================

    def run(self):
        """Main bot loop"""
        self.running = True
        logger.info("=" * 50)
        logger.info("[FLASH] ⚡ Flash Scalping Bot STARTED")
        logger.info("=" * 50)

        while self.running:
            try:
                if not self.enabled:
                    self.status_message = 'Bot OFF — press START to enable'
                    time.sleep(2)
                    continue

                # Daily reset
                self._daily_reset()

                # Check cooldown
                if self._is_paused():
                    time.sleep(2)
                    continue

                # Check daily limits
                if self._daily_limits_reached():
                    time.sleep(5)
                    continue

                # If we have an open trade — monitor it
                if self.current_trade:
                    self._monitor_trade()
                    time.sleep(self.monitor_interval)
                    continue

                # ⚡ FLASH: Quick scan and enter
                now = time.time()
                if now - self.last_scan_time >= self.scan_interval:
                    self._flash_scan()
                    self.last_scan_time = now

                time.sleep(0.5)  # Very fast loop

            except Exception as e:
                logger.error("[FLASH] Error: %s", e, exc_info=True)
                self.status_message = 'Error: %s' % str(e)
                time.sleep(5)

    # ============================================
    # ⚡ FLASH SCAN — Quick Direction Detection
    # ============================================

    def _flash_scan(self):
        """Ultra-fast scan: EMA crossover + momentum → immediate entry"""

        if not connector.connected:
            self.status_message = 'MT5 disconnected — waiting...'
            return

        # Check if already have open positions
        open_positions = connector.get_open_positions()
        if len(open_positions) > 0:
            self.status_message = 'Position open — monitoring...'
            return

        self.status_message = '⚡ FLASH scanning...'

        # ========================================
        # QUICK DIRECTION: Use M1 candles (fastest)
        # ========================================
        try:
            rates = mt5.copy_rates_from_pos(connector.symbol, mt5.TIMEFRAME_M1, 0, 30)
            if rates is None or len(rates) < 20:
                self.status_message = '⚡ Waiting for candle data...'
                return
        except Exception as e:
            self.status_message = 'Data error: %s' % str(e)
            return

        # Calculate quick EMAs
        closes = [r[4] for r in rates]  # Close prices

        ema_fast = self._calc_ema(closes, self.ema_fast)
        ema_slow = self._calc_ema(closes, self.ema_slow)

        # Current values
        fast_now = ema_fast[-1]
        slow_now = ema_slow[-1]
        fast_prev = ema_fast[-2]
        slow_prev = ema_slow[-2]

        # Current price
        current_price = closes[-1]

        # ========================================
        # DIRECTION LOGIC:
        # 1. EMA crossover direction
        # 2. Last 3 candles momentum
        # 3. Price vs EMAs
        # ========================================

        # EMA signal
        ema_bullish = fast_now > slow_now
        ema_crossing_up = fast_prev <= slow_prev and fast_now > slow_now
        ema_crossing_down = fast_prev >= slow_prev and fast_now < slow_now

        # Momentum: check last N candles
        recent_closes = closes[-self.momentum_candles:]
        momentum_up = all(recent_closes[i] >= recent_closes[i-1] for i in range(1, len(recent_closes)))
        momentum_down = all(recent_closes[i] <= recent_closes[i-1] for i in range(1, len(recent_closes)))

        # Price position
        price_above_emas = current_price > fast_now and current_price > slow_now
        price_below_emas = current_price < fast_now and current_price < slow_now

        # ========================================
        # DECIDE DIRECTION
        # ========================================
        direction = None
        reason = ''

        # Strong BUY: EMA crossing up OR (bullish EMA + momentum up + price above)
        if ema_crossing_up:
            direction = 'buy'
            reason = 'EMA cross UP'
        elif ema_bullish and momentum_up and price_above_emas:
            direction = 'buy'
            reason = 'Bullish momentum'
        # Strong SELL: EMA crossing down OR (bearish EMA + momentum down + price below)
        elif ema_crossing_down:
            direction = 'sell'
            reason = 'EMA cross DOWN'
        elif not ema_bullish and momentum_down and price_below_emas:
            direction = 'sell'
            reason = 'Bearish momentum'

        if direction is None:
            self.status_message = '⚡ No clear direction — scanning... (EMA: %s)' % (
                'BULL' if ema_bullish else 'BEAR')
            return

        # ⚡ GO! Execute flash trade immediately
        logger.info("[FLASH] ⚡ DIRECTION: %s | Reason: %s | Price: %.2f",
                    direction.upper(), reason, current_price)

        self._execute_flash(direction, current_price, reason)

    def _calc_ema(self, data, period):
        """Calculate EMA from price array"""
        ema = [data[0]]
        multiplier = 2.0 / (period + 1)
        for i in range(1, len(data)):
            val = (data[i] * multiplier) + (ema[-1] * (1 - multiplier))
            ema.append(val)
        return ema

    # ============================================
    # ⚡ FLASH EXECUTE — Immediate Entry
    # ============================================

    def _execute_flash(self, direction, price, reason=''):
        """Execute a flash scalp trade — immediate entry"""

        tick = mt5.symbol_info_tick(connector.symbol)
        if tick is None:
            self.status_message = 'Cannot get tick — skipping'
            return

        if direction == 'buy':
            order_type = mt5.ORDER_TYPE_BUY
            execution_price = tick.ask
            sl = round(execution_price - self.scalp_sl_points, 2)
            tp = round(execution_price + self.scalp_tp_points, 2)
        else:
            order_type = mt5.ORDER_TYPE_SELL
            execution_price = tick.bid
            sl = round(execution_price + self.scalp_sl_points, 2)
            tp = round(execution_price - self.scalp_tp_points, 2)

        # Quick balance check
        account = connector.get_account_info()
        if not account or account.get('balance', 0) < 20:
            self.status_message = 'Balance too low!'
            return

        # Send order
        request = {
            'action': mt5.TRADE_ACTION_DEAL,
            'symbol': connector.symbol,
            'volume': self.lot_size,
            'type': order_type,
            'price': execution_price,
            'sl': sl,
            'tp': tp,
            'magic': 202505,
            'comment': 'FLASH %s' % reason[:15],
            'type_time': mt5.ORDER_TIME_GTC,
            'type_filling': mt5.ORDER_FILLING_IOC,
        }

        logger.info("[FLASH] ⚡ EXECUTING: %s %.2f @ %.2f | SL=%.2f | TP=%.2f",
                    direction.upper(), self.lot_size, execution_price, sl, tp)

        result = mt5.order_send(request)

        if result is None:
            error = mt5.last_error()
            self.status_message = 'Order failed: %s' % str(error)
            logger.error("[FLASH] Order failed: %s", error)
            return

        if result.retcode != mt5.TRADE_RETCODE_DONE:
            self.status_message = 'Rejected: %s' % result.comment
            logger.error("[FLASH] Rejected: %s (code: %d)", result.comment, result.retcode)
            return

        # ✅ SUCCESS
        self.current_trade = {
            'ticket': result.order,
            'direction': direction,
            'volume': self.lot_size,
            'entry_price': execution_price,
            'sl': sl,
            'tp': tp,
            'reason': reason,
            'open_time': datetime.now().isoformat(),
            'break_even': False,
        }
        self.trade_open_time = datetime.now()
        self.daily_trades += 1

        self.status_message = '⚡ FLASH %s @ %.2f | TP=%.2f | SL=%.2f' % (
            direction.upper(), execution_price, tp, sl)
        self.last_action = '⚡ OPENED %s @ %.2f (%s)' % (direction.upper(), execution_price, reason)
        self.last_action_time = datetime.now()

        logger.info("=" * 50)
        logger.info("[FLASH] ✅ TRADE OPEN! #%s | %s @ %.2f",
                    result.order, direction.upper(), execution_price)
        logger.info("=" * 50)

    # ============================================
    # TRADE MONITORING
    # ============================================

    def _monitor_trade(self):
        """Monitor open trade — check P&L every second"""
        if not self.current_trade:
            return

        ticket = self.current_trade['ticket']

        # Check if position still exists (TP/SL hit)
        position = mt5.positions_get(ticket=ticket)
        if position is None or len(position) == 0:
            self._handle_closed_trade(ticket)
            return

        pos = position[0]
        current_pnl = pos.profit

        # Update status
        self.status_message = '⚡ TRACKING %s | P&L: $%.2f' % (
            self.current_trade['direction'].upper(), current_pnl)

        # === BREAK-EVEN: Move SL to entry when profit >= $1.50 ===
        if not self.current_trade.get('break_even') and current_pnl >= 1.50:
            entry = self.current_trade['entry_price']
            if self.current_trade['direction'] == 'buy':
                new_sl = round(entry + 0.3, 2)  # Small buffer above entry
            else:
                new_sl = round(entry - 0.3, 2)

            success = trade_executor.modify_sl(ticket, new_sl)
            if success:
                self.current_trade['break_even'] = True
                self.current_trade['sl'] = new_sl
                logger.info("[FLASH] 🛡️ Break-even! SL → %.2f", new_sl)

        # === TIME LIMIT: Force close after max duration ===
        if self.trade_open_time:
            elapsed = (datetime.now() - self.trade_open_time).total_seconds() / 60
            if elapsed >= self.max_trade_duration:
                logger.info("[FLASH] ⏰ Time limit (%.0f min) — force closing", elapsed)
                self._force_close(ticket, 'TIMEOUT')
                return

        # === TRAILING STOP: After break-even, trail $1 behind ===
        if self.current_trade.get('break_even') and current_pnl >= 2.0:
            tick = mt5.symbol_info_tick(connector.symbol)
            if tick:
                if self.current_trade['direction'] == 'buy':
                    new_sl = round(tick.bid - 1.0, 2)
                    if new_sl > self.current_trade['sl']:
                        trade_executor.modify_sl(ticket, new_sl)
                        self.current_trade['sl'] = new_sl
                else:
                    new_sl = round(tick.ask + 1.0, 2)
                    if new_sl < self.current_trade['sl']:
                        trade_executor.modify_sl(ticket, new_sl)
                        self.current_trade['sl'] = new_sl

    def _handle_closed_trade(self, ticket):
        """Handle trade closure — then immediately re-scan"""
        from datetime import timezone
        now = datetime.now(timezone.utc)
        day_ago = now - timedelta(days=1)

        deals = mt5.history_deals_get(day_ago, now, group=connector.symbol)
        pnl = 0.0
        if deals:
            for deal in deals:
                if deal.position_id == ticket or deal.order == ticket:
                    if deal.entry == 1:
                        pnl = deal.profit + deal.commission + deal.swap

        # Update daily tracking
        self.daily_pnl += pnl

        if pnl >= 0:
            self.daily_wins += 1
            self.consecutive_losses = 0
            result_str = 'WIN'
        else:
            self.daily_losses += 1
            self.consecutive_losses += 1
            result_str = 'LOSS'

        # Record
        risk_manager.record_trade_result(pnl)

        trade_record = {
            **self.current_trade,
            'close_time': datetime.now().isoformat(),
            'pnl': round(pnl, 2),
            'result': result_str,
            'daily_pnl': round(self.daily_pnl, 2),
        }
        self.trade_history.append(trade_record)
        self.all_time_history.append(trade_record)

        if len(self.all_time_history) > 200:
            self.all_time_history = self.all_time_history[-200:]

        logger.info("=" * 50)
        logger.info("[FLASH] 📊 CLOSED: %s | P&L: $%.2f | Daily: $%.2f",
                    result_str, pnl, self.daily_pnl)
        logger.info("[FLASH] Stats: %dW/%dL | Total trades: %d",
                    self.daily_wins, self.daily_losses, self.daily_trades)
        logger.info("=" * 50)

        self.last_action = '%s: $%.2f' % (result_str, pnl)
        self.last_action_time = datetime.now()

        # Clear trade
        self.current_trade = None
        self.trade_open_time = None

        # Reset signal generator
        try:
            signal_generator.force_reset()
        except:
            pass

        # ⚡ FLASH: Immediate re-entry after WIN
        if result_str == 'WIN':
            self.last_scan_time = 0  # Force immediate rescan
            self.status_message = '⚡ WIN +$%.2f — scanning for next flash...' % pnl
            logger.info("[FLASH] ⚡ Re-entering immediately after win!")

        # LOSS: Check streak
        if self.consecutive_losses >= self.max_consecutive_losses:
            self.cooldown_until = datetime.now() + timedelta(minutes=5)
            self.status_message = '⏸️ %d losses — cooling down 5 min' % self.consecutive_losses
            logger.warning("[FLASH] Loss streak: %d — cooldown", self.consecutive_losses)

    def _force_close(self, ticket, reason='MANUAL'):
        """Force close a trade"""
        result = trade_executor.close_trade(ticket)
        if result.get('success'):
            pnl = result.get('pnl', 0)
            logger.info("[FLASH] Force closed #%s (%s) | P&L: $%.2f", ticket, reason, pnl)
            self._handle_closed_trade(ticket)
        else:
            logger.error("[FLASH] Failed to close #%s: %s", ticket, result.get('error'))

    # ============================================
    # SAFETY CHECKS
    # ============================================

    def _daily_reset(self):
        """Reset daily counters at midnight"""
        today = datetime.now().date()
        if self.last_reset_date != today:
            if self.last_reset_date is not None:
                logger.info("[FLASH] === DAILY RESET === Yesterday: $%.2f | %dW/%dL",
                           self.daily_pnl, self.daily_wins, self.daily_losses)
            self.daily_pnl = 0.0
            self.daily_trades = 0
            self.daily_wins = 0
            self.daily_losses = 0
            self.trade_history = []
            self.consecutive_losses = 0
            self.cooldown_until = None
            self.last_reset_date = today

    def _daily_limits_reached(self):
        """Check daily limits"""
        if self.daily_pnl >= self.daily_profit_target:
            self.status_message = '🎯 TARGET REACHED! +$%.2f — done!' % self.daily_pnl
            return True

        if self.daily_pnl <= -self.daily_loss_limit:
            self.status_message = '🛑 LOSS LIMIT! -$%.2f — stopped' % abs(self.daily_pnl)
            return True

        if self.daily_trades >= self.max_trades_per_day:
            self.status_message = '📊 Max trades (%d) — done for today' % self.daily_trades
            return True

        return False

    def _is_paused(self):
        """Check cooldown"""
        if self.cooldown_until and datetime.now() < self.cooldown_until:
            remaining = (self.cooldown_until - datetime.now()).seconds
            self.status_message = '⏸️ Cooldown: %d sec remaining' % remaining
            return True
        if self.cooldown_until and datetime.now() >= self.cooldown_until:
            self.cooldown_until = None
            self.consecutive_losses = 0
        return False

    # ============================================
    # CONTROLS (from API/Dashboard)
    # ============================================

    def start_bot(self):
        """Enable flash trading"""
        self.enabled = True
        self.status_message = '⚡ FLASH BOT ENABLED — scanning...'
        self.last_action = 'Bot started'
        self.last_action_time = datetime.now()
        logger.info("[FLASH] ✅ Flash bot ENABLED")
        return True

    def stop_bot(self):
        """Disable flash trading"""
        self.enabled = False
        self.status_message = '🔴 FLASH BOT DISABLED'
        self.last_action = 'Bot stopped'
        self.last_action_time = datetime.now()
        logger.info("[FLASH] 🛑 Flash bot DISABLED")
        return True

    def emergency_stop(self):
        """Emergency: disable + close all"""
        self.enabled = False
        self.status_message = '🚨 EMERGENCY STOP'
        logger.warning("[FLASH] 🚨 EMERGENCY STOP!")

        if self.current_trade:
            self._force_close(self.current_trade['ticket'], 'EMERGENCY')

        self.last_action = 'EMERGENCY STOP'
        self.last_action_time = datetime.now()
        return True

    def update_settings(self, settings):
        """Update settings from dashboard"""
        if 'lot_size' in settings:
            self.lot_size = max(0.01, min(0.10, float(settings['lot_size'])))
        if 'scalp_tp' in settings:
            self.scalp_tp_points = max(1.0, min(20.0, float(settings['scalp_tp'])))
        if 'scalp_sl' in settings:
            self.scalp_sl_points = max(1.0, min(20.0, float(settings['scalp_sl'])))
        if 'daily_target' in settings:
            self.daily_profit_target = max(0.5, min(50.0, float(settings['daily_target'])))
        if 'daily_loss' in settings:
            self.daily_loss_limit = max(0.5, min(50.0, float(settings['daily_loss'])))
        if 'min_score' in settings:
            pass  # Not used in flash mode
        if 'max_trades' in settings:
            self.max_trades_per_day = max(1, min(50, int(settings['max_trades'])))
        if 'max_duration' in settings:
            self.max_trade_duration = max(1, min(120, int(settings['max_duration'])))

        logger.info("[FLASH] Settings: lot=%.2f tp=%.1f sl=%.1f target=$%.1f loss=$%.1f",
                    self.lot_size, self.scalp_tp_points, self.scalp_sl_points,
                    self.daily_profit_target, self.daily_loss_limit)
        return True

    # ============================================
    # STATUS (for Dashboard)
    # ============================================

    def get_status(self):
        """Get bot status for dashboard"""
        win_rate = 0
        if self.daily_wins + self.daily_losses > 0:
            win_rate = round(self.daily_wins / (self.daily_wins + self.daily_losses) * 100, 1)

        return {
            'enabled': self.enabled,
            'running': self.running,
            'paused': self.paused or (self.cooldown_until is not None and datetime.now() < self.cooldown_until),
            'status_message': self.status_message,
            'last_action': self.last_action,
            'last_action_time': self.last_action_time.isoformat() if self.last_action_time else None,

            'daily_pnl': round(self.daily_pnl, 2),
            'daily_trades': self.daily_trades,
            'daily_wins': self.daily_wins,
            'daily_losses': self.daily_losses,
            'win_rate': win_rate,
            'consecutive_losses': self.consecutive_losses,

            'daily_profit_target': self.daily_profit_target,
            'daily_loss_limit': self.daily_loss_limit,
            'target_reached': self.daily_pnl >= self.daily_profit_target,
            'loss_limit_hit': self.daily_pnl <= -self.daily_loss_limit,

            'has_open_trade': self.current_trade is not None,
            'current_trade': self.current_trade,

            'settings': {
                'lot_size': self.lot_size,
                'scalp_tp': self.scalp_tp_points,
                'scalp_sl': self.scalp_sl_points,
                'min_score': 0,
                'max_trades': self.max_trades_per_day,
                'max_duration': self.max_trade_duration,
            },

            'history': self.trade_history[-10:],
        }

    def shutdown(self):
        """Clean shutdown"""
        self.enabled = False
        self.running = False
        logger.info("[FLASH] Bot shut down")


# Singleton
auto_trader = AutoTrader()
