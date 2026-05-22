"""
main.py

Main orchestration layer for:
- Data ingestion
- Feature engineering
- Sequence generation
- LSTM training
- Hybrid XGBoost training
- Metrics
- Plot generation
"""

import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import gc

from keras import backend as K

from data_processor import (
    carregar_dados,
    criar_features,
    normalizar_dados,
    gerar_estatisticas_ativo,
    salvar_estatisticas_json,
    salvar_todas_estatisticas_json,
    exportar_assets_stats_frontend,
    gerar_grafico_fechamento,
    gerar_grafico_sma,
    gerar_grafico_valorizacao,
    tickers_brasil,
    tickers_bigtech
)

from models_pipeline import (
    construir_modelo_lstm,
    create_sequences,
    treinar_lstm,
    treinar_hibrido_xgboost,
    gerar_grafico_comparativo,
    calcular_metricas
)


# ==========================================================
# CONFIGURAÇÕES
# ==========================================================

SEQUENCE_LENGTH = 60

ALL_TICKERS = tickers_brasil + tickers_bigtech


# ==========================================================
# PIPELINE PRINCIPAL
# ==========================================================

def processar_ativo(ticker):

    try:

        print("\n" + "=" * 70)
        print(f"PROCESSANDO: {ticker}")
        print("=" * 70)

        # ==================================================
        # DOWNLOAD DOS DADOS
        # ==================================================

        raw_data = carregar_dados([ticker])

        if raw_data.empty:
            raise ValueError("Dados vazios.")

        # ==================================================
        # EXTRAÇÃO DO TICKER
        # ==================================================

        if isinstance(raw_data.columns, pd.MultiIndex):

            asset_df = pd.DataFrame({

                "Open": raw_data["Open"][ticker],
                "High": raw_data["High"][ticker],
                "Low": raw_data["Low"][ticker],
                "Close": raw_data["Close"][ticker],
                "Volume": raw_data["Volume"][ticker]

            })

        else:

            asset_df = raw_data.copy()

        asset_df.dropna(inplace=True)

        # ==================================================
        # FEATURE ENGINEERING
        # ==================================================

        features_df = criar_features(asset_df)

        if len(features_df) < SEQUENCE_LENGTH + 200:
            raise ValueError(
                f"Poucos dados após feature engineering ({len(features_df)} linhas)"
            )

        # ==================================================
        # PHASE 1: MARKET ANALYTICS / HISTORICAL IMAGES
        # ==================================================

        print("\n" + "─" * 70)
        print("PHASE 1: MARKET ANALYTICS / HISTORICAL IMAGES")
        print("─" * 70)

        # ──────────────────────────────────────────────────
        # STATISTICS
        # ──────────────────────────────────────────────────

        print("\n→ Gerando estatísticas históricas...")

        estatisticas = gerar_estatisticas_ativo(
            features_df,
            ticker
        )

        print("\n📊 ESTATÍSTICAS DO ATIVO:")
        for chave, valor in estatisticas.items():
            print(f"   {chave}: {valor}")

        # ──────────────────────────────────────────────────
        # SALVAR ESTATÍSTICAS EM JSON
        # ──────────────────────────────────────────────────

        salvar_estatisticas_json(estatisticas, ticker)

        # ──────────────────────────────────────────────────
        # HISTORICAL CHARTS
        # ──────────────────────────────────────────────────

        print("\n→ Gerando gráficos históricos...")

        gerar_grafico_fechamento(features_df, ticker)
        gerar_grafico_sma(features_df, ticker)

        gerar_grafico_valorizacao(
            features_df,
            ticker
        )

        print("\n✅ Phase 1 concluído (Análises históricas e gráficos gerados)")

        # ==================================================
        # PHASE 2: AI PREDICTION PIPELINE
        # ==================================================

        print("\n" + "─" * 70)
        print("PHASE 2: AI PREDICTION PIPELINE (LSTM + XGBOOST)")
        print("─" * 70)

        # ──────────────────────────────────────────────────
        # NORMALIZAÇÃO
        # ──────────────────────────────────────────────────

        print("\n→ Normalizando dados...")

        scaler, scaled_data = normalizar_dados(features_df)

        # ──────────────────────────────────────────────────
        # UTILIZAR SOMENTE CLOSE NA LSTM
        # ──────────────────────────────────────────────────

        target_col_index = features_df.columns.get_loc("Close")

        close_data = scaled_data[:, target_col_index]

        # ──────────────────────────────────────────────────
        # SEQUÊNCIAS TEMPORAIS
        # ──────────────────────────────────────────────────

        print("\n→ Criando sequências temporais...")

        x, y = create_sequences(
            close_data,
            look_back=SEQUENCE_LENGTH
        )

        # ──────────────────────────────────────────────────
        # RESHAPE PARA LSTM
        # ──────────────────────────────────────────────────

        x = x.reshape(
            x.shape[0],
            x.shape[1],
            1
        )

        print(f"\nShape X: {x.shape}")
        print(f"Shape Y: {y.shape}")

        # ──────────────────────────────────────────────────
        # TRAIN / TEST SPLIT
        # ──────────────────────────────────────────────────

        print("\n→ Dividindo dados (80% treino / 20% teste)...")

        split_index = int(len(x) * 0.8)

        x_train = x[:split_index]
        y_train = y[:split_index]

        x_test = x[split_index:]
        y_test = y[split_index:]

        print(f"Treino: {len(x_train)} sequências")
        print(f"Teste : {len(x_test)} sequências")

        # ──────────────────────────────────────────────────
        # MODELO LSTM
        # ──────────────────────────────────────────────────

        print("\n→ Construindo e treinando modelo LSTM...")

        model = construir_modelo_lstm(
            input_shape=(x_train.shape[1], x_train.shape[2])
        )

        # ──────────────────────────────────────────────────
        # TREINAMENTO
        # ──────────────────────────────────────────────────

        treinar_lstm(
            model,
            x_train,
            y_train
        )

        # ──────────────────────────────────────────────────
        # PREVISÕES LSTM
        # ──────────────────────────────────────────────────

        print("\n→ Gerando previsões LSTM...")

        y_pred_lstm = model.predict(
            x_test,
            verbose=0
        ).flatten()

        # ──────────────────────────────────────────────────
        # MODELO HÍBRIDO
        # ──────────────────────────────────────────────────

        print("\n→ Treinando modelo híbrido (LSTM + XGBoost)...")

        y_pred_hibrido, xgb_model = treinar_hibrido_xgboost(
            y_test,
            y_pred_lstm
        )

        close_min = scaler.data_min_[target_col_index]
        close_max = scaler.data_max_[target_col_index]
        close_range = close_max - close_min

        y_test_price = (y_test * close_range) + close_min
        y_pred_lstm_price = (y_pred_lstm * close_range) + close_min
        y_pred_hibrido_price = (y_pred_hibrido * close_range) + close_min

        prediction_dates = features_df.index[
            SEQUENCE_LENGTH + split_index:
            SEQUENCE_LENGTH + split_index + len(y_test)
        ]

        # ==================================================
        # MÉTRICAS
        # ==================================================

        print("\n→ Calculando métricas...")

        metricas_lstm = calcular_metricas(
            y_test_price,
            y_pred_lstm_price
        )

        metricas_hibrido = calcular_metricas(
            y_test_price,
            y_pred_hibrido_price
        )

        print("\n📈 RESULTADOS:")

        print(
            f"LSTM  → "
            f"RMSE: {metricas_lstm['RMSE']:.6f} | "
            f"MAE: {metricas_lstm['MAE']:.6f} | "
            f"R²: {metricas_lstm['R2']:.4f}"
        )

        print(
            f"HYBRID → "
            f"RMSE: {metricas_hibrido['RMSE']:.6f} | "
            f"MAE: {metricas_hibrido['MAE']:.6f} | "
            f"R²: {metricas_hibrido['R2']:.4f}"
        )

        # ==================================================
        # GRÁFICOS DE PREVISÃO
        # ==================================================

        print("\n→ Gerando gráficos de previsão...")

        gerar_grafico_comparativo(
            ticker=ticker,
            real=y_test_price,
            lstm_pred=y_pred_lstm_price,
            hybrid_pred=y_pred_hibrido_price,
            historico_datas=features_df.index,
            historico_close=features_df["Close"],
            previsao_datas=prediction_dates
        )

        print(f"\n{'='*70}")
        print(f"✅ {ticker} PROCESSADO COM SUCESSO")
        print(f"{'='*70}")
        key = ticker.lower()
        print(f"\n📁 Imagens em Frontend/public/images/:")
        print(f"   • {key}_fechamento.png")
        print(f"   • {key}_sma.png")
        print(f"   • {key}_valorizacao.png")
        print(f"   • {key}_report_total.png")
        print(f"   • {key}_report_teste.png\n")

        # ==================================================
        # LIMPEZA DE MEMÓRIA
        # ==================================================

        K.clear_session()
        gc.collect()

        return estatisticas

    except Exception as e:

        print(f"\nERRO AO PROCESSAR {ticker}")
        print(f"Detalhes: {str(e)}\n")

        # ==================================================
        # LIMPEZA DE MEMÓRIA (MESMO EM CASO DE ERRO)
        # ==================================================

        K.clear_session()
        gc.collect()

        return None


# ==========================================================
# EXECUÇÃO PRINCIPAL
# ==========================================================

def main():

    print("\n" + "═" * 80)
    print("PIPELINE FINANCEIRO - 2 FASES")
    print("═" * 80)
    print("\n📊 PHASE 1: Market Analytics / Historical Images")
    print("   • Historical charts")
    print("   • Valuation charts")
    print("   • Statistics & Technical Indicators")
    print("   • Historical information")
    print("\n🤖 PHASE 2: AI Prediction Pipeline")
    print("   • Create sequences")
    print("   • Train LSTM")
    print("   • Train XGBoost")
    print("   • Generate prediction graphics")
    print("\n" + "═" * 80 + "\n")

    todas_estatisticas = {}

    for ticker in ALL_TICKERS:

        stats = processar_ativo(ticker)

        if stats is not None:
            todas_estatisticas[ticker] = stats

    # ==================================================
    # SALVAR TODAS AS ESTATÍSTICAS
    # ==================================================

    salvar_todas_estatisticas_json(todas_estatisticas)

    if todas_estatisticas:
        exportar_assets_stats_frontend(todas_estatisticas)

    print("\n" + "═" * 80)
    print("PIPELINE FINALIZADO")
    print("═" * 80)


if __name__ == "__main__":

    main()
