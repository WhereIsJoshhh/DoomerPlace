import Link from 'next/link';

/**
 * Pie de página compartido: navegación, contacto y páginas legales.
 * Sin enlaces técnicos (salud de la API) y sin redes sociales:
 * DoomerPlace aún no tiene perfiles públicos que enlazar.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <Link className="store-brand" href="/">doomerplace<span className="footer-dot">.</span></Link>
        <p>Catálogo de demostración para descubrir tiendas y productos independientes. Los productos de muestra no están a la venta en DoomerPlace. Precios en USD.</p>
      </div>
      <nav className="site-footer-links" aria-label="Navegación del pie de página">
        <Link href="/#productos">Descubrir</Link>
        <Link href="/#categorias">Categorías</Link>
        <Link href="/#sobre">Nuestra idea</Link>
        <Link href="/contacto">Contacto</Link>
      </nav>
      <nav className="site-footer-links" aria-label="Páginas legales">
        <Link href="/terminos">Términos de servicio</Link>
        <Link href="/privacidad">Política de privacidad</Link>
      </nav>
      <span className="site-footer-copy">© 2026 DoomerPlace</span>
    </footer>
  );
}
