const FAVORITES_KEY = 'doomerplace.favorites';

/** Favoritos locales del visitante (sin cuenta): se guardan en su navegador. */
export function loadFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = window.localStorage.getItem(FAVORITES_KEY);
    const parsed = saved ? (JSON.parse(saved) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function saveFavorites(favorites: string[]) {
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

/** Alterna un favorito y devuelve la lista nueva. */
export function toggleFavorite(productId: string): string[] {
  const current = loadFavorites();
  const next = current.includes(productId)
    ? current.filter((id) => id !== productId)
    : [...current, productId];
  saveFavorites(next);
  return next;
}
