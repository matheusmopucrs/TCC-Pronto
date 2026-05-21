import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { PipelineFigure } from "@/components/PipelineFigure";
import { MetricCard } from "@/components/MetricCard";
import { AssetFilter } from "@/components/AssetFilter";
import { getAsset, figurePath, DEFAULT_ASSET, ASSET_SLUGS, type AssetSlug } from "@/lib/assets";

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

/**
 * Per-asset metric examples — replace with values loaded from your results/metrics.json
 * when you wire the backend pipeline.
 */
const METRICS: Partial<Record<AssetSlug, { rmse: string; mae: string; dir: string; dd: string }>> = {
  aapl:  { rmse: "0.0384", mae: "0.0512", dir: "68.7%", dd: "-4.21%" },
  msft:  { rmse: "0.0356", mae: "0.0489", dir: "70.1%", dd: "-3.95%" },
  googl: { rmse: "0.0401", mae: "0.0534", dir: "67.2%", dd: "-4.65%" },
  amzn:  { rmse: "0.0438", mae: "0.0571", dir: "65.4%", dd: "-5.02%" },
  nvda:  { rmse: "0.0492", mae: "0.0622", dir: "63.8%", dd: "-6.10%" },
  tsla:  { rmse: "0.0571", mae: "0.0708", dir: "60.3%", dd: "-7.12%" },
  meta:  { rmse: "0.0419", mae: "0.0547", dir: "66.9%", dd: "-4.88%" },
  petr4: { rmse: "0.0421", mae: "0.0567", dir: "64.2%", dd: "-5.10%" },
  vale3: { rmse: "0.0445", mae: "0.0589", dir: "62.5%", dd: "-5.66%" },
  itub4: { rmse: "0.0372", mae: "0.0501", dir: "69.1%", dd: "-3.82%" },
  btc:   { rmse: "0.0612", mae: "0.0789", dir: "61.5%", dd: "-7.84%" },
  eth:   { rmse: "0.0578", mae: "0.0731", dir: "62.9%", dd: "-6.92%" },
};

function PredictionsPage() {
  const { asset } = Route.useSearch();
  const slug = asset as AssetSlug;
  const meta = getAsset(slug);
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
            Each chart overlays the model forecast against realized closing prices on the
            held-out validation period. Use the filter to switch between companies.
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

        <section className="flex flex-col gap-10">
          <div className="flex items-end justify-between border-b border-hairline pb-4">
            <h2 className="font-serif text-2xl text-ink">
              Forecast vs realized · <span className="font-mono text-base">{meta.ticker}</span>
            </h2>
            <span className="text-xs text-ink-muted uppercase tracking-widest font-mono">
              Fig 3.0 — 3.3
            </span>
          </div>

          <PipelineFigure
            label="Fig 3.0"
            alt={`Closing prices — ${meta.label}`}
            aspect="wide"
            src={figurePath(asset, "closing_prices")}
            caption={
              <>
                Historical closing series for{" "}
                <strong className="text-ink">{meta.label}</strong> over the study window.
              </>
            }
          />

          <PipelineFigure
            label="Fig 3.1"
            alt={`XGBoost forecast vs actual — ${meta.label}`}
            aspect="wide"
            src={figurePath(asset, "xgb_pred_vs_actual")}
            caption={
              <>
                XGBoost forecast (dashed) overlaid on realized closing prices (solid) for{" "}
                <strong className="text-ink">{meta.label}</strong>.
              </>
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <PipelineFigure
              label="Fig 3.2"
              alt={`LSTM forecast vs actual — ${meta.label}`}
              aspect="square"
              src={figurePath(asset, "lstm_pred_vs_actual")}
              caption={
                <>
                  LSTM forecast vs realized prices for{" "}
                  <strong className="text-ink">{meta.label}</strong>. Recurrent dynamics capture
                  the medium-term trend but underreact to abrupt volatility spikes.
                </>
              }
            />
            <PipelineFigure
              label="Fig 3.3"
              alt={`Residuals distribution — ${meta.label}`}
              aspect="square"
              src={figurePath(asset, "residuals")}
              caption={
                <>
                  Residuals distribution of predicted minus actual returns. A near-zero median
                  with controlled tails indicates an unbiased estimator.
                </>
              }
            />
          </div>

          <PipelineFigure
            label="Fig 3.4"
            alt={`Correlation map — ${meta.label}`}
            aspect="wide"
            src={figurePath(asset, "correlation_map")}
            caption={
              <>
                Feature correlation heatmap for{" "}
                <strong className="text-ink">{meta.label}</strong> — useful for spotting
                redundant inputs before training.
              </>
            }
          />
        </section>

        <section className="border border-hairline bg-surface p-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">
            Reading the briefing
          </div>
          <p className="font-serif text-lg text-ink leading-relaxed">
            As imagens são servidas diretamente da pasta{" "}
            <code className="font-mono text-sm bg-paper px-2 py-0.5 border border-hairline">
              ../images/{asset}/
            </code>{" "}
            do monorepo TCC. Basta gerar os PNGs pelo pipeline Python — o frontend recarrega
            automaticamente ao trocar a empresa no filtro acima.
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
