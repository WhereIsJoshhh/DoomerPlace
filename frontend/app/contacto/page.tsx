import type { Metadata } from 'next';
import { SimplePage } from '@/components/simple-page';
import { ContactForm } from '@/features/contact/contact-form';

export const metadata: Metadata = {
  title: 'Contacto — DoomerPlace',
  description: 'Escríbele al equipo de DoomerPlace: dudas, tiendas y sugerencias.',
};

export default function ContactoPage() {
  return (
    <SimplePage>
      <section className="simple-heading">
        <span className="section-kicker">CONTACTO Y SOPORTE</span>
        <h1>Hablemos.</h1>
        <p>Este formulario es el canal de contacto de DoomerPlace. Déjanos tu mensaje y tu correo: el equipo lo revisa en la plataforma y te responde a ese correo. Por ahora no publicamos un correo de soporte directo.</p>
      </section>
      <ContactForm />
    </SimplePage>
  );
}
