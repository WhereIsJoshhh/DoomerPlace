/**
 * Normaliza un texto para buscar sin importar tildes, mayúsculas
 * ni espacios extremos o repetidos.
 * Ejemplo: "  MÁSCARA " y "mascara" quedan como "mascara".
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita las marcas diacríticas (tildes)
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function matchesSearch(haystack: string, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return normalizeSearchText(haystack).includes(normalizedQuery);
}
