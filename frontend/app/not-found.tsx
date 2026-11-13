import Link from 'next/link';
import { SimplePage } from '@/components/simple-page';

export default function NotFound() {
  return (
    <SimplePage>
      <div className="detail-state not-found-state">
        <span className="section-kicker">ERROR 404 · NO ENCONTRAMOS ESTA PÁGINA</span>
        <h1 className="not-found-title">Esta página no existe.</h1>
        <p>Puede que el enlace esté roto o que la página se haya movido. El catálogo sigue ahí, esperándote.</p>
        <Link className="detail-back" href="/">← Volver al inicio</Link>
      </div>
    </SimplePage>
  );
}
