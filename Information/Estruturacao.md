# Estruturação do Projeto — TCC

> **Tema:** Previsão de preços de ações utilizando modelos LSTM e híbridos LSTM + XGBoost: Uma análise compensatória
> **Autor:** Matheus Magri Oliveira
> **Stack:** Python 3.11 + FastAPI (backend) · React 19 + TypeScript + Vite (frontend)

---

## Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Estrutura de Pastas](#2-estrutura-de-pastas)
3. [Backend — Pipeline de Treinamento](#3-backend--pipeline-de-treinamento)
4. [Backend — Servidor FastAPI](#4-backend--servidor-fastapi)
5. [Frontend — Aplicação React](#5-frontend--aplicação-react)
6. [Fluxo Completo de Dados](#6-fluxo-completo-de-dados)
7. [API Reference](#7-api-reference)
8. [Design System](#8-design-system)
9. [Como Rodar o Projeto](#9-como-rodar-o-projeto)
10. [Ativos Cobertos](#10-ativos-cobertos)
11. [Notas Metodológicas](#11-notas-metodológicas)

---

## 1. Visão Geral da Arquitetura

O projeto é dividido em **três camadas independentes** que se comunicam de forma clara:

```
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA 1 — TREINAMENTO OFFLINE (roda uma vez)                  │
│                                                                 │
│  python backend/train.py                                        │
│  ├── Baixa dados históricos (2013 → hoje) via yfinance         │
│  ├── Treina LSTM (TensorFlow/Keras)                            │
│  ├── Treina XGBoost nos resíduos do LSTM                       │
│  ├── Salva modelos em backend/models/                          │
│  └── Gera PNGs históricos em Frontend/public/images/           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (artefatos em disco)
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA 2 — SERVIDOR DE API (FastAPI)                           │
│                                                                 │
│  uvicorn main:app --reload --port 8000                          │
│  ├── GET /api/stocks          → lista os 20 ativos             │
│  ├── GET /api/stocks/{slug}   → dados reais via yfinance       │
│  ├── GET /api/predictions/{slug} → carrega modelos + forecast  │
│  └── GET /api/backtest/{slug} → simula estratégia direcional   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (HTTP/JSON)
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA 3 — INTERFACE WEB (React + Vite)                        │
│                                                                 │
│  npm run dev  (porta 5173 ou próxima disponível)                │
│  ├── /               → Introdução e metodologia                │
│  ├── /dados-iniciais → Snapshot real-time + gráfico 12 meses   │
│  └── /previsoes      → Predições, métricas e backtesting       │
└─────────────────────────────────────────────────────────────────┘
```

**Decisão arquitetural chave:** O treinamento LSTM leva 5–15 minutos por ativo, impossível fazer em tempo real em uma requisição HTTP. A solução adotada é **híbrida**:
- Dados de mercado (preços, SMAs, histórico) → **sempre em tempo real** via yfinance
- Predições e métricas → **modelos pré-treinados** carregados na inicialização da API, inferência em < 100ms

---

## 2. Estrutura de Pastas

```
TCC-Final/
│
├── backend/                         ← Raiz do servidor Python
│   ├── main.py                      ← FastAPI: app, CORS, rotas, schemas Pydantic
│   ├── train.py                     ← Pipeline offline de treinamento
│   ├── requirements.txt             ← Dependências Python (sem TA-Lib)
│   ├── data_processor.py            ← Legado: download + features + PNGs matplotlib
│   ├── models_pipeline.py           ← Legado: arquitetura LSTM + plots de comparação
│   ├── models/                      ← Artefatos gerados pelo train.py (gitignored)
│   │   ├── AAPL_lstm.keras          ← Pesos do modelo LSTM (Keras SavedModel)
│   │   ├── AAPL_xgb.pkl             ← Modelo XGBoost serializado (joblib)
│   │   ├── AAPL_scaler.pkl          ← MinMaxScaler do Close price (joblib)
│   │   └── AAPL_predictions.json   ← Predições do test set + métricas
│   └── services/
│       ├── __init__.py
│       ├── data_service.py          ← yfinance real-time, cache 15 min, SMAs pandas
│       ├── ml_service.py            ← Carrega modelos, gera forecast autorregressivo
│       └── finance_service.py       ← Backtesting: Sharpe, Drawdown, Profit Factor
│
├── Frontend/
│   ├── package.json                 ← Dependências Node (React 19, Recharts, Radix UI)
│   ├── vite.config.ts               ← Vite 7 via preset @lovable.dev/vite-tanstack-config
│   ├── tsconfig.json                ← TypeScript strict mode, paths @/*
│   └── src/
│       ├── styles.css               ← Design system: paleta, fontes, Tailwind v4
│       ├── router.tsx               ← Configuração do TanStack Router
│       ├── data/
│       │   ├── assets-meta.ts       ← Metadados estáticos (ticker, setor, descrição)
│       │   └── assets-stats.json    ← Gerado por train.py (preços históricos)
│       ├── services/
│       │   ├── api.ts               ← Cliente HTTP tipado (fetch + tipos TypeScript)
│       │   └── assets.ts            ← Helpers de formatação e paths de imagens
│       ├── lib/
│       │   ├── assets.ts            ← Re-exporta tipos e utilidades
│       │   └── utils.ts             ← cn() = clsx + tailwind-merge
│       ├── components/
│       │   ├── AssetFilter.tsx      ← Dropdown de seleção do ativo (URL search param)
│       │   ├── MetricCard.tsx       ← Card de métrica (valor grande + delta + hint)
│       │   ├── PipelineFigure.tsx   ← Wrapper para imagens PNG com fallback
│       │   ├── SiteSidebar.tsx      ← Navegação lateral (oculta no mobile)
│       │   └── ui/                  ← 40+ primitivos Radix UI (shadcn/ui)
│       ├── hooks/
│       │   └── use-mobile.tsx       ← Hook de breakpoint (< 768px)
│       └── routes/
│           ├── __root.tsx           ← Layout raiz: sidebar + <Outlet />
│           ├── index.tsx            ← Página de introdução e metodologia
│           ├── dados-iniciais.tsx   ← Dados de mercado + gráfico Recharts 12 meses
│           └── previsoes.tsx        ← Predições + forecast + backtesting + PNGs
│
├── venv/                            ← Ambiente virtual Python (gitignored)
├── .gitignore
└── README.md
```

---

## 3. Backend — Pipeline de Treinamento

### `backend/train.py`

Executado **uma única vez** antes de iniciar o servidor. Processa os 20 ativos em sequência.

#### Fluxo por ativo:

```
yfinance.download(ticker, start="2013-01-01", end=hoje)
         │
         ▼
  DataFrame OHLCV (≈ 3.400 dias úteis)
         │
         ▼
  MinMaxScaler.fit_transform(Close)        ← escala [0, 1]
  → salvo em models/{TICKER}_scaler.pkl
         │
         ▼
  create_sequences(close_scaled, look_back=60)
  → X shape: (N, 60, 1)   Y shape: (N,)
  → cada sequência = 60 dias de fechamento normalizado
         │
         ▼
  Split temporal 80/20 (sem embaralhamento)
  → Treino: ≈ 2.650 sequências
  → Teste:  ≈  664 sequências
         │
         ▼
  ┌──────────────────────────────────────────┐
  │  LSTM  (TensorFlow/Keras)                │
  │  Input:  (60, 1)                         │
  │  LSTM(64 units)                          │
  │  Dropout(0.2)                            │
  │  Dense(32, relu)                         │
  │  Dense(1)          ← saída normalizada   │
  │                                          │
  │  Otimizador: Adam  Loss: MSE             │
  │  Epochs: 80 (EarlyStopping patience=10)  │
  │  BatchSize: 128    Val split: 20%        │
  └──────────────────────────────────────────┘
         │
         ▼
  Predições LSTM no test set → y_pred_lstm_scaled
         │
         ▼
  Resíduos = y_test - y_pred_lstm
         │
         ▼
  ┌──────────────────────────────────────────┐
  │  XGBoost  (modelo híbrido)               │
  │  Features: [pred_lstm,                   │
  │             gradient(pred_lstm),         │
  │             |gradient(pred_lstm)|]       │
  │                                          │
  │  Aprende a CORRIGIR os erros do LSTM     │
  │  n_estimators: 800  lr: 0.03             │
  │  max_depth: 5  subsample: 0.8            │
  └──────────────────────────────────────────┘
         │
         ▼
  Predição híbrida = y_pred_lstm + ajuste_xgb
         │
         ▼
  Desnormalização → preços reais (USD / BRL)
         │
         ▼
  Cálculo de 5 métricas (no test set):
  ├── MAE   — Erro médio absoluto
  ├── RMSE  — Raiz do erro quadrático médio
  ├── MAPE  — Erro percentual médio absoluto
  ├── R²    — Coeficiente de determinação
  └── DA    — Directional Accuracy (% de direções corretas)
         │
         ▼
  Salva artefatos em backend/models/:
  ├── {TICKER}_lstm.keras          (Keras SavedModel)
  ├── {TICKER}_xgb.pkl             (joblib)
  ├── {TICKER}_scaler.pkl          (joblib)
  └── {TICKER}_predictions.json   (test dates + actual + lstm + hybrid + metrics)
         │
         ▼
  Gera PNGs em Frontend/public/images/ (via data_processor.py + TA-Lib):
  ├── {ticker}_fechamento.png      (preço de fechamento histórico)
  ├── {ticker}_sma.png             (SMA 20 e SMA 50)
  ├── {ticker}_valorizacao.png     (retorno acumulado %)
  ├── {ticker}_report_total.png   (treino + teste: real vs LSTM vs híbrido)
  └── {ticker}_report_teste.png   (zoom no período de teste)
         │
         ▼
  Exporta Frontend/src/data/assets-stats.json
  (preço inicial, preço atual, valorização total, volatilidade anual)
```

#### Estrutura do `_predictions.json`:

```json
{
  "test_dates":  ["2023-10-12", "2023-10-13", ...],   // 664 datas
  "actual":      [178.21, 179.83, ...],                // preços reais
  "lstm":        [176.40, 180.10, ...],                // predições LSTM
  "hybrid":      [178.05, 179.90, ...],                // predições híbridas
  "metrics": {
    "lstm":   { "mae": 6.66, "rmse": 8.82, "mape": 3.14, "r2": 0.935, "directional_accuracy": 51.6 },
    "hybrid": { "mae": 0.85, "rmse": 1.08, "mape": 0.40, "r2": 0.999, "directional_accuracy": 83.3 }
  }
}
```

---

## 4. Backend — Servidor FastAPI

### `backend/main.py`

Inicializa o app FastAPI com três serviços instanciados no startup e quatro rotas.

#### Inicialização (lifespan):

```python
@asynccontextmanager
async def lifespan(app):
    app.state.data_svc    = DataService()   # cache em memória, TTL 15 min
    app.state.ml_svc      = MLService()     # escaneia e carrega modelos do disco
    app.state.fin_svc     = FinanceService()
    yield
```

Ao iniciar, o `MLService` varre `backend/models/` e registra quais ativos têm `_predictions.json` disponível. Os modelos `.keras` e `.pkl` são carregados **sob demanda** na primeira requisição de cada ativo e mantidos em cache de memória.

---

### `services/data_service.py`

Responsável pelos dados **reais e atualizados** de mercado. Usa `yfinance.Ticker.history()` diretamente — sem TA-Lib.

**Cache:** dicionário em memória com timestamp. Qualquer dado com menos de 15 minutos é retornado do cache sem nova chamada à API do Yahoo Finance (evita rate-limit e reduz latência).

**Médias móveis calculadas em pandas:**
```python
hist["sma_20"] = hist["Close"].rolling(20).mean()
hist["sma_50"] = hist["Close"].rolling(50).mean()
```

---

### `services/ml_service.py`

Carrega os artefatos gerados por `train.py` e executa inferência.

**Forecast autorregressivo (30 dias úteis):**

```
Seed: últimos 60 fechamentos reais (do yfinance)
      │
Para cada dia futuro (1..30):
  ├── x = janela[-60:].reshape(1, 60, 1)
  ├── pred_scaled = lstm_model.predict(x)     ← normalizado
  ├── acrescenta pred_scaled à janela
  └── pred_scaled → lista lstm_preds_scaled
      │
xgb_features = [lstm_preds_scaled, grad, |grad|]
xgb_adj      = xgb_model.predict(xgb_features)
hybrid_preds = lstm_preds_scaled + xgb_adj
      │
scaler.inverse_transform(...)  → preços em USD/BRL
```

---

### `services/finance_service.py`

Simula uma **estratégia direcional simples** sobre o período de teste:

- **Sinal:** posição comprada no dia `t+1` se `predicted[t+1] > actual[t]`
- **Retorno:** `actual[t+1] / actual[t] - 1` quando há sinal, zero caso contrário
- **Curva de equity:** produto cumulativo dos retornos diários (começa em 1.0)

**Métricas calculadas:**

| Métrica | Fórmula |
|---|---|
| Retorno Acumulado | `(equity_final - 1) × 100` |
| Sharpe Ratio | `(mean_return / std_return) × √252` |
| Max Drawdown | `min((equity - peak) / peak) × 100` |
| Profit Factor | `Σganhos / Σperdas` |

---

## 5. Frontend — Aplicação React

### Stack completa

| Tecnologia | Versão | Função |
|---|---|---|
| React | 19.2 | UI framework |
| TypeScript | 5.8 | Tipagem estática |
| Vite | 7.3 | Bundler + dev server |
| TanStack Router | 1.168 | Roteamento file-based com type safety |
| Tailwind CSS | 4.2 | Utilitários CSS |
| Recharts | 2.15 | Gráficos interativos |
| Radix UI | vários | Primitivos acessíveis (dropdown, dialog, etc.) |
| Zod | 3.24 | Validação de search params |

---

### Roteamento — TanStack Router

O roteamento é **file-based**: cada arquivo em `src/routes/` vira uma rota automaticamente.

```
src/routes/
├── __root.tsx          →  /         (layout raiz — sidebar + outlet)
├── index.tsx           →  /         (página Home)
├── dados-iniciais.tsx  →  /dados-iniciais?asset=aapl
└── previsoes.tsx       →  /previsoes?asset=aapl
```

O parâmetro `asset` é um **search param** tipado com Zod:
```typescript
const searchSchema = z.object({
  asset: fallback(z.enum(ASSET_SLUGS), "aapl").default("aapl"),
});
```

Isso garante que: URLs inválidas fazem fallback para `aapl`, os tipos são inferidos pelo router, e links como `<Link to="/previsoes" search={{ asset: "petr4" }}>` são type-safe.

---

### `src/services/api.ts` — Cliente HTTP

Centraliza todas as chamadas ao FastAPI. URL base configurável via variável de ambiente:

```typescript
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
```

Todas as funções usam `fetch` nativo com tratamento de erro padronizado — se o servidor retornar um erro HTTP, a mensagem do campo `detail` do JSON é propagada como `Error`.

**Funções exportadas:**
```typescript
fetchStockList()              → Promise<StockListResponse>
fetchStockDetail(slug)        → Promise<StockDetail>
fetchPredictions(slug)        → Promise<PredictionsResponse>
fetchBacktest(slug)           → Promise<BacktestResponse>
```

---

### `src/data/assets-meta.ts` — Metadados estáticos

Define os 20 ativos com dados que **não mudam** (não vêm da API):

```typescript
interface AssetMeta {
  slug: string;        // "aapl" — usado na URL e nas chamadas de API
  ticker: string;      // "AAPL" — ticker real do yfinance
  label: string;       // "Apple Inc."
  kind: "equity";      // todos equity (sem crypto no dataset)
  sector: string;      // "Technology · Consumer Electronics"
  country: string;     // "United States" ou "Brazil"
  exchange: string;    // "NASDAQ" ou "B3"
  description: string; // parágrafo descritivo
  marketCap: string;   // "US$ 2.7T" (valor estático aproximado)
}
```

---

### Páginas (Routes)

#### `/` — `index.tsx` (Introdução)

Página estática de apresentação do TCC. Contém:
- **Hero:** título editorial, botões de navegação, bloco de estatísticas (20 ativos, 2 modelos, melhor DA)
- **Abstract:** descrição da metodologia LSTM + XGBoost híbrido
- **What the briefing covers:** cards de navegação para as 3 seções
- **Methodology:** grid com as 4 etapas do pipeline
- Sem chamadas de API — dados fixos

---

#### `/dados-iniciais` — `dados-iniciais.tsx` (Dados de Mercado)

Mostra o snapshot real-time do ativo selecionado. **Tem chamadas de API.**

**Fluxo de dados:**
```
asset slug (URL param)
    │
    ▼
fetchStockDetail(slug) → GET /api/stocks/{slug}
    │
    ▼ (dados reais do yfinance, cache 15 min)
┌─────────────────────────────────────────────────────┐
│  Snapshot: preço atual, variação %, open, high, low │
│  Médias móveis: SMA 20, SMA 50 atuais              │
│  Stats 12 meses: apreciação %, volatilidade anual  │
│  Histórico: 251 pontos diários (date, close,       │
│             sma_20, sma_50)                        │
└─────────────────────────────────────────────────────┘
    │
    ▼
Recharts LineChart — 3 séries:
  • Close price      (linha sólida preta)
  • SMA 20           (tracejado marrom/accent)
  • SMA 50           (tracejado verde/positive)
```

**Estados de UI:**
- `loading = true` → skeletons animados nos cards e placeholder no gráfico
- `error !== null` → mensagem de erro editorial + instrução de como iniciar o backend
- `data !== null` → renderiza tudo

---

#### `/previsoes` — `previsoes.tsx` (Predições)

Página principal do TCC. Carrega predições e backtesting em paralelo. **Tem chamadas de API.**

**Fluxo de dados:**
```
asset slug (URL param)
    │
    ▼
Promise.all([
  fetchPredictions(slug),   → GET /api/predictions/{slug}
  fetchBacktest(slug)       → GET /api/backtest/{slug}
])
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│  Section 1: MetricCards (4 cards)                            │
│    • RMSE Híbrido vs RMSE LSTM                               │
│    • MAE Híbrido                                             │
│    • Directional Accuracy Híbrido vs LSTM                    │
│    • Max Drawdown da estratégia                              │
│                                                              │
│  Section 2: Tabela comparativa (5 métricas × 2 modelos)     │
│    MAE / RMSE / MAPE / R² / DA — modelo vencedor destacado  │
│                                                              │
│  Section 3: Recharts — Test Period (últimos 180 pontos)     │
│    • Real (preto)                                            │
│    • LSTM puro (tracejado marrom)                            │
│    • LSTM + XGBoost (verde)                                  │
│                                                              │
│  Section 4: Recharts — Forecast 30 dias úteis               │
│    • Âncora: últimos 10 pontos reais                         │
│    • ReferenceLine na data de início do forecast             │
│    • LSTM forecast (tracejado)                               │
│    • Híbrido forecast (sólido)                               │
│                                                              │
│  Section 5: MetricCards de backtesting                       │
│    Retorno acumulado / Sharpe / Max Drawdown / Profit Factor │
│                                                              │
│  Section 6: PNGs estáticos (gerados pelo pipeline offline)  │
│    fechamento · sma · valorizacao                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Fluxo Completo de Dados

```
                    TREINAMENTO OFFLINE
                    ───────────────────
Yahoo Finance ──► yfinance.download() ──► OHLCV 2013-hoje
                          │
                    MinMaxScaler (Close)
                          │
                  Sequências 60 dias
                     ┌────┴────┐
                  80% treino  20% teste
                     │
                  LSTM treina │ prediz no teste
                          │
                  Resíduos ──► XGBoost treina
                          │
                  Métricas (5) calculadas
                          │
              ┌───────────┴───────────────┐
         .keras .pkl .pkl             _predictions.json
         (modelos)                    (test dates/preds/metrics)
              │                           │
              │                   assets-stats.json (frontend)
              │                   PNGs matplotlib (frontend/public)
              │
                    RUNTIME (API + BROWSER)
                    ──────────────────────
Usuário seleciona aapl
        │
        ├─► fetchStockDetail("aapl")
        │       │
        │   FastAPI ──► yfinance.Ticker("AAPL").history("1y")
        │       │       pandas SMA 20/50
        │       └──► JSON: price, change_pct, history[251]
        │               │
        │           Recharts LineChart (12 meses)
        │
        └─► fetchPredictions("aapl")
                │
            FastAPI ──► carrega AAPL_predictions.json (disk)
                │       carrega AAPL_lstm.keras (memória)
                │       carrega AAPL_xgb.pkl (memória)
                │       yfinance últimos 6 meses (seed)
                │       forecast autorregressivo 30 dias
                └──► JSON: test_period[180] + forecast[30] + metrics
                        │
                    Recharts LineChart (test period)
                    Recharts LineChart (forecast)
                    MetricCards (5 métricas)
```

---

## 7. API Reference

Base URL: `http://localhost:8000`

Documentação interativa (Swagger): `http://localhost:8000/docs`

---

### `GET /api/stocks`

Lista todos os 20 ativos disponíveis.

**Response:**
```json
{
  "stocks": [
    {
      "slug": "aapl",
      "ticker": "AAPL",
      "label": "Apple Inc.",
      "exchange": "NASDAQ",
      "country": "United States",
      "sector": "Technology · Consumer Electronics"
    }
  ]
}
```

---

### `GET /api/stocks/{slug}`

Dados reais do ativo via yfinance. Cache de 15 minutos.

**Parâmetros:** `slug` = slug do ativo (ex: `aapl`, `petr4`)

**Response:**
```json
{
  "slug": "aapl",
  "ticker": "AAPL",
  "price": 307.34,
  "change_pct": -1.25,
  "open": 310.00,
  "high": 311.50,
  "low": 306.80,
  "volume": 48200000,
  "sma_20": 304.24,
  "sma_50": 281.09,
  "appreciation_12m": 51.31,
  "volatility_ann": 22.36,
  "history": [
    { "date": "2025-06-06", "close": 203.11, "sma_20": null, "sma_50": null },
    { "date": "2025-06-09", "close": 205.35, "sma_20": 201.20, "sma_50": null }
  ]
}
```

**Erros:**
- `404` — slug não reconhecido
- `500` — falha no yfinance (timeout, ticker inválido)

---

### `GET /api/predictions/{slug}`

Predições do período de teste (pré-computadas) + forecast 30 dias (computado em tempo real com modelos salvos).

**Response:**
```json
{
  "slug": "aapl",
  "ticker": "AAPL",
  "test_period": [
    { "date": "2025-09-18", "actual": 237.21, "lstm": 241.18, "hybrid": 237.52 }
  ],
  "forecast": {
    "from_date": "2026-06-08",
    "lstm":   [{ "date": "2026-06-08", "price": 309.10 }],
    "hybrid": [{ "date": "2026-06-08", "price": 307.80 }]
  },
  "metrics": {
    "lstm":   { "mae": 6.66, "rmse": 8.82, "mape": 3.14, "r2": 0.935, "directional_accuracy": 51.6 },
    "hybrid": { "mae": 0.85, "rmse": 1.08, "mape": 0.40, "r2": 0.999, "directional_accuracy": 83.3 }
  }
}
```

**Erros:**
- `404` — modelo não treinado ainda; rodar `python backend/train.py`

---

### `GET /api/backtest/{slug}`

Simula estratégia direcional sobre o test set.

**Response:**
```json
{
  "slug": "aapl",
  "ticker": "AAPL",
  "lstm": {
    "cumulative_return": 25.09,
    "sharpe_ratio": 1.620,
    "max_drawdown": -15.27,
    "profit_factor": 1.350,
    "equity_curve": [{ "date": "2025-09-18", "value": 1.0000 }]
  },
  "hybrid": {
    "cumulative_return": 168.21,
    "sharpe_ratio": 9.326,
    "max_drawdown": -0.59,
    "profit_factor": 39.146,
    "equity_curve": [{ "date": "2025-09-18", "value": 1.0000 }]
  }
}
```

---

## 8. Design System

O frontend usa uma paleta **editorial** inspirada em publicações financeiras impressas, definida inteiramente em CSS custom properties com espaço de cor OKLch:

### Paleta de cores

| Token | Valor OKLch | Uso |
|---|---|---|
| `--paper` | `oklch(0.945 0.012 80)` | Fundo da página |
| `--surface` | `oklch(0.915 0.014 80)` | Cards e painéis |
| `--ink` | `oklch(0.165 0.005 60)` | Texto principal |
| `--ink-muted` | `oklch(0.48 0.008 70)` | Texto secundário, labels |
| `--hairline` | `oklch(0.85 0.012 80)` | Bordas finas |
| `--accent` | `oklch(0.55 0.165 35)` | Marrom — interativo, LSTM |
| `--positive` | `oklch(0.5 0.12 150)` | Verde — híbrido, ganhos |
| `--negative` | `oklch(0.55 0.18 25)` | Vermelho — perdas, quedas |

### Tipografia

| Família | Font | Uso |
|---|---|---|
| `--font-serif` | Newsreader | Títulos, textos editoriais longos |
| `--font-sans` | Public Sans | Corpo, UI geral |
| `--font-mono` | JetBrains Mono | Dados numéricos, labels, código |

### Cores nos gráficos Recharts

| Série | Cor | Token |
|---|---|---|
| Preço real | `oklch(0.165 0.005 60)` | `--ink` |
| LSTM puro | `oklch(0.55 0.165 35)` | `--accent` |
| LSTM + XGBoost | `oklch(0.5 0.12 150)` | `--positive` |
| SMA 20 | `oklch(0.55 0.165 35)` | `--accent` |
| SMA 50 | `oklch(0.5 0.12 150)` | `--positive` |

---

## 9. Como Rodar o Projeto

### Pré-requisitos

- Python 3.11+
- Node.js 20+
- Git

### Passo 1 — Clonar e configurar o ambiente Python

```bash
git clone <url-do-repositorio>
cd TCC-Final

# Criar venv
python -m venv venv

# Ativar (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Instalar dependências da API
pip install -r backend/requirements.txt
```

> **TA-Lib (opcional):** necessário apenas para gerar os PNGs históricos (fechamento, sma, valorizacao). Baixe o binário para Windows em https://github.com/cgohlke/talib-build e instale com `pip install TA_Lib-*.whl`.

### Passo 2 — Treinar os modelos (uma vez, ~2–4 horas)

```powershell
# No Windows PowerShell, na raiz do projeto:
$env:PYTHONUTF8 = "1"
cd backend
python train.py
```

Isso gera todos os arquivos em `backend/models/` e os PNGs em `Frontend/public/images/`.

### Passo 3 — Iniciar o servidor FastAPI

```powershell
# Terminal dedicado (mantém rodando):
$env:PYTHONUTF8 = "1"
cd backend
..\venv\Scripts\uvicorn.exe main:app --reload --port 8000
```

Verificar: `http://localhost:8000/health` deve retornar `{"status":"ok"}`

Documentação interativa: `http://localhost:8000/docs`

### Passo 4 — Iniciar o frontend

```powershell
# Outro terminal:
cd Frontend
npm install          # apenas na primeira vez
npm run dev
```

Abrir o URL exibido pelo Vite (normalmente `http://localhost:5173`).

### Resumo dos comandos (após setup inicial)

```powershell
# Terminal 1 — API
$env:PYTHONUTF8 = "1"; cd backend
..\venv\Scripts\uvicorn.exe main:app --reload --port 8000

# Terminal 2 — Frontend
cd Frontend; npm run dev
```

---

## 10. Ativos Cobertos

### Internacionais (NASDAQ)

| Slug | Ticker | Empresa | Setor |
|---|---|---|---|
| aapl | AAPL | Apple Inc. | Technology · Consumer Electronics |
| msft | MSFT | Microsoft Corp. | Technology · Software & Cloud |
| googl | GOOGL | Alphabet Inc. | Communication Services · Internet |
| amzn | AMZN | Amazon.com Inc. | Consumer Cyclical · E-commerce |
| meta | META | Meta Platforms | Communication Services · Social Media |
| nvda | NVDA | NVIDIA Corp. | Technology · Semiconductors |
| tsla | TSLA | Tesla Inc. | Consumer Cyclical · Automotive |
| nflx | NFLX | Netflix Inc. | Communication Services · Streaming |
| adbe | ADBE | Adobe Inc. | Technology · Software |
| intc | INTC | Intel Corp. | Technology · Semiconductors |

### Brasileiras (B3)

| Slug | Ticker | Empresa | Setor |
|---|---|---|---|
| petr4 | PETR4.SA | Petrobras | Energy · Integrated Oil & Gas |
| vale3 | VALE3.SA | Vale S.A. | Basic Materials · Mining |
| itub4 | ITUB4.SA | Itaú Unibanco | Financial Services · Banks |
| bbdc4 | BBDC4.SA | Bradesco | Financial Services · Banks |
| bbas3 | BBAS3.SA | Banco do Brasil | Financial Services · Banks |
| abev3 | ABEV3.SA | Ambev | Consumer Defensive · Beverages |
| mglu3 | MGLU3.SA | Magazine Luiza | Consumer Cyclical · Retail |
| wege3 | WEGE3.SA | WEG S.A. | Industrials · Electrical Equipment |
| suzb3 | SUZB3.SA | Suzano | Basic Materials · Paper & Pulp |
| eqtl3 | EQTL3.SA | Equatorial Energia | Utilities · Electric Power |

---

## 11. Notas Metodológicas

### Por que LSTM para séries temporais?

O LSTM (*Long Short-Term Memory*) é uma variante de rede neural recorrente projetada para aprender dependências de longo prazo em sequências. Diferente de redes feed-forward, o LSTM mantém um **estado de célula** que persiste entre timesteps, controlado por três portas:

- **Forget gate:** decide o que descartar do estado anterior
- **Input gate:** decide o que adicionar ao estado
- **Output gate:** decide o que usar como saída

No projeto, cada sequência de entrada contém **60 dias úteis** de fechamento normalizado, capturando padrões de curto (dias) e médio prazo (trimestral).

### Por que XGBoost nos resíduos?

O LSTM, sendo um modelo paramétrico treinado com gradiente descendente, tende a subestimar picos e vales bruscos — seus erros formam **padrões sistemáticos** (resíduos não-aleatórios). O XGBoost, sendo um ensemble de árvores de decisão, é ideal para capturar esses padrões não-lineares nos resíduos.

A predição final é: `hybrid = lstm_pred + xgb_correction`

### Limitação conhecida: métricas do híbrido no test set

O XGBoost é **treinado e avaliado sobre o mesmo conjunto de teste**. Isso resulta em métricas irrealisticamente boas (RMSE ≈ 1.08 para AAPL, R² ≈ 0.999). Na prática, as métricas do LSTM (RMSE ≈ 8.82, DA ≈ 51.6%) são mais representativas da capacidade de generalização real do sistema. Para o **forecast futuro**, o XGBoost interpola os padrões aprendidos para novos dados — este é o uso metodologicamente correto. Esta limitação é reconhecida e discutida no trabalho.

### Período de análise

- **Início:** 01/01/2013 (disponibilidade histórica consistente para todos os ativos)
- **Fim:** data atual (atualizado a cada execução do `train.py`)
- **Split:** 80% treino temporal / 20% teste temporal (sem embaralhamento, preserva ordem cronológica)
- **Lookback:** 60 dias úteis (≈ 3 meses de pregões)