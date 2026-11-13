import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DoomerPlace — Catálogo de demostración',
  description: 'Catálogo de demostración para descubrir tiendas independientes y productos únicos. Los productos de muestra no están a la venta en DoomerPlace.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
