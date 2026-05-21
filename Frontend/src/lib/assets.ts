export type AssetSlug =
  | "aapl"
  | "msft"
  | "googl"
  | "amzn"
  | "nvda"
  | "tsla"
  | "meta"
  | "petr4"
  | "vale3"
  | "itub4"
  | "btc"
  | "eth";

export interface AssetMeta {
  slug: AssetSlug;
  ticker: string;
  label: string;
  kind: "equity" | "crypto";
  sector: string;
  country: string;
  exchange: string;
  description: string;
  /** Sample first-period reference prices — replace with real values from your dataset. */
  open: string;
  close: string;
  marketCap: string;
}

export const ASSETS: AssetMeta[] = [
  {
    slug: "aapl",
    ticker: "AAPL",
    label: "Apple Inc.",
    kind: "equity",
    sector: "Technology · Consumer Electronics",
    country: "United States",
    exchange: "NASDAQ",
    description:
      "Designs and manufactures smartphones, personal computers and wearables, with a growing services business.",
    open: "125.07",
    close: "151.73",
    marketCap: "US$ 2.7T",
  },
  {
    slug: "msft",
    ticker: "MSFT",
    label: "Microsoft Corp.",
    kind: "equity",
    sector: "Technology · Software & Cloud",
    country: "United States",
    exchange: "NASDAQ",
    description:
      "Software, cloud infrastructure (Azure) and productivity platforms across consumer and enterprise.",
    open: "239.58",
    close: "276.20",
    marketCap: "US$ 2.9T",
  },
  {
    slug: "googl",
    ticker: "GOOGL",
    label: "Alphabet Inc.",
    kind: "equity",
    sector: "Communication Services · Internet",
    country: "United States",
    exchange: "NASDAQ",
    description:
      "Parent of Google — search, advertising, YouTube, Android and Google Cloud.",
    open: "89.12",
    close: "104.45",
    marketCap: "US$ 1.8T",
  },
  {
    slug: "amzn",
    ticker: "AMZN",
    label: "Amazon.com Inc.",
    kind: "equity",
    sector: "Consumer Cyclical · E-commerce & Cloud",
    country: "United States",
    exchange: "NASDAQ",
    description: "Global e-commerce marketplace and AWS cloud infrastructure provider.",
    open: "85.46",
    close: "103.13",
    marketCap: "US$ 1.6T",
  },
  {
    slug: "nvda",
    ticker: "NVDA",
    label: "NVIDIA Corp.",
    kind: "equity",
    sector: "Technology · Semiconductors",
    country: "United States",
    exchange: "NASDAQ",
    description:
      "GPUs and accelerated computing platforms powering gaming, data centers and AI workloads.",
    open: "148.59",
    close: "232.16",
    marketCap: "US$ 3.0T",
  },
  {
    slug: "tsla",
    ticker: "TSLA",
    label: "Tesla Inc.",
    kind: "equity",
    sector: "Consumer Cyclical · Automotive & Energy",
    country: "United States",
    exchange: "NASDAQ",
    description: "Electric vehicles, energy storage and solar — vertically integrated production.",
    open: "118.47",
    close: "207.46",
    marketCap: "US$ 700B",
  },
  {
    slug: "meta",
    ticker: "META",
    label: "Meta Platforms",
    kind: "equity",
    sector: "Communication Services · Social Media",
    country: "United States",
    exchange: "NASDAQ",
    description: "Operator of Facebook, Instagram, WhatsApp and Reality Labs.",
    open: "122.82",
    close: "172.39",
    marketCap: "US$ 1.2T",
  },
  {
    slug: "petr4",
    ticker: "PETR4.SA",
    label: "Petrobras",
    kind: "equity",
    sector: "Energy · Integrated Oil & Gas",
    country: "Brazil",
    exchange: "B3",
    description:
      "Integrated energy company — exploration, refining and distribution of oil, gas and derivatives.",
    open: "27.41",
    close: "24.10",
    marketCap: "R$ 480B",
  },
  {
    slug: "vale3",
    ticker: "VALE3.SA",
    label: "Vale S.A.",
    kind: "equity",
    sector: "Basic Materials · Mining",
    country: "Brazil",
    exchange: "B3",
    description: "Global iron ore and base metals producer with major logistics operations.",
    open: "88.32",
    close: "82.41",
    marketCap: "R$ 340B",
  },
  {
    slug: "itub4",
    ticker: "ITUB4.SA",
    label: "Itaú Unibanco",
    kind: "equity",
    sector: "Financial Services · Banks",
    country: "Brazil",
    exchange: "B3",
    description: "Largest private bank in Brazil — retail, wholesale and asset management.",
    open: "25.16",
    close: "27.89",
    marketCap: "R$ 270B",
  },
  {
    slug: "btc",
    ticker: "BTC-USD",
    label: "Bitcoin",
    kind: "crypto",
    sector: "Cryptocurrency · Store of Value",
    country: "Decentralized",
    exchange: "Multiple",
    description: "First and largest cryptocurrency by market capitalization.",
    open: "16,672.40",
    close: "22,940.07",
    marketCap: "US$ 1.3T",
  },
  {
    slug: "eth",
    ticker: "ETH-USD",
    label: "Ethereum",
    kind: "crypto",
    sector: "Cryptocurrency · Smart Contracts",
    country: "Decentralized",
    exchange: "Multiple",
    description: "Programmable blockchain platform supporting smart contracts and dApps.",
    open: "1,200.55",
    close: "1,615.78",
    marketCap: "US$ 400B",
  },
];

export const ASSET_SLUGS = ASSETS.map((a) => a.slug) as [AssetSlug, ...AssetSlug[]];
export const DEFAULT_ASSET: AssetSlug = "aapl";

export function getAsset(slug: string | undefined): AssetMeta {
  return ASSETS.find((a) => a.slug === slug) ?? ASSETS[0];
}

/**
 * Path served by the Vite plugin (see vite.config.ts) — maps to ../images/<slug>/<name>.png
 * in dev, and to dist/figures/<slug>/<name>.png in production builds.
 */
export function figurePath(slug: AssetSlug, name: string): string {
  return `/figures/${slug}/${name}.png`;
}
