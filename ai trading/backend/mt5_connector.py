"""
AIOK Trading — MetaTrader 5 Connector
Handles MT5 connection, data fetching, and account management for Bybit
"""

import MetaTrader5 as mt5
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import time
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [MT5] %(message)s')
logger = logging.getLogger(__name__)

# Timeframe mapping
TIMEFRAMES = {
    'M1': mt5.TIMEFRAME_M1,
    'M5': mt5.TIMEFRAME_M5,
    'M15': mt5.TIMEFRAME_M15,
    'M30': mt5.TIMEFRAME_M30,
    'H1': mt5.TIMEFRAME_H1,
    'H4': mt5.TIMEFRAME_H4,
    'D1': mt5.TIMEFRAME_D1,
    'W1': mt5.TIMEFRAME_W1,
}


class MT5Connector:
    """Manages connection to MetaTrader 5 terminal"""

    def __init__(self, symbol="XAUUSD", login=None, password=None, server=None):
        self.symbol = symbol
        self.login = login
        self.password = password
        self.server = server
        self.connected = False
        self._retry_count = 0
        self._max_retries = 5

    def connect(self):
        """Initialize MT5 connection"""
        try:
            if not mt5.initialize():
                error = mt5.last_error()
                logger.error(f"MT5 initialize() failed: {error}")
                return False

            # If login credentials provided, login to account
            if self.login and self.password and self.server:
                authorized = mt5.login(
                    login=self.login,
                    password=self.password,
                    server=self.server
                )
                if not authorized:
                    logger.error(f"MT5 login failed: {mt5.last_error()}")
                    return False
                logger.info(f"Logged in to account #{self.login}")

            # Verify symbol exists
            symbol_info = mt5.symbol_info(self.symbol)
            if symbol_info is None:
                # Try alternative symbol names
                alternatives = ["XAUUSD", "GOLD", "XAUUSDm", "XAUUSD.m", "Gold", "XAUUSD.i"]
                for alt in alternatives:
                    symbol_info = mt5.symbol_info(alt)
                    if symbol_info is not None:
                        self.symbol = alt
                        logger.info(f"Symbol found as: {alt}")
                        break
                else:
                    logger.error(f"Symbol {self.symbol} not found. Available symbols may differ.")
                    return False

            # Enable symbol in Market Watch
            if not symbol_info.visible:
                if not mt5.symbol_select(self.symbol, True):
                    logger.error(f"Failed to select {self.symbol}")
                    return False

            self.connected = True
            self._retry_count = 0
            account = mt5.account_info()
            logger.info("Connected to MT5 - Account: %s | Balance: $%.2f", account.login, account.balance)
            return True

        except Exception as e:
            logger.error(f"MT5 connection error: {e}")
            return False

    def disconnect(self):
        """Shutdown MT5 connection"""
        mt5.shutdown()
        self.connected = False
        logger.info("MT5 disconnected")

    def reconnect(self):
        """Auto-reconnect with retry logic"""
        if self._retry_count >= self._max_retries:
            logger.error(f"Max reconnect attempts ({self._max_retries}) reached")
            return False

        self._retry_count += 1
        logger.info(f"Reconnecting... attempt {self._retry_count}/{self._max_retries}")
        self.disconnect()
        time.sleep(2 * self._retry_count)
        return self.connect()

    def get_tick(self):
        """Get current price tick"""
        if not self.connected:
            return None

        tick = mt5.symbol_info_tick(self.symbol)
        if tick is None:
            logger.warning(f"Failed to get tick for {self.symbol}")
            return None

        return {
            'bid': tick.bid,
            'ask': tick.ask,
            'last': tick.last,
            'time': datetime.fromtimestamp(tick.time).isoformat(),
            'spread': round(tick.ask - tick.bid, 2),
            'volume': tick.volume,
        }

    def get_current_price(self):
        """Get current price data"""
        tick = self.get_tick()
        if tick is None:
            return None

        # Get today's OHLC from D1 candle
        rates = mt5.copy_rates_from_pos(self.symbol, mt5.TIMEFRAME_D1, 0, 2)
        if rates is not None and len(rates) > 0:
            today = rates[-1]
            yesterday = rates[-2] if len(rates) > 1 else rates[-1]
            return {
                'current': tick['bid'],
                'bid': tick['bid'],
                'ask': tick['ask'],
                'spread': tick['spread'],
                'high': float(today['high']),
                'low': float(today['low']),
                'open': float(today['open']),
                'prevClose': float(yesterday['close']),
                'volume': int(today['tick_volume']),
                'time': tick['time'],
            }
        return {
            'current': tick['bid'],
            'bid': tick['bid'],
            'ask': tick['ask'],
            'spread': tick['spread'],
        }

    def get_candles(self, timeframe='M15', count=200):
        """Get OHLCV candle data as DataFrame"""
        if not self.connected:
            return None

        tf = TIMEFRAMES.get(timeframe, mt5.TIMEFRAME_M15)
        rates = mt5.copy_rates_from_pos(self.symbol, tf, 0, count)

        if rates is None or len(rates) == 0:
            logger.warning(f"No candle data for {self.symbol} {timeframe}")
            return None

        df = pd.DataFrame(rates)
        df['time'] = pd.to_datetime(df['time'], unit='s')
        df.rename(columns={'tick_volume': 'volume'}, inplace=True)
        df = df[['time', 'open', 'high', 'low', 'close', 'volume']]
        return df

    def get_multi_tf_candles(self, count=200):
        """Get candles for all analysis timeframes"""
        timeframes = ['M5', 'M15', 'H1']
        data = {}
        for tf in timeframes:
            df = self.get_candles(tf, count)
            if df is not None:
                data[tf] = df
        return data

    def get_account_info(self):
        """Get account information"""
        if not self.connected:
            return None

        account = mt5.account_info()
        if account is None:
            return None

        return {
            'balance': account.balance,
            'equity': account.equity,
            'margin': account.margin_free,
            'profit': account.profit,
            'leverage': account.leverage,
            'currency': account.currency,
            'login': account.login,
            'server': account.server,
            'name': account.name,
        }

    def get_open_positions(self):
        """Get all open positions"""
        if not self.connected:
            return []

        positions = mt5.positions_get(symbol=self.symbol)
        if positions is None or len(positions) == 0:
            return []

        result = []
        for pos in positions:
            result.append({
                'ticket': pos.ticket,
                'type': 'buy' if pos.type == 0 else 'sell',
                'volume': pos.volume,
                'price_open': pos.price_open,
                'sl': pos.sl,
                'tp': pos.tp,
                'profit': pos.profit,
                'swap': pos.swap,
                'time': datetime.fromtimestamp(pos.time).isoformat(),
                'magic': pos.magic,
                'comment': pos.comment,
            })
        return result

    def get_trade_history(self, days=7):
        """Get recent trade history"""
        if not self.connected:
            return []

        from_date = datetime.now() - timedelta(days=days)
        to_date = datetime.now()
        
        deals = mt5.history_deals_get(from_date, to_date, group=f"*{self.symbol}*")
        if deals is None or len(deals) == 0:
            return []

        result = []
        for deal in deals:
            result.append({
                'ticket': deal.ticket,
                'order': deal.order,
                'type': 'buy' if deal.type == 0 else 'sell',
                'volume': deal.volume,
                'price': deal.price,
                'profit': deal.profit,
                'swap': deal.swap,
                'commission': deal.commission,
                'time': datetime.fromtimestamp(deal.time).isoformat(),
                'comment': deal.comment,
            })
        return result

    def get_symbol_info(self):
        """Get symbol specifications"""
        info = mt5.symbol_info(self.symbol)
        if info is None:
            return None

        return {
            'symbol': info.name,
            'point': info.point,
            'digits': info.digits,
            'spread': info.spread,
            'trade_tick_size': info.trade_tick_size,
            'trade_tick_value': info.trade_tick_value,
            'volume_min': info.volume_min,
            'volume_max': info.volume_max,
            'volume_step': info.volume_step,
        }


# Singleton instance
connector = MT5Connector()
