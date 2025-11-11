'use client'

import Tooltip from './Tooltip'
import { fmtPct, fmtMoney } from '../../lib/helpers'
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
  SKU_COL_W: string // в page.tsx — адаптивная строка классов (см. примечание)
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
        {col.tooltip?.text && (
          <p className="text-gray-600">{col.tooltip.text}</p>
        )}
      </div>
    )
  }

  // видимые на xs ключевые колонки
  const CORE_KEYS = new Set(['sku', 'price', 'profit', 'margin'])

  // жёсткие ширины для xs, чтобы колонки не «боролись» за место
  const XS_W: Record<string, string> = {
    price: 'w-[22vw] max-w-[22vw]',
    profit: 'w-[19vw] max-w-[19vw]',
    margin: 'w-[19vw] max-w-[19vw]',
  }

  const thClass = (col: HeaderCol) =>
    [
      'px-2 sm:px-4 py-2 sm:py-3 font-semibold',
      CORE_KEYS.has(col.key) ? '' : 'hidden sm:table-cell',
      col.width ?? '',
    ]
      .filter(Boolean)
      .join(' ')

  const tdClass = (key: string, extra = '') =>
    [
      'px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap',
      CORE_KEYS.has(key) ? '' : 'hidden sm:table-cell',
      extra,
    ]
      .filter(Boolean)
      .join(' ')

  return (
    <table className="w-full min-w-0 table-fixed sm:table-auto text-[13px] sm:text-sm tabular-nums text-left">
      <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b ">
        <tr className="text-left text-gray-600">
          {headerColumns.map((col) => {
            if (col.key === 'sku') {
              // SKU — sticky только ≥ sm, на xs — ограничение ширины wrapper-ом
              return (
                <th
                  key={col.key}
                  className={[
                    'px-2 sm:px-4 py-2 sm:py-3 font-semibold bg-white sm:sticky sm:left-0 sm:z-20',
                    SKU_COL_W,
                  ].join(' ')}
                >
                  <div className="w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap sm:w-auto sm:max-w-none">
                    <span className="inline-flex items-center whitespace-nowrap gap-2 align-middle">
                      <span>Товар</span>
                      {col.tooltip && (
                        <Tooltip content={<TipContent col={col} />}> 
                          <span className="hidden sm:inline-flex shrink-0 h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-gray-600 bg-white hover:bg-gray-50">
                            i
                          </span>
                        </Tooltip>
                      )}
                    </span>
                  </div>
                </th>
              )
            }

            return (
              <th
                key={col.key}
                className={[
                  thClass(col),
                  XS_W[col.key] ?? '',
                  col.key !== 'sku' && CORE_KEYS.has(col.key) ? 'text-left' : '',
                ].join(' ')}
              >
                <span className="inline-flex items-center whitespace-nowrap gap-2 align-middle">
                  {/* короткий лейбл на xs, полный на ≥sm */}
                  <span className="sm:hidden">
                    {col.key === 'price' ? 'Цена' :
                     col.key === 'profit' ? 'Приб.' :
                     col.key === 'margin' ? 'Маржа' : col.label}
                  </span>
                  <span className="hidden sm:inline">{col.label}</span>

                  {col.tooltip && (
                    <Tooltip content={<TipContent col={col} />}>
                      <span className="hidden sm:inline-flex shrink-0 h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-600 bg-white hover:bg-gray-50">
                        i
                      </span>
                    </Tooltip>
                  )}
                </span>
              </th>
            )
          })}
          {/* колонка действий скрыта на xs */}
          <th className="px-4 py-3 font-semibold w-[14%] hidden sm:table-cell" />
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
              const isEditing =
                editingId != null && r.id != null && editingId === r.id

              const profitColorClass =
                r.profit < 0
                  ? 'text-red-600'
                  : r.profit > 0
                  ? 'text-green-600'
                  : 'text-gray-800'

              const marginColorClass =
                r.marginPct < 0
                  ? 'text-red-600'
                  : r.marginPct > 0
                  ? r.marginPct < 20
                    ? 'text-yellow-600'
                    : 'text-green-600'
                  : 'text-gray-800'

              return (
                <motion.tr
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className={`transition-colors ${
                    isEditing
                      ? 'bg-blue-50 ring-1 ring-blue-200'
                      : 'hover:bg-sky-50/60'
                  }`}
                >
                  {/* SKU — sticky ≥ sm, на xs ограничиваем ширину wrapper-ом */}
                  <td
                    className={[
                      'px-2 sm:px-4 py-2 sm:py-3 font-medium text-gray-800 bg-white border-r border-gray-200 sm:sticky sm:left-0 sm:z-10',
                      SKU_COL_W,
                    ].join(' ')}
                  >
                    <div className="w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap sm:w-auto sm:max-w-none">
                      {isEditing ? (
                        <input
                          value={draftSku}
                          onChange={(e) => setDraftSku(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
                        />
                      ) : (
                        <div className="truncate">{r.sku}</div>
                      )}
                    </div>
                  </td>

                  {/* Цена, ₽ (видна на xs) */}
                  <td
                    className={[
                      tdClass('price'),
                      XS_W.price,
                    ].join(' ')}
                  >
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
                      fmtMoney(r.price)
                    )}
                  </td>

                  {/* Себестоимость, ₽ (скрыта на xs) */}
                  <td className={tdClass('cost')}>
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
                      fmtMoney(r.cost)
                    )}
                  </td>

                  {/* Комиссия, % (скрыта на xs) */}
                  <td className={tdClass('feePct')}>
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
                        {fmtPct(r.feePct)}
                        {'\u00A0'}%
                      </>
                    )}
                  </td>

                  {/* Логистика, ₽ (скрыта на xs) */}
                  <td className={tdClass('logistics')}>
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
                      fmtMoney(r.logistics)
                    )}
                  </td>

                  {/* Выручка, ₽ (скрыта на xs) */}
                  <td className={tdClass('rev')}>{fmtMoney(r.rev)}</td>

                  {/* Комиссия, ₽ (скрыта на xs) */}
                  <td className={tdClass('fee')}>{fmtMoney(r.fee)}</td>

                  {/* Прямые затраты, ₽ (скрыта на xs) */}
                  <td className={tdClass('direct')}>{fmtMoney(r.direct)}</td>

                  {/* Прибыль, ₽ (видна на xs) */}
                  <td
                    className={[
                      tdClass('profit', `font-semibold ${profitColorClass}`),
                      XS_W.profit,
                    ].join(' ')}
                  >
                    {fmtMoney(r.profit)}
                  </td>

                  {/* Маржа, % (видна на xs) */}
                  <td
                    className={[
                      tdClass('margin', `font-semibold ${marginColorClass}`),
                      XS_W.margin,
                    ].join(' ')}
                  >
                    {fmtPct(r.marginPct)}{' '}%
                  </td>

                  {/* Действия — только ≥ sm */}
                  <td className="px-4 py-3 hidden sm:flex gap-2 items-center">
                    {!isEditing ? (
                      <>
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
          {/* пустая под SKU (липкая ≥ sm) */}
          <td
            className={[
              'px-2 sm:px-4 py-2 sm:py-3 bg-indigo-50/70 sm:sticky sm:left-0 sm:z-10 border-r border-indigo-100',
              SKU_COL_W,
            ].join(' ')}
          />

          {/* Цена — пусто (на xs не суммируем) */}
          <td className="px-2 sm:px-4 py-2 sm:py-3" />

          {/* скрытые на xs колонки итогов */}
          <td className="px-4 py-3 hidden sm:table-cell" />
          <td className="px-4 py-3 hidden sm:table-cell" />
          <td className="px-4 py-3 hidden sm:table-cell" />

          {/* Выручка (≥ sm) */}
          <td className="px-4 py-3 hidden sm:table-cell font-semibold">
            {fmtMoney(computed.totals.rev)}
          </td>

          {/* Комиссия ₽ (≥ sm) */}
          <td className="px-4 py-3 hidden sm:table-cell font-semibold">
            {fmtMoney(computed.totals.fee)}
          </td>

          {/* Прямые (≥ sm) */}
          <td className="px-4 py-3 hidden sm:table-cell font-semibold">
            {fmtMoney(computed.totals.direct)}
          </td>

          {/* Прибыль (xs видно) */}
          <td className="px-2 sm:px-4 py-2 sm:py-3 font-semibold">
            {fmtMoney(computed.totals.profit)}
          </td>

          {/* Маржа (xs видно) */}
          <td
            className={`px-2 sm:px-4 py-2 sm:py-3 font-semibold  ${totalMarginClass}`}
          >
            {fmtPct(computed.totalMarginPct)} %
          </td>

          <td className="px-4 py-3 hidden sm:table-cell" />
        </tr>
      </tfoot>
    </table>
  )
}
