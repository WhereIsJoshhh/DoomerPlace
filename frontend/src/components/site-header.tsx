'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiUser, clearSession } from '@/lib/api';

/**
 * Encabezado principal compartido: marca, navegación completa,
 * búsqueda (fuera de la portada) y acceso a la cuenta.
 * En móvil la navegación se abre con el botón de menú (☰).
 */
export function SiteHeader({ showSearch = false }: { showSearch?: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const savedUser = window.localStorage.getItem('doomerplace.user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser) as ApiUser); } catch { clearSession(); }
    }
  }, []);

  function logout() {
    clearSession();
    setUser(null);
    setMenuOpen(false);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/?buscar=${encodeURIComponent(trimmed)}` : '/');
  }

  return (
    <header className="store-header">
      <Link className="store-brand" href="/" aria-label="DoomerPlace, inicio"><span className="store-brand-mark">d<span>.</span></span>doomerplace</Link>
      <button
        type="button"
        className="menu-toggle"
        aria-expanded={menuOpen}
        aria-controls="navegacion-principal"
        aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
      </button>
      <nav className={`store-nav ${menuOpen ? 'open' : ''}`} id="navegacion-principal" aria-label="Navegación principal">
        <Link href="/#productos" onClick={() => setMenuOpen(false)}>Descubrir</Link>
        <Link href="/#categorias" onClick={() => setMenuOpen(false)}>Categorías</Link>
        <Link href="/#sobre" onClick={() => setMenuOpen(false)}>Nuestra idea</Link>
        <Link href="/contacto" onClick={() => setMenuOpen(false)}>Contacto</Link>
      </nav>
      {showSearch && (
        <form className="header-search" onSubmit={submitSearch} role="search">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar productos" aria-label="Buscar productos" />
          <button type="submit">Buscar</button>
        </form>
      )}
      <div className="store-actions">
        {user ? <><span className="store-user">Hola, {user.nombre}</span><button className="store-login" onClick={logout}>Cerrar sesión</button></> : <Link className="store-login" href="/login">Iniciar sesión</Link>}
        {!user && <Link className="store-join" href="/login?mode=register">Crear cuenta <span>↗</span></Link>}
      </div>
    </header>
  );
}
