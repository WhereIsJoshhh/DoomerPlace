'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL, ApiError, authApi, saveSession } from '@/lib/api';

type Mode = 'login' | 'register';

export function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const accessToken = window.localStorage.getItem('doomerplace.accessToken');
    const savedUser = window.localStorage.getItem('doomerplace.user');
    if (new URLSearchParams(window.location.search).get('mode') === 'register') setMode('register');
    if (accessToken && savedUser) router.replace('/');
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');

    try {
      const session = mode === 'login'
        ? await authApi.login({ email, password })
        : await authApi.register({
            nombre: String(form.get('nombre') || '').trim(),
            apellido: String(form.get('apellido') || '').trim(),
            email,
            telefono: String(form.get('telefono') || '').trim() || undefined,
            password,
          });
      saveSession(session);
      router.replace('/');
    } catch (requestError) {
      setError(
        requestError instanceof ApiError || requestError instanceof Error
          ? requestError.message
          : 'Ocurrió un error inesperado. Inténtalo de nuevo.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="story-panel" aria-label="Bienvenida a DoomerPlace">
        <a className="brand brand-light" href="#inicio" aria-label="DoomerPlace inicio">
          <span className="brand-mark">d<span>.</span></span><span>doomerplace</span>
        </a>
        <div className="story-copy">
          <span className="eyebrow"><span className="eyebrow-dot" /> EL MERCADO DE LO EXTRAORDINARIO</span>
          <h1>Encuentra eso<br />que no sabías<br /><em>que buscabas.</em></h1>
          <p>Descubre productos únicos de tiendas independientes. Todo lo que te gusta, en un solo lugar.</p>
          <div className="story-proof">
            <div className="avatar-stack" aria-hidden="true"><span>J</span><span>M</span><span>A</span><span>+</span></div>
            <div><strong>Una comunidad que crece</strong><small>Personas comprando con intención</small></div>
          </div>
        </div>
        <div className="story-bottom"><span>Compra local. Descubre más.</span><span>01 — 03</span></div>
        <div className="decor decor-one" /><div className="decor decor-two" />
      </section>

      <section className="form-panel" id="inicio">
        <div className="mobile-brand brand"><span className="brand-mark">d<span>.</span></span><span>doomerplace</span></div>
        <div className="form-wrap">
          <>
              <div className="form-heading">
                <span className="eyebrow eyebrow-dark">{mode === 'login' ? 'TU PRÓXIMO FAVORITO TE ESPERA' : 'EMPIEZA A DESCUBRIR'}</span>
                <h2>{mode === 'login' ? 'Qué bueno tenerte.' : 'Crea tu cuenta.'}</h2>
                <p>{mode === 'login' ? 'Ingresa a tu cuenta y sigue explorando.' : 'Un mundo de tiendas interesantes, a un paso.'}</p>
              </div>

              <div className="mode-switch" role="tablist" aria-label="Acceso o registro">
                <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Iniciar sesión</button>
                <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>Crear cuenta</button>
              </div>

              <form className="auth-form" onSubmit={submit} key={mode}>
                {mode === 'register' && (
                  <div className="field-row">
                    <label className="field"><span>Nombre</span><input name="nombre" autoComplete="given-name" placeholder="Tu nombre" required /></label>
                    <label className="field"><span>Apellido</span><input name="apellido" autoComplete="family-name" placeholder="Tu apellido" required /></label>
                  </div>
                )}
                <label className="field"><span>Correo electrónico</span><input name="email" type="email" autoComplete="email" placeholder="tu@correo.com" required /></label>
                {mode === 'register' && <label className="field"><span>Teléfono <small>· opcional</small></span><input name="telefono" type="tel" autoComplete="tel" placeholder="+502 5555 1234" /></label>}
                <label className="field"><span>Contraseña</span><input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'login' ? 'Tu contraseña' : 'Al menos 8 caracteres'} minLength={mode === 'register' ? 8 : undefined} required /></label>
                {mode === 'login' && <div className="form-meta"><span className="secure-note"><span aria-hidden="true">✳</span> Conexión segura</span><span className="forgot-note">¿Olvidaste tu contraseña?</span></div>}
                {error && <div className="error-message" role="alert">{error}</div>}
                <button className="button button-primary full-width" type="submit" disabled={busy}>
                  {busy ? <><span className="spinner" />{mode === 'login' ? 'Ingresando…' : 'Creando cuenta…'}</> : <>{mode === 'login' ? 'Entrar a mi cuenta' : 'Crear mi cuenta'}<span aria-hidden="true">→</span></>}
                </button>
              </form>
              <p className="terms">Al continuar, aceptas nuestros <a href="#terminos">Términos de servicio</a> y <a href="#privacidad">Política de privacidad</a>.</p>
          </>
        </div>
        <footer className="panel-footer"><span>© 2026 DoomerPlace</span><a href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">API status <span className="online-dot" /></a></footer>
      </section>
    </main>
  );
}
