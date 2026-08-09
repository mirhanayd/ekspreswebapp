import { CheckCircle, Ticket, ChevronRight } from 'lucide-react';

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ orderId?: string; ticketNo?: string }>;
}) {
  const { id } = await params;
  const { orderId, ticketNo } = await searchParams;

  // Fetch order details
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  let orderData: any = null;

  if (orderId) {
    try {
      const res = await fetch(`${apiUrl}/checkout/order/${orderId}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        orderData = await res.json();
      }
    } catch {
      // Fallback to basic info
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-lg mx-auto px-4 space-y-6">
        {/* Success Header */}
        <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 text-center space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Biletiniz hazır!</h1>
          <p className="text-gray-500">
            Ödemeniz başarıyla tamamlandı. Bilet detaylarınız aşağıdadır.
          </p>
        </div>

        {/* Ticket Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-600 px-6 py-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                <span className="font-bold">Siirt Kurtalan Ekspres</span>
              </div>
              <span className="text-blue-100 text-sm">{ticketNo || 'TKT-XXXXXXXX'}</span>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {orderData ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Güzergah</p>
                    <p className="font-semibold text-gray-900">
                      {orderData.trip?.route?.origin?.name} →{' '}
                      {orderData.trip?.route?.destination?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Koltuk</p>
                    <p className="font-semibold text-gray-900">{orderData.tripSeat?.seatNo}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Yolcu</p>
                    <p className="font-semibold text-gray-900">
                      {orderData.passengerFirstName} {orderData.passengerLastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tutar</p>
                    <p className="font-semibold text-gray-900">
                      {(orderData.totalMinor / 100).toFixed(2)} ₺
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Otobüs</p>
                    <p className="font-semibold text-gray-900">
                      {orderData.trip?.bus?.plateNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sipariş No</p>
                    <p className="font-semibold text-gray-900">{orderData.orderNo}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-500">
                <p>Bilet No: {ticketNo}</p>
              </div>
            )}

            {/* QR Placeholder */}
            <div className="border-t border-dashed border-gray-200 pt-4 mt-4">
              <div className="w-32 h-32 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center mx-auto">
                <span className="text-gray-400 text-sm">QR Kod</span>
              </div>
              <p className="text-xs text-center text-gray-400 mt-2">
                QR kodu bilet kontrolünde gösteriniz.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <a
            href="/"
            className="flex-1 text-center py-3 px-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Ana Sayfa
          </a>
          <a
            href={`/trips/${id}`}
            className="flex-1 text-center py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-semibold shadow-md"
          >
            Sefer Detayı
          </a>
        </div>
      </div>
    </div>
  );
}
