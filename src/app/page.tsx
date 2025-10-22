'use client'

import { useMemo, useState, useEffect } from 'react'
import { toNum, clamp, unitRevenue, unitFee, makeId } from '../lib/helpers'
import type { Row, RowWithMetrics } from '../lib/types'
import { loadRows, saveRows } from '../lib/storage'
import FormCard from './components/FormCard'
import DataTable from './components/DataTable'
import { rowsWithMetricsToCSV, downloadCSV } from '../lib/csv'
import {
  fetchRowsAction,
  upsertRowAction,
  deleteRowAction,
  clearAllRowsAction,
} from '../app/actions/rows'
import { supabase } from '../lib/supabase/client'
import Link from 'next/link'
import { LogoutButton } from './components/LogoutButton'
import * as XLSX from 'xlsx'


const SKU_COL_W = 'w-[150px] min-w-[150px] max-w-[150px]'

/** Тип строки из БД (fee в рублях/процентах — как у тебя в таблице) */
type DbRow = {
  id: string
  sku: string
  price: number
  cost: number
  fee: number // ← в БД поле называется fee
  logistics: number
}

/** Конвертеры UI ↔ DB */
const dbToUi = (r: DbRow): Row => ({
  id: r.id,
  sku: r.sku,
  price: r.price,
  cost: r.cost,
  feePct: r.fee, // ← fee -> feePct
  logistics: r.logistics,
})

const uiToDb = (r: Row) => ({
  id: r.id,
  sku: r.sku,
  price: r.price,
  cost: r.cost,
  fee: r.feePct, // ← feePct -> fee
  logistics: r.logistics,
})

const headerColumns: Array<{
  key: string
  label: string
  width?: string
  tooltip?: { text: string; formula?: string | string[] }
}> = [
    {
      key: 'sku',
      label: 'SKU',
      width: 'w-[12%]',
      tooltip: { text: 'Уникальный идентификатор товара (артикул).' },
    },
    {
      key: 'price',
      label: 'Цена\u00A0\u20BD',
      width: 'w-[12%]',
      tooltip: { text: 'Цена продажи за единицу товара, ₽.' },
    },
    {
      key: 'cost',
      label: 'Себестоимость\u00A0\u20BD',
      width: 'w-[12%]',
      tooltip: { text: 'Сколько стоит произвести товар, ₽.' },
    },
    {
      key: 'feePct',
      label: 'Комиссия\u00A0%',
      width: 'w-[10%]',
      tooltip: {
        text: 'Процент комиссии маркетплейса, %.',
        formula: 'Комиссия ₽ = Цена ₽ × (Комиссия % / 100)',
      },
    },
    {
      key: 'logistics',
      label: 'Логистика\u00A0\u20BD',
      width: 'w-[12%]',
      tooltip: { text: 'Затраты на доставку одной единицы товара, ₽.' },
    },
    {
      key: 'rev',
      label: 'Выручка\u00A0\u20BD',
      width: 'w-[12%]',
      tooltip: {
        text: 'Доход от продажи 1 шт без учёта комиссии, ₽.',
        formula: [
          'Выручка ₽ = Цена ₽ × (1 - Скидка %)',
          '(Скидка % автоматически переводится в долю: 15 % = 0.15)',
        ],
      },
    },
    {
      key: 'fee',
      label: 'Комиссия\u00A0\u20BD',
      width: 'w-[12%]',
      tooltip: {
        text: 'Сумма комиссии в рублях.',
        formula: 'Комиссия ₽ = Выручка ₽ × (Комиссия % / 100 %)',
      },
    },
    {
      key: 'direct',
      label: 'Прямые затраты\u00A0\u20BD',
      width: 'w-[12%]',
      tooltip: {
        text: 'Себестоимость ₽ + Логистика, ₽.',
        formula: 'Прямые затраты ₽ = Себестоимость ₽ + Логистика ₽',
      },
    },
    {
      key: 'profit',
      label: 'Прибыль/шт\u00A0\u20BD',
      width: 'w-[12%]',
      tooltip: {
        text: 'Доход с учётом всех затрат, ₽.',
        formula: 'Прибыль ₽ = Выручка ₽ - Комиссия ₽ - Прямые затраты ₽',
      },
    },
    {
      key: 'margin',
      label: 'Маржа\u00A0%',
      width: 'w-[10%]',
      tooltip: {
        text: 'Отношение прибыли к выручке, %.',
        formula: 'Маржа % = (Прибыль ₽ / Выручка ₽) × 100%',
      },
    },
  ]

type ImportInfo =
  | { type: 'success'; msg: string }
  | { type: 'warn'; msg: string; errors: string[] }
  | { type: 'error'; msg: string; errors?: string[] }

export default function Home() {
  /** Поля формы */
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [cost, setCost] = useState('')
  const [feePct, setFeePct] = useState('')
  const [logistics, setLogistics] = useState('')
  const [authed, setAuthed] = useState(false)

  /** Данные/шторка */
  const [rows, setRows] = useState<Row[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)

  /** Экспорт опция */
  const [addUnits, setAddUnits] = useState(false)

  /** Уведомление об импорте */
  const [importInfo, setImportInfo] = useState<ImportInfo | null>(null)

  /** Редактирование */
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftSku, setDraftSku] = useState('')
  const [draftPrice, setDraftPrice] = useState('')
  const [draftCost, setDraftCost] = useState('')
  const [draftFeePct, setDraftFeePct] = useState('')
  const [draftLogistics, setDraftLogistics] = useState('')

  /** Страховка — если редактируемая строка пропала */
  useEffect(() => {
    if (editingId && !rows.some((r) => r.id === editingId)) {
      setEditingId(null)
    }
  }, [rows, editingId])

  function exportXLSX(rows: RowWithMetrics[], addUnits: boolean) {
    // Заголовки
    const headers = [
      'SKU',
      `Цена${addUnits ? ' ₽' : ''}`,
      `Себестоимость${addUnits ? ' ₽' : ''}`,
      `Комиссия${addUnits ? ' %' : ''}`,
      `Логистика${addUnits ? ' ₽' : ''}`,
      `Выручка${addUnits ? ' ₽' : ''}`,
      `Комиссия${addUnits ? ' ₽' : ''}`,
      `Прямые затраты${addUnits ? ' ₽' : ''}`,
      `Прибыль/шт${addUnits ? ' ₽' : ''}`,
      `Маржа${addUnits ? ' %' : ''}`,
    ]


    // Данные
    const data = rows.map((r) => ([
      r.sku,
      r.price,
      r.cost,
      r.feePct,
      r.logistics,
      r.rev,
      r.fee,
      r.direct,
      r.profit,
      Number(r.marginPct.toFixed(2)),
    ]))

    // Собираем таблицу (AOA -> sheet)
    const aoa = [headers, ...data]
    const ws = XLSX.utils.aoa_to_sheet(aoa)

    // Немного ширины колонок для читаемости
    ws['!cols'] = [
      { wch: 20 }, // SKU
      { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
      { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 12 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'SKUs')

    const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
    XLSX.writeFile(wb, `sku-profit-${stamp}.xlsx`)
  }

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
    setDraftSku('')
    setDraftPrice('')
    setDraftCost('')
    setDraftFeePct('')
    setDraftLogistics('')
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    const edited: Row = {
      id: editingId,
      sku: draftSku.trim() || '',
      price: toNum(draftPrice),
      cost: toNum(draftCost),
      feePct: clamp(toNum(draftFeePct), 0, 100),
      logistics: toNum(draftLogistics),
    }

    if (authed) {
      await upsertRowAction(uiToDb(edited))
      const { rows: dbRows } = await fetchRowsAction()
      setRows((dbRows as DbRow[]).map(dbToUi))
    } else {
      setRows((prev) => prev.map((r) => (r.id === editingId ? edited : r)))
    }
    handleCancelEdit()
  }

  /** Превью метрик */
  const p = toNum(price)
  const c = toNum(cost)
  const f = clamp(toNum(feePct), 0, 100)
  const l = toNum(logistics)

  const isInitialForm = [price, cost, feePct, logistics].every((v) => v.trim() === '')

  const revenuePreview = unitRevenue(p, 0)
  const profitPreview = p - c - unitFee(p, f, 0) - l
  const marginPreview = revenuePreview > 0 ? (profitPreview / revenuePreview) * 100 : 0

  const previewProfitClass = isInitialForm
    ? 'text-gray-900 font-semibold'
    : profitPreview < 0
      ? 'text-red-600 font-semibold'
      : profitPreview > 0
        ? 'text-green-600 font-semibold'
        : 'text-gray-900 font-semibold'

  const previewMarginClass = isInitialForm
    ? 'text-gray-900 font-semibold'
    : marginPreview < 0
      ? 'text-red-600 font-semibold'
      : marginPreview < 20
        ? 'text-yellow-600 font-semibold'
        : marginPreview > 0
          ? 'text-green-600 font-semibold'
          : 'text-gray-900 font-semibold'

  /** Добавление/удаление */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newRow: Row = {
      id: makeId(),
      sku: sku.trim() || `SKU-${rows.length + 1}`,
      price: p,
      cost: c,
      feePct: f, // ← как и раньше в UI
      logistics: l,
    }

    if (authed) {
      await upsertRowAction(uiToDb(newRow)) // ← маппим при отправке в БД
      const { rows: dbRows } = await fetchRowsAction()
      setRows((dbRows as DbRow[]).map(dbToUi)) // ← маппим обратно
    } else {
      setRows((prev) => [newRow, ...prev])
    }

    if (!sheetOpen) setSheetOpen(true)
    setSku('')
    setPrice('')
    setCost('')
    setFeePct('')
    setLogistics('')
  }

  const handleRemove = async (id: string) => {
    if (authed) {
      await deleteRowAction(id)
      const { rows: dbRows } = await fetchRowsAction()
      setRows((dbRows as DbRow[]).map(dbToUi))
    } else {
      setRows((prev) => prev.filter((r) => r.id !== id))
    }
    if (editingId === id) handleCancelEdit()
  }

  const handleClearAll = async () => {
    if (authed) {
      await clearAllRowsAction()
    }
    setRows([])
    setImportInfo(null)
    handleCancelEdit()
  }

  /** --- helper: логин/синхронизация локальных/серверных строк --- */
  // --- helper: логин/синхронизация локальных/серверных строк ---
  const hydrateRowsOnLogin = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('getSession error:', error)
    }

    const isLoggedIn = !!session?.user
    setAuthed(isLoggedIn)

    if (!isLoggedIn) {
      // гость → показываем локальные
      const saved = loadRows<Row>()
      setRows(saved)
      return
    }

    // залогинен → тянем сервер
    const { rows: dbRows } = await fetchRowsAction()
    const serverRows = ((dbRows as DbRow[]) ?? []).map(dbToUi)

    if (serverRows.length > 0) {
      setRows(serverRows)
      return
    }

    // если на сервере пусто — поднимаем локальные
    const localRows = loadRows<Row>()
    if (localRows.length > 0) {
      await Promise.all(localRows.map((r) => upsertRowAction(uiToDb(r))))
      const { rows: after } = await fetchRowsAction()
      setRows(((after as DbRow[]) ?? []).map(dbToUi))
    } else {
      setRows([])
    }
  }


  /** localStorage — начальная загрузка */
  useEffect(() => {
    const saved = loadRows<Row>()
    if (saved.length) setRows(saved)
  }, [])

  /** localStorage — сохраняем только в гостевом режиме */
  useEffect(() => {
    if (!authed) saveRows(rows)
  }, [rows, authed])

  /** Убираем импорт-уведомление через 6 секунд */
  useEffect(() => {
    if (!importInfo) return
    const t = setTimeout(() => setImportInfo(null), 6000)
    return () => clearTimeout(t)
  }, [importInfo])

  /** Инициализация: подтянуть данные в зависимости от авторизации */
  useEffect(() => {
    hydrateRowsOnLogin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Реакция на смену сессии: пересинхронизировать данные */
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isLoggedIn = !!session?.user
      setAuthed(isLoggedIn)

      if (isLoggedIn) {
        // вошли → сразу тянем сервер
        const { rows: dbRows } = await fetchRowsAction()
        setRows(((dbRows as DbRow[]) ?? []).map(dbToUi))
      } else {
        // вышли → локальные
        setRows(loadRows<Row>())
      }
    })

    return () => subscription.unsubscribe()
  }, [])



  /** Пересчёт метрик */
  const computed = useMemo(() => {
    const withMetrics = rows.map((r) => {
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

  /** Импорт: парсер + отчёт */
  const parseNum = (s: string) => {
    const cleaned = s.replace(/\s+/g, '').replace(/[₽%]/g, '').replace(',', '.')
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : NaN
  }

  const DISPLAY: Record<string, string> = {
    sku: 'SKU',
    price: 'Цена',
    cost: 'Себестоимость',
    feePct: 'Комиссия %',
    logistics: 'Логистика',
  }

  function detectSep(sample: string): string {
    const counts: Array<[string, number]> = [
      [';', (sample.match(/;/g) || []).length],
      [',', (sample.match(/,/g) || []).length],
      ['\t', (sample.match(/\t/g) || []).length],
    ]
    counts.sort((a, b) => b[1] - a[1])
    return counts[0][1] > 0 ? counts[0][0] : ';'
  }

  // маппим текст заголовка к каноническому ключу
  function headerToKey(h: string): 'sku' | 'price' | 'cost' | 'feePct' | 'logistics' | null {
    const s = h.toLowerCase().replace(/[₽\u20bd]/g, '').replace(/\s+/g, ' ').trim()

    if (/(^|[^a-zа-я])sku([^a-zа-я]|$)|артикул|наимен|назв|товар|код|^id$/.test(s)) return 'sku'
    if (/^price$|цена|розниц|продаж/.test(s)) return 'price'
    if (/себестоим|закуп|^cost$/.test(s)) return 'cost'
    if (/комисси|fee|процент/.test(s)) return 'feePct'
    if (/логист|достав|фулф|fulfill/.test(s)) return 'logistics'
    return null
  }

  // --- parser with header validation ---
  function parseBaseWithReport(text: string) {
    const lines = text
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .filter((l) => l.trim().length > 0)
    if (lines.length === 0) {
      return { rows: [] as Row[], errors: ['Файл пустой.'] }
    }

    const sep = detectSep(lines[0])
    const first = lines[0].split(sep).map((s) => s.trim())

    // Пытаемся распознать заголовок по совпадениям с известными колонками
    const guessedKeys = first.map(headerToKey)
    const matchedCount = guessedKeys.filter(Boolean).length
    const hasHeader = matchedCount >= 3 // «похоже на заголовок»

    // Если заголовок «похож», требуем наличие всех обязательных колонок
    let startAt = 0
    let idx: Record<'sku' | 'price' | 'cost' | 'feePct' | 'logistics', number> = {
      sku: 0,
      price: 1,
      cost: 2,
      feePct: 3,
      logistics: 4,
    }

    if (hasHeader) {
      startAt = 1
      const byKey: Partial<typeof idx> = {}
      guessedKeys.forEach((k, i) => {
        if (k) (byKey as Record<keyof typeof idx, number>)[k as keyof typeof idx] = i
      })

      const missing = (['sku', 'price', 'cost', 'feePct', 'logistics'] as const).filter(
        (k) => byKey[k] === undefined
      )

      if (missing.length > 0) {
        const need = ['sku', 'price', 'cost', 'feePct', 'logistics']
          .map((k) => DISPLAY[k as keyof typeof DISPLAY])
          .join(`${sep}`)
        return {
          rows: [],
          errors: [
            `Заголовок не содержит обязательные столбцы: ${missing
              .map((k) => DISPLAY[k])
              .join(', ')}.`,
            `Ожидается: ${need}`,
          ],
        }
      }

      idx = {
        sku: byKey.sku!,
        price: byKey.price!,
        cost: byKey.cost!,
        feePct: byKey.feePct!,
        logistics: byKey.logistics!,
      }
    }

    const parsedRows: Row[] = []
    const errors: string[] = []

    for (let i = startAt; i < lines.length; i++) {
      const raw = lines[i].trim()
      if (!raw) continue

      const cols = raw.split(sep).map((s) => s.trim())

      // Проверка минимального количества столбцов в строке данных
      if (cols.length < 5) {
        errors.push(
          `Строка ${i + 1}: ожидается 5 столбцов, найдено ${cols.length}. ` +
          `Формат: ${DISPLAY.sku}${sep}${DISPLAY.price}${sep}${DISPLAY.cost}${sep}${DISPLAY.feePct}${sep}${DISPLAY.logistics}`
        )
        continue
      }

      // Берём по индексам (из заголовка или позиционно)
      const skuRaw = cols[idx.sku]
      const priceRaw = cols[idx.price]
      const costRaw = cols[idx.cost]
      const feePctRaw = cols[idx.feePct]
      const logisticsRaw = cols[idx.logistics]

      const sku = skuRaw?.trim()
      const price = parseNum(priceRaw)
      const cost = parseNum(costRaw)
      const feePct = clamp(parseNum(feePctRaw), 0, 100)
      const logistics = parseNum(logisticsRaw)

      if (!sku) {
        errors.push(`Строка ${i + 1}: пустой SKU.`)
        continue
      }

      const badNums = [price, cost, feePct, logistics].some((v) => Number.isNaN(v))
      if (badNums) {
        errors.push(
          `Строка ${i + 1}: проверьте числа (Цена/Себестоимость/Комиссия/Логистика).`
        )
        continue
      }

      parsedRows.push({ id: makeId(), sku, price, cost, feePct, logistics })
    }

    return { rows: parsedRows, errors }
  }

  function downloadImportErrors(errors: string[]) {
    const header = 'Проблема\n'
    const body = errors.map((e) => e.replaceAll('\n', ' ')).join('\n')
    const csv = '\uFEFF' + header + body + '\n'
    downloadCSV(csv, 'import-errors.csv')
  }

  return (
    <main className="flex min-h-screen items-start justify-center py-10 px-4 relative z-10">
      <header className="flex items-center justify-between mb-4 relative z-40">
        <h1 className="text-2xl font-semibold">Калькулятор прибыли</h1>
        {authed ? (
          <LogoutButton
            onAfterSignOut={async () => {
              await hydrateRowsOnLogin() // ← покажем локальные строки после выхода
              setImportInfo(null)
              handleCancelEdit()
            }}
          />
        ) : (
          <Link href="/login" className="underline">
            Войти
          </Link>
        )}
      </header>

      <FormCard
        onSubmit={handleSubmit}
        fields={[
          {
            id: 'sku',
            label: 'SKU (название товара)',
            type: 'text',
            value: sku,
            set: setSku,
          },
          {
            id: 'price',
            label: 'Цена продажи, ₽',
            type: 'number',
            value: price,
            set: setPrice,
          },
          {
            id: 'cost',
            label: 'Себестоимость, ₽',
            type: 'number',
            value: cost,
            set: setCost,
          },
          {
            id: 'feePct',
            label: 'Комиссия площадки, %',
            type: 'number',
            value: feePct,
            set: setFeePct,
            min: 0,
            max: 100,
          },
          {
            id: 'logistics',
            label: 'Логистика, ₽/шт',
            type: 'number',
            value: logistics,
            set: setLogistics,
          },
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
          onClick={() => {
            setSheetOpen(false)
            handleCancelEdit()
          }}
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
                Всего позиций:&nbsp;
                <span className="font-semibold">{rows.length}</span>
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
                      const inputEl = e.currentTarget as HTMLInputElement // Сохранили ссылку ДО await
                      const file = inputEl.files?.[0]
                      if (!file) return

                      try {
                        const text = await file.text()
                        const { rows: parsed, errors } = parseBaseWithReport(text)

                        if (parsed.length === 0) {
                          setImportInfo({
                            type: 'error',
                            msg: 'Проверьте правильность данных.',
                            errors,
                          })
                        } else {
                          setRows((prev) => [...parsed, ...prev])
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
                          Для импорта используйте только поля:&nbsp;
                          <br />
                          <b>SKU, Цена, Себестоимость, Комиссия %, Логистика</b>.
                          <br />
                          Остальные показатели программа рассчитает автоматически.
                        </p>
                        <p className="mt-2">📌 Поддерживаются такие варианты:</p>
                        <p>
                          – Разделители: <code>;</code> или <code>,</code>&nbsp;(пример:{' '}
                          <code>SKU;100;50;10;20</code>)
                        </p>
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

                {/* чекбокс единиц + экспорт */}
                {
                  rows.length > 0 && <label className="flex items-center gap-2 text-sm text-gray-700 ml-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={addUnits}
                      onChange={(e) => setAddUnits(e.target.checked)}
                    />
                    с ед. изм.
                  </label>
                }

                {rows.length > 0 && (
                  <>
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
                    <button
                      onClick={() => exportXLSX(computed.rows as RowWithMetrics[], addUnits)}
                      className="px-4 py-2 rounded-xl border border-indigo-300 text-indigo-700 bg-white/90 hover:bg-indigo-50 transition"
                    >
                      Экспорт XLSX
                    </button>
                  </>

                )}

                <button
                  onClick={() => {
                    setSheetOpen(false)
                    setImportInfo(null)
                    handleCancelEdit()
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-800 text-white hover:bg-gray-700 transition"
                >
                  Закрыть
                </button>
              </div>
            </div>

            {importInfo && (
              <div
                className={[
                  'absolute top-3 right-3 z-50 max-w-[420px]',
                  'px-3 py-2 rounded-lg text-sm shadow-lg border',
                  importInfo.type === 'success' &&
                  'bg-emerald-50 text-emerald-800 border-emerald-200',
                  importInfo.type === 'warn' && 'bg-amber-50 text-amber-800 border-amber-200',
                  importInfo.type === 'error' && 'bg-rose-50 text-rose-800 border-rose-200',
                ].join(' ')}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <span className="font-medium">
                      {importInfo.type === 'success'
                        ? 'Готово'
                        : importInfo.type === 'warn'
                          ? 'Частично'
                          : 'Ошибка'}
                    </span>
                    <span className="ml-2">{importInfo.msg}</span>

                    {(importInfo.type === 'warn' || importInfo.type === 'error') &&
                      importInfo.errors &&
                      importInfo.errors.length > 0 && (
                        <button
                          onClick={() => downloadImportErrors(importInfo.errors!)}
                          className="ml-2 underline decoration-dotted hover:no-underline"
                        >
                          Отчёт
                        </button>
                      )}
                  </div>

                  <button
                    onClick={() => setImportInfo(null)}
                    className="ml-2 shrink-0 rounded-md px-2 py-0.5 hover:bg-black/5"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

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
