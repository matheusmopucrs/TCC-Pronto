import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Introduction — Ockham Intelligence" },
      {
        name: "description",
        content:
          "An AI-driven research briefing forecasting equities and crypto prices using LSTM and XGBoost models.",
      },
    ],
  }),
  component: IntroductionPage,
});

function IntroductionPage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-hairline">
        <div className="px-8 lg:px-16 xl:px-24 pt-20 pb-28 lg:pt-32 lg:pb-40">
          <div className="max-w-[1100px] mx-auto grid lg:grid-cols-[1fr_auto] gap-12 items-end">
            <div className="flex flex-col gap-8">
              <div
                className="flex items-center gap-3 text-xs uppercase tracking-widest text-ink-muted"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span>Briefing 001</span>
                <span className="w-4 h-px bg-hairline" />
                <span>Undergraduate Thesis · TCC</span>
              </div>

              <h1 className="font-serif text-5xl lg:text-7xl xl:text-8xl text-balance leading-[0.95] text-ink tracking-tight">
                Forecasting markets,
                <br />
                <span className="italic text-ink-muted">one signal at a time.</span>
              </h1>

              <p className="font-serif text-xl lg:text-2xl text-ink-muted leading-relaxed max-w-[60ch]">
                A research dashboard pairing recurrent neural networks with gradient boosted
                trees to study how well artificial intelligence can anticipate the direction of
                equities and cryptocurrencies.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Link
                  to="/dados-iniciais"
                  className="px-6 py-3 bg-ink text-paper text-sm font-medium tracking-wide hover:bg-ink-muted transition-colors"
                >
                  Explore the data →
                </Link>
                <Link
                  to="/previsoes"
                  className="px-6 py-3 border border-hairline text-ink text-sm font-medium tracking-wide hover:bg-surface transition-colors"
                >
                  See the predictions
                </Link>
              </div>
            </div>

            {/* Editorial stat block */}
            <div className="hidden lg:flex flex-col gap-6 border-l border-hairline pl-10 min-w-[240px]">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">
                  Assets covered
                </div>
                <div className="font-serif text-5xl text-ink tabular-nums">12</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">
                  Models
                </div>
                <div className="font-serif text-2xl text-ink">LSTM · XGBoost</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-2">
                  Best dir. accuracy
                </div>
                <div className="font-serif text-4xl text-ink tabular-nums">68.7%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative grid lines */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--color-ink) 1px, transparent 1px), linear-gradient(to bottom, var(--color-ink) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
      </section>

      {/* Abstract */}
      <section className="px-8 lg:px-16 xl:px-24 py-24">
        <div className="max-w-[960px] mx-auto grid grid-cols-1 md:grid-cols-[180px_1fr] gap-10 items-start">
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink-muted mt-2">
            Abstract
          </h2>
          <div className="flex flex-col gap-6">
            <p className="font-serif text-2xl md:text-3xl leading-relaxed text-pretty text-ink">
              This work compares two families of predictive models — a recurrent{" "}
              <span className="italic text-ink-muted">Long Short-Term Memory</span> network and
              a gradient boosted{" "}
              <span className="italic text-ink-muted">XGBoost</span> regressor — applied to
              daily closing prices of selected equities and cryptocurrencies.
            </p>
            <p className="font-serif text-lg text-ink-muted leading-relaxed">
              The pipeline ingests historical OHLCV data, engineers technical features,
              trains both models on a rolling window, and benchmarks their forecasts against
              realized market values. The resulting briefing is organised into three sections:
              an introduction, an exploration of the underlying data, and a side-by-side review
              of the predictions.
            </p>
          </div>
        </div>
      </section>

      {/* Three-up: what the project does */}
      <section className="border-t border-hairline px-8 lg:px-16 xl:px-24 py-20 bg-surface/50">
        <div className="max-w-[1100px] mx-auto">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-12">
            What the briefing covers
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-y border-hairline">
            {[
              {
                num: "01",
                title: "Introduction",
                body: "The motivation, the research question and the methodology behind the experiment.",
                to: "/",
              },
              {
                num: "02",
                title: "Company Data",
                body: "Sector, exchange, opening and closing reference prices for each asset in scope.",
                to: "/dados-iniciais",
              },
              {
                num: "03",
                title: "Predictions",
                body: "Model forecasts overlaid on realized prices, with error metrics and residuals.",
                to: "/previsoes",
              },
            ].map((s, i) => (
              <Link
                key={s.num}
                to={s.to}
                className={`group flex flex-col gap-4 p-10 hover:bg-paper transition-colors ${
                  i > 0 ? "md:border-l md:border-hairline" : ""
                }`}
              >
                <span className="font-mono text-xs tracking-widest text-ink-muted">{s.num}</span>
                <h3 className="font-serif text-2xl text-ink">
                  {s.title}{" "}
                  <span className="text-ink-muted group-hover:text-ink transition-colors">→</span>
                </h3>
                <p className="text-sm text-ink-muted leading-relaxed">{s.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology strip */}
      <section className="px-8 lg:px-16 xl:px-24 py-24">
        <div className="max-w-[960px] mx-auto grid grid-cols-1 md:grid-cols-[180px_1fr] gap-10">
          <h2 className="font-mono text-xs uppercase tracking-widest text-ink-muted mt-2">
            Methodology
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
            {[
              {
                k: "Data ingestion",
                v: "Daily OHLCV pulled via yfinance for equities and crypto, persisted in /data.",
              },
              {
                k: "Feature engineering",
                v: "Returns, moving averages, RSI, MACD and lagged features built in src/features.py.",
              },
              {
                k: "Modelling",
                v: "LSTM (TensorFlow) and XGBoost trained on a rolling window; artifacts saved in /models.",
              },
              {
                k: "Evaluation",
                v: "RMSE, MAE and directional accuracy computed on a held-out validation set.",
              },
            ].map((it) => (
              <div key={it.k} className="flex flex-col gap-1 border-t border-hairline pt-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                  {it.k}
                </div>
                <div className="font-serif text-lg text-ink leading-snug">{it.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-8 lg:px-16 xl:px-24 pb-16 pt-8 border-t border-hairline">
        <div className="max-w-[960px] mx-auto flex flex-wrap justify-between items-center gap-4">
          <div className="text-sm text-ink-muted">End of introduction</div>
          <Link
            to="/dados-iniciais"
            className="px-6 py-3 bg-ink text-paper text-sm font-medium tracking-wide hover:bg-ink-muted transition-colors"
          >
            Continue to company data →
          </Link>
        </div>
      </footer>
    </div>
  );
}
