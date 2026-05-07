"""
AIOK Trading — Admin Panel Handlers
=================================
Full admin control panel for managing the Telegram bot.
"""

import logging
from telegram import Update
from telegram.ext import ContextTypes, ConversationHandler
from telegram_bot.database import db
from telegram_bot.keyboards import (
    admin_menu_keyboard, admin_users_keyboard, admin_settings_keyboard,
    back_to_admin_keyboard, confirm_action_keyboard
)

logger = logging.getLogger('AIOK.ADMIN')

# Conversation states
BROADCAST_MSG, BAN_USER_ID, UNBAN_USER_ID, DM_USER_ID, DM_MSG = range(5)
MANUAL_DIRECTION, MANUAL_ENTRY, MANUAL_TP, MANUAL_SL = range(5, 9)
SET_VALUE = 9

ADMIN_ID = None  # Set from bot.py


def set_admin_id(aid):
    global ADMIN_ID
    ADMIN_ID = aid


def is_admin(tid):
    return tid == ADMIN_ID


# =============== ADMIN PANEL ===============

async def admin_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    tid = update.effective_user.id
    if not is_admin(tid):
        await update.message.reply_text("🚫 غير مصرح لك.")
        return

    stats = db.get_global_stats()
    text = (
        "🔧 *لوحة تحكم المشرف*\n"
        "━━━━━━━━━━━━━━━━━\n\n"
        f"👥 المستخدمين: *{stats['active']}* نشط | *{stats['banned']}* محظور | *{stats['pending']}* معلق\n"
        f"📊 التوصيات اليوم: *{stats['signals_today']}*\n"
        f"📈 إجمالي الصفقات: *{stats['total_trades']}*\n"
        f"💰 ربح: *{stats['total_wins']}* | ❌ خسارة: *{stats['total_losses']}*\n"
        f"📈 نسبة النجاح: *{stats['win_rate']}%*\n"
        f"🔓 صفقات مفتوحة: *{stats['open_trades']}*"
    )
    await update.message.reply_text(text, parse_mode='Markdown', reply_markup=admin_menu_keyboard())


async def admin_panel_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not is_admin(query.from_user.id):
        await query.answer("🚫 غير مصرح", show_alert=True)
        return
    await query.answer()

    stats = db.get_global_stats()
    text = (
        "🔧 *لوحة تحكم المشرف*\n"
        "━━━━━━━━━━━━━━━━━\n\n"
        f"👥 المستخدمين: *{stats['active']}* نشط | *{stats['banned']}* محظور | *{stats['pending']}* معلق\n"
        f"📊 التوصيات اليوم: *{stats['signals_today']}*\n"
        f"📈 إجمالي الصفقات: *{stats['total_trades']}*\n"
        f"💰 ربح: *{stats['total_wins']}* | ❌ خسارة: *{stats['total_losses']}*\n"
        f"📈 نسبة النجاح: *{stats['win_rate']}%*\n"
        f"🔓 صفقات مفتوحة: *{stats['open_trades']}*"
    )
    await query.edit_message_text(text, parse_mode='Markdown', reply_markup=admin_menu_keyboard())


# =============== SERVER STATUS ===============

async def admin_server_status_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not is_admin(query.from_user.id):
        return
    await query.answer()

    import time
    import requests
    from datetime import datetime

    # Check MT5
    mt5_status = "❌ غير متصل"
    mt5_price = "N/A"
    mt5_balance = "N/A"
    try:
        resp = requests.get('http://localhost:5000/api/price', timeout=2)
        if resp.status_code == 200:
            data = resp.json()
            mt5_price = f"${data.get('bid', 0):.2f}"
            mt5_status = "✅ متصل"
        resp2 = requests.get('http://localhost:5000/api/account', timeout=2)
        if resp2.status_code == 200:
            acc = resp2.json()
            mt5_balance = f"${acc.get('balance', 0):.2f}"
    except Exception:
        mt5_status = "❌ السيرفر مطفي"

    # Check Cloud
    cloud_status = "❌"
    try:
        from telegram_bot.cloud_data import cloud_data
        cp = cloud_data.get_current_price()
        if cp and cp.get('price', 0) > 1000:
            cloud_status = f"✅ ({cp['source']} ${cp['price']:.2f})"
    except Exception:
        pass

    # Check Cloud Signal Engine
    engine_status = "❌"
    try:
        from telegram_bot.cloud_signal_engine import cloud_signal_engine
        engine_status = f"{'✅ يعمل' if cloud_signal_engine._running else '❌ متوقف'} | {cloud_signal_engine.state}"
    except Exception:
        pass

    # Bot uptime
    uptime = "N/A"
    try:
        import psutil
        p = psutil.Process()
        elapsed = time.time() - p.create_time()
        hours = int(elapsed // 3600)
        mins = int((elapsed % 3600) // 60)
        uptime = f"{hours}h {mins}m"
    except Exception:
        uptime = "غير متاح"

    text = (
        "🖥️ *حالة النظام — AIOK Trading*\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        f"🔌 *MT5 Backend:* {mt5_status}\n"
        f"💰 *السعر:* {mt5_price}\n"
        f"💵 *الرصيد:* {mt5_balance}\n\n"
        f"☁️ *Cloud Data:* {cloud_status}\n"
        f"🤖 *Signal Engine:* {engine_status}\n"
        f"⏱️ *Uptime:* {uptime}\n\n"
        f"🕐 *الوقت:* {datetime.now().strftime('%H:%M:%S')}\n\n"
        "💡 _البوت يعمل بالسحابة تلقائياً إذا انقطع MT5_"
    )
    await query.edit_message_text(text, parse_mode='Markdown', reply_markup=back_to_admin_keyboard())

# =============== USER MANAGEMENT ===============

async def admin_users_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not is_admin(query.from_user.id):
        return
    await query.answer()
    await query.edit_message_text("👥 *إدارة المستخدمين*\n\nاختر الفئة:", parse_mode='Markdown',
                                   reply_markup=admin_users_keyboard())


async def show_users_list(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not is_admin(query.from_user.id):
        return
    await query.answer()

    filter_type = query.data.replace('admin_', '').replace('_users', '')
    if filter_type == 'active':
        users = db.get_active_users()
        title = "✅ المستخدمين النشطين"
    elif filter_type == 'banned':
        users = db.get_banned_users()
        title = "🚫 المستخدمين المحظورين"
    elif filter_type == 'all':
        users = db.get_all_users()
        title = "📋 جميع المستخدمين"
    else:
        users = [u for u in db.get_all_users() if u['status'] == 'pending']
        title = "⏳ في انتظار التسجيل"

    text = f"*{title}* ({len(users)})\n━━━━━━━━━━━━━━━━━\n\n"
    if not users:
        text += "لا يوجد مستخدمين في هذه الفئة."
    else:
        for u in users[:30]:
            status_icon = {'active': '✅', 'banned': '🚫', 'pending': '⏳'}.get(u['status'], '❓')
            name = u['full_name'] or 'غير مسجل'
            phone = u['phone'] or 'N/A'
            text += f"{status_icon} *{name}*\n"
            text += f"   📱 {phone} | 🆔 `{u['telegram_id']}`\n"
            text += f"   📊 صفقات: {u['total_trades']} | ✅ {u['wins']} | ❌ {u['losses']}\n\n"

    await query.edit_message_text(text, parse_mode='Markdown', reply_markup=back_to_admin_keyboard())


# =============== STATS ===============

async def admin_stats_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not is_admin(query.from_user.id):
        return
    await query.answer()

    stats = db.get_global_stats()
    server_status = "❌ غير متصل"
    try:
        import sys, os
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from mt5_connector import connector
        from ml_engine import ml_engine
        mt5 = "✅" if connector.connected else "❌"
        ml = f"✅ ({ml_engine.accuracy:.0f}%)" if ml_engine.is_trained else "❌"
        server_status = f"MT5: {mt5} | ML: {ml}"
    except Exception:
        pass

    text = (
        "📊 *إحصائيات شاملة*\n"
        "━━━━━━━━━━━━━━━━━\n\n"
        f"🖥️ السيرفر: {server_status}\n\n"
        f"👥 إجمالي المستخدمين: *{stats['total']}*\n"
        f"  ✅ نشط: *{stats['active']}*\n"
        f"  🚫 محظور: *{stats['banned']}*\n"
        f"  ⏳ معلق: *{stats['pending']}*\n\n"
        f"📊 التوصيات اليوم: *{stats['signals_today']}*\n"
        f"📊 إجمالي التوصيات: *{stats['total_signals']}*\n\n"
        f"📈 إجمالي الصفقات: *{stats['total_trades']}*\n"
        f"  💰 ربح: *{stats['total_wins']}*\n"
        f"  ❌ خسارة: *{stats['total_losses']}*\n"
        f"  📈 نسبة النجاح: *{stats['win_rate']}%*\n"
        f"  🔓 مفتوحة: *{stats['open_trades']}*"
    )
    await query.edit_message_text(text, parse_mode='Markdown', reply_markup=back_to_admin_keyboard())


# =============== BAN / UNBAN ===============

async def admin_ban_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not is_admin(query.from_user.id):
        return
    await query.answer()
    await query.edit_message_text(
        "🚫 *حظر مستخدم*\n\nأرسل رقم Telegram ID للمستخدم المراد حظره:",
        parse_mode='Markdown'
    )
    context.user_data['admin_action'] = 'ban'
    return BAN_USER_ID


async def admin_unban_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not is_admin(query.from_user.id):
        return
    await query.answer()

    banned = db.get_banned_users()
    if not banned:
        await query.edit_message_text("لا يوجد مستخدمين محظورين.", reply_markup=back_to_admin_keyboard())
        return ConversationHandler.END

    text = "✅ *إلغاء حظر*\n\nالمحظورين:\n"
    for u in banned:
        text += f"  🚫 {u['full_name'] or 'N/A'} — `{u['telegram_id']}`\n"
    text += "\nأرسل Telegram ID:"

    await query.edit_message_text(text, parse_mode='Markdown')
    context.user_data['admin_action'] = 'unban'
    return UNBAN_USER_ID


async def process_ban(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_admin(update.effective_user.id):
        return ConversationHandler.END

    try:
        target_id = int(update.message.text.strip())
    except ValueError:
        await update.message.reply_text("❌ أرسل رقم صحيح.")
        return BAN_USER_ID

    user = db.get_user(target_id)
    if not user:
        await update.message.reply_text("❌ المستخدم غير موجود.", reply_markup=back_to_admin_keyboard())
        return ConversationHandler.END

    db.ban_user(target_id)
    await update.message.reply_text(
        f"✅ تم حظر *{user['full_name']}* (`{target_id}`)",
        parse_mode='Markdown'
    )
    # Notify the banned user
    try:
        await context.bot.send_message(target_id, "🚫 تم حظرك من استخدام البوت.")
    except Exception:
        pass

    logger.info("[ADMIN] Banned user %s (%s)", user['full_name'], target_id)
    return ConversationHandler.END


async def process_unban(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_admin(update.effective_user.id):
        return ConversationHandler.END

    try:
        target_id = int(update.message.text.strip())
    except ValueError:
        await update.message.reply_text("❌ أرسل رقم صحيح.")
        return UNBAN_USER_ID

    user = db.get_user(target_id)
    if not user:
        await update.message.reply_text("❌ المستخدم غير موجود.")
        return ConversationHandler.END

    db.unban_user(target_id)
    await update.message.reply_text(f"✅ تم إلغاء حظر *{user['full_name']}*", parse_mode='Markdown')
    try:
        await context.bot.send_message(target_id, "✅ تم إلغاء حظرك! يمكنك استخدام البوت مجدداً.")
    except Exception:
        pass
    return ConversationHandler.END


# =============== BROADCAST ===============

async def admin_broadcast_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not is_admin(query.from_user.id):
        return
    await query.answer()
    count = db.get_user_count()
    await query.edit_message_text(
        f"📢 *إرسال رسالة جماعية*\n\nسيتم الإرسال لـ *{count['active']}* مستخدم نشط.\n\nأرسل الرسالة:",
        parse_mode='Markdown'
    )
    return BROADCAST_MSG


async def process_broadcast(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_admin(update.effective_user.id):
        return ConversationHandler.END

    msg = update.message.text
    users = db.get_active_users()
    sent = 0
    for u in users:
        try:
            await context.bot.send_message(u['telegram_id'], f"📢 *رسالة من الإدارة:*\n\n{msg}", parse_mode='Markdown')
            sent += 1
        except Exception:
            pass

    db.log_broadcast(update.effective_user.id, msg, sent)
    await update.message.reply_text(f"✅ تم إرسال الرسالة لـ *{sent}/{len(users)}* مستخدم.", parse_mode='Markdown')
    logger.info("[ADMIN] Broadcast sent to %d users", sent)
    return ConversationHandler.END


# =============== DM ===============

async def admin_dm_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not is_admin(query.from_user.id):
        return
    await query.answer()
    await query.edit_message_text("💬 *رسالة خاصة*\n\nأرسل Telegram ID للمستخدم:", parse_mode='Markdown')
    return DM_USER_ID


async def process_dm_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        target_id = int(update.message.text.strip())
    except ValueError:
        await update.message.reply_text("❌ أرسل رقم صحيح.")
        return DM_USER_ID

    context.user_data['dm_target'] = target_id
    user = db.get_user(target_id)
    name = user['full_name'] if user else 'غير معروف'
    await update.message.reply_text(f"💬 إرسال رسالة لـ *{name}* (`{target_id}`)\n\nاكتب الرسالة:", parse_mode='Markdown')
    return DM_MSG


async def process_dm_msg(update: Update, context: ContextTypes.DEFAULT_TYPE):
    target_id = context.user_data.get('dm_target')
    msg = update.message.text
    try:
        await context.bot.send_message(target_id, f"💬 *رسالة من الإدارة:*\n\n{msg}", parse_mode='Markdown')
        await update.message.reply_text("✅ تم الإرسال!")
    except Exception as e:
        await update.message.reply_text(f"❌ فشل الإرسال: {e}")
    return ConversationHandler.END


# =============== SETTINGS ===============

async def admin_settings_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not is_admin(query.from_user.id):
        return
    await query.answer()

    # Show current values
    max_trades = db.get_setting('max_open_trades', '6')
    min_score = db.get_setting('min_score', '6')
    max_signals = db.get_setting('max_signals_daily', '20')
    scan_interval = db.get_setting('scan_interval', '120')

    text = (
        "⚙️ *إعدادات البوت*\n"
        "━━━━━━━━━━━━━━━━━\n\n"
        f"📈 حد الصفقات المفتوحة: *{max_trades}*\n"
        f"🎯 أقل Score للتوصية: *{min_score}*/10\n"
        f"📊 حد التوصيات اليومي: *{max_signals}*\n"
        f"⏰ فاصل التحليل: *{scan_interval}* ثانية\n\n"
        "اختر الإعداد لتغييره:"
    )
    await query.edit_message_text(text, parse_mode='Markdown',
                                   reply_markup=admin_settings_keyboard())


async def admin_set_setting_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle settings button clicks"""
    query = update.callback_query
    if not is_admin(query.from_user.id):
        return
    await query.answer()

    setting_map = {
        'set_max_trades': ('max_open_trades', 'حد الصفقات المفتوحة', '1-50'),
        'set_min_score': ('min_score', 'أقل Score للتوصية', '1-10'),
        'set_max_signals': ('max_signals_daily', 'حد التوصيات اليومي', '1-100'),
        'set_interval': ('scan_interval', 'فاصل التحليل (ثانية)', '30-600'),
    }

    action = query.data
    if action not in setting_map:
        return

    key, label, range_text = setting_map[action]
    current = db.get_setting(key, 'غير محدد')
    context.user_data['setting_key'] = key
    context.user_data['setting_label'] = label

    await query.edit_message_text(
        f"⚙️ *تعديل: {label}*\n\n"
        f"القيمة الحالية: *{current}*\n"
        f"المدى المسموح: `{range_text}`\n\n"
        f"أرسل القيمة الجديدة:",
        parse_mode='Markdown'
    )
    return SET_VALUE


async def process_set_value(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Process the new setting value"""
    if not is_admin(update.effective_user.id):
        return ConversationHandler.END

    key = context.user_data.get('setting_key')
    label = context.user_data.get('setting_label', key)

    try:
        value = int(update.message.text.strip())
    except ValueError:
        await update.message.reply_text("❌ أرسل رقم صحيح.")
        return SET_VALUE

    # Validate ranges
    ranges = {
        'max_open_trades': (1, 50),
        'min_score': (1, 10),
        'max_signals_daily': (1, 100),
        'scan_interval': (30, 600),
    }
    min_val, max_val = ranges.get(key, (1, 999))
    if value < min_val or value > max_val:
        await update.message.reply_text(f"❌ القيمة يجب أن تكون بين {min_val} و {max_val}.")
        return SET_VALUE

    db.set_setting(key, str(value))
    logger.info("[ADMIN] Setting changed: %s = %s", key, value)
    await update.message.reply_text(
        f"✅ *تم التحديث*\n\n"
        f"⚙️ {label}: *{value}*",
        parse_mode='Markdown',
        reply_markup=back_to_admin_keyboard()
    )
    return ConversationHandler.END


# =============== SIGNAL LOG ===============

async def admin_signal_log_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not is_admin(query.from_user.id):
        return
    await query.answer()

    signals = db.get_signals_today()
    text = "📋 *سجل التوصيات اليوم*\n━━━━━━━━━━━━━━━━━\n\n"
    if not signals:
        text += "لا توجد توصيات اليوم."
    else:
        for s in signals[:15]:
            d = "🟢" if s['direction'] == 'buy' else "🔴"
            text += f"{d} {s['direction'].upper()} @ {s['entry_price']:.2f} | Score: {s['score']}\n"
            text += f"   TP: {s['tp']:.2f} | SL: {s['sl']:.2f} | {s['created_at'][11:16]}\n\n"

    await query.edit_message_text(text, parse_mode='Markdown', reply_markup=back_to_admin_keyboard())


# =============== FORCE SEND SIGNAL ===============

# Track auto-wait state
_admin_auto_wait = False
_admin_auto_wait_chat_id = None
_admin_auto_wait_msg_id = None

async def admin_force_signal_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin forces a scan + IMMEDIATE broadcast to ALL users"""
    global _admin_auto_wait
    query = update.callback_query
    if not is_admin(query.from_user.id):
        return
    await query.answer("⏳ جاري المسح والإرسال...")

    try:
        from telegram_bot.cloud_signal_engine import cloud_signal_engine
        from telegram_bot.handlers import format_signal_message
        from telegram_bot.keyboards import signal_keyboard

        # Force a fresh scan (bypass cooldown for admin)
        old_dir = cloud_signal_engine.last_sent_direction
        old_time = cloud_signal_engine.last_sent_time
        cloud_signal_engine.last_sent_direction = None
        cloud_signal_engine.last_sent_time = 0
        cloud_signal_engine._cache_time = 0
        sig = cloud_signal_engine.scan()

        if sig and sig.get('is_tradeable'):
            _admin_auto_wait = False
            sig['is_new'] = True
            cloud_signal_engine.active_signal = sig

            score = sig.get('score', 0)
            direction = sig.get('direction', '').upper()
            entry = sig.get('entry_price', 0)
            sig_id = sig.get('signal_id', 'force')

            db.save_signal(
                sig.get('direction', ''), entry,
                sig.get('tp1', 0), sig.get('sl', 0),
                score, sig.get('strength', ''),
                sig.get('risk_reward', '')
            )

            text = format_signal_message(sig)
            users = db.get_active_users()
            sent = 0
            for user in users:
                tid = user['telegram_id']
                try:
                    await context.bot.send_message(
                        tid, text, parse_mode='Markdown',
                        reply_markup=signal_keyboard(sig_id)
                    )
                    sent += 1
                except Exception:
                    pass

            await query.edit_message_text(
                "📤 *تم إرسال التوصية فوراً!*\n"
                "━━━━━━━━━━━━━━━━━━━━\n\n"
                f"📊 {direction} @ `{entry:.2f}`\n"
                f"🎯 Score: {score}/10\n"
                f"✅ TP1: `{sig.get('tp1', 0):.2f}`\n"
                f"🏆 TP2: `{sig.get('tp2', 0):.2f}`\n"
                f"❌ SL: `{sig.get('sl', 0):.2f}`\n\n"
                f"✅ *تم الإرسال لـ {sent}/{len(users)} مستخدم!*",
                parse_mode='Markdown',
                reply_markup=back_to_admin_keyboard()
            )
        else:
            cloud_signal_engine.last_sent_direction = old_dir
            cloud_signal_engine.last_sent_time = old_time
            state = cloud_signal_engine.state

            from telegram import InlineKeyboardButton, InlineKeyboardMarkup
            keyboard = InlineKeyboardMarkup([
                [InlineKeyboardButton("🔄 انتظر التوصية التالية تلقائياً", callback_data="admin_auto_wait")],
                [InlineKeyboardButton("🔙 رجوع للوحة التحكم", callback_data="admin_panel")],
            ])
            await query.edit_message_text(
                "📤 *إرسال توصية فوري*\n"
                "━━━━━━━━━━━━━━━━━━━━\n\n"
                "❌ لا توجد توصية تمرر الفلاتر حالياً\n\n"
                f"🤖 حالة المحرك: `{state}`\n\n"
                "💡 _اضغط الزر أدناه للانتظار التلقائي_\n"
                "📲 _سيتم إرسال التوصية فوراً عند توفرها!_",
                parse_mode='Markdown',
                reply_markup=keyboard
            )
    except Exception as e:
        await query.edit_message_text(
            f"⚠️ خطأ: `{e}`",
            parse_mode='Markdown',
            reply_markup=back_to_admin_keyboard()
        )


async def admin_auto_wait_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Admin enables auto-wait — bot broadcasts automatically when signal arrives"""
    global _admin_auto_wait, _admin_auto_wait_chat_id, _admin_auto_wait_msg_id
    query = update.callback_query
    if not is_admin(query.from_user.id):
        return
    await query.answer("🔄 وضع الانتظار مفعّل!")

    _admin_auto_wait = True
    _admin_auto_wait_chat_id = query.message.chat_id
    _admin_auto_wait_msg_id = query.message.message_id

    from telegram import InlineKeyboardButton, InlineKeyboardMarkup
    cancel_kb = InlineKeyboardMarkup([
        [InlineKeyboardButton("⛔ إلغاء الانتظار", callback_data="admin_cancel_wait")],
    ])

    await query.edit_message_text(
        "🔄 *وضع الانتظار التلقائي*\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "⏳ *جاري الانتظار...*\n\n"
        "📡 المحرك يفحص كل دقيقتين\n"
        "📲 سيتم إرسال التوصية لجميع المستخدمين\n"
        "     فور توفرها تلقائياً!\n\n"
        "🟢 _الانتظار نشط — لا تحتاج فعل شيء_",
        parse_mode='Markdown',
        reply_markup=cancel_kb
    )

    import asyncio

    async def _wait_for_signal():
        global _admin_auto_wait
        try:
            from telegram_bot.cloud_signal_engine import cloud_signal_engine
            from telegram_bot.handlers import format_signal_message
            from telegram_bot.keyboards import signal_keyboard

            max_wait = 30
            for i in range(max_wait):
                if not _admin_auto_wait:
                    return

                await asyncio.sleep(120)

                if not _admin_auto_wait:
                    return

                old_d = cloud_signal_engine.last_sent_direction
                old_t = cloud_signal_engine.last_sent_time
                cloud_signal_engine.last_sent_direction = None
                cloud_signal_engine.last_sent_time = 0
                sig = cloud_signal_engine.scan()

                if sig and sig.get('is_tradeable'):
                    _admin_auto_wait = False
                    sig['is_new'] = True
                    cloud_signal_engine.active_signal = sig

                    score = sig.get('score', 0)
                    direction = sig.get('direction', '').upper()
                    entry = sig.get('entry_price', 0)
                    sig_id = sig.get('signal_id', 'auto')

                    db.save_signal(
                        sig.get('direction', ''), entry,
                        sig.get('tp1', 0), sig.get('sl', 0),
                        score, sig.get('strength', ''),
                        sig.get('risk_reward', '')
                    )

                    text = format_signal_message(sig)
                    users = db.get_active_users()
                    sent = 0
                    for user in users:
                        tid = user['telegram_id']
                        try:
                            await context.bot.send_message(
                                tid, text, parse_mode='Markdown',
                                reply_markup=signal_keyboard(sig_id)
                            )
                            sent += 1
                        except Exception:
                            pass

                    await context.bot.send_message(
                        _admin_auto_wait_chat_id,
                        "📤 *تم إرسال التوصية تلقائياً!*\n"
                        "━━━━━━━━━━━━━━━━━━━━\n\n"
                        f"📊 {direction} @ `{entry:.2f}`\n"
                        f"🎯 Score: {score}/10\n"
                        f"✅ TP1: `{sig.get('tp1', 0):.2f}`\n"
                        f"🏆 TP2: `{sig.get('tp2', 0):.2f}`\n"
                        f"❌ SL: `{sig.get('sl', 0):.2f}`\n\n"
                        f"✅ *تم الإرسال لـ {sent}/{len(users)} مستخدم!*\n\n"
                        f"⏱️ _انتظرت {(i+1)*2} دقيقة_",
                        parse_mode='Markdown'
                    )
                    return
                else:
                    cloud_signal_engine.last_sent_direction = old_d
                    cloud_signal_engine.last_sent_time = old_t

                    if (i + 1) % 5 == 0:
                        state = cloud_signal_engine.state
                        try:
                            ckb = InlineKeyboardMarkup([
                                [InlineKeyboardButton("⛔ إلغاء الانتظار", callback_data="admin_cancel_wait")],
                            ])
                            await context.bot.edit_message_text(
                                "🔄 *وضع الانتظار التلقائي*\n"
                                "━━━━━━━━━━━━━━━━━━━━\n\n"
                                f"⏳ *جاري الانتظار... ({(i+1)*2} دقيقة)*\n\n"
                                f"🤖 حالة المحرك: `{state}`\n"
                                f"📡 فحص #{i+1}/{max_wait}\n\n"
                                "🟢 _الانتظار نشط_",
                                chat_id=_admin_auto_wait_chat_id,
                                message_id=_admin_auto_wait_msg_id,
                                parse_mode='Markdown',
                                reply_markup=ckb
                            )
                        except Exception:
                            pass

            _admin_auto_wait = False
            await context.bot.send_message(
                _admin_auto_wait_chat_id,
                "⏰ *انتهى وقت الانتظار (60 دقيقة)*\n"
                "لم تتوفر توصية. جرّب لاحقاً.",
                parse_mode='Markdown'
            )
        except Exception as e:
            _admin_auto_wait = False
            logger.error("[ADMIN] Auto-wait error: %s", e)

    asyncio.create_task(_wait_for_signal())


async def admin_cancel_wait_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Cancel auto-wait mode"""
    global _admin_auto_wait
    query = update.callback_query
    if not is_admin(query.from_user.id):
        return
    _admin_auto_wait = False
    await query.answer("⛔ تم إلغاء الانتظار")
    await query.edit_message_text(
        "⛔ *تم إلغاء الانتظار التلقائي*\n\n"
        "يمكنك إعادة المحاولة من لوحة التحكم.",
        parse_mode='Markdown',
        reply_markup=back_to_admin_keyboard()
    )


# =============== SUBSCRIPTION MANAGEMENT ===============

PREMIUM_USER_ID = 9  # conversation state

async def admin_subscription_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show subscription management menu"""
    query = update.callback_query
    if not is_admin(query.from_user.id):
        return
    await query.answer()

    # Get stats
    users = db.get_active_users()
    total = len(users)
    premium_count = sum(1 for u in users if u.get('is_premium'))
    free_count = total - premium_count

    await query.edit_message_text(
        "💎 *إدارة الاشتراكات*\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        f"👥 إجمالي المستخدمين: {total}\n"
        f"💎 Premium: {premium_count}\n"
        f"🆓 مجاني: {free_count}\n\n"
        "📋 *الأوامر:*\n"
        "اكتب أحد الأوامر التالية:\n\n"
        "`/premium USER_ID 30`\n"
        "↳ تفعيل Premium لـ 30 يوم\n\n"
        "`/unpremium USER_ID`\n"
        "↳ إلغاء Premium\n\n"
        "`/resetfree USER_ID 5`\n"
        "↳ إعادة تعيين التوصيات المجانية\n\n"
        "`/userstatus USER_ID`\n"
        "↳ عرض حالة المستخدم",
        parse_mode='Markdown',
        reply_markup=back_to_admin_keyboard()
    )


async def premium_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Grant premium to user: /premium USER_ID DAYS"""
    tid = update.effective_user.id
    if not is_admin(tid):
        return

    args = context.args
    if len(args) < 1:
        await update.message.reply_text("❌ الاستخدام: `/premium USER_ID 30`", parse_mode='Markdown')
        return

    try:
        user_id = int(args[0])
        days = int(args[1]) if len(args) > 1 else 30
    except ValueError:
        await update.message.reply_text("❌ ID غير صحيح")
        return

    user = db.get_user(user_id)
    if not user:
        await update.message.reply_text(f"❌ المستخدم {user_id} غير موجود")
        return

    db.set_premium(user_id, days)
    await update.message.reply_text(
        f"✅ *تم تفعيل Premium!*\n\n"
        f"👤 {user['full_name']}\n"
        f"🆔 `{user_id}`\n"
        f"📅 المدة: {days} يوم\n"
        f"💎 Premium حتى: {days} يوم من الآن",
        parse_mode='Markdown'
    )


async def unpremium_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Remove premium: /unpremium USER_ID"""
    tid = update.effective_user.id
    if not is_admin(tid):
        return

    args = context.args
    if len(args) < 1:
        await update.message.reply_text("❌ الاستخدام: `/unpremium USER_ID`", parse_mode='Markdown')
        return

    try:
        user_id = int(args[0])
    except ValueError:
        await update.message.reply_text("❌ ID غير صحيح")
        return

    db.remove_premium(user_id)
    await update.message.reply_text(f"✅ تم إلغاء Premium للمستخدم `{user_id}`", parse_mode='Markdown')


async def resetfree_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Reset free signals: /resetfree USER_ID COUNT"""
    tid = update.effective_user.id
    if not is_admin(tid):
        return

    args = context.args
    if len(args) < 1:
        await update.message.reply_text("❌ الاستخدام: `/resetfree USER_ID 5`", parse_mode='Markdown')
        return

    try:
        user_id = int(args[0])
        count = int(args[1]) if len(args) > 1 else 5
    except ValueError:
        await update.message.reply_text("❌ ID غير صحيح")
        return

    db.reset_free_signals(user_id, count)
    await update.message.reply_text(
        f"✅ تم إعادة تعيين التوصيات المجانية\n"
        f"🆔 `{user_id}` → {count} توصيات",
        parse_mode='Markdown'
    )


async def userstatus_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Check user subscription status: /userstatus USER_ID"""
    tid = update.effective_user.id
    if not is_admin(tid):
        return

    args = context.args
    if len(args) < 1:
        await update.message.reply_text("❌ الاستخدام: `/userstatus USER_ID`", parse_mode='Markdown')
        return

    try:
        user_id = int(args[0])
    except ValueError:
        await update.message.reply_text("❌ ID غير صحيح")
        return

    user = db.get_user(user_id)
    if not user:
        await update.message.reply_text(f"❌ المستخدم {user_id} غير موجود")
        return

    is_prem = db.is_premium_user(user_id)
    free_left = db.get_free_signals_left(user_id)
    total_received = user.get('signals_received', 0)

    status = "💎 Premium" if is_prem else (f"🆓 مجاني ({free_left} متبقية)" if free_left > 0 else "🔒 منتهي")

    await update.message.reply_text(
        f"👤 *حالة المستخدم*\n"
        f"━━━━━━━━━━━━━━━━━\n\n"
        f"🆔 ID: `{user_id}`\n"
        f"📛 الاسم: {user['full_name']}\n"
        f"📱 الهاتف: {user.get('phone', 'N/A')}\n\n"
        f"📊 الحالة: {status}\n"
        f"📈 توصيات مستلمة: {total_received}\n"
        f"🏆 صفقات رابحة: {user.get('wins', 0)}\n"
        f"📉 صفقات خاسرة: {user.get('losses', 0)}\n"
        f"⏭️ تم تخطيها: {user.get('skips', 0)}",
        parse_mode='Markdown'
    )


# =============== PAYMENT & SUBSCRIPTION INVITES ===============

# Default payment info
DEFAULT_PAYMENT_INFO = {
    'price': '$30',
    'period': '30 يوم',
    'wish_phone': '+96171101381',
    'omt_name': 'AIOK Trading',
    'omt_phone': '',
    'usdt_address': '',
    'usdt_network': 'TRC20',
    'whatsapp': '',
}

def _get_payment_info():
    """Get payment details from settings"""
    info = {}
    for key, default in DEFAULT_PAYMENT_INFO.items():
        info[key] = db.get_setting(f'pay_{key}', default)
    return info

def _format_subscription_msg(info):
    """Format the subscription message"""
    msg = (
        "💎 *AIOK Trading — Premium*\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "🔓 *What you get with Premium:*\n"
        "✅ توصيات غير محدودة 24/7\n"
        "✅ تحليل AI يومي للسوق\n"
        "✅ إشعارات فورية بدون تأخير\n"
        "✅ دعم فني مباشر\n\n"
        f"💰 *Price: {info['price']} / {info['period']}*\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "📱 *Payment Method:*\n\n"
    )

    if info.get('wish_phone'):
        msg += f"1️⃣ *Wish Money:*\n   Number: `{info['wish_phone']}`\n\n"

    if info.get('usdt_address'):
        msg += (
            f"2️⃣ *USDT ({info['usdt_network']}):*\n"
            f"   Address: `{info['usdt_address']}`\n\n"
        )

    msg += (
        "━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "📋 *خطوات الاشتراك:*\n"
        "1️⃣ ادفع عبر إحدى الطرق أعلاه\n"
        "2️⃣ أرسل صورة الإيصال هنا في البوت\n"
        "3️⃣ سيتم تفعيل حسابك خلال دقائق ⚡\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "📩 *للتواصل والدعم:*\n"
        "💬 أرسل رسالتك هنا مباشرة في البوت\n"
        "👤 أو تواصل مع: @Y88y5\n"
    )

    return msg


async def setpayment_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Set payment info: /setpayment"""
    tid = update.effective_user.id
    if not is_admin(tid):
        return

    info = _get_payment_info()
    await update.message.reply_text(
        "💳 *إعدادات الدفع الحالية:*\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        f"💰 السعر: `{info['price']}`\n"
        f"📅 المدة: `{info['period']}`\n"
        f"📱 Wish رقم: `{info['wish_phone']}`\n"
        f"📱 OMT اسم: `{info['omt_name']}`\n"
        f"📱 OMT رقم: `{info.get('omt_phone') or 'غير محدد'}`\n"
        f"💎 USDT: `{info['usdt_address'] or 'غير محدد'}`\n"
        f"🌐 Network: `{info['usdt_network']}`\n"
        f"📞 واتساب: `{info['whatsapp'] or 'غير محدد'}`\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "📝 *لتعديل أي حقل:*\n\n"
        "`/setpay price $20`\n"
        "`/setpay period 30 يوم`\n"
        "`/setpay wish_phone +961XXXXXXXX`\n"
        "`/setpay omt_name الاسم`\n"
        "`/setpay omt_phone +961XXXXXXXX`\n"
        "`/setpay usdt_address العنوان`\n"
        "`/setpay whatsapp +961XXXXXXXX`\n",
        parse_mode='Markdown'
    )


async def setpay_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Set a payment field: /setpay FIELD VALUE"""
    tid = update.effective_user.id
    if not is_admin(tid):
        return

    args = context.args
    if len(args) < 2:
        await update.message.reply_text("❌ الاستخدام: `/setpay price $20`", parse_mode='Markdown')
        return

    field = args[0]
    value = ' '.join(args[1:])

    valid_fields = list(DEFAULT_PAYMENT_INFO.keys())
    if field not in valid_fields:
        await update.message.reply_text(
            f"❌ حقل غير صحيح!\n\nالحقول المتاحة:\n`{'`, `'.join(valid_fields)}`",
            parse_mode='Markdown'
        )
        return

    db.set_setting(f'pay_{field}', value)
    await update.message.reply_text(f"✅ تم تحديث `{field}` → `{value}`", parse_mode='Markdown')


async def sendsub_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send subscription invite to specific user: /sendsub USER_ID"""
    tid = update.effective_user.id
    if not is_admin(tid):
        return

    args = context.args
    if len(args) < 1:
        await update.message.reply_text(
            "❌ الاستخدام:\n\n"
            "`/sendsub USER_ID` — لمستخدم واحد\n"
            "`/sendsub all` — لجميع المستخدمين المجانيين\n"
            "`/sendsub expired` — للمنتهية توصياتهم فقط",
            parse_mode='Markdown'
        )
        return

    info = _get_payment_info()
    msg = _format_subscription_msg(info)
    target = args[0]

    if target == 'all':
        # Send to all non-premium users
        users = db.get_active_users()
        sent = 0
        for user in users:
            uid = user['telegram_id']
            if uid == tid or db.is_premium_user(uid):
                continue
            try:
                from telegram_bot.bot import TelegramBot
                bot_instance = context.bot
                await bot_instance.send_message(uid, msg, parse_mode='Markdown')
                sent += 1
            except Exception:
                pass
        await update.message.reply_text(f"✅ تم الإرسال لـ {sent} مستخدم مجاني")

    elif target == 'expired':
        # Send only to users with 0 free signals
        users = db.get_active_users()
        sent = 0
        for user in users:
            uid = user['telegram_id']
            if uid == tid or db.is_premium_user(uid):
                continue
            if db.get_free_signals_left(uid) <= 0:
                try:
                    await context.bot.send_message(uid, msg, parse_mode='Markdown')
                    sent += 1
                except Exception:
                    pass
        await update.message.reply_text(f"✅ تم الإرسال لـ {sent} مستخدم (منتهية توصياتهم)")

    else:
        # Send to specific user
        try:
            user_id = int(target)
        except ValueError:
            await update.message.reply_text("❌ ID غير صحيح")
            return

        user = db.get_user(user_id)
        if not user:
            await update.message.reply_text(f"❌ المستخدم {user_id} غير موجود")
            return

        try:
            await context.bot.send_message(user_id, msg, parse_mode='Markdown')
            await update.message.reply_text(
                f"✅ تم إرسال دعوة الاشتراك لـ *{user['full_name']}*",
                parse_mode='Markdown'
            )
        except Exception as e:
            await update.message.reply_text(f"❌ فشل الإرسال: {e}")


async def admin_contact_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """User wants to contact admin for subscription"""
    tid = update.effective_user.id
    user = db.get_user(tid)
    info = _get_payment_info()

    # Notify admin
    try:
        from telegram_bot.bot import TelegramBot
        admin_id = db.get_setting('admin_id', '')
        if not admin_id:
            # Find admin from users table
            conn = db._get_conn()
            try:
                row = conn.execute("SELECT telegram_id FROM users WHERE is_admin = 1 LIMIT 1").fetchone()
                if row:
                    admin_id = str(row[0])
            finally:
                conn.close()

        if admin_id:
            await context.bot.send_message(
                int(admin_id),
                f"📩 *طلب اشتراك جديد!*\n"
                f"━━━━━━━━━━━━━━━━━━━━\n\n"
                f"👤 الاسم: {user['full_name'] if user else 'مجهول'}\n"
                f"🆔 ID: `{tid}`\n"
                f"📱 الهاتف: {user.get('phone', 'N/A') if user else 'N/A'}\n\n"
                f"💡 استخدم `/premium {tid} 30` لتفعيل الاشتراك",
                parse_mode='Markdown'
            )
    except Exception:
        pass

    await update.message.reply_text(
        "📩 *تم إرسال طلبك للمشرف!*\n\n"
        "سيتم التواصل معك قريباً لإتمام الاشتراك ⚡\n\n"
        f"📞 واتساب: {info.get('whatsapp', 'غير متاح')}",
        parse_mode='Markdown'
    )


# =============== CHANNEL MANAGEMENT ===============

async def channels_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show current channel settings: /channels"""
    tid = update.effective_user.id
    if not is_admin(tid):
        return

    tg_ch = db.get_setting('tg_channel', '@aioktrading')
    tg_url = db.get_setting('tg_channel_url', 'https://t.me/aioktrading')
    wa_url = db.get_setting('wa_channel_url', 'https://whatsapp.com/channel/0029VbCOrNj7dmeUcpuIKl1b')

    await update.message.reply_text(
        "📢 *إعدادات القنوات:*\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        f"📢 تليجرام ID: `{tg_ch}`\n"
        f"🔗 رابط تليجرام: `{tg_url}`\n"
        f"📱 رابط واتساب: `{wa_url}`\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "📝 *لتعديل:*\n\n"
        "`/setchannel tg @username`\n"
        "`/setchannel tg_url https://t.me/xxx`\n"
        "`/setchannel wa_url https://whatsapp.com/xxx`",
        parse_mode='Markdown'
    )


async def setchannel_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Set channel URL: /setchannel tg_url https://..."""
    tid = update.effective_user.id
    if not is_admin(tid):
        return

    args = context.args
    if len(args) < 2:
        await update.message.reply_text(
            "❌ الاستخدام:\n\n"
            "`/setchannel tg @aioktrading`\n"
            "`/setchannel tg_url https://t.me/aioktrading`\n"
            "`/setchannel wa_url https://whatsapp.com/...`",
            parse_mode='Markdown'
        )
        return

    field = args[0].lower()
    value = ' '.join(args[1:])

    field_map = {
        'tg': 'tg_channel',
        'tg_url': 'tg_channel_url',
        'wa_url': 'wa_channel_url',
    }

    if field not in field_map:
        await update.message.reply_text(
            f"❌ حقل غير صحيح!\n\nالحقول: `tg`, `tg_url`, `wa_url`",
            parse_mode='Markdown'
        )
        return

    db.set_setting(field_map[field], value)
    await update.message.reply_text(f"✅ تم تحديث `{field}` → `{value}`", parse_mode='Markdown')
