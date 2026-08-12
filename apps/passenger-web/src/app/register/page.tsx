import { AuthForm } from '@/components/AuthForm';
import { AuthShell } from '@/components/AuthShell';

export const metadata = { title: 'Hesap oluştur' };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <AuthShell
      eyebrow="Yeni yolcu"
      title="Hesabınızı oluşturun"
      description="Seferlerinizi, biletlerinizi ve canlı takibi tek hesapta yönetin."
      highlights={[
        'Biletleriniz hesabınızda saklanır',
        'Koltuk seçimi saniyeler içinde',
        'QR ile temassız biniş',
      ]}
    >
      <AuthForm mode="register" returnTo={returnTo} />
    </AuthShell>
  );
}
