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
        
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 left-1/4 w-[32rem] h-[32rem] rounded-full bg-cyan-300/25 blur-3xl"></div>
          <div className="absolute bottom-0 right-1/5 w-[28rem] h-[28rem] rounded-full bg-indigo-400/20 blur-3xl"></div>
          <div className="absolute top-1/3 right-0 w-[22rem] h-[22rem] rounded-full bg-sky-300/20 blur-3xl"></div>
        </div>
        {/* Контент */}
        {children}
      </body>
    </html>
  )
}
