'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  toNum,
  clamp,
  unitRevenue,
  unitFee,
  makeId,
} from '../../lib/helpers'
import type { Row, RowWithMetrics } from '../../lib/types'
import { loadRows, saveRows } from '../../lib/storage'

import FormCard from './components/FormCard'
import DataTable from './components/DataTable'

import {
  rowsWithMetricsToCSV,
  downloadCSV,
} from '../../lib/csv'

const SKU_COL_W = 'w-[150px] min-w-[150px] max-w-[150px]'

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
]

type ImportInfo =
  | { type: 'success'; msg: string }
  | { type: 'warn'; msg: string; errors: string[] }
  | { type: 'error'; msg: string; errors?: string[] }

export default function Home() {
  // форма
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [cost, setCost] = useState('')
  const [feePct, setFeePct] = useState('')
  const [logistics, setLogistics] = useState('')

  // данные/шторка
  const [rows, setRows] = useState<Row[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)

  // экспорт опция
  const [addUnits, setAddUnits] = useState(false)

  // уведомление об импорте
  const [importInfo, setImportInfo] = useState<ImportInfo | null>(null)

  // редактирование
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

  // превью
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

  // добавление/удаление
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

  // localStorage
  useEffect(() => {
    const saved = loadRows<Row>()
    if (saved.length) setRows(saved)
  }, [])
  useEffect(() => {
    saveRows(rows)
  }, [rows])

  // пересчёт
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
      : 'text-gray-800'

  // импорт: парсер + отчёт
  const parseNum = (s: string) => {
    const cleaned = s.replace(/\s+/g, '').replace(/[₽%]/g, '').replace(',', '.')
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : NaN
  }

  function parseBaseWithReport(text: string) {
    const lines = text.replace(/\r\n?/g, '\n').split('\n').filter(Boolean)
    if (lines.length === 0) {
      return { rows: [] as Row[], errors: ['Файл пустой.'] }
    }
    const sep = lines[0].includes(';') ? ';' : ','
    const startAt = /[A-Za-zА-Яа-яЁё]/.test(lines[0]) ? 1 : 0

    const parsedRows: Row[] = []
    const errors: string[] = []

    for (let i = startAt; i < lines.length; i++) {
      const raw = lines[i].trim()
      if (!raw) continue

      const cols = raw.split(sep).map(s => s.trim())
      if (cols.length < 5) {
        errors.push(`Строка ${i + 1}: нужно 5 столбцов — SKU, Цена, Себестоимость, Комиссия %, Логистика.`)
        continue
      }

      const [skuRaw, priceRaw, costRaw, feePctRaw, logisticsRaw] = cols
      const sku = skuRaw?.trim()
      const price = parseNum(priceRaw)
      const cost = parseNum(costRaw)
      const feePct = clamp(parseNum(feePctRaw), 0, 100)
      const logistics = parseNum(logisticsRaw)

      const badNums = [price, cost, feePct, logistics].some(v => Number.isNaN(v))

      if (!sku) {
        errors.push(`Строка ${i + 1}: пустой SKU.`)
        continue
      }
      if (badNums) {
        errors.push(`Строка ${i + 1}: проверьте числа (Цена/Себестоимость/Комиссия/Логистика).`)
        continue
      }

      parsedRows.push({
        id: makeId(),
        sku,
        price,
        cost,
        feePct,
        logistics,
      })
    }

    return { rows: parsedRows, errors }
  }

  function downloadImportErrors(errors: string[]) {
    const header = 'Проблема\n'
    const body = errors.map(e => e.replaceAll('\n', ' ')).join('\n')
    const csv = '\uFEFF' + header + body + '\n'
    downloadCSV(csv, 'import-errors.csv')
  }

  return (
    <main className="flex min-h-screen items-start justify-center py-10 px-4 relative z-10">
      <FormCard
        onSubmit={handleSubmit}
        fields={[
          { id: 'sku',       label: 'SKU (название товара)', type: 'text',   value: sku,       set: setSku },
          { id: 'price',     label: 'Цена продажи, ₽',       type: 'number', value: price,     set: setPrice },
          { id: 'cost',      label: 'Себестоимость, ₽',      type: 'number', value: cost,      set: setCost },
          { id: 'feePct',    label: 'Комиссия площадки, %',  type: 'number', value: feePct,    set: setFeePct, min: 0, max: 100 },
          { id: 'logistics', label: 'Логистика, ₽/шт',       type: 'number', value: logistics, set: setLogistics },
        ]}
        previewProfitClass={previewProfitClass}
        profitPreview={profitPreview}
        previewMarginClass={previewMarginClass}
        marginPreview={marginPreview}
        onOpenTable={() => setSheetOpen(true)}
      />

      {sheetOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-20 transition-opacity"
          onClick={() => setSheetOpen(false)}
        />
      )}

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

                {/* Импорт + тултип сверху + шаблон */}
                <div className="relative group inline-flex items-center gap-2">
                  <input
                    id="csv-file"
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={async (e) => {
                      const inputEl = e.currentTarget as HTMLInputElement; // Сохранили ссылку ДО await
                      const file = inputEl.files?.[0]
                      if (!file) return

                      try {
                        const text = await file.text()
                        const { rows: parsed, errors } = parseBaseWithReport(text)

                        if (parsed.length === 0) {
                          setImportInfo({
                            type: 'error',
                            msg: 'Ничего не импортировано. Проверьте формат файла.',
                            errors,
                          })
                        } else {
                          setRows(prev => [...parsed, ...prev])
                          if (errors.length > 0) {
                            setImportInfo({
                              type: 'warn',
                              msg: `Импортировано: ${parsed.length}, пропущено: ${errors.length}`,
                              errors,
                            })
                          } else {
                            setImportInfo({
                              type: 'success',
                              msg: `Импортировано: ${parsed.length}.`,
                            })
                          }
                          if (!sheetOpen) setSheetOpen(true)
                        }
                      } catch {
                        setImportInfo({
                          type: 'error',
                          msg: 'Не удалось прочитать файл. Попробуйте снова.',
                        })
                      } finally {
                        // Чистим именно сохранённый input, а не e.currentTarget (который уже может быть null)
                        inputEl.value = ''
                      }
                    }}
                  />

                  <button
                    onClick={() => document.getElementById('csv-file')?.click()}
                    className="px-4 py-2 rounded-xl border border-emerald-300 text-emerald-700 bg-white/90 hover:bg-emerald-50 transition"
                  >
                    Импорт CSV
                  </button>

                  <button
                    type="button"
                    className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 focus:outline-none relative"
                  >
                    i
                    <div
                      className="absolute bottom-full mb-2 right-0 z-50 hidden group-hover:block w-[360px]
                                 rounded-lg border border-gray-200 bg-white shadow-xl p-3 text-xs text-gray-700"
                    >
                      <p className="font-semibold mb-1">Как импортировать</p>
                      <div className="space-y-1">
                        <p>
                          Для импорта используйте только поля: <b>SKU, Цена, Себестоимость, Комиссия %, Логистика</b>.<br />
                          Остальные показатели программа рассчитает автоматически.
                        </p>
                        <p className="mt-2">📌 Поддерживаются такие варианты:</p>
                        <p>– Разделители: <code>;</code> или <code>,</code> (пример: <code>SKU;100;50;10;20</code>)</p>
                        <p>– Цены: <code>100</code> или <code>100,50 ₽</code></p>
                        <p>– Комиссия: <code>10</code> или <code>10 %</code></p>
                        <p>– Логистика: <code>20</code> или <code>20 ₽</code></p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      const tpl =
                        '\uFEFFSKU;Цена;Себестоимость;Комиссия %;Логистика\n' +
                        'пример;100;50;10;20\n'
                      downloadCSV(tpl, 'sku-template.csv')
                    }}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 bg-white/90 hover:bg-gray-50 transition"
                  >
                    Шаблон CSV
                  </button>
                </div>

                {/* Бейдж результата импорта */}
                {importInfo && (
                  <div
                    className={[
                      'ml-2 px-3 py-1.5 rounded-lg text-sm shadow-sm border',
                      importInfo.type === 'success' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      importInfo.type === 'warn' && 'bg-amber-50 text-amber-800 border-amber-200',
                      importInfo.type === 'error' && 'bg-rose-50 text-rose-800 border-rose-200',
                    ].join(' ')}
                  >
                    <span>{importInfo.msg}</span>
                    {'errors' in importInfo && importInfo.errors && importInfo.errors.length > 0 && (
                      <>
                        {' '}
                        <button
                          onClick={() => downloadImportErrors(importInfo.errors!)}
                          className="underline decoration-dotted hover:no-underline"
                        >
                          Отчёт
                        </button>
                      </>
                    )}
                    {' '}
                    <button
                      onClick={() => setImportInfo(null)}
                      className="ml-2 opacity-70 hover:opacity-100"
                      title="Скрыть"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* чекбокс единиц + экспорт */}
                <label className="flex items-center gap-2 text-sm text-gray-700 ml-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={addUnits}
                    onChange={(e) => setAddUnits(e.target.checked)}
                  />
                  Добавить единицы измерения
                </label>

                {rows.length > 0 && (
                  <button
                    onClick={() => {
                      const csv = rowsWithMetricsToCSV(
                        computed.rows as RowWithMetrics[],
                        addUnits
                      )
                      const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
                      downloadCSV(csv, `sku-profit-${stamp}.csv`)
                    }}
                    className="px-4 py-2 rounded-xl border border-indigo-300 text-indigo-700 bg-white/90 hover:bg-indigo-50 transition"
                  >
                    Экспорт CSV
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
  )
}
