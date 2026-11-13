export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || (process.env.NODE_ENV === 'production' ? '/api/v1' : 'http://localhost:3000/api/v1')).replace(/\/$/, '');

export type ApiUser = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  roles: string[];
  permisos?: Array<{ modulo: string; accion: string }>;
};

export type AuthResponse = {
  user: ApiUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: string;
  };
};

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  password: string;
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function getStoredAccessToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('doomerplace.accessToken');
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getStoredAccessToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: 'no-store' });
  } catch {
    throw new ApiError('No se pudo conectar con la API. Comprueba que el backend esté activo.', 0);
  }

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const rawMessage = typeof body === 'object' && body !== null
      ? body.message ?? body.detail ?? body.error
      : body;
    const message = Array.isArray(rawMessage) ? rawMessage.join(' ') : rawMessage;
    throw new ApiError(typeof message === 'string' && message ? message : `La solicitud falló (${response.status}).`, response.status);
  }

  // Nest's global TransformInterceptor wraps successful responses in { success, data, ... }.
  if (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    'data' in body
  ) {
    return (body as { data: T }).data;
  }

  return body as T;
}

export const authApi = {
  login: (payload: LoginPayload) => apiRequest<AuthResponse>('/auth/login', {
    method: 'POST', body: JSON.stringify(payload),
  }),
  register: (payload: RegisterPayload) => apiRequest<AuthResponse>('/auth/register', {
    method: 'POST', body: JSON.stringify(payload),
  }),
  forgotPassword: (email: string) => apiRequest<{ message: string }>('/auth/forgot-password', {
    method: 'POST', body: JSON.stringify({ email }),
  }),
  resetPassword: (token: string, nuevaPassword: string) => apiRequest<{ message: string }>('/auth/reset-password', {
    method: 'POST', body: JSON.stringify({ token, nuevaPassword }),
  }),
};

export const supportApi = {
  sendContactMessage: (payload: { nombre: string; email: string; asunto?: string; mensaje: string }) =>
    apiRequest<{ id: string; message: string }>('/support/contact', {
      method: 'POST', body: JSON.stringify(payload),
    }),
};

export function saveSession(session: AuthResponse) {
  if (!session?.user || !session.tokens?.accessToken || !session.tokens?.refreshToken) {
    throw new ApiError('La API respondió sin los tokens de sesión esperados.', 502);
  }
  window.localStorage.setItem('doomerplace.accessToken', session.tokens.accessToken);
  window.localStorage.setItem('doomerplace.refreshToken', session.tokens.refreshToken);
  window.localStorage.setItem('doomerplace.user', JSON.stringify(session.user));
}

export function clearSession() {
  window.localStorage.removeItem('doomerplace.accessToken');
  window.localStorage.removeItem('doomerplace.refreshToken');
  window.localStorage.removeItem('doomerplace.user');
}
