"""
AIOK Trading — Telegram Bot Engine
================================
Main bot engine that connects to the AIOK Trading Flask server
and provides trading signals to Telegram users.
"""

import os
import sys
import logging
import asyncio
import threading
import time
import requests
from datetime import datetime

from telegram import Update, BotCommand
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler,
    MessageHandler, ConversationHandler, filters
)

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from telegram_bot.database import db
from telegram_bot.keyboards import signal_keyboard, main_menu_keyboard
from telegram_bot.handlers import (
    start_command, ask_name, ask_phone, cancel_reg,
    menu_command, main_menu_callback,
    get_signal_callback, get_price_callback, get_analysis_callback, get_strategy_callback,
    ai_menu_callback, ai_daily_bias_callback, ai_macro_callback, ai_gonogo_callback, ai_risk_calc_callback,
    enter_trade_callback, skip_signal_callback,
    trade_result_callback, trade_detail_callback,
    my_trades_callback, my_stats_callback,
    user_disclaimer_callback, user_subscribe_callback,
    verify_join_callback,
    help_callback, help_command, format_signal_message,
    signal_command, price_command, stats_command,
    handle_user_photo, handle_user_message,
    ASK_NAME, ASK_PHONE, get_max_trades, set_admin_id as set_handler_admin_id
)
from telegram_bot.admin import (
    set_admin_id, admin_command, admin_panel_callback,
    admin_users_callback, show_users_list,
    admin_stats_callback, admin_server_status_callback,
    admin_ban_callback, admin_unban_callback, process_ban, process_unban,
    admin_broadcast_callback, process_broadcast,
    admin_dm_callback, process_dm_id, process_dm_msg,
    admin_settings_callback, admin_signal_log_callback,
    admin_set_setting_callback, process_set_value, admin_force_signal_callback,
    admin_auto_wait_callback, admin_cancel_wait_callback,
    admin_subscription_callback, premium_command, unpremium_command,
    resetfree_command, userstatus_command,
    setpayment_command, setpay_command, sendsub_command, admin_contact_command,
    channels_command, setchannel_command,
    BAN_USER_ID, UNBAN_USER_ID, BROADCAST_MSG, DM_USER_ID, DM_MSG, SET_VALUE
)

logger = logging.getLogger('AIOK.BOT')

# Load env
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))
except ImportError:
    pass

BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
ADMIN_ID = int(os.getenv('ADMIN_TELEGRAM_ID', '0'))
SERVER_URL = 'http://localhost:5000'
SIGNAL_CHECK_INTERVAL = 15  # seconds


class AIOKTelegramBot:
    """Main Telegram Bot class"""

    def __init__(self):
        self.app = None
        self.running = False
        self.last_signal_id = None
        self._loop = None
        self._thread = None

    def build(self):
        """Build the bot application with all handlers"""
        if not BOT_TOKEN:
            logger.error("[BOT] No TELEGRAM_BOT_TOKEN found!")
            return False

        set_admin_id(ADMIN_ID)
        set_handler_admin_id(ADMIN_ID)
        logger.info("[BOT] Admin ID: %s", ADMIN_ID)

        self.app = Application.builder().token(BOT_TOKEN).build()

        # Registration conversation
        reg_conv = ConversationHandler(
            entry_points=[CommandHandler('start', start_command)],
            states={
                ASK_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, ask_name)],
                ASK_PHONE: [
                    MessageHandler(filters.CONTACT, ask_phone),
                    MessageHandler(filters.TEXT & ~filters.COMMAND, ask_phone),
                ],
            },
            fallbacks=[CommandHandler('cancel', cancel_reg)],
            allow_reentry=True,
        )

        # Admin ban conversation
        ban_conv = ConversationHandler(
            entry_points=[CallbackQueryHandler(admin_ban_callback, pattern='^admin_ban$')],
            states={BAN_USER_ID: [MessageHandler(filters.TEXT & ~filters.COMMAND, process_ban)]},
            fallbacks=[CommandHandler('cancel', cancel_reg)],
            per_message=False, per_chat=True,
        )

        # Admin unban conversation
        unban_conv = ConversationHandler(
            entry_points=[CallbackQueryHandler(admin_unban_callback, pattern='^admin_unban$')],
            states={UNBAN_USER_ID: [MessageHandler(filters.TEXT & ~filters.COMMAND, process_unban)]},
            fallbacks=[CommandHandler('cancel', cancel_reg)],
            per_message=False, per_chat=True,
        )

        # Admin broadcast conversation
        broadcast_conv = ConversationHandler(
            entry_points=[CallbackQueryHandler(admin_broadcast_callback, pattern='^admin_broadcast$')],
            states={BROADCAST_MSG: [MessageHandler(filters.TEXT & ~filters.COMMAND, process_broadcast)]},
            fallbacks=[CommandHandler('cancel', cancel_reg)],
            per_message=False, per_chat=True,
        )

        # Admin DM conversation
        dm_conv = ConversationHandler(
            entry_points=[CallbackQueryHandler(admin_dm_callback, pattern='^admin_dm$')],
            states={
                DM_USER_ID: [MessageHandler(filters.TEXT & ~filters.COMMAND, process_dm_id)],
                DM_MSG: [MessageHandler(filters.TEXT & ~filters.COMMAND, process_dm_msg)],
            },
            fallbacks=[CommandHandler('cancel', cancel_reg)],
            per_message=False, per_chat=True,
        )

        # Add handlers (order matters!)
        self.app.add_handler(reg_conv)
        self.app.add_handler(ban_conv)
        self.app.add_handler(unban_conv)
        self.app.add_handler(broadcast_conv)
        self.app.add_handler(dm_conv)

        # Commands
        self.app.add_handler(CommandHandler('menu', menu_command))
        self.app.add_handler(CommandHandler('admin', admin_command))
        self.app.add_handler(CommandHandler('help', help_command))
        self.app.add_handler(CommandHandler('signal', signal_command))
        self.app.add_handler(CommandHandler('price', price_command))
        self.app.add_handler(CommandHandler('stats', stats_command))
        self.app.add_handler(CommandHandler('premium', premium_command))
        self.app.add_handler(CommandHandler('unpremium', unpremium_command))
        self.app.add_handler(CommandHandler('resetfree', resetfree_command))
        self.app.add_handler(CommandHandler('userstatus', userstatus_command))
        self.app.add_handler(CommandHandler('setpayment', setpayment_command))
        self.app.add_handler(CommandHandler('setpay', setpay_command))
        self.app.add_handler(CommandHandler('sendsub', sendsub_command))
        self.app.add_handler(CommandHandler('subscribe', admin_contact_command))
        self.app.add_handler(CommandHandler('admin_contact', admin_contact_command))
        self.app.add_handler(CommandHandler('channels', channels_command))
        self.app.add_handler(CommandHandler('setchannel', setchannel_command))

        # Callback queries - User
        self.app.add_handler(CallbackQueryHandler(main_menu_callback, pattern='^main_menu$'))
        self.app.add_handler(CallbackQueryHandler(get_signal_callback, pattern='^get_signal$'))
        self.app.add_handler(CallbackQueryHandler(get_price_callback, pattern='^get_price$'))
        self.app.add_handler(CallbackQueryHandler(get_analysis_callback, pattern='^get_analysis$'))
        self.app.add_handler(CallbackQueryHandler(get_strategy_callback, pattern='^get_strategy$'))
        self.app.add_handler(CallbackQueryHandler(my_trades_callback, pattern='^my_trades$'))
        self.app.add_handler(CallbackQueryHandler(my_stats_callback, pattern='^my_stats$'))
        self.app.add_handler(CallbackQueryHandler(help_callback, pattern='^help$'))
        self.app.add_handler(CallbackQueryHandler(user_disclaimer_callback, pattern='^user_disclaimer$'))
        self.app.add_handler(CallbackQueryHandler(user_subscribe_callback, pattern='^user_subscribe$'))
        self.app.add_handler(CallbackQueryHandler(verify_join_callback, pattern='^verify_join$'))

        # AI Assistant
        self.app.add_handler(CallbackQueryHandler(ai_menu_callback, pattern='^ai_menu$'))
        self.app.add_handler(CallbackQueryHandler(ai_daily_bias_callback, pattern='^ai_daily_bias$'))
        self.app.add_handler(CallbackQueryHandler(ai_macro_callback, pattern='^ai_macro$'))
        self.app.add_handler(CallbackQueryHandler(ai_gonogo_callback, pattern='^ai_gonogo$'))
        self.app.add_handler(CallbackQueryHandler(ai_risk_calc_callback, pattern='^ai_risk_calc$'))

        # Trade actions
        self.app.add_handler(CallbackQueryHandler(enter_trade_callback, pattern=r'^enter_trade:'))
        self.app.add_handler(CallbackQueryHandler(skip_signal_callback, pattern=r'^skip_signal:'))
        self.app.add_handler(CallbackQueryHandler(trade_result_callback, pattern=r'^trade_(profit|loss|skip):'))
        self.app.add_handler(CallbackQueryHandler(trade_detail_callback, pattern=r'^trade_detail:'))

        # Admin callbacks
        self.app.add_handler(CallbackQueryHandler(admin_panel_callback, pattern='^admin_panel$'))
        self.app.add_handler(CallbackQueryHandler(admin_users_callback, pattern='^admin_users$'))
        self.app.add_handler(CallbackQueryHandler(show_users_list, pattern=r'^admin_(active|banned|pending|all)_users$'))
        self.app.add_handler(CallbackQueryHandler(admin_stats_callback, pattern='^admin_stats$'))
        self.app.add_handler(CallbackQueryHandler(admin_server_status_callback, pattern='^admin_server_status$'))
        self.app.add_handler(CallbackQueryHandler(admin_signal_log_callback, pattern='^admin_signal_log$'))
        self.app.add_handler(CallbackQueryHandler(admin_force_signal_callback, pattern='^admin_force_signal$'))
        self.app.add_handler(CallbackQueryHandler(admin_auto_wait_callback, pattern='^admin_auto_wait$'))
        self.app.add_handler(CallbackQueryHandler(admin_cancel_wait_callback, pattern='^admin_cancel_wait$'))
        self.app.add_handler(CallbackQueryHandler(admin_subscription_callback, pattern='^admin_subscriptions$'))
        self.app.add_handler(CallbackQueryHandler(admin_panel_callback, pattern='^admin_refresh$'))

        # Settings conversation (must be before general admin_settings handler)
        settings_conv = ConversationHandler(
            entry_points=[
                CallbackQueryHandler(admin_set_setting_callback, pattern=r'^set_(max_trades|min_score|max_signals|interval)$'),
            ],
            states={
                SET_VALUE: [MessageHandler(filters.TEXT & ~filters.COMMAND, process_set_value)],
            },
            fallbacks=[CommandHandler('cancel', cancel_reg)],
            per_message=False, per_chat=True,
        )
        self.app.add_handler(settings_conv)
        self.app.add_handler(CallbackQueryHandler(admin_settings_callback, pattern='^admin_settings$'))

        # Photo handler (receipt forwarding) — must be after all other handlers
        self.app.add_handler(MessageHandler(filters.PHOTO, handle_user_photo))

        # Fallback text message handler (support) — MUST BE LAST
        self.app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_user_message))

        logger.info("[BOT] Handlers registered successfully")
        return True

    async def _set_commands(self):
        """Set bot commands menu"""
        commands = [
            BotCommand('start', 'التسجيل / البدء'),
            BotCommand('menu', 'القائمة الرئيسية'),
            BotCommand('signal', 'آخر توصية'),
            BotCommand('price', 'السعر الحالي'),
            BotCommand('stats', 'إحصائياتي'),
            BotCommand('help', 'المساعدة'),
        ]
        await self.app.bot.set_my_commands(commands)

    async def _signal_checker(self):
        """Background task: check for new signals and broadcast them"""
        logger.info("[BOT] Signal checker started")
        self._sent_signal_ids = set()  # Track ALL sent signals permanently

        # Start cloud signal engine
        try:
            from telegram_bot.cloud_signal_engine import cloud_signal_engine
            cloud_signal_engine.start()
            logger.info("[BOT] ☁️ Cloud signal engine started")
        except Exception as e:
            logger.warning("[BOT] Cloud engine unavailable: %s", e)

        while self.running:
            sig = None
            # Try MT5 signal generator first
            try:
                from signal_generator import signal_generator
                sig = signal_generator.active_signal
            except Exception:
                pass

            # Fallback to cloud
            if not sig or not sig.get('is_tradeable'):
                try:
                    from telegram_bot.cloud_signal_engine import cloud_signal_engine
                    sig = cloud_signal_engine.active_signal
                except Exception:
                    pass

            if sig and sig.get('is_tradeable'):
                sig_id = sig.get('signal_id', '')
                # Only broadcast if we NEVER sent this signal_id before
                if sig_id and sig_id not in self._sent_signal_ids:
                    self._sent_signal_ids.add(sig_id)
                    self.last_signal_id = sig_id
                    # Mark as sent so cloud engine won't flag it again
                    sig['is_new'] = False
                    await self._broadcast_signal(sig)

            await asyncio.sleep(SIGNAL_CHECK_INTERVAL)

    async def _broadcast_signal(self, sig):
        """Send a new signal to all active users"""
        direction = sig.get('direction', '')
        entry = sig.get('entry_price', sig.get('price', 0))
        sl = sig.get('sl', 0)
        score = sig.get('score', 0)
        strength = sig.get('strength', '')

        # Calculate guaranteed close TP (1x ATR)
        atr_info = sig.get('indicators', {}).get('atr', {})
        atr_val = atr_info.get('value', 5.0) if isinstance(atr_info, dict) else 5.0
        if direction == 'buy':
            tp = round(entry + atr_val * 1.0, 2)
        else:
            tp = round(entry - atr_val * 1.0, 2)

        rr_text = sig.get('risk_reward', 'N/A')

        # Save signal to DB
        sig_db_id = db.save_signal(direction, entry, tp, sl, score, strength, rr_text)

        # Format message
        text = format_signal_message(sig)

        # Send to all active users
        users = db.get_active_users()
        sent = 0
        for user in users:
            tid = user['telegram_id']

            # === SUBSCRIPTION CHECK ===
            if tid != ADMIN_ID and not db.can_receive_signal(tid):
                # Free signals exhausted — send subscription prompt
                try:
                    await self.app.bot.send_message(
                        tid,
                        "🔔 *توصية جديدة متاحة!*\n\n"
                        "⚠️ لقد استنفدت توصياتك المجانية (5/5)\n\n"
                        "💎 *اشترك في Premium* للحصول على:\n"
                        "✅ توصيات غير محدودة\n"
                        "✅ تحليل AI يومي\n"
                        "✅ إشعارات فورية\n\n"
                        "📩 تواصل مع المشرف للاشتراك:\n"
                        f"👤 @{(await self.app.bot.get_chat(ADMIN_ID)).username or 'Admin'}",
                        parse_mode='Markdown'
                    )
                except Exception:
                    pass
                continue

            try:
                await self.app.bot.send_message(
                    tid, text, parse_mode='Markdown',
                    reply_markup=signal_keyboard(sig.get('signal_id', sig_db_id))
                )
                sent += 1
                # Decrease free signal count (only for non-premium, non-admin)
                if tid != ADMIN_ID and not db.is_premium_user(tid):
                    db.use_free_signal(tid)
                    free_left = db.get_free_signals_left(tid)
                    if free_left > 0 and free_left <= 2:
                        await self.app.bot.send_message(
                            tid,
                            f"⚠️ _تبقى لك {free_left} توصيات مجانية فقط!_\n"
                            "💎 _اشترك للحصول على توصيات غير محدودة_",
                            parse_mode='Markdown'
                        )
            except Exception as e:
                logger.debug("[BOT] Failed to send signal to %s: %s", tid, e)

        logger.info("[BOT] Signal broadcasted to %d/%d users", sent, len(users))

        # Notify admin
        if ADMIN_ID:
            try:
                await self.app.bot.send_message(
                    ADMIN_ID,
                    f"📤 *توصية تم إرسالها*\n\n"
                    f"الاتجاه: {direction.upper()}\n"
                    f"Entry: {entry:.2f}\n"
                    f"تم الإرسال لـ: {sent}/{len(users)} مستخدم",
                    parse_mode='Markdown'
                )
            except Exception:
                pass

    async def run_async(self):
        """Run the bot (async)"""
        if not self.build():
            return

        self.running = True
        await self.app.initialize()
        await self.app.start()
        await self._set_commands()

        # Start polling
        await self.app.updater.start_polling(drop_pending_updates=True)
        logger.info("[BOT] ✅ Telegram Bot started! @%s", (await self.app.bot.get_me()).username)

        # Notify admin
        if ADMIN_ID:
            try:
                await self.app.bot.send_message(
                    ADMIN_ID,
                    "🤖 *AIOK Trading Bot Started!*\n\n✅ البوت يعمل الآن.\nاستخدم /admin للوحة التحكم.",
                    parse_mode='Markdown'
                )
            except Exception:
                pass

        # Run signal checker
        await self._signal_checker()

    def start_in_thread(self):
        """Start bot in a background thread"""
        def _run():
            self._loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._loop)
            try:
                self._loop.run_until_complete(self.run_async())
            except Exception as e:
                logger.error("[BOT] Bot error: %s", e)
            finally:
                self._loop.close()

        self._thread = threading.Thread(target=_run, daemon=True, name='TelegramBot')
        self._thread.start()
        logger.info("[BOT] Bot thread started")

    def stop(self):
        """Stop the bot"""
        self.running = False
        if self._loop and self.app:
            async def _stop():
                await self.app.updater.stop()
                await self.app.stop()
                await self.app.shutdown()
            asyncio.run_coroutine_threadsafe(_stop(), self._loop)
        logger.info("[BOT] Bot stopped")


# Singleton
telegram_bot = AIOKTelegramBot()


# ============ STANDALONE MODE ============
if __name__ == '__main__':
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s'
    )
    print("\n" + "=" * 50)
    print("  AIOK Trading — Telegram Bot (Standalone)")
    print("=" * 50 + "\n")
    asyncio.run(telegram_bot.run_async())
