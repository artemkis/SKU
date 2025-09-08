import './globals.css'

export const metadata = {
  title: 'SKU Profit Calculator',
  description: 'MVP калькулятор прибыли по SKU',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
       <body className="relative min-h-screen bg-gradient-to-br from-blue-50 via-sky-100 to-cyan-100 text-gray-800 overflow-hidden bg-fixed">
        {/* Размытые цветные пятна */}
        <div className="absolute top-0 left-1/3 w-[30rem] h-[30rem] bg-sky-200 rounded-full blur-3xl opacity-40"></div>
        <div className="absolute bottom-10 right-1/4 w-[25rem] h-[25rem] bg-cyan-300 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute top-1/2 left-0 w-[20rem] h-[20rem] bg-indigo-200 rounded-full blur-3xl opacity-20"></div>

        {/* Контент */}
        {children}
      </body>
    </html>
  )
}
