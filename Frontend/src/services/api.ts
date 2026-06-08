/**
 * api.ts — Cliente tipado para o backend FastAPI.
 *
 * Base URL configurável via VITE_API_URL (default: http://localhost:8000).
 * Todos os erros HTTP são re-lançados como Error com a mensagem do backend.
 */

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StockListItem {
  slug: string;
  ticker: string;
  label: string;
  exchange: string;
  country: string;
  sector: string;
}
export interface StockListResponse {
  stocks: StockListItem[];
}

export interface HistoryPoint {
  date: string;
  close: number;
  sma_20: number | null;
  sma_50: number | null;
}
export interface StockDetail {
  slug: string;
  ticker: string;
  label: string;
  exchange: string;
  country: string;
  sector: string;
  price: number;
  change_pct: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  sma_20: number | null;
  sma_50: number | null;
  appreciation_12m: number;
  volatility_ann: number;
  history: HistoryPoint[];
}

export interface ModelMetrics {
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
  directional_accuracy: number;
}
export interface TestPoint {
  date: string;
  actual: number;
  lstm: number;
  hybrid: number;
}
export interface ForecastPoint {
  date: string;
  price: number;
}
export interface PredictionsResponse {
  slug: string;
  ticker: string;
  test_period: TestPoint[];
  forecast: {
    from_date: string;
    lstm: ForecastPoint[];
    hybrid: ForecastPoint[];
  };
  metrics: {
    lstm: ModelMetrics;
    hybrid: ModelMetrics;
  };
}

export interface EquityPoint {
  date: string;
  value: number;
}
export interface BacktestResult {
  cumulative_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  profit_factor: number;
  equity_curve: EquityPoint[];
}
export interface BacktestResponse {
  slug: string;
  ticker: string;
  lstm: BacktestResult;
  hybrid: BacktestResult;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const fetchStockList = (): Promise<StockListResponse> =>
  apiFetch("/api/stocks");

export const fetchStockDetail = (slug: string): Promise<StockDetail> =>
  apiFetch(`/api/stocks/${slug}`);

export const fetchPredictions = (slug: string): Promise<PredictionsResponse> =>
  apiFetch(`/api/predictions/${slug}`);

export const fetchBacktest = (slug: string): Promise<BacktestResponse> =>
  apiFetch(`/api/backtest/${slug}`);
