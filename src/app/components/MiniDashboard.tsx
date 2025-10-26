'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import { fmt, fmtRub } from '../../lib/helpers'

type ProfitBySkuItem = { sku: string; profit: number }
type MarginPoint = { ts: number; margin: number }

type Props = {
  profitBySku: ProfitBySkuItem[]
  marginSeries: MarginPoint[]
  onClearMargin?: () => void
}

const MiniDashboard: React.FC<Props> = ({
  profitBySku,
  marginSeries,
  onClearMargin,
}) => {
  // 1) guard от гидрации — но БЕЗ раннего return до хуков ниже
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // 2) форматтеры и хелперы (обычные функции, не хуки)
  const rubTick = (v: number) => fmtRub(v)
  const pctTick = (v: number) => `${fmt(v)}%`
  const shortSku = (s: string) => (s.length > 12 ? s.slice(0, 11) + '…' : s)

  // 3) useMemo — ВСЕГДА вызываются (безусловно), чтобы не ломать порядок хуков
  const dataSku = useMemo<ProfitBySkuItem[]>(
    () =>
      Array.isArray(profitBySku)
        ? profitBySku.map((d) => ({
            sku: d.sku,
            profit: Number(d.profit ?? 0),
          }))
        : [],
    [profitBySku]
  )

  const dataMargin = useMemo(
    () =>
      Array.isArray(marginSeries)
        ? marginSeries.map((p) => ({
            time: new Date(p.ts).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            margin: Number(p.margin ?? 0),
          }))
        : [],
    [marginSeries]
  )

  // 4) Если ещё не смонтировано — рисуем «пустую» разметку того же размера (без графиков),
  //    чтобы не было SSR-мисматча и порядок хуков не менялся.
  if (!mounted) {
    return (
      <div className="px-4 pb-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex-1 min-w-[300px] max-w-[600px] bg-white/90 border border-gray-200 rounded-xl shadow p-4 h-[260px]" />
          <div className="flex-1 min-w-[300px] max-w-[600px] bg-white/90 border border-gray-200 rounded-xl shadow p-4 h-[260px]" />
        </div>
      </div>
    )
  }

  // 5) Нормальный рендер с графиками
  return (
    <div className="px-4 pb-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* === Прибыль по SKU === */}
        <div className="flex-1 min-w-[300px] max-w-[600px] bg-white/90 border border-gray-200 rounded-xl shadow p-4">
          <h3 className="text-sm font-semibold mb-1">Прибыль по SKU</h3>
          <p className="text-xs text-gray-500 mb-2">
            Суммарная прибыль/шт по текущим данным
          </p>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataSku}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sku" tickFormatter={shortSku} />
                <YAxis tickFormatter={rubTick} />
                <RTooltip />
                <Legend />
                <Bar
                  dataKey="profit"
                  name="Прибыль/шт"
                  fill="#2563eb" // ← фирменный цвет
                  radius={[6, 6, 0, 0]} // скругленные углы
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* === Общая маржа во времени === */}
        <div className="flex-1 min-w-[300px] max-w-[600px] bg-white/90 border border-gray-200 rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold">Общая маржа во времени</h3>
            {onClearMargin && dataMargin.length > 0 && (
              <button
                onClick={onClearMargin}
                className="text-xs text-indigo-600 hover:underline"
              >
                Очистить
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-2">
            Снапшоты маржи портфеля при изменениях
          </p>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dataMargin}
                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis tickFormatter={pctTick} />
                <RTooltip
                  formatter={(value: any, name) => [
                    `${fmt(Number(value))}%`,
                    name === 'margin' ? 'Маржа, %' : name,
                  ]}
                  labelFormatter={(label) => `Время: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="margin"
                  name="Маржа, %"
                  strokeWidth={2}
                  dot={dataMargin.length <= 1} // видимая точка, если 0/1 измерение
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MiniDashboard
