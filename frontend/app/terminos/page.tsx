import type { Metadata } from 'next';
import { SimplePage } from '@/components/simple-page';

export const metadata: Metadata = {
  title: 'Términos de servicio — DoomerPlace',
  description: 'Condiciones de uso del catálogo de demostración de DoomerPlace.',
};

export default function TerminosPage() {
  return (
    <SimplePage>
      <article className="legal-page">
        <span className="section-kicker">LEGAL</span>
        <h1>Términos de servicio</h1>
        <p className="legal-updated">Versión vigente desde noviembre de 2026. Este texto es un borrador básico del proyecto y debe ser revisado por el equipo de DoomerPlace antes de un lanzamiento comercial.</p>

        <h2>1. Qué es DoomerPlace</h2>
        <p>DoomerPlace es un catálogo en línea en etapa de demostración para descubrir tiendas independientes y sus productos. Los productos marcados como «Producto de muestra» provienen de una API pública de demostración: no son inventario de DoomerPlace y no están a la venta en este sitio.</p>

        <h2>2. Productos de tiendas externas</h2>
        <p>Cuando una tarjeta indica que un producto se vende en una tienda externa, la compra, el pago, el envío, las devoluciones y la garantía se realizan directamente con esa tienda y se rigen por sus propias condiciones. DoomerPlace no procesa esos pagos ni es parte de esa compra.</p>

        <h2>3. Cuentas</h2>
        <p>Para crear una cuenta debes dar información verdadera y mantener tu contraseña en secreto. Eres responsable de la actividad realizada desde tu cuenta. Podemos suspender cuentas que incumplan estos términos o la ley.</p>

        <h2>4. Precios y moneda</h2>
        <p>Los precios del catálogo se muestran en dólares de Estados Unidos (USD) y son referenciales: el precio válido es el que muestre la tienda externa al momento de la compra.</p>

        <h2>5. Uso aceptable</h2>
        <p>No está permitido usar el sitio para actividades ilegales, intentar acceder a cuentas o sistemas sin autorización, ni interferir con el funcionamiento de la plataforma.</p>

        <h2>6. Contenido y disponibilidad</h2>
        <p>El catálogo puede cambiar sin aviso: productos, categorías y precios de demostración pueden aparecer, cambiar o desaparecer. Hacemos esfuerzos razonables por mantener el sitio disponible, sin garantizar operación ininterrumpida.</p>

        <h2>7. Contacto</h2>
        <p>Para preguntas sobre estos términos, escríbenos desde la página de contacto de DoomerPlace.</p>
      </article>
    </SimplePage>
  );
}
