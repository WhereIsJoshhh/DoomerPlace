import type { Metadata } from 'next';
import { SimplePage } from '@/components/simple-page';

export const metadata: Metadata = {
  title: 'Política de privacidad — DoomerPlace',
  description: 'Cómo trata DoomerPlace los datos de sus visitantes y usuarios.',
};

export default function PrivacidadPage() {
  return (
    <SimplePage>
      <article className="legal-page">
        <span className="section-kicker">LEGAL</span>
        <h1>Política de privacidad</h1>
        <p className="legal-updated">Versión vigente desde noviembre de 2026. Este texto es un borrador básico del proyecto y debe ser revisado por el equipo de DoomerPlace antes de un lanzamiento comercial.</p>

        <h2>1. Datos que recopilamos</h2>
        <p>De tu cuenta: nombre, apellido, correo electrónico y, si lo das, tu teléfono. De contacto: el nombre, correo y mensaje que envías por el formulario de contacto. En tu navegador: tu sesión y tus productos favoritos se guardan localmente en tu propio dispositivo (localStorage), no en nuestros servidores.</p>

        <h2>2. Para qué los usamos</h2>
        <p>Usamos esos datos solo para operar el sitio: permitirte iniciar sesión, responder tus mensajes de contacto, mantener la seguridad de las cuentas (por ejemplo, el restablecimiento de contraseña) y mejorar el catálogo.</p>

        <h2>3. Qué no hacemos</h2>
        <p>No vendemos tus datos personales. No procesamos pagos en este sitio en su etapa de demostración: si compras en una tienda externa, esa tienda trata tus datos de pago bajo su propia política.</p>

        <h2>4. Servicios externos</h2>
        <p>El catálogo de demostración carga productos e imágenes de servicios públicos externos (como la API pública de productos e imágenes de muestra). Esos servicios pueden recibir tu dirección IP al cargar su contenido, según sus propias políticas.</p>

        <h2>5. Tus derechos</h2>
        <p>Puedes pedirnos ver, corregir o eliminar los datos de tu cuenta y de tus mensajes de contacto, escribiéndonos desde la página de contacto e identificándote con el correo de tu cuenta.</p>

        <h2>6. Seguridad</h2>
        <p>Las contraseñas se guardan con hash y los tokens de restablecimiento también se almacenan con hash y caducan en 1 hora. Ningún sistema es perfecto: si detectas un problema de seguridad, avísanos por la página de contacto.</p>

        <h2>7. Cambios</h2>
        <p>Si cambiamos esta política, publicaremos la versión nueva en esta misma página con su fecha.</p>
      </article>
    </SimplePage>
  );
}
