'use client'

import { Field } from '../../lib/types'
import { fmt, fmtRub } from '../../lib/helpers'

export default function FormCard({
  fields,
  onSubmit,
  profitPreview,
  marginPreview,
  previewProfitClass,
  previewMarginClass,
  onOpenTable,
}: {
  fields: Field[]
  onSubmit: (e: React.FormEvent<Element>) => void
  profitPreview: number
  marginPreview: number
  previewProfitClass: string
  previewMarginClass: string
  onOpenTable: () => void
}) {
  return (
    <form
      onSubmit={onSubmit}
      autoComplete="off"
      className="relative w-full max-w-md rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md shadow-xl p-6 ring-1 ring-black/5 space-y-4"
    >
      <div className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-rose-500 bg-clip-text text-transparent text-center">
          Ввод данных товара
        </h1>
        <p className="text-center text-gray-500 text-sm italic">
          Введите данные, чтобы рассчитать прибыль и маржу
        </p>
      </div>

      {fields.map((field) => (
        <div className="relative" key={field.id}>
          <input
            id={field.id}
            type={field.type}
            value={field.value}
            min={field.min}
            max={field.max}
            onChange={(e) => field.set(e.target.value)}
            onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
            inputMode={field.type === 'number' ? 'decimal' : undefined}
            step={field.type === 'number' ? '0.01' : undefined}
            data-filled={field.value ? 'true' : 'false'}
            className="peer w-full h-12 rounded-xl border border-gray-300 bg-white/85 px-3 pt-5 pb-2 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300 placeholder-transparent transition"
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

      <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/70 text-indigo-900 text-sm p-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-center grow">
            Прибыль с 1 шт:{' '}
            <span className={previewProfitClass}>{fmtRub(profitPreview)}</span>
          </div>
          <div className="text-center grow">
            Маржа:{' '}
            <span className={previewMarginClass}>{fmt(marginPreview)} </span>%
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="submit"
          className="h-11 w-full rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-[length:200%_200%] animate-[gradient-x_6s_ease_infinite] transition-transform duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2"
        >
          Добавить
        </button>

        <button
          type="button"
          onClick={onOpenTable}
          className="h-11 w-full rounded-xl font-semibold text-gray-700 border border-gray-300 bg-white/90 hover:bg-gray-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2"
        >
          Открыть таблицу
        </button>
      </div>
    </form>
  )
}
