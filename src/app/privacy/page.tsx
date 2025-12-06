export default function Privacy() {
  return (
    <main className="prose mx-auto p-6">
      <h1 className="text-center text-3xl font-bold">Политика конфиденциальности</h1>

      <p>
        Мы обрабатываем данные товаров и учетной записи исключительно для работы сервиса.
        Данные не передаются третьим лицам, кроме поставщика аутентификации Supabase.
      </p>

      <p>
        Файлы импорта (CSV, XLSX) не сохраняются на сервере — обработка выполняется только в браузере.
      </p>

      <p>
        Вы можете удалить все данные в один клик через кнопку «Очистить всё».
      </p>

      <p className="text-center font-bold">Контакты: artemkis2015@gmail.com</p>
    </main>
  )
}
