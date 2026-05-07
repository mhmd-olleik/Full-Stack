"""
AIOK Trading — Professional Trading Assistant V1
================================================
8 AI Modules for XAUUSD traders:
1. Daily Bias       - Pre-market direction analysis
2. Macro Intel      - Institutional macro briefing
3. Weekly Calendar  - High-impact event roadmap
4. Pattern Finder   - Weekly trade review & mistakes
5. AI Journal       - Continuous trade tracking
6. GO/NO-GO         - Pre-trade validator
7. Risk Calculator  - Position sizing & prop firm safety
8. Post-Trade Debrief - Honest trade review
"""

import logging
from datetime import datetime
import numpy as np

logger = logging.getLogger('AIOK.AI_ASSIST')


class AITradingAssistant:
    """Complete AI Trading Assistant with 8 modules"""

    def __init__(self):
        self.journal_entries = []
        self.trade_count = 0

    # ========== MODULE 1: DAILY BIAS ==========
    def daily_bias(self, analysis, price_data, sr_data):
        """Generate morning pre-market bias"""
        if not analysis or not price_data:
            return None

        price = price_data.get('bid', 0)
        direction = analysis.get('direction', 'neutral')
        score = analysis.get('score', 0)
        details = analysis.get('details', {})
        
        support = sr_data.get('support', 0) if sr_data else 0
        resistance = sr_data.get('resistance', 0) if sr_data else 0
        trend = details.get('trend', 'N/A')
        ema = details.get('ema', 'N/A')
        daily_bias_d = details.get('daily_bias', 'N/A')
        structure = details.get('structure', 'N/A')
        entry_zone = details.get('entry_zone', 'NONE')

        # Determine bias
        if direction == 'buy' and score >= 6:
            bias = "🟢 BULLISH"
            bias_ar = "صعودي"
            scenario_avoid = f"لا تبيع فوق {support:.2f} — الترند صاعد"
            watch_level = f"Support: {support:.2f}"
            invalidation = f"كسر {support:.2f} يلغي السيناريو"
            session = "London + NY (أفضل سيولة)"
        elif direction == 'sell' and score >= 6:
            bias = "🔴 BEARISH"
            bias_ar = "هبوطي"
            scenario_avoid = f"لا تشتري تحت {resistance:.2f} — الترند هابط"
            watch_level = f"Resistance: {resistance:.2f}"
            invalidation = f"كسر {resistance:.2f} يلغي السيناريو"
            session = "London + NY"
        else:
            bias = "⚪ NEUTRAL / RANGE"
            bias_ar = "محايد — تداول من الحدود"
            scenario_avoid = "لا تدخل منتصف الرينج"
            watch_level = f"S: {support:.2f} | R: {resistance:.2f}"
            invalidation = "انتظر كسر واضح"
            session = "London فقط"

        reasons = []
        if 'UP' in trend: reasons.append(f"📈 Trend: {trend}")
        elif 'DOWN' in trend: reasons.append(f"📉 Trend: {trend}")
        if 'BULLISH' in ema: reasons.append(f"📊 EMA: {ema}")
        elif 'BEARISH' in ema: reasons.append(f"📊 EMA: {ema}")
        if 'BULL' in structure: reasons.append(f"🔄 Structure: {structure}")
        elif 'BEAR' in structure: reasons.append(f"🔄 Structure: {structure}")
        reasons_text = "\n".join([f"  {r}" for r in reasons[:4]]) if reasons else "  بيانات غير كافية"

        return {
            'bias': bias,
            'bias_ar': bias_ar,
            'score': score,
            'reasons': reasons_text,
            'watch_level': watch_level,
            'invalidation': invalidation,
            'session': session,
            'avoid': scenario_avoid,
            'entry_zone': entry_zone,
            'price': price,
        }

    # ========== MODULE 2: MACRO INTEL ==========
    def macro_intel(self, price_data):
        """Institutional macro briefing"""
        price = price_data.get('bid', 0) if price_data else 0
        hour = datetime.now().hour

        # Gold typical behavior
        if price > 3000:
            gold_env = "🟡 Gold في بيئة High-Value — تقلبات عالية متوقعة"
        else:
            gold_env = "🟡 Gold في بيئة مستقرة"

        # Session analysis
        if 0 <= hour < 8:
            session = "🌏 Asian Session — سيولة منخفضة، حركة محدودة"
        elif 8 <= hour < 15:
            session = "🇬🇧 London Session — أعلى سيولة للذهب"
        elif 15 <= hour < 22:
            session = "🇺🇸 NY Session — تقلبات عالية مع البيانات الاقتصادية"
        else:
            session = "🌙 Off-Hours — تجنب الدخول"

        return {
            'gold_env': gold_env,
            'session': session,
            'price': price,
            'dxy_note': "📊 راقب DXY — علاقة عكسية مع الذهب",
            'key_note': "⚠️ أي بيانات Fed أو CPI تؤثر بشكل كبير على الذهب",
            'action': "✅ تداول مع الترند + انتظر تأكيد الجلسة",
        }

    # ========== MODULE 6: GO/NO-GO ==========
    def go_nogo(self, direction, entry, sl, tp, score, edge, rsi, session_time):
        """Pre-trade validator — brutally honest"""
        risk = abs(entry - sl)
        reward = abs(tp - entry)
        rr = reward / risk if risk > 0 else 0

        reasons_against = []
        verdict = "GO ✅"
        warnings = []

        # Check R:R
        if rr < 1.5:
            reasons_against.append(f"❌ R:R ضعيف ({rr:.1f}) — المطلوب 1.5+")
            verdict = "NO-GO ❌"

        # Check score
        if score < 6:
            reasons_against.append(f"❌ Score منخفض ({score}/10) — المطلوب 6+")
            verdict = "NO-GO ❌"

        # Check edge
        if edge < 1.5:
            reasons_against.append(f"⚠️ Edge ضعيف ({edge}) — لا اتجاه واضح")
            if verdict != "NO-GO ❌":
                verdict = "WAIT ⏳"

        # Check RSI extremes
        if direction == 'buy' and rsi > 75:
            reasons_against.append(f"⚠️ RSI مرتفع جداً ({rsi:.0f}) — قد يكون فات الأوان")
            if verdict == "GO ✅":
                verdict = "WAIT ⏳"
        elif direction == 'sell' and rsi < 25:
            reasons_against.append(f"⚠️ RSI منخفض جداً ({rsi:.0f}) — قد يرتد")
            if verdict == "GO ✅":
                verdict = "WAIT ⏳"

        # Check session
        hour = datetime.now().hour
        if hour < 7 or hour > 22:
            reasons_against.append("⚠️ خارج أوقات التداول — سيولة منخفضة")
            if verdict == "GO ✅":
                verdict = "WAIT ⏳"

        # Fill remaining with general warnings
        if len(reasons_against) < 3:
            if rr < 2:
                reasons_against.append(f"📉 R:R ليس مثالي ({rr:.1f}) — الأفضل 2+")
            if score < 8:
                reasons_against.append(f"📊 Score ليس VIP ({score}/10) — انتظر 8+")
            reasons_against.append("⚠️ تأكد من عدم وجود أخبار خلال ساعة")

        # Instructions if GO
        if verdict == "GO ✅":
            instructions = f"🎯 ادخل عند {entry:.2f}\n⛔ SL: {sl:.2f}\n🏆 TP: {tp:.2f}\n💡 حرّك SL لـ breakeven عند +{risk:.0f}$"
        else:
            instructions = "⏳ انتظر تحسن الظروف أو setup أقوى"

        return {
            'verdict': verdict,
            'reasons': reasons_against[:3],
            'rr': round(rr, 1),
            'instructions': instructions,
        }

    # ========== MODULE 7: RISK CALCULATOR ==========
    def risk_calculator(self, balance, risk_pct, sl_pips, direction, daily_pnl=0, max_daily_dd=None):
        """Position sizing & prop firm risk management"""
        if balance <= 0 or sl_pips <= 0:
            return None

        risk_amount = balance * (risk_pct / 100)
        pip_value_per_lot = 10  # XAUUSD: $10 per pip per lot
        lot_size = risk_amount / (sl_pips * pip_value_per_lot)
        lot_size = round(lot_size, 2)

        # Target at 2:1 R:R
        tp_amount = risk_amount * 2

        # Daily drawdown
        if max_daily_dd is None:
            max_daily_dd = balance * 0.05  # 5% default

        remaining_dd = max_daily_dd - abs(daily_pnl)
        max_trades_left = int(remaining_dd / risk_amount) if risk_amount > 0 else 0

        # Warnings
        warnings = []
        if lot_size > 1.0:
            warnings.append("⚠️ Lot size كبير — تأكد من المخاطرة")
        if remaining_dd < risk_amount:
            warnings.append("🚨 تخطيت حد الخسارة اليومي!")
        if risk_pct > 2:
            warnings.append("⚠️ مخاطرة عالية — الأفضل 1-2%")
        if max_trades_left <= 1:
            warnings.append("⚠️ آخر صفقة متاحة اليوم!")

        return {
            'lot_size': lot_size,
            'risk_amount': round(risk_amount, 2),
            'tp_amount': round(tp_amount, 2),
            'remaining_dd': round(remaining_dd, 2),
            'max_trades_left': max_trades_left,
            'warnings': warnings,
            'dir_text': "🟢 BUY" if direction == 'buy' else "🔴 SELL",
        }


# Singleton
ai_assistant = AITradingAssistant()
