'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Check,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import { formatMinorPrice } from '@/lib/format';

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
      <div className="py-14 text-center" role="status" aria-live="polite">
        {step === 'paying' ? (
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-50">
            <LoaderCircle className="h-9 w-9 animate-spin text-brand-700" aria-hidden />
          </span>
        ) : (
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 ring-8 ring-emerald-50">
            <Check className="h-9 w-9 text-emerald-700" aria-hidden />
          </span>
        )}
        <h2 className="title-md mt-5">
          {step === 'paying' ? 'Demo ödeme işleniyor' : 'Ödeme onaylandı'}
        </h2>
        <p className="subtle mx-auto mt-2 max-w-sm">
          {step === 'paying'
            ? 'Sipariş ve koltuk durumu sunucuda doğrulanıyor…'
            : 'Biletiniz oluşturuluyor, birazdan yönlendirileceksiniz.'}
        </p>
        <p className="mt-4 text-sm font-semibold text-ink-500">
          {routeName} · Koltuk {seatNo}
        </p>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-7">
      <section>
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
            <UserRound className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="title-md">Yolcu bilgileri</h2>
            <p className="text-xs text-ink-500">Bilet bu bilgilerle düzenlenir.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Ad *">
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="field"
              required
              autoComplete="given-name"
            />
          </Field>
          <Field label="Soyad *">
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="field"
              required
              autoComplete="family-name"
            />
          </Field>
          <Field label="Telefon" hint="Sefer bilgilendirmesi için">
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="field"
              placeholder="05XX XXX XX XX"
              autoComplete="tel"
            />
          </Field>
          <Field label="E-posta" hint="Bilet kopyası için">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field"
              placeholder="ornek@email.com"
              autoComplete="email"
            />
          </Field>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
            <LockKeyhole className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="title-md">Ödeme yöntemi</h2>
            <p className="text-xs text-ink-500">Sunum ortamı için simüle edilmiş akış.</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border-2 border-brand-700 bg-brand-50/60 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-700 text-white">
              <Check className="h-3 w-3" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-display font-bold text-ink-900">Demo ödeme</p>
              <p className="mt-1 text-sm leading-6 text-ink-600">
                Bu ortamda kart bilgisi istenmez ve gerçek para hareketi oluşmaz. Sipariş, ödeme ve
                bilet durum geçişleri gerçek servis akışıyla aynı şekilde sunucuda doğrulanır.
              </p>
            </div>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              { icon: ShieldCheck, text: 'Fiyat sunucuda doğrulanır' },
              { icon: BadgeCheck, text: 'Koltuk çakışması engellenir' },
            ].map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-ink-700 ring-1 ring-inset ring-brand-100"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-brand-700" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {error ? (
        <p role="alert" className="alert-error">
          <TriangleAlert className="mr-1.5 inline h-4 w-4 align-text-bottom" aria-hidden />
          {error}
        </p>
      ) : null}

      <div>
        <button type="submit" disabled={loading} className="btn btn-primary w-full text-base">
          <LockKeyhole className="h-4 w-4" aria-hidden />
          {loading ? 'İşleniyor…' : `${formatMinorPrice(priceMinor)} Demo Öde`}
        </button>
        <p className="mt-3 text-center text-2xs leading-5 text-ink-500">
          Devam ederek sefer koşullarını kabul etmiş olursunuz. Biletiniz ödeme sonrası anında
          oluşturulur.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label flex items-baseline justify-between gap-2">
        <span>{label}</span>
        {hint ? (
          <span className="font-medium normal-case tracking-normal text-ink-400">{hint}</span>
        ) : null}
      </span>
      {children}
    </label>
  );
}
