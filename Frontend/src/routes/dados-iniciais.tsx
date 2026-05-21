import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { AssetFilter } from "@/components/AssetFilter";
import { getAsset, DEFAULT_ASSET, ASSET_SLUGS } from "@/lib/assets";

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
          "Company snapshot: sector, exchange, opening and closing reference prices for the selected asset.",
      },
    ],
  }),
  component: DataPage,
});

function DataPage() {
  const { asset } = Route.useSearch();
  const meta = getAsset(asset);

  return (
    <div className="p-8 lg:p-16 xl:p-24">
      <div className="max-w-[960px] mx-auto flex flex-col gap-16">
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
            Pick a company or cryptocurrency below to inspect its sector, exchange and reference
            opening / closing prices for the observation window.
          </p>
        </header>

        <AssetFilter from="/dados-iniciais" current={asset} />

        {/* Identity block */}
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
              Reference snapshot
            </div>
            <Stat label="Open" value={meta.open} />
            <Stat label="Close" value={meta.close} />
            <Stat label="Market cap" value={meta.marketCap} />
            <Stat label="Country" value={meta.country} />
          </dl>
        </section>

        {/* Sector / classification table */}
        <section className="flex flex-col gap-6">
          <div className="flex items-end justify-between border-b border-hairline pb-4">
            <h2 className="font-serif text-2xl text-ink">Classification</h2>
            <span className="text-xs text-ink-muted uppercase tracking-widest font-mono">
              Tab 2.0
            </span>
          </div>

          <div className="border border-hairline bg-surface">
            <Row k="Ticker" v={meta.ticker} />
            <Row k="Type" v={meta.kind === "crypto" ? "Cryptocurrency" : "Equity"} />
            <Row k="Sector" v={meta.sector} />
            <Row k="Exchange" v={meta.exchange} />
            <Row k="Region" v={meta.country} />
            <Row k="Opening price (period)" v={meta.open} mono />
            <Row k="Closing price (period)" v={meta.close} mono last />
          </div>
        </section>

        <section className="border border-hairline bg-surface p-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted mb-3">
            About the data
          </div>
          <p className="font-serif text-lg text-ink leading-relaxed">
            Os valores acima são metadados do dataset. As séries temporais completas (OHLCV)
            estão em <code className="font-mono text-sm bg-paper px-2 py-0.5 border border-hairline">backend/data/</code>{" "}
            e os gráficos gerados pelo pipeline são lidos diretamente da pasta{" "}
            <code className="font-mono text-sm bg-paper px-2 py-0.5 border border-hairline">images/</code>{" "}
            (irmã de <code className="font-mono text-sm">frontend/</code> no monorepo TCC).
          </p>
        </section>

        <footer className="pt-8 pb-12 border-t border-hairline flex flex-wrap justify-between items-center gap-4">
          <Link to="/" className="text-sm text-ink-muted hover:text-ink">
            ← Introduction
          </Link>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[10px] text-ink-muted uppercase tracking-widest font-mono">{label}</dt>
      <dd className="font-mono text-lg text-ink tabular-nums">{value}</dd>
    </div>
  );
}

function Row({ k, v, mono, last }: { k: string; v: string; mono?: boolean; last?: boolean }) {
  return (
    <div
      className={`grid grid-cols-[200px_1fr] gap-4 px-6 py-4 ${
        last ? "" : "border-b border-hairline/70"
      }`}
    >
      <div className="font-mono text-[10px] uppercase tracking-widest text-ink-muted self-center">
        {k}
      </div>
      <div className={`${mono ? "font-mono tabular-nums" : "font-serif"} text-ink text-base`}>
        {v}
      </div>
    </div>
  );
}
