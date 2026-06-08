"""
ml_service.py

Carrega modelos LSTM + XGBoost pré-treinados em disco e realiza inferência.

Workflow esperado:
  1. Rode `python backend/train.py` uma vez para treinar e salvar modelos.
  2. A API carrega os modelos no startup — inferência < 100 ms.

Arquivos esperados em backend/models/ (gerados por train.py):
  {TICKER_SAFE}_lstm.keras
  {TICKER_SAFE}_xgb.pkl
  {TICKER_SAFE}_scaler.pkl
  {TICKER_SAFE}_predictions.json
"""

import json
import logging
import threading
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import yfinance as yf
import joblib

log = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).parent.parent / "models"
SEQUENCE_LENGTH = 60
FORECAST_DAYS = 30
TEST_CHART_POINTS = 180  # últimos N pontos do período de teste para o gráfico

from services.data_service import SLUG_TO_TICKER


class MLService:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._model_cache: dict[str, dict] = {}
        self._pred_cache: dict[str, dict] = {}
        self._available_slugs: set[str] = set()
        self._scan_available_models()

    # ── startup scan ──────────────────────────────────────────────────────────

    def _scan_available_models(self) -> None:
        if not MODELS_DIR.exists():
            log.warning("Pasta models/ não encontrada. Execute: python backend/train.py")
            return
        for slug, ticker in SLUG_TO_TICKER.items():
            ticker_safe = ticker.replace(".", "_")
            pred_file = MODELS_DIR / f"{ticker_safe}_predictions.json"
            if pred_file.exists():
                self._available_slugs.add(slug)
        log.info("Modelos disponíveis: %s", sorted(self._available_slugs))

    def available_models(self) -> list[str]:
        return sorted(self._available_slugs)

    # ── public API ────────────────────────────────────────────────────────────

    def get_predictions(self, slug: str) -> Optional[dict]:
        slug = slug.lower()
        if slug not in self._available_slugs:
            return None

        cached = self._pred_cache.get(slug)
        if cached:
            return cached

        try:
            result = self._build_predictions(slug)
            with self._lock:
                self._pred_cache[slug] = result
            return result
        except Exception as exc:
            log.error("Erro ao gerar predições para %s: %s", slug, exc, exc_info=True)
            return None

    # ── prediction builder ────────────────────────────────────────────────────

    def _build_predictions(self, slug: str) -> dict:
        ticker = SLUG_TO_TICKER[slug]
        ticker_safe = ticker.replace(".", "_")

        # Carrega predições pré-computadas do período de teste
        pred_path = MODELS_DIR / f"{ticker_safe}_predictions.json"
        with open(pred_path, encoding="utf-8") as f:
            cached = json.load(f)

        # Retorna apenas os últimos N pontos para legibilidade do gráfico
        n = len(cached["test_dates"])
        start = max(0, n - TEST_CHART_POINTS)
        test_period = [
            {
                "date": cached["test_dates"][i],
                "actual": round(float(cached["actual"][i]), 2),
                "lstm": round(float(cached["lstm"][i]), 2),
                "hybrid": round(float(cached["hybrid"][i]), 2),
            }
            for i in range(start, n)
        ]

        # Gera previsão dos próximos FORECAST_DAYS dias com modelos salvos
        forecast = self._generate_forecast(slug, ticker, ticker_safe)

        return {
            "slug": slug,
            "ticker": ticker,
            "test_period": test_period,
            "forecast": forecast,
            "metrics": cached["metrics"],
        }

    def _generate_forecast(self, slug: str, ticker: str, ticker_safe: str) -> dict:
        try:
            from keras.models import load_model as keras_load

            lstm_path = MODELS_DIR / f"{ticker_safe}_lstm.keras"
            xgb_path = MODELS_DIR / f"{ticker_safe}_xgb.pkl"
            scaler_path = MODELS_DIR / f"{ticker_safe}_scaler.pkl"

            if not (lstm_path.exists() and xgb_path.exists() and scaler_path.exists()):
                log.warning("Arquivos de modelo incompletos para %s — sem forecast.", ticker)
                return {"from_date": "", "lstm": [], "hybrid": []}

            models = self._model_cache.get(slug)
            if not models:
                log.info("Carregando modelos para %s...", ticker)
                lstm_model = keras_load(str(lstm_path), compile=False)
                xgb_model = joblib.load(str(xgb_path))
                scaler = joblib.load(str(scaler_path))
                models = {"lstm": lstm_model, "xgb": xgb_model, "scaler": scaler}
                with self._lock:
                    self._model_cache[slug] = models

            lstm_model = models["lstm"]
            xgb_model = models["xgb"]
            scaler = models["scaler"]

            # Dados recentes para seed da sequência de forecast
            hist = yf.Ticker(ticker).history(period="6mo", auto_adjust=True)
            close_vals = hist["Close"].dropna().values

            if len(close_vals) < SEQUENCE_LENGTH:
                return {"from_date": "", "lstm": [], "hybrid": []}

            # Escala usando o scaler salvo (treinado somente sobre Close)
            close_scaled = scaler.transform(close_vals.reshape(-1, 1)).flatten()
            sequence = close_scaled[-SEQUENCE_LENGTH:].copy()

            # Forecast autorregressivo: cada predição vira input da próxima
            lstm_preds_scaled = []
            for _ in range(FORECAST_DAYS):
                x_in = sequence[-SEQUENCE_LENGTH:].reshape(1, SEQUENCE_LENGTH, 1)
                pred = float(lstm_model.predict(x_in, verbose=0)[0, 0])
                lstm_preds_scaled.append(pred)
                sequence = np.append(sequence[1:], pred)

            lstm_arr = np.array(lstm_preds_scaled)

            # Correção XGBoost no espaço normalizado
            grad = np.gradient(lstm_arr)
            xgb_features = np.column_stack([lstm_arr, grad, np.abs(grad)])
            xgb_adj = xgb_model.predict(xgb_features)
            hybrid_arr = lstm_arr + xgb_adj

            # Desnormaliza
            lstm_prices = scaler.inverse_transform(lstm_arr.reshape(-1, 1)).flatten()
            hybrid_prices = scaler.inverse_transform(hybrid_arr.reshape(-1, 1)).flatten()

            # Datas de negociação futuras (dias úteis)
            last_date = hist.index[-1]
            forecast_dates = pd.bdate_range(start=last_date + pd.Timedelta(days=1), periods=FORECAST_DAYS)
            from_date = forecast_dates[0].strftime("%Y-%m-%d")

            lstm_forecast = [
                {"date": d.strftime("%Y-%m-%d"), "price": round(float(p), 2)}
                for d, p in zip(forecast_dates, lstm_prices)
            ]
            hybrid_forecast = [
                {"date": d.strftime("%Y-%m-%d"), "price": round(float(p), 2)}
                for d, p in zip(forecast_dates, hybrid_prices)
            ]

            return {"from_date": from_date, "lstm": lstm_forecast, "hybrid": hybrid_forecast}

        except Exception as exc:
            log.error("Falha no forecast para %s: %s", ticker, exc, exc_info=True)
            return {"from_date": "", "lstm": [], "hybrid": []}
