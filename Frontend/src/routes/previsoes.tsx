import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { MetricCard } from "@/components/MetricCard";
import { AssetFilter } from "@/components/AssetFilter";
import {
  getAssetOrDefault,
  chartImagePath,
  DEFAULT_ASSET,
  ASSET_SLUGS,
  type AssetSlug,
} from "@/lib/assets";

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
          "Forecasted prices vs realized market values from LSTM and XGBoost models, including error metrics and directional accuracy.",
      },
    ],
  }),
  component: PredictionsPage,
});

/** Ordem fixa dos 5 gráficos exibidos na página. */
const PREDICTION_CHARTS = [
  {
    id: "fechamento",
    title: "Preço de Fechamento",
    caption:
      "Histórico do preço de fechamento do ativo durante todo o período analisado.",
  },
  {
    id: "sma",
    title: "SMA (Médias Móveis)",
    caption:
      "Análise de tendência utilizando Médias Móveis Simples (SMA 20 e SMA 50).",
  },
  {
    id: "valorizacao",
    title: "Valorização",
    caption:
      "Evolução do percentual de valorização acumulada do ativo ao longo do tempo.",
  },
  {
    id: "report_total",
    title: "Relatório Total (Treino e Teste)",
    caption:
      "Desempenho geral do modelo comparando os dados reais e as previsões nos períodos de treinamento e teste.",
  },
  {
    id: "report_teste",
    title: "Relatório de Teste (Zoom)",
    caption:
      "Visualização detalhada do período de teste, ideal para avaliar a precisão das previsões de perto.",
  },
] as const;

/**
 * Per-asset metric examples — replace with values loaded from your results/metrics.json
 * when you wire the backend pipeline.
 */
const METRICS: Partial<Record<AssetSlug, { rmse: string; mae: string; dir: string; dd: string }>> = {
  aapl: { rmse: "0.0384", mae: "0.0512", dir: "68.7%", dd: "-4.21%" },
  msft: { rmse: "0.0356", mae: "0.0489", dir: "70.1%", dd: "-3.95%" },
  googl: { rmse: "0.0401", mae: "0.0534", dir: "67.2%", dd: "-4.65%" },
  amzn: { rmse: "0.0438", mae: "0.0571", dir: "65.4%", dd: "-5.02%" },
  nvda: { rmse: "0.0492", mae: "0.0622", dir: "63.8%", dd: "-6.10%" },
  tsla: { rmse: "0.0571", mae: "0.0708", dir: "60.3%", dd: "-7.12%" },
  meta: { rmse: "0.0419", mae: "0.0547", dir: "66.9%", dd: "-4.88%" },
  petr4: { rmse: "0.0421", mae: "0.0567", dir: "64.2%", dd: "-5.10%" },
  vale3: { rmse: "0.0445", mae: "0.0589", dir: "62.5%", dd: "-5.66%" },
  itub4: { rmse: "0.0372", mae: "0.0501", dir: "69.1%", dd: "-3.82%" },
};

function PredictionChart({
  ticker,
  chart,
}: {
  ticker: string;
  chart: (typeof PREDICTION_CHARTS)[number];
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
            <p className="font-serif text-lg text-ink-muted max-w-[36ch]">
              Gerando gráfico…
            </p>
            <p className="text-xs text-ink-muted/80 font-mono break-all max-w-full">
              {src}
            </p>
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

function PredictionsPage() {
  const { asset } = Route.useSearch();
  const slug = asset as AssetSlug;
  const meta = getAssetOrDefault(slug);
  const m = METRICS[slug] ?? { rmse: "—", mae: "—", dir: "—", dd: "—" };

  return (
    <div className="p-8 lg:p-16 xl:p-24">
      <div className="max-w-[960px] mx-auto flex flex-col gap-16">
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
            Gráficos gerados pelo pipeline Python e servidos em{" "}
            <code className="font-mono text-sm bg-paper px-2 py-0.5 border border-hairline">
              public/images/
            </code>
            . Troque o ativo no filtro — se o PNG ainda não existir, exibimos um aviso
            até o script local concluir.
          </p>
        </header>

        <AssetFilter from="/previsoes" current={asset} />

        <section className="border-y border-hairline py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <MetricCard
              label="RMSE (XGBoost)"
              value={m.rmse}
              delta="vs baseline"
              deltaTone="positive"
            />
            <MetricCard label="MAE (LSTM)" value={m.mae} hint="Validation set" bordered />
            <MetricCard
              label="Directional Accuracy"
              value={m.dir}
              hint="Aggregate hit rate"
              bordered
            />
            <MetricCard
              label="Max drawdown (pred.)"
              value={m.dd}
              delta="vs realized"
              deltaTone="negative"
              bordered
            />
          </div>
        </section>

        <section className="flex flex-col gap-8">
          <div className="flex items-end justify-between border-b border-hairline pb-4">
            <h2 className="font-serif text-2xl text-ink">
              Gráficos do pipeline ·{" "}
              <span className="font-mono text-base">{meta.ticker}</span>
            </h2>
            <span className="text-xs text-ink-muted uppercase tracking-widest font-mono">
              {PREDICTION_CHARTS.length} figuras
            </span>
          </div>

          <div className="flex flex-col gap-10">
            {PREDICTION_CHARTS.map((chart) => (
              <PredictionChart
                key={`${meta.ticker}-${chart.id}`}
                ticker={meta.ticker}
                chart={chart}
              />
            ))}
          </div>
        </section>

        <section className="border border-hairline bg-surface p-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">
            Nomenclatura dos arquivos
          </div>
          <p className="font-serif text-lg text-ink leading-relaxed">
            O backend salva PNGs em{" "}
            <code className="font-mono text-sm bg-paper px-2 py-0.5 border border-hairline">
              Frontend/public/images/
            </code>{" "}
            no padrão{" "}
            <code className="font-mono text-sm bg-paper px-2 py-0.5 border border-hairline">
              {meta.ticker.toLowerCase()}_[tipo].png
            </code>{" "}
            (ex.: fechamento, sma, valorizacao, report_total, report_teste).
          </p>
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
