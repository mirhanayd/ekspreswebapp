'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CreditCard, LoaderCircle, LockKeyhole, Ticket } from 'lucide-react';

export default function CheckoutForm({
  tripId,
  seatNo,
  holdId,
  priceMinor,
  routeName,
}: {
  tripId: string;
  seatNo: string;
  holdId: string;
  priceMinor: number;
  routeName: string;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'paying' | 'success'>('form');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('Ad ve soyad zorunludur.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const orderResponse = await fetch('/api/passenger/checkout/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          seatNo,
          holdId,
          passengerFirstName: firstName,
          passengerLastName: lastName,
          passengerPhone: phone || undefined,
          passengerEmail: email || undefined,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      if (orderResponse.status === 401) {
        router.push(`/login?returnTo=${encodeURIComponent(`/trips/${tripId}/seats`)}`);
        return;
      }
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.message || 'Sipariş oluşturulamadı.');
      setStep('paying');
      const paymentResponse = await fetch(`/api/passenger/checkout/order/${order.id}/pay`, {
        method: 'POST',
      });
      const payment = await paymentResponse.json();
      if (!paymentResponse.ok) throw new Error(payment.message || 'Demo ödeme tamamlanamadı.');
      setStep('success');
      window.setTimeout(
        () => router.push(`/trips/${tripId}/checkout/success?orderId=${order.id}`),
        900,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'İşlem tamamlanamadı.');
      setStep('form');
    } finally {
      setLoading(false);
    }
  }
  if (step !== 'form')
    return (
      <div className="py-14 text-center">
        {step === 'paying' ? (
          <LoaderCircle className="mx-auto h-14 w-14 animate-spin text-red-700" />
        ) : (
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100">
            <Check className="h-9 w-9 text-emerald-700" />
          </span>
        )}
        <h2 className="mt-5 text-xl font-black">
          {step === 'paying' ? 'Demo ödeme işleniyor' : 'Ödeme başarılı'}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {step === 'paying' ? 'Güvenli durum geçişi doğrulanıyor…' : 'Biletiniz hazırlanıyor…'}
        </p>
      </div>
    );
  const field = 'field-control';
  return (
    <form onSubmit={submit} className="space-y-7">
      <section className="rounded-2xl border border-red-100 bg-red-50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-red-700">
              Sipariş özeti
            </p>
            <p className="mt-2 font-black text-slate-950">{routeName}</p>
            <p className="mt-1 text-sm text-slate-600">Koltuk {seatNo}</p>
          </div>
          <p className="text-2xl font-black whitespace-nowrap">
            {(priceMinor / 100).toLocaleString('tr-TR')} ₺
          </p>
        </div>
      </section>
      <section>
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Ticket className="h-5 w-5 text-red-700" /> Yolcu bilgileri
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Ad *">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={field}
              required
              autoComplete="given-name"
            />
          </Field>
          <Field label="Soyad *">
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={field}
              required
              autoComplete="family-name"
            />
          </Field>
          <Field label="Telefon">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={field}
              placeholder="05XX XXX XX XX"
              autoComplete="tel"
            />
          </Field>
          <Field label="E-posta">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
              placeholder="ornek@email.com"
              autoComplete="email"
            />
          </Field>
        </div>
      </section>
      <section className="rounded-2xl border border-stone-200 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 text-white">
            <CreditCard className="h-5 w-5" />
          </span>
          <div>
            <p className="font-black">Demo ödeme</p>
            <p className="text-xs text-slate-500">Gerçek kart veya banka işlemi yapılmaz.</p>
          </div>
        </div>
      </section>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
        >
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className="primary-action w-full text-lg">
        <LockKeyhole className="h-5 w-5" />{' '}
        {loading ? 'İşleniyor…' : `${(priceMinor / 100).toLocaleString('tr-TR')} ₺ Demo Öde`}
      </button>
    </form>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  );
}
