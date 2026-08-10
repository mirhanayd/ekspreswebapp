import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <Link href="/" className="text-sm font-semibold text-red-700">
          Siirt Kurtalan Ekspres
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-gray-950">Yolcu girişi</h1>
        <p className="mb-6 mt-2 text-sm text-gray-500">Bilet işlemlerinize güvenle devam edin.</p>
        <AuthForm mode="login" returnTo={returnTo} />
      </div>
    </div>
  );
}
