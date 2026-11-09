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
};

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
