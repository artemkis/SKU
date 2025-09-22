'use client';

import { useMemo, useState } from 'react';
import {
  toNum,
  clamp,
  unitRevenue,
  unitFee,
  makeId,
} from '@/lib/helpers';   // lib лежит в корне → ../../
import type { Row } from '@/lib/types'; // то же самое

import FormCard from './components/FormCard';   // внутри app → ./components
import DataTable from './components/DataTable'; // внутри app → ./components


/** Фиксированная ширина первой (липкой) колонки SKU */
const SKU_COL_W = 'w-[150px] min-w-[150px] max-w-[150px]';

/* =========================================================
   Описание колонок шапки (с единицами в label).
   NBSP = \u00A0, символ рубля = \u20BD.
   Рендерим через .map — без лишних текстовых узлов в <tr>.
   ========================================================= */
const headerColumns: Array<{
  key: string;
  label: string;
  width?: string;
  tooltip?: { text: string; formula?: string };
}> = [
  { key: 'sku',       label: 'SKU',                        width: 'w-[12%]', tooltip: { text: 'Уникальный идентификатор товара (артикул).' } },
  { key: 'price',     label: 'Цена\u00A0\u20BD',           width: 'w-[12%]', tooltip: { text: 'Цена продажи за единицу товара, ₽.' } },
  { key: 'cost',      label: 'Себестоимость\u00A0\u20BD',  width: 'w-[12%]', tooltip: { text: 'Сколько стоит произвести товар, ₽.' } },
  { key: 'feePct',    label: 'Комиссия\u00A0%',            width: 'w-[10%]', tooltip: { text: 'Процент комиссии маркетплейса, %.', formula: 'Комиссия = Цена × (Комиссия % / 100)' } },
  { key: 'logistics', label: 'Логистика\u00A0\u20BD',      width: 'w-[12%]', tooltip: { text: 'Затраты на доставку одной единицы товара, ₽.' } },
  { key: 'rev',       label: 'Выручка\u00A0\u20BD',        width: 'w-[12%]', tooltip: { text: 'Доход от продажи 1 шт без учёта комиссии, ₽.', formula: 'Выручка = Цена × (1 - Скидка %)' } },
  { key: 'fee',       label: 'Комиссия\u00A0\u20BD',       width: 'w-[12%]', tooltip: { text: 'Сумма комиссии в рублях.', formula: 'Комиссия ₽ = Выручка × (Комиссия % / 100)' } },
  { key: 'direct',    label: 'Прямые затраты\u00A0\u20BD', width: 'w-[12%]', tooltip: { text: 'Себестоимость + Логистика, ₽.', formula: 'Прямые = Себестоимость + Логистика' } },
  { key: 'profit',    label: 'Прибыль/шт\u00A0\u20BD',     width: 'w-[12%]', tooltip: { text: 'Доход с учётом всех затрат, ₽.', formula: 'Прибыль = Выручка - Комиссия ₽ - Прямые' } },
  { key: 'margin',    label: 'Маржа\u00A0%',               width: 'w-[10%]', tooltip: { text: 'Отношение прибыли к выручке, %.', formula: 'Маржа = (Прибыль ÷ Выручка) × 100%' } },
];

export default function Home() {
  /* ---------- форма ---------- */
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [feePct, setFeePct] = useState('');
  const [logistics, setLogistics] = useState('');

  /* ---------- данные таблицы и шторка ---------- */
  const [rows, setRows] = useState<Row[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);

  /* ---------- редактирование строки ---------- */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftSku, setDraftSku] = useState('');
  const [draftPrice, setDraftPrice] = useState('');
  const [draftCost, setDraftCost] = useState('');
  const [draftFeePct, setDraftFeePct] = useState('');
  const [draftLogistics, setDraftLogistics] = useState('');

  const handleStartEdit = (r: Row) => {
    setEditingId(r.id);
    setDraftSku(r.sku);
    setDraftPrice(r.price.toString());
    setDraftCost(r.cost.toString());
    setDraftFeePct(r.feePct.toString());
    setDraftLogistics(r.logistics.toString());
  };
  const handleCancelEdit = () => {
    setEditingId(null);
    setDraftSku(''); setDraftPrice(''); setDraftCost(''); setDraftFeePct(''); setDraftLogistics('');
  };
  const handleSaveEdit = () => {
    if (!editingId) return;
    setRows(prev =>
      prev.map(r =>
        r.id === editingId
          ? {
              ...r,
              sku: draftSku.trim() || r.sku,
              price: toNum(draftPrice),
              cost: toNum(draftCost),
              feePct: clamp(toNum(draftFeePct), 0, 100),
              logistics: toNum(draftLogistics),
            }
          : r
      )
    );
    handleCancelEdit();
  };

  /* ---------- превью по текущим полям формы ---------- */
  const p = toNum(price);
  const c = toNum(cost);
  const f = clamp(toNum(feePct), 0, 100);
  const l = toNum(logistics);

  const isInitialForm = [price, cost, feePct, logistics].every(v => v.trim() === '');

  const revenuePreview = unitRevenue(p, 0);
  const profitPreview = p - c - unitFee(p, f, 0) - l;
  const marginPreview = revenuePreview > 0 ? (profitPreview / revenuePreview) * 100 : 0;

  const previewProfitClass =
    isInitialForm ? 'text-gray-900 font-semibold'
    : profitPreview < 0 ? 'text-red-600 font-semibold'
    : profitPreview > 0 ? 'text-green-600 font-semibold'
    : 'text-gray-900 font-semibold';

  const previewMarginClass =
    isInitialForm ? 'text-gray-900 font-semibold'
    : marginPreview < 0 ? 'text-red-600 font-semibold'
    : marginPreview < 20 ? 'text-yellow-600 font-semibold'
    : marginPreview > 0 ? 'text-green-600 font-semibold'
    : 'text-gray-900 font-semibold';

  /* ---------- добавление/удаление ---------- */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRow: Row = {
      id: makeId(),
      sku: sku.trim() || `SKU-${rows.length + 1}`,
      price: p,
      cost: c,
      feePct: f,
      logistics: l,
    };
    setRows(prev => [newRow, ...prev]);
    if (!sheetOpen) setSheetOpen(true);
    setSku(''); setPrice(''); setCost(''); setFeePct(''); setLogistics('');
  };
  const handleRemove = (id: string) => setRows(prev => prev.filter(r => r.id !== id));
  const handleClearAll = () => setRows([]);

  /* ---------- пересчёт метрик + итоги ---------- */
  const computed = useMemo(() => {
    const withMetrics = rows.map(r => {
      const rev = unitRevenue(r.price, 0);
      const fee = unitFee(r.price, r.feePct, 0);
      const direct = r.cost + r.logistics;
      const profit = rev - fee - direct;
      const marginPct = rev > 0 ? (profit / rev) * 100 : 0;
      return { ...r, rev, fee, direct, profit, marginPct };
    });

    const totals = withMetrics.reduce(
      (acc, r) => {
        acc.rev += r.rev;
        acc.fee += r.fee;
        acc.direct += r.direct;
        acc.profit += r.profit;
        return acc;
      },
      { rev: 0, fee: 0, direct: 0, profit: 0 }
    );

    const totalMarginPct = totals.rev > 0 ? (totals.profit / totals.rev) * 100 : 0;
    return { rows: withMetrics, totals, totalMarginPct };
  }, [rows]);

  const totalMarginClass =
    computed.totalMarginPct < 0
      ? 'text-red-700'
      : computed.totalMarginPct > 0
      ? computed.totalMarginPct < 20
        ? 'text-yellow-700'
        : 'text-green-700'
      : 'text-gray-800';

  /* ---------- поля формы для компактного рендера ---------- */
  type Field = {
    id: string; label: string; type: 'text' | 'number'; value: string;
    set: React.Dispatch<React.SetStateAction<string>>; min?: number; max?: number
  };
  const fields: Field[] = [
    { id: 'sku',       label: 'SKU (название товара)', type: 'text',   value: sku,       set: setSku },
    { id: 'price',     label: 'Цена продажи, ₽',       type: 'number', value: price,     set: setPrice },
    { id: 'cost',      label: 'Себестоимость, ₽',      type: 'number', value: cost,      set: setCost },
    { id: 'feePct',    label: 'Комиссия площадки, %',  type: 'number', value: feePct,    set: setFeePct, min: 0, max: 100 },
    { id: 'logistics', label: 'Логистика, ₽/шт',       type: 'number', value: logistics, set: setLogistics },
  ];

  /* =========================================================
     UI
     ========================================================= */
  return (
    <main className="flex min-h-screen items-start justify-center py-10 px-4 relative z-10">
      <FormCard
        onSubmit={handleSubmit}
        fields={fields}
        previewProfitClass={previewProfitClass}
        profitPreview={profitPreview}
        previewMarginClass={previewMarginClass}
        marginPreview={marginPreview}
        onOpenTable={() => setSheetOpen(true)}
      />

      {/* затемняющий фон под шторкой */}
      {sheetOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-20 transition-opacity"
          onClick={() => setSheetOpen(false)}
        />
      )}

      {/* bottom sheet + таблица */}
      <section
        className={[
          'fixed inset-x-0 bottom-0 z-30',
          'transform transition-transform duration-500 ease-in-out will-change-[transform]',
          sheetOpen ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none',
        ].join(' ')}
      >
        <div className="mx-auto w-full max-w-[1400px] px-4">
          <div className="rounded-t-2xl border border-gray-200/70 bg-white/95 backdrop-blur shadow-2xl">
            <div className="flex justify-center pt-2">
              <div className="h-1.5 w-12 rounded-full bg-gray-300" />
            </div>

            {/* тулбар */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="text-sm text-gray-600">
                Всего позиций: <span className="font-semibold">{rows.length}</span>
              </div>
              <div className="flex items-center gap-2">
                {rows.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="px-4 py-2 rounded-xl border border-gray-300 bg-white/90 text-gray-700 hover:bg-white transition"
                  >
                    Очистить всё
                  </button>
                )}
                <button
                  onClick={() => setSheetOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-white hover:bg-gray-700 transition"
                >
                  Закрыть
                </button>
              </div>
            </div>

            {/* таблица */}
            <div className="max-h-[55vh] overflow-auto overflow-x-auto">
              <DataTable
                headerColumns={headerColumns}
                SKU_COL_W={SKU_COL_W}
                computed={computed}
                editingId={editingId}
                draftSku={draftSku}
                draftPrice={draftPrice}
                draftCost={draftCost}
                draftFeePct={draftFeePct}
                draftLogistics={draftLogistics}
                setDraftSku={setDraftSku}
                setDraftPrice={setDraftPrice}
                setDraftCost={setDraftCost}
                setDraftFeePct={setDraftFeePct}
                setDraftLogistics={setDraftLogistics}
                handleStartEdit={handleStartEdit}
                handleSaveEdit={handleSaveEdit}
                handleCancelEdit={handleCancelEdit}
                handleRemove={handleRemove}
                totalMarginClass={totalMarginClass}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
