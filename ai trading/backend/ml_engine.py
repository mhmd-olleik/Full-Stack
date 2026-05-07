"""
AIOK Trading — ML Engine
Machine Learning pattern recognition for XAUUSD price prediction
Uses Random Forest for pattern classification
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import logging
import os
import joblib

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models')


class MLEngine:
    """Machine Learning engine for trading signal prediction"""

    def __init__(self):
        self.rf_model = None
        self.gb_model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.accuracy = 0
        self.feature_names = []

    def prepare_features(self, df, indicators=None):
        """
        Extract ML features from price data and indicators.
        Returns feature matrix and labels.
        """
        if df is None or len(df) < 60:
            return None, None

        features = pd.DataFrame(index=df.index)

        close = df['close']
        high = df['high']
        low = df['low']
        volume = df['volume']

        # ---- Price-based features ----
        # Returns at various lookbacks
        for period in [1, 3, 5, 10, 20]:
            features[f'return_{period}'] = close.pct_change(period)

        # Price position relative to range
        features['high_low_range'] = (high - low) / close
        features['close_position'] = (close - low) / (high - low).replace(0, np.nan)

        # Candle body and wick ratios
        features['body_ratio'] = abs(close - df['open']) / (high - low).replace(0, np.nan)
        features['upper_wick'] = (high - df[['close', 'open']].max(axis=1)) / (high - low).replace(0, np.nan)
        features['lower_wick'] = (df[['close', 'open']].min(axis=1) - low) / (high - low).replace(0, np.nan)

        # ---- Momentum features ----
        # RSI
        delta = close.diff()
        gain = delta.where(delta > 0, 0).rolling(14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14).mean()
        rs = gain / loss.replace(0, np.nan)
        features['rsi'] = 100 - (100 / (1 + rs))

        # MACD
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        features['macd'] = ema12 - ema26
        features['macd_signal'] = features['macd'].ewm(span=9, adjust=False).mean()
        features['macd_hist'] = features['macd'] - features['macd_signal']

        # ---- Trend features ----
        for period in [10, 20, 50]:
            sma = close.rolling(period).mean()
            features[f'sma_{period}_dist'] = (close - sma) / sma

        # EMA relationship
        ema50 = close.ewm(span=50, adjust=False).mean()
        ema200 = close.ewm(span=200, adjust=False).mean()
        features['ema_ratio'] = ema50 / ema200

        # ---- Volatility features ----
        features['volatility_20'] = close.pct_change().rolling(20).std()
        features['atr_norm'] = self._calc_atr_series(high, low, close, 14) / close

        # Bollinger Band position
        bb_middle = close.rolling(20).mean()
        bb_std = close.rolling(20).std()
        features['bb_position'] = (close - (bb_middle - 2 * bb_std)) / (4 * bb_std).replace(0, np.nan)
        features['bb_width'] = (4 * bb_std) / bb_middle

        # ---- Volume features ----
        features['volume_ratio'] = volume / volume.rolling(20).mean().replace(0, np.nan)
        features['volume_trend'] = volume.rolling(5).mean() / volume.rolling(20).mean().replace(0, np.nan)

        # ---- Pattern features ----
        # Consecutive up/down candles
        features['consecutive_up'] = (close > df['open']).rolling(5).sum()
        features['consecutive_down'] = (close < df['open']).rolling(5).sum()

        # Distance from recent high/low
        features['dist_from_high_20'] = (close - high.rolling(20).max()) / close
        features['dist_from_low_20'] = (close - low.rolling(20).min()) / close

        # ---- Labels ----
        # Future return (next 5 candles)
        future_return = close.shift(-5) / close - 1
        labels = pd.Series(0, index=df.index)  # 0 = neutral
        labels[future_return > 0.001] = 1   # Buy signal (price goes up > 0.1%)
        labels[future_return < -0.001] = -1  # Sell signal (price goes down > 0.1%)

        # Clean NaN
        features = features.fillna(0)
        features = features.replace([np.inf, -np.inf], 0)

        self.feature_names = features.columns.tolist()

        return features, labels

    def _calc_atr_series(self, high, low, close, period):
        """Calculate ATR as a pandas Series"""
        tr = pd.concat([
            high - low,
            (high - close.shift(1)).abs(),
            (low - close.shift(1)).abs()
        ], axis=1).max(axis=1)
        return tr.rolling(period).mean()

    def train(self, df):
        """
        Train ML models on historical data.
        Returns training accuracy.
        """
        try:
            features, labels = self.prepare_features(df)
            if features is None:
                return 0

            # Remove rows with NaN labels (future data not available)
            valid_mask = labels.notna() & (labels != 0) | (labels == 0)
            # Remove last 5 rows (no future labels)
            valid_mask.iloc[-5:] = False
            # Remove first 200 rows (insufficient indicator data)
            valid_mask.iloc[:200] = False

            X = features[valid_mask].values
            y = labels[valid_mask].values

            if len(X) < 100:
                logger.warning("Not enough training data")
                return 0

            # Scale features
            X_scaled = self.scaler.fit_transform(X)

            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y, test_size=0.2, shuffle=False  # Don't shuffle time series
            )

            # Random Forest
            self.rf_model = RandomForestClassifier(
                n_estimators=200,
                max_depth=10,
                min_samples_split=20,
                min_samples_leaf=10,
                random_state=42,
                n_jobs=-1
            )
            self.rf_model.fit(X_train, y_train)
            rf_accuracy = self.rf_model.score(X_test, y_test) * 100

            # Gradient Boosting
            self.gb_model = GradientBoostingClassifier(
                n_estimators=150,
                max_depth=5,
                learning_rate=0.05,
                min_samples_split=20,
                random_state=42
            )
            self.gb_model.fit(X_train, y_train)
            gb_accuracy = self.gb_model.score(X_test, y_test) * 100

            self.accuracy = max(rf_accuracy, gb_accuracy)
            self.is_trained = True

            logger.info("ML Models trained - RF: %.1f%% | GB: %.1f%%", rf_accuracy, gb_accuracy)

            # Save models
            self._save_models()

            return self.accuracy

        except Exception as e:
            logger.error(f"ML training error: {e}")
            return 0

    def predict(self, df):
        """
        Make prediction on current market data.
        Returns: direction, probability, confidence
        """
        if not self.is_trained:
            return {
                'direction': 'neutral',
                'probability': 50.0,
                'confidence': 0,
                'signal': 'neutral'
            }

        try:
            features, _ = self.prepare_features(df)
            if features is None:
                return {'direction': 'neutral', 'probability': 50.0, 'confidence': 0, 'signal': 'neutral'}

            # Get last row (current state)
            X = features.iloc[-1:].values
            X_scaled = self.scaler.transform(X)

            # Random Forest prediction
            rf_proba = self.rf_model.predict_proba(X_scaled)[0]
            rf_classes = self.rf_model.classes_

            # Gradient Boosting prediction
            gb_proba = self.gb_model.predict_proba(X_scaled)[0]

            # Ensemble: average probabilities
            avg_proba = (rf_proba + gb_proba) / 2

            # Find probabilities for each class
            buy_prob = 0
            sell_prob = 0
            for i, cls in enumerate(rf_classes):
                if cls == 1:
                    buy_prob = avg_proba[i] * 100
                elif cls == -1:
                    sell_prob = avg_proba[i] * 100

            # Determine direction
            if buy_prob > sell_prob and buy_prob > 55:
                direction = 'buy'
                probability = buy_prob
            elif sell_prob > buy_prob and sell_prob > 55:
                direction = 'sell'
                probability = sell_prob
            else:
                direction = 'neutral'
                probability = max(buy_prob, sell_prob)

            confidence = abs(buy_prob - sell_prob)

            return {
                'direction': direction,
                'probability': round(probability, 1),
                'buy_prob': round(buy_prob, 1),
                'sell_prob': round(sell_prob, 1),
                'confidence': round(confidence, 1),
                'signal': direction if probability > 60 else 'neutral',
                'model_accuracy': round(self.accuracy, 1),
            }

        except Exception as e:
            logger.error(f"ML prediction error: {e}")
            return {'direction': 'neutral', 'probability': 50.0, 'confidence': 0, 'signal': 'neutral'}

    def _save_models(self):
        """Save trained models to disk"""
        try:
            os.makedirs(MODEL_PATH, exist_ok=True)
            joblib.dump(self.rf_model, os.path.join(MODEL_PATH, 'rf_model.pkl'))
            joblib.dump(self.gb_model, os.path.join(MODEL_PATH, 'gb_model.pkl'))
            joblib.dump(self.scaler, os.path.join(MODEL_PATH, 'scaler.pkl'))
            logger.info("ML models saved to disk")
        except Exception as e:
            logger.error(f"Failed to save models: {e}")

    def _load_models(self):
        """Load trained models from disk"""
        try:
            rf_path = os.path.join(MODEL_PATH, 'rf_model.pkl')
            gb_path = os.path.join(MODEL_PATH, 'gb_model.pkl')
            scaler_path = os.path.join(MODEL_PATH, 'scaler.pkl')

            if os.path.exists(rf_path) and os.path.exists(gb_path):
                self.rf_model = joblib.load(rf_path)
                self.gb_model = joblib.load(gb_path)
                self.scaler = joblib.load(scaler_path)
                self.is_trained = True
                logger.info("ML models loaded from disk")
                return True
        except Exception as e:
            logger.error(f"Failed to load models: {e}")
        return False


# Singleton instance
ml_engine = MLEngine()
