"""
AIOK Trading — User Handlers
==========================
All user-facing command and callback handlers.
Uses direct module imports — no need for Flask server to be running.
"""

import logging
import sys
import os
from datetime import datetime
from telegram import Update
from telegram.ext import ContextTypes, ConversationHandler
from telegram_bot.database import db
from telegram_bot.keyboards import (
    main_menu_keyboard, signal_keyboard, active_trade_keyboard,
    trade_closed_keyboard, phone_keyboard, remove_keyboard,
    back_to_menu_keyboard
)

# Add backend to path for direct imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger('AIOK.TG')

# Conversation states for registration
ASK_NAME, ASK_PHONE = range(2)

# Default settings
DEFAULTS = {
    'max_open_trades': 6,
    'min_score': 6,
    'max_signals_daily': 20,
    'scan_interval': 120,
}

ADMIN_ID = None

def set_admin_id(aid):
    global ADMIN_ID
    ADMIN_ID = aid

def _is_admin(tid):
    return tid == ADMIN_ID

def get_max_trades():
    val = db.get_setting('max_open_trades', '999')
    return int(val)

def get_min_score():
    val = db.get_setting('min_score', DEFAULTS['min_score'])
    return int(val)


# Store last signal so users can always enter even after engine moves on
_last_tradeable_signal = None

def _get_signal_data():
    """Get signal data: MT5 first, then cloud cache (NO re-scan = instant)"""
    global _last_tradeable_signal
    # Try MT5 signal generator
    try:
        from signal_generator import signal_generator
        sig = signal_generator.active_signal
        if sig and sig.get('is_tradeable'):
            _last_tradeable_signal = sig
            return sig, signal_generator.state, signal_generator.signals_today
    except Exception:
        pass
    # Return cached cloud signal (no re-scan = instant response)
    try:
        from telegram_bot.cloud_signal_engine import cloud_signal_engine
        sig = cloud_signal_engine.active_signal
        if sig and sig.get('is_tradeable'):
            _last_tradeable_signal = sig
        return sig, cloud_signal_engine.state, cloud_signal_engine.signals_today
    except Exception as e:
        logger.debug("Cloud signal error: %s", e)
    return None, 'WAITING', 0


def _get_price_data():
    """Get price from MT5, fallback to cloud APIs"""
    # Try MT5 first
    try:
        from mt5_connector import connector
        if connector.connected:
            return connector.get_current_price()
    except Exception:
        pass
    # Fallback to cloud
    try:
        from telegram_bot.cloud_data import cloud_data
        return cloud_data.get_current_price()
    except Exception as e:
        logger.debug("Cloud price error: %s", e)
    return None


def _get_analysis_data():
    """Get analysis from signal generator, fallback to cloud + TA engine"""
    try:
        from signal_generator import signal_generator
        sig = signal_generator.active_signal
        if sig:
            return sig
    except Exception:
        pass

    # Try MT5 data
    try:
        from mt5_connector import connector
        from technical_analysis import ta_engine
        if connector.connected:
            df = connector.get_candles('M15', 250)
            if df is not None and len(df) > 20:
                analysis = ta_engine.analyze(df)
                confluence = ta_engine.get_confluence_score(analysis)
                return {
                    'direction': confluence['direction'],
                    'score': confluence['score'],
                    'strength': 'STRONG' if confluence['score'] >= 7 else 'MODERATE' if confluence['score'] >= 5 else 'WEAK',
                    'edge': confluence.get('edge', 0),
                    'ml_probability': 0,
                    'confluence_details': confluence.get('details', {}),
                    'source': 'MT5',
                }
    except Exception:
        pass

    # Fallback to cloud data + TA engine
    try:
        from telegram_bot.cloud_data import cloud_data
        from technical_analysis import ta_engine
        df = cloud_data.get_candles('15m', 250)
        if df is not None and len(df) > 20:
            analysis = ta_engine.analyze(df)
            if analysis:
                confluence = ta_engine.get_confluence_score(analysis)
                price_data = cloud_data.get_current_price()
                price = price_data.get('price', 0) if price_data else 0
                return {
                    'direction': confluence['direction'],
                    'score': confluence['score'],
                    'strength': 'STRONG' if confluence['score'] >= 7 else 'MODERATE' if confluence['score'] >= 5 else 'WEAK',
                    'edge': confluence.get('edge', 0),
                    'ml_probability': 0,
                    'confluence_details': confluence.get('details', {}),
                    'price': price,
                    'source': 'Cloud ☁️',
                }
    except Exception as e:
        logger.debug("Cloud analysis error: %s", e)
    return None


# =============== REGISTRATION FLOW ===============

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    tid = update.effective_user.id
    username = update.effective_user.username

    if db.is_banned(tid):
        await update.message.reply_text("🚫 تم حظرك من استخدام البوت.")
        return ConversationHandler.END

    if db.is_registered(tid):
        user = db.get_user(tid)
        db.update_last_active(tid)
        await update.message.reply_text(
            f"مرحباً بك مجدداً **{user['full_name']}** 👋\n\n"
            "🤖 *AIOK Trading Trading Bot*\n"
            "━━━━━━━━━━━━━━━━━\n"
            "بوت التوصيات الذكي للتداول\n\n"
            "اختر من القائمة:",
            parse_mode='Markdown',
            reply_markup=main_menu_keyboard()
        )
        return ConversationHandler.END

    # New user — start registration
    db.register_user(tid, username)
    await update.message.reply_text(
        "🤖 *مرحباً بك في AIOK Trading*\n"
        "━━━━━━━━━━━━━━━━━\n\n"
        "بوت التوصيات الذكي للتداول 📊\n\n"
        "للتسجيل، أرسل لي *اسمك الكامل*:",
        parse_mode='Markdown'
    )
    return ASK_NAME


async def ask_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    name = update.message.text.strip()
    if len(name) < 2 or len(name) > 50:
        await update.message.reply_text("❌ الاسم غير صحيح. أرسل اسمك الكامل (2-50 حرف):")
        return ASK_NAME

    tid = update.effective_user.id
    db.set_user_name(tid, name)
    context.user_data['reg_name'] = name

    await update.message.reply_text(
        f"✅ أهلاً *{name}*!\n\n"
        "الآن أرسل *رقم هاتفك* أو اضغط الزر 👇",
        parse_mode='Markdown',
        reply_markup=phone_keyboard()
    )
    return ASK_PHONE


async def ask_phone(update: Update, context: ContextTypes.DEFAULT_TYPE):
    tid = update.effective_user.id

    if update.message.contact:
        phone = update.message.contact.phone_number
    else:
        phone = update.message.text.strip()

    if len(phone) < 6:
        await update.message.reply_text("❌ رقم غير صحيح. أرسل رقم هاتفك:", reply_markup=phone_keyboard())
        return ASK_PHONE

    db.set_user_phone(tid, phone)
    user = db.get_user(tid)

    await update.message.reply_text(
        "✅ *تم التسجيل بنجاح!*\n"
        "━━━━━━━━━━━━━━━━━\n\n"
        f"👤 الاسم: {user['full_name']}\n"
        f"📱 الهاتف: {phone}\n\n"
        "🤖 ستصلك التوصيات تلقائياً عند توفرها!\n",
        parse_mode='Markdown',
        reply_markup=remove_keyboard()
    )

    # Channel join requirement
    from telegram_bot.keyboards import join_channels_keyboard
    await update.message.reply_text(
        "📢 *انضم لقنواتنا أولاً!*\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "📌 للحصول على التوصيات والتحديثات\n"
        "يجب الانضمام لقنواتنا الرسمية:\n\n"
        "1️⃣ انضم لقناة *تليجرام*\n"
        "2️⃣ انضم لقناة *واتساب*\n"
        "3️⃣ اضغط *تحقق من الانضمام* ✅",
        parse_mode='Markdown',
        reply_markup=join_channels_keyboard()
    )

    logger.info("[TG] New user registered: %s (%s)", user['full_name'], tid)
    return ConversationHandler.END


async def cancel_reg(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("تم الإلغاء. أرسل /start للبدء مجدداً.", reply_markup=remove_keyboard())
    return ConversationHandler.END


# =============== CHANNEL JOIN VERIFICATION ===============

async def verify_join_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Verify user joined the Telegram channel"""
    query = update.callback_query
    tid = query.from_user.id

    # Check Telegram channel membership
    from telegram_bot.keyboards import TELEGRAM_CHANNEL, join_channels_keyboard
    try:
        member = await context.bot.get_chat_member(TELEGRAM_CHANNEL, tid)
        if member.status in ('member', 'administrator', 'creator'):
            await query.answer("✅ تم التحقق بنجاح!")
            await query.edit_message_text(
                "🎁 *مرحباً! لديك 6 توصيات مجانية*\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                "🆓 جرّب *6 توصيات مجانية* قبل الاشتراك!\n"
                "اذا أعجبتك النتائج، اشترك في Premium\n"
                "للحصول على توصيات غير محدودة 💎\n\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                "⚠️ *تنبيه مهم:*\n"
                "التداول ينطوي على مخاطر عالية وقد\n"
                "تخسر رأس مالك. القرار النهائي يعود\n"
                "للمتداول وحده. AIOK Trading غير مسؤول\n"
                "عن أي خسائر ناتجة عن استخدام التوصيات.\n\n"
                "✅ باستمرارك تستخدم البوت، أنت توافق على ذلك.",
                parse_mode='Markdown',
                reply_markup=main_menu_keyboard()
            )
        else:
            await query.answer("❌ لم تنضم بعد! انضم للقناة أولاً", show_alert=True)
    except Exception as e:
        logger.debug("Channel check error: %s", e)
        # If can't verify (bot not admin in channel), allow anyway
        await query.answer("✅ شكراً! تم التحقق")
        await query.edit_message_text(
            "🎁 *مرحباً! لديك 6 توصيات مجانية*\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "🆓 جرّب *6 توصيات مجانية* قبل الاشتراك!\n"
            "اذا أعجبتك النتائج، اشترك في Premium\n"
            "للحصول على توصيات غير محدودة 💎\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "⚠️ *تنبيه مهم:*\n"
            "التداول ينطوي على مخاطر عالية وقد\n"
            "تخسر رأس مالك. القرار النهائي يعود\n"
            "للمتداول وحده. AIOK Trading غير مسؤول\n"
            "عن أي خسائر ناتجة عن استخدام التوصيات.\n\n"
            "✅ باستمرارك تستخدم البوت، أنت توافق على ذلك.",
            parse_mode='Markdown',
            reply_markup=main_menu_keyboard()
        )


# =============== MENU HANDLERS ===============

async def menu_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    tid = update.effective_user.id
    if not db.is_registered(tid):
        await update.message.reply_text("يجب التسجيل أولاً. أرسل /start")
        return
    db.update_last_active(tid)
    await update.message.reply_text("📋 *القائمة الرئيسية*", parse_mode='Markdown', reply_markup=main_menu_keyboard())


async def main_menu_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    await query.edit_message_text("📋 *القائمة الرئيسية*", parse_mode='Markdown', reply_markup=main_menu_keyboard())


# =============== SIGNAL HANDLERS ===============

async def get_signal_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    tid = query.from_user.id

    if not db.is_registered(tid):
        await query.edit_message_text("يجب التسجيل أولاً. أرسل /start")
        return

    sig, state, signals_today = _get_signal_data()

    if not sig or sig.get('direction') == 'neutral' or not sig.get('is_tradeable'):
        score = sig.get('score', 0) if sig else 0
        # Extract real score from engine state like "WAITING (Score 5 < 6)"
        real_score = score
        try:
            from telegram_bot.cloud_signal_engine import cloud_signal_engine
            engine_state = cloud_signal_engine.state
            if 'Score' in engine_state:
                import re
                m = re.search(r'Score (\d+)', engine_state)
                if m:
                    real_score = int(m.group(1))
        except Exception:
            engine_state = state

        price_data = _get_price_data()
        price_line = ""
        source = "☁️ Cloud"
        if price_data:
            price_line = f"💰 السعر: `{price_data.get('bid', 0):.2f}`\n"
            source = price_data.get('source', 'cloud')

        data_status = "☁️ Cloud" if source in ('yfinance', 'api', 'cloud') else "🖥️ MT5"

        # Score bar
        filled = min(real_score, 10)
        bar = "🟩" * filled + "⬜" * (10 - filled)

        # VIP status
        min_s = get_min_score()
        if real_score >= min_s:
            vip_note = "✅ Score كافي — بيتم فحص الفلاتر الإضافية"
        else:
            vip_note = f"⏳ بحاجة Score {min_s}+ للتوصية VIP"

        await query.edit_message_text(
            "🔍 *جاري البحث عن توصيات VIP...*\n"
            "━━━━━━━━━━━━━━━━━\n\n"
            f"📊 Score الحالي: *{real_score}/10*\n"
            f"{bar}\n"
            f"{price_line}"
            f"📡 مصدر البيانات: {data_status}\n"
            f"🤖 حالة المحرك: `{state}`\n"
            f"📈 توصيات اليوم: {signals_today}\n\n"
            f"🎯 {vip_note}\n\n"
            "💡 _ستصلك التوصية تلقائياً عند توفرها!_ 🔔",
            parse_mode='Markdown',
            reply_markup=back_to_menu_keyboard()
        )
        return

    text = format_signal_message(sig)

    # ====== STALENESS WARNING ======
    # Warn users if signal is old
    timestamp = sig.get('timestamp', '')
    if timestamp:
        try:
            from datetime import datetime as dt
            sig_time = dt.fromisoformat(timestamp)
            now = dt.now()
            elapsed = (now - sig_time).total_seconds() / 60  # minutes

            if elapsed > 120:  # 2+ hours
                hours = int(elapsed // 60)
                text = (
                    "🚨 *تنبيه: توصية قديمة!*\n"
                    f"⏰ _منذ {hours} ساعة{'s' if hours > 1 else ''} — قد لا تكون صالحة_\n"
                    "━━━━━━━━━━━━━━━━━━━━\n\n"
                ) + text
            elif elapsed > 60:  # 1+ hour
                text = (
                    "⚠️ *تنبيه: توصية منذ أكثر من ساعة!*\n"
                    f"⏰ _منذ {int(elapsed)} دقيقة — تحقق من السعر الحالي_\n"
                    "━━━━━━━━━━━━━━━━━━━━\n\n"
                ) + text
            elif elapsed > 30:  # 30+ min
                text = (
                    "⏳ _توصية منذ {:.0f} دقيقة — تحقق من السعر_\n\n".format(elapsed)
                ) + text
        except Exception:
            pass

    sig_id = sig.get('signal_id', '0')
    await query.edit_message_text(text, parse_mode='Markdown', reply_markup=signal_keyboard(sig_id))


async def get_price_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    price = _get_price_data()
    if price:
        bid = price.get('bid', 0)
        ask = price.get('ask', 0)
        spread = round(ask - bid, 2)
        source = price.get('source', 'unknown')
        source_icon = "☁️" if source in ('yfinance', 'api') else "🖥️"
        note = "\n⚠️ _سعر تقريبي (±$3) — شغّل MT5 للدقة_" if source == 'yfinance' else ""
        await query.edit_message_text(
            "💰 *سعر XAUUSD الحالي*\n"
            "━━━━━━━━━━━━━━━━━\n\n"
            f"📈 Bid: `{bid:.2f}`\n"
            f"📉 Ask: `{ask:.2f}`\n"
            f"📊 Spread: `{spread:.2f}`\n"
            f"📡 المصدر: {source_icon}\n\n"
            f"⏰ التحديث: الآن{note}",
            parse_mode='Markdown',
            reply_markup=back_to_menu_keyboard()
        )
    else:
        await query.edit_message_text(
            "⚠️ *لا يمكن جلب السعر*\n\n"
            "تأكد من اتصال الإنترنت.",
            parse_mode='Markdown',
            reply_markup=back_to_menu_keyboard()
        )


async def get_analysis_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    # Get live price
    price_data = _get_price_data()
    price = price_data.get('bid', 0) if price_data else 0
    ask = price_data.get('ask', 0) if price_data else 0
    spread = round(ask - price, 2) if price_data else 0
    source = price_data.get('source', 'unknown') if price_data else 'N/A'
    source_icon = "🖥️ MT5" if source not in ('yfinance', 'api', 'cloud') else "☁️ Cloud"

    # Get full analysis
    analysis = None
    analysis_raw = None
    try:
        from technical_analysis import ta_engine
        # Try MT5 candles first
        try:
            from mt5_connector import connector
            if connector.connected:
                df = connector.get_candles('M15', 250)
                if df is not None and len(df) > 20:
                    analysis_raw = ta_engine.analyze(df)
        except Exception:
            pass
        # Fallback to cloud
        if not analysis_raw:
            from telegram_bot.cloud_data import cloud_data
            df = cloud_data.get_candles('15m', 250)
            if df is not None and len(df) > 20:
                analysis_raw = ta_engine.analyze(df)

        if analysis_raw:
            analysis = ta_engine.get_confluence_score(analysis_raw)
    except Exception as e:
        logger.debug("Analysis error: %s", e)

    if analysis and price > 0:
        direction = analysis.get('direction', 'neutral').upper()
        score = analysis.get('score', 0)
        edge = analysis.get('edge', 0)
        details = analysis.get('details', {})

        # Direction icon
        dir_icon = "🟢 صعود" if direction == 'BUY' else "🔴 هبوط" if direction == 'SELL' else "⚪ محايد"

        # Score bar
        filled = min(score, 10)
        bar = "🟩" * filled + "⬜" * (10 - filled)

        # Strength
        if score >= 8: strength = "VIP 💎"
        elif score >= 7: strength = "STRONG 🔥"
        elif score >= 6: strength = "GOOD ✅"
        elif score >= 4: strength = "MODERATE ⚠️"
        else: strength = "WEAK ❌"

        # Extract key indicators
        trend = details.get('trend', 'N/A')
        ema = details.get('ema', 'N/A')
        rsi = details.get('rsi', 'N/A')
        macd = details.get('macd', 'N/A')
        stochrsi = details.get('stochrsi', 'N/A')
        bb = details.get('bb', 'N/A')
        structure = details.get('structure', 'N/A')
        ichimoku = details.get('ichimoku', 'N/A')
        volume = details.get('volume', 'N/A')
        vwap = details.get('vwap', 'N/A')
        fib = details.get('fibonacci', 'N/A')
        candle = details.get('candle', 'N/A')
        reversal = details.get('reversal', 'NONE')
        entry_zone = details.get('entry_zone', 'NONE')
        daily_bias = details.get('daily_bias', 'N/A')
        h1_trend = details.get('h1_trend', '')
        mtf = details.get('mtf', '')

        # Support/Resistance
        sr = analysis_raw.get('support_resistance', {}) if analysis_raw else {}
        support = sr.get('support', 0)
        resistance = sr.get('resistance', 0)

        # ATR
        atr_info = analysis_raw.get('atr', {}) if analysis_raw else {}
        atr_val = atr_info.get('value', 0) if isinstance(atr_info, dict) else 0

        # Build professional message
        text = (
            "📊 *تحليل سوق الذهب — XAUUSD*\n"
            "━━━━━━━━━━━━━━━━━━━━\n\n"
            f"💰 *السعر:* `{price:.2f}` | Spread: `{spread:.2f}`\n"
            f"📡 *المصدر:* {source_icon}\n\n"
            f"📈 *الاتجاه:* {dir_icon}\n"
            f"🎯 *Score:* *{score}/10* ({strength})\n"
            f"{bar}\n"
            f"⚡ *Edge:* {edge}\n\n"
            "━━ *المؤشرات الفنية* ━━\n\n"
            f"📉 Trend: `{trend}`\n"
            f"📊 EMA: `{ema}`\n"
            f"📈 RSI: `{rsi}`\n"
            f"📉 StochRSI: `{stochrsi}`\n"
            f"📊 MACD: `{macd}`\n"
            f"📈 Ichimoku: `{ichimoku}`\n"
            f"🕯️ Candle: `{candle}`\n"
            f"📊 BB: `{bb}`\n"
            f"📈 Volume: `{volume}`\n"
            f"📉 Structure: `{structure}`\n\n"
            "━━ *المستويات المهمة* ━━\n\n"
            f"🔻 Support: `{support:.2f}`\n"
            f"🔺 Resistance: `{resistance:.2f}`\n"
            f"📏 ATR: `{atr_val:.2f}`\n"
            f"📊 VWAP: `{vwap}`\n"
            f"📐 Fibonacci: `{fib}`\n\n"
            "━━ *تحليل متقدم* ━━\n\n"
            f"🔄 Reversal: `{reversal}`\n"
            f"🎯 Entry Zone: `{entry_zone}`\n"
            f"📅 Daily Bias: `{daily_bias}`\n"
        )

        # Add H1 trend if available
        if h1_trend:
            text += f"⏰ H1 Trend: `{h1_trend}`\n"
        if mtf:
            text += f"📊 MTF: `{mtf}`\n"

        text += f"\n⏰ _آخر تحديث: {__import__('datetime').datetime.now().strftime('%H:%M:%S')}_"

        await query.edit_message_text(
            text, parse_mode='Markdown',
            reply_markup=back_to_menu_keyboard()
        )
    else:
        await query.edit_message_text(
            "📊 *تحليل السوق — XAUUSD*\n"
            "━━━━━━━━━━━━━━━━━\n\n"
            "⚠️ جاري تحميل البيانات...\n\n"
            "تأكد أن الإنترنت يعمل.\n"
            "البيانات ستتوفر خلال ثوانٍ.\n\n"
            "💡 _اضغط القائمة الرئيسية وحاول مرة أخرى_",
            parse_mode='Markdown',
            reply_markup=back_to_menu_keyboard()
        )


# =============== AI STRATEGY ===============

async def get_strategy_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show AI Strategy analysis with 3 modules"""
    query = update.callback_query
    await query.answer()

    try:
        import sys, os
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from strategy_engine import strategy_engine
        from telegram_bot.cloud_data import cloud_data

        # Get multi-timeframe data
        df_15m = cloud_data.get_candles('15m', 250)
        df_1h = cloud_data.get_candles('1h', 100)

        if df_15m is None or len(df_15m) < 50:
            await query.edit_message_text(
                "🧠 *AI Strategy*\n━━━━━━━━━━━━━\n\n⏳ جاري تحميل البيانات...",
                parse_mode='Markdown', reply_markup=back_to_menu_keyboard()
            )
            return

        result = strategy_engine.analyze_all(df_15m, df_1h)
        modules = result.get('modules', {})
        strat_score = result.get('strategy_score', 0)
        edges = result.get('active_edges', [])

        # Module 1: Swing
        sw = modules.get('swing', {}) or {}
        sw_icon = "✅" if sw.get('signal') == 'active' else "⚠️" if sw.get('valid') else "❌"
        sw_text = (
            f"{sw_icon} *Swing Patterns*\n"
            f"  📊 Swings: {sw.get('total_swings', 0)} | Reversals: {sw.get('reversals', 0)}\n"
            f"  🎯 Win Rate: {sw.get('win_rate', 0)}%\n"
            f"  💰 Expectancy: {sw.get('expectancy_R', 0)}R\n"
        )

        # Module 2: Breakout
        bk = modules.get('breakout', {}) or {}
        bk_icon = "✅" if bk.get('signal') == 'active' else "⚠️" if bk.get('valid') else "❌"
        bk_text = (
            f"{bk_icon} *Breakout Edge*\n"
            f"  📊 Breakouts: {bk.get('breakouts', 0)}\n"
            f"  🟢 Buy WR: {bk.get('buy_win_rate', 0)}% | 🔴 Sell WR: {bk.get('sell_win_rate', 0)}%\n"
            f"  💰 Expectancy: {bk.get('expectancy_R', 0)}R\n"
        )

        # Module 3: HTF Sweep
        ht = modules.get('htf_sweep', {}) or {}
        ht_icon = "✅" if ht.get('signal') == 'active' else "⚠️" if ht.get('valid') else "❌"
        ht_text = (
            f"{ht_icon} *HTF Liquidity Sweep*\n"
            f"  📊 Sweeps: {ht.get('sweeps', 0)}\n"
            f"  🎯 Win Rate: {ht.get('win_rate', 0)}%\n"
            f"  💰 Expectancy: {ht.get('expectancy_R', 0)}R\n"
        )

        # Strategy score bar
        s_bar = "🟩" * strat_score + "⬜" * (3 - strat_score)

        # Active edges
        edges_text = "\n".join([f"  ✅ {e}" for e in edges]) if edges else "  ⏳ لا يوجد إشارات نشطة"

        text = (
            "🧠 *AI Strategy Engine — XAUUSD*\n"
            "━━━━━━━━━━━━━━━━━━━━\n\n"
            f"📈 *Strategy Score:* {strat_score}/3\n"
            f"{s_bar}\n\n"
            "━━ *Module 1* ━━\n"
            f"{sw_text}\n"
            "━━ *Module 2* ━━\n"
            f"{bk_text}\n"
            "━━ *Module 3* ━━\n"
            f"{ht_text}\n"
            "━━ *Active Edges* ━━\n"
            f"{edges_text}\n\n"
            "💡 _Expectancy = (Win% × 2R) − (Loss% × 1R)_\n"
            "📏 _R:R = 1:2 | Min 15 instances_"
        )

        await query.edit_message_text(text, parse_mode='Markdown', reply_markup=back_to_menu_keyboard())

    except Exception as e:
        logger.error("Strategy error: %s", e)
        await query.edit_message_text(
            f"🧠 *AI Strategy*\n━━━━━━━━━━━━━\n\n⚠️ خطأ: `{e}`",
            parse_mode='Markdown', reply_markup=back_to_menu_keyboard()
        )


# =============== TRADE ACTIONS ===============

# =============== AI ASSISTANT MODULES ===============

def _get_ai_data():
    """Get analysis + price for AI modules"""
    analysis = None
    analysis_raw = None
    price_data = _get_price_data()
    try:
        from technical_analysis import ta_engine
        try:
            from mt5_connector import connector
            if connector.connected:
                df = connector.get_candles('M15', 250)
                if df is not None and len(df) > 20:
                    analysis_raw = ta_engine.analyze(df)
        except Exception:
            pass
        if not analysis_raw:
            from telegram_bot.cloud_data import cloud_data
            df = cloud_data.get_candles('15m', 250)
            if df is not None and len(df) > 20:
                analysis_raw = ta_engine.analyze(df)
        if analysis_raw:
            analysis = ta_engine.get_confluence_score(analysis_raw)
    except Exception:
        pass
    return analysis, analysis_raw, price_data


async def ai_daily_bias_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Module 1: Daily Bias"""
    query = update.callback_query
    await query.answer()
    try:
        import sys, os
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from ai_assistant import ai_assistant
        analysis, analysis_raw, price_data = _get_ai_data()
        sr = analysis_raw.get('support_resistance', {}) if analysis_raw else {}
        result = ai_assistant.daily_bias(analysis, price_data, sr)
        if result:
            text = (
                f"🌅 *Daily Bias — XAUUSD*\n"
                "━━━━━━━━━━━━━━━━━━━━\n\n"
                f"💰 السعر: `{result['price']:.2f}`\n"
                f"📈 *التوجه:* {result['bias']} ({result['bias_ar']})\n"
                f"🎯 Score: *{result['score']}/10*\n\n"
                f"📋 *الأسباب:*\n{result['reasons']}\n\n"
                f"👁️ *راقب:* `{result['watch_level']}`\n"
                f"❌ *إلغاء:* {result['invalidation']}\n"
                f"⏰ *أفضل جلسة:* {result['session']}\n"
                f"🎯 *Entry Zone:* `{result['entry_zone']}`\n\n"
                f"⚠️ *تجنب:* _{result['avoid']}_"
            )
        else:
            text = "🌅 *Daily Bias*\n━━━━━━━━━━\n\n⏳ جاري تحميل البيانات..."
        await query.edit_message_text(text, parse_mode='Markdown', reply_markup=back_to_menu_keyboard())
    except Exception as e:
        await query.edit_message_text(f"⚠️ خطأ: `{e}`", parse_mode='Markdown', reply_markup=back_to_menu_keyboard())


async def ai_macro_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Module 2: Macro Intel"""
    query = update.callback_query
    await query.answer()
    try:
        import sys, os
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from ai_assistant import ai_assistant
        _, _, price_data = _get_ai_data()
        result = ai_assistant.macro_intel(price_data)
        text = (
            "🏛️ *Macro Intel — XAUUSD*\n"
            "━━━━━━━━━━━━━━━━━━━━\n\n"
            f"💰 السعر: `{result['price']:.2f}`\n\n"
            f"📊 *Gold:* {result['gold_env']}\n"
            f"⏰ *Session:* {result['session']}\n"
            f"💵 *DXY:* {result['dxy_note']}\n"
            f"📰 *أخبار:* {result['key_note']}\n\n"
            f"🎯 *الخلاصة:* {result['action']}\n\n"
            f"⏰ _{datetime.now().strftime('%H:%M')}_"
        )
        await query.edit_message_text(text, parse_mode='Markdown', reply_markup=back_to_menu_keyboard())
    except Exception as e:
        await query.edit_message_text(f"⚠️ خطأ: `{e}`", parse_mode='Markdown', reply_markup=back_to_menu_keyboard())


async def ai_gonogo_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Module 6: GO/NO-GO Validator"""
    query = update.callback_query
    await query.answer()
    try:
        import sys, os
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from ai_assistant import ai_assistant
        analysis, analysis_raw, price_data = _get_ai_data()
        if not analysis or not price_data:
            await query.edit_message_text("⏳ جاري التحميل...", reply_markup=back_to_menu_keyboard())
            return

        direction = analysis.get('direction', 'buy')
        score = analysis.get('score', 0)
        edge = analysis.get('edge', 0)
        details = analysis.get('details', {})
        price = price_data.get('bid', 0)

        # Extract RSI value
        rsi_str = details.get('rsi', '50')
        import re
        rsi_match = re.search(r'\d+', str(rsi_str))
        rsi = int(rsi_match.group()) if rsi_match else 50

        sr = analysis_raw.get('support_resistance', {}) if analysis_raw else {}
        support = sr.get('support', price - 10)
        resistance = sr.get('resistance', price + 10)
        atr = analysis_raw.get('atr', {}).get('value', 8) if analysis_raw else 8
        if isinstance(atr, dict):
            atr = atr.get('value', 8)

        if direction == 'buy':
            entry, sl, tp = price, round(support - 2, 2), round(price + atr * 2, 2)
        else:
            entry, sl, tp = price, round(resistance + 2, 2), round(price - atr * 2, 2)

        result = ai_assistant.go_nogo(direction, entry, sl, tp, score, edge, rsi, datetime.now().hour)

        reasons_text = "\n".join([f"  {r}" for r in result['reasons']])
        dir_icon = "🟢 BUY" if direction == 'buy' else "🔴 SELL"

        text = (
            "🚦 *GO / NO-GO — XAUUSD*\n"
            "━━━━━━━━━━━━━━━━━━━━\n\n"
            f"📊 Setup: *{dir_icon}* @ `{entry:.2f}`\n"
            f"❌ SL: `{sl:.2f}` | ✅ TP: `{tp:.2f}`\n"
            f"📈 R:R: *1:{result['rr']}*\n"
            f"🎯 Score: *{score}/10* | Edge: {edge}\n\n"
            f"⚠️ *3 أسباب ضد الصفقة:*\n{reasons_text}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━\n"
            f"📋 *الحكم:* {result['verdict']}\n"
            f"━━━━━━━━━━━━━━━━━━━━\n\n"
            f"{result['instructions']}"
        )
        await query.edit_message_text(text, parse_mode='Markdown', reply_markup=back_to_menu_keyboard())
    except Exception as e:
        await query.edit_message_text(f"⚠️ خطأ: `{e}`", parse_mode='Markdown', reply_markup=back_to_menu_keyboard())


async def ai_risk_calc_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Module 7: Risk Calculator"""
    query = update.callback_query
    await query.answer()
    try:
        import sys, os
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from ai_assistant import ai_assistant
        analysis, analysis_raw, price_data = _get_ai_data()

        # Get account balance
        balance = 100  # Default
        try:
            from mt5_connector import connector
            if connector.connected:
                acc = connector.get_account_info()
                if acc:
                    balance = acc.get('balance', 100)
        except Exception:
            pass

        direction = analysis.get('direction', 'buy') if analysis else 'buy'
        sr = analysis_raw.get('support_resistance', {}) if analysis_raw else {}
        price = price_data.get('bid', 0) if price_data else 0
        support = sr.get('support', price - 10)
        resistance = sr.get('resistance', price + 10)

        if direction == 'buy':
            sl_pips = abs(price - support)
        else:
            sl_pips = abs(resistance - price)
        sl_pips = max(sl_pips, 3)

        result = ai_assistant.risk_calculator(balance, 1.0, sl_pips, direction)
        if result:
            warnings = "\n".join([f"  {w}" for w in result['warnings']]) if result['warnings'] else "  ✅ كل شيء ضمن الحدود"
            text = (
                "🧮 *Risk Calculator — XAUUSD*\n"
                "━━━━━━━━━━━━━━━━━━━━\n\n"
                f"💰 *الرصيد:* `${balance:.2f}`\n"
                f"📊 *الاتجاه:* {result['dir_text']}\n"
                f"⚠️ *المخاطرة:* 1% = `${result['risk_amount']:.2f}`\n\n"
                "━━ *حساب اللوت* ━━\n\n"
                f"📏 SL: `{sl_pips:.1f}` pips\n"
                f"📊 *Lot Size:* `{result['lot_size']:.2f}`\n"
                f"💰 Risk: `${result['risk_amount']:.2f}`\n"
                f"🎯 Target (2:1): `${result['tp_amount']:.2f}`\n\n"
                "━━ *إدارة المخاطر* ━━\n\n"
                f"📉 الحد اليومي المتبقي: `${result['remaining_dd']:.2f}`\n"
                f"📊 صفقات متاحة اليوم: *{result['max_trades_left']}*\n\n"
                f"⚠️ *تنبيهات:*\n{warnings}"
            )
        else:
            text = "🧮 *Risk Calculator*\n━━━━━━━━━━\n\n⚠️ بيانات غير كافية"
        await query.edit_message_text(text, parse_mode='Markdown', reply_markup=back_to_menu_keyboard())
    except Exception as e:
        await query.edit_message_text(f"⚠️ خطأ: `{e}`", parse_mode='Markdown', reply_markup=back_to_menu_keyboard())


async def ai_menu_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """AI Assistant sub-menu"""
    query = update.callback_query
    await query.answer()
    from telegram_bot.keyboards import ai_menu_keyboard
    await query.edit_message_text(
        "🤖 *AI Trading Assistant*\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "اختر الأداة:",
        parse_mode='Markdown',
        reply_markup=ai_menu_keyboard()
    )


# =============== TRADE ACTIONS ===============

async def enter_trade_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    tid = query.from_user.id
    sig_id = query.data.split(':')[1]

    # Use current signal OR last cached signal (so users can enter late)
    sig, _, _ = _get_signal_data()
    if not sig or not sig.get('is_tradeable'):
        sig = _last_tradeable_signal  # Fallback to last signal

    if not sig:
        await query.answer("⚠️ لا توجد توصية حالياً", show_alert=True)
        return

    direction = sig.get('direction', '')
    entry = sig.get('entry_price', sig.get('price', 0))

    # Use pre-calculated TP/SL from engine
    tp1 = sig.get('tp1', 0)
    tp2 = sig.get('tp2', 0)
    sl = sig.get('sl', 0)

    # Fallback if not set
    if tp1 == 0 or sl == 0:
        atr_info = sig.get('indicators', {}).get('atr', {})
        atr_val = atr_info.get('value', 5.0) if isinstance(atr_info, dict) else 5.0
        if direction == 'buy':
            tp1 = round(entry + atr_val * 1.5, 2)
            tp2 = round(entry + atr_val * 2.5, 2)
            sl = round(entry - atr_val * 1.2, 2)
        else:
            tp1 = round(entry - atr_val * 1.5, 2)
            tp2 = round(entry - atr_val * 2.5, 2)
            sl = round(entry + atr_val * 1.2, 2)

    trade_id = db.create_trade(tid, sig_id, direction, entry, tp1, sl, query.message.message_id)

    # Notify signal generator
    try:
        from signal_generator import signal_generator
        signal_generator.user_enter()
    except Exception:
        pass

    open_count = db.get_open_trades_count(tid)
    dir_emoji = "🟢 BUY" if direction == 'buy' else "🔴 SELL"
    await query.answer("✅ تم تسجيل دخولك!")
    await query.edit_message_text(
        f"📊 *صفقة مفتوحة — {dir_emoji}*\n"
        "━━━━━━━━━━━━━━━━━\n\n"
        f"💰 Entry: `{entry:.2f}`\n"
        f"✅ TP1: `{tp1:.2f}` 🎯\n"
        f"🏆 TP2: `{tp2:.2f}` 💎\n"
        f"❌ SL: `{sl:.2f}`\n\n"
        f"📈 الصفقات المفتوحة: {open_count}\n\n"
        "💡 _أغلق نصف الصفقة عند TP1، واترك الباقي لـ TP2_\n\n"
        "عند إغلاق الصفقة، اختر النتيجة:",
        parse_mode='Markdown',
        reply_markup=active_trade_keyboard(trade_id)
    )
    logger.info("[TG] User %s entered trade #%s", tid, trade_id)


async def skip_signal_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer("⏭️ تم تخطي التوصية")
    await query.edit_message_text(
        "⏭️ *تم تخطي التوصية*\n\n"
        "📋 *القائمة الرئيسية:*",
        parse_mode='Markdown', reply_markup=main_menu_keyboard()
    )


async def trade_result_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle profit/loss/skip buttons"""
    query = update.callback_query
    data = query.data
    action, trade_id = data.split(':')
    trade_id = int(trade_id)

    if action == 'trade_profit':
        db.close_trade(trade_id, 'profit', 0)
        await query.answer("💰 مبروك! تم تسجيل الربح!")
        await query.edit_message_text(
            "💰 *تم الربح بنجاح!* ✅\n"
            "━━━━━━━━━━━━━━━━━\n\n"
            "مبروك عليك! 🎉\n"
            "استمر بالتداول الذكي مع AIOK Trading.",
            parse_mode='Markdown', reply_markup=trade_closed_keyboard()
        )
    elif action == 'trade_loss':
        db.close_trade(trade_id, 'loss', 0)
        await query.answer("❌ تم تسجيل الخسارة")
        await query.edit_message_text(
            "❌ *خسارة*\n"
            "━━━━━━━━━━━━━━━━━\n\n"
            "لا تقلق، الخسارة جزء من التداول.\n"
            "التوصية التالية ستكون أفضل! 💪",
            parse_mode='Markdown', reply_markup=trade_closed_keyboard()
        )
    elif action == 'trade_skip':
        db.close_trade(trade_id, 'skipped', 0)
        await query.answer("⏭️ تم التخطي")
        await query.edit_message_text(
            "⏭️ *تم تخطي الصفقة*", parse_mode='Markdown', reply_markup=trade_closed_keyboard()
        )


async def trade_detail_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    trade_id = int(query.data.split(':')[1])
    await query.answer()

    trades = db.get_open_trades(query.from_user.id)
    trade = next((t for t in trades if t['id'] == trade_id), None)
    if not trade:
        await query.edit_message_text("⚠️ الصفقة غير موجودة.", reply_markup=back_to_menu_keyboard())
        return

    dir_emoji = "🟢 BUY" if trade['direction'] == 'buy' else "🔴 SELL"
    await query.edit_message_text(
        f"📊 *تفاصيل الصفقة — {dir_emoji}*\n"
        "━━━━━━━━━━━━━━━━━\n\n"
        f"💰 Entry: `{trade['entry_price']:.2f}`\n"
        f"✅ TP: `{trade['tp']:.2f}`\n"
        f"❌ SL: `{trade['sl']:.2f}`\n"
        f"📅 الوقت: {trade['created_at'][:16]}\n",
        parse_mode='Markdown',
        reply_markup=active_trade_keyboard(trade_id)
    )


# =============== MY TRADES / STATS ===============

async def my_trades_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    tid = query.from_user.id

    open_trades = db.get_open_trades(tid)
    recent = db.get_user_trades(tid, limit=5)

    text = "📈 *صفقاتي*\n━━━━━━━━━━━━━━━━━\n\n"

    if open_trades:
        text += f"🔓 *الصفقات المفتوحة ({len(open_trades)}/{get_max_trades()}):*\n"
        for t in open_trades:
            d = "🟢" if t['direction'] == 'buy' else "🔴"
            text += f"  {d} Entry: {t['entry_price']:.2f} | TP: {t['tp']:.2f}\n"
        text += "\n"
    else:
        text += "🔓 لا توجد صفقات مفتوحة حالياً\n\n"

    closed = [t for t in recent if t['status'] == 'closed']
    if closed:
        text += "📋 *آخر الصفقات المغلقة:*\n"
        for t in closed[:5]:
            r = {'profit': '💰', 'loss': '❌', 'skipped': '⏭️'}.get(t['result'], '❓')
            text += f"  {r} {t['direction'].upper()} @ {t['entry_price']:.2f} — {t['result']}\n"

    await query.edit_message_text(text, parse_mode='Markdown', reply_markup=back_to_menu_keyboard())


async def my_stats_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    tid = query.from_user.id

    stats = db.get_user_stats(tid)
    if not stats:
        await query.edit_message_text("⚠️ لا توجد إحصائيات بعد.", reply_markup=back_to_menu_keyboard())
        return

    await query.edit_message_text(
        "📉 *إحصائياتي*\n"
        "━━━━━━━━━━━━━━━━━\n\n"
        f"📊 إجمالي الصفقات: *{stats['total_trades']}*\n"
        f"💰 ربح: *{stats['wins']}* | ❌ خسارة: *{stats['losses']}*\n"
        f"⏭️ تخطي: *{stats['skips']}*\n"
        f"📈 نسبة النجاح: *{stats['win_rate']}%*\n\n"
        f"🔓 صفقات مفتوحة: *{stats['open_trades']}/{stats['max_trades']}*",
        parse_mode='Markdown',
        reply_markup=back_to_menu_keyboard()
    )


async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /stats command"""
    tid = update.effective_user.id
    if not db.is_registered(tid):
        await update.message.reply_text("يجب التسجيل أولاً. أرسل /start")
        return

    stats = db.get_user_stats(tid)
    if not stats:
        await update.message.reply_text("⚠️ لا توجد إحصائيات بعد.")
        return

    await update.message.reply_text(
        "📉 *إحصائياتي*\n"
        "━━━━━━━━━━━━━━━━━\n\n"
        f"📊 إجمالي الصفقات: *{stats['total_trades']}*\n"
        f"💰 ربح: *{stats['wins']}* | ❌ خسارة: *{stats['losses']}*\n"
        f"⏭️ تخطي: *{stats['skips']}*\n"
        f"📈 نسبة النجاح: *{stats['win_rate']}%*\n\n"
        f"🔓 صفقات مفتوحة: *{stats['open_trades']}/{stats['max_trades']}*",
        parse_mode='Markdown'
    )


# =============== DISCLAIMER & SUBSCRIBE ===============

async def user_disclaimer_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    await query.edit_message_text(
        "⚠️ *إخلاء مسؤولية*\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "📌 AIOK Trading يقدم *6 توصيات تجريبية*\n"
        "*مجانية* لتجربة الخدمة قبل الاشتراك.\n\n"
        "⚠️ التداول في الأسواق المالية ينطوي على\n"
        "*مخاطر عالية* وقد تخسر *كامل رأس مالك*.\n\n"
        "✅ القرار النهائي للدخول أو الخروج من أي\n"
        "صفقة يعود *للمتداول وحده*.\n\n"
        "🚫 AIOK Trading *غير مسؤول* عن أي خسائر\n"
        "ناتجة عن استخدام التوصيات.\n\n"
        "📊 الأداء السابق *لا يضمن* النتائج المستقبلية.\n\n"
        "💡 باستمرارك باستخدام البوت، أنت توافق\n"
        "على هذه الشروط.",
        parse_mode='Markdown',
        reply_markup=back_to_menu_keyboard()
    )


async def user_subscribe_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    tid = query.from_user.id
    is_prem = db.is_premium_user(tid)
    free_left = db.get_free_signals_left(tid)

    if is_prem:
        status_text = "💎 *حالتك: Premium*\n✅ لديك توصيات غير محدودة!"
    elif free_left > 0:
        status_text = f"🆓 *حالتك: مجاني*\n📊 متبقي لديك: *{free_left}* توصيات مجانية"
    else:
        status_text = "🔒 *حالتك: منتهي*\n⚠️ استنفدت توصياتك المجانية"

    await query.edit_message_text(
        "💎 *AIOK Trading — Premium*\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"{status_text}\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "🔓 *ماذا تحصل مع Premium؟*\n"
        "✅ توصيات غير محدودة 24/7\n"
        "✅ تحليل AI يومي للسوق\n"
        "✅ إشعارات فورية بدون تأخير\n"
        "✅ دعم فني مباشر\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "📱 *Payment Method:*\n\n"
        "1️⃣ *Wish Money:*\n"
        "   Number: `+96171101381`\n\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        "📋 *خطوات الاشتراك:*\n"
        "1️⃣ ادفع عبر الطريقة أعلاه\n"
        "2️⃣ أرسل صورة الإيصال هنا في البوت\n"
        "3️⃣ سيتم تفعيل حسابك خلال دقائق ⚡\n\n"
        "📩 للتواصل: @Y88y5",
        parse_mode='Markdown',
        reply_markup=back_to_menu_keyboard()
    )


# =============== HELP ===============

async def help_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    await query.edit_message_text(
        "ℹ️ *مساعدة — AIOK Trading Bot*\n"
        "━━━━━━━━━━━━━━━━━\n\n"
        "🔥 *التوصيات:* ستصلك تلقائياً\n"
        "✅ اضغط *دخلت الصفقة* عند الدخول\n"
        "💰 اضغط *تم الربح* عند إغلاقها بربح\n"
        "❌ اضغط *خسرت* عند الخسارة\n"
        "⏭️ اضغط *تخطي* لتجاوز التوصية\n\n"
        "📊 الحد الأقصى: *6 صفقات مفتوحة*\n\n"
        "📋 *الأوامر:*\n"
        "/start — التسجيل/القائمة\n"
        "/menu — القائمة الرئيسية\n"
        "/signal — آخر توصية\n"
        "/price — السعر الحالي\n"
        "/stats — إحصائياتي\n"
        "/help — المساعدة",
        parse_mode='Markdown',
        reply_markup=back_to_menu_keyboard()
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "ℹ️ *AIOK Trading Bot*\n\n"
        "/start — التسجيل\n"
        "/menu — القائمة\n"
        "/signal — آخر توصية\n"
        "/price — السعر الحالي\n"
        "/stats — إحصائياتي\n"
        "/help — المساعدة\n\n"
        "📩 أرسل صورة أو رسالة للتواصل مع المشرف\n"
        "👤 أو تواصل مع: @Y88y5",
        parse_mode='Markdown'
    )


async def signal_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /signal command — show latest signal"""
    tid = update.effective_user.id
    if not db.is_registered(tid):
        await update.message.reply_text("يجب التسجيل أولاً. أرسل /start")
        return

    sig, state, signals_today = _get_signal_data()

    if not sig or sig.get('direction') == 'neutral' or not sig.get('is_tradeable'):
        score = sig.get('score', 0) if sig else 0
        real_score = score
        try:
            from telegram_bot.cloud_signal_engine import cloud_signal_engine
            engine_state = cloud_signal_engine.state
            if 'Score' in str(engine_state):
                import re
                m = re.search(r'Score\s+(\d+)', str(engine_state))
                if m:
                    real_score = int(m.group(1))
        except Exception:
            pass

        await update.message.reply_text(
            "📊 *حالة السوق الآن*\n"
            "━━━━━━━━━━━━━━━━━\n\n"
            "🔍 لا توجد توصية حالياً\n\n"
            f"📈 قوة الإشارة: *{real_score}/10*\n"
            f"🎯 المطلوب: *6/10* أو أعلى\n\n"
            f"🤖 المحرك: `{state}`\n"
            f"📊 توصيات اليوم: *{signals_today}*\n\n"
            "⏳ _يتم الفحص كل دقيقتين تلقائياً_",
            parse_mode='Markdown'
        )
    else:
        text = format_signal_message(sig)
        sig_id = sig.get('signal_id', sig.get('id', 0))
        await update.message.reply_text(
            text, parse_mode='Markdown',
            reply_markup=signal_keyboard(sig_id)
        )


async def price_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /price command — show current price"""
    tid = update.effective_user.id
    if not db.is_registered(tid):
        await update.message.reply_text("يجب التسجيل أولاً. أرسل /start")
        return

    price_data = _get_price_data()
    if price_data and price_data.get('bid'):
        bid = price_data['bid']
        ask = price_data.get('ask', bid)
        spread = round(ask - bid, 2)
        source = price_data.get('source', 'unknown')
        source_icon = "☁️" if source in ('yfinance', 'api') else "🖥️"
        note = "\n⚠️ _سعر تقريبي (±$3) — شغّل MT5 للدقة_" if source == 'yfinance' else ""
        await update.message.reply_text(
            "💰 *سعر XAUUSD الحالي*\n"
            "━━━━━━━━━━━━━━━━━\n\n"
            f"📈 Bid: `{bid:.2f}`\n"
            f"📉 Ask: `{ask:.2f}`\n"
            f"📊 Spread: `{spread:.2f}`\n"
            f"📡 المصدر: {source_icon}\n\n"
            f"⏰ التحديث: الآن{note}",
            parse_mode='Markdown'
        )
    else:
        await update.message.reply_text(
            "⚠️ *لا يمكن جلب السعر*\n\nتأكد من اتصال الإنترنت.",
            parse_mode='Markdown'
        )


# =============== USER MESSAGE / RECEIPT FORWARDING ===============

async def handle_user_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Forward user photos (receipts) to admin"""
    tid = update.effective_user.id
    if _is_admin(tid):
        return  # Admin photos ignored

    if not db.is_registered(tid):
        return

    user = db.get_user(tid)
    name = user['full_name'] if user else 'مجهول'

    # Forward photo to admin
    if ADMIN_ID:
        try:
            await context.bot.send_message(
                ADMIN_ID,
                f"📩 *رسالة صورة من مستخدم:*\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"👤 {name}\n"
                f"🆔 `{tid}`\n"
                f"📱 {user.get('phone', 'N/A')}\n\n"
                f"💡 لتفعيل: `/premium {tid} 30`",
                parse_mode='Markdown'
            )
            await update.message.forward(ADMIN_ID)
        except Exception as e:
            logger.debug("Failed to forward photo: %s", e)

    await update.message.reply_text(
        "✅ *تم استلام الإيصال!*\n\n"
        "سيتم مراجعته وتفعيل حسابك قريباً ⚡\n\n"
        "📩 للاستفسار: @Y88y5",
        parse_mode='Markdown'
    )


async def handle_user_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Forward user text messages to admin (support)"""
    tid = update.effective_user.id
    if _is_admin(tid):
        return

    if not db.is_registered(tid):
        return

    # Don't forward commands
    if update.message.text and update.message.text.startswith('/'):
        return

    user = db.get_user(tid)
    name = user['full_name'] if user else 'مجهول'
    text = update.message.text or ''

    if ADMIN_ID:
        try:
            await context.bot.send_message(
                ADMIN_ID,
                f"📩 *رسالة من مستخدم:*\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"👤 {name} | 🆔 `{tid}`\n\n"
                f"💬 {text}\n\n"
                f"↩️ للرد: `/dm {tid}`",
                parse_mode='Markdown'
            )
        except Exception:
            pass

    await update.message.reply_text(
        "✅ تم إرسال رسالتك للمشرف!\n"
        "📩 سيتم الرد قريباً أو تواصل مع: @Y88y5"
    )


# =============== HELPER ===============

def format_signal_message(sig):
    direction = sig.get('direction', 'neutral')
    dir_emoji = "🟢 BUY شراء" if direction == 'buy' else "🔴 SELL بيع"
    score = int(sig.get('score', 0))
    strength = sig.get('strength', '')
    entry = sig.get('entry_price', sig.get('price', 0))

    # USE pre-calculated TP/SL from engine (NOT recalculate!)
    tp1 = sig.get('tp1', 0)
    tp2 = sig.get('tp2', 0)
    sl = sig.get('sl', 0)

    # Fallback if not set
    if tp1 == 0 or sl == 0:
        atr_info = sig.get('indicators', {}).get('atr', {})
        atr_val = atr_info.get('value', 5.0) if isinstance(atr_info, dict) else 5.0
        if direction == 'buy':
            tp1 = round(entry + atr_val * 1.5, 2)
            tp2 = round(entry + atr_val * 2.5, 2)
            sl = round(entry - atr_val * 1.0, 2)
        else:
            tp1 = round(entry - atr_val * 1.5, 2)
            tp2 = round(entry - atr_val * 2.5, 2)
            sl = round(entry + atr_val * 1.0, 2)

    # SANITY CHECK: TP must be in correct direction
    if direction == 'buy':
        if tp1 <= entry or tp2 <= entry or sl >= entry:
            atr_info = sig.get('indicators', {}).get('atr', {})
            atr_val = atr_info.get('value', 5.0) if isinstance(atr_info, dict) else 5.0
            tp1 = round(entry + atr_val * 1.5, 2)
            tp2 = round(entry + atr_val * 2.5, 2)
            sl = round(entry - atr_val * 1.0, 2)
    else:
        if tp1 >= entry or tp2 >= entry or sl <= entry:
            atr_info = sig.get('indicators', {}).get('atr', {})
            atr_val = atr_info.get('value', 5.0) if isinstance(atr_info, dict) else 5.0
            tp1 = round(entry - atr_val * 1.5, 2)
            tp2 = round(entry - atr_val * 2.5, 2)
            sl = round(entry + atr_val * 1.0, 2)

    # Calculate pips
    tp1_pips = abs(tp1 - entry)
    tp2_pips = abs(tp2 - entry)
    sl_pips = abs(sl - entry)
    rr1 = round(tp1_pips / sl_pips, 1) if sl_pips > 0 else 0
    rr2 = round(tp2_pips / sl_pips, 1) if sl_pips > 0 else 0

    details = sig.get('confluence_details', {})
    trend = details.get('trend', 'N/A')
    ema = details.get('ema', 'N/A')
    rsi = details.get('rsi', 'N/A')
    macd = details.get('macd', 'N/A')
    h1_trend = details.get('h1_trend', '')
    mtf = details.get('mtf', '')
    sr_position = details.get('sr_position', '')
    entry_zone = details.get('entry_zone', '')
    supertrend = details.get('supertrend', '')
    pivots = details.get('pivots', '')
    hull_ma = details.get('hull_ma', '')
    williams_r = details.get('williams_r', '')

    # Support/Resistance from engine
    indicators = sig.get('indicators', {})
    support = indicators.get('support', 0)
    resistance = indicators.get('resistance', 0)

    # ====== CLASSIFY STRATEGY TYPE ======
    # Marcus Breakout: near S/R zone + breakout pattern
    # Dennis Trend: strong ADX trend + pullback
    adx_str = trend  # e.g. "UP (ADX 54)"
    adx_val = 20
    try:
        if 'ADX' in str(adx_str):
            adx_val = int(''.join(c for c in str(adx_str).split('ADX')[1] if c.isdigit())[:2])
    except:
        pass

    is_marcus = sr_position in ('near_resistance', 'near_support') or 'ZONE' in str(entry_zone)
    is_dennis = adx_val >= 25 and not is_marcus

    if is_marcus:
        strategy_name = "MARCUS BREAKOUT"
        strategy_icon = "🎯"
    elif is_dennis:
        strategy_name = "DENNIS TREND"
        strategy_icon = "📈"
    else:
        strategy_name = "VIP SIGNAL"
        strategy_icon = "🔥"

    # Confidence bar
    filled = "🟩" * min(score, 10)
    empty = "⬜" * max(0, 10 - score)

    # Risk
    risk_level = sig.get('risk_level', 'NORMAL')
    risk_warnings = sig.get('risk_warnings', [])
    if risk_level == 'HIGH':
        risk_icon = "🟡 حذر"
    elif risk_level == 'MEDIUM':
        risk_icon = "🟠 متوسط"
    else:
        risk_icon = "🟢 طبيعي"

    # Data source
    source = sig.get('source', 'Cloud ☁️')

    # ====== BUILD PROFESSIONAL MESSAGE ======
    text = (
        f"{strategy_icon} *AIOK Trading — {strategy_name}*\n"
        f"━━━━━━━━━━━━━━━━━━━━\n\n"
        f"📊 {dir_emoji} — *XAUUSD*\n\n"
        f"🎯 Confidence: *{score}/10* ({strength})\n"
        f"{filled}{empty}\n\n"
    )

    # Strategy-specific header
    if is_marcus:
        if sr_position == 'near_resistance':
            text += f"🔍 *نوع الصفقة:* رفض من المقاومة\n"
            text += f"📐 *المنطقة:* `{resistance:.2f}`\n\n"
        elif sr_position == 'near_support':
            text += f"🔍 *نوع الصفقة:* ارتداد من الدعم\n"
            text += f"📐 *المنطقة:* `{support:.2f}`\n\n"
        else:
            text += f"🔍 *نوع الصفقة:* اختراق S/R\n\n"
    elif is_dennis:
        text += f"🔍 *نوع الصفقة:* تتبع ترند + Pullback\n"
        text += f"📈 *قوة الترند:* `{trend}`\n\n"

    # Entry, TP, SL
    text += (
        f"💰 *Entry:* `{entry:.2f}`\n"
        f"✅ *TP1:* `{tp1:.2f}` _({'+' if direction == 'buy' else '-'}${tp1_pips:.2f})_ 🎯\n"
        f"🏆 *TP2:* `{tp2:.2f}` _({'+' if direction == 'buy' else '-'}${tp2_pips:.2f})_ 💎\n"
        f"❌ *SL:* `{sl:.2f}` _(-${sl_pips:.2f})_\n\n"
        f"📊 *R:R* — TP1: `1:{rr1}` | TP2: `1:{rr2}`\n\n"
    )

    # ====== TRADE MANAGEMENT ======
    if is_dennis:
        text += (
            f"⚙️ *إدارة الصفقة (طريقة دينيس):*\n"
            f"  ├ عند TP1: أغلق 50% + SL → Entry\n"
            f"  ├ بعد TP1: Trailing Stop ${sl_pips:.0f} خلف السعر\n"
            f"  └ عند TP2: أغلق كل شيء\n\n"
        )
    elif is_marcus:
        text += (
            f"⚙️ *إدارة الصفقة (طريقة ماركوس):*\n"
            f"  ├ عند TP1: أغلق 50% + SL → Entry\n"
            f"  ├ حرّك SL إلى Break-Even فوراً\n"
            f"  └ اترك 50% نحو TP2\n\n"
        )
    else:
        text += (
            f"⚙️ *إدارة الصفقة:*\n"
            f"  ├ عند TP1: أغلق 50% + SL → Entry\n"
            f"  └ اترك الباقي نحو TP2\n\n"
        )

    # Technical Analysis
    text += f"📉 *التحليل الفني:*\n"
    text += f"  ├ Trend: `{trend}`\n"
    text += f"  ├ EMA: `{ema}`\n"
    text += f"  ├ RSI: `{rsi}`\n"
    text += f"  └ MACD: `{macd}`\n"

    # Pro indicators (if available)
    pro_lines = []
    if supertrend:
        pro_lines.append(f"Supertrend: `{supertrend}`")
    if pivots:
        pro_lines.append(f"Pivots: `{pivots}`")
    if hull_ma:
        pro_lines.append(f"Hull MA: `{hull_ma}`")
    if williams_r:
        pro_lines.append(f"Williams: `{williams_r}`")

    if pro_lines:
        text += f"\n🔬 *مؤشرات متقدمة:*\n"
        for i, line in enumerate(pro_lines):
            prefix = "  └" if i == len(pro_lines) - 1 else "  ├"
            text += f"{prefix} {line}\n"

    # Multi-timeframe
    primary_tf = details.get('primary_tf', 'M5')
    m15_trend = details.get('m15_trend', '')
    m15_confirm = details.get('m15_confirm', '')

    text += f"\n⏱️ *Multi-Timeframe:*\n"
    text += f"  ├ {primary_tf}: `{trend}` _(Primary)_\n"
    if m15_trend:
        m15_icon = "✅" if m15_confirm == 'CONFIRMED' else "⚠️" if m15_confirm == 'AGAINST' else ""
        text += f"  ├ M15: `{m15_trend}` {m15_icon}\n"
    if h1_trend:
        text += f"  └ H1: `{h1_trend}` {mtf}\n"

    # S/R Zones
    sup_zone = details.get('sup_zone', '')
    res_zone = details.get('res_zone', '')

    text += f"\n📐 *مناطق الدعم والمقاومة:*\n"
    if res_zone:
        text += f"  🔺 المقاومة: `{res_zone}`\n"
    elif resistance > 0 and resistance < 99999:
        text += f"  🔺 المقاومة: `{resistance:.2f}`\n"
    if sup_zone:
        text += f"  🔻 الدعم: `{sup_zone}`\n"
    elif support > 0:
        text += f"  🔻 الدعم: `{support:.2f}`\n"

    if sr_position == 'near_resistance':
        text += f"  📍 _السعر عند المقاومة — منطقة بيع_\n"
    elif sr_position == 'near_support':
        text += f"  📍 _السعر عند الدعم — منطقة شراء_\n"

    # Risk section
    text += f"\n🚦 *المخاطر:* {risk_icon}\n"
    for w in risk_warnings:
        text += f"{w}\n"

    # Strategy explanation
    if is_marcus:
        if direction == 'buy':
            text += f"\n💡 _ماركوس: السعر ارتد من دعم قوي بحجم مرتفع — فرصة شراء_\n"
        else:
            text += f"\n💡 _ماركوس: السعر رُفض من مقاومة قوية — فرصة بيع_\n"
    elif is_dennis:
        if direction == 'buy':
            text += f"\n💡 _دينيس: ترند صاعد قوي + تصحيح صحي — اركب الموجة_\n"
        else:
            text += f"\n💡 _دينيس: ترند هابط قوي + تصحيح صعودي — بيع مع الاتجاه_\n"
    else:
        text += f"\n💡 _أغلق نصف الصفقة عند TP1 واترك الباقي_\n"

    # Risk management reminder
    text += f"\n⚠️ *إدارة المخاطر:*\n"
    text += f"  • لا تخاطر بأكثر من 1-2% من حسابك\n"
    text += f"  • وقف الخسارة إلزامي — لا تحذفه أبداً\n"

    text += f"\n📊 *AIOK Signal Engine V3* {source}"

    return text


