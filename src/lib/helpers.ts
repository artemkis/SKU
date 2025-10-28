// src/lib/helpers.ts

/* ======================= utils ======================= */

export const toNum = (s: string | number): number => {
  if (typeof s === 'number') return Number.isFinite(s) ? s : 0
  // убираем пробелы, символы ₽/%, меняем запятую на точку
  const cleaned = s.replace(/\s+/g, '').replace(/[₽%]/g, '').replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

export const makeId = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

/* =================== money & percent =================== */
/** Единый формат денег (2 знака, ru-RU) */
export const fmtMoney = (n: number) =>
  Number.isFinite(n)
    ? n.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0,00'

/** Единый формат процентов (2 знака, ru-RU) */
export const fmtPct = (n: number) =>
  Number.isFinite(n)
    ? n.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0,00'

/* ======================= domain ======================= */
/** Выручка за 1 шт с учётом скидки (в процентах) */
export const unitRevenue = (price: number, discountPct: number) => {
  const p = toNum(price)
  const d = clamp(toNum(discountPct), 0, 100)
  return p * (1 - d / 100)
}

/** Комиссия маркетплейса в рублях (от выручки) */
export const unitFee = (price: number, feePct: number, discountPct: number) => {
  const revenue = unitRevenue(price, discountPct)
  const fee = clamp(toNum(feePct), 0, 100)
  return revenue * (fee / 100)
}
