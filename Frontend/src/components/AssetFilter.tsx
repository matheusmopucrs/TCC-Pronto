import { useNavigate } from "@tanstack/react-router";
import { ASSETS, type AssetSlug } from "@/lib/assets";

interface AssetFilterProps {
  /** Route id so navigate updates this route's search params. */
  from: "/dados-iniciais" | "/previsoes";
  current: AssetSlug;
}

/**
 * Dropdown-style asset filter — scales to many companies while staying
 * faithful to the editorial palette (paper / ink / hairline borders).
 */
export function AssetFilter({ from, current }: AssetFilterProps) {
  const navigate = useNavigate({ from });
  const active = ASSETS.find((a) => a.slug === current) ?? ASSETS[0];

  const estrangeiras = ASSETS.filter((a) => a.country !== "Brazil");
  const brasileiras = ASSETS.filter((a) => a.country === "Brazil");

  return (
    <div className="flex flex-col gap-3 border border-hairline bg-surface p-6">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-ink-muted uppercase tracking-widest font-mono">
          Filter · selected asset
        </span>
        <span className="text-[10px] text-ink-muted font-mono uppercase tracking-widest">
          {active.kind} · {active.exchange}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
        <label className="flex-1 flex flex-col gap-2">
          <span className="text-xs text-ink-muted font-mono uppercase tracking-wider">
            Company / Ticker
          </span>
          <div className="relative">
            <select
              value={current}
              onChange={(e) =>
                navigate({
                  search: (prev: Record<string, unknown>) => ({
                    ...prev,
                    asset: e.target.value as AssetSlug,
                  }),
                })
              }
              className="w-full appearance-none bg-paper border border-hairline px-4 py-3 pr-10 font-serif text-lg text-ink focus:outline-none focus:border-ink transition-colors cursor-pointer"
            >
              <optgroup label="Estrangeiras">
                {estrangeiras.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.label} — {a.ticker}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Brasileiras">
                {brasileiras.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.label} — {a.ticker}
                  </option>
                ))}
              </optgroup>
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-ink-muted text-sm">
              ▾
            </span>
          </div>
        </label>

        <div className="flex flex-col gap-1 sm:min-w-[200px]">
          <span className="text-xs text-ink-muted font-mono uppercase tracking-wider">
            Sector
          </span>
          <span className="font-serif text-base text-ink">{active.sector}</span>
        </div>
      </div>
    </div>
  );
}
