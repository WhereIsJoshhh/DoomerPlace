import type { Metadata } from 'next';
import { SimplePage } from '@/components/simple-page';
import { RecoverForm } from '@/features/auth/recover-form';

export const metadata: Metadata = {
  title: 'Recuperar contraseña — DoomerPlace',
  description: 'Solicita un enlace para restablecer la contraseña de tu cuenta de DoomerPlace.',
};

export default function RecuperarPage() {
  return (
    <SimplePage>
      <RecoverForm />
    </SimplePage>
  );
}
