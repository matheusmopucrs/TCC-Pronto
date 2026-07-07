"""
train.py — Pipeline de treinamento offline.

Execute UMA VEZ antes de iniciar o servidor:
    cd backend
    python train.py

O que este script faz:
  1. Baixa dados históricos (2013-hoje) via yfinance
  2. Treina LSTM univariado sobre a série de preços de fechamento
  3. Treina XGBoost sobre os resíduos do LSTM (modelo híbrido)
  4. Salva os artefatos em backend/models/:
       {TICKER_SAFE}_lstm.keras
       {TICKER_SAFE}_xgb.pkl
       {TICKER_SAFE}_scaler.pkl
       {TICKER_SAFE}_predictions.json    ← predições do período de teste + métricas
  5. Gera assets-stats.json para o frontend estático

Nota: TA-Lib NÃO é necessário neste script.
      Os indicadores técnicos para os gráficos PNG estão no Backend/main.py (pipeline legado).
"""

import gc
import json
import random
import warnings
from datetime import date
from pathlib import Path

warnings.filterwarnings("ignore")

import joblib
import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import MinMaxScaler
from xgboost import XGBRegressor

SEED = 42


def _set_seeds() -> None:
    """Fixa as seeds para reprodutibilidade entre execuções de treino."""
    random.seed(SEED)
    np.random.seed(SEED)
    import tensorflow as tf
    tf.random.set_seed(SEED)


# Pasta de saída dos modelos (relativa a este script)
MODELS_DIR = Path(__file__).parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

# Caminho do assets-stats.json consumido pelo frontend
FRONTEND_STATS_PATH = (
    Path(__file__).parent.parent / "Frontend" / "src" / "data" / "assets-stats.json"
)

SEQUENCE_LENGTH = 60
TRAIN_RATIO = 0.70
VAL_RATIO = 0.10  # fração reservada para treinar o XGBoost (fora da amostra do LSTM)
START_DATE = "2013-01-01"

TICKERS_BR = [
    "PETR4.SA", "VALE3.SA", "ITUB4.SA", "BBDC4.SA", "BBAS3.SA",
    "ABEV3.SA", "MGLU3.SA", "WEGE3.SA", "SUZB3.SA", "EQTL3.SA",
]
TICKERS_INTL = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "META",
    "NVDA", "TSLA", "NFLX", "ADBE", "INTC",
]
ALL_TICKERS = TICKERS_INTL + TICKERS_BR


# =============================================================================
# MÉTRICAS — inclui MAPE e Directional Accuracy
# =============================================================================

def calcular_metricas(real: np.ndarray, pred: np.ndarray) -> dict:
    rmse = float(np.sqrt(mean_squared_error(real, pred)))
    mae = float(mean_absolute_error(real, pred))
    r2 = float(r2_score(real, pred))

    # MAPE — ignora zeros no denominador
    mask = real != 0
    mape = float(np.mean(np.abs((real[mask] - pred[mask]) / real[mask])) * 100) if mask.any() else 0.0

    # Directional Accuracy — % de direções corretas
    if len(real) > 1:
        real_dir = np.diff(real)
        pred_dir = np.diff(pred)
        da = float(np.mean(np.sign(real_dir) == np.sign(pred_dir)) * 100)
    else:
        da = 0.0

    return {"mae": mae, "rmse": rmse, "mape": mape, "r2": r2, "directional_accuracy": da}


# =============================================================================
# LSTM
# =============================================================================

def criar_sequencias(data: np.ndarray, look_back: int):
    x = np.lib.stride_tricks.sliding_window_view(data, window_shape=look_back)[:-1]
    y = data[look_back:]
    return x, y


def construir_lstm(input_shape):
    from keras.models import Sequential
    from keras.layers import LSTM, Dense, Dropout

    model = Sequential([
        LSTM(64, input_shape=input_shape),
        Dropout(0.2),
        Dense(32, activation="relu"),
        Dense(1, dtype="float32"),
    ])
    model.compile(optimizer="adam", loss="mse")
    return model


def treinar_lstm(model, x_train, y_train):
    from keras.callbacks import EarlyStopping, ReduceLROnPlateau

    callbacks = [
        EarlyStopping(monitor="val_loss", patience=10, restore_best_weights=True, verbose=0),
        ReduceLROnPlateau(monitor="val_loss", patience=5, factor=0.5, min_lr=1e-5, verbose=0),
    ]
    model.fit(
        x_train, y_train,
        validation_split=0.2,
        epochs=80,
        batch_size=128,
        shuffle=False,
        callbacks=callbacks,
        verbose=1,
    )


# =============================================================================
# XGBOOST HÍBRIDO
# =============================================================================

def features_causais_precos(close: pd.Series) -> dict[str, np.ndarray]:
    """
    Features de mercado 100% causais, derivadas só do preço REAL (não do preço
    normalizado nem da previsão do LSTM). Cada uma em t usa somente dados até
    t-1 — nenhuma olha o preço do próprio dia que está sendo previsto.

    Retorna arrays no mesmo índice bruto de `close` (mesmo comprimento).
    """
    daily_ret = close.pct_change()
    ret_1 = daily_ret.shift(1).fillna(0.0).values
    ret_5 = close.pct_change(5).shift(1).fillna(0.0).values
    vol_10 = daily_ret.rolling(10).std().shift(1).fillna(0.0).values
    return {"ret_1": ret_1, "ret_5": ret_5, "vol_10": vol_10}


def _xgb_features(pred_lstm: np.ndarray, ret_1: np.ndarray, ret_5: np.ndarray,
                   vol_10: np.ndarray, resid_lagged: np.ndarray) -> np.ndarray:
    """
    Todas as colunas são causais (só usam informação disponível ANTES do dia
    que está sendo previsto):
      - pred_lstm     : previsão do LSTM para o dia (feita com dados até t-1)
      - grad          : diferença causal da própria previsão do LSTM (t vs t-1)
      - ret_1/ret_5   : retornos REAIS já realizados, terminando em t-1
      - vol_10        : volatilidade realizada dos últimos 10 dias, até t-1
      - resid_lagged  : erro relativo do LSTM no dia ANTERIOR (t-1), já conhecido
    """
    pred_lstm = pred_lstm.flatten()
    grad = np.diff(pred_lstm, prepend=pred_lstm[0])
    return np.column_stack([
        pred_lstm, grad, np.abs(grad),
        ret_1, ret_5, vol_10, resid_lagged,
    ])


def treinar_hibrido(
    y_val: np.ndarray, y_pred_lstm_val: np.ndarray, feats_val: dict,
    y_pred_lstm_test: np.ndarray, feats_test: dict,
):
    """
    Treina o XGBoost nos resíduos do LSTM no conjunto de VALIDAÇÃO (fora da
    amostra de treino do LSTM) e aplica o ajuste aprendido ao conjunto de
    TESTE, que nunca foi visto por nenhum dos dois modelos.
    """
    residuos_val = y_val - y_pred_lstm_val.flatten()
    features_val = _xgb_features(y_pred_lstm_val, **feats_val)

    xgb = XGBRegressor(
        n_estimators=800, learning_rate=0.03, max_depth=5,
        subsample=0.8, colsample_bytree=0.8,
        objective="reg:squarederror", tree_method="hist",
        random_state=42, n_jobs=-1,
    )
    xgb.fit(features_val, residuos_val)

    features_test = _xgb_features(y_pred_lstm_test, **feats_test)
    ajuste_test = xgb.predict(features_test)
    return y_pred_lstm_test.flatten() + ajuste_test, xgb


# =============================================================================
# PIPELINE POR ATIVO
# =============================================================================

def processar_ativo(ticker: str) -> dict | None:
    _set_seeds()
    ticker_safe = ticker.replace(".", "_")
    print(f"\n{'='*65}")
    print(f"  {ticker}")
    print(f"{'='*65}")

    # ── Download ──────────────────────────────────────────────────────────────
    print("  >>Baixando dados...")
    end_date = date.today().isoformat()
    raw = yf.download(ticker, start=START_DATE, end=end_date, auto_adjust=True, progress=False)

    if isinstance(raw.columns, pd.MultiIndex):
        df = pd.DataFrame({col: raw[col][ticker] for col in ["Open", "High", "Low", "Close", "Volume"]})
    else:
        df = raw[["Open", "High", "Low", "Close", "Volume"]].copy()

    df.dropna(inplace=True)

    if len(df) < SEQUENCE_LENGTH + 200:
        print(f"  ERRO:Dados insuficientes ({len(df)} linhas).")
        return None

    print(f"  OK:{len(df)} dias baixados ({df.index[0].date()} → {df.index[-1].date()})")

    # ── Split temporal (treino / validação XGB / teste) ──────────────────────
    # Calculado em nível de sequência ANTES de normalizar, para que o scaler
    # seja ajustado apenas com preços do período de treino (sem vazamento).
    close_prices = df["Close"].values
    n = len(close_prices) - SEQUENCE_LENGTH
    train_end = int(n * TRAIN_RATIO)
    val_end = int(n * (TRAIN_RATIO + VAL_RATIO))

    # ── Normalização (somente Close, scaler ajustado só no período de treino) ─
    raw_train_cutoff = train_end + SEQUENCE_LENGTH  # última linha coberta pelo treino
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler.fit(close_prices[:raw_train_cutoff].reshape(-1, 1))
    close_scaled = scaler.transform(close_prices.reshape(-1, 1)).flatten()

    x, y = criar_sequencias(close_scaled, SEQUENCE_LENGTH)
    x = x.reshape(x.shape[0], x.shape[1], 1)

    x_train, y_train = x[:train_end], y[:train_end]
    x_val, y_val = x[train_end:val_end], y[train_end:val_end]
    x_test, y_test = x[val_end:], y[val_end:]

    print(f"  Treino: {len(x_train)} seq | Validação (XGB): {len(x_val)} seq | Teste: {len(x_test)} seq")

    # ── LSTM ──────────────────────────────────────────────────────────────────
    print("  >>Treinando LSTM...")
    model = construir_lstm((x_train.shape[1], 1))
    treinar_lstm(model, x_train, y_train)

    y_pred_lstm_val_scaled = model.predict(x_val, verbose=0).flatten()
    y_pred_lstm_scaled = model.predict(x_test, verbose=0).flatten()

    # ── Features causais extras para o XGBoost híbrido ───────────────────────
    # Retornos/volatilidade REAIS defasados em 1 dia (preço bruto, não o normalizado).
    mercado = features_causais_precos(df["Close"])
    ret_1_seq = mercado["ret_1"][SEQUENCE_LENGTH: SEQUENCE_LENGTH + n]
    ret_5_seq = mercado["ret_5"][SEQUENCE_LENGTH: SEQUENCE_LENGTH + n]
    vol_10_seq = mercado["vol_10"][SEQUENCE_LENGTH: SEQUENCE_LENGTH + n]

    # Viés recente do LSTM: erro relativo (previsto vs. real) do dia ANTERIOR,
    # calculado sobre TODAS as sequências para poder olhar 1 passo pra trás em
    # qualquer ponto (inclusive no primeiro dia de validação/teste).
    y_pred_lstm_all_scaled = model.predict(x, verbose=0).flatten()
    resid_all = (y_pred_lstm_all_scaled - y) / np.where(y != 0, y, 1e-9)
    resid_lagged_all = np.concatenate([[0.0], resid_all[:-1]])

    def _fatiar(inicio, fim):
        return {
            "ret_1": ret_1_seq[inicio:fim],
            "ret_5": ret_5_seq[inicio:fim],
            "vol_10": vol_10_seq[inicio:fim],
            "resid_lagged": resid_lagged_all[inicio:fim],
        }

    feats_val = _fatiar(train_end, val_end)
    feats_test = _fatiar(val_end, n)

    # ── Híbrido XGBoost (treinado nos resíduos da validação, aplicado ao teste) ─
    print("  >>Treinando XGBoost híbrido...")
    y_pred_hibrido_scaled, xgb_model = treinar_hibrido(
        y_val, y_pred_lstm_val_scaled, feats_val,
        y_pred_lstm_scaled, feats_test,
    )

    # ── Desnormalização ───────────────────────────────────────────────────────
    y_test_price = scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()
    y_pred_lstm_price = scaler.inverse_transform(y_pred_lstm_scaled.reshape(-1, 1)).flatten()
    y_pred_hibrido_price = scaler.inverse_transform(y_pred_hibrido_scaled.reshape(-1, 1)).flatten()

    # Datas do período de teste
    test_start_idx = SEQUENCE_LENGTH + val_end
    test_dates = df.index[test_start_idx: test_start_idx + len(y_test)]

    # ── Métricas ──────────────────────────────────────────────────────────────
    m_lstm = calcular_metricas(y_test_price, y_pred_lstm_price)
    m_hibrido = calcular_metricas(y_test_price, y_pred_hibrido_price)

    print(f"  LSTM    >>RMSE: {m_lstm['rmse']:.4f} | MAE: {m_lstm['mae']:.4f} | R²: {m_lstm['r2']:.4f} | DA: {m_lstm['directional_accuracy']:.1f}%")
    print(f"  Híbrido → RMSE: {m_hibrido['rmse']:.4f} | MAE: {m_hibrido['mae']:.4f} | R²: {m_hibrido['r2']:.4f} | DA: {m_hibrido['directional_accuracy']:.1f}%")

    # ── Salvar artefatos ──────────────────────────────────────────────────────
    model.save(str(MODELS_DIR / f"{ticker_safe}_lstm.keras"))
    joblib.dump(xgb_model, MODELS_DIR / f"{ticker_safe}_xgb.pkl")
    joblib.dump(scaler, MODELS_DIR / f"{ticker_safe}_scaler.pkl")

    predictions_data = {
        "test_dates": [str(d.date()) for d in test_dates],
        "actual": y_test_price.tolist(),
        "lstm": y_pred_lstm_price.tolist(),
        "hybrid": y_pred_hibrido_price.tolist(),
        "metrics": {"lstm": m_lstm, "hybrid": m_hibrido},
    }
    with open(MODELS_DIR / f"{ticker_safe}_predictions.json", "w", encoding="utf-8") as f:
        json.dump(predictions_data, f, indent=2)

    print(f"  OK:Modelos salvos em backend/models/{ticker_safe}_*")

    # ── Gráficos PNG (usa data_processor.py + models_pipeline.py legados) ─────
    # Esses PNGs são consumidos como imagens estáticas pelo frontend.
    try:
        from data_processor import (
            criar_features, gerar_grafico_fechamento,
            gerar_grafico_sma, gerar_grafico_valorizacao,
        )
        from models_pipeline import gerar_grafico_comparativo

        df_feat = criar_features(df)

        gerar_grafico_fechamento(df_feat, ticker)
        gerar_grafico_sma(df_feat, ticker)
        gerar_grafico_valorizacao(df_feat, ticker)

        # Datas e preços para o gráfico comparativo
        gerar_grafico_comparativo(
            ticker=ticker,
            real=y_test_price,
            lstm_pred=y_pred_lstm_price,
            hybrid_pred=y_pred_hibrido_price,
            historico_datas=df.index,
            historico_close=df["Close"].values,
            previsao_datas=test_dates,
        )
        print(f"  OK:PNGs gerados em Frontend/public/images/")
    except ImportError:
        print("  ⚠ TA-Lib não encontrado — PNGs pulados. Instale TA-Lib para gerar gráficos estáticos.")
    except Exception as chart_err:
        print(f"  ⚠ Erro ao gerar PNGs: {chart_err}")

    # ── Estatísticas para o frontend estático ─────────────────────────────────
    primeiro = float(df["Close"].iloc[0])
    ultimo = float(df["Close"].iloc[-1])
    valorizacao = ((ultimo - primeiro) / primeiro) * 100
    vol = df["Close"].pct_change().std() * np.sqrt(252) * 100

    stats = {
        "Preço Inicial": round(primeiro, 2),
        "Preço Atual": round(ultimo, 2),
        "Valorização Total (%)": round(valorizacao, 2),
        "Volatilidade Anual (%)": round(float(vol), 2),
    }

    # ── Limpeza de memória ────────────────────────────────────────────────────
    try:
        from keras import backend as K
        K.clear_session()
    except Exception:
        pass
    gc.collect()

    return stats


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("\n" + "═" * 65)
    print("  PIPELINE DE TREINAMENTO — TCC LSTM + XGBoost Híbrido")
    print("═" * 65)

    all_stats: dict[str, dict] = {}

    for ticker in ALL_TICKERS:
        stats = processar_ativo(ticker)
        if stats is not None:
            all_stats[ticker] = stats

    # ── Exporta assets-stats.json ─────────────────────────────────────────────
    FRONTEND_STATS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(FRONTEND_STATS_PATH, "w", encoding="utf-8") as f:
        json.dump(all_stats, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"\n📦 assets-stats.json → {FRONTEND_STATS_PATH}")

    trained = [t.replace(".SA", "").lower() for t in all_stats.keys()]
    print(f"\n✅ Pipeline concluído. {len(all_stats)}/{len(ALL_TICKERS)} ativos treinados.")
    print(f"   Disponíveis na API: {trained}")
    print("\nPróximo passo:")
    print("   cd backend && uvicorn main:app --reload --port 8000\n")


if __name__ == "__main__":
    main()
