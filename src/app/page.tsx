"use client";

import { useState } from "react";

export default function Home() {
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [feePct, setFeePct] = useState("");            // комиссия, %
  const [logistics, setLogistics] = useState("");      // логистика, ₽/шт

  // простой превью-расчёт «прибыль с 1 шт»
  const p = Number(price) || 0;
  const c = Number(cost) || 0;
  const f = (Number(feePct) || 0) / 100;
  const l = Number(logistics) || 0;
  const unitProfit = p - c - p * f - l;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // тут позже добавим сохранение/таблицу
    console.log("Введено:", { sku, price: p, cost: c, feePct: f * 100, logistics: l });
    alert(
      `Сохранено:\nSKU: ${sku}\nЦена: ${p}\nСебестоимость: ${c}\nКомиссия: ${f * 100}%\nЛогистика: ${l}\n` +
      `Профит с 1 шт (черновик): ${unitProfit.toFixed(2)} ₽`
    );
  };

  return (
    <main className="flex min-h-screen items-center justify-center relative z-10">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-lg rounded-lg p-6 w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-bold text-center text-blue-600">
          Ввод данных товара
        </h1>

        {/* SKU */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SKU (название товара)
          </label>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Например: Товар А"
            required
          />
        </div>

        {/* Цена */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Цена продажи, ₽
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1000"
            required
          />
        </div>

        {/* Себестоимость */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Себестоимость, ₽
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="400"
            required
          />
        </div>

        {/* Комиссия, % */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Комиссия площадки, %
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            step="0.1"
            value={feePct}
            onChange={(e) => setFeePct(e.target.value)}
            className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="15"
            required
          />
        </div>

        {/* Логистика, ₽/шт */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Логистика, ₽/шт
          </label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={logistics}
            onChange={(e) => setLogistics(e.target.value)}
            className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="70"
            required
          />
        </div>

        {/* Превью прибыли с 1 шт */}
        <div className="text-sm text-gray-600 bg-gray-50 border rounded p-3">
          Черновой расчёт прибыли с 1 шт:{" "}
          <span className={unitProfit < 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
            {Number.isFinite(unitProfit) ? unitProfit.toFixed(2) : "—"} ₽
          </span>
          <div className="mt-1 text-xs text-gray-500">
            Формула: цена − себестоимость − (цена × комиссия) − логистика
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700 transition"
        >
          Сохранить
        </button>
      </form>
    </main>
  );
}
