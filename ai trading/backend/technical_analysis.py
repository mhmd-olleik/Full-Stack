"""
AIOK Trading - ELITE Indicator Engine V6
=====================================
Professional weighted confluence system used by institutional traders.

STRATEGY: "Trend is King, Momentum is Queen"
- H1 determines DIRECTION (3 points)
- Momentum CONFIRMS direction (2 points) 
- RSI/StochRSI for TIMING (1.5 points)
- MACD for CONFIRMATION (1.5 points)
- Price Action for ENTRY (1 point)
- Volume for VALIDATION (1 point)

Total: 10 points weighted
Trade at 6+ = strong setup

Pro Features:
- Market Structure (Higher Highs / Lower Lows)
- Supply & Demand Zones
- VWAP (Volume Weighted Average Price)
- Multi-EMA Ribbon
- Fibonacci Key Levels

V6 NEW — Institutional Grade:
- Volume Profile (liquidity zones / POC / VAH / VAL)
- BOS/CHoCH Detection (Break of Structure / Change of Character)
- Session Analysis (London / New York / Asian session filter)
"""

import pandas as pd
import numpy as np
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class TechnicalAnalysis:
    """ELITE Indicator Engine - Institutional Grade"""

    def __init__(self):
        self.indicators = {}

    def analyze(self, df):
        if df is None or len(df) < 30:
            return None

        close = df['close'].values.astype(float)
        high = df['high'].values.astype(float)
        low = df['low'].values.astype(float)
        open_p = df['open'].values.astype(float)
        volume = df['volume'].values.astype(float) if 'volume' in df.columns else np.ones(len(close))

        results = {}
        results['rsi'] = self._rsi(close)
        results['macd'] = self._macd(close)
        results['bb'] = self._bollinger(close)
        results['ema'] = self._ema_ribbon(close)
        results['stochrsi'] = self._stoch_rsi(close)
        results['atr'] = self._atr(high, low, close)
        results['candle_pattern'] = self._candle_patterns(open_p, high, low, close)
        results['trend_strength'] = self._adx_trend(close, high, low)
        results['support_resistance'] = self._sr_levels(high, low, close)
        results['momentum'] = self._momentum(close)
        results['volume'] = self._volume_analysis(volume, close)
        results['ichimoku'] = self._ichimoku(high, low, close)
        results['market_structure'] = self._market_structure(high, low, close)
        results['vwap'] = self._vwap(high, low, close, volume)
        results['fibonacci'] = self._fibonacci(high, low, close)
        results['volume_profile'] = self._volume_profile(high, low, close, volume)
        results['bos_choch'] = self._bos_choch(high, low, close)
        results['session'] = self._session_analysis()

        # NEW PRO INDICATORS
        results['supertrend'] = self._supertrend(high, low, close)
        results['fvg'] = self._fair_value_gap(high, low, close)
        results['order_blocks'] = self._order_blocks(open_p, high, low, close)
        results['pivot_points'] = self._pivot_points(high, low, close)
        results['hull_ma'] = self._hull_ma(close)
        results['williams_r'] = self._williams_r(high, low, close)
        results['close_price'] = float(close[-1])
        results['open_price'] = float(open_p[-1]) if len(open_p) > 0 else float(close[-1])
        results['day_high'] = float(np.max(high[-50:]))  # Recent high
        results['day_low'] = float(np.min(low[-50:]))    # Recent low

        # Daily Bias: is the day bullish or bearish overall?
        day_range = results['day_high'] - results['day_low']
        price_position = (results['close_price'] - results['day_low']) / day_range if day_range > 0 else 0.5
        results['daily_bias'] = {
            'direction': 'bullish' if price_position > 0.5 else 'bearish' if price_position < 0.4 else 'neutral',
            'position': round(price_position, 2),
            'day_high': results['day_high'],
            'day_low': results['day_low'],
            'day_range': round(day_range, 2),
            'is_pullback_buy': price_position < 0.6 and results['close_price'] > results['day_low'] + day_range * 0.3,
            'is_pullback_sell': price_position > 0.4 and results['close_price'] < results['day_high'] - day_range * 0.3,
        }

        self.indicators = results
        return results

    def get_confluence_score(self, ind=None):
        """
        WEIGHTED confluence scoring (0-10):
        - Trend Group: 3 pts (EMA ribbon + ADX + Ichimoku)
        - Momentum Group: 2 pts (MACD + Momentum + Market Structure)
        - Timing Group: 1.5 pts (RSI + StochRSI)
        - Confirmation Group: 1.5 pts (BB + Candle Pattern)
        - Validation Group: 1 pt (Volume)
        - Bonus: 1.5 pts (VWAP + Fibonacci + Reversal/Divergence)
        """
        ind = ind or self.indicators
        if not ind:
            return {'direction': 'neutral', 'score': 0, 'max_score': 10, 'details': {}, 'edge': 0}

        buy_w = 0.0
        sell_w = 0.0
        details = {}

        # Check if market is ranging (ADX < 20)
        ts = ind.get('trend_strength', {})
        adx = ts.get('adx', 0)
        is_ranging = adx < 20

        # ========= TREND GROUP (3 points) =========
        # In RANGE mode, trend weight is reduced and S/R becomes more important
        if not is_ranging:
            # EMA Ribbon (1.5 pts)
            ema = ind.get('ema', {})
            if ema.get('signal') == 'buy':
                buy_w += 1.5
                details['ema'] = 'BULLISH RIBBON'
            elif ema.get('signal') == 'sell':
                sell_w += 1.5
                details['ema'] = 'BEARISH RIBBON'
            else:
                details['ema'] = 'MIXED'

            # ADX Trend (1.0 pt)
            if ts.get('direction') == 'up':
                buy_w += 1.0
                details['trend'] = 'UP (ADX %.0f)' % adx
            elif ts.get('direction') == 'down':
                sell_w += 1.0
                details['trend'] = 'DOWN (ADX %.0f)' % adx
            else:
                details['trend'] = 'WEAK'
        else:
            # RANGE MODE: Use EMA + S/R but with LOWER weight
            ema = ind.get('ema', {})
            if ema.get('signal') == 'buy':
                buy_w += 0.75
                details['ema'] = 'EMA BUY (Range)'
            elif ema.get('signal') == 'sell':
                sell_w += 0.75
                details['ema'] = 'EMA SELL (Range)'
            else:
                details['ema'] = 'RANGE MODE'
            details['trend'] = 'RANGE (ADX %.0f)' % adx
            sr = ind.get('support_resistance', {})
            ds = sr.get('dist_support', 999)
            dr = sr.get('dist_resistance', 999)
            if ds < dr * 0.3:  # Very close to support = BUY zone
                buy_w += 0.75
                details['trend'] = 'NEAR SUPPORT (ADX %.0f)' % adx
            elif dr < ds * 0.3:  # Very close to resistance = SELL zone
                sell_w += 0.75
                details['trend'] = 'NEAR RESISTANCE (ADX %.0f)' % adx

        # Ichimoku (0.75 pt) — strong trend confirmer
        ichi = ind.get('ichimoku', {})
        if ichi.get('signal') == 'buy':
            buy_w += 0.75
            details['ichimoku'] = 'ABOVE CLOUD'
        elif ichi.get('signal') == 'sell':
            sell_w += 0.75
            details['ichimoku'] = 'BELOW CLOUD'
        else:
            details['ichimoku'] = 'IN CLOUD'

        # ========= MOMENTUM GROUP (2 points) =========
        # MACD (1.0 pt) with crossover bonus
        macd = ind.get('macd', {})
        h = macd.get('histogram', 0)
        prev_h = macd.get('prev_histogram', 0)
        if h > 0:
            buy_w += 0.75
            if h > prev_h:
                buy_w += 0.25
                details['macd'] = 'BUY (RISING)'
            else:
                details['macd'] = 'BUY'
        elif h < 0:
            sell_w += 0.75
            if h < prev_h:
                sell_w += 0.25
                details['macd'] = 'SELL (FALLING)'
            else:
                details['macd'] = 'SELL'
        else:
            details['macd'] = 'FLAT'

        # MACD crossover detection (extra 0.5)
        if macd.get('crossover'):
            buy_w += 0.5
            details['macd'] = 'BUY CROSSOVER!'
        elif macd.get('crossunder'):
            sell_w += 0.5
            details['macd'] = 'SELL CROSSOVER!'

        # Momentum/ROC (0.5 pt)
        mom = ind.get('momentum', {})
        if mom.get('signal') == 'buy':
            buy_w += 0.5
            details['momentum'] = 'BULLISH'
        elif mom.get('signal') == 'sell':
            sell_w += 0.5
            details['momentum'] = 'BEARISH'
        else:
            details['momentum'] = 'FLAT'

        # Market Structure (0.5 pt)
        ms = ind.get('market_structure', {})
        if ms.get('structure') == 'bullish':
            buy_w += 0.5
            details['structure'] = 'HH/HL (BULL)'
        elif ms.get('structure') == 'bearish':
            sell_w += 0.5
            details['structure'] = 'LH/LL (BEAR)'
        else:
            details['structure'] = 'RANGE'

        # ========= TIMING GROUP (1.5 points) =========
        # RSI (0.75 pt) — widened thresholds
        rsi = ind.get('rsi', {})
        rv = rsi.get('value', 50)
        if rv < 30:
            buy_w += 0.75
            details['rsi'] = 'OVERSOLD (%.0f)' % rv
        elif rv > 70:
            sell_w += 0.75
            details['rsi'] = 'OVERBOUGHT (%.0f)' % rv
        elif rv < 40:
            buy_w += 0.5
            details['rsi'] = 'LOW (%.0f)' % rv
        elif rv > 60:
            sell_w += 0.5
            details['rsi'] = 'HIGH (%.0f)' % rv
        elif rv < 48:
            buy_w += 0.25
            details['rsi'] = 'LEAN BUY (%.0f)' % rv
        elif rv > 52:
            sell_w += 0.25
            details['rsi'] = 'LEAN SELL (%.0f)' % rv
        else:
            details['rsi'] = 'NEUTRAL'

        # StochRSI (0.75 pt) — widened
        stoch = ind.get('stochrsi', {})
        sk = stoch.get('k', 50)
        if sk < 20:
            buy_w += 0.75
            details['stochrsi'] = 'OVERSOLD (%.0f)' % sk
        elif sk > 80:
            sell_w += 0.75
            details['stochrsi'] = 'OVERBOUGHT (%.0f)' % sk
        elif sk < 35:
            buy_w += 0.5
            details['stochrsi'] = 'LOW (%.0f)' % sk
        elif sk > 65:
            sell_w += 0.5
            details['stochrsi'] = 'HIGH (%.0f)' % sk
        elif sk < 45:
            buy_w += 0.25
            details['stochrsi'] = 'LEAN BUY (%.0f)' % sk
        elif sk > 55:
            sell_w += 0.25
            details['stochrsi'] = 'LEAN SELL (%.0f)' % sk
        else:
            details['stochrsi'] = 'MID'

        # ========= CONFIRMATION GROUP (1.5 points) =========
        # Bollinger Bands (0.75 pt) — widened
        bb = ind.get('bb', {})
        bp = bb.get('position', 0.5)
        if bp < 0.2:
            buy_w += 0.75
            details['bb'] = 'LOWER BAND'
        elif bp > 0.8:
            sell_w += 0.75
            details['bb'] = 'UPPER BAND'
        elif bp < 0.35:
            buy_w += 0.5
            details['bb'] = 'LOW (%.0f%%)' % (bp*100)
        elif bp > 0.65:
            sell_w += 0.5
            details['bb'] = 'HIGH (%.0f%%)' % (bp*100)
        elif bp < 0.45:
            buy_w += 0.25
            details['bb'] = 'LEAN LOW (%.0f%%)' % (bp*100)
        elif bp > 0.55:
            sell_w += 0.25
            details['bb'] = 'LEAN HIGH (%.0f%%)' % (bp*100)
        else:
            details['bb'] = 'MID'

        # Candle Pattern (0.75 pt)
        cp = ind.get('candle_pattern', {})
        if cp.get('signal') == 'buy':
            strength_bonus = 0.75 if cp.get('strength') == 'strong' else 0.5
            buy_w += strength_bonus
            details['candle'] = cp.get('pattern', 'BULLISH')
        elif cp.get('signal') == 'sell':
            strength_bonus = 0.75 if cp.get('strength') == 'strong' else 0.5
            sell_w += strength_bonus
            details['candle'] = cp.get('pattern', 'BEARISH')
        else:
            details['candle'] = 'NONE'

        # ========= VALIDATION GROUP (1 point) =========
        vol = ind.get('volume', {})
        vr = vol.get('ratio', 1.0)
        if vr > 1.3:
            dominant = 'buy' if buy_w > sell_w else 'sell' if sell_w > buy_w else 'none'
            if dominant == 'buy':
                buy_w += 1.0
                details['volume'] = 'CONFIRMS BUY (%.1fx)' % vr
            elif dominant == 'sell':
                sell_w += 1.0
                details['volume'] = 'CONFIRMS SELL (%.1fx)' % vr
            else:
                details['volume'] = 'HIGH (%.1fx)' % vr
        elif vr > 0.8:
            # Normal volume still gives points to dominant direction
            if buy_w > sell_w:
                buy_w += 0.5
            elif sell_w > buy_w:
                sell_w += 0.5
            details['volume'] = 'NORMAL (%.1fx)' % vr
        else:
            details['volume'] = 'LOW'

        # ========= BONUS (up to 1.5 points) =========
        # VWAP (0.5 pt)
        vwap = ind.get('vwap', {})
        if vwap.get('signal') == 'buy':
            buy_w += 0.5
            details['vwap'] = 'ABOVE VWAP'
        elif vwap.get('signal') == 'sell':
            sell_w += 0.5
            details['vwap'] = 'BELOW VWAP'
        else:
            details['vwap'] = 'AT VWAP'

        # Fibonacci (0.5 pt)
        fib = ind.get('fibonacci', {})
        if fib.get('signal') == 'buy':
            buy_w += 0.5
            details['fibonacci'] = 'FIB SUPPORT (%.1f%%)' % fib.get('level', 0)
        elif fib.get('signal') == 'sell':
            sell_w += 0.5
            details['fibonacci'] = 'FIB RESISTANCE (%.1f%%)' % fib.get('level', 0)
        else:
            details['fibonacci'] = 'BETWEEN LEVELS'

        # ========= V6 PRO: VOLUME PROFILE (0.5 pt) =========
        vp = ind.get('volume_profile', {})
        if vp.get('signal') == 'buy':
            buy_w += 0.5
            details['vol_profile'] = 'NEAR VAL (%.2f)' % vp.get('val', 0)
        elif vp.get('signal') == 'sell':
            sell_w += 0.5
            details['vol_profile'] = 'NEAR VAH (%.2f)' % vp.get('vah', 0)
        elif vp.get('at_poc'):
            details['vol_profile'] = 'AT POC (%.2f)' % vp.get('poc', 0)
        else:
            details['vol_profile'] = 'NORMAL'

        # ========= V6 PRO: BOS/CHoCH (0.75 pt) =========
        bos = ind.get('bos_choch', {})
        if bos.get('type') == 'BOS':
            if bos.get('direction') == 'bullish':
                buy_w += 0.75
                details['bos_choch'] = 'BOS BULLISH'
            else:
                sell_w += 0.75
                details['bos_choch'] = 'BOS BEARISH'
        elif bos.get('type') == 'CHoCH':
            if bos.get('direction') == 'bullish':
                buy_w += 0.5
                details['bos_choch'] = 'CHoCH BULLISH'
            else:
                sell_w += 0.5
                details['bos_choch'] = 'CHoCH BEARISH'
        else:
            details['bos_choch'] = 'NO BREAK'

        # ========= V6 PRO: SESSION FILTER (0.75 pt) =========
        session = ind.get('session', {})
        active_session = session.get('active', 'off')
        if active_session in ('london', 'new_york', 'london_ny_overlap'):
            dominant = 'buy' if buy_w > sell_w else 'sell' if sell_w > buy_w else 'none'
            if dominant == 'buy':
                buy_w += 0.75
            elif dominant == 'sell':
                sell_w += 0.75
            details['session'] = '%s SESSION' % active_session.upper().replace('_', ' ')
        elif active_session == 'asian':
            details['session'] = 'ASIAN (low vol)'
        else:
            details['session'] = 'OFF-HOURS'

        # ========= REVERSAL DETECTION (0.5 pt bonus) =========
        # Counter-trend bounce: RSI extreme + candle reversal pattern
        reversal_detected = False
        if rv < 25 and cp.get('signal') == 'buy':
            buy_w += 0.5
            details['reversal'] = 'BOUNCE BUY! (RSI %.0f + %s)' % (rv, cp.get('pattern', ''))
            reversal_detected = True
        elif rv > 75 and cp.get('signal') == 'sell':
            sell_w += 0.5
            details['reversal'] = 'REVERSAL SELL! (RSI %.0f + %s)' % (rv, cp.get('pattern', ''))
            reversal_detected = True

        # RSI Divergence detection
        if not reversal_detected:
            div = ind.get('momentum', {})
            roc = div.get('roc', 0)
            # Bullish divergence: price falling (roc < 0) but RSI rising (> 40 from oversold)
            if roc < -0.05 and 35 < rv < 50:
                buy_w += 0.5
                details['reversal'] = 'BULLISH DIVERGENCE'
            # Bearish divergence: price rising (roc > 0) but RSI falling (< 60 from overbought)
            elif roc > 0.05 and 50 < rv < 65:
                sell_w += 0.5
                details['reversal'] = 'BEARISH DIVERGENCE'
            else:
                details['reversal'] = 'NONE'

        # ========= ENTRY ZONE DETECTION (up to 1 pt bonus) =========
        # Detects optimal entry points — considers daily context
        close_price = ind.get('close_price', 0)
        ema_data = ind.get('ema', {})
        ema21 = ema_data.get('ema21', close_price)
        ema50 = ema_data.get('ema50', close_price)
        sr = ind.get('support_resistance', {})
        support = sr.get('support', 0)
        resistance = sr.get('resistance', 99999)
        atr_val = ind.get('atr', {}).get('value', 5.0)
        daily = ind.get('daily_bias', {})
        daily_dir = daily.get('direction', 'neutral')
        is_pullback_buy = daily.get('is_pullback_buy', False)
        is_pullback_sell = daily.get('is_pullback_sell', False)

        entry_zone = 'NONE'

        if close_price > 0 and atr_val > 0:
            dist_to_ema21 = close_price - ema21 if ema21 else 0
            dist_to_support = close_price - support if support else 999
            dist_to_resistance = resistance - close_price if resistance else 999

            # DAILY BIAS OVERRIDE: Bullish day + pullback = BUY THE DIP!
            if daily_dir == 'bullish' and is_pullback_buy:
                if dist_to_support < atr_val * 1.5:
                    buy_w += 1.0
                    entry_zone = 'BUY DIP! (bullish day + near support %.2f)' % support
                elif abs(dist_to_ema21) < atr_val * 0.8:
                    buy_w += 0.75
                    entry_zone = 'BUY DIP! (bullish day + pullback to EMA)'
                else:
                    buy_w += 0.5
                    entry_zone = 'BUY ZONE (bullish day pullback)'

            elif daily_dir == 'bearish' and is_pullback_sell:
                if dist_to_resistance < atr_val * 1.5:
                    sell_w += 1.0
                    entry_zone = 'SELL RALLY! (bearish day + near resist %.2f)' % resistance
                elif abs(dist_to_ema21) < atr_val * 0.8:
                    sell_w += 0.75
                    entry_zone = 'SELL RALLY! (bearish day + rally to EMA)'
                else:
                    sell_w += 0.5
                    entry_zone = 'SELL ZONE (bearish day rally)'

            # Standard entry zones (when no strong daily bias)
            elif ema21 and ema50 and ema21 > ema50:  # Uptrend
                if abs(dist_to_ema21) < atr_val * 0.5:
                    buy_w += 0.75
                    entry_zone = 'BUY ZONE (pullback to EMA21)'
                elif dist_to_support < atr_val * 0.8:
                    buy_w += 0.75
                    entry_zone = 'BUY ZONE (near support %.2f)' % support

            elif ema21 and ema50 and ema21 < ema50:  # Downtrend
                if abs(dist_to_ema21) < atr_val * 0.5:
                    sell_w += 0.75
                    entry_zone = 'SELL ZONE (rally to EMA21)'
                elif dist_to_resistance < atr_val * 0.8:
                    sell_w += 0.75
                    entry_zone = 'SELL ZONE (near resistance %.2f)' % resistance

            else:  # Range
                if dist_to_support < atr_val * 0.5:
                    buy_w += 0.5
                    entry_zone = 'BUY ZONE (support bounce %.2f)' % support
                elif dist_to_resistance < atr_val * 0.5:
                    sell_w += 0.5
                    entry_zone = 'SELL ZONE (resistance reject %.2f)' % resistance

        details['entry_zone'] = entry_zone
        details['daily_bias'] = daily_dir.upper() + ' (%.0f%%)' % (daily.get('position', 0.5) * 100)

        # ========= PRO INDICATORS GROUP (3.75 pts) =========
        # Supertrend (1.0 pt) — strongest trend indicator
        st = ind.get('supertrend', {})
        st_sig = st.get('signal', 'neutral')
        if st_sig == 'buy':
            buy_w += 1.0
            details['supertrend'] = 'UP ↑'
            if st.get('recent_flip'):
                buy_w += 0.25
                details['supertrend'] = 'FLIP UP ↑↑'
        elif st_sig == 'sell':
            sell_w += 1.0
            details['supertrend'] = 'DOWN ↓'
            if st.get('recent_flip'):
                sell_w += 0.25
                details['supertrend'] = 'FLIP DOWN ↓↓'
        else:
            details['supertrend'] = 'NEUTRAL'

        # Pivot Points (0.75 pt)
        pp = ind.get('pivot_points', {})
        pp_sig = pp.get('signal', 'neutral')
        if pp_sig == 'buy':
            buy_w += 0.75
            details['pivots'] = 'ABOVE PIVOT'
        elif pp_sig == 'sell':
            sell_w += 0.75
            details['pivots'] = 'BELOW PIVOT'
        else:
            details['pivots'] = 'AT PIVOT'

        # Hull MA (0.5 pt) — fast trend for scalping
        hma = ind.get('hull_ma', {})
        hma_sig = hma.get('signal', 'neutral')
        if hma_sig == 'buy':
            buy_w += 0.5
            details['hull_ma'] = 'BUY (slope +%.2f)' % abs(hma.get('slope', 0))
        elif hma_sig == 'sell':
            sell_w += 0.5
            details['hull_ma'] = 'SELL (slope -%.2f)' % abs(hma.get('slope', 0))

        # Williams %R (0.5 pt) — overbought/oversold for gold
        wr = ind.get('williams_r', {})
        wr_sig = wr.get('signal', 'neutral')
        wr_val = wr.get('value', -50)
        if wr_sig == 'buy':
            buy_w += 0.5
            details['williams_r'] = 'OVERSOLD (%.0f)' % wr_val
        elif wr_sig == 'sell':
            sell_w += 0.5
            details['williams_r'] = 'OVERBOUGHT (%.0f)' % wr_val

        # Fair Value Gap (0.5 pt) — institutional zones
        fvg = ind.get('fvg', {})
        fvg_sig = fvg.get('signal', 'neutral')
        if fvg_sig == 'buy':
            buy_w += 0.5
            details['fvg'] = 'BULLISH FVG'
        elif fvg_sig == 'sell':
            sell_w += 0.5
            details['fvg'] = 'BEARISH FVG'

        # Order Blocks (0.5 pt) — smart money zones
        ob = ind.get('order_blocks', {})
        ob_sig = ob.get('signal', 'neutral')
        if ob_sig == 'buy':
            buy_w += 0.5
            details['order_block'] = 'BULLISH OB'
        elif ob_sig == 'sell':
            sell_w += 0.5
            details['order_block'] = 'BEARISH OB'

        # ========= FINAL SCORE =========
        total_buy = round(buy_w, 1)
        total_sell = round(sell_w, 1)
        score = round(max(total_buy, total_sell))
        edge = round(abs(total_buy - total_sell), 1)
        direction = 'buy' if total_buy > total_sell else 'sell' if total_sell > total_buy else 'neutral'

        score = min(score, 10)

        if score >= 8: strength = 'VERY STRONG'
        elif score >= 6: strength = 'STRONG'
        elif score >= 4: strength = 'MODERATE'
        else: strength = 'WEAK'

        return {
            'direction': direction,
            'score': score,
            'max_score': 10,
            'buy_score': total_buy,
            'sell_score': total_sell,
            'edge': edge,
            'is_tradeable': score >= 6 and edge >= 1.5,
            'strength': strength,
            'details': details,
        }

    # ===================== INDICATORS =====================

    def _rsi(self, close, period=14):
        d = np.diff(close)
        g = np.where(d > 0, d, 0)
        l = np.where(d < 0, -d, 0)
        ag = pd.Series(g).ewm(span=period, adjust=False).mean().iloc[-1]
        al = pd.Series(l).ewm(span=period, adjust=False).mean().iloc[-1]
        rsi = 100 - (100 / (1 + ag / al)) if al != 0 else 100
        return {'value': round(float(rsi), 1), 'signal': 'buy' if rsi < 40 else 'sell' if rsi > 60 else 'neutral',
                'overbought': rsi > 70, 'oversold': rsi < 30}

    def _macd(self, close):
        c = pd.Series(close)
        ml = c.ewm(span=12, adjust=False).mean() - c.ewm(span=26, adjust=False).mean()
        sl = ml.ewm(span=9, adjust=False).mean()
        hist = ml - sl
        h = float(round(hist.iloc[-1], 4))
        ph = float(round(hist.iloc[-2], 4))
        return {'value': round(float(ml.iloc[-1]), 4), 'signal_line': round(float(sl.iloc[-1]), 4),
                'histogram': h, 'prev_histogram': ph,
                'signal': 'buy' if h > 0 else 'sell' if h < 0 else 'neutral',
                'crossover': h > 0 and ph <= 0, 'crossunder': h < 0 and ph >= 0}

    def _bollinger(self, close, period=20):
        c = pd.Series(close)
        mid = c.rolling(period).mean()
        std = c.rolling(period).std()
        up = float(round((mid + std * 2).iloc[-1], 2))
        lo = float(round((mid - std * 2).iloc[-1], 2))
        mi = float(round(mid.iloc[-1], 2))
        p = close[-1]
        pos = (p - lo) / (up - lo) if up != lo else 0.5
        return {'upper': up, 'middle': mi, 'lower': lo, 'position': round(float(pos), 3),
                'band_width': round(float((up - lo) / mi), 4) if mi else 0,
                'signal': 'buy' if pos < 0.2 else 'sell' if pos > 0.8 else 'neutral'}

    def _ema_ribbon(self, close):
        """EMA Ribbon: 9, 21, 50 — when all aligned = strong trend"""
        c = pd.Series(close)
        e9 = float(c.ewm(span=9, adjust=False).mean().iloc[-1])
        e21 = float(c.ewm(span=21, adjust=False).mean().iloc[-1])
        e50 = float(c.ewm(span=50, adjust=False).mean().iloc[-1])
        p = close[-1]

        # Bullish: Price > EMA9 > EMA21 > EMA50
        if p > e9 and e9 > e21 and e21 > e50:
            s = 'buy'
        # Bearish: Price < EMA9 < EMA21 < EMA50
        elif p < e9 and e9 < e21 and e21 < e50:
            s = 'sell'
        # Partial bullish
        elif p > e21 and e9 > e50:
            s = 'buy'
        # Partial bearish
        elif p < e21 and e9 < e50:
            s = 'sell'
        else:
            s = 'neutral'

        return {'ema50': round(e9, 2), 'ema200': round(e50, 2), 'ema21': round(e21, 2),
                'signal': s, 'cross': 'Bullish' if e9 > e21 else 'Bearish',
                'golden_cross': False, 'death_cross': False}

    def _stoch_rsi(self, close, period=14):
        d = np.diff(close)
        g = np.where(d > 0, d, 0)
        l = np.where(d < 0, -d, 0)
        ag = pd.Series(g).ewm(span=period, adjust=False).mean()
        al = pd.Series(l).ewm(span=period, adjust=False).mean()
        rs = ag / al.replace(0, np.nan)
        rsi = (100 - (100 / (1 + rs))).fillna(50)
        rmin = rsi.rolling(period).min()
        rmax = rsi.rolling(period).max()
        st = ((rsi - rmin) / (rmax - rmin).replace(0, np.nan) * 100).fillna(50)
        k = float(round(st.rolling(3).mean().iloc[-1], 1))
        d_val = float(round(st.rolling(3).mean().rolling(3).mean().iloc[-1], 1))
        return {'k': k, 'd': d_val, 'value': k,
                'signal': 'buy' if k < 25 else 'sell' if k > 75 else 'neutral',
                'overbought': k > 80, 'oversold': k < 20}

    def _atr(self, high, low, close, period=14):
        tr = [max(high[i]-low[i], abs(high[i]-close[i-1]), abs(low[i]-close[i-1])) for i in range(1, len(close))]
        atr = float(round(pd.Series(tr).rolling(period).mean().iloc[-1], 2))
        avg = float(pd.Series(tr).rolling(period * 3).mean().iloc[-1])
        r = atr / avg if avg > 0 else 1
        vol = 'HIGH' if r > 1.5 else 'MEDIUM' if r > 0.8 else 'LOW'
        return {'value': atr, 'volatility': vol, 'ratio': round(r, 2), 'signal': 'neutral',
                'sl_distance': round(atr * 1.2, 2), 'tp_distance': round(atr * 2.5, 2)}

    def _candle_patterns(self, o, h, l, c):
        n = len(c)
        if n < 3: return {'pattern': 'NONE', 'signal': 'neutral', 'strength': 'none'}
        o1, h1, l1, c1 = o[-1], h[-1], l[-1], c[-1]
        o2, h2, l2, c2 = o[-2], h[-2], l[-2], c[-2]
        body1 = abs(c1 - o1)
        body2 = abs(c2 - o2)
        rng = h1 - l1 if h1 != l1 else 0.01
        lw = min(o1, c1) - l1
        uw = h1 - max(o1, c1)

        # Engulfing patterns
        if c2 < o2 and c1 > o1 and c1 > o2 and o1 < c2 and body1 > body2:
            return {'pattern': 'Bullish Engulfing', 'signal': 'buy', 'strength': 'strong'}
        if c2 > o2 and c1 < o1 and c1 < o2 and o1 > c2 and body1 > body2:
            return {'pattern': 'Bearish Engulfing', 'signal': 'sell', 'strength': 'strong'}
        # Hammer / Shooting Star
        if lw > body1 * 2 and uw < body1 * 0.5 and body1 > 0:
            return {'pattern': 'Hammer', 'signal': 'buy', 'strength': 'strong'}
        if uw > body1 * 2 and lw < body1 * 0.5 and body1 > 0:
            return {'pattern': 'Shooting Star', 'signal': 'sell', 'strength': 'strong'}
        # Pin bars
        if lw > rng * 0.55 and body1 < rng * 0.35:
            return {'pattern': 'Bullish Pin', 'signal': 'buy', 'strength': 'moderate'}
        if uw > rng * 0.55 and body1 < rng * 0.35:
            return {'pattern': 'Bearish Pin', 'signal': 'sell', 'strength': 'moderate'}
        # Strong body candles
        if c1 > o1 and body1 > rng * 0.65:
            return {'pattern': 'Strong Bull', 'signal': 'buy', 'strength': 'moderate'}
        if c1 < o1 and body1 > rng * 0.65:
            return {'pattern': 'Strong Bear', 'signal': 'sell', 'strength': 'moderate'}
        return {'pattern': 'NONE', 'signal': 'neutral', 'strength': 'none'}

    def _adx_trend(self, close, high, low):
        n = len(close)
        if n < 30: return {'signal': 'neutral', 'adx': 15, 'direction': 'range',
                           'strength': 15, 'plus_di': 25, 'minus_di': 25}
        p = 14
        pdm, mdm, trl = [], [], []
        for i in range(1, n):
            u, d = high[i] - high[i-1], low[i-1] - low[i]
            pdm.append(u if u > d and u > 0 else 0)
            mdm.append(d if d > u and d > 0 else 0)
            trl.append(max(high[i]-low[i], abs(high[i]-close[i-1]), abs(low[i]-close[i-1])))
        atr = pd.Series(trl).rolling(p).mean()
        pdi = 100 * pd.Series(pdm).rolling(p).mean() / atr.replace(0, np.nan)
        mdi = 100 * pd.Series(mdm).rolling(p).mean() / atr.replace(0, np.nan)
        dx = 100 * abs(pdi - mdi) / (pdi + mdi).replace(0, np.nan)
        adx = float(dx.rolling(p).mean().iloc[-1])
        if np.isnan(adx): adx = 15
        cp = float(pdi.iloc[-1]) if not np.isnan(pdi.iloc[-1]) else 25
        cm = float(mdi.iloc[-1]) if not np.isnan(mdi.iloc[-1]) else 25
        d = 'up' if cp > cm else 'down' if cm > cp else 'range'
        return {'adx': round(adx, 1), 'plus_di': round(cp, 1), 'minus_di': round(cm, 1),
                'strength': round(adx, 1), 'direction': d,
                'signal': 'buy' if d == 'up' else 'sell' if d == 'down' else 'neutral'}

    def _sr_levels(self, high, low, close):
        """
        INSTITUTIONAL S/R Zone Detection:
        - Uses swing highs/lows from multiple lookback periods
        - Clusters nearby levels into ZONES
        - Scores zones by number of touches
        - Returns nearest support/resistance zones with strength
        """
        n = len(close)
        p = float(close[-1])

        # Collect all potential S/R levels from multiple lookback periods
        all_levels = []

        for lookback in [20, 50, min(100, n)]:
            lb = min(lookback, n)
            rh = high[-lb:]
            rl = low[-lb:]

            # Swing highs (resistance candidates)
            for i in range(2, lb - 2):
                if rh[i] > rh[i-1] and rh[i] > rh[i+1]:
                    all_levels.append(float(rh[i]))
                if i >= 3 and rh[i] > rh[i-1] and rh[i] > rh[i-2] and rh[i] > rh[i+1]:
                    all_levels.append(float(rh[i]))  # Double weight for stronger swings

            # Swing lows (support candidates)
            for i in range(2, lb - 2):
                if rl[i] < rl[i-1] and rl[i] < rl[i+1]:
                    all_levels.append(float(rl[i]))
                if i >= 3 and rl[i] < rl[i-1] and rl[i] < rl[i-2] and rl[i] < rl[i+1]:
                    all_levels.append(float(rl[i]))

        # Add round numbers (psychological levels) near current price
        round_base = round(p / 50) * 50  # Nearest $50 level
        for offset in [-100, -50, 0, 50, 100]:
            level = round_base + offset
            if abs(level - p) < 200:
                all_levels.append(level)

        # Add recent high/low
        if n >= 20:
            all_levels.append(float(max(high[-20:])))
            all_levels.append(float(min(low[-20:])))

        if not all_levels:
            return {
                'support': round(p - 10, 2), 'resistance': round(p + 10, 2),
                'dist_support': 10, 'dist_resistance': 10,
                'support_zone': [round(p - 12, 2), round(p - 8, 2)],
                'resistance_zone': [round(p + 8, 2), round(p + 12, 2)],
                'support_strength': 1, 'resistance_strength': 1,
                'position': 'middle', 'signal': 'neutral'
            }

        # Cluster nearby levels into zones (within $5 of each other)
        all_levels.sort()
        zones = []
        current_zone = [all_levels[0]]

        for i in range(1, len(all_levels)):
            if all_levels[i] - current_zone[-1] < 5.0:
                current_zone.append(all_levels[i])
            else:
                zone_avg = sum(current_zone) / len(current_zone)
                zones.append({
                    'level': round(zone_avg, 2),
                    'touches': len(current_zone),
                    'low': round(min(current_zone), 2),
                    'high': round(max(current_zone), 2),
                })
                current_zone = [all_levels[i]]

        # Don't forget last zone
        zone_avg = sum(current_zone) / len(current_zone)
        zones.append({
            'level': round(zone_avg, 2),
            'touches': len(current_zone),
            'low': round(min(current_zone), 2),
            'high': round(max(current_zone), 2),
        })

        # Find nearest support zone (below price) and resistance zone (above price)
        support_zones = [z for z in zones if z['level'] < p]
        resistance_zones = [z for z in zones if z['level'] > p]

        if support_zones:
            # Nearest and strongest support
            support_zones.sort(key=lambda z: z['level'], reverse=True)
            best_sup = support_zones[0]
            support = best_sup['level']
            sup_strength = best_sup['touches']
            sup_zone = [best_sup['low'], best_sup['high']]
        else:
            support = round(p - 15, 2)
            sup_strength = 1
            sup_zone = [round(p - 18, 2), round(p - 12, 2)]

        if resistance_zones:
            resistance_zones.sort(key=lambda z: z['level'])
            best_res = resistance_zones[0]
            resistance = best_res['level']
            res_strength = best_res['touches']
            res_zone = [best_res['low'], best_res['high']]
        else:
            resistance = round(p + 15, 2)
            res_strength = 1
            res_zone = [round(p + 12, 2), round(p + 18, 2)]

        dist_sup = round(abs(p - support), 2)
        dist_res = round(abs(p - resistance), 2)

        # Position: are we near support, resistance, or middle?
        total_range = dist_sup + dist_res
        if total_range > 0:
            position_ratio = dist_sup / total_range  # 0 = at support, 1 = at resistance
        else:
            position_ratio = 0.5

        if position_ratio < 0.25:
            position = 'near_support'
        elif position_ratio > 0.75:
            position = 'near_resistance'
        else:
            position = 'middle'

        return {
            'support': support, 'resistance': resistance,
            'dist_support': dist_sup, 'dist_resistance': dist_res,
            'support_zone': sup_zone, 'resistance_zone': res_zone,
            'support_strength': sup_strength, 'resistance_strength': res_strength,
            'position': position, 'position_ratio': round(position_ratio, 2),
            'signal': 'neutral',
            'all_support_zones': support_zones[:3] if support_zones else [],
            'all_resistance_zones': resistance_zones[:3] if resistance_zones else [],
        }

    def _momentum(self, close):
        if len(close) < 15: return {'signal': 'neutral', 'roc': 0, 'slope_5': 0}
        roc = ((close[-1] - close[-10]) / close[-10]) * 100
        s3 = (close[-1] - close[-3]) / 3
        s5 = (close[-1] - close[-5]) / 5
        # Both short and medium momentum must agree
        if roc > 0 and s3 > 0 and s5 > 0: s = 'buy'
        elif roc < 0 and s3 < 0 and s5 < 0: s = 'sell'
        else: s = 'neutral'
        return {'roc': round(float(roc), 3), 'slope_5': round(float(s5), 4),
                'slope_3': round(float(s3), 4), 'signal': s}

    def _volume_analysis(self, volume, close):
        vs = pd.Series(volume)
        avg = float(vs.rolling(20).mean().iloc[-1])
        cur = float(volume[-1])
        r = cur / avg if avg > 0 else 1
        # Volume trend (increasing or decreasing)
        vol_sma5 = float(vs.rolling(5).mean().iloc[-1])
        vol_sma20 = float(vs.rolling(20).mean().iloc[-1])
        return {'value': int(cur), 'average': int(avg), 'ratio': round(r, 2),
                'level': 'HIGH' if r > 1.5 else 'NORMAL', 'signal': 'neutral',
                'rising': vol_sma5 > vol_sma20}

    def _ichimoku(self, high, low, close):
        hs, ls = pd.Series(high), pd.Series(low)
        t = (hs.rolling(9).max() + ls.rolling(9).min()) / 2
        k = (hs.rolling(26).max() + ls.rolling(26).min()) / 2
        sa = ((t + k) / 2).iloc[-1]
        sb = ((hs.rolling(52).max() + ls.rolling(52).min()) / 2).iloc[-1]
        p = close[-1]
        top, bot = max(sa, sb), min(sa, sb)
        if p > top: s, pos = 'buy', 'Above Cloud'
        elif p < bot: s, pos = 'sell', 'Below Cloud'
        else: s, pos = 'neutral', 'Inside Cloud'
        return {'tenkan': round(float(t.iloc[-1]), 2), 'kijun': round(float(k.iloc[-1]), 2),
                'span_a': round(float(sa), 2), 'span_b': round(float(sb), 2),
                'cloud_position': pos, 'signal': s,
                'tk_cross': 'Bullish' if t.iloc[-1] > k.iloc[-1] else 'Bearish'}

    def _market_structure(self, high, low, close):
        """Detect Higher Highs/Lows (bullish) or Lower Highs/Lows (bearish)"""
        n = len(close)
        if n < 20: return {'structure': 'range', 'signal': 'neutral'}

        # Find recent swing points
        swh, swl = [], []
        for i in range(3, min(30, n) - 3):
            idx = n - 1 - i
            if high[idx] > high[idx-1] and high[idx] > high[idx+1]:
                swh.append(high[idx])
            if low[idx] < low[idx-1] and low[idx] < low[idx+1]:
                swl.append(low[idx])

        if len(swh) >= 2 and len(swl) >= 2:
            hh = swh[0] > swh[1]  # Higher High
            hl = swl[0] > swl[1]  # Higher Low
            lh = swh[0] < swh[1]  # Lower High
            ll = swl[0] < swl[1]  # Lower Low

            if hh and hl: return {'structure': 'bullish', 'signal': 'buy'}
            if lh and ll: return {'structure': 'bearish', 'signal': 'sell'}

        return {'structure': 'range', 'signal': 'neutral'}

    def _vwap(self, high, low, close, volume):
        """Volume Weighted Average Price"""
        n = len(close)
        if n < 10: return {'value': close[-1], 'signal': 'neutral'}

        # Approximate VWAP using recent data
        typical_price = (high + low + close) / 3
        cum_tp_vol = np.cumsum(typical_price * volume)
        cum_vol = np.cumsum(volume)
        vwap_val = cum_tp_vol[-1] / cum_vol[-1] if cum_vol[-1] > 0 else close[-1]

        p = close[-1]
        dist = abs(p - vwap_val) / vwap_val * 100  # % distance

        if p > vwap_val and dist > 0.02:
            s = 'buy'  # Price above VWAP = bullish
        elif p < vwap_val and dist > 0.02:
            s = 'sell'  # Price below VWAP = bearish
        else:
            s = 'neutral'

        return {'value': round(float(vwap_val), 2), 'signal': s, 'distance': round(dist, 3)}

    def _fibonacci(self, high, low, close):
        """Key Fibonacci retracement levels"""
        n = len(close)
        if n < 30: return {'signal': 'neutral', 'level': 0}

        recent_high = max(high[-30:])
        recent_low = min(low[-30:])
        rng = recent_high - recent_low
        if rng == 0: return {'signal': 'neutral', 'level': 0}

        p = close[-1]
        retrace = (recent_high - p) / rng * 100  # % from high

        # Key levels: 38.2%, 50%, 61.8%
        fib_382 = recent_high - rng * 0.382
        fib_500 = recent_high - rng * 0.500
        fib_618 = recent_high - rng * 0.618

        # Near Fibonacci support (buy zones)
        for level, pct in [(fib_618, 61.8), (fib_500, 50.0), (fib_382, 38.2)]:
            if abs(p - level) / rng < 0.05:  # Within 5% of range
                if retrace > 50:
                    return {'signal': 'buy', 'level': pct,
                            'fib_382': round(fib_382, 2), 'fib_500': round(fib_500, 2), 'fib_618': round(fib_618, 2)}
                else:
                    return {'signal': 'sell', 'level': pct,
                            'fib_382': round(fib_382, 2), 'fib_500': round(fib_500, 2), 'fib_618': round(fib_618, 2)}

        return {'signal': 'neutral', 'level': round(retrace, 1),
                'fib_382': round(fib_382, 2), 'fib_500': round(fib_500, 2), 'fib_618': round(fib_618, 2)}

    # ===================== V6 PRO INDICATORS =====================

    def _volume_profile(self, high, low, close, volume):
        """
        Volume Profile — identifies POC (Point of Control), VAH, VAL.
        POC = price level with highest traded volume (strongest S/R)
        VAH = Value Area High (70% of volume above POC)
        VAL = Value Area Low (70% of volume below POC)
        """
        n = len(close)
        if n < 30:
            return {'signal': 'neutral', 'poc': close[-1], 'vah': close[-1], 'val': close[-1], 'at_poc': False}

        lookback = min(100, n)
        h = high[-lookback:]
        l = low[-lookback:]
        c = close[-lookback:]
        v = volume[-lookback:]

        price_low = float(np.min(l))
        price_high = float(np.max(h))
        rng = price_high - price_low
        if rng == 0:
            return {'signal': 'neutral', 'poc': close[-1], 'vah': close[-1], 'val': close[-1], 'at_poc': False}

        # Create price bins (50 levels)
        num_bins = 50
        bin_size = rng / num_bins
        vol_at_price = np.zeros(num_bins)

        for i in range(lookback):
            # Distribute volume across the candle's range
            candle_low = l[i]
            candle_high = h[i]
            candle_vol = v[i]
            low_bin = max(0, int((candle_low - price_low) / bin_size))
            high_bin = min(num_bins - 1, int((candle_high - price_low) / bin_size))
            bins_span = high_bin - low_bin + 1
            if bins_span > 0:
                vol_per_bin = candle_vol / bins_span
                for b in range(low_bin, high_bin + 1):
                    if 0 <= b < num_bins:
                        vol_at_price[b] += vol_per_bin

        # POC = bin with highest volume
        poc_bin = int(np.argmax(vol_at_price))
        poc = price_low + (poc_bin + 0.5) * bin_size

        # Value Area (70% of total volume around POC)
        total_vol = np.sum(vol_at_price)
        target_vol = total_vol * 0.70
        va_vol = vol_at_price[poc_bin]
        va_low_bin = poc_bin
        va_high_bin = poc_bin

        while va_vol < target_vol and (va_low_bin > 0 or va_high_bin < num_bins - 1):
            add_low = vol_at_price[va_low_bin - 1] if va_low_bin > 0 else 0
            add_high = vol_at_price[va_high_bin + 1] if va_high_bin < num_bins - 1 else 0
            if add_low >= add_high and va_low_bin > 0:
                va_low_bin -= 1
                va_vol += add_low
            elif va_high_bin < num_bins - 1:
                va_high_bin += 1
                va_vol += add_high
            else:
                break

        val = price_low + va_low_bin * bin_size  # Value Area Low
        vah = price_low + (va_high_bin + 1) * bin_size  # Value Area High

        p = close[-1]
        atr_approx = rng / lookback * 14  # Rough ATR
        dist_threshold = atr_approx * 0.3

        # Signal: near VAL = potential buy, near VAH = potential sell
        at_poc = abs(p - poc) < dist_threshold
        if p <= val + dist_threshold:
            sig = 'buy'
        elif p >= vah - dist_threshold:
            sig = 'sell'
        else:
            sig = 'neutral'

        return {
            'poc': round(float(poc), 2),
            'vah': round(float(vah), 2),
            'val': round(float(val), 2),
            'at_poc': at_poc,
            'signal': sig,
        }

    def _bos_choch(self, high, low, close):
        """
        BOS (Break of Structure) & CHoCH (Change of Character) Detection.
        
        BOS = trend continuation break (new HH in uptrend or LL in downtrend)
        CHoCH = trend reversal signal (first LL after uptrend or first HH after downtrend)
        
        Smart Money Concepts — institutional traders watch these levels.
        """
        n = len(close)
        if n < 30:
            return {'type': None, 'direction': 'neutral', 'signal': 'neutral'}

        # Find swing highs and swing lows (using 3-bar pivots)
        swing_highs = []  # (index, price)
        swing_lows = []

        lookback = min(60, n - 2)
        for i in range(2, lookback):
            idx = n - 1 - i
            if idx < 2:
                break
            # Swing High: higher than 2 bars on each side
            if (high[idx] > high[idx - 1] and high[idx] > high[idx - 2] and
                    high[idx] > high[idx + 1] and high[idx] >= high[idx + 2] if idx + 2 < n else True):
                swing_highs.append((idx, float(high[idx])))
            # Swing Low: lower than 2 bars on each side
            if (low[idx] < low[idx - 1] and low[idx] < low[idx - 2] and
                    low[idx] < low[idx + 1] and low[idx] <= low[idx + 2] if idx + 2 < n else True):
                swing_lows.append((idx, float(low[idx])))

        if len(swing_highs) < 3 or len(swing_lows) < 3:
            return {'type': None, 'direction': 'neutral', 'signal': 'neutral'}

        # Sort by index (most recent first)
        swing_highs.sort(key=lambda x: x[0], reverse=True)
        swing_lows.sort(key=lambda x: x[0], reverse=True)

        sh0, sh1, sh2 = swing_highs[0][1], swing_highs[1][1], swing_highs[2][1]
        sl0, sl1, sl2 = swing_lows[0][1], swing_lows[1][1], swing_lows[2][1]
        p = float(close[-1])

        # Determine previous structure
        prev_uptrend = sh1 > sh2 and sl1 > sl2  # HH + HL
        prev_downtrend = sh1 < sh2 and sl1 < sl2  # LH + LL

        # BOS Bullish: uptrend continues — price breaks above last swing high
        if prev_uptrend and p > sh0:
            return {'type': 'BOS', 'direction': 'bullish', 'signal': 'buy',
                    'level': sh0, 'desc': 'Break above %.2f' % sh0}

        # BOS Bearish: downtrend continues — price breaks below last swing low
        if prev_downtrend and p < sl0:
            return {'type': 'BOS', 'direction': 'bearish', 'signal': 'sell',
                    'level': sl0, 'desc': 'Break below %.2f' % sl0}

        # CHoCH Bullish: was downtrend, now first HH (trend reversal to bullish)
        if prev_downtrend and sh0 > sh1:
            return {'type': 'CHoCH', 'direction': 'bullish', 'signal': 'buy',
                    'level': sh1, 'desc': 'CHoCH above %.2f' % sh1}

        # CHoCH Bearish: was uptrend, now first LL (trend reversal to bearish)
        if prev_uptrend and sl0 < sl1:
            return {'type': 'CHoCH', 'direction': 'bearish', 'signal': 'sell',
                    'level': sl1, 'desc': 'CHoCH below %.2f' % sl1}

        return {'type': None, 'direction': 'neutral', 'signal': 'neutral'}

    def _session_analysis(self):
        """
        Trading Session Detection (UTC-based).
        
        Asian:    00:00 - 08:00 UTC (Tokyo/Sydney)
        London:   07:00 - 16:00 UTC (highest XAUUSD volatility)
        New York: 13:00 - 22:00 UTC
        Overlap:  13:00 - 16:00 UTC (London + NY = maximum liquidity)
        
        XAUUSD trades best during London and NY sessions.
        """
        try:
            now = datetime.now(timezone.utc)
        except Exception:
            now = datetime.utcnow()

        hour = now.hour
        day = now.weekday()  # 0=Mon, 4=Fri, 5=Sat, 6=Sun

        # Weekend = market closed
        if day >= 5:
            return {'active': 'off', 'name': 'WEEKEND', 'volatility': 'none',
                    'recommended': False, 'hour_utc': hour}

        # Session windows (UTC)
        is_asian = 0 <= hour < 8
        is_london = 7 <= hour < 16
        is_ny = 13 <= hour < 22
        is_overlap = 13 <= hour < 16

        if is_overlap:
            active = 'london_ny_overlap'
            name = 'LONDON/NY OVERLAP'
            volatility = 'very_high'
            recommended = True
        elif is_london and not is_ny:
            active = 'london'
            name = 'LONDON'
            volatility = 'high'
            recommended = True
        elif is_ny and not is_london:
            active = 'new_york'
            name = 'NEW YORK'
            volatility = 'high'
            recommended = True
        elif is_asian:
            active = 'asian'
            name = 'ASIAN'
            volatility = 'low'
            recommended = False
        else:
            active = 'off'
            name = 'OFF-HOURS'
            volatility = 'very_low'
            recommended = False

        return {
            'active': active,
            'name': name,
            'volatility': volatility,
            'recommended': recommended,
            'hour_utc': hour,
            'day': day,
        }

    # ================ NEW PRO INDICATORS ================

    def _supertrend(self, high, low, close, period=10, multiplier=3.0):
        """Supertrend — clear trend direction with built-in stop"""
        n = len(close)
        if n < period + 1:
            return {'signal': 'neutral', 'value': float(close[-1]), 'direction': 'neutral'}

        # Calculate ATR
        tr = np.maximum(high[1:] - low[1:],
                       np.maximum(abs(high[1:] - close[:-1]), abs(low[1:] - close[:-1])))
        tr = np.insert(tr, 0, high[0] - low[0])
        atr = pd.Series(tr).rolling(period).mean().values

        hl2 = (high + low) / 2
        upper = hl2 + multiplier * atr
        lower = hl2 - multiplier * atr

        st = np.zeros(n)
        direction = np.ones(n)  # 1 = up, -1 = down

        for i in range(1, n):
            if np.isnan(upper[i]) or np.isnan(lower[i]):
                st[i] = close[i]
                direction[i] = direction[i-1]
                continue

            # Adjust bands
            if lower[i] > lower[i-1] or close[i-1] < lower[i-1]:
                pass
            else:
                lower[i] = lower[i-1]

            if upper[i] < upper[i-1] or close[i-1] > upper[i-1]:
                pass
            else:
                upper[i] = upper[i-1]

            if direction[i-1] == 1:  # Was uptrend
                if close[i] < lower[i]:
                    direction[i] = -1
                    st[i] = upper[i]
                else:
                    direction[i] = 1
                    st[i] = lower[i]
            else:  # Was downtrend
                if close[i] > upper[i]:
                    direction[i] = 1
                    st[i] = lower[i]
                else:
                    direction[i] = -1
                    st[i] = upper[i]

        cur_dir = direction[-1]
        signal = 'buy' if cur_dir == 1 else 'sell'

        # Check for recent flip (within last 3 candles)
        recent_flip = False
        for i in range(-3, 0):
            if i > -n and direction[i] != direction[i-1]:
                recent_flip = True

        return {
            'signal': signal,
            'value': round(float(st[-1]), 2),
            'direction': 'UP' if cur_dir == 1 else 'DOWN',
            'recent_flip': recent_flip
        }

    def _fair_value_gap(self, high, low, close, min_gap_pct=0.03):
        """Fair Value Gap — imbalance zones where price tends to return"""
        n = len(close)
        if n < 5:
            return {'signal': 'neutral', 'gaps': []}

        gaps = []
        for i in range(2, min(30, n)):
            idx = n - 1 - i
            if idx < 1:
                break

            # Bullish FVG: candle[i+1] low > candle[i-1] high (gap up)
            if low[idx + 1] > high[idx - 1]:
                gap_size = low[idx + 1] - high[idx - 1]
                gap_pct = gap_size / close[idx] * 100
                if gap_pct > min_gap_pct:
                    gaps.append({
                        'type': 'bullish',
                        'top': round(float(low[idx + 1]), 2),
                        'bottom': round(float(high[idx - 1]), 2),
                        'size': round(float(gap_size), 2),
                    })

            # Bearish FVG: candle[i+1] high < candle[i-1] low (gap down)
            if high[idx + 1] < low[idx - 1]:
                gap_size = low[idx - 1] - high[idx + 1]
                gap_pct = gap_size / close[idx] * 100
                if gap_pct > min_gap_pct:
                    gaps.append({
                        'type': 'bearish',
                        'top': round(float(low[idx - 1]), 2),
                        'bottom': round(float(high[idx + 1]), 2),
                        'size': round(float(gap_size), 2),
                    })

        # Check if price is near any FVG (potential fill)
        p = float(close[-1])
        signal = 'neutral'
        for g in gaps[:5]:  # Check recent gaps
            if g['type'] == 'bullish' and g['bottom'] <= p <= g['top']:
                signal = 'buy'  # Price filling bullish FVG = bounce up
                break
            elif g['type'] == 'bearish' and g['bottom'] <= p <= g['top']:
                signal = 'sell'  # Price filling bearish FVG = drop down
                break

        return {'signal': signal, 'gaps': gaps[:5]}

    def _order_blocks(self, open_p, high, low, close):
        """Order Blocks — institutional entry zones"""
        n = len(close)
        if n < 10:
            return {'signal': 'neutral', 'blocks': []}

        blocks = []
        p = float(close[-1])

        for i in range(3, min(40, n)):
            idx = n - 1 - i
            if idx < 1:
                break

            body = abs(close[idx] - open_p[idx])
            candle_range = high[idx] - low[idx]
            if candle_range == 0:
                continue

            # Bullish OB: bearish candle before a strong bullish move
            if (close[idx] < open_p[idx] and  # Bearish candle
                close[idx + 1] > high[idx] and  # Next candle breaks above
                body / candle_range > 0.5):  # Strong body
                blocks.append({
                    'type': 'bullish',
                    'top': round(float(open_p[idx]), 2),
                    'bottom': round(float(close[idx]), 2),
                })

            # Bearish OB: bullish candle before a strong bearish move
            if (close[idx] > open_p[idx] and  # Bullish candle
                close[idx + 1] < low[idx] and  # Next candle breaks below
                body / candle_range > 0.5):
                blocks.append({
                    'type': 'bearish',
                    'top': round(float(close[idx]), 2),
                    'bottom': round(float(open_p[idx]), 2),
                })

        # Check if price is at an order block
        signal = 'neutral'
        for ob in blocks[:5]:
            if ob['type'] == 'bullish' and ob['bottom'] <= p <= ob['top']:
                signal = 'buy'
                break
            elif ob['type'] == 'bearish' and ob['bottom'] <= p <= ob['top']:
                signal = 'sell'
                break

        return {'signal': signal, 'blocks': blocks[:5]}

    def _pivot_points(self, high, low, close):
        """Daily/Weekly Pivot Points — key S/R for gold"""
        n = len(close)
        if n < 20:
            return {'signal': 'neutral', 'pivot': 0, 'r1': 0, 'r2': 0, 's1': 0, 's2': 0}

        # Use recent 50 candles to approximate daily range
        lb = min(50, n)
        h = float(np.max(high[-lb:]))
        l = float(np.min(low[-lb:]))
        c = float(close[-1])

        # Standard pivot calculation
        pivot = (h + l + c) / 3
        r1 = 2 * pivot - l
        s1 = 2 * pivot - h
        r2 = pivot + (h - l)
        s2 = pivot - (h - l)
        r3 = h + 2 * (pivot - l)
        s3 = l - 2 * (h - pivot)

        # Signal based on price position relative to pivots
        p = float(close[-1])
        if p > r1:
            signal = 'buy'  # Strong bullish above R1
        elif p > pivot:
            signal = 'buy'  # Bullish above pivot
        elif p < s1:
            signal = 'sell'  # Strong bearish below S1
        elif p < pivot:
            signal = 'sell'  # Bearish below pivot
        else:
            signal = 'neutral'

        return {
            'signal': signal,
            'pivot': round(pivot, 2),
            'r1': round(r1, 2), 'r2': round(r2, 2), 'r3': round(r3, 2),
            's1': round(s1, 2), 's2': round(s2, 2), 's3': round(s3, 2),
        }

    def _hull_ma(self, close, period=20):
        """Hull Moving Average — fastest responding MA, great for 5m"""
        n = len(close)
        if n < period + 10:
            return {'signal': 'neutral', 'value': float(close[-1]), 'slope': 0}

        cs = pd.Series(close)

        # HMA = WMA(2*WMA(n/2) - WMA(n), sqrt(n))
        half_period = max(int(period / 2), 1)
        sqrt_period = max(int(np.sqrt(period)), 1)

        wma_half = cs.rolling(half_period).apply(
            lambda x: np.sum(x * np.arange(1, len(x)+1)) / np.sum(np.arange(1, len(x)+1)), raw=True)
        wma_full = cs.rolling(period).apply(
            lambda x: np.sum(x * np.arange(1, len(x)+1)) / np.sum(np.arange(1, len(x)+1)), raw=True)

        diff = 2 * wma_half - wma_full
        hma = diff.rolling(sqrt_period).apply(
            lambda x: np.sum(x * np.arange(1, len(x)+1)) / np.sum(np.arange(1, len(x)+1)), raw=True)

        hma_val = float(hma.iloc[-1]) if not np.isnan(hma.iloc[-1]) else float(close[-1])
        hma_prev = float(hma.iloc[-2]) if len(hma) > 1 and not np.isnan(hma.iloc[-2]) else hma_val

        slope = hma_val - hma_prev
        p = float(close[-1])

        if p > hma_val and slope > 0:
            signal = 'buy'
        elif p < hma_val and slope < 0:
            signal = 'sell'
        else:
            signal = 'neutral'

        return {'signal': signal, 'value': round(hma_val, 2), 'slope': round(slope, 4)}

    def _williams_r(self, high, low, close, period=14):
        """Williams %R — better overbought/oversold for gold than RSI"""
        n = len(close)
        if n < period:
            return {'signal': 'neutral', 'value': -50}

        highest = float(np.max(high[-period:]))
        lowest = float(np.min(low[-period:]))
        p = float(close[-1])

        if highest == lowest:
            wr = -50
        else:
            wr = ((highest - p) / (highest - lowest)) * -100

        # Williams %R: -100 to 0
        # < -80 = oversold (buy zone)
        # > -20 = overbought (sell zone)
        if wr < -80:
            signal = 'buy'
        elif wr > -20:
            signal = 'sell'
        else:
            signal = 'neutral'

        return {'signal': signal, 'value': round(wr, 1)}


ta_engine = TechnicalAnalysis()
