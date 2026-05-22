import statsData from "@/data/assets-stats.json";
import {
  ASSETS,
  DEFAULT_ASSET,
  type AssetMeta,
  type AssetSlug,
  type AssetStats,
} from "@/data/assets-meta";

const STATS_BY_TICKER = statsData as Record<string, AssetStats>;

export type Asset = AssetMeta & {
  open: number;
  close: number;
  appreciation: number;
  volatility: number;
};

export function getAsset(slug: string | undefined): Asset | null {
  const meta = ASSETS.find((a) => a.slug === slug);
  if (!meta) return null;

  const stats = STATS_BY_TICKER[meta.ticker];

  return {
    ...meta,
    open: stats?.["Preço Inicial"] ?? 0,
    close: stats?.["Preço Atual"] ?? 0,
    appreciation: stats?.["Valorização Total (%)"] ?? 0,
    volatility: stats?.["Volatilidade Anual (%)"] ?? 0,
  };
}

export function getAssetOrDefault(slug: string | undefined): Asset {
  return getAsset(slug) ?? getAsset(DEFAULT_ASSET)!;
}

export function assetCurrency(meta: Pick<AssetMeta, "country">): "USD" | "BRL" {
  return meta.country === "Brazil" ? "BRL" : "USD";
}

export function formatPrice(value: number, meta: Pick<AssetMeta, "country">): string {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: assetCurrency(meta),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: number, fractionDigits = 2): string {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`;
}

/**
 * Public chart PNG written by the local Python pipeline.
 * Pattern: /images/[ticker_lower]_[chartId].png
 */
export function chartImagePath(ticker: string, chartId: string): string {
  return `/images/${ticker.toLowerCase()}_${chartId}.png`;
}

/** @deprecated Use chartImagePath — legacy slug-based figures plugin. */
export function figurePath(slug: AssetSlug, name: string): string {
  return `/figures/${slug}/${name}.png`;
}
