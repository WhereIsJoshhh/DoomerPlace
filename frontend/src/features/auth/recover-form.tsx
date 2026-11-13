'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ApiError, authApi } from '@/lib/api';

/** Paso 1: pedir el enlace de restablecimiento. La respuesta es genérica. */
export function RecoverForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const email = String(new FormData(event.currentTarget).get('email') || '').trim();
    try {
      const result = await authApi.forgotPassword(email);
      setSent(result.message);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'No se pudo enviar la solicitud. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="form-wrap">
        <div className="form-heading">
          <span className="eyebrow eyebrow-dark">REVISA TU CORREO</span>
          <h2>Solicitud enviada.</h2>
          <p>{sent}</p>
        </div>
        <p className="notice">El enlace vence en 1 hora. Si no lo ves, revisa tu carpeta de spam.</p>
        <Link className="button button-secondary full-width" href="/login">Volver a iniciar sesión</Link>
      </div>
    );
  }

  return (
    <div className="form-wrap">
      <div className="form-heading">
        <span className="eyebrow eyebrow-dark">RECUPERA TU CUENTA</span>
        <h2>¿Olvidaste tu contraseña?</h2>
        <p>Escribe el correo de tu cuenta y te enviaremos un enlace para restablecerla.</p>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label className="field"><span>Correo electrónico</span><input name="email" type="email" autoComplete="email" placeholder="tu@correo.com" required /></label>
        {error && <div className="error-message" role="alert">{error}</div>}
        <button className="button button-primary full-width" type="submit" disabled={busy}>
          {busy ? <><span className="spinner" />Enviando…</> : <>Enviar enlace<span aria-hidden="true">→</span></>}
        </button>
      </form>
      <p className="terms"><Link href="/login">Volver a iniciar sesión</Link></p>
    </div>
  );
}
