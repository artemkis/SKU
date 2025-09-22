// Хелперы: чистая логика без UI

export const toNum = (v: string) => {
  if (!v) return 0;
  const s = v.replace(/\s+/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export const clamp = (x: number, min: number, max: number) =>
  Math.min(max, Math.max(min, x));

export const fmt = (x: number, d = 2) =>
  x.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtRub = (x: number, d = 2) =>
  x.toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

export const unitRevenue = (price: number, promoPct = 0) =>
  price * (1 - promoPct / 100);

export const unitFee = (price: number, feePct = 0, promoPct = 0) =>
  unitRevenue(price, promoPct) * (feePct / 100);

export const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Константа ширины первой колонки (ты уже используешь её так же в page.tsx)
export const SKU_COL_W = 'w-[150px] min-w-[150px] max-w-[150px]';
