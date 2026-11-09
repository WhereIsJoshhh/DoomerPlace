import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DoomerPlace — Compra con confianza',
  description: 'Un marketplace para descubrir tiendas y productos únicos.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
