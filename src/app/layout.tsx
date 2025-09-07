import "./globals.css";

export const metadata = {
  title: "SKU Profit Calculator",
  description: "MVP калькулятор прибыли по SKU",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="bg-gray-50 text-gray-800">{children}</body>
    </html>
  );
}
