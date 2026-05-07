"""
AIOK Trading - Professional Signal Generator V5
============================================
Telegram-style: ONE signal at a time with 3 TP targets.
Signal lifecycle: WAITING → ACTIVE → TRACKING → COMPLETED

Features:
- Only generates signals at 7+/10 confluence
- 3 Take Profit levels (TP1, TP2, TP3)
- Trailing SL (TP1 hit → SL to BE, TP2 hit → SL to TP1)
- Skip/Enter buttons
- Max 3 signals per day
- Auto-expire if price hits SL before user enters
"""

import logging
from datetime import datetime, timedelta
from technical_analysis import ta_engine
from ml_engine import ml_engine
from news_calendar import NewsCalendar

logger = logging.getLogger(__name__)

# Global news calendar instance
news_calendar = NewsCalendar()


class SignalLifecycle:
    WAITING = 'WAITING'       # Scanning for opportunities
    ACTIVE = 'ACTIVE'         # Signal sent, waiting for user action
    TRACKING = 'TRACKING'     # User entered, tracking TPs
    COMPLETED = 'COMPLETED'   # Signal finished (TP3 or SL hit)


class SignalGenerator:
    """Professional signal provider - ONE signal at a time"""

    def __init__(self):
        self.state = SignalLifecycle.WAITING
        self.active_signal = None
        self.signal_history = []
        self.completed_signals = []
        self.signals_today = 0
        self.last_signal_date = None
        self.max_signals_per_day = 30
        self.min_score = 6         # 6/10 = strong confluence = tradeable
        self.min_edge = 2
        self.ml_min_prob = 55

    def generate_signal(self, candle_data, multi_tf_data=None):
        """Main loop - behavior depends on current state"""
        if not candle_data:
            return self._get_status()

        primary_tf = None
        for tf in ['M15', 'M5', 'H1']:
            df = candle_data.get(tf)
            if df is not None and not df.empty:
                primary_tf = df
                break

        if primary_tf is None:
            return self._get_status()

        price = float(primary_tf['close'].iloc[-1])

        # Reset daily counter
        today = datetime.now().date()
        if self.last_signal_date != today:
            self.signals_today = 0
            self.last_signal_date = today

        # STATE MACHINE
        if self.state == SignalLifecycle.WAITING:
            return self._scan_for_signal(candle_data, primary_tf, price)
        elif self.state == SignalLifecycle.ACTIVE:
            return self._monitor_active(price)
        elif self.state == SignalLifecycle.TRACKING:
            return self._track_targets(price)
        elif self.state == SignalLifecycle.COMPLETED:
            return self._handle_completed(price)

        return self._get_status()

    def _scan_for_signal(self, candle_data, primary_tf, price):
        """WAITING state: scan for 7+/10 opportunities"""

        if self.signals_today >= self.max_signals_per_day:
            return self._get_status(msg='Daily limit reached (%d/%d)' % (self.signals_today, self.max_signals_per_day))

        ta_results = ta_engine.analyze(primary_tf)
        if ta_results is None:
            return self._get_status()

        confluence = ta_engine.get_confluence_score(ta_results)
        total_score = confluence['score']
        edge = confluence.get('edge', 0)
        direction = confluence['direction']

        # ML check
        ml_result = ml_engine.predict(primary_tf)
        ml_agrees = ml_result['signal'] == direction and ml_result['probability'] > self.ml_min_prob

        # Session check
        session_active, session_name = self._check_session()

        # H1 trend
        h1_trend = self._get_h1_trend(candle_data)
        trend_aligned = h1_trend == direction or h1_trend == 'neutral'

        # Build details
        confluence['details']['ml'] = "%s (%d%%)" % (
            ml_result['signal'].upper() if ml_result['signal'] != 'neutral' else 'NEUTRAL',
            ml_result['probability'])
        confluence['details']['session'] = session_name
        confluence['details']['h1_trend'] = h1_trend.upper()

        # Calculate ATR-based TPs
        atr = ta_results.get('atr', {})
        atr_val = atr.get('value', 5.0)
        sr = ta_results.get('support_resistance', {})
        pattern = ta_results.get('candle_pattern', {}).get('pattern', 'NONE')

        # Check if signal qualifies
        is_qualified = (total_score >= self.min_score and
                       edge >= self.min_edge and
                       direction != 'neutral')

        # Build base signal for UI (always returned for display)
        base_signal = {
            'direction': direction,
            'score': total_score,
            'max_score': 10,
            'strength': self._get_strength(total_score),
            'price': price,
            'edge': edge,
            'ml_probability': ml_result['probability'],
            'ml_direction': ml_result['direction'],
            'confluence_details': confluence['details'],
            'candle_pattern': pattern,
            'trend_strength': ta_results.get('trend_strength', {}).get('adx', 0),
            'session': session_name,
            'h1_trend': h1_trend,
            'timestamp': datetime.now().isoformat(),
            'time': datetime.now().strftime('%H:%M:%S'),
            'indicators': ta_results,
            # Lifecycle info
            'lifecycle': SignalLifecycle.WAITING,
            'is_tradeable': False,
            'message': 'Scanning... Score %d/10 | Need %d+' % (total_score, self.min_score),
        }

        if not is_qualified:
            return base_signal

        # CHECK NEWS: Block signals during high-impact events
        if news_calendar.should_block_trading():
            warnings = news_calendar.get_trading_warning()
            msg = warnings[0]['message'] if warnings else 'News event nearby'
            base_signal['message'] = msg
            base_signal['news_blocked'] = True
            return base_signal

        # ====== FRIDAY SMART PROTECTION ======
        now = datetime.now()
        weekday = now.weekday()  # 0=Mon, 4=Fri
        hour = now.hour

        # Friday after market close = NO TRADING
        if weekday == 4 and hour >= 20:
            base_signal['message'] = '⛔ السوق مغلق — انتهى تداول الأسبوع!'
            base_signal['friday_blocked'] = True
            return base_signal

        # Friday afternoon: add warning but DON'T block (same min_score)

        # NFP window: just add warning, don't block
        # (Admin can check news calendar manually)

        # ====== MOMENTUM CRASH DETECTION ======
        close_vals = primary_tf['close'].values
        open_vals = primary_tf['open'].values if 'open' in primary_tf.columns else close_vals

        if len(close_vals) > 8:
            recent_move = close_vals[-1] - close_vals[-6]
            red_count = sum(1 for i in range(-8, 0) if close_vals[i] < open_vals[i])
            green_count = 8 - red_count

            # CRASH: Don't BUY during crash
            if recent_move < -atr_val * 1.5 and red_count >= 5 and direction == 'buy':
                base_signal['message'] = '🚨 CRASH — لا تشتري! (-%s$)' % abs(round(recent_move, 0))
                return base_signal

            # PUMP: Don't SELL during pump
            if recent_move > atr_val * 1.5 and green_count >= 5 and direction == 'sell':
                base_signal['message'] = '🚨 PUMP — لا تبيع! (+%s$)' % round(recent_move, 0)
                return base_signal

            # Strong bearish momentum: don't buy
            if red_count >= 7 and direction == 'buy':
                base_signal['message'] = '⚠️ زخم هبوطي قوي — لا تشتري!'
                return base_signal

            # Strong bullish momentum: don't sell
            if green_count >= 7 and direction == 'sell':
                base_signal['message'] = '⚠️ زخم صعودي قوي — لا تبيع!'
                return base_signal

        # ====== EMA TREND CONFIRMATION ======
        if len(close_vals) > 50:
            def _ema(data, period):
                alpha = 2 / (period + 1)
                result = [data[0]]
                for i in range(1, len(data)):
                    result.append(alpha * data[i] + (1 - alpha) * result[-1])
                return result

            ema8 = _ema(close_vals, 8)[-1]
            ema21 = _ema(close_vals, 21)[-1]
            ema50 = _ema(close_vals, 50)[-1]
            cp = close_vals[-1]

            # Don't BUY when price < all EMAs (strong sell)
            if direction == 'buy' and cp < ema8 and cp < ema21 and cp < ema50:
                base_signal['message'] = '⚠️ EMAs BEARISH — لا تشتري!'
                return base_signal

            # Don't SELL when price > all EMAs (strong buy)
            if direction == 'sell' and cp > ema8 and cp > ema21 and cp > ema50:
                base_signal['message'] = '⚠️ EMAs BULLISH — لا تبيع!'
                return base_signal

        # SIGNAL QUALIFIED! Generate 3 TPs using S/R + ATR
        support = sr.get('support', 0)
        resistance = sr.get('resistance', 99999)

        if direction == 'buy':
            # TP1: Conservative (1.5x ATR) — easy to hit
            tp1 = round(price + atr_val * 1.5, 2)
            # TP2: Medium (3x ATR or next resistance)
            tp2 = round(price + atr_val * 3.0, 2)
            # TP3: Aggressive (5x ATR) — long profit
            tp3 = round(price + atr_val * 5.0, 2)
            # SL: Below support or 1.2x ATR
            sl = round(max(support - 1.0, price - atr_val * 1.2), 2) if support > 0 else round(price - atr_val * 1.2, 2)

            # Use resistance as TP if it falls between our levels
            if resistance > price:
                if tp1 < resistance < tp2:
                    tp2 = round(resistance - 0.5, 2)
                elif tp2 < resistance < tp3:
                    tp3 = round(resistance - 0.5, 2)
        else:
            # TP1: Conservative (1.5x ATR)
            tp1 = round(price - atr_val * 1.5, 2)
            # TP2: Medium (3x ATR or next support)
            tp2 = round(price - atr_val * 3.0, 2)
            # TP3: Aggressive (5x ATR)
            tp3 = round(price - atr_val * 5.0, 2)
            # SL: Above resistance or 1.2x ATR
            sl = round(min(resistance + 1.0, price + atr_val * 1.2), 2) if resistance < 99999 else round(price + atr_val * 1.2, 2)

            # Use support as TP if it falls between our levels
            if support > 0 and support < price:
                if tp2 < support < tp1:
                    tp1 = round(support + 0.5, 2)
                elif tp3 < support < tp2:
                    tp2 = round(support + 0.5, 2)

        rr = abs(price - tp2) / abs(price - sl) if abs(price - sl) > 0 else 0

        # Create professional signal
        self.active_signal = {
            'direction': direction,
            'score': total_score,
            'max_score': 10,
            'strength': self._get_strength(total_score),
            'entry_price': price,
            'price': price,
            'tp1': tp1,
            'tp2': tp2,
            'tp3': tp3,
            'sl': sl,
            'sl_original': sl,
            'sl_distance': round(abs(price - sl), 2),
            'tp_distance': round(abs(price - tp1), 2),
            'risk_reward': "1:%.1f" % rr,
            'edge': edge,
            'ml_probability': ml_result['probability'],
            'ml_direction': ml_result['direction'],
            'confluence_details': confluence['details'],
            'candle_pattern': pattern,
            'trend_strength': ta_results.get('trend_strength', {}).get('adx', 0),
            'session': session_name,
            'h1_trend': h1_trend,
            'timestamp': datetime.now().isoformat(),
            'time': datetime.now().strftime('%H:%M:%S'),
            'indicators': ta_results,
            # Lifecycle
            'lifecycle': SignalLifecycle.ACTIVE,
            'is_tradeable': True,
            'is_new': True,
            'tp1_hit': False,
            'tp2_hit': False,
            'tp3_hit': False,
            'sl_hit': False,
            'result': None,
            'message': '🔥 NEW SIGNAL! %s @ %.2f' % (direction.upper(), price),
            'signal_id': datetime.now().strftime('%Y%m%d_%H%M%S'),
        }

        # OPTIMAL ENTRY: Calculate best entry price
        ema_data = ta_results.get('ema', {})
        ema21 = ema_data.get('ema21', price)
        fib = ta_results.get('fibonacci', {})
        fib_382 = fib.get('level_382', price)

        if direction == 'buy':
            # Best buy = lowest possible price (pullback)
            candidates = [p for p in [ema21, support, fib_382] if p and 0 < p < price]
            if candidates:
                optimal = round(max(candidates), 2)  # Closest to current but below
                if abs(optimal - price) > atr_val * 0.3:  # Only if meaningfully different
                    self.active_signal['optimal_entry'] = optimal
                    self.active_signal['entry_type'] = 'LIMIT'
                    self.active_signal['entry_reason'] = 'Wait for pullback to %.2f' % optimal
                    # Recalc TPs from optimal entry for better RR
                    self.active_signal['tp1'] = round(optimal + atr_val * 1.5, 2)
                    self.active_signal['tp2'] = round(optimal + atr_val * 3.0, 2)
                    self.active_signal['tp3'] = round(optimal + atr_val * 5.0, 2)
                    self.active_signal['sl'] = round(optimal - atr_val * 1.0, 2)
                    new_rr = abs(optimal - self.active_signal['tp2']) / abs(optimal - self.active_signal['sl'])
                    self.active_signal['risk_reward'] = '1:%.1f' % new_rr
        else:
            # Best sell = highest possible price (rally)
            candidates = [p for p in [ema21, resistance, fib_382] if p and p > price and p < 99999]
            if candidates:
                optimal = round(min(candidates), 2)  # Closest to current but above
                if abs(optimal - price) > atr_val * 0.3:
                    self.active_signal['optimal_entry'] = optimal
                    self.active_signal['entry_type'] = 'LIMIT'
                    self.active_signal['entry_reason'] = 'Wait for rally to %.2f' % optimal
                    self.active_signal['tp1'] = round(optimal - atr_val * 1.5, 2)
                    self.active_signal['tp2'] = round(optimal - atr_val * 3.0, 2)
                    self.active_signal['tp3'] = round(optimal - atr_val * 5.0, 2)
                    self.active_signal['sl'] = round(optimal + atr_val * 1.0, 2)
                    new_rr = abs(optimal - self.active_signal['tp2']) / abs(optimal - self.active_signal['sl'])
                    self.active_signal['risk_reward'] = '1:%.1f' % new_rr

        # Default: market entry
        if 'optimal_entry' not in self.active_signal:
            self.active_signal['optimal_entry'] = price
            self.active_signal['entry_type'] = 'MARKET'
            self.active_signal['entry_reason'] = 'Enter now at market price'

        self.state = SignalLifecycle.ACTIVE
        self.signals_today += 1

        logger.info("=" * 60)
        logger.info("[SIGNAL] 🔥 NEW %s SIGNAL!", direction.upper())
        logger.info("[SIGNAL] Entry: %.2f | TP1: %.2f | TP2: %.2f | TP3: %.2f | SL: %.2f",
                    price, tp1, tp2, tp3, sl)
        logger.info("[SIGNAL] Score: %d/10 | Edge: %d | RR: 1:%.1f | %s",
                    total_score, edge, rr, session_name)
        logger.info("=" * 60)

        return self.active_signal

    def _monitor_active(self, price):
        """ACTIVE state: signal sent, waiting for user to enter or skip"""
        if not self.active_signal:
            self.state = SignalLifecycle.WAITING
            return self._get_status()

        sig = self.active_signal
        sig['price'] = price
        sig['is_new'] = False

        # Check if SL hit before user entered (auto-expire)
        if sig['direction'] == 'buy' and price <= sig['sl']:
            sig['sl_hit'] = True
            sig['result'] = 'EXPIRED (SL hit before entry)'
            sig['message'] = '❌ Signal expired — SL hit before entry'
            sig['lifecycle'] = SignalLifecycle.COMPLETED
            self.state = SignalLifecycle.COMPLETED
            logger.info("[SIGNAL] ❌ Signal expired — SL hit before entry")
        elif sig['direction'] == 'sell' and price >= sig['sl']:
            sig['sl_hit'] = True
            sig['result'] = 'EXPIRED (SL hit before entry)'
            sig['message'] = '❌ Signal expired — SL hit before entry'
            sig['lifecycle'] = SignalLifecycle.COMPLETED
            self.state = SignalLifecycle.COMPLETED
            logger.info("[SIGNAL] ❌ Signal expired — SL hit before entry")

        # Check if price moved too far (opportunity fading)
        entry = sig['entry_price']
        if sig['direction'] == 'buy' and price > sig['tp1']:
            sig['message'] = '⚠️ Price passed TP1 — opportunity fading!'
        elif sig['direction'] == 'sell' and price < sig['tp1']:
            sig['message'] = '⚠️ Price passed TP1 — opportunity fading!'
        else:
            dist = abs(price - entry)
            if sig['direction'] == 'buy':
                sig['message'] = '⏳ ACTIVE — waiting for entry | Price: %.2f (%+.2f)' % (price, price - entry)
            else:
                sig['message'] = '⏳ ACTIVE — waiting for entry | Price: %.2f (%+.2f)' % (price, entry - price)

        return sig

    def _track_targets(self, price):
        """TRACKING state: user entered, track TP1/TP2/TP3/SL"""
        if not self.active_signal:
            self.state = SignalLifecycle.WAITING
            return self._get_status()

        sig = self.active_signal
        sig['price'] = price
        is_buy = sig['direction'] == 'buy'

        # Check TP1
        if not sig['tp1_hit']:
            if (is_buy and price >= sig['tp1']) or (not is_buy and price <= sig['tp1']):
                sig['tp1_hit'] = True
                sig['sl'] = sig['entry_price']  # Move SL to break-even
                sig['message'] = '✅ TP1 HIT! SL moved to Break-Even (%.2f)' % sig['entry_price']
                logger.info("[SIGNAL] ✅ TP1 HIT! SL → Break-Even")

        # Check TP2
        if sig['tp1_hit'] and not sig['tp2_hit']:
            if (is_buy and price >= sig['tp2']) or (not is_buy and price <= sig['tp2']):
                sig['tp2_hit'] = True
                sig['sl'] = sig['tp1']  # Move SL to TP1
                sig['message'] = '✅ TP2 HIT! SL moved to TP1 (%.2f) — Profit locked!' % sig['tp1']
                logger.info("[SIGNAL] ✅ TP2 HIT! SL → TP1 (Profit locked)")

        # Check TP3 (full win)
        if sig['tp2_hit'] and not sig['tp3_hit']:
            if (is_buy and price >= sig['tp3']) or (not is_buy and price <= sig['tp3']):
                sig['tp3_hit'] = True
                sig['result'] = 'FULL WIN (TP3)'
                sig['message'] = '🏆 TP3 HIT! FULL WIN! All targets reached!'
                sig['lifecycle'] = SignalLifecycle.COMPLETED
                self.state = SignalLifecycle.COMPLETED
                logger.info("[SIGNAL] 🏆 TP3 HIT! FULL WIN!")

        # Check SL
        if not sig.get('tp3_hit'):
            if (is_buy and price <= sig['sl']) or (not is_buy and price >= sig['sl']):
                sig['sl_hit'] = True
                if sig['tp2_hit']:
                    sig['result'] = 'PROFIT (TP2 + SL at TP1)'
                    sig['message'] = '📊 SL hit at TP1 — TP2 profit locked!'
                elif sig['tp1_hit']:
                    sig['result'] = 'BREAK-EVEN (TP1 + SL at entry)'
                    sig['message'] = '🔄 SL hit at Break-Even — No loss!'
                else:
                    sig['result'] = 'LOSS (SL hit)'
                    sig['message'] = '❌ SL HIT — Loss: $%.2f' % sig['sl_distance']
                sig['lifecycle'] = SignalLifecycle.COMPLETED
                self.state = SignalLifecycle.COMPLETED
                logger.info("[SIGNAL] SL hit — Result: %s", sig['result'])

        # Update distance info
        if not sig.get('tp3_hit') and not sig.get('sl_hit'):
            if is_buy:
                pnl = price - sig['entry_price']
            else:
                pnl = sig['entry_price'] - price
            sig['message'] = '📊 TRACKING | P&L: %+.2f | TP1:%s TP2:%s TP3:%s' % (
                pnl,
                '✅' if sig['tp1_hit'] else '%.2f' % sig['tp1'],
                '✅' if sig['tp2_hit'] else '%.2f' % sig['tp2'],
                '✅' if sig['tp3_hit'] else '%.2f' % sig['tp3'],
            )

        return sig

    def _handle_completed(self, price):
        """COMPLETED state: auto-reset after showing result"""
        if self.active_signal:
            sig = self.active_signal
            sig['price'] = price
            # Save to completed history
            if sig not in self.completed_signals:
                self.completed_signals.append(sig.copy())
                if len(self.completed_signals) > 50:
                    self.completed_signals = self.completed_signals[-50:]
            return sig
        self.state = SignalLifecycle.WAITING
        return self._get_status()

    # ======== USER ACTIONS ========

    def user_enter(self):
        """User clicked 'دخلت الصفقة'"""
        if self.state == SignalLifecycle.ACTIVE and self.active_signal:
            self.state = SignalLifecycle.TRACKING
            self.active_signal['lifecycle'] = SignalLifecycle.TRACKING
            self.active_signal['message'] = '📊 TRACKING — Monitoring TP1/TP2/TP3...'
            logger.info("[SIGNAL] User ENTERED trade at %.2f", self.active_signal['price'])
            return True
        return False

    def user_skip(self):
        """User clicked 'Skip — توصية جديدة'"""
        if self.state in [SignalLifecycle.ACTIVE, SignalLifecycle.COMPLETED]:
            if self.active_signal:
                self.active_signal['result'] = 'SKIPPED'
                self.completed_signals.append(self.active_signal.copy())
            self.active_signal = None
            self.state = SignalLifecycle.WAITING
            logger.info("[SIGNAL] User SKIPPED signal — scanning for next...")
            return True
        return False

    def user_close(self):
        """User manually closed the trade"""
        if self.state == SignalLifecycle.TRACKING and self.active_signal:
            self.active_signal['result'] = 'MANUAL CLOSE'
            self.active_signal['lifecycle'] = SignalLifecycle.COMPLETED
            self.completed_signals.append(self.active_signal.copy())
            self.active_signal = None
            self.state = SignalLifecycle.WAITING
            logger.info("[SIGNAL] User CLOSED trade manually")
            return True
        return False

    def force_reset(self):
        """Force reset to WAITING state"""
        self.active_signal = None
        self.state = SignalLifecycle.WAITING
        logger.info("[SIGNAL] Force RESET to WAITING")
        return True

    # ======== HELPERS ========

    def _get_status(self, msg=None):
        return {
            'direction': 'neutral',
            'score': 0,
            'max_score': 10,
            'strength': 'SCANNING',
            'price': 0,
            'edge': 0,
            'lifecycle': self.state,
            'is_tradeable': False,
            'message': msg or 'Scanning for %d+/10 signals...' % self.min_score,
            'signals_today': self.signals_today,
            'max_signals': self.max_signals_per_day,
            'time': datetime.now().strftime('%H:%M:%S'),
            'timestamp': datetime.now().isoformat(),
        }

    def _get_strength(self, score):
        if score >= 8: return 'VERY STRONG'
        elif score >= 7: return 'STRONG'
        elif score >= 5: return 'MODERATE'
        return 'WEAK'

    def _check_session(self):
        hour = datetime.now().hour
        if 15 <= hour < 18: return True, 'LONDON+NY'
        if 10 <= hour < 18: return True, 'LONDON'
        if 15 <= hour < 23: return True, 'NEW YORK'
        if 2 <= hour < 10: return False, 'ASIAN'
        return False, 'OFF-HOURS'

    def _get_h1_trend(self, candle_data):
        h1 = candle_data.get('H1')
        if h1 is None or len(h1) < 50: return 'neutral'
        close = h1['close']
        ema20 = close.ewm(span=20, adjust=False).mean().iloc[-1]
        ema50 = close.ewm(span=50, adjust=False).mean().iloc[-1]
        price = close.iloc[-1]
        if price > ema20 and ema20 > ema50: return 'buy'
        elif price < ema20 and ema20 < ema50: return 'sell'
        return 'neutral'

    def get_recent_signals(self, count=20):
        return self.completed_signals[-count:]


signal_generator = SignalGenerator()
