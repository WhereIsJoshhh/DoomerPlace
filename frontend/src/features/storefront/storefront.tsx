'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { API_BASE_URL, ApiError, ApiUser, apiRequest, clearSession } from '@/lib/api';
import { addLocalProductToCart, externalLink, externalPlatform, fetchDemoProducts, StoreProduct } from '@/lib/storefront';

type Category = { id: string; nombre: string; icono?: string | null };
type Product = StoreProduct;
type ProductList = { items: Product[]; meta: { total: number } };

const money = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'USD' });
const categoryIcons = ['✦', '◈', '⌁', '◉', '↗', '✳'];

export function Storefront() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [catalogSource, setCatalogSource] = useState<'marketplace' | 'demo'>('marketplace');
  const [cartMessage, setCartMessage] = useState('');
  const [addingProduct, setAddingProduct] = useState('');

  useEffect(() => {
    const savedUser = window.localStorage.getItem('doomerplace.user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser) as ApiUser); } catch { clearSession(); }
    }
    apiRequest<Category[]>('/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: '1', limit: '8' });
    if (search) params.set('search', search);
    if (categoryId) params.set('categoriaId', categoryId);

    async function loadCatalog() {
      let apiError: unknown;
      try {
        const result = await apiRequest<ProductList>(`/products?${params.toString()}`);
        if (!active) return;
        if (result.items?.length) {
          setProducts(result.items);
          setCatalogSource('marketplace');
          return;
        }
      } catch (requestError) { apiError = requestError; }

      try {
        const demoProducts = await fetchDemoProducts(search);
        if (!active) return;
        setProducts(demoProducts);
        setCatalogSource('demo');
      } catch {
        if (!active) return;
        setProducts([]);
        setError(apiError instanceof ApiError ? apiError.message : 'No pudimos cargar el catálogo.');
      }
    }

    void loadCatalog()
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [search, categoryId]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(query.trim());
    document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' });
  }

  function logout() {
    clearSession();
    setUser(null);
  }

  async function addToCart(product: Product) {
    const variant = product.variantes?.[0];
    setAddingProduct(product.id);
    setCartMessage('');
    try {
      await addLocalProductToCart(product.id, variant?.id);
      setCartMessage(`${product.nombre} se agregó al carrito.`);
    } catch (requestError) {
      setCartMessage(requestError instanceof ApiError ? requestError.message : 'No se pudo agregar el producto al carrito.');
    } finally { setAddingProduct(''); }
  }

  return (
    <main className="storefront">
      <div className="announcement"><span>✦</span> Un buen hallazgo cambia el día <span className="announcement-divider">·</span> Descubre tiendas independientes</div>
      <header className="store-header">
        <Link className="store-brand" href="/" aria-label="DoomerPlace, inicio"><span className="store-brand-mark">d<span>.</span></span>doomerplace</Link>
        <nav className="store-nav" aria-label="Navegación principal">
          <a className="current" href="#productos">Descubrir</a>
          <a href="#categorias">Categorías</a>
          <a href="#sobre">Nuestra idea</a>
        </nav>
        <div className="store-actions">
          {user ? <><span className="store-user">Hola, {user.nombre}</span><button className="store-login" onClick={logout}>Cerrar sesión</button></> : <Link className="store-login" href="/login">Iniciar sesión</Link>}
          {!user && <Link className="store-join" href="/login?mode=register">Crear cuenta <span>↗</span></Link>}
        </div>
      </header>

      <section className="store-hero">
        <div className="hero-copy">
          <span className="hero-kicker"><span /> UN MARKETPLACE CON PERSONALIDAD</span>
          <h1>Menos de siempre.<br /><em>Más de lo tuyo.</em></h1>
          <p>Encuentra marcas independientes, objetos especiales y tiendas con algo que contar.</p>
          <form className="store-search" onSubmit={submitSearch}>
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="¿Qué te gustaría encontrar?" aria-label="Buscar productos" />
            <button type="submit">Buscar <span>→</span></button>
          </form>
          <div className="hero-note"><span>✓</span> Descubre algo diferente, cada día</div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-sun" />
          <div className="art-card art-card-back"><span>BUENAS COSAS<br />HECHAS CERCA</span><b>✳</b></div>
          <div className="art-card art-card-front"><span className="art-label">OBJETO DE LA SEMANA</span><div className="art-vase"><i /><i /><i /></div><span className="art-caption">Hecho para durar.<br /><b>Elegido para ti.</b></span></div>
          <div className="art-sticker">hecho<br />con cariño</div>
        </div>
      </section>

      <section className="category-section" id="categorias">
        <div className="section-heading"><div><span className="section-kicker">POR DONDE EMPEZAR</span><h2>Un mundo de posibilidades</h2></div><button className="text-link" onClick={() => setCategoryId('')}>Ver todo <span>→</span></button></div>
        <div className="category-list">
          {categories.length ? categories.slice(0, 6).map((category, index) => (
            <button key={category.id} className={`category-pill ${categoryId === category.id ? 'active' : ''}`} onClick={() => setCategoryId(categoryId === category.id ? '' : category.id)}>
              <span className="category-icon">{category.icono || categoryIcons[index % categoryIcons.length]}</span>{category.nombre}<span className="category-arrow">↗</span>
            </button>
          )) : ['Tecnología', 'Moda y calzado', 'Hogar', 'Accesorios'].map((name, index) => <span key={name} className="category-pill category-static"><span className="category-icon">{categoryIcons[index]}</span>{name}</span>)}
        </div>
      </section>

      <section className="product-section" id="productos">
        <div className="section-heading"><div><span className="section-kicker">{catalogSource === 'demo' ? 'CATÁLOGO PÚBLICO DE DEMOSTRACIÓN' : 'SELECCIÓN DOOMERPLACE'}</span><h2>{search ? `Resultados para “${search}”` : categoryId ? 'Explora esta categoría' : 'Encuentra tu próximo favorito'}</h2></div><span className="product-count">{loading ? 'Cargando…' : `${products.length} ${products.length === 1 ? 'producto' : 'productos'}`}</span></div>
        {catalogSource === 'demo' && !loading && <p className="demo-catalog-notice">Mostrando productos de ejemplo de una API pública. No son inventario de DoomerPlace y no se pueden comprar aquí.</p>}
        {error ? <div className="catalog-message"><span>!</span><p>{error}</p></div> : loading ? <div className="product-grid">{Array.from({ length: 4 }, (_, index) => <div className="product-skeleton" key={index}><div /><span /><span /></div>)}</div> : products.length ? (
          <div className="product-grid">
            {products.map((product, index) => {
              const image = product.imagenes?.[0]?.url;
              const price = product.variantes?.length ? Math.min(...product.variantes.map((variant) => Number(variant.precio))) : null;
              const affiliateUrl = externalLink(product);
              const platform = externalPlatform(product, affiliateUrl);
              const localStock = product.variantes?.some((variant) => variant.inventario?.stockDisponible !== undefined);
              const outOfStock = localStock && !product.variantes?.some((variant) => (variant.inventario?.stockDisponible || 0) > 0);
              return <article className="product-card" key={product.id}>
                <div className={`product-image tone-${index % 4}`}>
                  {image ? <img src={image} alt={product.imagenes?.[0]?.altText || product.nombre} /> : <span className="product-placeholder">{product.nombre.slice(0, 1).toUpperCase()}</span>}
                  {product.isDemo ? <span className="product-source-badge">Producto de muestra</span> : affiliateUrl ? <span className="product-source-badge">Vendido en {platform}</span> : <span className="product-badge">{product.categoria?.nombre || 'Selección'}</span>}
                  <span className="favorite-button" aria-hidden="true">♡</span>
                </div>
                <div className="product-info"><span className="product-store">{product.tienda?.nombre || 'Tienda independiente'}</span><Link className="product-title-link" href={`/products/${encodeURIComponent(product.slug)}`}><h3>{product.nombre}</h3></Link><p>{product.descripcionCorta || 'Una pieza especial seleccionada para ti.'}</p><div className="product-bottom"><strong>{price === null ? 'Ver precio' : money.format(price)}</strong><span>{product.isDemo ? 'Solo demostración' : affiliateUrl ? 'Compra externa ↗' : outOfStock ? 'Agotado' : 'Disponible ↗'}</span></div><div className="product-actions">{product.isDemo ? <button className="local-cart-button" disabled>Producto de muestra</button> : affiliateUrl ? <a className="external-product-button" href={affiliateUrl.href} target="_blank" rel="sponsored noopener noreferrer">Ver en {platform} <span>↗</span></a> : <button className="local-cart-button" disabled={addingProduct === product.id || !!outOfStock} onClick={() => void addToCart(product)}>{addingProduct === product.id ? 'Agregando…' : outOfStock ? 'Sin stock' : 'Agregar al carrito'}</button>}<Link className="product-detail-link" href={`/products/${encodeURIComponent(product.slug)}`}>Detalles</Link></div></div>
              </article>;
            })}
          </div>
        ) : <div className="empty-products"><div className="empty-spark">✳</div><span className="section-kicker">HAY ESPACIO PARA ALGO NUEVO</span><h3>{search ? 'No encontramos ese producto todavía.' : 'Pronto habrá nuevos hallazgos.'}</h3><p>{search ? 'Prueba otra búsqueda o explora todas las categorías.' : 'Las tiendas del marketplace están preparando sus primeras selecciones.'}</p>{search && <button className="text-link" onClick={() => { setQuery(''); setSearch(''); }}>Limpiar búsqueda <span>→</span></button>}</div>}
      </section>

      <div className="store-toast" role="status" aria-live="polite">{cartMessage}</div>

      <section className="maker-banner" id="sobre"><div className="maker-symbol">dp</div><div><span className="section-kicker">BUENO PARA QUIEN COMPRA. BUENO PARA QUIEN CREA.</span><h2>Las mejores cosas tienen<br />una historia detrás.</h2></div><p>Apoyamos tiendas independientes y a las personas que hacen del comercio algo más humano.</p></section>
      <footer className="store-footer"><Link className="store-brand" href="/">doomerplace<span className="footer-dot">.</span></Link><span>Descubre con intención.</span><a href={`${API_BASE_URL}/health`} target="_blank" rel="noreferrer">Estado de la plataforma <span className="online-dot" /></a></footer>
    </main>
  );
}
