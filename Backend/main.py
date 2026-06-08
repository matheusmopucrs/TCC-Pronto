"""
main.py — FastAPI entrypoint

Iniciar o servidor:
    cd backend
    uvicorn main:app --reload --port 8000

Endpoints:
    GET /api/stocks                  Lista os 20 ativos disponíveis
    GET /api/stocks/{slug}           Dados reais do ativo via yfinance (cache 15 min)
    GET /api/predictions/{slug}      Predições LSTM + Híbrido + métricas acadêmicas
    GET /api/backtest/{slug}         Backtesting da estratégia direcional
"""

import logging
from contextlib import asynccontextmanager
from typing import Annotated, Optional

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from services.data_service import DataService
from services.ml_service import MLService
from services.finance_service import FinanceService

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
log = logging.getLogger(__name__)


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class StockListItem(BaseModel):
    slug: str
    ticker: str
    label: str
    exchange: str
    country: str
    sector: str

class StockListResponse(BaseModel):
    stocks: list[StockListItem]


class HistoryPoint(BaseModel):
    date: str
    close: float
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None

class StockDetailResponse(BaseModel):
    slug: str
    ticker: str
    label: str
    exchange: str
    country: str
    sector: str
    price: float
    change_pct: float
    open: float
    high: float
    low: float
    volume: int
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    appreciation_12m: float
    volatility_ann: float
    history: list[HistoryPoint]


class ModelMetrics(BaseModel):
    mae: float
    rmse: float
    mape: float
    r2: float
    directional_accuracy: float

class TestPoint(BaseModel):
    date: str
    actual: float
    lstm: float
    hybrid: float

class ForecastPoint(BaseModel):
    date: str
    price: float

class ForecastBlock(BaseModel):
    from_date: str
    lstm: list[ForecastPoint]
    hybrid: list[ForecastPoint]

class PredictionsResponse(BaseModel):
    slug: str
    ticker: str
    test_period: list[TestPoint]
    forecast: ForecastBlock
    metrics: dict[str, ModelMetrics]


class EquityPoint(BaseModel):
    date: str
    value: float

class BacktestResult(BaseModel):
    cumulative_return: float
    sharpe_ratio: float
    max_drawdown: float
    profit_factor: float
    equity_curve: list[EquityPoint]

class BacktestResponse(BaseModel):
    slug: str
    ticker: str
    lstm: BacktestResult
    hybrid: BacktestResult


# ── app lifespan ──────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.data_svc = DataService()
    app.state.ml_svc = MLService()
    app.state.fin_svc = FinanceService()
    log.info("Services ready. Available models: %s", app.state.ml_svc.available_models())
    yield


app = FastAPI(
    title="TCC — Stock Forecasting API",
    description="Previsão de preços com LSTM e LSTM+XGBoost híbrido",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://localhost:4173",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8083",
        "http://localhost:8084",
        "http://localhost:8085",
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)


# ── exception handlers ────────────────────────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exc_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

@app.exception_handler(Exception)
async def generic_exc_handler(request: Request, exc: Exception):
    log.error("Unhandled: %s", exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Erro interno no servidor."})


# ── dependency helpers ────────────────────────────────────────────────────────

def _data(req: Request) -> DataService:
    return req.app.state.data_svc

def _ml(req: Request) -> MLService:
    return req.app.state.ml_svc

def _fin(req: Request) -> FinanceService:
    return req.app.state.fin_svc

DS = Annotated[DataService, Depends(_data)]
ML = Annotated[MLService, Depends(_ml)]
FS = Annotated[FinanceService, Depends(_fin)]


# ── routes ────────────────────────────────────────────────────────────────────

@app.get("/api/stocks", response_model=StockListResponse)
async def list_stocks(ds: DS):
    return ds.get_stock_list()


@app.get("/api/stocks/{slug}", response_model=StockDetailResponse)
async def get_stock(slug: str, ds: DS):
    data = ds.get_stock_detail(slug)
    if data is None:
        raise HTTPException(
            status_code=404,
            detail=f"Ativo não encontrado: '{slug}'. Verifique se o slug é válido (ex: aapl, petr4).",
        )
    return data


@app.get("/api/predictions/{slug}", response_model=PredictionsResponse)
async def get_predictions(slug: str, ml: ML):
    data = ml.get_predictions(slug)
    if data is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Modelo não treinado para '{slug}'. "
                f"Execute: python backend/train.py"
            ),
        )
    return data


@app.get("/api/backtest/{slug}", response_model=BacktestResponse)
async def get_backtest(slug: str, ml: ML, fin: FS):
    preds = ml.get_predictions(slug)
    if preds is None:
        raise HTTPException(
            status_code=404,
            detail=f"Modelo não treinado para '{slug}'. Execute: python backend/train.py",
        )
    result = fin.run_backtest(slug, preds)
    if result is None:
        raise HTTPException(status_code=500, detail="Erro ao calcular backtesting.")
    return result


@app.get("/health")
async def health():
    return {"status": "ok"}
