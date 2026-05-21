"""
data_processor.py

Responsável por:
- Download dos dados via yfinance
- Engenharia de atributos
- Indicadores técnicos
- Estatísticas históricas
- Gráficos informativos
- Normalização
"""

import os
import json
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import yfinance as yf
import talib

import matplotlib
matplotlib.use('Agg')  # Use non-GUI backend to avoid tkinter issues
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.preprocessing import MinMaxScaler


# ==========================================================
# LISTAS DE ATIVOS
# ==========================================================

tickers_brasil = [

    "PETR4.SA",
    "VALE3.SA",
    "ITUB4.SA",
    "BBDC4.SA",
    "BBAS3.SA",
    "ABEV3.SA",
    "MGLU3.SA",
    "WEGE3.SA",
    "SUZB3.SA",
    "EQTL3.SA"
]

tickers_bigtech = [

    "AAPL",
    "MSFT",
    "GOOGL",
    "AMZN",
    "META",
    "NVDA",
    "TSLA",
    "NFLX",
    "ADBE",
    "INTC"
]


# ==========================================================
# CRIAR PASTA DE IMAGENS
# ==========================================================

def criar_pasta_imagens():

    os.makedirs("images", exist_ok=True)


# ==========================================================
# CRIAR PASTA DE DADOS JSON
# ==========================================================

def criar_pasta_dados():

    os.makedirs("dados", exist_ok=True)


# ==========================================================
# DOWNLOAD DE DADOS
# ==========================================================

def carregar_dados(
    tickers,
    start="2013-01-01",
    end="2026-05-20"
):
    """
    Download dos ativos.
    """

    print(f"Baixando {len(tickers)} ativos...")

    data = yf.download(

        tickers,

        start=start,
        end=end,

        auto_adjust=True,

        progress=False,
        threads=True
    )

    return data


# ==========================================================
# FEATURE ENGINEERING
# ==========================================================

def criar_features(df):
    """
    Cria indicadores técnicos.
    """

    dataset = pd.DataFrame(index=df.index)

    dataset["Open"] = df["Open"]
    dataset["High"] = df["High"]
    dataset["Low"] = df["Low"]
    dataset["Close"] = df["Close"]
    dataset["Volume"] = df["Volume"]

    # ======================================================
    # RETORNO DIÁRIO
    # ======================================================

    dataset["Daily_Return"] = dataset["Close"].pct_change()

    # ======================================================
    # MÉDIAS MÓVEIS
    # ======================================================

    dataset["SMA_20"] = talib.SMA(
        dataset["Close"],
        timeperiod=20
    )

    dataset["SMA_50"] = talib.SMA(
        dataset["Close"],
        timeperiod=50
    )

    dataset["EMA_20"] = talib.EMA(
        dataset["Close"],
        timeperiod=20
    )

    dataset["EMA_50"] = talib.EMA(
        dataset["Close"],
        timeperiod=50
    )

    # ======================================================
    # RSI
    # ======================================================

    dataset["RSI"] = talib.RSI(
        dataset["Close"],
        timeperiod=14
    )

    # ======================================================
    # MACD
    # ======================================================

    macd, macd_signal, macd_hist = talib.MACD(
        dataset["Close"]
    )

    dataset["MACD"] = macd
    dataset["MACD_SIGNAL"] = macd_signal
    dataset["MACD_HIST"] = macd_hist

    # ======================================================
    # BOLLINGER BANDS
    # ======================================================

    upper, middle, lower = talib.BBANDS(
        dataset["Close"]
    )

    dataset["BB_UPPER"] = upper
    dataset["BB_MIDDLE"] = middle
    dataset["BB_LOWER"] = lower

    # ======================================================
    # VOLATILIDADE
    # ======================================================

    dataset["VOLATILITY_20"] = (
        dataset["Daily_Return"]
        .rolling(20)
        .std()
    )

    dataset.dropna(inplace=True)

    return dataset


# ==========================================================
# NORMALIZAÇÃO
# ==========================================================

def normalizar_dados(df):
    """
    Aplica MinMaxScaler.
    """

    scaler = MinMaxScaler(
        feature_range=(0, 1)
    )

    scaled_data = scaler.fit_transform(df)

    return scaler, scaled_data


# ==========================================================
# ESTATÍSTICAS HISTÓRICAS
# ==========================================================

def gerar_estatisticas_ativo(df, ticker):
    """
    Gera estatísticas resumidas do ativo.
    """

    primeiro_preco = df["Close"].iloc[0]

    ultimo_preco = df["Close"].iloc[-1]

    valorizacao_total = (
        (
            ultimo_preco - primeiro_preco
        )
        / primeiro_preco
    ) * 100

    maximo_historico = df["High"].max()

    minimo_historico = df["Low"].min()

    media_volume = df["Volume"].mean()

    volatilidade_media = (
        df["Close"]
        .pct_change()
        .std()
    ) * np.sqrt(252) * 100

    estatisticas = {

        "Ticker": ticker,

        "Preço Inicial": round(primeiro_preco, 2),

        "Preço Atual": round(ultimo_preco, 2),

        "Valorização Total (%)": round(
            valorizacao_total,
            2
        ),

        "Máxima Histórica": round(
            maximo_historico,
            2
        ),

        "Mínima Histórica": round(
            minimo_historico,
            2
        ),

        "Volume Médio": round(
            media_volume,
            2
        ),

        "Volatilidade Anual (%)": round(
            volatilidade_media,
            2
        )
    }

    return estatisticas


# ==========================================================
# SALVAR ESTATÍSTICAS EM JSON
# ==========================================================

def salvar_estatisticas_json(estatisticas, ticker):
    """
    Salva as estatísticas em arquivo JSON para o frontend.
    """

    criar_pasta_dados()

    path = f"dados/{ticker}_stats.json"

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(estatisticas, f, indent=4, ensure_ascii=False)

    print(f"Estatísticas salvas: {path}")


# ==========================================================
# SALVAR TODAS AS ESTATÍSTICAS EM UM ÚNICO JSON
# ==========================================================

def salvar_todas_estatisticas_json(todas_estatisticas):
    """
    Salva todas as estatísticas dos tickers em um único arquivo JSON.
    """

    criar_pasta_dados()

    path = "dados/all_tickers_stats.json"

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(todas_estatisticas, f, indent=4, ensure_ascii=False)

    print(f"\n📊 Todas as estatísticas salvas: {path}")


# ==========================================================
# BUSCA DE PREÇO POR DATA
# ==========================================================

def buscar_preco_por_data(
    df,
    data
):
    """
    Busca preço do ativo em uma data específica.
    """

    data = pd.to_datetime(data)

    try:

        linha = df.loc[data]

        return {

            "Date": str(data.date()),

            "Open": round(linha["Open"], 2),

            "High": round(linha["High"], 2),

            "Low": round(linha["Low"], 2),

            "Close": round(linha["Close"], 2),

            "Volume": int(linha["Volume"])
        }

    except Exception:

        return None


# ==========================================================
# GRÁFICO HISTÓRICO
# ==========================================================

def gerar_grafico_historico(
    df,
    ticker
):
    """
    Gera gráfico histórico do ativo.
    """

    criar_pasta_imagens()

    sns.set_style("darkgrid")

    plt.figure(figsize=(18, 8))

    plt.plot(

        df.index,

        df["Close"],

        label="Close Price",

        linewidth=2
    )

    plt.plot(

        df.index,

        df["SMA_20"],

        label="SMA 20",

        alpha=0.8
    )

    plt.plot(

        df.index,

        df["SMA_50"],

        label="SMA 50",

        alpha=0.8
    )

    plt.title(

        f"{ticker} Historical Price",

        fontsize=18,
        fontweight="bold"
    )

    plt.xlabel("Date")

    plt.ylabel("Price")

    plt.legend()

    plt.tight_layout()

    path = f"images/{ticker}_historical.png"

    plt.savefig(

        path,

        dpi=300,
        bbox_inches="tight"
    )

    plt.close()

    print(f"Gráfico histórico salvo: {path}")


# ==========================================================
# GRÁFICO DE RETORNO ACUMULADO
# ==========================================================

def gerar_grafico_valorizacao(
    df,
    ticker
):
    """
    Gera gráfico de valorização acumulada.
    """

    criar_pasta_imagens()

    retorno_acumulado = (

        (
            df["Close"]
            / df["Close"].iloc[0]
        ) - 1

    ) * 100

    sns.set_style("darkgrid")

    plt.figure(figsize=(18, 8))

    plt.plot(

        retorno_acumulado.index,

        retorno_acumulado,

        linewidth=3
    )

    plt.axhline(
        0,
        linestyle="--",
        alpha=0.5
    )

    plt.title(

        f"{ticker} Total Valorization",

        fontsize=18,
        fontweight="bold"
    )

    plt.xlabel("Date")

    plt.ylabel("Return (%)")

    plt.tight_layout()

    path = f"images/{ticker}_valorization.png"

    plt.savefig(

        path,

        dpi=300,
        bbox_inches="tight"
    )

    plt.close()

    print(f"Gráfico de valorização salvo: {path}")