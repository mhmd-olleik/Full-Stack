"""
AIOK Trading - Trade Executor VIP PRO
Executes trades on MT5 with full risk management + trailing stops
"""

import MetaTrader5 as mt5
import logging
from datetime import datetime
from mt5_connector import connector
from risk_manager import risk_manager

logger = logging.getLogger(__name__)

MAGIC_NUMBER = 202504  # Unique identifier for our bot's trades


class TradeExecutor:
    """VIP PRO Trade Executor with full risk protection"""

    def __init__(self):
        self.active_trades = []
        self.trade_history = []

    def execute_trade(self, signal, account_info=None, symbol_info=None):
        """
        Execute a trade with FULL risk management validation.
        Multiple safety checks before any order is sent.
        """
        if not connector.connected:
            return {'success': False, 'error': 'MT5 not connected'}

        if not signal or not signal.get('is_tradeable'):
            return {'success': False, 'error': 'Signal not tradeable'}

        # STEP 1: Validate signal with risk manager
        valid, reason = risk_manager.validate_signal(signal)
        if not valid:
            logger.warning("[TRADE] Signal rejected: %s", reason)
            return {'success': False, 'error': 'Risk check failed: %s' % reason}

        # STEP 2: Check if trading is allowed (daily limits, session, etc)
        open_positions = connector.get_open_positions()
        can_trade, trade_reason = risk_manager.can_trade(account_info, len(open_positions))
        if not can_trade:
            logger.warning("[TRADE] Trading blocked: %s", trade_reason)
            return {'success': False, 'error': 'Trading blocked: %s' % trade_reason}

        # STEP 3: Check for conflicting positions
        direction = signal['direction']
        for pos in open_positions:
            if pos.get('magic') == MAGIC_NUMBER:
                if pos.get('type') != direction:
                    logger.warning("[TRADE] Conflicting position exists: %s vs %s", pos.get('type'), direction)
                    return {'success': False, 'error': 'Conflicting position open (hedging not allowed)'}

        # STEP 4: Calculate position size (dynamic based on score + risk state)
        balance = account_info.get('balance', 0) if account_info else 0
        if balance <= 0:
            return {'success': False, 'error': 'Insufficient balance: $%.2f' % balance}

        sl_distance = signal.get('sl_distance', 5.0)
        score = signal.get('score', 0)
        lot_size = risk_manager.calculate_position_size(balance, sl_distance, symbol_info, score)

        # STEP 5: Prepare order
        price = signal['price']
        sl = signal['sl']
        tp = signal['tp']

        # Get current price for execution
        tick = mt5.symbol_info_tick(connector.symbol)
        if tick is None:
            return {'success': False, 'error': 'Failed to get current price'}

        if direction == 'buy':
            order_type = mt5.ORDER_TYPE_BUY
            execution_price = tick.ask
        elif direction == 'sell':
            order_type = mt5.ORDER_TYPE_SELL
            execution_price = tick.bid
        else:
            return {'success': False, 'error': 'Invalid direction: %s' % direction}

        # STEP 6: Verify SL/TP are valid
        if direction == 'buy':
            if sl >= execution_price:
                return {'success': False, 'error': 'Invalid BUY SL: %.2f >= price %.2f' % (sl, execution_price)}
            if tp <= execution_price:
                return {'success': False, 'error': 'Invalid BUY TP: %.2f <= price %.2f' % (tp, execution_price)}
        else:
            if sl <= execution_price:
                return {'success': False, 'error': 'Invalid SELL SL: %.2f <= price %.2f' % (sl, execution_price)}
            if tp >= execution_price:
                return {'success': False, 'error': 'Invalid SELL TP: %.2f >= price %.2f' % (tp, execution_price)}

        # STEP 7: Build and send order
        comment = 'AIOK Trading S:%d/15' % score
        request = {
            'action': mt5.TRADE_ACTION_DEAL,
            'symbol': connector.symbol,
            'volume': lot_size,
            'type': order_type,
            'price': execution_price,
            'sl': sl,
            'tp': tp,
            'magic': MAGIC_NUMBER,
            'comment': comment,
            'type_time': mt5.ORDER_TIME_GTC,
            'type_filling': mt5.ORDER_FILLING_IOC,
        }

        logger.info("[TRADE] Sending %s order: Lot=%.2f | Price=%.2f | SL=%.2f | TP=%.2f | Score=%d/15",
                    direction.upper(), lot_size, execution_price, sl, tp, score)

        result = mt5.order_send(request)

        if result is None:
            error = mt5.last_error()
            return {'success': False, 'error': 'Order send failed: %s' % str(error)}

        if result.retcode != mt5.TRADE_RETCODE_DONE:
            return {
                'success': False,
                'error': 'Order rejected: %s (code: %d)' % (result.comment, result.retcode),
                'retcode': result.retcode,
            }

        # Trade executed successfully
        trade = {
            'ticket': result.order,
            'type': direction,
            'volume': lot_size,
            'price': execution_price,
            'sl': sl,
            'tp': tp,
            'score': score,
            'time': datetime.now().isoformat(),
            'magic': MAGIC_NUMBER,
            'status': 'open',
            'trailing_active': False,
        }

        self.active_trades.append(trade)

        logger.info("[TRADE] EXECUTED! Ticket #%s | %s %.2f lots @ %.2f | SL=%.2f | TP=%.2f",
                    result.order, direction.upper(), lot_size, execution_price, sl, tp)

        return {
            'success': True,
            'ticket': result.order,
            'trade': trade,
        }

    def close_trade(self, ticket):
        """Close a specific trade by ticket number"""
        if not connector.connected:
            return {'success': False, 'error': 'MT5 not connected'}

        position = mt5.positions_get(ticket=ticket)
        if position is None or len(position) == 0:
            return {'success': False, 'error': 'Position #%s not found' % ticket}

        pos = position[0]

        if pos.type == 0:  # Buy position
            close_type = mt5.ORDER_TYPE_SELL
            close_price = mt5.symbol_info_tick(pos.symbol).bid
        else:  # Sell position
            close_type = mt5.ORDER_TYPE_BUY
            close_price = mt5.symbol_info_tick(pos.symbol).ask

        request = {
            'action': mt5.TRADE_ACTION_DEAL,
            'symbol': pos.symbol,
            'volume': pos.volume,
            'type': close_type,
            'position': ticket,
            'price': close_price,
            'magic': MAGIC_NUMBER,
            'comment': 'AIOK Trading Close',
            'type_time': mt5.ORDER_TIME_GTC,
            'type_filling': mt5.ORDER_FILLING_IOC,
        }

        result = mt5.order_send(request)

        if result and result.retcode == mt5.TRADE_RETCODE_DONE:
            # Record PnL in risk manager
            risk_manager.record_trade_result(pos.profit)

            # Move from active to history
            for trade in self.active_trades:
                if trade.get('ticket') == ticket:
                    trade['status'] = 'closed'
                    trade['close_price'] = close_price
                    trade['pnl'] = pos.profit
                    trade['close_time'] = datetime.now().isoformat()
                    self.trade_history.append(trade)
                    self.active_trades.remove(trade)
                    break

            logger.info("[TRADE] Closed #%s | PnL: $%.2f | Daily: $%.2f",
                       ticket, pos.profit, risk_manager.daily_pnl)
            return {'success': True, 'pnl': pos.profit}
        else:
            error = result.comment if result else 'Unknown error'
            return {'success': False, 'error': 'Close failed: %s' % error}

    def modify_sl(self, ticket, new_sl):
        """Modify stop loss of an open position"""
        if not connector.connected:
            return False

        position = mt5.positions_get(ticket=ticket)
        if position is None or len(position) == 0:
            return False

        pos = position[0]

        request = {
            'action': mt5.TRADE_ACTION_SLTP,
            'symbol': pos.symbol,
            'position': ticket,
            'sl': new_sl,
            'tp': pos.tp,
            'magic': MAGIC_NUMBER,
        }

        result = mt5.order_send(request)
        if result and result.retcode == mt5.TRADE_RETCODE_DONE:
            logger.info("[TRAIL] SL modified #%s -> %.2f", ticket, new_sl)
            return True
        return False

    def manage_trailing_stops(self, atr_value):
        """Update trailing stops for all active AIOK trades"""
        if not connector.connected:
            return

        positions = connector.get_open_positions()

        for pos in positions:
            if pos.get('magic') != MAGIC_NUMBER:
                continue

            tick = mt5.symbol_info_tick(connector.symbol)
            if tick is None:
                continue

            current_price = tick.bid if pos['type'] == 'buy' else tick.ask

            # Find if trailing was already active
            is_trailing = False
            for trade in self.active_trades:
                if trade.get('ticket') == pos['ticket']:
                    is_trailing = trade.get('trailing_active', False)
                    break

            new_sl, is_active = risk_manager.calculate_trailing_stop(
                direction=pos['type'],
                entry_price=pos['price_open'],
                current_price=current_price,
                atr_value=atr_value,
                current_sl=pos['sl'],
                is_trailing_active=is_trailing,
            )

            if is_active and new_sl != pos['sl']:
                success = self.modify_sl(pos['ticket'], new_sl)
                if success:
                    for trade in self.active_trades:
                        if trade.get('ticket') == pos['ticket']:
                            trade['trailing_active'] = True
                            trade['sl'] = new_sl
                            break

    def close_all_positions(self):
        """Emergency close all AIOK positions"""
        positions = connector.get_open_positions()
        results = []

        for pos in positions:
            if pos.get('magic') == MAGIC_NUMBER:
                result = self.close_trade(pos['ticket'])
                results.append(result)

        logger.warning("[TRADE] Emergency close: %d positions", len(results))
        risk_manager.emergency_shutdown("Emergency close triggered")
        return results

    def get_active_trades(self):
        """Get list of active trades"""
        return self.active_trades

    def get_trade_history(self):
        """Get trade history"""
        return self.trade_history


# Singleton instance
trade_executor = TradeExecutor()
