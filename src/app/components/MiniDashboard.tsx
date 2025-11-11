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
import { fmtPct, fmtMoney } from '../../lib/helpers'

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
  // 1) guard от гидрации
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // 2) форматтеры
  const rubTick = (v: number) => fmtMoney(v)
  const pctTick = (v: number) => `${fmtPct(v)}%`
  const shortSku = (s: string) => (s.length > 12 ? s.slice(0, 11) + '…' : s)

  // 3) данные
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

  // 4) pre-render skeleton (фикс SSR)
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

  // 5) основной рендер
  return (
    <div className="px-4 pb-2 overflow-x-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* === Прибыль по SKU === */}
        <div
          className="flex-1 min-w-[300px] max-w-[600px] bg-white/90 border border-gray-200 rounded-xl shadow p-4"
        >
          <h3 className="text-sm font-semibold mb-1">Прибыль по товарам</h3>
          <p className="text-xs text-gray-500 mb-2">
            Сколько приносит каждая позиция
          </p>

          {/* контейнер графика: изоляция и обрезка, чтобы тултип не вызывал полосы */}
          <div className="h-[220px] overflow-hidden" style={{ contain: 'layout paint' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataSku}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sku" tickFormatter={shortSku} />
                <YAxis tickFormatter={rubTick} />
                <RTooltip
                  // тултип не влияет на скроллы
                  wrapperStyle={{ pointerEvents: 'none' }}
                  contentStyle={{
                    padding: '6px 8px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                  }}
                  cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                />
                <Legend />
                <Bar
                  dataKey="profit"
                  name="Прибыль/шт"
                  fill="#2563eb"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* === Общая маржа во времени === */}
        <div
          className="flex-1 min-w-[300px] max-w-[600px] bg-white/90 border border-gray-200 rounded-xl shadow p-4"
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold">История маржи (динамика во времени)</h3>
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
            Отслеживайте, как менялась средняя маржа при добавлении или редактировании товаров
          </p>

          {/* контейнер графика: изоляция и обрезка */}
          <div className="h-[220px] overflow-hidden" style={{ contain: 'layout paint' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dataMargin}
                margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis tickFormatter={pctTick} />
                <RTooltip
                  formatter={(value: number, name) => [
                    `${fmtPct(Number(value))}%`,
                    name === 'margin' ? 'Маржа, %' : name,
                  ]}
                  labelFormatter={(label: string) => `Время: ${label}`}
                  wrapperStyle={{ pointerEvents: 'none' }}
                  contentStyle={{
                    padding: '6px 8px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                  }}
                  cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="margin"
                  name="Маржа, %"
                  strokeWidth={2}
                  dot={dataMargin.length <= 1}
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
