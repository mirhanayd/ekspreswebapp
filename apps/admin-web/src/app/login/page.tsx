import Image from 'next/image';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Giriş | Operasyon Merkezi' };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-adm-bg px-4 py-10">
      <section className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center">
          <Image
            src="/brand/logo.png"
            alt="Siirt Kurtalan Ekspres"
            width={130}
            height={52}
            priority
          />
        </div>

        <div className="surface p-6 sm:p-8">
          <span className="grid h-11 w-11 place-items-center rounded-btn bg-adm-sel-bg text-adm-sel-text">
            <LockKeyhole className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="page-title mt-4">Yönetici girişi</h1>
          <p className="mt-1.5 text-sm text-adm-muted">
            Bu alan yalnızca yetkili yönetici hesaplarına açıktır.
          </p>

          <LoginForm />

          <p className="mt-6 flex items-start gap-2 border-t border-adm-line pt-4 text-xs leading-5 text-adm-muted">
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            Oturumlar sunucu tarafında doğrulanır. Yolcu hesapları bu panele erişemez.
          </p>
        </div>
      </section>
    </main>
  );
}
