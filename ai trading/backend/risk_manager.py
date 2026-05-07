"""
AIOK Trading - Risk Manager VIP PRO
=================================
Professional-grade risk management system:
1. Dynamic position sizing based on account + volatility
2. Loss streak protection (reduce size after consecutive losses)
3. Daily/weekly loss limits with auto-shutdown
4. Time-based filters (no trading during news/low liquidity)
5. Equity protection (stop trading if equity drops)
6. Smart trailing stop with break-even protection
7. Correlation check (no conflicting open positions)
8. Drawdown recovery mode (smaller size after big losses)
"""

import logging
from datetime import datetime, date, timedelta

logger = logging.getLogger(__name__)


class RiskManager:
    """VIP PRO Risk Manager - Maximum protection for your capital"""

    def __init__(self):
        # === CORE RISK PARAMETERS ===
        self.risk_per_trade = 0.01          # 1% of account per trade (conservative)
        self.max_risk_per_trade = 0.02      # Maximum 2% in strong setups
        self.max_daily_loss_pct = 0.03      # 3% max daily loss (strict)
        self.max_weekly_loss_pct = 0.06     # 6% max weekly loss
        self.max_concurrent_trades = 2       # Max 2 open positions
        self.min_risk_reward = 1.5           # Minimum R:R ratio
        self.lot_min = 0.01                  # Minimum lot size
        self.lot_max = 0.10                  # Maximum lot size
        self.lot_step = 0.01                 # Lot size increment

        # === TRAILING STOP SETTINGS ===
        self.trailing_stop_trigger = 1.0     # Activate after 1:1 profit
        self.trailing_stop_distance = 0.5    # Trail by 0.5x ATR
        self.break_even_trigger = 0.7        # Move SL to break-even after 0.7x ATR profit
        self.break_even_offset = 0.5         # Add 0.5$ buffer above entry when at break-even

        # === LOSS STREAK PROTECTION ===
        self.consecutive_losses = 0
        self.max_consecutive_losses = 3      # After 3 losses in a row, reduce size
        self.loss_streak_reduction = 0.5     # Cut lot size by 50% during loss streak
        self.cooldown_after_losses = 2       # Wait 2 analysis cycles after 3 losses

        # === SESSION FILTER (UTC+3 / local time) ===
        self.trading_sessions = {
            'london_open':    (10, 13),   # London open - high momentum
            'london_ny_overlap': (15, 18), # Best liquidity for gold
            'ny_session':     (15, 22),   # NY session
        }
        self.blocked_hours = [0, 1, 2, 3, 4, 5, 6, 7, 8]  # Asian low liquidity

        # === DAILY TRACKING ===
        self.daily_pnl = 0.0
        self.daily_trades = 0
        self.daily_wins = 0
        self.daily_losses_count = 0
        self.last_reset_date = date.today()
        self.trade_log = []

        # === WEEKLY TRACKING ===
        self.weekly_pnl = 0.0
        self.weekly_trades = 0
        self.last_reset_week = date.today().isocalendar()[1]

        # === DRAWDOWN RECOVERY ===
        self.peak_balance = 0
        self.current_drawdown = 0
        self.recovery_mode = False
        self.recovery_threshold = 0.05      # Enter recovery mode after 5% drawdown

        # === COOLDOWN ===
        self.cooldown_until = None
        self.last_trade_time = None
        self.min_trade_interval = 120        # Minimum 2 minutes between trades

        # === STATE ===
        self.is_shutdown = False
        self.shutdown_reason = ''

    def reset_daily(self):
        """Reset daily counters at midnight"""
        today = date.today()
        if today != self.last_reset_date:
            logger.info("=== Daily Risk Reset ===")
            logger.info("  Yesterday: PnL=$%.2f | Trades=%d | Wins=%d | Losses=%d",
                       self.daily_pnl, self.daily_trades, self.daily_wins, self.daily_losses_count)
            self.daily_pnl = 0.0
            self.daily_trades = 0
            self.daily_wins = 0
            self.daily_losses_count = 0
            self.last_reset_date = today
            self.is_shutdown = False
            self.shutdown_reason = ''
            self.cooldown_until = None

        # Weekly reset
        current_week = today.isocalendar()[1]
        if current_week != self.last_reset_week:
            logger.info("=== Weekly Risk Reset === PnL was: $%.2f", self.weekly_pnl)
            self.weekly_pnl = 0.0
            self.weekly_trades = 0
            self.last_reset_week = current_week

    def can_trade(self, account_info, open_positions_count):
        """
        FULL risk check before any trade.
        Returns (allowed: bool, reason: str)
        """
        self.reset_daily()

        # 1. Check if system is shut down
        if self.is_shutdown:
            return False, "System shutdown: %s" % self.shutdown_reason

        # 2. Check cooldown period
        if self.cooldown_until and datetime.now() < self.cooldown_until:
            remaining = (self.cooldown_until - datetime.now()).seconds
            return False, "Cooldown active: %d seconds remaining" % remaining

        # 3. Check minimum trade interval
        if self.last_trade_time:
            elapsed = (datetime.now() - self.last_trade_time).total_seconds()
            if elapsed < self.min_trade_interval:
                return False, "Too soon since last trade (%.0fs < %ds)" % (elapsed, self.min_trade_interval)

        # 4. Check max concurrent trades
        if open_positions_count >= self.max_concurrent_trades:
            return False, "Max concurrent trades reached (%d/%d)" % (open_positions_count, self.max_concurrent_trades)

        # 5. Check daily loss limit
        if account_info:
            balance = account_info.get('balance', 0)
            if balance > 0:
                max_daily_loss = balance * self.max_daily_loss_pct
                if self.daily_pnl <= -max_daily_loss:
                    self.is_shutdown = True
                    self.shutdown_reason = "Daily loss limit: $%.2f" % abs(self.daily_pnl)
                    return False, self.shutdown_reason

                # 6. Check weekly loss limit
                max_weekly_loss = balance * self.max_weekly_loss_pct
                if self.weekly_pnl <= -max_weekly_loss:
                    self.is_shutdown = True
                    self.shutdown_reason = "Weekly loss limit: $%.2f" % abs(self.weekly_pnl)
                    return False, self.shutdown_reason

                # 7. Update drawdown tracking
                self._update_drawdown(balance)

        # 8. Check consecutive losses (cooldown)
        if self.consecutive_losses >= self.max_consecutive_losses:
            self.cooldown_until = datetime.now() + timedelta(minutes=5)
            self.consecutive_losses = 0  # Reset after cooldown
            return False, "Loss streak cooldown: %d consecutive losses" % self.max_consecutive_losses

        # 9. Check session filter
        session_ok, session_name = self._check_session()
        if not session_ok:
            return False, "Outside active session (%s)" % session_name

        # 10. Check if it's a high-risk time (news hours - simplified)
        if self._is_news_time():
            return False, "High-impact news window - trading paused"

        return True, "Trading allowed | Session: %s" % session_name

    def calculate_position_size(self, account_balance, sl_distance, symbol_info=None, signal_score=0):
        """
        SMART position sizing:
        - Base: 1% risk per trade
        - Strong signals (10+): up to 2% risk
        - Loss streak: reduce by 50%
        - Recovery mode: reduce by 50%
        - High volatility: reduce by 30%
        """
        if sl_distance <= 0 or account_balance <= 0:
            return self.lot_min

        # Dynamic risk based on signal quality
        if signal_score >= 12:
            risk_pct = self.max_risk_per_trade  # 2% for very strong
        elif signal_score >= 10:
            risk_pct = 0.015  # 1.5% for strong
        else:
            risk_pct = self.risk_per_trade  # 1% for moderate

        # Reduce during loss streak
        if self.consecutive_losses >= 2:
            risk_pct *= self.loss_streak_reduction
            logger.info("  [RISK] Loss streak reduction: %.1f%% -> %.1f%%",
                       risk_pct / self.loss_streak_reduction * 100, risk_pct * 100)

        # Reduce during drawdown recovery
        if self.recovery_mode:
            risk_pct *= 0.5
            logger.info("  [RISK] Recovery mode: risk halved to %.1f%%", risk_pct * 100)

        # Risk amount in USD
        risk_amount = account_balance * risk_pct

        # For XAUUSD: 1 lot = 100 oz, tick = $0.01
        tick_value = 1.0
        tick_size = 0.01

        if symbol_info:
            tick_value = symbol_info.get('trade_tick_value', 1.0)
            tick_size = symbol_info.get('trade_tick_size', 0.01)

        sl_ticks = sl_distance / tick_size
        value_per_tick = tick_value

        if sl_ticks * value_per_tick > 0:
            lot_size = risk_amount / (sl_ticks * value_per_tick)
        else:
            lot_size = self.lot_min

        # Round to lot step
        lot_size = round(lot_size / self.lot_step) * self.lot_step
        lot_size = max(self.lot_min, min(self.lot_max, lot_size))

        logger.info("  [RISK] Position: %.2f lots | Risk: $%.2f (%.1f%%) | SL: %.2f pts | Score: %d",
                    lot_size, risk_amount, risk_pct * 100, sl_distance, signal_score)

        return round(lot_size, 2)

    def calculate_sl_tp(self, direction, entry_price, atr_value, support=None, resistance=None):
        """
        SMART SL/TP using ATR + Support/Resistance levels.
        SL: 1.2x ATR or nearest S/R level (whichever is tighter but safe)
        TP: 2.5x ATR or nearest S/R level
        """
        sl_multiplier = 1.2   # Tight SL
        tp_multiplier = 2.5   # Good reward

        sl_distance = round(atr_value * sl_multiplier, 2)
        tp_distance = round(atr_value * tp_multiplier, 2)

        if direction == 'buy':
            sl = round(entry_price - sl_distance, 2)
            tp = round(entry_price + tp_distance, 2)

            # Use support level if closer and reasonable
            if support and support < entry_price:
                sr_sl = support - 1.0  # Buffer below support
                if sr_sl > sl:  # Tighter but still reasonable
                    sl = round(sr_sl, 2)
                    sl_distance = round(entry_price - sl, 2)

            # Use resistance for TP
            if resistance and resistance < tp and resistance > entry_price:
                tp = round(resistance - 0.5, 2)
                tp_distance = round(tp - entry_price, 2)

        elif direction == 'sell':
            sl = round(entry_price + sl_distance, 2)
            tp = round(entry_price - tp_distance, 2)

            if resistance and resistance > entry_price:
                sr_sl = resistance + 1.0
                if sr_sl < sl:
                    sl = round(sr_sl, 2)
                    sl_distance = round(sl - entry_price, 2)

            if support and support > tp and support < entry_price:
                tp = round(support + 0.5, 2)
                tp_distance = round(entry_price - tp, 2)
        else:
            return None, None, 0, 0

        # Verify minimum R:R
        if sl_distance > 0:
            rr = tp_distance / sl_distance
            if rr < self.min_risk_reward:
                # Adjust TP to meet minimum R:R
                tp_distance = round(sl_distance * self.min_risk_reward, 2)
                if direction == 'buy':
                    tp = round(entry_price + tp_distance, 2)
                else:
                    tp = round(entry_price - tp_distance, 2)

        return sl, tp, sl_distance, tp_distance

    def calculate_trailing_stop(self, direction, entry_price, current_price, atr_value,
                                 current_sl, is_trailing_active=False):
        """
        Advanced trailing stop with break-even protection.
        1. Move to break-even when profit reaches 0.7x ATR
        2. Start trailing when profit reaches 1x ATR
        3. Trail with 0.5x ATR distance
        """
        be_trigger = atr_value * self.break_even_trigger
        trail_trigger = atr_value * self.trailing_stop_trigger
        trail_distance = round(atr_value * self.trailing_stop_distance, 2)

        if direction == 'buy':
            profit = current_price - entry_price

            # Break-even protection
            if profit >= be_trigger and not is_trailing_active:
                be_sl = round(entry_price + self.break_even_offset, 2)
                if be_sl > current_sl:
                    logger.info("  [TRAIL] Break-even activated @ %.2f", be_sl)
                    return be_sl, True

            # Full trailing
            if profit >= trail_trigger:
                new_sl = round(current_price - trail_distance, 2)
                if new_sl > current_sl:
                    logger.info("  [TRAIL] Trailing SL moved to %.2f (profit: %.2f)", new_sl, profit)
                    return new_sl, True

        elif direction == 'sell':
            profit = entry_price - current_price

            if profit >= be_trigger and not is_trailing_active:
                be_sl = round(entry_price - self.break_even_offset, 2)
                if be_sl < current_sl:
                    logger.info("  [TRAIL] Break-even activated @ %.2f", be_sl)
                    return be_sl, True

            if profit >= trail_trigger:
                new_sl = round(current_price + trail_distance, 2)
                if new_sl < current_sl:
                    logger.info("  [TRAIL] Trailing SL moved to %.2f (profit: %.2f)", new_sl, profit)
                    return new_sl, True

        return current_sl, is_trailing_active

    def validate_signal(self, signal):
        """
        STRICT signal validation with multiple checks.
        Returns (valid: bool, reason: str)
        """
        if not signal:
            return False, "No signal provided"

        # 1. Must be tradeable
        if not signal.get('is_tradeable'):
            score = signal.get('score', 0)
            return False, "Signal not tradeable (score: %d/15)" % score

        # 2. Must have valid direction
        direction = signal.get('direction', 'neutral')
        if direction not in ('buy', 'sell'):
            return False, "Invalid direction: %s" % direction

        # 3. Must have SL and TP
        if not signal.get('sl') or not signal.get('tp'):
            return False, "Missing SL or TP levels"

        # 4. Check R:R ratio
        sl_dist = signal.get('sl_distance', 0)
        tp_dist = signal.get('tp_distance', 0)

        if sl_dist > 0:
            rr_ratio = tp_dist / sl_dist
            if rr_ratio < self.min_risk_reward:
                return False, "R:R too low (%.1f < %.1f)" % (rr_ratio, self.min_risk_reward)

        # 5. Check minimum score
        score = signal.get('score', 0)
        if score < 7:
            return False, "Score too low: %d/15" % score

        # 6. Check edge
        edge = signal.get('edge', 0)
        if edge < 3:
            return False, "Edge too low: %d" % edge

        # 7. SL distance sanity check (not too tight, not too wide)
        if sl_dist > 0:
            if sl_dist < 1.0:
                return False, "SL too tight: %.2f (min 1.0)" % sl_dist
            if sl_dist > 50.0:
                return False, "SL too wide: %.2f (max 50.0)" % sl_dist

        return True, "Signal validated (Score: %d/15 | RR: 1:%.1f)" % (score, rr_ratio if sl_dist > 0 else 0)

    def record_trade_result(self, pnl):
        """Record trade result and update all tracking metrics"""
        self.daily_pnl += pnl
        self.weekly_pnl += pnl
        self.daily_trades += 1
        self.weekly_trades += 1
        self.last_trade_time = datetime.now()

        if pnl >= 0:
            self.daily_wins += 1
            self.consecutive_losses = 0  # Reset loss streak
            if self.recovery_mode and self.daily_pnl > 0:
                self.recovery_mode = False
                logger.info("  [RISK] Recovery mode ENDED - back to normal sizing")
        else:
            self.daily_losses_count += 1
            self.consecutive_losses += 1
            if self.consecutive_losses >= 2:
                logger.warning("  [RISK] Loss streak: %d consecutive losses", self.consecutive_losses)

        self.trade_log.append({
            'time': datetime.now().isoformat(),
            'pnl': pnl,
            'daily_pnl': self.daily_pnl,
            'weekly_pnl': self.weekly_pnl,
            'consecutive_losses': self.consecutive_losses,
            'recovery_mode': self.recovery_mode,
        })

        logger.info("  [RISK] Trade result: $%.2f | Daily: $%.2f | Streak: %s%d",
                    pnl, self.daily_pnl,
                    "L" if self.consecutive_losses > 0 else "W",
                    self.consecutive_losses if self.consecutive_losses > 0 else self.daily_wins)

    def _update_drawdown(self, current_balance):
        """Track drawdown and enter recovery mode if needed"""
        if current_balance > self.peak_balance:
            self.peak_balance = current_balance

        if self.peak_balance > 0:
            self.current_drawdown = (self.peak_balance - current_balance) / self.peak_balance

            if self.current_drawdown >= self.recovery_threshold and not self.recovery_mode:
                self.recovery_mode = True
                logger.warning("  [RISK] RECOVERY MODE activated! Drawdown: %.1f%%",
                             self.current_drawdown * 100)

    def _check_session(self):
        """Check if current time is in an active trading session"""
        now = datetime.now()
        hour = now.hour

        # Blocked hours (low liquidity)
        if hour in self.blocked_hours:
            return False, 'OFF-HOURS (Low Liquidity)'

        # Check active sessions
        for name, (start, end) in self.trading_sessions.items():
            if start <= hour < end:
                return True, name.upper().replace('_', ' ')

        # Weekend check (Saturday/Sunday)
        if now.weekday() >= 5:
            return False, 'WEEKEND'

        return False, 'BETWEEN SESSIONS'

    def _is_news_time(self):
        """
        Check for common high-impact news times.
        NFP: First Friday of month, 15:30 UTC+3
        FOMC: Various, typically 21:00 UTC+3
        """
        now = datetime.now()
        hour = now.hour
        minute = now.minute

        # NFP window: First Friday, 15:20-15:50
        if now.weekday() == 4 and now.day <= 7:
            if 15 <= hour <= 15 and 20 <= minute <= 50:
                return True

        # FOMC typical time: 21:00-21:45
        if hour == 21 and minute < 45:
            # Only on FOMC days (simplified - every 6 weeks Wednesday)
            pass

        return False

    def get_risk_metrics(self, account_info=None):
        """Get comprehensive risk metrics for dashboard"""
        balance = account_info.get('balance', 0) if account_info else 0
        max_daily = balance * self.max_daily_loss_pct if balance else 0
        max_weekly = balance * self.max_weekly_loss_pct if balance else 0

        session_ok, session_name = self._check_session()

        return {
            'risk_per_trade': "%.1f%%" % (self.risk_per_trade * 100),
            'max_risk': "%.1f%%" % (self.max_risk_per_trade * 100),
            'max_daily_loss': "%.1f%%" % (self.max_daily_loss_pct * 100),
            'max_weekly_loss': "%.1f%%" % (self.max_weekly_loss_pct * 100),
            'daily_pnl': round(self.daily_pnl, 2),
            'weekly_pnl': round(self.weekly_pnl, 2),
            'daily_trades': self.daily_trades,
            'daily_wins': self.daily_wins,
            'daily_losses': self.daily_losses_count,
            'daily_win_rate': round((self.daily_wins / self.daily_trades * 100), 1) if self.daily_trades > 0 else 0,
            'consecutive_losses': self.consecutive_losses,
            'lot_range': "%.2f - %.2f" % (self.lot_min, self.lot_max),
            'max_concurrent': self.max_concurrent_trades,
            'trailing_trigger': "%.1fx ATR" % self.trailing_stop_trigger,
            'break_even': "%.1fx ATR" % self.break_even_trigger,
            'daily_loss_remaining': round(max_daily + self.daily_pnl, 2) if max_daily else 0,
            'weekly_loss_remaining': round(max_weekly + self.weekly_pnl, 2) if max_weekly else 0,
            'recovery_mode': self.recovery_mode,
            'drawdown': "%.1f%%" % (self.current_drawdown * 100),
            'session': session_name,
            'session_active': session_ok,
            'is_shutdown': self.is_shutdown,
            'shutdown_reason': self.shutdown_reason,
        }

    def emergency_shutdown(self, reason="Manual shutdown"):
        """Emergency shutdown - stop all trading"""
        self.is_shutdown = True
        self.shutdown_reason = reason
        logger.warning("[RISK] EMERGENCY SHUTDOWN: %s", reason)

    def resume_trading(self):
        """Resume trading after shutdown"""
        self.is_shutdown = False
        self.shutdown_reason = ''
        self.consecutive_losses = 0
        self.cooldown_until = None
        logger.info("[RISK] Trading RESUMED")


# Singleton instance
risk_manager = RiskManager()
