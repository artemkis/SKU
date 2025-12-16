'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Calculator,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen px-4">
      {/* ===== HERO WRAPPER ===== */}
      <section className="min-h-[70vh] md:min-h-[75vh] flex items-center">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* ===== TEXT + CTA (на мобиле ПЕРВЫМ) ===== */}
          <div className="order-2 lg:order-1 space-y-6 text-center lg:text-left">

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-4xl md:text-5xl font-extrabold tracking-tight"
            >
              Реальная прибыль
              <br />
              <span className="bg-gradient-to-r from-fuchsia-600 to-sky-500 bg-clip-text text-transparent">
                на WB и Ozon
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="text-gray-600 text-base md:text-lg"
            >
              Аналитика комиссии, логистики и маржи в одном калькуляторе.
              <br />
              Оцени прибыльность товара за 10 секунд.
            </motion.p>

            {/* ===== CTA ===== */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="relative z-10 flex flex-col gap-2 justify-center lg:justify-start"
            >
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link
                  href="/calc"
                  onClick={() => {
                    const n = Number(localStorage.getItem('cta_clicks') || 0)
                    localStorage.setItem('cta_clicks', String(n + 1))
                    router.push('/calc')
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-4
                             text-lg font-semibold text-white
                             bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600
                             shadow-lg hover:scale-[1.03] transition"
                >
                  Оценить прибыль
                  <ArrowRight size={20} />
                </Link>

                <div className="text-sm text-gray-500 flex items-center justify-center lg:justify-start gap-2">
                  <Calculator size={16} />
                  Без регистрации
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Подходит для оценки товара перед закупкой
              </div>
            </motion.div>
          </div>

          {/* ===== VISUAL EXAMPLE (на мобиле ВТОРЫМ) ===== */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.4 }}
            className="order-1 lg:order-2 rounded-3xl border bg-white/80 backdrop-blur shadow-xl p-6 space-y-4"
          >
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp size={18} />
              Пример аналитической оценки
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Цена</span>
                <span className="font-medium">600 ₽</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Комиссия</span>
                <span>− 84 ₽</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Логистика</span>
                <span>− 56 ₽</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Оценка прибыли</span>
                <span className="text-green-600">160 ₽</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-gray-500">
              <AlertTriangle size={14} className="mt-0.5" />
              Цифры используются для сравнения и принятия решений
            </div>
          </motion.div>

        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="mt-16 w-full px-4">
        <div className="max-w-4xl mx-auto space-y-3 text-center">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600">
            <div className="rounded-xl border bg-white/70 p-3">
              Комиссия считается
              <br />
              от цены
            </div>
            <div className="rounded-xl border bg-white/70 p-3">
              Логистика влияет
              <br />
              на маржу
            </div>
            <div className="rounded-xl border bg-white/70 p-3">
              Маржа ≠<br />
              прибыль
            </div>
          </div>

          <div className="text-[11px] text-gray-400 leading-snug">
            Инструмент предназначен для аналитики и оценки прибыльности товаров.
            <br />
            Не является бухгалтерским, финансовым или налоговым расчётом.
          </div>
        </div>
      </footer>
    </main>
  )
}
