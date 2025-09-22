// Общие типы проекта

export type Row = {
  id: string;
  sku: string;
  price: number;
  cost: number;
  feePct: number;
  logistics: number;
};

export type WithMetrics = Row & {
  rev: number;
  fee: number;
  direct: number;
  profit: number;
  marginPct: number;
};

export type ComputedTotals = {
  rev: number;
  fee: number;
  direct: number;
  profit: number;
};

export type ComputedBundle = {
  rows: WithMetrics[];
  totals: ComputedTotals;
  totalMarginPct: number;
};

export type HeaderCol = {
  key: string;
  label: string;
  width?: string;
  tooltip?: { text: string; formula?: string };
};

export type Field = {
  id: string;
  label: string;
  type: 'text' | 'number';
  value: string;
  set: (v: string) => void;
  min?: number;
  max?: number;
};

