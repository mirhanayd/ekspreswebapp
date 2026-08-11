import { AuthForm } from '@/components/AuthForm';
import { AuthShell } from '@/components/AuthShell';

export const metadata = { title: 'Giriş yap' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <AuthShell
      eyebrow="Yolcu hesabı"
      title="Tekrar hoş geldiniz"
      description="Bilet işlemlerinize kaldığınız yerden güvenle devam edin."
      highlights={[
        'Güvenli yolcu oturumu',
        'Hızlı koltuk ve ödeme akışı',
        'Aktif biletle canlı sefer takibi',
      ]}
    >
      <AuthForm mode="login" returnTo={returnTo} />
    </AuthShell>
  );
}
