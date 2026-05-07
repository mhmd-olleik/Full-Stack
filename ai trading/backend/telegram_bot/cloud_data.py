"""
AIOK Trading — Cloud Data Provider
================================
Fetches XAUUSD data from free APIs (no MT5 needed).
Uses yfinance for candle PATTERNS (not price).
Gets LIVE price from MT5 API when available, cloud when not.
"""

import logging
import time
import threading
import requests
import pandas as pd
import numpy as np
from datetime import datetime

logger = logging.getLogger('AIOK.CLOUD')

try:
    import yfinance as yf
    YF_AVAILABLE = True
except ImportError:
    YF_AVAILABLE = False


class CloudDataProvider:
    """Fetches XAUUSD data — MT5 API first, yfinance fallback"""

    def __init__(self):
        self.last_price = None
        self.last_candles = {}
        self.last_price_time = 0
        self.price_cache_seconds = 10
        self._lock = threading.Lock()
        # Dynamic offset — updated every time we get MT5 price
        self._spot_offset = 15.0
        self._offset_calibrated = False

    def _try_mt5_api_price(self):
        """Try to get price from local MT5 server API"""
        try:
            resp = requests.get('http://localhost:5000/api/price', timeout=2)
            if resp.status_code == 200:
                data = resp.json()
                bid = data.get('bid', 0)
                ask = data.get('ask', 0)
                if bid > 1000:
                    # Calibrate offset with this real price
                    self._calibrate_offset_live(bid)
                    return {
                        'bid': bid,
                        'ask': ask,
                        'price': round((bid + ask) / 2, 2),
                        'spread': round(ask - bid, 2),
                        'source': 'MT5',
                        'time': datetime.now().isoformat(),
                    }
        except Exception:
            pass
        return None

    def _calibrate_offset_live(self, mt5_bid):
        """Auto-calibrate futures offset using real MT5 price"""
        if not YF_AVAILABLE:
            return
        try:
            ticker = yf.Ticker("GC=F")
            futures = float(ticker.fast_info.get('lastPrice', 0))
            if futures > 1000 and mt5_bid > 1000:
                new_offset = round(futures - mt5_bid, 2)
                if abs(new_offset - self._spot_offset) > 1.0:
                    logger.info("[CLOUD] Offset calibrated: %.2f → %.2f", self._spot_offset, new_offset)
                self._spot_offset = new_offset
                self._offset_calibrated = True
        except Exception:
            pass

    def get_current_price(self):
        """Get XAUUSD price — MT5 API first, cloud fallback"""
        now = time.time()
        if self.last_price and (now - self.last_price_time) < self.price_cache_seconds:
            return self.last_price

        # Try MT5 API first (most accurate)
        price = self._try_mt5_api_price()

        # Fallback to yfinance
        if not price:
            price = self._fetch_yfinance_price()

        if price:
            with self._lock:
                self.last_price = price
                self.last_price_time = now
        return price or self.last_price

    def _fetch_yfinance_price(self):
        """Fetch from yfinance with dynamic offset"""
        if not YF_AVAILABLE:
            return None
        try:
            ticker = yf.Ticker("GC=F")
            info = ticker.fast_info
            futures_price = float(info.get('lastPrice', 0) or info.get('last_price', 0))
            if futures_price > 1000:
                spot = round(futures_price - self._spot_offset, 2)
                spread = 0.30
                return {
                    'bid': round(spot - spread / 2, 2),
                    'ask': round(spot + spread / 2, 2),
                    'price': spot,
                    'spread': spread,
                    'source': 'yfinance',
                    'time': datetime.now().isoformat(),
                }
        except Exception as e:
            logger.debug("[CLOUD] yfinance error: %s", e)
        return None

    def get_candles(self, timeframe='15m', count=250):
        """Get OHLCV candles — uses yfinance with offset adjustment"""
        if not YF_AVAILABLE:
            return None

        cache_key = f"{timeframe}_{count}"
        now = time.time()
        if cache_key in self.last_candles:
            cached_time, cached_df = self.last_candles[cache_key]
            if (now - cached_time) < 120 and cached_df is not None and len(cached_df) > 0:
                return cached_df

        try:
            tf_map = {
                'M1': ('1m', '1d'), 'M5': ('5m', '5d'), 'M15': ('15m', '5d'),
                'M30': ('30m', '10d'), 'H1': ('1h', '30d'), 'H4': ('1h', '60d'),
                'D1': ('1d', '365d'),
                '1m': ('1m', '1d'), '5m': ('5m', '5d'), '15m': ('15m', '5d'),
                '30m': ('30m', '10d'), '1h': ('1h', '30d'), '4h': ('1h', '60d'),
                '1d': ('1d', '365d'),
            }
            yf_interval, yf_period = tf_map.get(timeframe, ('15m', '5d'))

            ticker = yf.Ticker("GC=F")
            hist = ticker.history(period=yf_period, interval=yf_interval)

            if hist is None or hist.empty:
                return None

            offset = self._spot_offset
            df = pd.DataFrame({
                'time': hist.index,
                'open': (hist['Open'] - offset).round(2).values,
                'high': (hist['High'] - offset).round(2).values,
                'low': (hist['Low'] - offset).round(2).values,
                'close': (hist['Close'] - offset).round(2).values,
                'volume': hist['Volume'].values.astype(int),
            })
            df = df.dropna()
            if len(df) > count:
                df = df.tail(count)
            df = df.reset_index(drop=True)

            with self._lock:
                self.last_candles[cache_key] = (now, df)

            logger.info("[CLOUD] Got %d candles for %s (offset=%.1f, calibrated=%s)",
                       len(df), timeframe, offset, self._offset_calibrated)
            return df

        except Exception as e:
            logger.error("[CLOUD] Candle error: %s", e)
            return None

    def is_available(self):
        price = self.get_current_price()
        return price is not None and price.get('price', 0) > 1000


cloud_data = CloudDataProvider()
