"""
models_pipeline.py

Geração dos gráficos comparativos (Real vs LSTM vs Híbrido) usados como
PNGs estáticos pelo frontend. O treino de LSTM/XGBoost e o cálculo de
métricas vivem em train.py — este módulo cuida só de plotagem.
"""

import warnings
warnings.filterwarnings("ignore")

import matplotlib
matplotlib.use('Agg')  # Use non-GUI backend to avoid tkinter issues
import matplotlib.pyplot as plt
import seaborn as sns

from data_processor import chart_path, criar_pasta_imagens


def _salvar_grafico_comparativo(
    ticker,
    real,
    lstm_pred,
    hybrid_pred,
    chart_id,
    title_suffix,
    historico_datas=None,
    historico_close=None,
    previsao_datas=None,
    incluir_historico=True,
):
    criar_pasta_imagens()
    sns.set_style("darkgrid")
    plt.figure(figsize=(18, 8))

    if incluir_historico and historico_datas is not None and historico_close is not None:
        plt.plot(
            historico_datas,
            historico_close,
            label="Close Price",
            color="gray",
            linewidth=2,
            alpha=0.45,
        )

    x_axis = previsao_datas if previsao_datas is not None else range(len(real))

    plt.plot(x_axis, real, label="Real Price (test)", color="black", linewidth=2, alpha=0.75)
    plt.plot(x_axis, lstm_pred, label="Pure LSTM", linewidth=2, alpha=0.8)
    plt.plot(x_axis, hybrid_pred, label="Hybrid LSTM + XGBoost", linewidth=3)

    plt.title(f"{ticker} — {title_suffix}", fontsize=18, fontweight="bold")
    plt.xlabel("Date" if previsao_datas is not None else "Time")
    plt.ylabel("Price")
    plt.legend(fontsize=12)
    plt.tight_layout()

    path = chart_path(ticker, chart_id)
    plt.savefig(path, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"Gráfico salvo: {path}")


def gerar_grafico_comparativo(
    ticker,
    real,
    lstm_pred,
    hybrid_pred,
    historico_datas=None,
    historico_close=None,
    previsao_datas=None,
):
    """
    Gera report_total (treino + teste) e report_teste (zoom no período de teste).
    """
    _salvar_grafico_comparativo(
        ticker=ticker,
        real=real,
        lstm_pred=lstm_pred,
        hybrid_pred=hybrid_pred,
        chart_id="report_total",
        title_suffix="Full Period (Train + Test)",
        historico_datas=historico_datas,
        historico_close=historico_close,
        previsao_datas=previsao_datas,
        incluir_historico=True,
    )
    _salvar_grafico_comparativo(
        ticker=ticker,
        real=real,
        lstm_pred=lstm_pred,
        hybrid_pred=hybrid_pred,
        chart_id="report_teste",
        title_suffix="Test Period (Zoom)",
        historico_datas=historico_datas,
        historico_close=historico_close,
        previsao_datas=previsao_datas,
        incluir_historico=False,
    )
