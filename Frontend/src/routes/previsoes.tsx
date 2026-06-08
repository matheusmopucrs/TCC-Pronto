import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { MetricCard } from "@/components/MetricCard";
import { AssetFilter } from "@/components/AssetFilter";
import { ASSETS, DEFAULT_ASSET, ASSET_SLUGS } from "@/data/assets-meta";
import {
  fetchPredictions, fetchBacktest,
  type PredictionsResponse, type BacktestResponse,
} from "@/services/api";
import { chartImagePath } from "@/services/assets";

const searchSchema = z.object({
  asset: fallback(z.enum(ASSET_SLUGS), DEFAULT_ASSET).default(DEFAULT_ASSET),
});

export const Route = createFileRoute("/previsoes")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Predictions — Ockham Intelligence" },
      {
        name: "description",
        content:
          "LSTM and LSTM+XGBoost hybrid predictions vs realized prices — error metrics and 30-day forecast.",
      },
    ],
  }),
  component: PredictionsPage,
});

/** Gráficos PNG gerados offline pelo Backend/main.py (contexto histórico). */
const STATIC_CHARTS = [
  {
    id: "fechamento",
    title: "Preço de Fechamento (histórico)",
    caption: "Série completa do preço de fechamento desde 2013.",
  },
  {
    id: "sma",
    title: "Médias Móveis — SMA 20 / SMA 50",
    caption: "Análise de tendência com Médias Móveis Simples.",
  },
  {
    id: "valorizacao",
    title: "Valorização Acumulada",
    caption: "Retorno percentual acumulado desde o início da série.",
  },
] as const;

function PredictionsPage() {
  const { asset } = Route.useSearch();
  const meta = ASSETS.find((a) => a.slug === asset) ?? ASSETS[0];

  const [preds, setPreds] = useState<PredictionsResponse | null>(null);
  const [backtest, setBacktest] = useState<BacktestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPreds(null);
    setBacktest(null);

    Promise.all([fetchPredictions(asset), fetchBacktest(asset)])
      .then(([p, b]) => { setPreds(p); setBacktest(b); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [asset]);

  const isBRL = meta.country === "Brazil";
  const fmtPrice = (v: number) =>
    v.toLocaleString(undefined, {
      style: "currency",
      currency: isBRL ? "BRL" : "USD",
      minimumFractionDigits: 2,
    });
  const fmtPct = (v: number) => `${v.toFixed(2)}%`;

  // Métricas do modelo híbrido (melhor modelo segundo o TCC)
  const mLstm = preds?.metrics.lstm;
  const mHybrid = preds?.metrics.hybrid;
  const btHybrid = backtest?.hybrid;

  return (
    <div className="p-8 lg:p-16 xl:p-24">
      <div className="max-w-[960px] mx-auto flex flex-col gap-16">

        {/* Header — preservado */}
        <header className="flex flex-col gap-6">
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-ink-muted font-mono">
            <span>Section 03</span>
            <span className="w-4 h-px bg-hairline" />
            <span>Predictions</span>
          </div>
          <h1 className="font-serif text-5xl lg:text-6xl text-balance leading-[1.05] text-ink">
            What the models predicted, and what the market actually did.
          </h1>
          <p className="font-serif text-xl text-ink-muted leading-relaxed max-w-[60ch] pt-2">
            The LSTM captures temporal patterns in 60-day windows; the hybrid model corrects
            its residuals with XGBoost. Charts show the held-out test set and a 30-day forecast.
          </p>
        </header>

        <AssetFilter from="/previsoes" current={asset} />

        {/* Metric cards — preservado, dados reais da API */}
        <section className="border-y border-hairline py-12">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="h-2 w-20 bg-hairline rounded animate-pulse" />
                  <div className="h-10 w-28 bg-hairline rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : error || !mHybrid || !mLstm ? (
            <ApiErrorNote message={error} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
              <MetricCard
                label="RMSE — Híbrido"
                value={mHybrid.rmse.toFixed(4)}
                delta={`vs LSTM ${mLstm.rmse.toFixed(4)}`}
                deltaTone={mHybrid.rmse < mLstm.rmse ? "positive" : "negative"}
              />
              <MetricCard
                label="MAE — Híbrido"
                value={mHybrid.mae.toFixed(4)}
                hint="Erro médio absoluto (preço)"
                bordered
              />
              <MetricCard
                label="Dir. Accuracy — Híbrido"
                value={`${mHybrid.directional_accuracy.toFixed(1)}%`}
                hint={`LSTM: ${mLstm.directional_accuracy.toFixed(1)}%`}
                bordered
              />
              <MetricCard
                label="Max Drawdown"
                value={btHybrid ? `${btHybrid.max_drawdown.toFixed(2)}%` : "—"}
                delta={btHybrid ? `Sharpe ${btHybrid.sharpe_ratio.toFixed(2)}` : undefined}
                deltaTone={btHybrid && btHybrid.sharpe_ratio > 1 ? "positive" : "neutral"}
                bordered
              />
            </div>
          )}
        </section>

        {/* Métricas completas — tabela comparativa */}
        {!loading && !error && mLstm && mHybrid && (
          <section className="flex flex-col gap-6">
            <div className="flex items-end justify-between border-b border-hairline pb-4">
              <h2 className="font-serif text-2xl text-ink">
                Métricas comparativas ·{" "}
                <span className="font-mono text-base">{meta.ticker}</span>
              </h2>
              <span className="text-xs text-ink-muted uppercase tracking-widest font-mono">
                Período de teste (20%)
              </span>
            </div>
            <div className="border border-hairline bg-surface">
              <MetricRow k="MAE" lstm={mLstm.mae.toFixed(4)} hybrid={mHybrid.mae.toFixed(4)} betterIsLower />
              <MetricRow k="RMSE" lstm={mLstm.rmse.toFixed(4)} hybrid={mHybrid.rmse.toFixed(4)} betterIsLower />
              <MetricRow k="MAPE (%)" lstm={`${mLstm.mape.toFixed(2)}%`} hybrid={`${mHybrid.mape.toFixed(2)}%`} betterIsLower />
              <MetricRow k="R²" lstm={mLstm.r2.toFixed(4)} hybrid={mHybrid.r2.toFixed(4)} betterIsLower={false} />
              <MetricRow k="Directional Accuracy" lstm={`${mLstm.directional_accuracy.toFixed(1)}%`} hybrid={`${mHybrid.directional_accuracy.toFixed(1)}%`} betterIsLower={false} last />
            </div>
          </section>
        )}

        {/* Gráfico 1: Período de teste — real vs predito */}
        <section className="flex flex-col gap-6">
          <div className="flex items-end justify-between border-b border-hairline pb-4">
            <h2 className="font-serif text-2xl text-ink">Desempenho no Período de Teste</h2>
            <span className="text-xs text-ink-muted uppercase tracking-widest font-mono">
              Últimos 180 dias do test set
            </span>
          </div>
          <div className="border border-hairline bg-surface p-6">
            {loading ? (
              <LoadingChart />
            ) : error || !preds ? (
              <ApiErrorNote message={error} />
            ) : (
              <PredictionChart
                data={preds.test_period}
                isBRL={isBRL}
                fmtPrice={fmtPrice}
                showActual
              />
            )}
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            <span className="font-mono text-[10px] uppercase tracking-widest">Legenda — </span>
            Preto: preço real. Marrom: LSTM puro. Verde: LSTM + XGBoost híbrido.
            O híbrido aprende os resíduos sistemáticos do LSTM e os corrige.
          </p>
        </section>

        {/* Gráfico 2: Forecast 30 dias */}
        {!loading && !error && preds && preds.forecast.lstm.length > 0 && (
          <section className="flex flex-col gap-6">
            <div className="flex items-end justify-between border-b border-hairline pb-4">
              <h2 className="font-serif text-2xl text-ink">Previsão — Próximos 30 dias úteis</h2>
              <span className="text-xs text-ink-muted uppercase tracking-widest font-mono">
                A partir de {preds.forecast.from_date}
              </span>
            </div>
            <div className="border border-hairline bg-surface p-6">
              <ForecastChart preds={preds} isBRL={isBRL} fmtPrice={fmtPrice} />
            </div>
            <p className="text-sm text-ink-muted leading-relaxed">
              Forecast autorregressivo: cada previsão alimenta a janela de entrada da seguinte.
              Incerteza aumenta com o horizonte. Não constitui recomendação de investimento.
            </p>
          </section>
        )}

        {/* Backtesting */}
        {!loading && !error && backtest && (
          <section className="flex flex-col gap-6">
            <div className="flex items-end justify-between border-b border-hairline pb-4">
              <h2 className="font-serif text-2xl text-ink">Backtesting — Estratégia Direcional</h2>
              <span className="text-xs text-ink-muted uppercase tracking-widest font-mono">
                Período de teste
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <MetricCard label="Retorno Acum. (Híbrido)" value={`${backtest.hybrid.cumulative_return.toFixed(2)}%`} delta={`LSTM: ${backtest.lstm.cumulative_return.toFixed(2)}%`} deltaTone={backtest.hybrid.cumulative_return > backtest.lstm.cumulative_return ? "positive" : "neutral"} />
              <MetricCard label="Sharpe Ratio" value={backtest.hybrid.sharpe_ratio.toFixed(3)} hint="Anualizado (252 dias)" bordered />
              <MetricCard label="Max Drawdown" value={`${backtest.hybrid.max_drawdown.toFixed(2)}%`} deltaTone="negative" bordered />
              <MetricCard label="Profit Factor" value={backtest.hybrid.profit_factor.toFixed(3)} hint="> 1.0 = rentável" bordered />
            </div>
          </section>
        )}

        {/* Gráficos PNG históricos (gerados pelo pipeline offline) */}
        <section className="flex flex-col gap-8">
          <div className="flex items-end justify-between border-b border-hairline pb-4">
            <h2 className="font-serif text-2xl text-ink">
              Análise Histórica ·{" "}
              <span className="font-mono text-base">{meta.ticker}</span>
            </h2>
            <span className="text-xs text-ink-muted uppercase tracking-widest font-mono">
              Pipeline offline · {STATIC_CHARTS.length} figuras
            </span>
          </div>
          <div className="flex flex-col gap-10">
            {STATIC_CHARTS.map((chart) => (
              <StaticChart key={chart.id} ticker={meta.ticker} chart={chart} />
            ))}
          </div>
        </section>

        <footer className="pt-8 pb-12 border-t border-hairline flex flex-wrap justify-between items-center gap-4">
          <Link to="/dados-iniciais" search={{ asset }} className="text-sm text-ink-muted hover:text-ink">
            ← Company Data
          </Link>
          <div className="text-sm text-ink-muted">End of briefing</div>
        </footer>
      </div>
    </div>
  );
}

// ── chart components ──────────────────────────────────────────────────────────

type ChartDataPoint = { date: string; actual: number; lstm: number; hybrid: number };

function PredictionChart({
  data,
  isBRL,
  fmtPrice,
  showActual,
}: {
  data: ChartDataPoint[];
  isBRL: boolean;
  fmtPrice: (v: number) => string;
  showActual: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0.012 80)" strokeOpacity={0.6} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "oklch(0.48 0.008 70)" }}
          tickFormatter={(v: string) => v.slice(5)}
          interval={Math.floor(data.length / 8)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "oklch(0.48 0.008 70)" }}
          tickFormatter={(v: number) => (isBRL ? `R$${v.toFixed(0)}` : `$${v.toFixed(0)}`)}
          width={56}
        />
        <Tooltip
          contentStyle={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            border: "1px solid oklch(0.85 0.012 80)",
            background: "oklch(0.945 0.012 80)",
            color: "oklch(0.165 0.005 60)",
          }}
          formatter={(v: number, name: string) => [fmtPrice(v), name]}
          labelStyle={{ color: "oklch(0.48 0.008 70)", marginBottom: 4 }}
        />
        <Legend
          iconType="line"
          wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 11, paddingTop: 12 }}
        />
        {showActual && (
          <Line
            type="monotone"
            dataKey="actual"
            stroke="oklch(0.165 0.005 60)"
            name="Real"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        )}
        <Line
          type="monotone"
          dataKey="lstm"
          stroke="oklch(0.55 0.165 35)"
          name="LSTM"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="hybrid"
          stroke="oklch(0.5 0.12 150)"
          name="LSTM+XGBoost"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ForecastChart({
  preds,
  isBRL,
  fmtPrice,
}: {
  preds: PredictionsResponse;
  isBRL: boolean;
  fmtPrice: (v: number) => string;
}) {
  // Combina últimos 10 pontos do test period como âncora + forecast
  const anchor = preds.test_period.slice(-10).map((p) => ({
    date: p.date,
    actual: p.actual,
    lstm: undefined as number | undefined,
    hybrid: undefined as number | undefined,
  }));
  const forecastLstm = new Map(preds.forecast.lstm.map((p) => [p.date, p.price]));
  const forecastHybrid = new Map(preds.forecast.hybrid.map((p) => [p.date, p.price]));

  const combined = [
    ...anchor,
    ...preds.forecast.lstm.map((p) => ({
      date: p.date,
      actual: undefined as number | undefined,
      lstm: forecastLstm.get(p.date),
      hybrid: forecastHybrid.get(p.date),
    })),
  ];

  const fromDate = preds.forecast.from_date;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={combined} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.85 0.012 80)" strokeOpacity={0.6} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "oklch(0.48 0.008 70)" }}
          tickFormatter={(v: string) => v.slice(5)}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "oklch(0.48 0.008 70)" }}
          tickFormatter={(v: number) => (isBRL ? `R$${v.toFixed(0)}` : `$${v.toFixed(0)}`)}
          width={56}
        />
        <Tooltip
          contentStyle={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            border: "1px solid oklch(0.85 0.012 80)",
            background: "oklch(0.945 0.012 80)",
          }}
          formatter={(v: number, name: string) => [fmtPrice(v), name]}
          labelStyle={{ color: "oklch(0.48 0.008 70)", marginBottom: 4 }}
        />
        <Legend
          iconType="line"
          wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 11, paddingTop: 12 }}
        />
        {fromDate && (
          <ReferenceLine
            x={fromDate}
            stroke="oklch(0.85 0.012 80)"
            strokeDasharray="4 2"
            label={{ value: "Hoje", fontFamily: "var(--font-mono)", fontSize: 10, fill: "oklch(0.48 0.008 70)" }}
          />
        )}
        <Line type="monotone" dataKey="actual" stroke="oklch(0.165 0.005 60)" name="Real (âncora)" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="lstm" stroke="oklch(0.55 0.165 35)" name="LSTM forecast" strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls />
        <Line type="monotone" dataKey="hybrid" stroke="oklch(0.5 0.12 150)" name="Híbrido forecast" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── static PNG chart (gerados pelo pipeline legado) ───────────────────────────

function StaticChart({
  ticker,
  chart,
}: {
  ticker: string;
  chart: (typeof STATIC_CHARTS)[number];
}) {
  const [missing, setMissing] = useState(false);
  const src = chartImagePath(ticker, chart.id);

  return (
    <article className="flex flex-col gap-4 border border-hairline bg-surface p-4 md:p-6">
      <div className="overflow-hidden border border-hairline/80 bg-paper">
        {missing ? (
          <div className="aspect-[21/9] flex flex-col items-center justify-center gap-3 px-8 text-center">
            <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              Aguardando pipeline
            </div>
            <p className="font-serif text-lg text-ink-muted max-w-[36ch]">Execute Backend/main.py para gerar os gráficos.</p>
            <p className="text-xs text-ink-muted/80 font-mono break-all">{src}</p>
          </div>
        ) : (
          <img
            src={src}
            alt={`${chart.title} — ${ticker}`}
            loading="lazy"
            onError={() => setMissing(true)}
            onLoad={() => setMissing(false)}
            className="w-full h-auto object-contain"
          />
        )}
      </div>
      <figcaption className="flex flex-col gap-2 px-1">
        <h3 className="font-serif text-xl text-ink">{chart.title}</h3>
        <p className="text-sm text-ink-muted leading-relaxed">{chart.caption}</p>
      </figcaption>
    </article>
  );
}

// ── micro helpers ─────────────────────────────────────────────────────────────

function LoadingChart() {
  return (
    <div className="h-64 flex items-center justify-center">
      <div className="font-mono text-xs text-ink-muted animate-pulse uppercase tracking-widest">
        Carregando predições…
      </div>
    </div>
  );
}

function ApiErrorNote({ message }: { message: string | null }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
        Backend indisponível
      </div>
      <p className="font-serif text-lg text-ink-muted max-w-[44ch]">
        {message ?? "Não foi possível conectar ao servidor."}
      </p>
      <p className="font-mono text-xs text-ink-muted/70">
        cd backend &amp;&amp; uvicorn main:app --reload --port 8000
      </p>
    </div>
  );
}

function MetricRow({
  k, lstm, hybrid, betterIsLower, last,
}: {
  k: string; lstm: string; hybrid: string; betterIsLower?: boolean; last?: boolean;
}) {
  const lNum = parseFloat(lstm);
  const hNum = parseFloat(hybrid);
  const hybridWins = betterIsLower ? hNum < lNum : hNum > lNum;

  return (
    <div className={`grid grid-cols-[180px_1fr_1fr] gap-4 px-6 py-4 ${last ? "" : "border-b border-hairline/70"}`}>
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted self-center">{k}</div>
      <div className="font-mono tabular-nums text-ink text-sm">{lstm}</div>
      <div className={`font-mono tabular-nums text-sm font-medium ${hybridWins ? "text-[oklch(0.5_0.12_150)]" : "text-ink"}`}>
        {hybrid} {hybridWins ? "↑" : ""}
      </div>
    </div>
  );
}
