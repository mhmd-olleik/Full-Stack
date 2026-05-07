"""
AIOK Trading — Strategy Engine V1
================================
3 AI Pattern Detection Modules:
1. Swing Point Pattern Detector
2. Candle Structure Breakout Edge
3. HTF Liquidity Sweep Analyzer

Expectancy = (win% × avg_win_R) − (loss% × avg_loss_R)
Minimum 30 instances required for statistical validity.
"""

import numpy as np
import pandas as pd
import logging
from datetime import datetime

logger = logging.getLogger('AIOK.STRATEGY')


class SwingPatternDetector:
    """Module 1: Scans for repeatable swing high/low patterns"""

    def __init__(self, lookback=5):
        self.lookback = lookback
        self.patterns = []

    def detect_swings(self, df):
        """Find swing highs and lows"""
        high = df['high'].values
        low = df['low'].values
        close = df['close'].values
        n = len(close)
        lb = self.lookback
        swings = []

        for i in range(lb, n - lb):
            # Swing High
            if high[i] == max(high[i-lb:i+lb+1]):
                swings.append({
                    'type': 'high', 'index': i, 'price': float(high[i]),
                    'time': df.index[i] if hasattr(df.index[i], 'hour') else None,
                })
            # Swing Low
            if low[i] == min(low[i-lb:i+lb+1]):
                swings.append({
                    'type': 'low', 'index': i, 'price': float(low[i]),
                    'time': df.index[i] if hasattr(df.index[i], 'hour') else None,
                })
        return swings

    def analyze(self, df):
        """Full swing pattern analysis"""
        if df is None or len(df) < 50:
            return None

        swings = self.detect_swings(df)
        if len(swings) < 10:
            return {'patterns': [], 'count': 0, 'valid': False}

        close = df['close'].values
        high = df['high'].values
        low = df['low'].values
        n = len(close)

        # Analyze swing-to-swing movements
        reversals = []
        for i in range(1, len(swings)):
            prev = swings[i-1]
            curr = swings[i]
            if prev['type'] != curr['type']:
                dist = abs(curr['price'] - prev['price'])
                bars = curr['index'] - prev['index']
                # Check if reversal was profitable (price moved 1:2 R:R)
                entry_idx = curr['index']
                if entry_idx + 10 < n:
                    if curr['type'] == 'low':  # Buy after swing low
                        sl_dist = curr['price'] - prev['price'] if prev['type'] == 'high' else dist * 0.5
                        tp_dist = abs(sl_dist) * 2
                        future_high = max(high[entry_idx:min(entry_idx+20, n)])
                        hit_tp = future_high >= curr['price'] + tp_dist
                        hit_sl = min(low[entry_idx:min(entry_idx+20, n)]) <= curr['price'] - abs(sl_dist) * 0.5
                    else:  # Sell after swing high
                        sl_dist = prev['price'] - curr['price'] if prev['type'] == 'low' else dist * 0.5
                        tp_dist = abs(sl_dist) * 2
                        future_low = min(low[entry_idx:min(entry_idx+20, n)])
                        hit_tp = future_low <= curr['price'] - tp_dist
                        hit_sl = max(high[entry_idx:min(entry_idx+20, n)]) >= curr['price'] + abs(sl_dist) * 0.5

                    reversals.append({
                        'type': curr['type'],
                        'distance': round(dist, 2),
                        'bars': bars,
                        'hit_tp': hit_tp,
                        'hit_sl': hit_sl if not hit_tp else False,
                    })

        if len(reversals) < 5:
            return {'patterns': [], 'count': len(reversals), 'valid': False}

        # Calculate statistics
        wins = sum(1 for r in reversals if r['hit_tp'])
        losses = sum(1 for r in reversals if r['hit_sl'])
        total = wins + losses
        win_rate = (wins / total * 100) if total > 0 else 0
        avg_dist = np.mean([r['distance'] for r in reversals])
        expectancy = (win_rate/100 * 2.0) - ((100-win_rate)/100 * 1.0) if total > 0 else 0

        return {
            'total_swings': len(swings),
            'reversals': len(reversals),
            'wins': wins,
            'losses': losses,
            'win_rate': round(win_rate, 1),
            'avg_distance': round(avg_dist, 2),
            'expectancy_R': round(expectancy, 2),
            'valid': len(reversals) >= 15,
            'signal': 'active' if expectancy > 0.2 and len(reversals) >= 15 else 'weak',
            'last_swing': swings[-1] if swings else None,
        }


class BreakoutEdgeScanner:
    """Module 2: Identifies breakout structures with positive expectancy at 1:2 R:R"""

    def analyze(self, df):
        if df is None or len(df) < 50:
            return None

        close = df['close'].values
        open_p = df['open'].values
        high = df['high'].values
        low = df['low'].values
        n = len(close)

        breakouts = []
        for i in range(20, n - 10):
            body = abs(close[i] - open_p[i])
            rng = high[i] - low[i]
            if rng == 0:
                continue
            body_pct = body / rng

            # Strong breakout candle: body > 70% of range
            if body_pct < 0.7:
                continue

            # Count broken candles (how many prior candles' range was exceeded)
            broken = 0
            if close[i] > open_p[i]:  # Bullish breakout
                for j in range(1, min(6, i)):
                    if close[i] > high[i-j]:
                        broken += 1
                direction = 'buy'
                entry = close[i]
                sl = low[i]
            else:  # Bearish breakout
                for j in range(1, min(6, i)):
                    if close[i] < low[i-j]:
                        broken += 1
                direction = 'sell'
                entry = close[i]
                sl = high[i]

            if broken < 2:
                continue

            # Check 1:2 R:R outcome
            risk = abs(entry - sl)
            if risk == 0:
                continue
            tp = entry + risk * 2 if direction == 'buy' else entry - risk * 2

            # Check next 10 candles
            hit_tp = False
            hit_sl = False
            for k in range(i+1, min(i+11, n)):
                if direction == 'buy':
                    if high[k] >= tp:
                        hit_tp = True
                        break
                    if low[k] <= sl:
                        hit_sl = True
                        break
                else:
                    if low[k] <= tp:
                        hit_tp = True
                        break
                    if high[k] >= sl:
                        hit_sl = True
                        break

            breakouts.append({
                'direction': direction,
                'body_pct': round(body_pct * 100, 1),
                'broken_candles': broken,
                'wick_ratio': round((rng - body) / rng * 100, 1),
                'hit_tp': hit_tp,
                'hit_sl': hit_sl,
            })

        if len(breakouts) < 5:
            return {'breakouts': 0, 'valid': False, 'win_rate': 0, 'expectancy_R': 0}

        wins = sum(1 for b in breakouts if b['hit_tp'])
        losses = sum(1 for b in breakouts if b['hit_sl'])
        total = wins + losses
        win_rate = (wins / total * 100) if total > 0 else 0
        expectancy = (win_rate/100 * 2.0) - ((100-win_rate)/100 * 1.0) if total > 0 else 0

        # Best segments
        buy_bk = [b for b in breakouts if b['direction'] == 'buy']
        sell_bk = [b for b in breakouts if b['direction'] == 'sell']
        buy_wr = sum(1 for b in buy_bk if b['hit_tp']) / len(buy_bk) * 100 if buy_bk else 0
        sell_wr = sum(1 for b in sell_bk if b['hit_tp']) / len(sell_bk) * 100 if sell_bk else 0

        return {
            'breakouts': len(breakouts),
            'wins': wins, 'losses': losses,
            'win_rate': round(win_rate, 1),
            'expectancy_R': round(expectancy, 2),
            'buy_win_rate': round(buy_wr, 1),
            'sell_win_rate': round(sell_wr, 1),
            'avg_body_pct': round(np.mean([b['body_pct'] for b in breakouts]), 1),
            'valid': len(breakouts) >= 15,
            'signal': 'active' if expectancy > 0.2 and total >= 15 else 'weak',
        }


class HTFLiquiditySweepAnalyzer:
    """Module 3: Cross-timeframe liquidity sweep detection"""

    def find_htf_levels(self, df_htf, lookback=5):
        """Find key HTF swing levels"""
        high = df_htf['high'].values
        low = df_htf['low'].values
        n = len(high)
        levels = []

        for i in range(lookback, n - lookback):
            if high[i] == max(high[i-lookback:i+lookback+1]):
                levels.append({'type': 'resistance', 'price': float(high[i]), 'index': i})
            if low[i] == min(low[i-lookback:i+lookback+1]):
                levels.append({'type': 'support', 'price': float(low[i]), 'index': i})

        return levels

    def analyze(self, df_ltf, df_htf):
        """Analyze sweeps of HTF levels on LTF"""
        if df_ltf is None or df_htf is None or len(df_ltf) < 50 or len(df_htf) < 20:
            return None

        levels = self.find_htf_levels(df_htf)
        if len(levels) < 3:
            return {'sweeps': 0, 'valid': False}

        close = df_ltf['close'].values
        high = df_ltf['high'].values
        low = df_ltf['low'].values
        n = len(close)
        sweeps = []

        for level in levels[-10:]:  # Check recent 10 levels
            lvl_price = level['price']
            for i in range(10, n - 10):
                swept = False
                if level['type'] == 'resistance':
                    # Price went above resistance then reversed back below
                    if high[i] > lvl_price and close[i] < lvl_price:
                        depth = high[i] - lvl_price
                        swept = True
                        direction = 'sell'
                elif level['type'] == 'support':
                    # Price went below support then reversed back above
                    if low[i] < lvl_price and close[i] > lvl_price:
                        depth = lvl_price - low[i]
                        swept = True
                        direction = 'buy'

                if swept and depth > 0:
                    # Check outcome: did the reversal hold?
                    risk = depth * 2
                    tp = lvl_price + risk * 2 if direction == 'buy' else lvl_price - risk * 2
                    sl = lvl_price - risk if direction == 'buy' else lvl_price + risk

                    hit_tp = False
                    hit_sl = False
                    for k in range(i+1, min(i+15, n)):
                        if direction == 'buy':
                            if high[k] >= tp: hit_tp = True; break
                            if low[k] <= sl: hit_sl = True; break
                        else:
                            if low[k] <= tp: hit_tp = True; break
                            if high[k] >= sl: hit_sl = True; break

                    sweeps.append({
                        'level_type': level['type'],
                        'direction': direction,
                        'depth': round(depth, 2),
                        'hit_tp': hit_tp,
                        'hit_sl': hit_sl,
                    })

        if len(sweeps) < 3:
            return {'sweeps': len(sweeps), 'valid': False, 'win_rate': 0, 'expectancy_R': 0}

        wins = sum(1 for s in sweeps if s['hit_tp'])
        losses = sum(1 for s in sweeps if s['hit_sl'])
        total = wins + losses
        win_rate = (wins / total * 100) if total > 0 else 0
        expectancy = (win_rate/100 * 2.0) - ((100-win_rate)/100 * 1.0) if total > 0 else 0

        return {
            'sweeps': len(sweeps),
            'wins': wins, 'losses': losses,
            'win_rate': round(win_rate, 1),
            'expectancy_R': round(expectancy, 2),
            'avg_depth': round(np.mean([s['depth'] for s in sweeps]), 2),
            'valid': len(sweeps) >= 10,
            'signal': 'active' if expectancy > 0.2 and total >= 10 else 'weak',
        }


class StrategyEngine:
    """Main engine combining all 3 modules"""

    def __init__(self):
        self.swing = SwingPatternDetector()
        self.breakout = BreakoutEdgeScanner()
        self.htf_sweep = HTFLiquiditySweepAnalyzer()
        self.last_result = None
        self._cache_time = 0

    def analyze_all(self, df_15m, df_1h=None, df_4h=None):
        """Run all 3 modules and return combined strategy score"""
        import time
        # Cache for 5 minutes
        if time.time() - self._cache_time < 300 and self.last_result:
            return self.last_result

        result = {'modules': {}, 'strategy_score': 0, 'active_edges': [], 'timestamp': datetime.now().isoformat()}

        # Module 1: Swing Patterns
        try:
            swing_r = self.swing.analyze(df_15m)
            result['modules']['swing'] = swing_r
            if swing_r and swing_r.get('signal') == 'active':
                result['strategy_score'] += 1
                result['active_edges'].append(f"Swing: {swing_r['win_rate']}% WR, {swing_r['expectancy_R']}R")
        except Exception as e:
            logger.debug("Swing error: %s", e)
            result['modules']['swing'] = None

        # Module 2: Breakout Edge
        try:
            breakout_r = self.breakout.analyze(df_15m)
            result['modules']['breakout'] = breakout_r
            if breakout_r and breakout_r.get('signal') == 'active':
                result['strategy_score'] += 1
                result['active_edges'].append(f"Breakout: {breakout_r['win_rate']}% WR, {breakout_r['expectancy_R']}R")
        except Exception as e:
            logger.debug("Breakout error: %s", e)
            result['modules']['breakout'] = None

        # Module 3: HTF Sweep
        if df_1h is not None:
            try:
                htf_r = self.htf_sweep.analyze(df_15m, df_1h)
                result['modules']['htf_sweep'] = htf_r
                if htf_r and htf_r.get('signal') == 'active':
                    result['strategy_score'] += 1
                    result['active_edges'].append(f"HTF Sweep: {htf_r['win_rate']}% WR, {htf_r['expectancy_R']}R")
            except Exception as e:
                logger.debug("HTF error: %s", e)
                result['modules']['htf_sweep'] = None

        self.last_result = result
        self._cache_time = time.time()
        return result


# Singleton
strategy_engine = StrategyEngine()
