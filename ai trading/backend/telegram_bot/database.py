"""
AIOK Trading — Database Manager
============================
SQLite database for managing users, trades, signals, and settings.
"""

import sqlite3
import os
import logging
from datetime import datetime, timedelta

logger = logging.getLogger('AIOK.DB')

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'nexus_bot.db')


class Database:
    """SQLite database manager for the Telegram bot"""

    def __init__(self):
        self.db_path = DB_PATH
        self._init_db()

    def _get_conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def _init_db(self):
        """Create tables if they don't exist"""
        conn = self._get_conn()
        try:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id INTEGER UNIQUE NOT NULL,
                    username TEXT,
                    full_name TEXT,
                    phone TEXT,
                    status TEXT DEFAULT 'pending',
                    is_admin INTEGER DEFAULT 0,
                    joined_at TEXT,
                    last_active TEXT,
                    total_profit REAL DEFAULT 0,
                    total_loss REAL DEFAULT 0,
                    total_trades INTEGER DEFAULT 0,
                    wins INTEGER DEFAULT 0,
                    losses INTEGER DEFAULT 0,
                    skips INTEGER DEFAULT 0,
                    language TEXT DEFAULT 'ar'
                );

                CREATE TABLE IF NOT EXISTS trades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    signal_id INTEGER,
                    direction TEXT,
                    entry_price REAL,
                    tp REAL,
                    sl REAL,
                    status TEXT DEFAULT 'pending',
                    result TEXT,
                    pnl REAL DEFAULT 0,
                    created_at TEXT,
                    closed_at TEXT,
                    message_id INTEGER,
                    FOREIGN KEY (user_id) REFERENCES users(telegram_id)
                );

                CREATE TABLE IF NOT EXISTS signals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    direction TEXT,
                    entry_price REAL,
                    tp REAL,
                    sl REAL,
                    score INTEGER,
                    strength TEXT,
                    status TEXT DEFAULT 'active',
                    risk_reward TEXT,
                    created_at TEXT,
                    closed_at TEXT,
                    result TEXT
                );

                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT
                );

                CREATE TABLE IF NOT EXISTS broadcast_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    admin_id INTEGER,
                    message TEXT,
                    sent_count INTEGER,
                    created_at TEXT
                );
            """)
            conn.commit()

            # === SUBSCRIPTION SYSTEM: Add columns if missing ===
            try:
                conn.execute("SELECT free_signals_remaining FROM users LIMIT 1")
            except sqlite3.OperationalError:
                conn.execute("ALTER TABLE users ADD COLUMN free_signals_remaining INTEGER DEFAULT 6")
                conn.execute("ALTER TABLE users ADD COLUMN is_premium INTEGER DEFAULT 0")
                conn.execute("ALTER TABLE users ADD COLUMN premium_until TEXT")
                conn.execute("ALTER TABLE users ADD COLUMN signals_received INTEGER DEFAULT 0")
                conn.commit()
                logger.info("[DB] Subscription columns added")

            logger.info("[DB] Database initialized at %s", self.db_path)
        finally:
            conn.close()

    # =============== SETTINGS METHODS ===============

    def get_setting(self, key, default=None):
        """Get a setting value from the settings table"""
        conn = self._get_conn()
        try:
            row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
            return row['value'] if row else default
        except Exception as e:
            logger.debug("[DB] get_setting error: %s", e)
            return default
        finally:
            conn.close()

    def set_setting(self, key, value):
        """Set a setting value in the settings table"""
        conn = self._get_conn()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                (key, str(value))
            )
            conn.commit()
            logger.info("[DB] Setting '%s' = '%s'", key, value)
            return True
        except Exception as e:
            logger.error("[DB] set_setting error: %s", e)
            return False
        finally:
            conn.close()

    def get_all_settings(self):
        """Get all settings as a dictionary"""
        conn = self._get_conn()
        try:
            rows = conn.execute("SELECT key, value FROM settings").fetchall()
            return {row['key']: row['value'] for row in rows}
        except Exception:
            return {}
        finally:
            conn.close()

    # =============== SUBSCRIPTION METHODS ===============

    def can_receive_signal(self, telegram_id):
        """Check if user can receive signals (premium or has free signals left)"""
        user = self.get_user(telegram_id)
        if not user:
            return False
        # Admin always gets signals
        if user.get('is_admin'):
            return True
        # Premium user
        if user.get('is_premium'):
            until = user.get('premium_until', '')
            if until and until > datetime.now().isoformat():
                return True
            # Premium expired
            self._set_premium(telegram_id, False)
        # Free signals remaining
        free_left = user.get('free_signals_remaining', 6)
        return free_left > 0

    def use_free_signal(self, telegram_id):
        """Decrease free signal count by 1"""
        conn = self._get_conn()
        try:
            conn.execute("""
                UPDATE users SET 
                    free_signals_remaining = MAX(free_signals_remaining - 1, 0),
                    signals_received = COALESCE(signals_received, 0) + 1
                WHERE telegram_id = ?
            """, (telegram_id,))
            conn.commit()
        finally:
            conn.close()

    def get_free_signals_left(self, telegram_id):
        user = self.get_user(telegram_id)
        if not user:
            return 0
        return user.get('free_signals_remaining', 6)

    def is_premium_user(self, telegram_id):
        user = self.get_user(telegram_id)
        if not user:
            return False
        if user.get('is_premium'):
            until = user.get('premium_until', '')
            if until and until > datetime.now().isoformat():
                return True
        return False

    def set_premium(self, telegram_id, days=30):
        """Grant premium for X days"""
        conn = self._get_conn()
        try:
            until = (datetime.now() + timedelta(days=days)).isoformat()
            conn.execute("""
                UPDATE users SET is_premium = 1, premium_until = ? WHERE telegram_id = ?
            """, (until, telegram_id))
            conn.commit()
        finally:
            conn.close()

    def remove_premium(self, telegram_id):
        conn = self._get_conn()
        try:
            conn.execute("""
                UPDATE users SET is_premium = 0, premium_until = NULL WHERE telegram_id = ?
            """, (telegram_id,))
            conn.commit()
        finally:
            conn.close()

    def _set_premium(self, telegram_id, value):
        conn = self._get_conn()
        try:
            conn.execute("UPDATE users SET is_premium = ? WHERE telegram_id = ?", (1 if value else 0, telegram_id))
            conn.commit()
        finally:
            conn.close()

    def reset_free_signals(self, telegram_id, count=6):
        conn = self._get_conn()
        try:
            conn.execute("UPDATE users SET free_signals_remaining = ? WHERE telegram_id = ?", (count, telegram_id))
            conn.commit()
        finally:
            conn.close()

    # =============== USER METHODS ===============

    def user_exists(self, telegram_id):
        conn = self._get_conn()
        try:
            row = conn.execute("SELECT id FROM users WHERE telegram_id = ?", (telegram_id,)).fetchone()
            return row is not None
        finally:
            conn.close()

    def get_user(self, telegram_id):
        conn = self._get_conn()
        try:
            row = conn.execute("SELECT * FROM users WHERE telegram_id = ?", (telegram_id,)).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def is_registered(self, telegram_id):
        """Check if user completed registration (has name + phone)"""
        user = self.get_user(telegram_id)
        if not user:
            return False
        return user['status'] in ('active', 'admin') and user['full_name'] and user['phone']

    def is_banned(self, telegram_id):
        user = self.get_user(telegram_id)
        if not user:
            return False
        return user['status'] == 'banned'

    def register_user(self, telegram_id, username=None):
        """Create initial user record (pending registration)"""
        conn = self._get_conn()
        try:
            conn.execute("""
                INSERT OR IGNORE INTO users (telegram_id, username, status, joined_at, last_active)
                VALUES (?, ?, 'pending', ?, ?)
            """, (telegram_id, username, datetime.now().isoformat(), datetime.now().isoformat()))
            conn.commit()
        finally:
            conn.close()

    def set_user_name(self, telegram_id, full_name):
        conn = self._get_conn()
        try:
            conn.execute("UPDATE users SET full_name = ? WHERE telegram_id = ?", (full_name, telegram_id))
            conn.commit()
        finally:
            conn.close()

    def set_user_phone(self, telegram_id, phone):
        conn = self._get_conn()
        try:
            conn.execute("""
                UPDATE users SET phone = ?, status = 'active' WHERE telegram_id = ?
            """, (phone, telegram_id))
            conn.commit()
        finally:
            conn.close()

    def update_last_active(self, telegram_id):
        conn = self._get_conn()
        try:
            conn.execute("UPDATE users SET last_active = ? WHERE telegram_id = ?",
                        (datetime.now().isoformat(), telegram_id))
            conn.commit()
        finally:
            conn.close()

    def ban_user(self, telegram_id):
        conn = self._get_conn()
        try:
            conn.execute("UPDATE users SET status = 'banned' WHERE telegram_id = ?", (telegram_id,))
            conn.commit()
            return True
        finally:
            conn.close()

    def unban_user(self, telegram_id):
        conn = self._get_conn()
        try:
            conn.execute("UPDATE users SET status = 'active' WHERE telegram_id = ?", (telegram_id,))
            conn.commit()
            return True
        finally:
            conn.close()

    def get_all_users(self):
        conn = self._get_conn()
        try:
            rows = conn.execute("SELECT * FROM users ORDER BY joined_at DESC").fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_active_users(self):
        conn = self._get_conn()
        try:
            rows = conn.execute("SELECT * FROM users WHERE status = 'active'").fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_banned_users(self):
        conn = self._get_conn()
        try:
            rows = conn.execute("SELECT * FROM users WHERE status = 'banned'").fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_user_count(self):
        conn = self._get_conn()
        try:
            total = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            active = conn.execute("SELECT COUNT(*) FROM users WHERE status = 'active'").fetchone()[0]
            banned = conn.execute("SELECT COUNT(*) FROM users WHERE status = 'banned'").fetchone()[0]
            pending = conn.execute("SELECT COUNT(*) FROM users WHERE status = 'pending'").fetchone()[0]
            return {'total': total, 'active': active, 'banned': banned, 'pending': pending}
        finally:
            conn.close()

    def search_users(self, query):
        conn = self._get_conn()
        try:
            rows = conn.execute("""
                SELECT * FROM users 
                WHERE full_name LIKE ? OR phone LIKE ? OR CAST(telegram_id AS TEXT) LIKE ?
            """, (f'%{query}%', f'%{query}%', f'%{query}%')).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    # =============== TRADE METHODS ===============

    def get_open_trades_count(self, telegram_id):
        """Count trades with status 'entered' for a user"""
        conn = self._get_conn()
        try:
            row = conn.execute(
                "SELECT COUNT(*) FROM trades WHERE user_id = ? AND status = 'entered'",
                (telegram_id,)
            ).fetchone()
            return row[0] if row else 0
        finally:
            conn.close()

    def get_open_trades(self, telegram_id):
        conn = self._get_conn()
        try:
            rows = conn.execute(
                "SELECT * FROM trades WHERE user_id = ? AND status = 'entered' ORDER BY created_at DESC",
                (telegram_id,)
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def create_trade(self, telegram_id, signal_id, direction, entry_price, tp, sl, message_id=None):
        conn = self._get_conn()
        try:
            conn.execute("""
                INSERT INTO trades (user_id, signal_id, direction, entry_price, tp, sl, 
                                   status, created_at, message_id)
                VALUES (?, ?, ?, ?, ?, ?, 'entered', ?, ?)
            """, (telegram_id, signal_id, direction, entry_price, tp, sl,
                  datetime.now().isoformat(), message_id))
            conn.commit()
            return conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        finally:
            conn.close()

    def close_trade(self, trade_id, result, pnl=0):
        """Close a trade with result: 'profit', 'loss', 'skipped'"""
        conn = self._get_conn()
        try:
            conn.execute("""
                UPDATE trades SET status = 'closed', result = ?, pnl = ?, closed_at = ?
                WHERE id = ?
            """, (result, pnl, datetime.now().isoformat(), trade_id))

            # Get trade info for user stats
            trade = conn.execute("SELECT user_id FROM trades WHERE id = ?", (trade_id,)).fetchone()
            if trade:
                user_id = trade[0]
                if result == 'profit':
                    conn.execute("UPDATE users SET wins = wins + 1, total_profit = total_profit + ?, total_trades = total_trades + 1 WHERE telegram_id = ?",
                                (abs(pnl), user_id))
                elif result == 'loss':
                    conn.execute("UPDATE users SET losses = losses + 1, total_loss = total_loss + ?, total_trades = total_trades + 1 WHERE telegram_id = ?",
                                (abs(pnl), user_id))
                elif result == 'skipped':
                    conn.execute("UPDATE users SET skips = skips + 1 WHERE telegram_id = ?", (user_id,))
            conn.commit()
            return True
        finally:
            conn.close()

    def get_user_trades(self, telegram_id, limit=20):
        conn = self._get_conn()
        try:
            rows = conn.execute("""
                SELECT * FROM trades WHERE user_id = ? 
                ORDER BY created_at DESC LIMIT ?
            """, (telegram_id, limit)).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_user_stats(self, telegram_id):
        user = self.get_user(telegram_id)
        if not user:
            return None
        open_trades = self.get_open_trades_count(telegram_id)
        total = user['total_trades'] or 0
        wins = user['wins'] or 0
        losses = user['losses'] or 0
        win_rate = (wins / total * 100) if total > 0 else 0

        return {
            'total_trades': total,
            'wins': wins,
            'losses': losses,
            'skips': user['skips'] or 0,
            'win_rate': round(win_rate, 1),
            'total_profit': user['total_profit'] or 0,
            'total_loss': user['total_loss'] or 0,
            'net_pnl': (user['total_profit'] or 0) - (user['total_loss'] or 0),
            'open_trades': open_trades,
            'max_trades': 6,
        }

    # =============== SIGNAL METHODS ===============

    def save_signal(self, direction, entry_price, tp, sl, score, strength, risk_reward):
        conn = self._get_conn()
        try:
            conn.execute("""
                INSERT INTO signals (direction, entry_price, tp, sl, score, strength, 
                                    risk_reward, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
            """, (direction, entry_price, tp, sl, score, strength, risk_reward,
                  datetime.now().isoformat()))
            conn.commit()
            return conn.execute("SELECT last_insert_rowid()").fetchone()[0]
        finally:
            conn.close()

    def get_last_signal(self):
        conn = self._get_conn()
        try:
            row = conn.execute(
                "SELECT * FROM signals ORDER BY id DESC LIMIT 1"
            ).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def get_signals_today(self):
        conn = self._get_conn()
        try:
            today = datetime.now().strftime('%Y-%m-%d')
            rows = conn.execute(
                "SELECT * FROM signals WHERE created_at LIKE ? ORDER BY id DESC",
                (f'{today}%',)
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    # =============== SETTINGS METHODS ===============

    def get_setting(self, key, default=None):
        conn = self._get_conn()
        try:
            row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
            return row[0] if row else default
        finally:
            conn.close()

    def set_setting(self, key, value):
        conn = self._get_conn()
        try:
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, str(value)))
            conn.commit()
        finally:
            conn.close()

    # =============== GLOBAL STATS ===============

    def get_global_stats(self):
        conn = self._get_conn()
        try:
            user_counts = self.get_user_count()
            total_signals = conn.execute("SELECT COUNT(*) FROM signals").fetchone()[0]
            today = datetime.now().strftime('%Y-%m-%d')
            signals_today = conn.execute(
                "SELECT COUNT(*) FROM signals WHERE created_at LIKE ?", (f'{today}%',)
            ).fetchone()[0]
            total_trades = conn.execute("SELECT COUNT(*) FROM trades WHERE status = 'closed'").fetchone()[0]
            total_wins = conn.execute("SELECT COUNT(*) FROM trades WHERE result = 'profit'").fetchone()[0]
            total_losses = conn.execute("SELECT COUNT(*) FROM trades WHERE result = 'loss'").fetchone()[0]
            win_rate = (total_wins / total_trades * 100) if total_trades > 0 else 0
            open_trades = conn.execute("SELECT COUNT(*) FROM trades WHERE status = 'entered'").fetchone()[0]

            return {
                **user_counts,
                'total_signals': total_signals,
                'signals_today': signals_today,
                'total_trades': total_trades,
                'total_wins': total_wins,
                'total_losses': total_losses,
                'win_rate': round(win_rate, 1),
                'open_trades': open_trades,
            }
        finally:
            conn.close()

    def log_broadcast(self, admin_id, message, sent_count):
        conn = self._get_conn()
        try:
            conn.execute("""
                INSERT INTO broadcast_log (admin_id, message, sent_count, created_at)
                VALUES (?, ?, ?, ?)
            """, (admin_id, message, sent_count, datetime.now().isoformat()))
            conn.commit()
        finally:
            conn.close()


# Singleton
db = Database()
