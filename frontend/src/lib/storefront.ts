import { apiRequest } from './api';

export type StoreProduct = {
  id: string;
  slug: string;
  nombre: string;
  descripcionCorta?: string | null;
  descripcionLarga?: string | null;
  enlaceAfiliado?: string | null;
  plataformaExterna?: string | null;
  externalImports?: Array<{ provider: string; originalUrl: string }>;
  amazonImport?: { affiliateUrl?: string | null } | null;
  imagenes?: Array<{ url: string; altText?: string | null }>;
  variantes?: Array<{ id: string; precio: number | string; nombreVariante?: string; inventario?: { stockDisponible?: number } | null }>;
  tienda?: { nombre: string };
  categoria?: { nombre: string };
  marca?: { nombre: string } | null;
  isDemo?: boolean;
};

type DummyProduct = { id: number; title: string; description: string; category: string; price: number; brand?: string; thumbnail?: string; images?: string[] };
export type DemoCategory = { id: string; nombre: string; slug: string };
export type DemoProductPage = { items: StoreProduct[]; total: number; hasMore: boolean };
const categoryNames: Record<string, string> = {
  beauty: 'Belleza', fragrances: 'Perfumes', furniture: 'Muebles', groceries: 'Despensa',
  'home-decoration': 'Decoración del hogar', 'kitchen-accessories': 'Accesorios de cocina', laptops: 'Computadoras',
  'mens-shirts': 'Camisas de hombre', 'mens-shoes': 'Calzado de hombre', 'mens-watches': 'Relojes de hombre',
  'mobile-accessories': 'Accesorios para celular', motorcycle: 'Motocicletas', 'skin-care': 'Cuidado de la piel',
  smartphones: 'Celulares', 'sports-accessories': 'Accesorios deportivos', sunglasses: 'Lentes de sol', tablets: 'Tabletas',
  tops: 'Blusas y tops', vehicle: 'Vehículos', 'womens-bags': 'Bolsos', 'womens-dresses': 'Vestidos',
  'womens-jewellery': 'Joyería', 'womens-shoes': 'Calzado de mujer', 'womens-watches': 'Relojes de mujer',
};

function mapDemoProduct(item: DummyProduct): StoreProduct {
  return {
    id: `demo-${item.id}`,
    slug: `demo-${item.id}`,
    nombre: item.title,
    descripcionCorta: item.description,
    descripcionLarga: item.description,
    imagenes: [{ url: item.thumbnail || item.images?.[0] || '', altText: item.title }].filter((image) => !!image.url),
    variantes: [{ id: '', precio: item.price, inventario: { stockDisponible: 0 } }],
    tienda: { nombre: 'Catálogo de demostración' },
    categoria: { nombre: item.category },
    marca: item.brand ? { nombre: item.brand } : null,
    isDemo: true,
  };
}

export async function fetchDemoCategories(): Promise<DemoCategory[]> {
  const response = await fetch('https://dummyjson.com/products/categories', { cache: 'force-cache', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`La API pública respondió ${response.status}.`);
  const categories = await response.json() as Array<{ slug: string; name: string }>;
  return categories.map(({ slug, name }) => ({ id: `demo:${slug}`, slug, nombre: categoryNames[slug] || name }));
}

export async function fetchDemoProducts(search = '', category = '', skip = 0, limit = 24): Promise<DemoProductPage> {
  const query = search.trim();
  const base = 'https://dummyjson.com/products';
  const endpoint = category && query
    ? `${base}?limit=0`
    : category
      ? `${base}/category/${encodeURIComponent(category)}?limit=${limit}&skip=${skip}`
      : query
        ? `${base}/search?q=${encodeURIComponent(query)}&limit=${limit}&skip=${skip}`
        : `${base}?limit=${limit}&skip=${skip}`;
  const response = await fetch(endpoint, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`La API pública respondió ${response.status}.`);
  const data = await response.json() as { products?: DummyProduct[]; total?: number };
  let records = data.products || [];
  if (category && query) records = records.filter((item) => item.category === category && `${item.title} ${item.description} ${item.brand || ''}`.toLowerCase().includes(query.toLowerCase()));
  const total = category && query ? records.length : data.total ?? records.length;
  if (category && query) records = records.slice(skip, skip + limit);
  const items = records.map(mapDemoProduct);
  return { items, total, hasMore: skip + items.length < total };
}

export async function fetchDemoProduct(id: string): Promise<StoreProduct> {
  const response = await fetch(`https://dummyjson.com/products/${encodeURIComponent(id)}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`El producto de demostración respondió ${response.status}.`);
  return mapDemoProduct(await response.json() as DummyProduct);
}

export function externalLink(product: StoreProduct) {
  const raw = product.enlaceAfiliado || product.externalImports?.[0]?.originalUrl || product.amazonImport?.affiliateUrl;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url;
  } catch { return null; }
}

export function externalPlatform(product: StoreProduct, url?: URL | null) {
  const source = `${product.plataformaExterna || product.externalImports?.[0]?.provider || ''} ${url?.hostname || ''}`.toLowerCase();
  if (source.includes('mercari')) return 'Mercari';
  if (source.includes('amazon') || product.amazonImport) return 'Amazon';
  return 'tienda externa';
}

export async function addLocalProductToCart(productoId: string, varianteId?: string) {
  const body = JSON.stringify({ productoId, varianteId, cantidad: 1 });
  const accessToken = window.localStorage.getItem('doomerplace.accessToken');
  if (accessToken) return apiRequest('/cart/items', { method: 'POST', body });

  let sessionToken = window.localStorage.getItem('doomerplace.cartSessionToken');
  if (!sessionToken) {
    const result = await apiRequest<{ tokenSesion: string }>('/cart/session-token');
    sessionToken = result.tokenSesion;
    window.localStorage.setItem('doomerplace.cartSessionToken', sessionToken);
  }
  return apiRequest('/cart/guest/items', { method: 'POST', body, headers: { 'X-Session-Token': sessionToken } });
}
