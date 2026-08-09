'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('Ad ve soyad zorunludur.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Create order
      const orderRes = await fetch(`${apiUrl}/checkout/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user-id',
          tripId,
          seatNo,
          holdId,
          passengerFirstName: firstName,
          passengerLastName: lastName,
          passengerPhone: phone || undefined,
          passengerEmail: email || undefined,
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json();
        throw new Error(errData.message || 'Sipariş oluşturulamadı');
      }

      const order = await orderRes.json();
      setStep('paying');

      // Step 2: Process demo payment
      const payRes = await fetch(
        `${apiUrl}/checkout/order/${order.id}/pay`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'demo-user-id' }),
        },
      );

      if (!payRes.ok) {
        const errData = await payRes.json();
        throw new Error(errData.message || 'Ödeme işlemi başarısız');
      }

      const result = await payRes.json();
      setStep('success');

      // Redirect to success page after brief delay
      setTimeout(() => {
        router.push(
          `/trips/${tripId}/checkout/success?orderId=${order.id}&ticketNo=${result.ticket.ticketNo}`,
        );
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      setStep('form');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'paying') {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        <p className="text-lg font-semibold text-gray-900">
          Ödeme işleniyor...
        </p>
        <p className="text-sm text-gray-500">
          Demo ödeme simüle ediliyor. Lütfen bekleyin.
        </p>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">✓</span>
        </div>
        <p className="text-lg font-semibold text-green-800">
          Ödeme başarılı!
        </p>
        <p className="text-sm text-gray-500">
          Biletiniz oluşturuluyor, yönlendiriliyorsunuz...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-blue-700">{routeName}</p>
            <p className="font-semibold text-blue-900">Koltuk {seatNo}</p>
          </div>
          <p className="text-xl font-bold text-blue-900">
            {(priceMinor / 100).toFixed(2)} ₺
          </p>
        </div>
      </div>

      {/* Passenger Form */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Yolcu Bilgileri</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-50"
              placeholder="Adınız"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Soyad *
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-50"
              placeholder="Soyadınız"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefon
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-50"
            placeholder="05XX XXX XX XX"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            E-posta
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-50"
            placeholder="ornek@email.com"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-4 px-4 rounded-xl shadow-md transition-colors text-lg"
      >
        {loading ? 'İşleniyor...' : `${(priceMinor / 100).toFixed(2)} ₺ Öde`}
      </button>

      <p className="text-xs text-center text-gray-400">
        Bu bir demo ödemesidir. Gerçek ödeme işlemi yapılmaz.
      </p>
    </form>
  );
}
