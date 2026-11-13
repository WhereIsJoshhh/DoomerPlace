import type { Metadata } from 'next';
import { SimplePage } from '@/components/simple-page';

export const metadata: Metadata = {
  title: 'Para Ania — DoomerPlace',
  description: 'Una página escondida de DoomerPlace.',
  robots: { index: false, follow: false },
};

export default function AniaPage() {
  return (
    <SimplePage>
      <section className="ania-page">
        <span className="ania-heart" aria-hidden="true">♥</span>
        <h1>Hola Ania soy Josh deberíamos casarnos</h1>
        <p>— Josh</p>
      </section>
    </SimplePage>
  );
}
