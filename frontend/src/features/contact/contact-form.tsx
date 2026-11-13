'use client';

import { FormEvent, useState } from 'react';
import { ApiError, supportApi } from '@/lib/api';

/**
 * Formulario de contacto real: valida en el cliente y guarda el mensaje
 * en la API de DoomerPlace (/support/contact) para que el equipo lo revise.
 */
export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await supportApi.sendContactMessage({
        nombre: String(form.get('nombre') || '').trim(),
        email: String(form.get('email') || '').trim(),
        asunto: String(form.get('asunto') || '').trim() || undefined,
        mensaje: String(form.get('mensaje') || '').trim(),
      });
      setSent(result.message);
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'No se pudo enviar tu mensaje. Inténtalo de nuevo en un momento.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="contact-done">
        <div className="success-icon">✓</div>
        <h2>Mensaje enviado.</h2>
        <p>{sent}</p>
      </div>
    );
  }

  return (
    <form className="auth-form contact-form" onSubmit={submit}>
      <div className="field-row">
        <label className="field"><span>Tu nombre</span><input name="nombre" autoComplete="name" placeholder="Tu nombre" maxLength={120} required /></label>
        <label className="field"><span>Tu correo</span><input name="email" type="email" autoComplete="email" placeholder="tu@correo.com" required /></label>
      </div>
      <label className="field"><span>Asunto <small>· opcional</small></span><input name="asunto" placeholder="¿De qué trata tu mensaje?" maxLength={160} /></label>
      <label className="field"><span>Mensaje</span><textarea name="mensaje" placeholder="Cuéntanos en qué te ayudamos…" minLength={10} maxLength={2000} rows={6} required /></label>
      {error && <div className="error-message" role="alert">{error}</div>}
      <button className="button button-primary full-width" type="submit" disabled={busy}>
        {busy ? <><span className="spinner" />Enviando…</> : <>Enviar mensaje<span aria-hidden="true">→</span></>}
      </button>
    </form>
  );
}
