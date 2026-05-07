"""
Economic News Calendar - Finnhub Integration
Fetches today's economic events and warns about high-impact ones.
"""

import requests
import logging
from datetime import datetime, timedelta

logger = logging.getLogger('MT5')

class NewsCalendar:
    """Economic calendar with impact-based trading alerts"""

    FINNHUB_API_KEY = 'd7oua81r01qmthudjjagd7oua81r01qmthudjjb0'
    BASE_URL = 'https://finnhub.io/api/v1/calendar/economic'

    # Events that directly impact GOLD (XAUUSD)
    GOLD_IMPACT_EVENTS = [
        'Fed Interest Rate Decision', 'Fed Press Conference',
        'FOMC', 'Non-Farm Payrolls', 'NFP', 'CPI', 'Core CPI',
        'PPI', 'GDP', 'Unemployment Rate', 'Initial Jobless Claims',
        'Retail Sales', 'Consumer Confidence', 'ISM Manufacturing',
        'PCE Price Index', 'Core PCE', 'Durable Goods Orders',
        'Trade Balance', 'Housing Starts', 'Existing Home Sales',
        'Fed Chair', 'Powell', 'Treasury', 'Inflation',
    ]

    # Countries that matter for gold
    GOLD_COUNTRIES = ['US', 'EU', 'GB', 'JP', 'CN', 'CH']

    def __init__(self):
        self.events_cache = []
        self.last_fetch = None
        self.cache_duration = timedelta(minutes=30)  # Refresh every 30min
        self.lebanon_offset = timedelta(hours=3)  # UTC+3

    def fetch_today_events(self):
        """Fetch economic events for today from Finnhub"""
        now = datetime.utcnow()

        # Use cache if fresh
        if self.last_fetch and (now - self.last_fetch) < self.cache_duration and self.events_cache:
            return self.events_cache

        try:
            today = now.strftime('%Y-%m-%d')
            tomorrow = (now + timedelta(days=1)).strftime('%Y-%m-%d')

            response = requests.get(self.BASE_URL, params={
                'from': today,
                'to': today,
                'token': self.FINNHUB_API_KEY
            }, timeout=10)

            if response.status_code == 200:
                data = response.json()
                raw_events = data.get('economicCalendar', [])

                # Filter and enrich events
                events = []
                for ev in raw_events:
                    country = ev.get('country', '')
                    event_name = ev.get('event', '')
                    impact = ev.get('impact', 'low')
                    time_str = ev.get('time', '')

                    # Only keep relevant countries
                    if country not in self.GOLD_COUNTRIES:
                        continue

                    # Parse time
                    event_time = None
                    lebanon_time = ''
                    if time_str:
                        try:
                            event_time = datetime.strptime(time_str, '%Y-%m-%d %H:%M:%S')
                            lebanon_dt = event_time + self.lebanon_offset
                            lebanon_time = lebanon_dt.strftime('%H:%M')
                        except:
                            lebanon_time = time_str

                    # Check if it's a gold-moving event
                    is_gold_event = any(
                        keyword.lower() in event_name.lower()
                        for keyword in self.GOLD_IMPACT_EVENTS
                    )

                    # Upgrade impact if it's a known gold mover
                    if is_gold_event and impact != 'high':
                        impact = 'high' if 'Fed' in event_name or 'NFP' in event_name else 'medium'

                    events.append({
                        'event': event_name,
                        'country': country,
                        'impact': impact,
                        'time_utc': time_str,
                        'time_lebanon': lebanon_time,
                        'event_time': event_time,
                        'actual': ev.get('actual'),
                        'estimate': ev.get('estimate'),
                        'prev': ev.get('prev'),
                        'unit': ev.get('unit', ''),
                        'is_gold_event': is_gold_event,
                    })

                # Sort by impact (high first) then time
                impact_order = {'high': 0, 'medium': 1, 'low': 2}
                events.sort(key=lambda x: (impact_order.get(x['impact'], 3), x['time_utc']))

                self.events_cache = events
                self.last_fetch = now
                logger.info("[NEWS] Fetched %d events (%d high impact)",
                           len(events),
                           sum(1 for e in events if e['impact'] == 'high'))
                return events

        except Exception as e:
            logger.warning("[NEWS] Failed to fetch events: %s", str(e))

        return self.events_cache or []

    def get_trading_warning(self):
        """Check if there's a high-impact event coming soon"""
        events = self.fetch_today_events()
        now = datetime.utcnow()

        warnings = []
        for ev in events:
            if ev['impact'] != 'high' or not ev.get('event_time'):
                continue

            event_time = ev['event_time']
            minutes_until = (event_time - now).total_seconds() / 60

            # Warning: 30 minutes before and 15 minutes after
            if -15 <= minutes_until <= 30:
                if minutes_until > 0:
                    warnings.append({
                        'type': 'DANGER',
                        'message': '⚠️ %s in %.0f min! DON\'T TRADE!' % (ev['event'], minutes_until),
                        'event': ev['event'],
                        'minutes_until': round(minutes_until),
                        'should_block': True,
                    })
                else:
                    warnings.append({
                        'type': 'CAUTION',
                        'message': '⏳ %s just happened (%.0f min ago). Wait for volatility to settle.' % (ev['event'], abs(minutes_until)),
                        'event': ev['event'],
                        'minutes_until': round(minutes_until),
                        'should_block': True,
                    })

            # Heads up: 1-2 hours before
            elif 30 < minutes_until <= 120:
                warnings.append({
                    'type': 'HEADS_UP',
                    'message': '📰 %s at %s (in %.0f min). Be careful!' % (ev['event'], ev['time_lebanon'], minutes_until),
                    'event': ev['event'],
                    'minutes_until': round(minutes_until),
                    'should_block': False,
                })

        return warnings

    def should_block_trading(self):
        """Returns True if trading should be blocked due to upcoming event"""
        warnings = self.get_trading_warning()
        return any(w['should_block'] for w in warnings)

    def get_summary(self):
        """Get a clean summary for the dashboard"""
        events = self.fetch_today_events()
        warnings = self.get_trading_warning()

        # Get high and medium impact events
        high = [e for e in events if e['impact'] == 'high']
        medium = [e for e in events if e['impact'] == 'medium' and e['is_gold_event']]

        return {
            'events': [{
                'event': e['event'],
                'country': e['country'],
                'impact': e['impact'],
                'time': e['time_lebanon'],
                'actual': e['actual'],
                'estimate': e['estimate'],
                'prev': e['prev'],
                'unit': e['unit'],
            } for e in (high + medium)[:10]],
            'warnings': warnings,
            'should_block': self.should_block_trading(),
            'total_high_impact': len(high),
            'next_event': high[0]['event'] + ' @ ' + high[0]['time_lebanon'] if high else None,
        }
