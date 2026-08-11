import { Activity, BusFront, CircleUserRound, ReceiptText, Ticket } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { AdminOverview } from '@/lib/admin-types';
import { adminApiJson } from '@/lib/server-api';

export default async function DashboardPage() {
  const metrics = await adminApiJson<AdminOverview>('/admin/overview');
  const cards = [
    {
      label: 'Toplam Demo Geliri',
      value: `${(metrics.revenueMinor / 100).toLocaleString('tr-TR')} ₺`,
      detail: `${metrics.paidOrders} başarılı sipariş`,
      icon: ReceiptText,
    },
    {
      label: 'Aktif Sefer',
      value: metrics.activeTrips.toString(),
      detail: 'Biniş veya yolculuk aşamasında',
      icon: BusFront,
    },
    {
      label: 'Bugün Kesilen Bilet',
      value: metrics.ticketsToday.toString(),
      detail: 'Sunucu saatine göre',
      icon: Ticket,
    },
    {
      label: 'Kayıtlı Yolcu',
      value: metrics.passengers.toString(),
      detail: 'Yolcu rolündeki hesaplar',
      icon: CircleUserRound,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-red-700">Genel Bakış</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Operasyon özeti</h1>
          <p className="mt-1 text-sm text-slate-600">
            Canlı ve işlem verilerinin tek ekranda özeti.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
          <Activity className="h-4 w-4" /> {metrics.liveVehicles} canlı araç
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-slate-600">{label}</CardTitle>
              <Icon className="h-5 w-5 text-red-700" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-black">{value}</p>
              <p className="mt-2 text-xs text-slate-500">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-l-4 border-l-red-700">
        <CardContent className="pt-6">
          <p className="font-semibold">Sunum ortamı hazır</p>
          <p className="mt-1 text-sm text-slate-600">
            Rakamlar API üzerinden PostgreSQL'den, araç durumu ise Redis izleme anlık görüntüsünden
            üretilir. Bu panelde statik satış veya filo sayısı kullanılmaz.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Son veri üretimi: {new Date(metrics.generatedAt).toLocaleString('tr-TR')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
