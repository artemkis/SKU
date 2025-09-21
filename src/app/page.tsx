'use client'
// ↑ Next.js App Router: компонент рендерится на клиенте

import { useMemo, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/* =========================================================
   ХЕЛПЕРЫ (чистая логика, без UI)
   ========================================================= */

/** Безопасно парсим строку из инпута в число. */
const toNum = (v: string) => {
  if (!v) return 0
  const s = v.replace(/\s+/g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

// Фиксированная ширина первой (липкой) колонки SKU
const SKU_COL_W = 'w-[100px] min-w-[100px] max-w-[100px]';


/** Ограничение числа диапазоном [min, max]. */
const clamp = (x: number, min: number, max: number) =>
  Math.min(max, Math.max(min, x))

/** Формат простых чисел (по-умолчанию 2 знака). */
const fmt = (x: number, d = 2) =>
  x.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d })

/** Формат ₽ c неразрывным пробелом. */
const fmtRub = (x: number, d = 2) =>
  x.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: d, maximumFractionDigits: d })

/** Выручка с 1 шт с учётом скидки. */
const unitRevenue = (price: number, promoPct = 0) => price * (1 - promoPct / 100)
/** Комиссия в ₽. */
const unitFee = (price: number, feePct = 0, promoPct = 0) =>
  unitRevenue(price, promoPct) * (feePct / 100)

/** Генератор id для строк таблицы. */
const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`

/* =========================================================
   ТИП СТРОКИ ТАБЛИЦЫ
   ========================================================= */
type Row = {
  id: string
  sku: string
  price: number
  cost: number
  feePct: number
  logistics: number
}

/* =========================================================
   SVG-иконка "i" (устойчивее эмодзи, не прыгает по baseline)
   ========================================================= */
function InfoIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-10.5a1 1 0 110 2 1 1 0 010-2zM9 9.5a1 1 0 112 0v4a1 1 0 11-2 0v-4z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/* =========================================================
   Tooltip — всплывающая карточка (hover + focus)
   Добавлен props align: 'center' | 'left' | 'right'
   чтобы у первой (фиксированной) колонки поповер не «уезжал» за край.
   ========================================================= */


type TooltipAlign = 'center' | 'left' | 'right'

function Tooltip({
  text,
  formula,
  align = 'center',
}: { text: string; formula?: string; align?: TooltipAlign }) {
  const anchorRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  // Вычисляем позицию тултипа относительно окна (fixed),
  // чтобы не зависеть от overflow-скроллов вокруг.
  const compute = () => {
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const gap = 8 // отступ от иконки
    let left = r.left + r.width / 2
    if (align === 'left')  left = r.left
    if (align === 'right') left = r.right
    const top = r.bottom + gap
    setCoords({ top, left })
  }

  useEffect(() => {
    if (!open) return
    compute()
    const onScroll = () => compute()
    const onResize = () => compute()
    window.addEventListener('scroll', onScroll, true) // true — ловим в фазе захвата, включая внутри шторки
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align])

  // Само содержимое тултипа (в портале)
  const popover =
    open && coords
      ? createPortal(
          <div
            className={`
              z-[200] fixed
              max-w-[90vw] w-72
              rounded-lg border border-gray-200 bg-white shadow-lg p-3 text-sm leading-snug
            `}
            style={{
              top: coords.top,
              // выравнивание
              left:
                align === 'center'
                  ? coords.left
                  : align === 'left'
                  ? coords.left
                  : coords.left,
              transform:
                align === 'center'
                  ? 'translateX(-50%)'
                  : align === 'left'
                  ? 'translateX(0)'
                  : 'translateX(-100%)',
            }}
            role="tooltip"
          >
            {formula && (
              <>
                <p className="font-medium text-gray-900 mb-1">Формула:</p>
                <p className="text-gray-700 text-sm mb-2">
                  <code className="break-words">{formula}</code>
                </p>
              </>
            )}
            <p className="text-xs text-gray-600 break-words">{text}</p>
          </div>,
          document.body
        )
      : null

  return (
    <span className="relative inline-flex items-center align-middle">
      <button
        ref={anchorRef}
        type="button"
        aria-label="Показать подсказку"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center justify-center rounded
                   focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-1 focus:ring-offset-white"
      >
        <svg className="h-4 w-4 text-gray-400 hover:text-indigo-500 focus:text-indigo-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-10.5a1 1 0 110 2 1 1 0 010-2zM9 9.5a1 1 0 112 0v4a1 1 0 11-2 0v-4z" clipRule="evenodd" />
        </svg>
      </button>
      {popover}
    </span>
  )
}


/* =========================================================
   Описание колонок шапки (с единицами в label).
   NBSP = \u00A0, символ рубля = \u20BD.
   Рендерим через .map — без лишних текстовых узлов в <tr>.
   ========================================================= */
const headerColumns: Array<{
  key: string
  label: string
  width?: string
  tooltip?: { text: string; formula?: string }
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
  // последний столбец под кнопки — дорендерим вручную
]

/* =========================================================
   КОМПОНЕНТ СТРАНИЦЫ
   ========================================================= */
export default function Home() {
  /* ---------- форма ---------- */
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [cost, setCost] = useState('')
  const [feePct, setFeePct] = useState('')
  const [logistics, setLogistics] = useState('')

  /* ---------- данные таблицы и шторка ---------- */
  const [rows, setRows] = useState<Row[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)

  /* ---------- редактирование строки ---------- */
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftSku, setDraftSku] = useState('')
  const [draftPrice, setDraftPrice] = useState('')
  const [draftCost, setDraftCost] = useState('')
  const [draftFeePct, setDraftFeePct] = useState('')
  const [draftLogistics, setDraftLogistics] = useState('')

  const handleStartEdit = (r: Row) => {
    setEditingId(r.id)
    setDraftSku(r.sku)
    setDraftPrice(r.price.toString())
    setDraftCost(r.cost.toString())
    setDraftFeePct(r.feePct.toString())
    setDraftLogistics(r.logistics.toString())
  }
  const handleCancelEdit = () => {
    setEditingId(null)
    setDraftSku(''); setDraftPrice(''); setDraftCost(''); setDraftFeePct(''); setDraftLogistics('')
  }
  const handleSaveEdit = () => {
    if (!editingId) return
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
    )
    handleCancelEdit()
  }

  /* ---------- превью по текущим полям формы ---------- */
  const p = toNum(price)
  const c = toNum(cost)
  const f = clamp(toNum(feePct), 0, 100)
  const l = toNum(logistics)

  const isInitialForm = [price, cost, feePct, logistics].every(v => v.trim() === '')

  const revenuePreview = unitRevenue(p, 0)
  const profitPreview = p - c - unitFee(p, f, 0) - l
  const marginPreview = revenuePreview > 0 ? (profitPreview / revenuePreview) * 100 : 0

  const previewProfitClass =
    isInitialForm ? 'text-gray-900 font-semibold'
    : profitPreview < 0 ? 'text-red-600 font-semibold'
    : profitPreview > 0 ? 'text-green-600 font-semibold'
    : 'text-gray-900 font-semibold'

  const previewMarginClass =
    isInitialForm ? 'text-gray-900 font-semibold'
    : marginPreview < 0 ? 'text-red-600 font-semibold'
    : marginPreview < 20 ? 'text-yellow-600 font-semibold'
    : marginPreview > 0 ? 'text-green-600 font-semibold'
    : 'text-gray-900 font-semibold'

  /* ---------- добавление/удаление ---------- */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newRow: Row = {
      id: makeId(),
      sku: sku.trim() || `SKU-${rows.length + 1}`,
      price: p,
      cost: c,
      feePct: f,
      logistics: l,
    }
    setRows(prev => [newRow, ...prev])
    if (!sheetOpen) setSheetOpen(true)
    setSku(''); setPrice(''); setCost(''); setFeePct(''); setLogistics('')
  }
  const handleRemove = (id: string) => setRows(prev => prev.filter(r => r.id !== id))
  const handleClearAll = () => setRows([])

  /* ---------- пересчёт метрик + итоги ---------- */
  const computed = useMemo(() => {
    const withMetrics = rows.map(r => {
      const rev = unitRevenue(r.price, 0)
      const fee = unitFee(r.price, r.feePct, 0)
      const direct = r.cost + r.logistics
      const profit = rev - fee - direct
      const marginPct = rev > 0 ? (profit / rev) * 100 : 0
      return { ...r, rev, fee, direct, profit, marginPct }
    })

    const totals = withMetrics.reduce(
      (acc, r) => {
        acc.rev += r.rev
        acc.fee += r.fee
        acc.direct += r.direct
        acc.profit += r.profit
        return acc
      },
      { rev: 0, fee: 0, direct: 0, profit: 0 }
    )

    const totalMarginPct = totals.rev > 0 ? (totals.profit / totals.rev) * 100 : 0
    return { rows: withMetrics, totals, totalMarginPct }
  }, [rows])

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
  }
  const fields: Field[] = [
    { id: 'sku',       label: 'SKU (название товара)', type: 'text',   value: sku,       set: setSku },
    { id: 'price',     label: 'Цена продажи, ₽',       type: 'number', value: price,     set: setPrice },
    { id: 'cost',      label: 'Себестоимость, ₽',      type: 'number', value: cost,      set: setCost },
    { id: 'feePct',    label: 'Комиссия площадки, %',  type: 'number', value: feePct,    set: setFeePct, min: 0, max: 100 },
    { id: 'logistics', label: 'Логистика, ₽/шт',       type: 'number', value: logistics, set: setLogistics },
  ]

  /* =========================================================
     UI
     ========================================================= */
  return (
    <main className="flex min-h-screen items-start justify-center py-10 px-4 relative z-10">
      {/* ---------- карточка формы ---------- */}
      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        className="relative w-full max-w-md rounded-2xl border border-white/40
                   bg-white/60 backdrop-blur-md shadow-xl p-6 ring-1 ring-black/5 space-y-4"
      >
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight
                         bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-rose-500
                         bg-clip-text text-transparent text-center">
            Ввод данных товара
          </h1>
          <p className="text-center text-gray-500 text-sm italic">
            Введите данные, чтобы рассчитать прибыль и маржу
          </p>
        </div>

        {/* поля формы */}
        {fields.map(field => (
          <div className="relative" key={field.id}>
            <input
              id={field.id}
              type={field.type}
              value={field.value}
              min={field.min}
              max={field.max}
              onChange={e => field.set(e.target.value)}
              onWheel={e => (e.currentTarget as HTMLInputElement).blur()}
              inputMode={field.type === 'number' ? 'decimal' : undefined}
              step={field.type === 'number' ? '0.01' : undefined}
              data-filled={field.value ? 'true' : 'false'}
              className="peer w-full h-12 rounded-xl border border-gray-300 bg-white/85
                         px-3 pt-5 pb-2 shadow-sm outline-none
                         focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300
                         placeholder-transparent transition"
              required
            />
            <label
              htmlFor={field.id}
              className="pointer-events-none absolute left-3 px-1 rounded text-gray-500 transition-all
                         top-1/2 -translate-y-1/2 text-base bg-transparent
                         peer-focus:top-2.5 peer-focus:text-xs peer-focus:bg-white/85 peer-focus:text-indigo-600
                         peer-data-[filled=true]:top-2.5 peer-data-[filled=true]:text-xs peer-data-[filled=true]:bg-white/85"
            >
              {field.label}
            </label>
          </div>
        ))}

        {/* превью (нейтральное при пустой форме) */}
        <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/70 text-indigo-900 text-sm p-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-center grow">
              Прибыль с 1 шт: <span className={previewProfitClass}>{fmtRub(profitPreview)}</span>
            </div>
            <div className="text-center grow">
              Маржа: <span className={previewMarginClass}>{fmt(marginPreview)}{' '}</span>%
            </div>
          </div>
        </div>

        {/* кнопки */}
        <div className="mt-3 grid grid-cols-2 gap-3">
  {/* Кнопка "Добавить" */}
  <button
    type="submit"
    className="
      h-11 w-full rounded-xl font-semibold text-white
      bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600
      bg-[length:200%_200%] animate-[gradient-x_6s_ease_infinite]
      transition-transform duration-300 hover:scale-[1.02]
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2
    "
  >
    Добавить
  </button>

  {/* Кнопка "Открыть таблицу" */}
  <button
    type="button"
    onClick={() => setSheetOpen(true)}
    className="
      h-11 w-full rounded-xl font-semibold text-gray-700
      border border-gray-300 bg-white/90 hover:bg-gray-50
      transition
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2
    "
  >
    Открыть таблицу
  </button>
</div>


      </form>

      {/* ---------- затемняющий фон под шторкой ---------- */}
      {sheetOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-20 transition-opacity"
          onClick={() => setSheetOpen(false)}
        />
      )}

      {/* ---------- bottom sheet + таблица ---------- */}
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
                    align="left" /* чтобы поповер не уезжал за край */
                    text={col.tooltip.text}
                    formula={col.tooltip.formula}
                  />
                )}
              </span>
            </th>
          )
        }

        return (
          <th key={col.key} className={`px-4 py-3 font-semibold ${col.width ?? ''}`}>
            <span className="inline-flex items-center whitespace-nowrap gap-2 align-middle">
              <span>{col.label}</span>
              {col.tooltip && <Tooltip text={col.tooltip.text} formula={col.tooltip.formula} />}
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
      computed.rows.map((r) => {
        const isEditing = editingId === r.id
        return (
          <tr key={r.id} className="hover:bg-sky-50/60 transition">
            {/* SKU — фиксированная липкая колонка с жёсткой шириной */}
            <td
              className={`px-4 py-3 font-medium text-gray-800 sticky left-0 bg-white z-10
                         ${SKU_COL_W} border-r border-gray-200`}
            >
              {isEditing ? (
                <input
                  value={draftSku}
                  onChange={(e) => setDraftSku(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 outline-none
                             focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
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
                  className="w-32 rounded-lg border border-gray-300 bg-white px-2 py-1 outline-none
                             focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
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
                  className="w-32 rounded-lg border border-gray-300 bg-white px-2 py-1 outline-none
                             focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
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
                    className="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1 outline-none
                               focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
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
                  className="w-32 rounded-lg border border-gray-300 bg-white px-2 py-1 outline-none
                             focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300"
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
        )
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
      <td className="px-4 py-3 font-bold whitespace-nowrap">{fmtRub(computed.totals.rev)}</td>
      {/* Комиссия, ₽ */}
      <td className="px-4 py-3 font-bold whitespace-nowrap">{fmtRub(computed.totals.fee)}</td>
      {/* Прямые затраты, ₽ */}
      <td className="px-4 py-3 font-bold whitespace-nowrap">{fmtRub(computed.totals.direct)}</td>

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

            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
