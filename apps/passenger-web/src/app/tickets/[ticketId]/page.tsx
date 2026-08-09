import { ChevronLeft, QrCode, MapPin, Clock, Bus, User, Map } from 'lucide-react';
import Link from 'next/link';

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  let ticket: any = null;
  let qrToken: string | null = null;
  let error = null;

  try {
    const res = await fetch(`${apiUrl}/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer demo-token` },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Bilet bulunamadı veya erişim yetkiniz yok');
    ticket = await res.json();

    const qrRes = await fetch(`${apiUrl}/tickets/${ticketId}/qr`, {
      headers: { Authorization: `Bearer demo-token` },
      cache: 'no-store',
    });
    if (qrRes.ok) {
      const qrData = await qrRes.json();
      qrToken = qrData.qrToken;
    }
  } catch (err: any) {
    error = err.message;
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <p className="text-red-600 mb-4">{error || 'Bir hata oluştu'}</p>
        <Link href="/tickets" className="text-blue-600 hover:underline">
          Biletlerime Dön
        </Link>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isLiveEligible = ticket.status === 'active'; // Future/Live tracking logic

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/tickets" className="text-gray-500 hover:text-gray-900 flex items-center">
            <ChevronLeft className="h-5 w-5" />
            <span>Geri</span>
          </Link>
          <span className="font-semibold text-gray-900">Bilet Detayı</span>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 mt-6 space-y-6">
        {/* Main Ticket Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-600 px-6 py-4 flex justify-between items-center text-white">
            <span className="font-bold">Siirt Kurtalan Ekspres</span>
            <span className="text-sm text-blue-100">{ticket.ticketNo}</span>
          </div>

          <div className="p-6 space-y-6">
            {/* Route & Times */}
            <div className="flex justify-between items-center relative">
              <div className="absolute left-[50%] top-1/2 w-24 border-t-2 border-dashed border-gray-200 -translate-x-1/2 -translate-y-1/2"></div>

              <div className="text-center z-10 bg-white px-2">
                <p className="text-2xl font-bold text-gray-900">
                  {formatTime(ticket.trip.departureTime)}
                </p>
                <p className="text-sm font-medium text-gray-700">{ticket.trip.route.origin.name}</p>
                <p className="text-xs text-gray-500">{formatDate(ticket.trip.departureTime)}</p>
              </div>

              <div className="text-center z-10 bg-white px-2">
                <p className="text-2xl font-bold text-gray-900">
                  {formatTime(ticket.trip.arrivalTime)}
                </p>
                <p className="text-sm font-medium text-gray-700">
                  {ticket.trip.route.destination.name}
                </p>
                <p className="text-xs text-gray-500">{formatDate(ticket.trip.arrivalTime)}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 flex items-center gap-1 mb-1">
                  <User className="h-4 w-4" /> Yolcu
                </p>
                <p className="font-semibold text-gray-900">
                  {ticket.order.passengerFirstName} {ticket.order.passengerLastName}
                </p>
              </div>
              <div>
                <p className="text-gray-500 flex items-center gap-1 mb-1">
                  <MapPin className="h-4 w-4" /> Koltuk
                </p>
                <p className="font-semibold text-gray-900">{ticket.tripSeat.seatNo}</p>
              </div>
              <div>
                <p className="text-gray-500 flex items-center gap-1 mb-1">
                  <Bus className="h-4 w-4" /> Otobüs
                </p>
                <p className="font-semibold text-gray-900">{ticket.trip.bus.plateNumber}</p>
              </div>
              <div>
                <p className="text-gray-500 flex items-center gap-1 mb-1">
                  <Clock className="h-4 w-4" /> Durum
                </p>
                <p
                  className={`font-semibold ${ticket.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}
                >
                  {ticket.status === 'active'
                    ? 'Aktif'
                    : ticket.status === 'used'
                      ? 'Kullanıldı'
                      : 'İptal'}
                </p>
              </div>
            </div>

            {/* QR Section */}
            <div className="border-t border-dashed border-gray-200 pt-6 text-center">
              <div className="inline-block p-4 border-2 border-gray-100 rounded-2xl bg-white mb-2">
                <QrCode className="h-32 w-32 text-gray-800" />
              </div>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Bu QR kodunu bilet kontrol noktasında okutunuz.
                {qrToken && (
                  <span className="block mt-1 opacity-50 break-all">
                    {qrToken.substring(0, 16)}...
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Live Tracking CTA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${isLiveEligible ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
              >
                <Map className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`font-medium ${isLiveEligible ? 'text-gray-900' : 'text-gray-500'}`}>
                  Canlı Takip
                </h3>
                <p className="text-xs text-gray-500">Otobüsünüzü haritada izleyin</p>
              </div>
            </div>
            {isLiveEligible ? (
              <Link
                href={`/trips/${ticket.trip.id}/live?ticketId=${ticket.id}`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Canlı İzle
              </Link>
            ) : (
              <span className="text-xs text-gray-400">Uygun Değil</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
