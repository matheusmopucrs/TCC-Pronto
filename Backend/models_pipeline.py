"""
models_pipeline.py

Optimized pipeline:
- Faster LSTM
- Better convergence
- Hybrid LSTM + XGBoost
- Cleaner plotting
- Production-ready structure
"""

import os
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-GUI backend to avoid tkinter issues
import matplotlib.pyplot as plt
import seaborn as sns

from xgboost import XGBRegressor

from keras.models import Sequential
from keras.layers import LSTM, Dense, Dropout
from keras.callbacks import (
    EarlyStopping,
    ReduceLROnPlateau
)

from sklearn.metrics import (
    mean_squared_error,
    mean_absolute_error,
    r2_score
)


# ==========================================================
# IMAGE DIRECTORY
# ==========================================================

def criar_pasta_imagens():

    os.makedirs("images", exist_ok=True)


# ==========================================================
# FAST SEQUENCE CREATION
# ==========================================================

def create_sequences(data, look_back=60):
    """
    Optimized sliding-window sequence creation.
    """

    data = np.array(data, dtype=np.float32)

    x = np.lib.stride_tricks.sliding_window_view(
        data,
        window_shape=look_back,
        axis=0
    )

    x = x[:-1]

    y = data[look_back:]

    return x, y


# ==========================================================
# LIGHTWEIGHT LSTM
# ==========================================================

def construir_modelo_lstm(input_shape):
    """
    Faster and more stable LSTM architecture.
    """

    model = Sequential([

        LSTM(
            64,
            input_shape=input_shape
        ),

        Dropout(0.2),

        Dense(
            32,
            activation='relu'
        ),

        Dense(
            1,
            dtype='float32'
        )
    ])

    model.compile(
        optimizer='adam',
        loss='mse'
    )

    return model


# ==========================================================
# TRAIN LSTM
# ==========================================================

def treinar_lstm(
    model,
    x_train,
    y_train
):
    """
    Optimized LSTM training.
    """

    callbacks = [

        EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True,
            verbose=1
        ),

        ReduceLROnPlateau(
            monitor='val_loss',
            patience=5,
            factor=0.5,
            min_lr=1e-5,
            verbose=1
        )
    ]

    history = model.fit(
        x_train,
        y_train,
        validation_split=0.2,
        epochs=80,
        batch_size=128,
        shuffle=False,
        callbacks=callbacks,
        verbose=1
    )

    return history


# ==========================================================
# HYBRID XGBOOST
# ==========================================================

def treinar_hibrido_xgboost(
    real,
    pred_lstm
):
    """
    Trains XGBoost on LSTM residuals.
    """

    residuos = real - pred_lstm.flatten()

    x_features = np.column_stack([

        pred_lstm.flatten(),

        np.gradient(pred_lstm.flatten()),

        np.abs(np.gradient(pred_lstm.flatten()))
    ])

    model_xgb = XGBRegressor(

        n_estimators=800,
        learning_rate=0.03,
        max_depth=5,

        subsample=0.8,
        colsample_bytree=0.8,

        objective='reg:squarederror',

        tree_method='hist',

        random_state=42,
        n_jobs=-1
    )

    model_xgb.fit(x_features, residuos)

    ajuste = model_xgb.predict(x_features)

    previsao_hibrida = pred_lstm.flatten() + ajuste

    return previsao_hibrida, model_xgb


# ==========================================================
# METRICS
# ==========================================================

def calcular_metricas(real, pred):

    rmse = np.sqrt(mean_squared_error(real, pred))

    mae = mean_absolute_error(real, pred)

    r2 = r2_score(real, pred)

    return {
        "RMSE": rmse,
        "MAE": mae,
        "R2": r2
    }


# ==========================================================
# PLOT
# ==========================================================

def gerar_grafico_comparativo(
    ticker,
    real,
    lstm_pred,
    hybrid_pred,
    historico_datas=None,
    historico_close=None,
    previsao_datas=None
):
    """
    Generates cleaner financial plots.
    """

    criar_pasta_imagens()

    sns.set_style("darkgrid")

    plt.figure(figsize=(18, 8))

    if historico_datas is not None and historico_close is not None:

        plt.plot(
            historico_datas,
            historico_close,
            label='Close Price',
            color='gray',
            linewidth=2,
            alpha=0.45
        )

    x_axis = previsao_datas if previsao_datas is not None else range(len(real))

    plt.plot(
        x_axis,
        real,
        label='Real Price (test)',
        color='black',
        linewidth=2,
        alpha=0.75
    )

    plt.plot(
        x_axis,
        lstm_pred,
        label='Pure LSTM',
        linewidth=2,
        alpha=0.8
    )

    plt.plot(
        x_axis,
        hybrid_pred,
        label='Hybrid LSTM + XGBoost',
        linewidth=3
    )

    plt.title(
        f"{ticker} Prediction Comparison",
        fontsize=18,
        fontweight='bold'
    )

    plt.xlabel("Date" if previsao_datas is not None else "Time")
    plt.ylabel("Price")

    plt.legend(fontsize=12)

    plt.tight_layout()

    path = f"images/{ticker}_comparison_report.png"

    plt.savefig(
        path,
        dpi=300,
        bbox_inches='tight'
    )

    plt.close()

    print(f"Graph saved: {path}")
