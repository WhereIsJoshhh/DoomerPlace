'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, authApi } from '@/lib/api';

/** Paso 2: crear la contraseña nueva con el token del enlace (?token=…). */
export function ResetForm() {
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
    setReady(true);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    const confirmation = String(form.get('confirmation') || '');
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await authApi.resetPassword(token, password);
      setDone(result.message);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No se pudo restablecer la contraseña. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="form-wrap">
        <div className="form-heading">
          <span className="eyebrow eyebrow-dark">LISTO</span>
          <h2>Contraseña restablecida.</h2>
          <p>{done}</p>
        </div>
        <Link className="button button-primary full-width" href="/login">Iniciar sesión</Link>
      </div>
    );
  }

  if (ready && !token) {
    return (
      <div className="form-wrap">
        <div className="form-heading">
          <span className="eyebrow eyebrow-dark">ENLACE INCOMPLETO</span>
          <h2>Falta el código del enlace.</h2>
          <p>Abre el enlace completo que te enviamos por correo, o solicita uno nuevo.</p>
        </div>
        <Link className="button button-secondary full-width" href="/recuperar">Solicitar un enlace nuevo</Link>
      </div>
    );
  }

  return (
    <div className="form-wrap">
      <div className="form-heading">
        <span className="eyebrow eyebrow-dark">CREA UNA CONTRASEÑA NUEVA</span>
        <h2>Restablecer contraseña.</h2>
        <p>Elige una contraseña de al menos 8 caracteres.</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label className="field"><span>Contraseña nueva</span><input name="password" type="password" autoComplete="new-password" placeholder="Al menos 8 caracteres" minLength={8} required /></label>
        <label className="field"><span>Confirmar contraseña</span><input name="confirmation" type="password" autoComplete="new-password" placeholder="Repite tu contraseña" minLength={8} required /></label>
        {error && <div className="error-message" role="alert">{error}</div>}
        <button className="button button-primary full-width" type="submit" disabled={busy || !ready}>
          {busy ? <><span className="spinner" />Guardando…</> : <>Guardar contraseña nueva<span aria-hidden="true">→</span></>}
        </button>
      </form>
      <p className="terms"><Link href="/recuperar">Solicitar un enlace nuevo</Link></p>
    </div>
  );
}
