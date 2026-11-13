import { apiRequest } from './api';
import { matchesSearch } from './search';

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

type DummyProduct = { id: number | string; title: string; description: string; category: string; price: number; brand?: string; thumbnail?: string; images?: string[] };
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
  'libros-papeleria': 'Libros y papelería', videojuegos: 'Videojuegos', mascotas: 'Mascotas',
  oficina: 'Oficina', juguetes: 'Juguetes', viaje: 'Viaje',
};

// Productos locales de muestra para que el catálogo siga teniendo contenido
// incluso si la API pública está temporalmente fuera de servicio.
const curatedDemoProducts: DummyProduct[] = [
  { id: 'x-001', title: 'Cuaderno de tapa dura', description: 'Cuaderno de 200 páginas con papel de alta calidad para notas y bocetos.', category: 'libros-papeleria', price: 12.5, brand: 'Paper Studio', thumbnail: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=800&q=80' },
  { id: 'x-002', title: 'Agenda semanal minimalista', description: 'Agenda sin fechas con vista semanal, separadores y bolsillo interior.', category: 'libros-papeleria', price: 18, brand: 'Paper Studio', thumbnail: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80' },
  { id: 'x-003', title: 'Set de lápices de dibujo', description: 'Set de 12 lápices de grafito con diferentes durezas para ilustración.', category: 'libros-papeleria', price: 9.99, brand: 'Artline', thumbnail: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80' },
  { id: 'x-004', title: 'Audífonos inalámbricos', description: 'Audífonos Bluetooth con estuche compacto y micrófono integrado.', category: 'videojuegos', price: 39.99, brand: 'Soundwave', thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80' },
  { id: 'x-005', title: 'Control inalámbrico', description: 'Control ergonómico de muestra con conexión inalámbrica y batería recargable.', category: 'videojuegos', price: 54.99, brand: 'Playpoint', thumbnail: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=800&q=80' },
  { id: 'x-006', title: 'Teclado mecánico compacto', description: 'Teclado mecánico compacto con iluminación regulable y cable USB-C.', category: 'videojuegos', price: 69, brand: 'Keycraft', thumbnail: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80' },
  { id: 'x-007', title: 'Cama acolchada para mascota', description: 'Cama suave con funda removible y base antideslizante.', category: 'mascotas', price: 32, brand: 'Huellitas', thumbnail: 'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?auto=format&fit=crop&w=800&q=80' },
  { id: 'x-008', title: 'Botella portátil para paseo', description: 'Botella para agua con bebedero integrado, ideal para paseos.', category: 'mascotas', price: 14.5, brand: 'Huellitas', thumbnail: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80' },
  { id: 'x-009', title: 'Rascador de cartón', description: 'Rascador ligero para gatos con superficie reversible.', category: 'mascotas', price: 16, brand: 'Michi Home', thumbnail: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80' },
  { id: 'x-010', title: 'Lámpara de escritorio LED', description: 'Lámpara ajustable con tres tonos de luz y control táctil.', category: 'oficina', price: 27.5, brand: 'Work & Co.', thumbnail: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80' },
  { id: 'x-011', title: 'Organizador de escritorio', description: 'Organizador modular para mantener lápices y accesorios en orden.', category: 'oficina', price: 15, brand: 'Work & Co.', thumbnail: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=800&q=80' },
  { id: 'x-012', title: 'Soporte ajustable para laptop', description: 'Soporte plegable de aluminio con altura ajustable para computadora.', category: 'oficina', price: 34.99, brand: 'Deskform', thumbnail: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80' },
  { id: 'x-013', title: 'Bloques de construcción', description: 'Set de construcción de muestra para estimular la creatividad.', category: 'juguetes', price: 24.99, brand: 'Imagina', thumbnail: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80' },
  { id: 'x-014', title: 'Rompecabezas ilustrado', description: 'Rompecabezas de 500 piezas con ilustración colorida.', category: 'juguetes', price: 19.5, brand: 'Imagina', thumbnail: 'https://images.unsplash.com/photo-1606503153255-59d8b8b8217e?auto=format&fit=crop&w=800&q=80' },
  { id: 'x-015', title: 'Set de acuarelas', description: 'Set de acuarelas de muestra con pincel y paleta mezcladora.', category: 'juguetes', price: 21, brand: 'Color Pop', thumbnail: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80' },
  { id: 'x-016', title: 'Mochila urbana', description: 'Mochila ligera con compartimento acolchado y bolsillos laterales.', category: 'viaje', price: 48, brand: 'Rumbo', thumbnail: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80' },
  { id: 'x-017', title: 'Organizadores de equipaje', description: 'Set de bolsas para separar ropa y accesorios dentro de la maleta.', category: 'viaje', price: 22, brand: 'Rumbo', thumbnail: 'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?auto=format&fit=crop&w=800&q=80' },
  { id: 'x-018', title: 'Botella térmica de viaje', description: 'Botella reutilizable de acero inoxidable para llevar bebidas.', category: 'viaje', price: 25, brand: 'Nómada', thumbnail: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80' },
];

const curatedDemoCategories: DemoCategory[] = [
  { id: 'demo:libros-papeleria', slug: 'libros-papeleria', nombre: 'Libros y papelería' },
  { id: 'demo:videojuegos', slug: 'videojuegos', nombre: 'Videojuegos' },
  { id: 'demo:mascotas', slug: 'mascotas', nombre: 'Mascotas' },
  { id: 'demo:oficina', slug: 'oficina', nombre: 'Oficina' },
  { id: 'demo:juguetes', slug: 'juguetes', nombre: 'Juguetes' },
  { id: 'demo:viaje', slug: 'viaje', nombre: 'Viaje' },
];

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
    categoria: { nombre: categoryNames[item.category] || item.category },
    marca: item.brand ? { nombre: item.brand } : null,
    isDemo: true,
  };
}

export async function fetchDemoCategories(): Promise<DemoCategory[]> {
  try {
    const response = await fetch('https://dummyjson.com/products/categories', { cache: 'force-cache', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`La API pública respondió ${response.status}.`);
    const categories = await response.json() as Array<{ slug: string; name: string }>;
    const publicCategories = categories.map(({ slug, name }) => ({ id: `demo:${slug}`, slug, nombre: categoryNames[slug] || name }));
    return [...publicCategories, ...curatedDemoCategories];
  } catch {
    return curatedDemoCategories;
  }
}

export async function fetchDemoProducts(search = '', category = '', skip = 0, limit = 24): Promise<DemoProductPage> {
  const query = search.trim();
  const base = 'https://dummyjson.com/products';
  const isCuratedCategory = curatedDemoCategories.some((item) => item.slug === category);

  // Con búsqueda activa se descarga el catálogo público completo y se
  // filtra aquí, normalizando AMBOS lados (consulta y texto del producto):
  // "máscara", "mascara" y "MASCARA" devuelven el mismo resultado.
  // La búsqueda propia de DummyJSON no ignora tildes, por eso no se usa.
  if (query) {
    let all: DummyProduct[] = [];
    try {
      const response = await fetch(`${base}?limit=0`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`La API pública respondió ${response.status}.`);
      const data = await response.json() as { products?: DummyProduct[] };
      all = data.products || [];
    } catch {
      // Sin red, la colección local de muestra sigue disponible abajo.
    }
    const publicMatches = all.filter((item) =>
      (!category || item.category === category) &&
      matchesSearch(`${item.title} ${item.description} ${item.brand || ''} ${categoryNames[item.category] || item.category}`, query),
    );
    const curatedMatches = curatedDemoProducts.filter((item) =>
      (!category || item.category === category) &&
      matchesSearch(`${item.title} ${item.description} ${item.brand || ''} ${categoryNames[item.category] || item.category}`, query),
    );
    const combined = [...publicMatches.map(mapDemoProduct), ...curatedMatches.map(mapDemoProduct)];
    const items = combined.slice(skip, skip + limit);
    return { items, total: combined.length, hasMore: skip + items.length < combined.length };
  }

  const endpoint = isCuratedCategory ? '' : category
    ? `${base}/category/${encodeURIComponent(category)}?limit=${limit}&skip=${skip}`
    : `${base}?limit=${limit}&skip=${skip}`;
  let data: { products?: DummyProduct[]; total?: number } = { products: [], total: 0 };
  if (endpoint) {
    try {
      const response = await fetch(endpoint, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`La API pública respondió ${response.status}.`);
      data = await response.json() as { products?: DummyProduct[]; total?: number };
    } catch {
      // La colección local mantiene el catálogo de muestra disponible sin red.
    }
  }
  const records = data.products || [];
  const publicTotal = data.total ?? records.length;
  const publicItems = records.map(mapDemoProduct);
  const curated = curatedDemoProducts.filter((item) => !category || item.category === category);
  const curatedStart = Math.max(0, skip - publicTotal);
  const curatedPage = curated.slice(curatedStart, curatedStart + Math.max(0, limit - publicItems.length)).map(mapDemoProduct);
  const items = [...publicItems, ...curatedPage];
  const total = publicTotal + curated.length;
  return { items, total, hasMore: skip + items.length < total };
}

export async function fetchDemoProduct(id: string): Promise<StoreProduct> {
  const curated = curatedDemoProducts.find((item) => String(item.id) === id);
  if (curated) return mapDemoProduct(curated);
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
