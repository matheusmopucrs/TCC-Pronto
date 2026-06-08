"""
finance_service.py

Simula estratégia direcional de trading sobre as predições do modelo.
Sinal: mantém posição comprada quando o modelo prevê alta no próximo dia.
"""

import logging
from typing import Optional

import numpy as np

log = logging.getLogger(__name__)


class FinanceService:

    def run_backtest(self, slug: str, predictions: dict) -> Optional[dict]:
        try:
            test_period = predictions["test_period"]
            if len(test_period) < 2:
                return None

            actual = np.array([p["actual"] for p in test_period], dtype=float)
            lstm_pred = np.array([p["lstm"] for p in test_period], dtype=float)
            hybrid_pred = np.array([p["hybrid"] for p in test_period], dtype=float)
            dates = [p["date"] for p in test_period]

            lstm_result = self._simulate(actual, lstm_pred, dates)
            hybrid_result = self._simulate(actual, hybrid_pred, dates)

            return {
                "slug": slug,
                "ticker": predictions["ticker"],
                "lstm": lstm_result,
                "hybrid": hybrid_result,
            }
        except Exception as exc:
            log.error("Backtest falhou para %s: %s", slug, exc, exc_info=True)
            return None

    # ── strategy simulation ───────────────────────────────────────────────────

    def _simulate(self, actual: np.ndarray, predicted: np.ndarray, dates: list[str]) -> dict:
        n = len(actual)

        # Retornos diários reais
        daily_returns = np.diff(actual) / actual[:-1]

        # Sinal direcional: long se o modelo prevê que amanhã > hoje
        # Comparamos predicted[t] com actual[t-1] para evitar look-ahead
        signals = np.zeros(n - 1)
        for t in range(1, n):
            signals[t - 1] = 1.0 if predicted[t] > actual[t - 1] else 0.0

        # Retornos da estratégia (long ou cash)
        strategy_returns = signals * daily_returns
        trade_returns = strategy_returns[signals != 0]

        # Curva de equity acumulada (começa em 1.0)
        equity = np.cumprod(1 + strategy_returns)
        equity = np.insert(equity, 0, 1.0)

        cumulative_return = float((equity[-1] - 1.0) * 100)
        sharpe = _sharpe_ratio(strategy_returns)
        drawdown = _max_drawdown(equity)
        pf = _profit_factor(trade_returns)

        equity_curve = [
            {"date": dates[i], "value": round(float(equity[i]), 4)}
            for i in range(len(equity))
        ]

        return {
            "cumulative_return": round(cumulative_return, 2),
            "sharpe_ratio": round(sharpe, 3),
            "max_drawdown": round(drawdown, 2),
            "profit_factor": round(pf, 3),
            "equity_curve": equity_curve,
        }


# ── metric helpers ────────────────────────────────────────────────────────────

def _sharpe_ratio(returns: np.ndarray, risk_free: float = 0.0, periods: int = 252) -> float:
    if len(returns) == 0 or returns.std() == 0:
        return 0.0
    return float((returns.mean() - risk_free / periods) / returns.std() * np.sqrt(periods))


def _max_drawdown(equity: np.ndarray) -> float:
    peaks = np.maximum.accumulate(equity)
    drawdowns = (equity - peaks) / peaks
    return float(drawdowns.min() * 100)


def _profit_factor(trade_returns: np.ndarray) -> float:
    gains = trade_returns[trade_returns > 0].sum()
    losses = abs(trade_returns[trade_returns < 0].sum())
    if losses == 0:
        return float(gains) if gains > 0 else 0.0
    return float(gains / losses)
