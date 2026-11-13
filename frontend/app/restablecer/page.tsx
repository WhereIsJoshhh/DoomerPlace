import type { Metadata } from 'next';
import { SimplePage } from '@/components/simple-page';
import { ResetForm } from '@/features/auth/reset-form';

export const metadata: Metadata = {
  title: 'Restablecer contraseña — DoomerPlace',
  description: 'Crea una contraseña nueva para tu cuenta de DoomerPlace.',
};

export default function RestablecerPage() {
  return (
    <SimplePage>
      <ResetForm />
    </SimplePage>
  );
}
