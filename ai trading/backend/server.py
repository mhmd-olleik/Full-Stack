"""
AIOK Trading — Flask API Server (REAL MODE)
100% LIVE — Connects to MT5, runs real analysis, serves real data
"""

import sys
import os
import json
import time
import threading
import logging
from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mt5_connector import connector
from technical_analysis import ta_engine
from ml_engine import ml_engine
from signal_generator import signal_generator, news_calendar
from risk_manager import risk_manager
from trade_executor import trade_executor
from auto_trader import auto_trader

# Telegram Bot
try:
    from telegram_bot.bot import telegram_bot
    TELEGRAM_AVAILABLE = True
except ImportError as e:
    TELEGRAM_AVAILABLE = False
    print(f"[WARN] Telegram bot not available: {e}")

# ============ CONFIGURATION — EDIT THIS ============

MT5_CONFIG = {
    # Symbol name on your Bybit MT5
    # Try: "XAUUSD", "GOLD", "XAUUSDm" — depends on your broker
    'symbol': 'XAUUSD+',
    
    # Leave as None to use the account already logged in on MT5 terminal
    # Or fill in your credentials:
    'login': None,          # Your MT5 account number (integer), e.g. 12345678
    'password': None,       # Your MT5 password (string)
    'server': None,         # Your broker server, e.g. "Bybit-Server"
}

# Trading mode: 'signal' (show only), 'semi' (confirm), 'auto' (execute automatically)
TRADE_MODE = 'signal'

# Server
HOST = '0.0.0.0'
PORT = 5000

# Analysis timing
ANALYSIS_INTERVAL = 10    # Seconds between full analysis
PRICE_INTERVAL = 1        # Seconds between price updates
TRAILING_INTERVAL = 5     # Seconds between trailing stop checks

# ============ APP SETUP ============

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s'
)
logger = logging.getLogger('AIOK')


# ============ LIVE TRADING ENGINE ============

class LiveTradingEngine(threading.Thread):
    """Background engine — runs REAL analysis on REAL MT5 data"""

    def __init__(self):
        super().__init__(daemon=True)
        self.running = False
        self.last_signal = None
        self.last_analysis = None
        self.last_price = None
        self.last_analysis_time = 0
        self.trade_mode = TRADE_MODE

    def run(self):
        self.running = True
        logger.info("=" * 50)
        logger.info("[START] LIVE Trading Engine STARTED")
        logger.info("=" * 50)

        # Try to load or train ML model
        self._init_ml()

        while self.running:
            try:
                if connector.connected:
                    # Always update price (fast)
                    self._update_price()
                    
                    # Run analysis on schedule
                    now = time.time()
                    if now - self.last_analysis_time >= ANALYSIS_INTERVAL:
                        self._run_full_analysis()
                        self.last_analysis_time = now
                    
                    # Manage trailing stops
                    self._manage_trailing()
                    
                    time.sleep(PRICE_INTERVAL)
                else:
                    logger.warning("MT5 disconnected - reconnecting...")
                    if connector.reconnect():
                        logger.info("[OK] Reconnected to MT5")
                    else:
                        time.sleep(10)
            except Exception as e:
                logger.error(f"Engine error: {e}", exc_info=True)
                time.sleep(5)

    def _update_price(self):
        """Get real price from MT5"""
        try:
            price = connector.get_current_price()
            if price:
                self.last_price = price
        except Exception as e:
            logger.debug(f"Price update error: {e}")

    def _run_full_analysis(self):
        """Run complete analysis on all timeframes"""
        try:
            logger.info("[ANALYSIS] Running full analysis...")
            
            # Fetch real candles from MT5 for all timeframes
            multi_tf = connector.get_multi_tf_candles(count=250)
            if not multi_tf:
                logger.warning("No candle data from MT5")
                return

            # Run technical analysis on primary timeframe
            primary_df = None
            for tf_key in ['M15', 'M5', 'H1']:
                df_candidate = multi_tf.get(tf_key)
                if df_candidate is not None and not df_candidate.empty:
                    primary_df = df_candidate
                    break
            if primary_df is not None:
                analysis = ta_engine.analyze(primary_df)
                if analysis:
                    self.last_analysis = analysis
                    confluence = ta_engine.get_confluence_score(analysis)
                    logger.info("  TA Score: %s %d/10 (%s) | Edge: %d | Buy:%d Sell:%d",
                               confluence['direction'].upper(),
                               confluence['score'], confluence['strength'],
                               confluence.get('edge', 0),
                               confluence.get('buy_score', 0),
                               confluence.get('sell_score', 0))
                    # Show indicator breakdown
                    details = confluence.get('details', {})
                    breakdown = ' | '.join(['%s:%s' % (k, v) for k, v in details.items()])
                    logger.info("  Indicators: %s", breakdown)

            # Generate confluence signal (includes ML)
            signal = signal_generator.generate_signal(multi_tf)
            if signal:
                self.last_signal = signal
                
                # Auto-execute if in auto mode and signal is strong
                if self.trade_mode == 'auto' and signal['is_tradeable']:
                    self._auto_execute(signal)

            # Update multi-timeframe signals
            self._update_mtf(multi_tf)

        except Exception as e:
            logger.error(f"Analysis error: {e}", exc_info=True)

    def _auto_execute(self, signal):
        """Auto-execute trade (ONLY in auto mode)"""
        try:
            account = connector.get_account_info()
            symbol_info = connector.get_symbol_info()
            
            # Risk check
            positions = connector.get_open_positions()
            can_trade, reason = risk_manager.can_trade(account, len(positions))
            
            if not can_trade:
                logger.info(f"Auto-trade blocked: {reason}")
                return
            
            result = trade_executor.execute_trade(signal, account, symbol_info)
            if result.get('success'):
                logger.info("[AUTO] TRADE executed: #%s", result['ticket'])
            else:
                logger.warning(f"Auto trade failed: {result.get('error')}")
        except Exception as e:
            logger.error(f"Auto-execute error: {e}")

    def _manage_trailing(self):
        """Update trailing stops"""
        try:
            if self.last_analysis and 'atr' in self.last_analysis:
                atr_val = self.last_analysis['atr'].get('value', 5.0)
                trade_executor.manage_trailing_stops(atr_val)
        except Exception as e:
            logger.debug(f"Trailing stop error: {e}")

    def _update_mtf(self, multi_tf):
        """Calculate direction for each timeframe"""
        self.mtf_signals = {}
        for tf, df in multi_tf.items():
            if df is not None and len(df) > 20:
                sma20 = df['close'].rolling(20).mean().iloc[-1]
                price = df['close'].iloc[-1]
                ema9 = df['close'].ewm(span=9, adjust=False).mean().iloc[-1]
                
                if price > sma20 and price > ema9:
                    self.mtf_signals[tf] = 'buy'
                elif price < sma20 and price < ema9:
                    self.mtf_signals[tf] = 'sell'
                else:
                    self.mtf_signals[tf] = 'neutral'

    def _init_ml(self):
        """Initialize ML model"""
        try:
            # Try loading existing model first
            if ml_engine._load_models():
                logger.info("[ML] Model loaded from disk")
                return

            if not connector.connected:
                logger.warning("Cannot train ML - MT5 not connected")
                return

            # Train on historical H1 data
            logger.info("[ML] Training model on historical data...")
            df = connector.get_candles('H1', count=5000)
            if df is not None and len(df) > 500:
                accuracy = ml_engine.train(df)
                logger.info("[ML] Trained - Accuracy: %.1f%%", accuracy)
            else:
                logger.warning("Not enough historical data for ML training")
                # Try with less data
                df = connector.get_candles('M15', count=2000)
                if df is not None and len(df) > 300:
                    accuracy = ml_engine.train(df)
                    logger.info("[ML] Trained (M15 data) - Accuracy: %.1f%%", accuracy)
        except Exception as e:
            logger.error(f"ML init error: {e}")

    def _serialize(self, obj):
        """Make indicator data JSON-safe"""
        if not obj:
            return {}
        result = {}
        for key, val in obj.items():
            if isinstance(val, dict):
                result[key] = {}
                for k, v in val.items():
                    try:
                        result[key][k] = float(v) if hasattr(v, '__float__') else v
                    except (TypeError, ValueError):
                        result[key][k] = str(v)
            else:
                result[key] = val
        return result

    def stop(self):
        self.running = False


# Global engine
engine = LiveTradingEngine()


# ============ API ENDPOINTS (REAL DATA) ============

@app.route('/api/price', methods=['GET'])
def api_price():
    """Real-time price from MT5"""
    if engine.last_price:
        return jsonify(engine.last_price)
    if connector.connected:
        p = connector.get_current_price()
        if p:
            return jsonify(p)
    return jsonify({'error': 'No price data - is MT5 running?'}), 503


@app.route('/api/signals', methods=['GET'])
def api_signals():
    """Current signal with lifecycle state"""
    sig = signal_generator.active_signal
    hist = signal_generator.get_recent_signals(20)

    # If no active signal, return the last scan result
    if not sig and hasattr(engine, 'last_signal') and engine.last_signal:
        sig = engine.last_signal

    current_clean = None
    if sig:
        current_clean = {
            'direction': sig.get('direction', 'neutral'),
            'score': sig.get('score', 0),
            'max_score': sig.get('max_score', 10),
            'is_tradeable': sig.get('is_tradeable', False),
            'strength': sig.get('strength', 'WEAK'),
            'price': sig.get('price', 0),
            'entry_price': sig.get('entry_price', sig.get('price', 0)),
            'sl': sig.get('sl'),
            'tp': sig.get('tp1'),  # backwards compat
            'tp1': sig.get('tp1'),
            'tp2': sig.get('tp2'),
            'tp3': sig.get('tp3'),
            'sl_distance': sig.get('sl_distance', 0),
            'tp_distance': sig.get('tp_distance', 0),
            'risk_reward': sig.get('risk_reward', 'N/A'),
            'edge': sig.get('edge', 0),
            'ml_probability': sig.get('ml_probability', 0),
            'ml_direction': sig.get('ml_direction', 'neutral'),
            'confluence_details': sig.get('confluence_details', {}),
            'candle_pattern': sig.get('candle_pattern', 'NONE'),
            'trend_strength': sig.get('trend_strength', 0),
            'time': sig.get('time', ''),
            'timestamp': sig.get('timestamp', ''),
            # Lifecycle fields
            'lifecycle': sig.get('lifecycle', 'WAITING'),
            'is_new': sig.get('is_new', False),
            'tp1_hit': sig.get('tp1_hit', False),
            'tp2_hit': sig.get('tp2_hit', False),
            'tp3_hit': sig.get('tp3_hit', False),
            'sl_hit': sig.get('sl_hit', False),
            'result': sig.get('result'),
            'message': sig.get('message', ''),
            'signal_id': sig.get('signal_id', ''),
            # Optimal entry fields
            'optimal_entry': sig.get('optimal_entry'),
            'entry_type': sig.get('entry_type', 'MARKET'),
            'entry_reason': sig.get('entry_reason', ''),
        }

    return jsonify({
        'current': current_clean,
        'lifecycle': signal_generator.state,
        'signals_today': signal_generator.signals_today,
        'max_signals': signal_generator.max_signals_per_day,
        'history': [{
            'direction': s.get('direction'),
            'score': s.get('score'),
            'price': s.get('entry_price', s.get('price')),
            'time': s.get('time'),
            'result': s.get('result'),
            'tp1_hit': s.get('tp1_hit'),
            'tp2_hit': s.get('tp2_hit'),
            'tp3_hit': s.get('tp3_hit'),
        } for s in hist],
        'news': news_calendar.get_summary(),
    })


@app.route('/api/news', methods=['GET'])
def api_news():
    """Economic calendar events for today"""
    return jsonify(news_calendar.get_summary())


@app.route('/api/signal/enter', methods=['POST'])
def api_signal_enter():
    """User clicked 'دخلت الصفقة'"""
    success = signal_generator.user_enter()
    return jsonify({'success': success, 'state': signal_generator.state})


@app.route('/api/signal/skip', methods=['POST'])
def api_signal_skip():
    """User clicked 'Skip — توصية جديدة'"""
    success = signal_generator.user_skip()
    return jsonify({'success': success, 'state': signal_generator.state})


@app.route('/api/signal/close', methods=['POST'])
def api_signal_close():
    """User manually closed the trade"""
    success = signal_generator.user_close()
    return jsonify({'success': success, 'state': signal_generator.state})


@app.route('/api/signal/reset', methods=['POST'])
def api_signal_reset():
    """Force reset to scanning mode"""
    success = signal_generator.force_reset()
    return jsonify({'success': success, 'state': signal_generator.state})


@app.route('/api/analysis', methods=['GET'])
def api_analysis():
    """Full technical analysis — real indicators from real price data"""
    if engine.last_analysis:
        return jsonify(engine._serialize(engine.last_analysis))
    
    # Try running analysis now
    if connector.connected:
        tf = request.args.get('timeframe', 'M15')
        df = connector.get_candles(tf, 250)
        if df is not None:
            analysis = ta_engine.analyze(df)
            if analysis:
                engine.last_analysis = analysis
                return jsonify(engine._serialize(analysis))
    
    return jsonify({'error': 'No analysis data - waiting for MT5 data'}), 503


@app.route('/api/candles', methods=['GET'])
def api_candles():
    """Real OHLCV candle data from MT5"""
    if not connector.connected:
        return jsonify({'error': 'MT5 not connected'}), 503
    
    tf = request.args.get('timeframe', 'M15')
    count = min(int(request.args.get('count', 200)), 5000)
    
    df = connector.get_candles(tf, count)
    if df is not None and len(df) > 0:
        candles = []
        for _, row in df.iterrows():
            candles.append({
                'time': int(row['time'].timestamp()),
                'open': float(row['open']),
                'high': float(row['high']),
                'low': float(row['low']),
                'close': float(row['close']),
                'volume': int(row['volume']),
            })
        return jsonify(candles)
    
    return jsonify({'error': f'No candle data for {tf}'}), 503


@app.route('/api/account', methods=['GET'])
def api_account():
    """Real account info from MT5"""
    if not connector.connected:
        return jsonify({'error': 'MT5 not connected'}), 503
    
    account = connector.get_account_info()
    if account:
        account['daily_pnl'] = risk_manager.daily_pnl
        account['open_positions'] = len(connector.get_open_positions())
        return jsonify(account)
    
    return jsonify({'error': 'No account data'}), 503


@app.route('/api/trades', methods=['GET'])
def api_trades():
    """Real trades from MT5"""
    open_positions = connector.get_open_positions() if connector.connected else []
    mt5_history = connector.get_trade_history(days=30) if connector.connected else []
    
    return jsonify({
        'active': trade_executor.get_active_trades(),
        'history': trade_executor.get_trade_history(),
        'mt5_history': mt5_history,
        'open_positions': open_positions,
    })


@app.route('/api/execute', methods=['POST'])
def api_execute():
    """Execute a REAL trade on MT5"""
    if not connector.connected:
        return jsonify({'success': False, 'error': 'MT5 not connected - cannot execute trade'}), 503
    
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data'}), 400

    trade_type = data.get('type')
    if trade_type not in ['buy', 'sell']:
        return jsonify({'success': False, 'error': 'Type must be buy or sell'}), 400

    # Build signal from current or provided data
    signal = signal_generator.current_signal
    if signal is None or signal.get('direction') != trade_type:
        signal = {
            'direction': trade_type,
            'price': data.get('price', 0),
            'sl': data.get('sl', 0),
            'tp': data.get('tp', 0),
            'sl_distance': data.get('sl_distance', 5.0),
            'tp_distance': data.get('tp_distance', 10.0),
            'score': data.get('score', 0),
            'is_tradeable': True,
        }

    account = connector.get_account_info()
    symbol_info = connector.get_symbol_info()

    result = trade_executor.execute_trade(signal, account, symbol_info)
    
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code


@app.route('/api/close', methods=['POST'])
def api_close():
    """Close a real position"""
    data = request.get_json()
    ticket = data.get('ticket')
    if not ticket:
        return jsonify({'success': False, 'error': 'No ticket'}), 400
    
    result = trade_executor.close_trade(int(ticket))
    return jsonify(result)


@app.route('/api/close-all', methods=['POST'])
def api_close_all():
    """Emergency close all"""
    results = trade_executor.close_all_positions()
    return jsonify({'success': True, 'closed': len(results)})


@app.route('/api/settings', methods=['POST'])
def api_settings():
    """Update settings"""
    data = request.get_json() or {}
    
    if 'mode' in data:
        engine.trade_mode = data['mode']
        logger.info(f"Trade mode changed to: {data['mode']}")
    if 'risk_per_trade' in data:
        risk_manager.risk_per_trade = float(data['risk_per_trade'])
    if 'max_daily_loss' in data:
        risk_manager.max_daily_loss = float(data['max_daily_loss'])
    if 'lot_min' in data:
        risk_manager.lot_min = float(data['lot_min'])
    if 'lot_max' in data:
        risk_manager.lot_max = float(data['lot_max'])
    if 'min_score' in data:
        signal_generator.min_score = int(data['min_score'])
    
    return jsonify({'success': True})


@app.route('/api/status', methods=['GET'])
def api_status():
    """System health check"""
    return jsonify({
        'mt5_connected': connector.connected,
        'engine_running': engine.running,
        'ml_trained': ml_engine.is_trained,
        'ml_accuracy': ml_engine.accuracy if ml_engine.is_trained else 0,
        'symbol': connector.symbol,
        'trade_mode': engine.trade_mode,
        'uptime': 'running' if engine.running else 'stopped',
    })


@app.route('/api/health', methods=['GET'])
def api_health():
    return jsonify({'status': 'ok', 'time': datetime.now().isoformat()})


@app.route('/api/mtf', methods=['GET'])
def api_mtf():
    """Multi-timeframe signals"""
    return jsonify(getattr(engine, 'mtf_signals', {}))


# ============ AUTO BOT ENDPOINTS ============

@app.route('/api/auto/status', methods=['GET'])
def api_auto_status():
    """Get auto bot status and stats"""
    return jsonify(auto_trader.get_status())


@app.route('/api/auto/start', methods=['POST'])
def api_auto_start():
    """Enable auto trading bot"""
    auto_trader.start_bot()
    return jsonify({'success': True, 'status': auto_trader.get_status()})


@app.route('/api/auto/stop', methods=['POST'])
def api_auto_stop():
    """Disable auto trading bot"""
    auto_trader.stop_bot()
    return jsonify({'success': True, 'status': auto_trader.get_status()})


@app.route('/api/auto/emergency', methods=['POST'])
def api_auto_emergency():
    """Emergency stop — disable bot and close all trades"""
    auto_trader.emergency_stop()
    return jsonify({'success': True, 'status': auto_trader.get_status()})


@app.route('/api/auto/settings', methods=['POST'])
def api_auto_settings():
    """Update auto bot settings"""
    data = request.get_json() or {}
    auto_trader.update_settings(data)
    return jsonify({'success': True, 'status': auto_trader.get_status()})


@app.route('/api/auto/history', methods=['GET'])
def api_auto_history():
    """Get bot trade history"""
    return jsonify({
        'today': auto_trader.trade_history,
        'all_time': auto_trader.all_time_history[-50:],
    })


# ============ TELEGRAM BOT ENDPOINTS ============

@app.route('/api/telegram/status', methods=['GET'])
def api_telegram_status():
    """Get Telegram bot status"""
    if not TELEGRAM_AVAILABLE:
        return jsonify({'available': False, 'error': 'Telegram bot not installed'})
    return jsonify({
        'available': True,
        'running': telegram_bot.running,
        'last_signal_id': telegram_bot.last_signal_id,
    })


@app.route('/api/telegram/start', methods=['POST'])
def api_telegram_start():
    """Start Telegram bot"""
    if not TELEGRAM_AVAILABLE:
        return jsonify({'success': False, 'error': 'Telegram not available'})
    if telegram_bot.running:
        return jsonify({'success': True, 'message': 'Already running'})
    telegram_bot.start_in_thread()
    return jsonify({'success': True})


@app.route('/api/telegram/stop', methods=['POST'])
def api_telegram_stop():
    """Stop Telegram bot"""
    if TELEGRAM_AVAILABLE and telegram_bot.running:
        telegram_bot.stop()
    return jsonify({'success': True})


# ============ MAIN ============

def main():
    banner = (
        "\n"
        "    ===================================================\n"
        "    |       AIOK Trading - LIVE TRADING ENGINE             |\n"
        "    |         XAUUSD Intelligence System               |\n"
        "    |              100% REAL MODE                      |\n"
        "    |=================================================|\n"
        "    |  API Server:  http://localhost:5000              |\n"
        "    |  Dashboard:   Open index.html in browser         |\n"
        "    |                                                  |\n"
        "    |  >> Make sure MetaTrader 5 is RUNNING            |\n"
        "    |  >> Make sure you are LOGGED IN to Bybit         |\n"
        "    ===================================================\n"
    )
    print(banner)

    # Configure MT5
    connector.symbol = MT5_CONFIG['symbol']
    if MT5_CONFIG.get('login'):
        connector.login = MT5_CONFIG['login']
        connector.password = MT5_CONFIG['password']
        connector.server = MT5_CONFIG['server']

    # Connect to MT5
    logger.info("Connecting to MetaTrader 5...")
    if connector.connect():
        account = connector.get_account_info()
        logger.info("[OK] MT5 Connected!")
        logger.info("   Account: %s | Server: %s", account.get('login'), account.get('server'))
        logger.info("   Balance: $%.2f | Equity: $%.2f", account.get('balance', 0), account.get('equity', 0))
        logger.info("   Symbol: %s", connector.symbol)
        
        # Start the live trading engine
        engine.start()
        logger.info("[OK] Live Trading Engine started")
        
        # Start auto trader thread (starts disabled, user enables via dashboard)
        auto_trader.start()
        logger.info("[OK] AutoTrader thread started (disabled by default — enable via dashboard)")

        # Start Telegram Bot
        if TELEGRAM_AVAILABLE:
            try:
                telegram_bot.start_in_thread()
                logger.info("[OK] Telegram Bot started in background")
            except Exception as e:
                logger.error("[FAIL] Telegram Bot failed: %s", e)
        else:
            logger.warning("[SKIP] Telegram Bot not available — install python-telegram-bot")
    else:
        logger.error("=" * 50)
        logger.error("[FAIL] CANNOT CONNECT TO MT5!")
        logger.error("")
        logger.error("Make sure:")
        logger.error("  1. MetaTrader 5 is INSTALLED and RUNNING")
        logger.error("  2. You are LOGGED IN to your Bybit account")
        logger.error("  3. XAUUSD is visible in Market Watch")
        logger.error("  4. Allow Algo Trading is ENABLED")
        logger.error("     (Tools > Options > Expert Advisors > Allow)")
        logger.error("")
        logger.error("The API will start but data will be unavailable.")
        logger.error("=" * 50)

    # Start Flask API server
    logger.info("Starting API server on port %d...", PORT)
    app.run(host=HOST, port=PORT, debug=False, threaded=True)


if __name__ == '__main__':
    main()
