// lib/csv.ts
import type { Row, RowWithMetrics } from './types';

/** Безопасный парсер CSV в массив базовых строк (SKU, price, cost, feePct, logistics). */
export function parseCSVToBaseRows(text: string): Array<Pick<Row, 'id' | 'sku' | 'price' | 'cost' | 'feePct' | 'logistics'>> {
  // Нормализуем переносы и разделители
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(Boolean);

  if (lines.length === 0) return [];

  // Определяем разделитель по первой строке
  const sep = (lines[0].includes(';') && !lines[0].includes(',')) ? ';' : ';';

  // Хелпер: число из строки (поддержка "100,50 ₽", "10 %")
  const num = (s: string): number => {
    const cleaned = s
      .replace(/\s+/g, '')
      .replace(/[₽%]/g, '')
      .replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  // Пропустим заголовок, если он текстовый (содержит буквы)
  const startAt = /[A-Za-zА-Яа-яЁё]/.test(lines[0]) ? 1 : 0;

  const rows: Array<Pick<Row, 'id' | 'sku' | 'price' | 'cost' | 'feePct' | 'logistics'>> = [];

  for (let i = startAt; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;
    const parts = raw.split(sep).map(p => p.trim());

    // ждём минимум 5 столбцов: sku; price; cost; feePct; logistics
    if (parts.length < 5) continue;

    const [sku, price, cost, feePct, logistics, maybeId] = parts;

    rows.push({
      id: (maybeId && maybeId.length >= 8) ? maybeId : '', // необязательный id (если вдруг добавят)
      sku,
      price: num(price),
      cost: num(cost),
      feePct: num(feePct),
      logistics: num(logistics),
    });
  }

  return rows;
}

/** Скачивание CSV-текста как файла (с BOM). */
export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Форматирование чисел по-русски (запятая, пробелы). */
const fmtMoney = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (n: number) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Экспорт: rows → CSV.
 * @param rows строки с рассчитанными метриками
 * @param addUnits если true — добавляем единицы измерения в ЗАГОЛОВКИ и ЗНАЧЕНИЯ
 */
export function rowsWithMetricsToCSV(rows: RowWithMetrics[], addUnits = false): string {
  // Заголовки
  const headers = [
    'SKU',
    addUnits ? 'Цена, ₽' : 'Цена',
    addUnits ? 'Себестоимость, ₽' : 'Себестоимость',
    addUnits ? 'Комиссия, %' : 'Комиссия',
    addUnits ? 'Логистика, ₽' : 'Логистика',
    addUnits ? 'Выручка, ₽' : 'Выручка',
    addUnits ? 'Комиссия, ₽' : 'Комиссия ₽',
    addUnits ? 'Прямые затраты, ₽' : 'Прямые затраты',
    addUnits ? 'Прибыль/шт, ₽' : 'Прибыль/шт',
    addUnits ? 'Маржа, %' : 'Маржа',
    'Статус',
  ];

  const sep = ';';

  const lines: string[] = [];
  lines.push(headers.join(sep));

  for (const r of rows) {
    const price = addUnits ? `${fmtMoney(r.price)} ₽` : fmtMoney(r.price);
    const cost = addUnits ? `${fmtMoney(r.cost)} ₽` : fmtMoney(r.cost);
    const feePct = addUnits ? `${fmtPct(r.feePct)} %` : fmtPct(r.feePct);
    const logistics = addUnits ? `${fmtMoney(r.logistics)} ₽` : fmtMoney(r.logistics);

    const rev = addUnits ? `${fmtMoney(r.rev)} ₽` : fmtMoney(r.rev);
    const fee = addUnits ? `${fmtMoney(r.fee)} ₽` : fmtMoney(r.fee);
    const direct = addUnits ? `${fmtMoney(r.direct)} ₽` : fmtMoney(r.direct);
    const profit = addUnits ? `${fmtMoney(r.profit)} ₽` : fmtMoney(r.profit);
    const margin = addUnits ? `${fmtPct(r.marginPct)} %` : fmtPct(r.marginPct);

    const status = r.profit > 0 ? 'Прибыль' : r.profit < 0 ? 'Убыток' : 'Ноль';

    lines.push(
      [
        r.sku,
        price,
        cost,
        feePct,
        logistics,
        rev,
        fee,
        direct,
        profit,
        margin,
        status,
      ].join(sep)
    );
  }

  return lines.join('\n');
}
