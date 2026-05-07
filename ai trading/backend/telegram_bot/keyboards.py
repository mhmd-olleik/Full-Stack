"""
AIOK Trading — Telegram Keyboards
===============================
All Inline Keyboards and Reply Keyboards for the bot.
"""

from telegram import (
    InlineKeyboardButton, InlineKeyboardMarkup,
    ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
)

# =============== CHANNEL JOIN ===============

# Defaults (can be changed via /setchannel command)
DEFAULT_TG_CHANNEL = '@aioktrading'
DEFAULT_TG_URL = 'https://t.me/aioktrading'
DEFAULT_WA_URL = 'https://whatsapp.com/channel/0029VbCOrNj7dmeUcpuIKl1b'

# Will be set from database
TELEGRAM_CHANNEL = DEFAULT_TG_CHANNEL
TELEGRAM_CHANNEL_URL = DEFAULT_TG_URL
WHATSAPP_CHANNEL_URL = DEFAULT_WA_URL


def _load_channel_settings():
    """Load channel URLs from database"""
    global TELEGRAM_CHANNEL, TELEGRAM_CHANNEL_URL, WHATSAPP_CHANNEL_URL
    try:
        from telegram_bot.database import db
        TELEGRAM_CHANNEL = db.get_setting('tg_channel', DEFAULT_TG_CHANNEL)
        TELEGRAM_CHANNEL_URL = db.get_setting('tg_channel_url', DEFAULT_TG_URL)
        WHATSAPP_CHANNEL_URL = db.get_setting('wa_channel_url', DEFAULT_WA_URL)
    except Exception:
        pass


def join_channels_keyboard():
    """Keyboard to join channels before using the bot"""
    _load_channel_settings()
    keyboard = [
        [InlineKeyboardButton("📢 انضم لقناة تليجرام", url=TELEGRAM_CHANNEL_URL)],
        [InlineKeyboardButton("📱 انضم لقناة واتساب", url=WHATSAPP_CHANNEL_URL)],
        [InlineKeyboardButton("✅ تحقق من الانضمام", callback_data="verify_join")],
    ]
    return InlineKeyboardMarkup(keyboard)


# =============== MAIN MENU ===============

def main_menu_keyboard():
    """Main menu for registered users"""
    keyboard = [
        [InlineKeyboardButton("🔥 آخر توصية", callback_data="get_signal"),
         InlineKeyboardButton("📊 تحليل السوق", callback_data="get_analysis")],
        [InlineKeyboardButton("🧠 AI Strategy", callback_data="get_strategy"),
         InlineKeyboardButton("🤖 AI Assistant", callback_data="ai_menu")],
        [InlineKeyboardButton("💰 السعر الحالي", callback_data="get_price"),
         InlineKeyboardButton("📈 صفقاتي", callback_data="my_trades")],
        [InlineKeyboardButton("📉 إحصائياتي", callback_data="my_stats"),
         InlineKeyboardButton("ℹ️ المساعدة", callback_data="help")],
        [InlineKeyboardButton("💎 الاشتراكات", callback_data="user_subscribe"),
         InlineKeyboardButton("⚠️ إخلاء مسؤولية", callback_data="user_disclaimer")],
    ]
    return InlineKeyboardMarkup(keyboard)


def ai_menu_keyboard():
    """AI Assistant sub-menu"""
    keyboard = [
        [InlineKeyboardButton("🌅 Daily Bias", callback_data="ai_daily_bias"),
         InlineKeyboardButton("🏛️ Macro Intel", callback_data="ai_macro")],
        [InlineKeyboardButton("🚦 GO/NO-GO", callback_data="ai_gonogo"),
         InlineKeyboardButton("🧮 Risk Calculator", callback_data="ai_risk_calc")],
        [InlineKeyboardButton("🔙 القائمة الرئيسية", callback_data="main_menu")],
    ]
    return InlineKeyboardMarkup(keyboard)


# =============== SIGNAL KEYBOARDS ===============

def signal_keyboard(signal_id):
    """Keyboard shown with a new signal"""
    keyboard = [
        [InlineKeyboardButton("✅ دخلت الصفقة", callback_data=f"enter_trade:{signal_id}")],
        [InlineKeyboardButton("⏭️ تخطي التوصية", callback_data=f"skip_signal:{signal_id}")],
    ]
    return InlineKeyboardMarkup(keyboard)


def active_trade_keyboard(trade_id):
    """Keyboard for an active trade"""
    keyboard = [
        [InlineKeyboardButton("💰 تم الربح", callback_data=f"trade_profit:{trade_id}"),
         InlineKeyboardButton("❌ خسرت", callback_data=f"trade_loss:{trade_id}")],
        [InlineKeyboardButton("⏭️ تخطي", callback_data=f"trade_skip:{trade_id}"),
         InlineKeyboardButton("📊 تفاصيل", callback_data=f"trade_detail:{trade_id}")],
    ]
    return InlineKeyboardMarkup(keyboard)


def trade_closed_keyboard():
    """Keyboard after closing a trade"""
    keyboard = [
        [InlineKeyboardButton("🔙 القائمة الرئيسية", callback_data="main_menu"),
         InlineKeyboardButton("📈 صفقاتي", callback_data="my_trades")],
    ]
    return InlineKeyboardMarkup(keyboard)


# =============== REGISTRATION KEYBOARDS ===============

def phone_keyboard():
    """Reply keyboard for sharing phone number"""
    keyboard = [
        [KeyboardButton("📱 مشاركة رقم الهاتف", request_contact=True)],
    ]
    return ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True)


def remove_keyboard():
    return ReplyKeyboardRemove()


# =============== ADMIN KEYBOARDS ===============

def admin_menu_keyboard():
    """Admin control panel"""
    keyboard = [
        [InlineKeyboardButton("🖥️ حالة النظام", callback_data="admin_server_status"),
         InlineKeyboardButton("📊 الإحصائيات", callback_data="admin_stats")],
        [InlineKeyboardButton("👥 المستخدمين", callback_data="admin_users"),
         InlineKeyboardButton("⚙️ الإعدادات", callback_data="admin_settings")],
        [InlineKeyboardButton("📢 إرسال رسالة", callback_data="admin_broadcast"),
         InlineKeyboardButton("💬 رسالة خاصة", callback_data="admin_dm")],
        [InlineKeyboardButton("🚫 حظر مستخدم", callback_data="admin_ban"),
         InlineKeyboardButton("✅ إلغاء حظر", callback_data="admin_unban")],
        [InlineKeyboardButton("📋 سجل التوصيات", callback_data="admin_signal_log"),
         InlineKeyboardButton("🔥 توصية يدوية", callback_data="admin_manual_signal")],
        [InlineKeyboardButton("📤 إرسال توصية فوري", callback_data="admin_force_signal"),
         InlineKeyboardButton("💎 الاشتراكات", callback_data="admin_subscriptions")],
        [InlineKeyboardButton("🔄 تحديث", callback_data="admin_refresh")],
    ]
    return InlineKeyboardMarkup(keyboard)


def admin_users_keyboard():
    """User list filter options"""
    keyboard = [
        [InlineKeyboardButton("✅ النشطين", callback_data="admin_active_users"),
         InlineKeyboardButton("🚫 المحظورين", callback_data="admin_banned_users")],
        [InlineKeyboardButton("⏳ في الانتظار", callback_data="admin_pending_users"),
         InlineKeyboardButton("📋 الكل", callback_data="admin_all_users")],
        [InlineKeyboardButton("🔙 رجوع", callback_data="admin_panel")],
    ]
    return InlineKeyboardMarkup(keyboard)


def admin_settings_keyboard():
    """Bot settings"""
    keyboard = [
        [InlineKeyboardButton("📊 حد التوصيات اليومي", callback_data="set_max_signals"),
         InlineKeyboardButton("📈 حد الصفقات", callback_data="set_max_trades")],
        [InlineKeyboardButton("🎯 حد الـ Score", callback_data="set_min_score"),
         InlineKeyboardButton("⏰ فاصل التحليل", callback_data="set_interval")],
        [InlineKeyboardButton("🔙 رجوع", callback_data="admin_panel")],
    ]
    return InlineKeyboardMarkup(keyboard)


def back_to_admin_keyboard():
    keyboard = [
        [InlineKeyboardButton("🔙 رجوع للوحة التحكم", callback_data="admin_panel")],
    ]
    return InlineKeyboardMarkup(keyboard)


def confirm_action_keyboard(action, target_id):
    """Confirmation keyboard for destructive actions"""
    keyboard = [
        [InlineKeyboardButton("✅ تأكيد", callback_data=f"confirm_{action}:{target_id}"),
         InlineKeyboardButton("❌ إلغاء", callback_data="admin_panel")],
    ]
    return InlineKeyboardMarkup(keyboard)


# =============== NAVIGATION ===============

def back_to_menu_keyboard():
    keyboard = [
        [InlineKeyboardButton("🔙 القائمة الرئيسية", callback_data="main_menu")],
    ]
    return InlineKeyboardMarkup(keyboard)
