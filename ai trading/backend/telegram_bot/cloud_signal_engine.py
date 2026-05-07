"""
AIOK Trading — VIP Cloud Signal Engine V3 (SAFETY FIRST)
========================================================
CRITICAL FIXES:
- Momentum crash detection (prevents BUY during crashes)
- Friday whale protection (higher thresholds)
- Volatility spike filter (ATR-based)
- Stronger trend confirmation (EMA + structure + momentum)
- News/session awareness
- Smart warnings for users
"""

import logging
import time
import threading
from datetime import datetime

logger = logging.getLogger('AIOK.CLOUD_SIG')


class CloudSignalEngine:
    """VIP Signal Engine V3 — Safety First, Profit Second"""

    def __init__(self):
        self.active_signal = None
        self.last_sent_direction = None
        self.last_sent_score = None
        self.last_sent_price = 0
        self.last_sent_time = 0
        self.signals_today = 0
        self.state = 'IDLE'
        self._running = False
        self._thread = None
        self._last_scan = 0
        self.scan_interval = 120
        self.COOLDOWN_MINUTES = 30  # Min minutes between same-direction signals
        self.auto_execute = False   # Set True to auto-execute on MT5

    def _detect_crash(self, df, atr_val):
        """Detect if price is crashing or pumping (momentum override)"""
        if df is None or len(df) < 20:
            return None, 0

        close = df['close'].values
        high = df['high'].values
        low = df['low'].values

        # Check last 5 candles momentum
        recent_move = close[-1] - close[-6] if len(close) > 6 else 0
        recent_range = max(high[-6:]) - min(low[-6:]) if len(close) > 6 else 0

        # Check last 10 candles
        mid_move = close[-1] - close[-11] if len(close) > 11 else 0

        # Count red vs green in last 8 candles
        red_count = 0
        green_count = 0
        for i in range(-8, 0):
            if len(close) > abs(i):
                if close[i] < df['open'].values[i]:
                    red_count += 1
                else:
                    green_count += 1

        # CRASH: price dropped more than 1.5x ATR in last 5 candles
        if recent_move < -atr_val * 1.5 and red_count >= 5:
            return 'CRASH', abs(recent_move)

        # PUMP: price rose more than 1.5x ATR in last 5 candles  
        if recent_move > atr_val * 1.5 and green_count >= 5:
            return 'PUMP', abs(recent_move)

        # Strong bearish momentum (7+ red candles)
        if red_count >= 7:
            return 'BEARISH_MOMENTUM', abs(recent_move)

        # Strong bullish momentum (7+ green candles)
        if green_count >= 7:
            return 'BULLISH_MOMENTUM', abs(recent_move)

        return None, 0

    def _get_market_risk(self):
        """Calculate market risk level based on day/time/volatility"""
        now = datetime.now()
        day = now.weekday()  # 0=Mon, 4=Fri
        hour = now.hour

        risk_level = 'NORMAL'
        warnings = []

        # FRIDAY: Smart risk management (NOT blanket ban)
        if day == 4:
            warnings.append("⚠️ يوم الجمعة — كن حذراً")
            if hour >= 20:
                # Only block AFTER market close
                risk_level = 'EXTREME'
                warnings.append("🚨 السوق مغلق!")
            elif hour >= 15:
                # Late Friday: higher risk, tighter TP
                risk_level = 'HIGH'
                warnings.append("⏰ آخر ساعات الجمعة — TP مخفّض")
            else:
                # Friday morning/early afternoon: trade with caution
                risk_level = 'MEDIUM'

        # Monday early: gap risk
        if day == 0 and hour < 8:
            risk_level = 'HIGH'
            warnings.append("⚠️ افتتاح الأسبوع — احذر الفجوات")

        # Off-hours: low liquidity
        if hour < 7 or hour > 22:
            if risk_level == 'NORMAL':
                risk_level = 'MEDIUM'
            warnings.append("⏰ خارج أوقات التداول — سيولة منخفضة")

        # NFP: warning only (first Fri of month, 15:00-16:30)
        if day == 4 and now.day <= 7 and 15 <= hour <= 16:
            risk_level = 'HIGH'
            warnings.append("⚠️ محتمل NFP — تداول بحذر")

        return risk_level, warnings

    def _check_ema_trend(self, df):
        """Check actual EMA trend direction"""
        if df is None or len(df) < 50:
            return 'neutral'

        close = df['close'].values

        # EMA 8, 21, 50
        def ema(data, period):
            import numpy as np
            alpha = 2 / (period + 1)
            result = [data[0]]
            for i in range(1, len(data)):
                result.append(alpha * data[i] + (1 - alpha) * result[-1])
            return result

        ema8 = ema(close, 8)
        ema21 = ema(close, 21)
        ema50 = ema(close, 50)

        # Current values
        e8 = ema8[-1]
        e21 = ema21[-1]
        e50 = ema50[-1]
        price = close[-1]

        # Strong SELL: price < EMA8 < EMA21 < EMA50
        if price < e8 < e21 < e50:
            return 'strong_sell'

        # Strong BUY: price > EMA8 > EMA21 > EMA50
        if price > e8 > e21 > e50:
            return 'strong_buy'

        # Bearish: price below all EMAs
        if price < e8 and price < e21 and price < e50:
            return 'sell'

        # Bullish: price above all EMAs
        if price > e8 and price > e21 and price > e50:
            return 'buy'

        # Mixed
        if price < e21:
            return 'lean_sell'
        elif price > e21:
            return 'lean_buy'

        return 'neutral'

    def scan(self):
        """Run one VIP scan cycle with SAFETY FIRST"""
        try:
            from telegram_bot.cloud_data import cloud_data
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from technical_analysis import ta_engine

            # ====== TRY MT5 FIRST (Real-time), FALLBACK TO CLOUD ======
            mt5_available = False
            try:
                from mt5_connector import connector
                if connector.connected:
                    mt5_available = True
            except ImportError:
                pass

            if mt5_available:
                # MT5 DIRECT — fastest & most accurate
                df_5m = connector.get_candles('M5', 250)
                df_15m = connector.get_candles('M15', 250)
                df_1h = connector.get_candles('H1', 100)
                data_source = 'MT5 🖥️'

                # Get real-time tick for spread check
                tick = connector.get_tick()
                if tick:
                    spread = tick.get('spread', 0)
                    # Block if spread too high (> $3 for XAUUSD)
                    if spread > 3.0:
                        self.state = f"⚠️ SPREAD TOO HIGH (${spread:.2f}) — waiting"
                        return None
            else:
                # CLOUD FALLBACK — yfinance data
                df_5m = cloud_data.get_candles('5m', 250)
                df_15m = cloud_data.get_candles('15m', 250)
                df_1h = cloud_data.get_candles('1h', 100)
                data_source = 'Cloud ☁️'

            # Use M5 as primary if available, fallback to M15
            df_primary = df_5m if (df_5m is not None and len(df_5m) >= 50) else df_15m
            primary_tf = '5m' if df_primary is df_5m else '15m'

            if df_primary is None or len(df_primary) < 50:
                self.state = 'NO_DATA'
                return None

            if mt5_available and tick:
                price_data = {
                    'price': round((tick['bid'] + tick['ask']) / 2, 2),
                    'bid': tick['bid'],
                    'ask': tick['ask'],
                    'spread': tick.get('spread', 0),
                    'source': 'MT5',
                }
            else:
                price_data = cloud_data.get_current_price()

            if not price_data:
                self.state = 'NO_PRICE'
                return None

            price = price_data['price']
            bid = price_data['bid']
            ask = price_data['ask']

            # ====== MARKET RISK CHECK ======
            risk_level, risk_warnings = self._get_market_risk()

            # EXTREME risk = NO TRADING
            if risk_level == 'EXTREME':
                self.active_signal = None
                self.state = f"⛔ NO TRADE ({'; '.join(risk_warnings)})"
                return None

            # ====== ANALYZE ALL 3 TIMEFRAMES ======
            analysis_primary = ta_engine.analyze(df_primary)
            if not analysis_primary:
                self.state = 'ANALYSIS_FAIL'
                return None

            confluence_primary = ta_engine.get_confluence_score(analysis_primary)
            ta_direction = confluence_primary['direction']
            score = confluence_primary['score']
            edge = confluence_primary.get('edge', 0)
            details = confluence_primary.get('details', {})
            details['primary_tf'] = primary_tf.upper()

            # ====== M15 ANALYSIS ======
            m15_dir = 'neutral'
            m15_score = 0
            if df_15m is not None and len(df_15m) >= 30:
                analysis_m15 = ta_engine.analyze(df_15m)
                if analysis_m15:
                    conf_m15 = ta_engine.get_confluence_score(analysis_m15)
                    m15_dir = conf_m15['direction']
                    m15_score = conf_m15['score']
                    details['m15_trend'] = f"{m15_dir.upper()} ({m15_score}/10)"

            # ====== H1 ANALYSIS ======
            h1_dir = 'neutral'
            h1_score = 0
            if df_1h is not None and len(df_1h) >= 30:
                analysis_1h = ta_engine.analyze(df_1h)
                if analysis_1h:
                    conf_1h = ta_engine.get_confluence_score(analysis_1h)
                    h1_dir = conf_1h['direction']
                    h1_score = conf_1h['score']
                    h1_ema = self._check_ema_trend(df_1h)
                    details['h1_trend'] = f"{h1_dir.upper()} ({h1_score}/10)"
                    details['h1_ema'] = h1_ema

            # ====== RULE #1: ALL TIMEFRAMES MUST AGREE ======
            # This is the MOST important rule for accuracy
            tf_agree = 0
            agree_direction = None

            # Count agreements
            directions = [ta_direction, m15_dir, h1_dir]
            buy_count = sum(1 for d in directions if d == 'buy')
            sell_count = sum(1 for d in directions if d == 'sell')

            if buy_count >= 2 and sell_count == 0:
                agree_direction = 'buy'
                tf_agree = buy_count
                details['mtf'] = f'CONFIRMED ✅ ({buy_count}/3 TFs)'
            elif sell_count >= 2 and buy_count == 0:
                agree_direction = 'sell'
                tf_agree = sell_count
                details['mtf'] = f'CONFIRMED ✅ ({sell_count}/3 TFs)'
            else:
                # Timeframes DISAGREE — NO SIGNAL
                self.active_signal = None
                self.state = f"⚠️ TFs DISAGREE (M5:{ta_direction} M15:{m15_dir} H1:{h1_dir})"
                return None

            # Use the agreed direction
            direction = agree_direction

            # Bonus for 3/3 agreement
            if tf_agree == 3:
                score = min(score + 1.5, 10)
                details['mtf'] = 'ALL 3 TFs AGREE ✅✅✅'
            elif m15_dir == direction:
                score = min(score + 0.5, 10)
                details['m15_confirm'] = 'CONFIRMED'

            # ====== RULE #1.5: MOMENTUM ALIGNMENT CHECK ======
            # MACD, RSI, and Supertrend must NOT strongly disagree
            macd_data = analysis_primary.get('macd', {})
            macd_hist = macd_data.get('histogram', 0)
            macd_prev = macd_data.get('prev_histogram', 0)
            rsi_primary = analysis_primary.get('rsi', {})
            rsi_val_check = rsi_primary.get('value', 50) if isinstance(rsi_primary, dict) else 50
            supertrend_data = analysis_primary.get('supertrend', {})
            st_signal = supertrend_data.get('signal', 'neutral')

            # Count momentum disagreements
            momentum_against = 0

            # MACD falling while trying to BUY
            if direction == 'buy':
                if macd_hist < 0 and macd_hist < macd_prev:
                    momentum_against += 1  # MACD SELL + FALLING
                    details['macd_warning'] = '⚠️ MACD SELL (FALLING)'
                elif macd_hist < 0:
                    momentum_against += 0.5  # MACD just SELL
                if rsi_val_check < 45:
                    momentum_against += 0.5  # RSI leaning sell
                if st_signal == 'sell':
                    momentum_against += 1  # Supertrend SELL

            # MACD rising while trying to SELL
            if direction == 'sell':
                if macd_hist > 0 and macd_hist > macd_prev:
                    momentum_against += 1  # MACD BUY + RISING
                    details['macd_warning'] = '⚠️ MACD BUY (RISING)'
                elif macd_hist > 0:
                    momentum_against += 0.5  # MACD just BUY
                if rsi_val_check > 55:
                    momentum_against += 0.5  # RSI leaning buy
                if st_signal == 'buy':
                    momentum_against += 1  # Supertrend BUY

            # If 2+ momentum indicators disagree → BLOCK
            if momentum_against >= 2:
                self.active_signal = None
                self.state = f"⚠️ MOMENTUM AGAINST {direction.upper()} ({momentum_against:.1f}/3)"
                return None

            # If 1+ disagree → reduce score
            if momentum_against >= 1:
                score = max(score - 2, 0)
                details['momentum_warn'] = f'⚠️ Momentum conflict ({momentum_against:.1f})'

            # ====== RULE #1.6: ADX RANGE FILTER ======
            adx_data = analysis_primary.get('trend_strength', {})
            adx_val = adx_data.get('adx', 25) if isinstance(adx_data, dict) else 25

            if adx_val < 15:
                # VERY weak trend — only trade from S/R zones with high score
                score = max(score - 2, 0)
                details['adx_warning'] = f'⚠️ RANGE (ADX {adx_val:.0f}) — ترند ضعيف'

            # ====== RULE #2: RSI EXTREME PROTECTION ======
            atr = analysis_primary.get('atr', {})
            atr_val = atr.get('value', 5.0) if isinstance(atr, dict) else 5.0

            rsi_data = analysis_primary.get('rsi', {})
            rsi_val = rsi_data.get('value', 50) if isinstance(rsi_data, dict) else 50

            # Don't SELL when oversold, don't BUY when overbought
            if rsi_val < 20 and direction == 'sell':
                self.active_signal = None
                self.state = f"🔴 RSI OVERSOLD ({rsi_val:.0f}) — ارتداد متوقع!"
                return None
            if rsi_val > 80 and direction == 'buy':
                self.active_signal = None
                self.state = f"🔴 RSI OVERBOUGHT ({rsi_val:.0f}) — تصحيح متوقع!"
                return None

            # RSI warning zone: reduce score
            if rsi_val < 30 and direction == 'sell':
                score = max(score - 2, 0)
                details['rsi_warning'] = f'⚠️ RSI LOW ({rsi_val:.0f}) — احذر الارتداد'
            if rsi_val > 70 and direction == 'buy':
                score = max(score - 2, 0)
                details['rsi_warning'] = f'⚠️ RSI HIGH ({rsi_val:.0f}) — احذر التصحيح'

            # ====== RULE #3: EXHAUSTION DETECTION ======
            # Don't chase a move that's already gone too far
            ema_trend = self._check_ema_trend(df_primary)
            details['ema_real'] = ema_trend

            close_prices = df_primary['close'].values.astype(float)
            current_price = close_prices[-1]

            # Calculate EMA50
            def calc_ema(data, period):
                alpha = 2 / (period + 1)
                result = [data[0]]
                for i in range(1, len(data)):
                    result.append(alpha * data[i] + (1 - alpha) * result[-1])
                return result[-1]

            ema50 = calc_ema(close_prices, 50)
            distance_from_ema = abs(current_price - ema50)

            # If price is more than 3x ATR away from EMA50, move is exhausted
            if distance_from_ema > atr_val * 3:
                if direction == 'sell' and current_price < ema50:
                    score = max(score - 3, 0)
                    details['exhaustion'] = f'⚠️ EXHAUSTED (-${distance_from_ema:.0f} from EMA50)'
                elif direction == 'buy' and current_price > ema50:
                    score = max(score - 3, 0)
                    details['exhaustion'] = f'⚠️ EXHAUSTED (+${distance_from_ema:.0f} from EMA50)'

            # ====== RULE #4: EMA ALIGNMENT CHECK ======
            is_strong_momentum = False  # No more crash overrides

            if not is_strong_momentum:
                if direction == 'buy' and ema_trend in ('strong_sell',):
                    self.active_signal = None
                    self.state = "⚠️ EMAs STRONG SELL — لا تشتري!"
                    return None
                if direction == 'sell' and ema_trend in ('strong_buy',):
                    self.active_signal = None
                    self.state = "⚠️ EMAs STRONG BUY — لا تبيع!"
                    return None

            self.state = f"SCANNING ({direction.upper()} {score}/10 | Edge:{edge})"

            # ====== RULE #5: QUALITY FILTERS ======
            min_score = 7  # Raised from 6 to 7 for better accuracy
            try:
                from telegram_bot.database import db
                min_score = int(db.get_setting('min_score', '7'))
            except Exception:
                pass

            if score < min_score or direction == 'neutral':
                self.active_signal = None
                self.state = f"WAITING (Score {score} < {min_score})"
                return None

            # Edge filter
            if edge < 1.0:
                self.active_signal = None
                self.state = f"WEAK EDGE ({edge})"
                return None

            # ====== S/R ZONE-BASED TP/SL (Professional Trader Style) ======
            atr_for_sl = atr_val

            if primary_tf == '5m' and df_15m is not None and len(df_15m) >= 30:
                analysis_m15_sl = ta_engine.analyze(df_15m)
                if analysis_m15_sl:
                    m15_atr = analysis_m15_sl.get('atr', {})
                    m15_atr_val = m15_atr.get('value', 5.0) if isinstance(m15_atr, dict) else 5.0
                    atr_for_sl = max(atr_for_sl, m15_atr_val)

            # XAUUSD ATR bounds: min $3, max $12
            atr_for_sl = max(min(atr_for_sl, 12.0), 3.0)

            # Get S/R zones from analysis
            sr = analysis_primary.get('support_resistance', {})
            support = sr.get('support', 0)
            resistance = sr.get('resistance', 99999)
            sup_zone = sr.get('support_zone', [support - 2, support + 2])
            res_zone = sr.get('resistance_zone', [resistance - 2, resistance + 2])
            sr_position = sr.get('position', 'middle')
            sup_strength = sr.get('support_strength', 1)
            res_strength = sr.get('resistance_strength', 1)

            # Also get H1 S/R zones (wider view)
            h1_support = support
            h1_resistance = resistance
            if df_1h is not None and len(df_1h) >= 30:
                h1_analysis = ta_engine.analyze(df_1h)
                if h1_analysis:
                    h1_sr = h1_analysis.get('support_resistance', {})
                    h1_support = h1_sr.get('support', support)
                    h1_resistance = h1_sr.get('resistance', resistance)

            # Add S/R info to details for display
            details['support'] = f"{support:.2f}"
            details['resistance'] = f"{resistance:.2f}"
            details['sup_zone'] = f"{sup_zone[0]:.2f} - {sup_zone[1]:.2f}" if sup_zone else ''
            details['res_zone'] = f"{res_zone[0]:.2f} - {res_zone[1]:.2f}" if res_zone else ''
            details['sr_position'] = sr_position

            # ====== ENTRY LOCATION FILTER ======
            # DON'T trade in the middle — wait for price to reach S/R zone
            if sr_position == 'middle':
                # Only allow if score is very high (8+) — strong momentum
                if score < 8:
                    self.active_signal = None
                    self.state = f"⏳ WAITING FOR S/R (price in middle zone)"
                    return None

            # SELL should be near resistance, BUY should be near support
            if direction == 'sell' and sr_position == 'near_support':
                # We're near support trying to sell — BAD entry
                if score < 9:
                    self.active_signal = None
                    self.state = f"⚠️ SELL near SUPPORT ({support:.0f}) — bad entry!"
                    return None

            if direction == 'buy' and sr_position == 'near_resistance':
                # We're near resistance trying to buy — BAD entry
                if score < 9:
                    self.active_signal = None
                    self.state = f"⚠️ BUY near RESISTANCE ({resistance:.0f}) — bad entry!"
                    return None

            # ====== SET TP/SL BASED ON S/R ZONES ======
            if direction == 'buy':
                entry = ask

                # TP1: nearest resistance zone (conservative)
                tp1 = round(resistance - 1.0, 2) if resistance < 99999 else round(entry + atr_for_sl * 1.5, 2)
                # TP2: H1 resistance or extended target
                tp2 = round(h1_resistance - 1.0, 2) if h1_resistance > resistance else round(entry + atr_for_sl * 2.5, 2)

                # SL: below support zone
                sl = round(sup_zone[0] - 2.0, 2) if sup_zone[0] > 0 else round(entry - atr_for_sl * 1.0, 2)

                # Minimum TP distance
                if tp1 - entry < atr_for_sl * 0.8:
                    tp1 = round(entry + atr_for_sl * 1.5, 2)
                if tp2 - entry < tp1 - entry:
                    tp2 = round(entry + atr_for_sl * 2.5, 2)

            else:  # SELL
                entry = bid

                # TP1: nearest support zone (conservative)
                tp1 = round(support + 1.0, 2) if support > 0 else round(entry - atr_for_sl * 1.5, 2)
                # TP2: H1 support or extended target
                tp2 = round(h1_support + 1.0, 2) if h1_support < support else round(entry - atr_for_sl * 2.5, 2)

                # SL: above resistance zone
                sl = round(res_zone[1] + 2.0, 2) if res_zone[1] < 99999 else round(entry + atr_for_sl * 1.0, 2)

                # Minimum TP distance
                if entry - tp1 < atr_for_sl * 0.8:
                    tp1 = round(entry - atr_for_sl * 1.5, 2)
                if entry - tp2 < entry - tp1:
                    tp2 = round(entry - atr_for_sl * 2.5, 2)

            # ====== SANITY CHECKS ======
            if direction == 'buy':
                if tp1 <= entry: tp1 = round(entry + atr_for_sl * 1.5, 2)
                if tp2 <= entry: tp2 = round(entry + atr_for_sl * 2.5, 2)
                if sl >= entry: sl = round(entry - atr_for_sl * 1.0, 2)
            else:
                if tp1 >= entry: tp1 = round(entry - atr_for_sl * 1.5, 2)
                if tp2 >= entry: tp2 = round(entry - atr_for_sl * 2.5, 2)
                if sl <= entry: sl = round(entry + atr_for_sl * 1.0, 2)

            # Max SL cap: $15
            if abs(sl - entry) > 15:
                sl = round(entry - 15, 2) if direction == 'buy' else round(entry + 15, 2)

            # Friday: tighter TP (less risk)
            if risk_level == 'HIGH':
                if direction == 'buy':
                    tp1 = round(entry + atr_for_sl * 1.0, 2)
                    tp2 = round(entry + atr_for_sl * 1.5, 2)
                else:
                    tp1 = round(entry - atr_for_sl * 1.0, 2)
                    tp2 = round(entry - atr_for_sl * 1.5, 2)

            # R:R check — directional (not abs)
            risk = abs(entry - sl)
            reward = abs(tp1 - entry)
            if risk <= 0 or reward <= 0:
                self.active_signal = None
                self.state = "INVALID TP/SL"
                return None

            if reward / risk < 0.8:
                self.active_signal = None
                self.state = f"BAD R:R ({reward/risk:.1f})"
                return None

            rr1 = round(reward / risk, 1) if risk > 0 else 0
            rr2 = round(abs(tp2 - entry) / risk, 1) if risk > 0 else 0

            # ====== DUPLICATE PREVENTION ======
            now_ts = time.time()
            price_diff = abs(entry - self.last_sent_price) if self.last_sent_price > 0 else 999
            time_since_last = (now_ts - self.last_sent_time) / 60  # minutes

            # Different direction = always allow (market reversed)
            if direction != self.last_sent_direction:
                pass  # No cooldown for direction change
            else:
                # 20 min cooldown for same direction + similar price
                if (price_diff < atr_for_sl * 2 and time_since_last < 20):
                    self.state = f"COOLDOWN ({20 - time_since_last:.0f}min left)"
                    return None

            # ====== BUILD SIGNAL ======
            score = int(score)  # Ensure integer for display
            # Use direction + rounded price as ID (prevents same signal every 2 min)
            price_rounded = round(entry / 5) * 5  # Round to nearest $5
            sig_id = f"{direction}_{price_rounded:.0f}_{score}_{datetime.now().strftime('%Y%m%d_%H%M')}"
            is_new = True  # If we passed cooldown check, it's a new signal

            # Risk warning text
            if risk_level == 'HIGH':
                risk_note = "⚠️ يوم عالي المخاطر — TP مخفّض للحماية"
            elif risk_level == 'MEDIUM':
                risk_note = "⚠️ سيولة منخفضة — كن حذراً"
            else:
                risk_note = "✅ ظروف طبيعية"

            signal = {
                'signal_id': sig_id,
                'direction': direction,
                'score': score,
                'strength': 'VIP 💎' if score >= 8 else 'STRONG' if score >= 7 else 'MODERATE',
                'entry_price': round(entry, 2),
                'price': round(price, 2),
                'tp': round(tp1, 2),
                'tp1': round(tp1, 2),
                'tp2': round(tp2, 2),
                'sl': round(sl, 2),
                'risk_reward': f"1:{rr1}",
                'is_tradeable': True,
                'is_new': is_new,
                'indicators': {
                    'atr': {'value': atr_for_sl},
                    'support': support,
                    'resistance': resistance,
                },
                'confluence_details': details,
                'ml_probability': 0,
                'edge': edge,
                'risk_level': risk_level,
                'risk_note': '; '.join(risk_warnings) if risk_warnings else '',
                'risk_warnings': risk_warnings,
                'momentum': None,
                'ema_trend': ema_trend,
                'source': 'Cloud ☁️' if price_data.get('source') != 'MT5' else 'MT5 🖥️',
                'timestamp': datetime.now().isoformat(),
            }

            self.last_sent_direction = direction
            self.last_sent_score = score
            self.last_sent_price = entry
            self.last_sent_time = now_ts
            self.signals_today += 1
            logger.info(
                "[CLOUD_SIG] ✅ VIP SIGNAL: %s XAUUSD @ %.2f | Score: %d/10 | Edge: %.1f | R:R 1:%.1f | Risk: %s | Source: %s",
                direction.upper(), entry, score, edge, rr1, risk_level,
                'MT5' if mt5_available else 'Cloud'
            )

            self.active_signal = signal
            self.state = f"SIGNAL: {direction.upper()} {score}/10 (Edge:{edge} | {risk_level})"

            # ====== AUTO-EXECUTE ON MT5 (if enabled) ======
            if self.auto_execute and mt5_available:
                self._auto_execute_signal(signal)

            return signal

        except Exception as e:
            logger.error("[CLOUD_SIG] Scan error: %s", e)
            self.state = f'ERROR: {e}'
            return None

    def _auto_execute_signal(self, signal):
        """Auto-execute signal on MT5 with risk management"""
        try:
            from mt5_connector import connector
            from trade_executor import trade_executor

            if not connector.connected:
                logger.warning("[AUTO] MT5 not connected — skipping auto-execute")
                return

            # Get account info for position sizing
            account = connector.get_account_info()
            symbol_info = connector.get_symbol_info()

            if not account or not symbol_info:
                logger.warning("[AUTO] Cannot get account/symbol info")
                return

            # Check balance
            balance = account.get('balance', 0)
            if balance < 50:
                logger.warning("[AUTO] Balance too low ($%.2f) — skipping", balance)
                return

            # Check existing positions (max 2)
            positions = connector.get_open_positions()
            if len(positions) >= 2:
                logger.info("[AUTO] Max positions (2) reached — skipping")
                return

            # Prepare signal for trade executor
            sl_distance = abs(signal['entry_price'] - signal['sl'])
            trade_signal = {
                'direction': signal['direction'],
                'price': signal['entry_price'],
                'sl': signal['sl'],
                'tp': signal['tp1'],
                'score': signal['score'],
                'sl_distance': sl_distance,
                'is_tradeable': True,
            }

            result = trade_executor.execute_trade(trade_signal, account, symbol_info)

            if result.get('success'):
                logger.info("[AUTO] ✅ TRADE EXECUTED: %s @ %.2f | Ticket: %s",
                           signal['direction'].upper(), signal['entry_price'],
                           result.get('ticket', 'N/A'))
                signal['auto_executed'] = True
                signal['ticket'] = result.get('ticket')
            else:
                logger.warning("[AUTO] ❌ Execution failed: %s", result.get('error', 'Unknown'))
                signal['auto_executed'] = False
                signal['execute_error'] = result.get('error', '')

        except Exception as e:
            logger.error("[AUTO] Auto-execute error: %s", e)

    def start(self):
        if self._running:
            return
        self._running = True

        def _loop():
            logger.info("[CLOUD_SIG] ⭐ VIP Signal Engine V3 started (SAFETY FIRST)")
            while self._running:
                now = time.time()
                if now - self._last_scan >= self.scan_interval:
                    self.scan()
                    self._last_scan = now
                time.sleep(10)

        self._thread = threading.Thread(target=_loop, daemon=True, name='CloudSignalEngine')
        self._thread.start()

    def stop(self):
        self._running = False


cloud_signal_engine = CloudSignalEngine()

