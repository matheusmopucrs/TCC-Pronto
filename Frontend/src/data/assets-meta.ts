
  export type AssetSlug =
  // 10 Big Techs
  | "aapl"
  | "msft"
  | "googl"
  | "amzn"
  | "meta"
  | "nvda"
  | "tsla"
  | "nflx"
  | "adbe"
  | "intc"
  
  // 10 Brasileiras
  | "petr4"
  | "vale3"
  | "itub4"
  | "bbdc4"
  | "bbas3"
  | "abev3"
  | "mglu3"
  | "wege3"
  | "suzb3"
  | "eqtl3";

export interface AssetStats {
  "Preço Inicial": number;
  "Preço Atual": number;
  "Valorização Total (%)": number;
  "Volatilidade Anual (%)": number;
}

export interface AssetMeta {
  slug: AssetSlug;
  ticker: string;
  label: string;
  kind: "equity" | "crypto";
  sector: string;
  country: string;
  exchange: string;
  description: string;
  marketCap: string;
}

export const ASSETS: AssetMeta[] = [
  // =========================
  // INTERNACIONAIS
  // =========================
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
    description:
      "Global e-commerce marketplace and AWS cloud infrastructure provider.",
    marketCap: "US$ 1.6T",
  },
  {
    slug: "meta",
    ticker: "META",
    label: "Meta Platforms",
    kind: "equity",
    sector: "Communication Services · Social Media",
    country: "United States",
    exchange: "NASDAQ",
    description:
      "Operator of Facebook, Instagram, WhatsApp and Reality Labs.",
    marketCap: "US$ 1.2T",
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
    description:
      "Electric vehicles, energy storage and solar — vertically integrated production.",
    marketCap: "US$ 700B",
  },
  {
    slug: "nflx",
    ticker: "NFLX",
    label: "Netflix Inc.",
    kind: "equity",
    sector: "Communication Services · Streaming",
    country: "United States",
    exchange: "NASDAQ",
    description:
      "Global streaming entertainment platform producing films, series and digital content.",
    marketCap: "US$ 250B",
  },
  {
    slug: "adbe",
    ticker: "ADBE",
    label: "Adobe Inc.",
    kind: "equity",
    sector: "Technology · Software",
    country: "United States",
    exchange: "NASDAQ",
    description:
      "Creative, marketing and document software company behind Photoshop, Premiere and Acrobat.",
    marketCap: "US$ 200B",
  },
  {
    slug: "intc",
    ticker: "INTC",
    label: "Intel Corp.",
    kind: "equity",
    sector: "Technology · Semiconductors",
    country: "United States",
    exchange: "NASDAQ",
    description:
      "Semiconductor manufacturer focused on CPUs, AI chips and foundry services.",
    marketCap: "US$ 130B",
  },

  // =========================
  // BRASILEIRAS
  // =========================
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
    description:
      "Global iron ore and base metals producer with major logistics operations.",
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
    description:
      "Largest private bank in Brazil — retail, wholesale and asset management.",
    marketCap: "R$ 270B",
  },
  {
    slug: "bbdc4",
    ticker: "BBDC4.SA",
    label: "Bradesco",
    kind: "equity",
    sector: "Financial Services · Banks",
    country: "Brazil",
    exchange: "B3",
    description:
      "One of Brazil’s largest private banks with strong retail banking and insurance operations.",
    marketCap: "R$ 150B",
  },
  {
    slug: "bbas3",
    ticker: "BBAS3.SA",
    label: "Banco do Brasil",
    kind: "equity",
    sector: "Financial Services · Banks",
    country: "Brazil",
    exchange: "B3",
    description:
      "Major state-controlled bank offering retail, agribusiness and corporate banking services.",
    marketCap: "R$ 160B",
  },
  {
    slug: "abev3",
    ticker: "ABEV3.SA",
    label: "Ambev",
    kind: "equity",
    sector: "Consumer Defensive · Beverages",
    country: "Brazil",
    exchange: "B3",
    description:
      "Leading beverage company in Latin America producing beer, soft drinks and other beverages.",
    marketCap: "R$ 210B",
  },
  {
    slug: "mglu3",
    ticker: "MGLU3.SA",
    label: "Magazine Luiza",
    kind: "equity",
    sector: "Consumer Cyclical · Retail",
    country: "Brazil",
    exchange: "B3",
    description:
      "Brazilian retail and e-commerce company focused on digital transformation and logistics.",
    marketCap: "R$ 18B",
  },
  {
    slug: "wege3",
    ticker: "WEGE3.SA",
    label: "WEG S.A.",
    kind: "equity",
    sector: "Industrials · Electrical Equipment",
    country: "Brazil",
    exchange: "B3",
    description:
      "Industrial equipment manufacturer specialized in electric motors, automation and energy solutions.",
    marketCap: "R$ 230B",
  },
  {
    slug: "suzb3",
    ticker: "SUZB3.SA",
    label: "Suzano",
    kind: "equity",
    sector: "Basic Materials · Paper & Pulp",
    country: "Brazil",
    exchange: "B3",
    description:
      "World-leading pulp producer focused on sustainable forestry and paper products.",
    marketCap: "R$ 75B",
  },
  {
    slug: "eqtl3",
    ticker: "EQTL3.SA",
    label: "Equatorial Energia",
    kind: "equity",
    sector: "Utilities · Electric Power",
    country: "Brazil",
    exchange: "B3",
    description:
      "Electric power distribution and energy infrastructure company operating across Brazil.",
    marketCap: "R$ 40B",
  },
];

export const ASSET_SLUGS = ASSETS.map((a) => a.slug) as [AssetSlug, ...AssetSlug[]];
export const DEFAULT_ASSET: AssetSlug = "aapl";
