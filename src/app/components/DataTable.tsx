'use client'

import Tooltip from './Tooltip'
import { fmt, fmtRub } from '../../lib/helpers'
import { AnimatePresence, motion } from 'framer-motion'
import { Pencil, Trash2, Check, X } from 'lucide-react'



/* ================== типы пропсов ================== */

type HeaderCol = {
  key: string
  label: string
  width?: string
  tooltip?: { text: string; formula?: string | string[] }
}

type RowWithMetrics = {
  id: string
  sku: string
  price: number
  cost: number
  feePct: number
  logistics: number
  rev: number
  fee: number
  direct: number
  profit: number
  marginPct: number
}

type ComputedBlock = {
  rows: RowWithMetrics[]
  totals: { rev: number; fee: number; direct: number; profit: number }
  totalMarginPct: number
}

type DataTableProps = {
  headerColumns: HeaderCol[]
  SKU_COL_W: string
  computed: ComputedBlock

  editingId: string | null
  draftSku: string
  draftPrice: string
  draftCost: string
  draftFeePct: string
  draftLogistics: string

  setDraftSku: (v: string) => void
  setDraftPrice: (v: string) => void
  setDraftCost: (v: string) => void
  setDraftFeePct: (v: string) => void
  setDraftLogistics: (v: string) => void

  handleStartEdit: (r: RowWithMetrics) => void
  handleSaveEdit: () => void
  handleCancelEdit: () => void
  handleRemove: (id: string) => void

  totalMarginClass: string
}

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
  const TipContent = ({ col }: { col: HeaderCol }) => {
    const f = col.tooltip?.formula
    const lines = f ? (Array.isArray(f) ? f : String(f).split(/\r?\n/)) : []

    return (
      <div className="space-y-1">
        {lines.length > 0 && (
          <>
            <p className="font-semibold">Формула:</p>
            {lines.map((line, i) => (
              <p key={i} className={i > 0 ? 'text-gray-500' : ''}>
                {line}
              </p>
            ))}
          </>
        )}
        {col.tooltip?.text && <p className="text-gray-600">{col.tooltip.text}</p>}
      </div>
    )
  }

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
                      <Tooltip content={<TipContent col={col} />}>
                        <span className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-gray-600 bg-white hover:bg-gray-50">
                          i
                        </span>
                      </Tooltip>
                    )}
                  </span>
                </th>
              )
            }

            return (
              <th
                key={col.key}
                className={`px-4 py-3 font-semibold ${col.width ?? ''}`}
              >
                <span className="inline-flex items-center whitespace-nowrap gap-2 align-middle">
                  <span>{col.label}</span>
                  {col.tooltip && (
                    <Tooltip content={<TipContent col={col} />}>
                      <span className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-600 bg-white hover:bg-gray-50">
                        i
                      </span>
                    </Tooltip>
                  )}
                </span>
              </th>
            )
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
    <AnimatePresence initial={false}>
      {computed.rows.map((r) => {
        // ✅ безопасная проверка режима редактирования
        const isEditing =
          editingId != null && r.id != null && editingId === r.id

        return (
          <motion.tr
            key={r.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className={`transition-colors ${
              isEditing ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-sky-50/60'
            }`}
          >
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
                r.profit < 0
                  ? 'text-red-600'
                  : r.profit > 0
                  ? 'text-green-600'
                  : 'text-gray-800'
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
            {/* Действия */}
<td className="px-4 py-3 flex gap-2 items-center">
  {!isEditing ? (
    <>
      {/* Редактировать */}
      <motion.button
        onClick={() => handleStartEdit(r)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        className="group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs border border-indigo-300 text-indigo-700 hover:bg-indigo-50 transition-all"
      >
        <Pencil
          size={14}
          className="text-indigo-600 transition-transform group-hover:-rotate-12 group-hover:scale-110"
        />
        Редактировать
      </motion.button>

      {/* Удалить */}
      <motion.button
        onClick={() => handleRemove(r.id)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        className="group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
      >
        <Trash2
          size={14}
          className="text-gray-600 transition-transform group-hover:rotate-12 group-hover:scale-110"
        />
        Удалить
      </motion.button>

      {/* Убыток */}
      {r.profit < 0 && (
        <motion.span
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200"
        >
          <X size={12} />
          Убыток
        </motion.span>
      )}
    </>
  ) : (
    <>
      {/* Сохранить */}
      <motion.button
        onClick={handleSaveEdit}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        className="group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs border border-green-300 text-green-700 hover:bg-green-50 transition-all"
      >
        <Check
          size={14}
          className="text-green-600 transition-transform group-hover:rotate-12 group-hover:scale-110"
        />
        Сохранить
      </motion.button>

      {/* Отмена */}
      <motion.button
        onClick={handleCancelEdit}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        className="group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
      >
        <X
          size={14}
          className="text-gray-500 transition-transform group-hover:-rotate-12 group-hover:scale-110"
        />
        Отмена
      </motion.button>
    </>
  )}
</td>

          </motion.tr>
        )
      })}
    </AnimatePresence>
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
          <td
            className={`px-4 py-3 font-bold whitespace-nowrap ${totalMarginClass}`}
          >
            {fmt(computed.totalMarginPct)}
            {'\u00A0'}%
          </td>

          {/* Пустая под кнопки/выравнивание */}
          <td className="px-4 py-3" />
        </tr>
      </tfoot>
    </table>
  )
}
