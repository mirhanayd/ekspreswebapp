import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <div className="page-shell">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="text-sm font-bold text-red-700">
          ← Ana sayfa
        </Link>
        <div className="surface-card mt-5 p-6 sm:p-8">
          <p className="eyebrow">Yeni yolcu</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Hesabınızı oluşturun</h1>
          <p className="mb-7 mt-2 text-sm leading-6 text-slate-600">
            Seferlerinizi ve biletlerinizi tek hesapta yönetin.
          </p>
          <AuthForm mode="register" returnTo={returnTo} />
        </div>
      </div>
    </div>
  );
}
