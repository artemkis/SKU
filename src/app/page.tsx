'use client';

import { useMemo, useState } from 'react';

/* =========================================================
   ХЕЛПЕР-ФУНКЦИИ (чистая логика, без UI)
   ========================================================= */

/**
 * toNum — безопасно приводит строку из инпута к числу.
 * - убирает пробелы: "1 200" -> "1200"
 * - меняет запятую на точку: "12,5" -> "12.5"
 * - если пусто/NaN — возвращает 0
 */
const toNum = (v: string) => {
  if (!v) return 0;
  const s = v.replace(/\s+/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/** clamp — ограничивает число диапазоном [min, max] */
const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

/**
 * fmt — форматирует число под ru-RU локаль.
 * d — количество знаков после запятой.
 * Используем для отображения, НЕ для вычислений.
 */
const fmt = (x: number, d = 2) =>
  x.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });

/** unitRevenue — выручка с 1 шт после промо-скидки (пока promoPct=0, но функция универсальна) */
const unitRevenue = (price: number, promoPct = 0) => price * (1 - promoPct / 100);

/** unitFee — комиссия маркетплейса в ₽ (считается от выручки/цены, а не от прибыли) */
const unitFee = (price: number, feePct = 0, promoPct = 0) =>
  unitRevenue(price, promoPct) * (feePct / 100);

/** makeId — генератор уникального id для строки таблицы */
const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/* =========================================================
   ТИП ДАННЫХ СТРОКИ ТАБЛИЦЫ (what we store in state)
   ========================================================= */
type Row = {
  id: string;       // уникальный ключ строки
  sku: string;      // наименование товара
  price: number;    // цена продажи, ₽
  cost: number;     // себестоимость, ₽
  feePct: number;   // комиссия, %
  logistics: number;// логистика на 1 шт, ₽
};

/* =========================================================
   ГЛАВНЫЙ КОМПОНЕНТ СТРАНИЦЫ
   ========================================================= */
export default function Home() {
  /* ---------- УПРАВЛЯЕМАЯ ФОРМА (контролируемые инпуты) ---------- */
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [feePct, setFeePct] = useState('');
  const [logistics, setLogistics] = useState('');

  /* ---------- СОСТОЯНИЕ ТАБЛИЦЫ И BOTTOM-SHEET ---------- */
  const [rows, setRows] = useState<Row[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false); // открыт/закрыт «док» снизу

  /* ---------- ПРЕВЬЮ РАСЧЁТА ПО ТЕКУЩИМ ПОЛЯМ ФОРМЫ ---------- */
  // Читаем числа «мягко» через toNum (устойчиво к "1 200" и "12,5")
  const p = toNum(price);
  const c = toNum(cost);
  const f = clamp(toNum(feePct), 0, 100);  // комиссия ограничена 0..100%
  const l = toNum(logistics);

  // Черновые метрики для превью (до добавления в таблицу)
  const revenuePreview = unitRevenue(p, 0);
  const profitPreview  = p - c - unitFee(p, f, 0) - l;
  const marginPreview  = revenuePreview > 0 ? (profitPreview / revenuePreview) * 100 : 0;

  /* ---------- ДОБАВЛЕНИЕ НОВОЙ СТРОКИ В ТАБЛИЦУ ---------- */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRow: Row = {
      id: makeId(),
      sku: sku.trim() || `SKU-${rows.length + 1}`, // автоимя, если поле пустое
      price: p,
      cost: c,
      feePct: f,
      logistics: l,
    };
    // кладём новую строку сверху массива (так привычнее)
    setRows(prev => [newRow, ...prev]);

    // если «док» закрыт — откроем при первом добавлении
    if (!sheetOpen) setSheetOpen(true);

    // очистим форму, чтобы сразу вводить след. товар
    setSku(''); setPrice(''); setCost(''); setFeePct(''); setLogistics('');
  };

  /* ---------- УДАЛЕНИЕ/ОЧИСТКА ---------- */
  const handleRemove   = (id: string) => setRows(prev => prev.filter(r => r.id !== id));
  const handleClearAll = () => setRows([]);

  /* ---------- ПЕРЕСЧЁТ МЕТРИК ПО КАЖДОЙ СТРОКЕ + ИТОГИ ---------- */
  // useMemo — чтобы не считать каждый рендер, а только при изменении rows
  const computed = useMemo(() => {
    // формируем копию строк с добавленными расчетными полями
    const withMetrics = rows.map(r => {
      const rev = unitRevenue(r.price, 0);             // выручка/шт
      const fee = unitFee(r.price, r.feePct, 0);       // комиссия, ₽
      const direct = r.cost + r.logistics;             // прямые затраты (себестоимость + логистика)
      const profit = rev - fee - direct;               // прибыль/шт
      const marginPct = rev > 0 ? (profit / rev) * 100 : 0; // маржинальность, %
      return { ...r, rev, fee, direct, profit, marginPct };
    });

    // агрегируем итоги по таблице
    const totals = withMetrics.reduce(
      (acc, r) => {
        acc.rev    += r.rev;
        acc.fee    += r.fee;
        acc.direct += r.direct;
        acc.profit += r.profit;
        return acc;
      },
      { rev: 0, fee: 0, direct: 0, profit: 0 }
    );

    // общая маржинальность = суммарная прибыль / суммарная выручка
    const totalMarginPct = totals.rev > 0 ? (totals.profit / totals.rev) * 100 : 0;

    return { rows: withMetrics, totals, totalMarginPct };
  }, [rows]);

  /* ---------- КОНФИГУРАЦИЯ ПОЛЕЙ ДЛЯ КОМПАКТНОГО РЕНДЕРА ---------- */

  type Field = {
  id: string
  label: string
  type: 'text' | 'number'
  value: string
  set: React.Dispatch<React.SetStateAction<string>>
  min?: number
  max?: number
}

  const fields: Field[] = [
    { id: 'sku',       label: 'SKU (название товара)', type: 'text',   value: sku,       set: setSku },
    { id: 'price',     label: 'Цена продажи, ₽',       type: 'number', value: price,     set: setPrice },
    { id: 'cost',      label: 'Себестоимость, ₽',      type: 'number', value: cost,      set: setCost },
    { id: 'feePct',    label: 'Комиссия площадки, %',  type: 'number', value: feePct,    set: setFeePct, min: 0, max: 100 },
    { id: 'logistics', label: 'Логистика, ₽/шт',       type: 'number', value: logistics, set: setLogistics },
  ];

  /* =========================================================
     JSX (UI): левая колонка — форма, снизу — «док» с таблицей
     ========================================================= */
  return (
    // Внешний контейнер. items-start — форма прижимается к верху, а не центр экрана.
    <main className="flex min-h-screen items-start justify-center py-10 px-4 relative z-10">
      {/* =========================
          КАРТОЧКА ФОРМЫ (узкая)
         ========================= */}
      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        className="relative w-full max-w-md rounded-2xl border border-white/40
                   bg-white/60 backdrop-blur-md shadow-xl p-6 ring-1 ring-black/5 space-y-4"
      >
        {/* Заголовок блока + подзаголовок */}
        <div className="space-y-1">
          {/* Градиентный заголовок (через background-clip + прозрачный текст) */}
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight
                         bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-rose-500
                         bg-clip-text text-transparent text-center">
            Ввод данных товара
          </h1>
          <p className="text-center text-gray-500 text-sm italic">
            Введите данные, чтобы рассчитать
            <span className="text-indigo-600 font-medium"> прибыль </span>
            и
            <span className="text-fuchsia-500 font-medium"> маржу</span>
          </p>
        </div>

        {/* Поля формы с плавающими лейблами */}
        {fields.map(field => (
          <div className="relative" key={field.id}>
            <input
              id={field.id}
              type={field.type}
              value={field.value}
              min={field.min}
              max={field.max}
              onChange={e => field.set(e.target.value)}
              onWheel={e => (e.currentTarget as HTMLInputElement).blur()} // отключаем «крутилку» чисел колесом мыши
              inputMode={field.type === 'number' ? 'decimal' : undefined} // мобилки покажут цифровую клавиатуру
              step={field.type === 'number' ? '0.01' : undefined}
              data-filled={field.value ? 'true' : 'false'} // флаг для CSS-селектора peer-data-[filled=true]
              className="peer w-full h-12 rounded-xl border border-gray-300 bg-white/85
                         px-3 pt-5 pb-2 shadow-sm outline-none
                         focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300
                         placeholder-transparent transition"
              required
            />
            {/* Лейбл «плавает» вверх при фокусе или если поле заполнено */}
            <label
              htmlFor={field.id}
              className="pointer-events-none absolute left-3 px-1 rounded text-gray-500 transition-all
                         top-1/2 -translate-y-1/2 text-base bg-transparent
                         peer-focus:top-1.5 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:bg-white/85 peer-focus:text-indigo-600
                         peer-data-[filled=true]:top-1.5 peer-data-[filled=true]:-translate-y-0 peer-data-[filled=true]:text-xs peer-data-[filled=true]:bg-white/85"
            >
              {field.label}
            </label>
          </div>
        ))}

        {/* Превью расчёта под формой (быстрый фидбек) */}
        <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/70 text-indigo-900 text-sm p-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-center grow">
              Прибыль с 1 шт:&nbsp;
              <span className={profitPreview < 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                {Number.isFinite(profitPreview) ? fmt(profitPreview) : '—'} ₽
              </span>
            </div>
            <div className="text-center grow">
              Маржа:&nbsp;
              <span
                className={
                  marginPreview < 0
                    ? 'text-red-600 font-semibold'      // < 0% — красный
                    : marginPreview < 20
                    ? 'text-yellow-600 font-semibold'   // 0–20% — жёлтый (низкая)
                    : 'text-green-600 font-semibold'    // ≥ 20% — зелёный (норм/высокая)
                }
              >
                {Number.isFinite(marginPreview) ? fmt(marginPreview) : '—'}%
              </span>
            </div>
          </div>
        </div>

        {/* Кнопки действия: добавление строки и открытие таблицы */}
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="submit"
            className="whitespace-nowrap px-6 py-2.5 rounded-xl font-semibold text-white text-center
                       bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600
                       transition-all duration-800 ease-in-out hover:scale-[1.02]
                       shadow-[0_8px_24px_rgba(99,102,241,0.35)]
                       hover:shadow-[0_10px_32px_rgba(99,102,241,0.45)]
                       focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-white">
            Добавить в таблицу
          </button>

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="whitespace-nowrap px-6 py-2.5 rounded-xl border border-gray-300 bg-white/90
                       text-gray-700 hover:bg-white transition"
          >
            Открыть таблицу
          </button>
        </div>
      </form>

      {/* =========================================================
         OVERLAY (затемнение фона) — монтируем ТОЛЬКО когда открыт «док»
         Клик по overlay закрывает таблицу.
         ========================================================= */}
      {sheetOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-20 transition-opacity"
          onClick={() => setSheetOpen(false)}
        />
      )}

      {/* =========================================================
         BOTTOM SHEET (панель с таблицей)
         ВАЖНО: она ВСЕГДА рендерится (чтобы увидеть анимацию закрытия),
         а видимость/позиция управляется классами translate-y-... + pointer-events.
         ========================================================= */}
      <section
        className={[
          'fixed inset-x-0 bottom-0 z-30',
          // Анимация выезда/заезда: меняем только transform (GPU-дружественно)
          'transform transition-transform duration-500 ease-in-out will-change-[transform]',
          // когда закрыто — уводим ниже экрана и «выключаем» клики
          sheetOpen ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none',
        ].join(' ')}
      >
        {/* Ограничиваем максимальную ширину «дока», центрируем */}
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="rounded-t-2xl border border-gray-200/70 bg-white/95 backdrop-blur shadow-2xl">
            {/* «язычок» для визуального эффекта перетягивания */}
            <div className="flex justify-center pt-2">
              <div className="h-1.5 w-12 rounded-full bg-gray-300" />
            </div>

            {/* Тулбар: счётчик, действия */}
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

            {/* Контейнер с прокруткой: scroll внутри «дока», шапка sticky */}
            <div className="max-h-[55vh] overflow-auto">
              <table className="w-full text-sm">
                {/* sticky-шапка остаётся на месте при вертикальном скролле */}
                <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b">
                  <tr className="text-left text-gray-600">
                    <th className="px-4 py-3 font-semibold">SKU</th>
                    <th className="px-4 py-3 font-semibold">Цена</th>
                    <th className="px-4 py-3 font-semibold">Себестоимость</th>
                    <th className="px-4 py-3 font-semibold">Комиссия %</th>
                    <th className="px-4 py-3 font-semibold">Логистика</th>
                    <th className="px-4 py-3 font-semibold">Выручка</th>
                    <th className="px-4 py-3 font-semibold">Комиссия ₽</th>
                    <th className="px-4 py-3 font-semibold">Прямые ₽</th>
                    <th className="px-4 py-3 font-semibold">Прибыль/шт</th>
                    <th className="px-4 py-3 font-semibold">Маржа</th>
                    <th className="px-4 py-3 font-semibold" />
                  </tr>
                </thead>

                {/* Зебра-строки + подсветка на hover */}
                <tbody className="[&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-gray-50">
                  {computed.rows.map(r => (
                    <tr key={r.id} className="hover:bg-sky-50/60 transition">
                      <td className="px-4 py-3 font-medium text-gray-800">{r.sku}</td>
                      <td className="px-4 py-3">{fmt(r.price)}</td>
                      <td className="px-4 py-3">{fmt(r.cost)}</td>
                      <td className="px-4 py-3">{fmt(r.feePct, 2)}%</td>
                      <td className="px-4 py-3">{fmt(r.logistics)}</td>
                      <td className="px-4 py-3">{fmt(r.rev)}</td>
                      <td className="px-4 py-3">{fmt(r.fee)}</td>
                      <td className="px-4 py-3">{fmt(r.direct)}</td>
                      {/* Прибыль подсвечиваем красным/зелёным */}
                      <td className={`px-4 py-3 font-semibold ${r.profit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {fmt(r.profit)} ₽
                      </td>
                      {/* Маржа: 3 цвета (красный / жёлтый / зелёный) */}
                      <td
                        className={`px-4 py-3 font-semibold ${
                          r.marginPct < 0
                            ? 'text-red-600'
                            : r.marginPct < 20
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }`}
                      >
                        {fmt(r.marginPct)}%
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleRemove(r.id)}
                          className="rounded-lg px-3 py-1.5 text-xs border border-gray-300 hover:bg-gray-50 transition"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Итоги по таблице: суммарные метрики + общая маржа в % */}
                <tfoot>
                  <tr className="bg-indigo-50/70 border-t">
                    {/* colSpan=5 — занимаем первые 5 колонок под слово «Итого» */}
                    <td className="px-4 py-3 font-bold" colSpan={5}>Итого</td>
                    <td className="px-4 py-3 font-bold">{fmt(computed.totals.rev)}</td>
                    <td className="px-4 py-3 font-bold">{fmt(computed.totals.fee)}</td>
                    <td className="px-4 py-3 font-bold">{fmt(computed.totals.direct)}</td>
                    <td className={`px-4 py-3 font-bold ${computed.totals.profit < 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {fmt(computed.totals.profit)} ₽
                    </td>
                    <td className="px-4 py-3 font-bold">{fmt(computed.totalMarginPct)}%</td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
