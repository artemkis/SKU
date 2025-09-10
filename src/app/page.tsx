'use client'

import { useState } from 'react'

export default function Home() {
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [cost, setCost] = useState('')
  const [feePct, setFeePct] = useState('') // комиссия, %
  const [logistics, setLogistics] = useState('') // логистика, ₽/шт

  // простой превью-расчёт «прибыль с 1 шт»
  const p = Number(price) || 0
  const c = Number(cost) || 0
  const f = (Number(feePct) || 0) / 100
  const l = Number(logistics) || 0
  const unitProfit = p - c - p * f - l

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Введено:', {
      sku,
      price: p,
      cost: c,
      feePct: f * 100,
      logistics: l,
    })
    alert(
      `Сохранено:\nSKU: ${sku}\nЦена: ${p}\nСебестоимость: ${c}\nКомиссия: ${
        f * 100
      }%\nЛогистика: ${l}\n` +
        `Профит с 1 шт (черновик): ${unitProfit.toFixed(2)} ₽`
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center relative z-10">
      <form
        onSubmit={handleSubmit}
        className="relative mx-auto w-full max-w-md rounded-2xl border border-white/40
                 bg-white/60 backdrop-blur-md shadow-xl p-6 ring-1 ring-black/5 space-y-4"
      >
        {/* Группа заголовка */}
        <div className="space-y-1">
          <h1
            className="text-3xl md:text-4xl font-extrabold tracking-tight
                 bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-rose-500
                 bg-clip-text text-transparent text-center"
          >
            Ввод данных товара
          </h1>

          <p className="text-center text-gray-500 text-sm italic">
            Введите данные, чтобы рассчитать
            <span className="text-indigo-600 font-medium"> прибыль </span> и
            <span className="text-fuchsia-500 font-medium"> маржу</span>
          </p>
        </div>

        {/* Поля */}
        {[
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
          },
          {
            id: 'logistics',
            label: 'Логистика, ₽/шт',
            type: 'number',
            value: logistics,
            set: setLogistics,
          },
        ].map((field) => (
          <div className="relative" key={field.id}>
            <input
              id={field.id}
              type={field.type}
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              placeholder=" "
              data-filled={field.value ? 'true' : 'false'}
              className="peer w-full h-12 rounded-xl border border-gray-300 bg-white/85
                         px-3 pt-5 pb-2 shadow-sm outline-none
                         focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300
                         placeholder-transparent transition"
              required
            />
            <label
              htmlFor={field.id}
              className="pointer-events-none absolute left-3 px-1 rounded text-gray-500
                         transition-all
                         top-1/2 -translate-y-1/2 text-base bg-transparent
                         peer-focus:top-1.5 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:bg-white/85 peer-focus:text-indigo-600
                         peer-data-[filled=true]:top-1.5 peer-data-[filled=true]:-translate-y-0 peer-data-[filled=true]:text-xs peer-data-[filled=true]:bg-white/85"
            >
              {field.label}
            </label>
          </div>
        ))}

        {/* Превью прибыли */}
        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/70 text-indigo-900 text-sm p-3">
          <div className="text-center">
            Черновой расчёт прибыли с 1 шт:{' '}
            <span
              className={
                unitProfit < 0
                  ? 'text-red-600 font-semibold'
                  : 'text-green-600 font-semibold'
              }
            >
              {Number.isFinite(unitProfit) ? unitProfit.toFixed(2) : '—'} ₽
            </span>
          </div>
          <div className="mt-1 text-[12px] text-indigo-700/80">
            Формула: цена − себестоимость − (цена × комиссия) − логистика
          </div>
        </div>

        {/* Кнопка */}
        <button
          type="submit"
          className="w-auto px-10 mx-auto block relative overflow-hidden rounded-xl py-2.5 
             font-semibold text-white text-center
             bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600
             bg-[length:200%_200%] bg-[position:0%_50%] hover:bg-[position:100%_50%]
             transition-all duration-800 ease-in-out hover:scale-[1.02]
             shadow-[0_8px_24px_rgba(99,102,241,0.35)]
             hover:shadow-[0_10px_32px_rgba(99,102,241,0.45)]
             focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-white
             animate-[gradient-x_6s_ease_infinite]"
        >
          Сохранить
        </button>
      </form>
    </main>
  )
}
