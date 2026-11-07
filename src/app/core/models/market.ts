export interface SourceError {
  source: string;
  error: string;
}

interface MarketFeed<T> {
  agent: string;
  notice: string;
  updated_at: string;
  items: T[];
  errors: SourceError[];
}

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string | null;
  topics: string[];
}

export interface EarningsItem {
  date: string;
  symbol: string;
  name: string;
  time: string;
  eps_forecast: number | null;
  last_year_eps: number | null;
  market_cap: number | null;
  estimates: number;
  fiscal_quarter: string | null;
  held_by: string[];
  watchlist: boolean;
}

export interface CorporateAction {
  type: 'Dividend' | 'Split';
  symbol: string;
  name: string;
  ex_date: string | null;
  pay_date: string | null;
  record_date: string | null;
  amount: number | null;
  ratio: string | null;
  held_by: string[];
}

export interface HeatmapItem {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  market_cap: number;
  change_pct: number;
  price: number | null;
  held_by: string[];
}

export interface SectorSummary {
  sector: string;
  market_cap: number;
  count: number;
  change_pct: number;
}

export interface HeatmapFeed extends MarketFeed<HeatmapItem> {
  sectors: SectorSummary[];
  breadth?: { up: number; down: number; total: number };
  market_change_pct?: number | null;
}

export type NewsFeed = MarketFeed<NewsItem>;
export type EarningsFeed = MarketFeed<EarningsItem>;
export type CorporateActionsFeed = MarketFeed<CorporateAction>;
