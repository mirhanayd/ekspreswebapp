import { ChevronRight, CreditCard } from 'lucide-react';
import CheckoutForm from './CheckoutForm';

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ seatNo?: string; holdId?: string; price?: string }>;
}) {
  const { id } = await params;
  const { seatNo, holdId, price } = await searchParams;

  if (!seatNo || !holdId || !price) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Koltuk seçimi gerekli
          </h2>
          <p className="text-gray-500 mb-6">
            Ödeme yapabilmek için önce bir koltuk seçmelisiniz.
          </p>
          <a
            href={`/trips/${id}/seats`}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Koltuk Seçimine Dön
          </a>
        </div>
      </div>
    );
  }

  // Fetch trip info for route name
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  let routeName = 'Sefer';

  try {
    const tripRes = await fetch(`${apiUrl}/transport/trips/${id}`, {
      cache: 'no-store',
    });
    if (tripRes.ok) {
      const tripData = await tripRes.json();
      routeName = `${tripData.route?.origin?.name || ''} → ${tripData.route?.destination?.name || ''}`;
    }
  } catch {
    // Use default route name
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-lg mx-auto px-4 space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <a href="/" className="hover:text-gray-700">
            Ana Sayfa
          </a>
          <ChevronRight className="h-4 w-4" />
          <a href={`/trips/${id}/seats`} className="hover:text-gray-700">
            Koltuk Seçimi
          </a>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">Ödeme</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" /> Ödeme
          </h1>
          <p className="text-gray-500 mt-1">
            Yolcu bilgilerinizi girin ve ödemenizi tamamlayın.
          </p>
        </div>

        {/* Checkout Form */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <CheckoutForm
            tripId={id}
            seatNo={seatNo}
            holdId={holdId}
            priceMinor={parseInt(price, 10)}
            routeName={routeName}
          />
        </div>
      </div>
    </div>
  );
}
