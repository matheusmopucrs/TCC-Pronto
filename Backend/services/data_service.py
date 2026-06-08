"""
data_service.py

Coleta dados reais e atualizados via yfinance.
Cache em memória com TTL de 15 minutos para evitar rate-limit.
"""

import logging
import threading
import time
from typing import Optional

import numpy as np
import pandas as pd
import yfinance as yf

log = logging.getLogger(__name__)

# Mapeamento slug → ticker real (slugs são URL-safe)
SLUG_TO_TICKER: dict[str, str] = {
    "aapl": "AAPL", "msft": "MSFT", "googl": "GOOGL", "amzn": "AMZN",
    "meta": "META", "nvda": "NVDA", "tsla": "TSLA", "nflx": "NFLX",
    "adbe": "ADBE", "intc": "INTC",
    "petr4": "PETR4.SA", "vale3": "VALE3.SA", "itub4": "ITUB4.SA",
    "bbdc4": "BBDC4.SA", "bbas3": "BBAS3.SA", "abev3": "ABEV3.SA",
    "mglu3": "MGLU3.SA", "wege3": "WEGE3.SA", "suzb3": "SUZB3.SA",
    "eqtl3": "EQTL3.SA",
}

TICKER_TO_SLUG = {v: k for k, v in SLUG_TO_TICKER.items()}

ASSET_LABELS: dict[str, str] = {
    "aapl": "Apple Inc.", "msft": "Microsoft Corp.", "googl": "Alphabet Inc.",
    "amzn": "Amazon.com Inc.", "meta": "Meta Platforms", "nvda": "NVIDIA Corp.",
    "tsla": "Tesla Inc.", "nflx": "Netflix Inc.", "adbe": "Adobe Inc.",
    "intc": "Intel Corp.", "petr4": "Petrobras", "vale3": "Vale S.A.",
    "itub4": "Itaú Unibanco", "bbdc4": "Bradesco", "bbas3": "Banco do Brasil",
    "abev3": "Ambev", "mglu3": "Magazine Luiza", "wege3": "WEG S.A.",
    "suzb3": "Suzano", "eqtl3": "Equatorial Energia",
}

ASSET_EXCHANGES: dict[str, str] = {
    **{s: "NASDAQ" for s in ["aapl","msft","googl","amzn","meta","nvda","tsla","nflx","adbe","intc"]},
    **{s: "B3" for s in ["petr4","vale3","itub4","bbdc4","bbas3","abev3","mglu3","wege3","suzb3","eqtl3"]},
}

ASSET_COUNTRIES: dict[str, str] = {
    **{s: "United States" for s in ["aapl","msft","googl","amzn","meta","nvda","tsla","nflx","adbe","intc"]},
    **{s: "Brazil" for s in ["petr4","vale3","itub4","bbdc4","bbas3","abev3","mglu3","wege3","suzb3","eqtl3"]},
}

ASSET_SECTORS: dict[str, str] = {
    "aapl": "Technology · Consumer Electronics",
    "msft": "Technology · Software & Cloud",
    "googl": "Communication Services · Internet",
    "amzn": "Consumer Cyclical · E-commerce & Cloud",
    "meta": "Communication Services · Social Media",
    "nvda": "Technology · Semiconductors",
    "tsla": "Consumer Cyclical · Automotive",
    "nflx": "Communication Services · Streaming",
    "adbe": "Technology · Software",
    "intc": "Technology · Semiconductors",
    "petr4": "Energy · Integrated Oil & Gas",
    "vale3": "Basic Materials · Mining",
    "itub4": "Financial Services · Banks",
    "bbdc4": "Financial Services · Banks",
    "bbas3": "Financial Services · Banks",
    "abev3": "Consumer Defensive · Beverages",
    "mglu3": "Consumer Cyclical · Retail",
    "wege3": "Industrials · Electrical Equipment",
    "suzb3": "Basic Materials · Paper & Pulp",
    "eqtl3": "Utilities · Electric Power",
}


class DataService:
    _CACHE_TTL = 900  # 15 minutos

    def __init__(self) -> None:
        self._cache: dict[str, tuple[float, object]] = {}
        self._lock = threading.Lock()

    # ── cache helpers ─────────────────────────────────────────────────────────

    def _cached(self, key: str) -> Optional[object]:
        with self._lock:
            entry = self._cache.get(key)
            if entry and time.time() - entry[0] < self._CACHE_TTL:
                return entry[1]
        return None

    def _store(self, key: str, value: object) -> None:
        with self._lock:
            self._cache[key] = (time.time(), value)

    # ── public API ────────────────────────────────────────────────────────────

    def get_stock_list(self) -> dict:
        return {
            "stocks": [
                {
                    "slug": slug,
                    "ticker": ticker,
                    "label": ASSET_LABELS[slug],
                    "exchange": ASSET_EXCHANGES[slug],
                    "country": ASSET_COUNTRIES[slug],
                    "sector": ASSET_SECTORS[slug],
                }
                for slug, ticker in SLUG_TO_TICKER.items()
            ]
        }

    def get_stock_detail(self, slug: str) -> Optional[dict]:
        slug = slug.lower()
        ticker = SLUG_TO_TICKER.get(slug)
        if not ticker:
            return None

        cached = self._cached(f"detail:{slug}")
        if cached:
            return cached

        try:
            result = self._fetch_detail(slug, ticker)
            self._store(f"detail:{slug}", result)
            return result
        except Exception as exc:
            log.error("yfinance fetch failed for %s: %s", ticker, exc)
            return None

    # ── private fetch ─────────────────────────────────────────────────────────

    def _fetch_detail(self, slug: str, ticker: str) -> dict:
        tkr = yf.Ticker(ticker)

        # 12 meses de histórico para o gráfico e cálculo de stats
        hist = tkr.history(period="1y", auto_adjust=True)
        hist = hist[["Open", "High", "Low", "Close", "Volume"]].dropna()

        if hist.empty:
            raise ValueError(f"Sem dados históricos para {ticker}")

        # Últimas 5 sessões para snapshot de mercado (mais confiável que fast_info)
        recent = tkr.history(period="5d", auto_adjust=True).dropna()
        last = recent.iloc[-1]
        prev = recent.iloc[-2] if len(recent) >= 2 else last

        price = float(last["Close"])
        change_pct = ((price - float(prev["Close"])) / float(prev["Close"])) * 100

        # Médias móveis
        hist["sma_20"] = hist["Close"].rolling(20).mean()
        hist["sma_50"] = hist["Close"].rolling(50).mean()

        sma_20_last = _safe_float(hist["sma_20"].dropna().iloc[-1] if not hist["sma_20"].dropna().empty else None)
        sma_50_last = _safe_float(hist["sma_50"].dropna().iloc[-1] if not hist["sma_50"].dropna().empty else None)

        # Estatísticas dos 12 meses
        close = hist["Close"]
        returns = close.pct_change().dropna()
        appreciation_12m = float(((close.iloc[-1] / close.iloc[0]) - 1) * 100)
        volatility_ann = float(returns.std() * np.sqrt(252) * 100)

        # Série histórica formatada para Recharts
        history = [
            {
                "date": idx.strftime("%Y-%m-%d"),
                "close": round(float(row["Close"]), 2),
                "sma_20": round(float(row["sma_20"]), 2) if not pd.isna(row["sma_20"]) else None,
                "sma_50": round(float(row["sma_50"]), 2) if not pd.isna(row["sma_50"]) else None,
            }
            for idx, row in hist.iterrows()
        ]

        return {
            "slug": slug,
            "ticker": ticker,
            "label": ASSET_LABELS[slug],
            "exchange": ASSET_EXCHANGES[slug],
            "country": ASSET_COUNTRIES[slug],
            "sector": ASSET_SECTORS[slug],
            # Snapshot real-time
            "price": round(price, 2),
            "change_pct": round(change_pct, 2),
            "open": round(float(last["Open"]), 2),
            "high": round(float(last["High"]), 2),
            "low": round(float(last["Low"]), 2),
            "volume": int(last["Volume"]),
            # Médias móveis
            "sma_20": sma_20_last,
            "sma_50": sma_50_last,
            # Stats 12 meses
            "appreciation_12m": round(appreciation_12m, 2),
            "volatility_ann": round(volatility_ann, 2),
            # Histórico para gráfico Recharts
            "history": history,
        }


def _safe_float(val) -> Optional[float]:
    try:
        if val is None or (isinstance(val, float) and np.isnan(val)):
            return None
        return round(float(val), 2)
    except Exception:
        return None
