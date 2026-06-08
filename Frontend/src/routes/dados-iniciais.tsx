import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { AssetFilter } from "@/components/AssetFilter";
import { ASSETS, DEFAULT_ASSET, ASSET_SLUGS } from "@/data/assets-meta";
import { fetchStockDetail, type StockDetail } from "@/services/api";

const searchSchema = z.object({
  asset: fallback(z.enum(ASSET_SLUGS), DEFAULT_ASSET).default(DEFAULT_ASSET),
});

export const Route = createFileRoute("/dados-iniciais")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Company Data — Ockham Intelligence" },
      {
        name: "description",
        content:
          "Company snapshot: sector, exchange, real-time price and 12-month price history for the selected asset.",
      },
    ],
  }),
  component: DataPage,
});

function DataPage() {
  const { asset } = Route.useSearch();
  const meta = ASSETS.find((a) => a.slug === asset) ?? ASSETS[0];

  const [data, setData] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    fetchStockDetail(asset)
      .then(setData)
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
  const fmtVol = (v: number) =>
    v >= 1_000_000_000
      ? `${(v / 1_000_000_000).toFixed(1)}B`
      : v >= 1_000_000
      ? `${(v / 1_000_000).toFixed(1)}M`
      : v.toLocaleString();

  return (
    <div className="p-8 lg:p-16 xl:p-24">
      <div className="max-w-[960px] mx-auto flex flex-col gap-16">

        {/* Header — preservado */}
        <header className="flex flex-col gap-6">
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-ink-muted font-mono">
            <span>Section 02</span>
            <span className="w-4 h-px bg-hairline" />
            <span>Company Data</span>
          </div>
          <h1 className="font-serif text-5xl lg:text-6xl text-balance leading-[1.05] text-ink">
            Snapshot of the asset before the model gets to work.
          </h1>
          <p className="font-serif text-xl text-ink-muted leading-relaxed max-w-[60ch] pt-2">
            Pick a company below to inspect its sector, exchange and real-time market data
            sourced daily from Yahoo Finance.
          </p>
        </header>

        <AssetFilter from="/dados-iniciais" current={asset} />

        {/* Identity block — preservado, enriquecido com dados reais */}
        <section className="border-t border-hairline pt-10 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-12">
          <div className="flex flex-col gap-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              {meta.kind === "crypto" ? "Cryptocurrency" : "Listed company"}
            </div>
            <h2 className="font-serif text-5xl text-ink leading-[1.05]">
              {meta.label}
              <span className="block font-mono text-base text-ink-muted mt-3 tracking-widest">
                {meta.ticker} · {meta.exchange}
              </span>
            </h2>
            <p className="font-serif text-lg text-ink-muted leading-relaxed max-w-[55ch] pt-2">
              {meta.description}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-y-6 gap-x-4 self-start border border-hairline bg-surface p-6">
            <div className="col-span-2 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
              {loading ? "Carregando dados reais…" : error ? "Dados estáticos" : "Real-time snapshot"}
            </div>

            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="h-2 w-12 bg-hairline rounded animate-pulse mb-1" />
                  <div className="h-4 w-20 bg-hairline rounded animate-pulse" />
                </div>
              ))
            ) : error || !data ? (
              <>
                <Stat label="Open" value={fmtPrice(0)} />
                <Stat label="Close" value={fmtPrice(0)} />
                <Stat label="Appreciation 12m" value="—" />
                <Stat label="Volatility (ann.)" value="—" />
                <Stat label="Market cap" value={meta.marketCap} />
                <Stat label="Country" value={meta.country} />
              </>
            ) : (
              <>
                <Stat label="Open" value={fmtPrice(data.open)} />
                <Stat
                  label="Price"
                  value={fmtPrice(data.price)}
                  tone={data.change_pct >= 0 ? "positive" : "negative"}
                  sub={`${data.change_pct >= 0 ? "+" : ""}${fmtPct(data.change_pct)}`}
                />
                <Stat label="High" value={fmtPrice(data.high)} />
                <Stat label="Low" value={fmtPrice(data.low)} />
                <Stat label="Volume" value={fmtVol(data.volume)} />
                <Stat label="Country" value={meta.country} />
                <Stat label="Apprec. 12m" value={fmtPct(data.appreciation_12m)} tone={data.appreciation_12m >= 0 ? "positive" : "negative"} />
                <Stat label="Volatility (ann.)" value={fmtPct(data.volatility_ann)} />
              </>
            )}
          </dl>
        </section>

        {/* Gráfico histórico 12 meses — Recharts */}
        <section className="flex flex-col gap-6">
          <div className="flex items-end justify-between border-b border-hairline pb-4">
            <h2 className="font-serif text-2xl text-ink">
              12-Month Price History ·{" "}
              <span className="font-mono text-base">{meta.ticker}</span>
            </h2>
            <span className="text-xs text-ink-muted uppercase tracking-widest font-mono">
              SMA 20 · SMA 50
            </span>
          </div>

          <div className="border border-hairline bg-surface p-6">
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="font-mono text-xs text-ink-muted animate-pulse uppercase tracking-widest">
                  Buscando dados via yfinance…
                </div>
              </div>
            ) : error || !data ? (
              <ApiErrorNote message={error} />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={data.history} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.85 0.012 80)"
                    strokeOpacity={0.6}
                  />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "oklch(0.48 0.008 70)" }}
                    tickFormatter={(v: string) => v.slice(5)}
                    interval={Math.floor(data.history.length / 8)}
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
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="oklch(0.165 0.005 60)"
                    name="Close"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="sma_20"
                    stroke="oklch(0.55 0.165 35)"
                    name="SMA 20"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="sma_50"
                    stroke="oklch(0.5 0.12 150)"
                    name="SMA 50"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Tabela de classificação — preservada */}
        <section className="flex flex-col gap-6">
          <div className="flex items-end justify-between border-b border-hairline pb-4">
            <h2 className="font-serif text-2xl text-ink">Classification</h2>
            <span className="text-xs text-ink-muted uppercase tracking-widest font-mono">Tab 2.0</span>
          </div>
          <div className="border border-hairline bg-surface">
            <Row k="Ticker" v={meta.ticker} />
            <Row k="Type" v={meta.kind === "crypto" ? "Cryptocurrency" : "Equity"} />
            <Row k="Sector" v={meta.sector} />
            <Row k="Exchange" v={meta.exchange} />
            <Row k="Region" v={meta.country} />
            <Row k="SMA 20 (current)" v={data?.sma_20 != null ? fmtPrice(data.sma_20) : "—"} mono />
            <Row k="SMA 50 (current)" v={data?.sma_50 != null ? fmtPrice(data.sma_50) : "—"} mono />
            <Row k="Appreciation 12m" v={data ? fmtPct(data.appreciation_12m) : "—"} mono />
            <Row k="Annual volatility" v={data ? fmtPct(data.volatility_ann) : "—"} mono last />
          </div>
        </section>

        <section className="border border-hairline bg-surface p-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">
            About the data
          </div>
          <p className="font-serif text-lg text-ink leading-relaxed">
            Prices and moving averages are fetched in real-time from Yahoo Finance via{" "}
            <code className="font-mono text-sm bg-paper px-2 py-0.5 border border-hairline">yfinance</code>,
            cached for 15 minutes. The backend must be running on{" "}
            <code className="font-mono text-sm bg-paper px-2 py-0.5 border border-hairline">
              localhost:8000
            </code>
            .
          </p>
        </section>

        <footer className="pt-8 pb-12 border-t border-hairline flex flex-wrap justify-between items-center gap-4">
          <Link to="/" className="text-sm text-ink-muted hover:text-ink">← Introduction</Link>
          <Link
            to="/previsoes"
            search={{ asset }}
            className="px-6 py-3 bg-ink text-paper text-sm font-medium tracking-wide hover:bg-ink-muted transition-colors"
          >
            Continue to predictions →
          </Link>
        </footer>
      </div>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-[oklch(0.5_0.12_150)]"
      : tone === "negative"
      ? "text-[oklch(0.55_0.18_25)]"
      : "";
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] text-ink-muted uppercase tracking-widest font-mono">{label}</dt>
      <dd className={`font-mono text-lg text-ink tabular-nums ${toneClass}`}>{value}</dd>
      {sub && <span className={`font-mono text-xs tabular-nums ${toneClass}`}>{sub}</span>}
    </div>
  );
}

function Row({
  k, v, mono, last,
}: {
  k: string; v: string; mono?: boolean; last?: boolean;
}) {
  return (
    <div className={`grid grid-cols-[200px_1fr] gap-4 px-6 py-4 ${last ? "" : "border-b border-hairline/70"}`}>
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted self-center">{k}</div>
      <div className={`${mono ? "font-mono tabular-nums" : "font-serif"} text-ink text-base`}>{v}</div>
    </div>
  );
}

function ApiErrorNote({ message }: { message: string | null }) {
  return (
    <div className="h-64 flex flex-col items-center justify-center gap-3 text-center px-8">
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
        Backend indisponível
      </div>
      <p className="font-serif text-lg text-ink-muted max-w-[44ch]">
        {message ?? "Não foi possível conectar ao servidor."}
      </p>
      <p className="font-mono text-xs text-ink-muted/70">
        uvicorn main:app --reload --port 8000
      </p>
    </div>
  );
}
