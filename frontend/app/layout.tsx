import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tasks · Next.js + NestJS',
  description: 'App de ejemplo full-stack type-safe con Next.js y NestJS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
