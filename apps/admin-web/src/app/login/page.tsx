import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-red-700">
          Siirt Kurtalan Ekspres
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950">Operasyon Merkezi</h1>
        <p className="mt-2 text-sm text-slate-600">
          Bu alan yalnızca yetkili yönetici hesaplarına açıktır.
        </p>
        <LoginForm />
        <p className="mt-5 text-xs text-slate-500">
          Demo ortamı • Gerçek ödeme veya GPS verisi içermez
        </p>
      </section>
    </main>
  );
}
