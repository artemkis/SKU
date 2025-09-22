'use client';

import Tooltip from './Tooltip';
import { fmt, fmtRub } from '@/lib/helpers';

/* ================== типы пропсов ================== */

type HeaderCol = {
  key: string;
  label: string;
  width?: string;
  tooltip?: { text: string; formula?: string };
};

type RowWithMetrics = {
  id: string;
  sku: string;
  price: number;
  cost: number;
  feePct: number;
  logistics: number;
  rev: number;
  fee: number;
  direct: number;
  profit: number;
  marginPct: number;
};

type ComputedBlock = {
  rows: RowWithMetrics[];
  totals: { rev: number; fee: number; direct: number; profit: number };
  totalMarginPct: number;
};

type DataTableProps = {
  headerColumns: HeaderCol[];
  SKU_COL_W: string;
  computed: ComputedBlock;

  editingId: string | null;
  draftSku: string;
  draftPrice: string;
  draftCost: string;
  draftFeePct: string;
  draftLogistics: string;

  setDraftSku: (v: string) => void;
  setDraftPrice: (v: string) => void;
  setDraftCost: (v: string) => void;
  setDraftFeePct: (v: string) => void;
  setDraftLogistics: (v: string) => void;

  handleStartEdit: (r: RowWithMetrics) => void;
  handleSaveEdit: () => void;
  handleCancelEdit: () => void;
  handleRemove: (id: string) => void;

  totalMarginClass: string;
};

/* ================== компонент ================== */

export default function DataTable({
  headerColumns,
  SKU_COL_W,
  computed,
  editingId,
  draftSku,
  draftPrice,
  draftCost,
  draftFeePct,
  draftLogistics,
  setDraftSku,
  setDraftPrice,
  setDraftCost,
  setDraftFeePct,
  setDraftLogistics,
  handleStartEdit,
  handleSaveEdit,
  handleCancelEdit,
  handleRemove,
  totalMarginClass,
}: DataTableProps) {
  return (
    <table className="w-full min-w-[1300px] table-auto text-sm">
      <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b">
        <tr className="text-left text-gray-600">
          {headerColumns.map((col) => {
            if (col.key === 'sku') {
              return (
                <th
                  key={col.key}
                  className={[
                    'px-4 py-3 font-semibold sticky left-0 bg-white z-20',
                    SKU_COL_W,
                    col.width ?? '',
                  ].join(' ')}
                >
                  <span className="inline-flex items-center whitespace-nowrap gap-2 align-middle">
                    <span>{col.label}</span>
                    {col.tooltip && (
                      <Tooltip
                        align="left"
                        text={col.tooltip.text}
                        formula={col.tooltip.formula}
                      />
                    )}
                  </span>
                </th>
              );
            }

            return (
              <th key={col.key} className={`px-4 py-3 font-semibold ${col.width ?? ''}`}>
                <span className="inline-flex items-center whitespace-nowrap gap-2 align-middle">
                  <span>{col.label}</span>
                  {col.tooltip && (
                    <Tooltip text={col.tooltip.text} formula={col.tooltip.formula} />
                  )}
                </span>
              </th>
            );
          })}
          {/* последняя колонка под кнопки/бейджи */}
          <th className="px-4 py-3 font-semibold w-[14%]" />
        </tr>
      </thead>

      <tbody className="[&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-gray-50">
        {computed.rows.length === 0 ? (
          <tr className="text-gray-400">
            <td className="px-4 py-4" colSpan={headerColumns.length + 1}>
              Добавьте позицию, чтобы увидеть строки
            </td>
          </tr>
        ) : (
          computed.rows.map((r) => {
            const isEditing = editingId === r.id;
            return (
              <tr key={r.id} className="hover:bg-sky-50/60 transition">
                {/* SKU — фиксированная липкая колонка с жёсткой шириной */}
                <td
                  className={`px-4 py-3 font-medium text-gray-800 sticky left-0 bg-white z-10 ${SKU_COL_W} border-r border-gray-200`}
                >
                  {isEditing ? (
                    <input
                      value={draftSku}
                      onChange={(e) => setDraftSku(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                    />
                  ) : (
                    <div className="truncate">{r.sku}</div>
                  )}
                </td>

                {/* Цена, ₽ */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {isEditing ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={draftPrice}
                      onChange={(e) => setDraftPrice(e.target.value)}
                      className="w-32 rounded-lg border border-gray-300 bg-white px-2 py-1 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                    />
                  ) : (
                    fmtRub(r.price)
                  )}
                </td>

                {/* Себестоимость, ₽ */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {isEditing ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={draftCost}
                      onChange={(e) => setDraftCost(e.target.value)}
                      className="w-32 rounded-lg border border-gray-300 bg-white px-2 py-1 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                    />
                  ) : (
                    fmtRub(r.cost)
                  )}
                </td>

                {/* Комиссия, % */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={0}
                        max={100}
                        value={draftFeePct}
                        onChange={(e) => setDraftFeePct(e.target.value)}
                        className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                      />
                      <span>%</span>
                    </div>
                  ) : (
                    <>
                      {fmt(r.feePct, 2)}
                      {'\u00A0'}%
                    </>
                  )}
                </td>

                {/* Логистика, ₽ */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {isEditing ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={draftLogistics}
                      onChange={(e) => setDraftLogistics(e.target.value)}
                      className="w-32 rounded-lg border border-gray-300 bg-white px-2 py-1 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                    />
                  ) : (
                    fmtRub(r.logistics)
                  )}
                </td>

                {/* Выручка, ₽ */}
                <td className="px-4 py-3 whitespace-nowrap">{fmtRub(r.rev)}</td>
                {/* Комиссия, ₽ */}
                <td className="px-4 py-3 whitespace-nowrap">{fmtRub(r.fee)}</td>
                {/* Прямые затраты, ₽ */}
                <td className="px-4 py-3 whitespace-nowrap">{fmtRub(r.direct)}</td>

                {/* Прибыль, ₽ */}
                <td
                  className={`px-4 py-3 font-semibold whitespace-nowrap ${
                    r.profit < 0 ? 'text-red-600' : r.profit > 0 ? 'text-green-600' : 'text-gray-800'
                  }`}
                >
                  {fmtRub(r.profit)}
                </td>

                {/* Маржа, % */}
                <td
                  className={`px-4 py-3 font-semibold whitespace-nowrap ${
                    r.marginPct < 0
                      ? 'text-red-600'
                      : r.marginPct > 0
                      ? r.marginPct < 20
                        ? 'text-yellow-600'
                        : 'text-green-600'
                      : 'text-gray-800'
                  }`}
                >
                  {fmt(r.marginPct)}
                  {'\u00A0'}%
                </td>

                {/* Действия */}
                <td className="px-4 py-3 flex gap-2 items-center">
                  {!isEditing ? (
                    <>
                      <button
                        onClick={() => handleStartEdit(r)}
                        className="rounded-lg px-3 py-1.5 text-xs border border-indigo-300 text-indigo-700 hover:bg-indigo-50 transition"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleRemove(r.id)}
                        className="rounded-lg px-3 py-1.5 text-xs border border-gray-300 hover:bg-gray-50 transition"
                      >
                        Удалить
                      </button>
                      {r.profit < 0 && (
                        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                          Убыток
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        className="rounded-lg px-3 py-1.5 text-xs border border-green-300 text-green-700 hover:bg-green-50 transition"
                      >
                        Сохранить
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="rounded-lg px-3 py-1.5 text-xs border border-gray-300 hover:bg-gray-50 transition"
                      >
                        Отмена
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })
        )}
      </tbody>

      <tfoot>
        <tr className="bg-indigo-50/70 border-t">
          {/* первые 5 колонок под «Итого» */}
          <td className="px-4 py-3 font-bold" colSpan={5}>
            Итого
          </td>

          {/* Выручка, ₽ */}
          <td className="px-4 py-3 font-bold whitespace-nowrap">
            {fmtRub(computed.totals.rev)}
          </td>
          {/* Комиссия, ₽ */}
          <td className="px-4 py-3 font-bold whitespace-nowrap">
            {fmtRub(computed.totals.fee)}
          </td>
          {/* Прямые затраты, ₽ */}
          <td className="px-4 py-3 font-bold whitespace-nowrap">
            {fmtRub(computed.totals.direct)}
          </td>

          {/* Прибыль, ₽ */}
          <td
            className={[
              'px-4 py-3 font-bold whitespace-nowrap',
              computed.totals.profit < 0
                ? 'text-red-700'
                : computed.totals.profit > 0
                ? 'text-green-700'
                : 'text-gray-800',
            ].join(' ')}
          >
            {fmtRub(computed.totals.profit)}
          </td>

          {/* Общая маржа, % */}
          <td className={`px-4 py-3 font-bold whitespace-nowrap ${totalMarginClass}`}>
            {fmt(computed.totalMarginPct)}
            {'\u00A0'}%
          </td>

          {/* Пустая под кнопки/выравнивание */}
          <td className="px-4 py-3" />
        </tr>
      </tfoot>
    </table>
  );
}
