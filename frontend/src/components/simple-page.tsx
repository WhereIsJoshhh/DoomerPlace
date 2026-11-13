import { ReactNode } from 'react';
import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';

/** Marco común de las páginas simples: encabezado, contenido y pie. */
export function SimplePage({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell">
      <SiteHeader showSearch />
      <main className="simple-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
