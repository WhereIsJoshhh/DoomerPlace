# DoomerPlace Frontend

Primer frontend de DoomerPlace, separado del backend NestJS.

## Desarrollo local

Requiere Node.js 20.9 o superior.

Instala una sola vez las dependencias del frontend:

```powershell
npm install
```

Crea `frontend/.env.local` copiando `.env.local.example` la primera vez. Después, desde la raíz del proyecto, inicia ambos servidores juntos:

```powershell
npm run dev:all
```

Abre <http://localhost:3001>. La portada muestra categorías y productos públicos de la API; el acceso está en <http://localhost:3001/login>. Después de iniciar sesión o registrarte, se abre automáticamente la portada. La API corre en <http://localhost:3000>. Presiona `Ctrl+C` para detener ambos. Si necesitas arrancar solo el frontend, usa `npm run dev` dentro de `frontend`.

La pantalla implementa inicio de sesión y registro de comprador contra `POST /auth/login` y `POST /auth/register`. El cliente HTTP añade `Authorization: Bearer …` cuando hay una sesión guardada.

## Estado de la sesión

El backend actual devuelve access y refresh tokens en el cuerpo JSON, así que esta primera integración los guarda en `localStorage` y no envía cookies. Para despliegues públicos conviene migrar el backend a cookies `HttpOnly`, `Secure` y `SameSite`.
