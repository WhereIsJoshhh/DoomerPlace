'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ApiError, apiRequest } from '@/lib/api';
import { addLocalProductToCart, externalLink, externalPlatform, fetchDemoProduct, StoreProduct } from '@/lib/storefront';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export function ProductDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest<StoreProduct>(`/products/${encodeURIComponent(slug)}`)
      .then((data) => { if (active) setProduct(data); })
      .catch(async (requestError) => {
        if (!active) return;
        if (/^demo-(?:\d+|x-\d{3})$/.test(slug)) {
          try { setProduct(await fetchDemoProduct(slug.slice(5))); return; }
          catch { /* Show the original product/API error below. */ }
        }
        setError(requestError instanceof ApiError ? requestError.message : 'No pudimos cargar este producto.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  async function addToCart() {
    if (!product) return;
    setBusy(true);
    setMessage('');
    try {
      await addLocalProductToCart(product.id, product.variantes?.[0]?.id);
      setMessage('Producto agregado a tu carrito.');
    } catch (requestError) {
      setMessage(requestError instanceof ApiError ? requestError.message : 'No se pudo agregar al carrito.');
    } finally { setBusy(false); }
  }

  if (loading) return <main className="detail-state"><span className="section-kicker">DOOMERPLACE</span><p>Cargando producto…</p></main>;
  if (error || !product) return <main className="detail-state"><span className="section-kicker">NO ENCONTRAMOS EL PRODUCTO</span><p>{error || 'Este producto ya no está disponible.'}</p><Link className="detail-back" href="/">← Volver al catálogo</Link></main>;

  const affiliateUrl = externalLink(product);
  const platform = externalPlatform(product, affiliateUrl);
  const variant = product.variantes?.[0];
  const stock = variant?.inventario?.stockDisponible;
  const price = variant ? Number(variant.precio) : null;
  const money = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'USD' });

  return <main className="product-detail-shell">
    <SiteHeader showSearch />
    <div className="detail-subnav"><Link className="detail-back" href="/">← Volver al catálogo</Link></div>
    <div className="detail-breadcrumb"><Link href="/">Inicio</Link><span>/</span><span>{product.categoria?.nombre || 'Catálogo'}</span><span>/</span><span>{product.nombre}</span></div>
    <section className="detail-layout">
      <div className="detail-gallery">
        {product.imagenes?.[0]?.url ? <img src={product.imagenes[0].url} alt={product.imagenes[0].altText || product.nombre} /> : <div className="detail-placeholder">{product.nombre.slice(0, 1).toUpperCase()}</div>}
        {affiliateUrl && <span className="product-source-badge">Vendido en {platform}</span>}
      </div>
      <div className="detail-copy">
        <span className="section-kicker">{product.isDemo ? 'PRODUCTO DE DEMOSTRACIÓN' : product.marca?.nombre || product.tienda?.nombre || 'SELECCIÓN DOOMERPLACE'}</span>
        <h1>{product.nombre}</h1>
        <strong className="detail-price">{price === null ? 'Consulta el precio' : money.format(price)}</strong>
        <p className="detail-description">{product.descripcionLarga || product.descripcionCorta || 'Un hallazgo elegido para ti.'}</p>
        {product.isDemo ? <div className="external-note"><span>i</span><p>Este artículo proviene de una API pública de demostración. No pertenece al inventario de DoomerPlace y no está disponible para compra.</p></div> : affiliateUrl ? <><div className="external-note"><span>↗</span><p>La compra y el envío se realizan directamente en {platform}. El precio y la disponibilidad pueden cambiar en esa tienda.</p></div><a className="external-product-button detail-cta" href={affiliateUrl.href} target="_blank" rel="sponsored noopener noreferrer">Ver en {platform} <span>↗</span></a></> : <><p className={`detail-stock ${stock !== undefined && stock < 1 ? 'out' : ''}`}>{stock !== undefined ? stock > 0 ? `${stock} disponibles` : 'Agotado' : 'Disponible en tienda'}</p><button className="local-cart-button detail-cta" disabled={busy || (stock !== undefined && stock < 1)} onClick={() => void addToCart()}>{busy ? 'Agregando…' : stock !== undefined && stock < 1 ? 'Sin stock' : 'Agregar al carrito'}</button></>}
        {message && <p className="detail-feedback" role="status" aria-live="polite">{message}</p>}
        <div className="detail-meta"><span>Vendido por</span><strong>{product.tienda?.nombre || platform}</strong></div>
      </div>
    </section>
    <SiteFooter />
  </main>;
}
