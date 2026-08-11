import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BusFront,
  CircleUserRound,
  Gauge,
  Percent,
  ReceiptText,
  Ticket,
} from 'lucide-react';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from '@/components/ui';
import { AdminOverview, AdminReports, FleetTrip } from '@/lib/admin-types';
import { adminApiJson, adminApiJsonOptional } from '@/lib/server-api';

const freshnessTone = {
  live: 'live',
  delayed: 'warn',
  stale: 'warn',
  offline: 'neutral',
} as const;

const freshnessLabel: Record<FleetTrip['freshness'], string> = {
  live: 'Canlı',
  delayed: 'Gecikmeli',
  stale: 'Eski veri',
  offline: 'Çevrimdışı',
};

export default async function DashboardPage() {
  const metrics = await adminApiJson<AdminOverview>('/admin/overview');
  const [fleet, reports] = await Promise.all([
    adminApiJsonOptional<FleetTrip[]>('/admin/fleet', []),
    adminApiJsonOptional<AdminReports | null>('/admin/reports', null),
  ]);

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

  const sales = reports?.dailySales ?? [];
  const peakRevenue = Math.max(1, ...sales.map((day) => day.revenueMinor));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Genel Bakış"
        title="Operasyon özeti"
        description="Satış, sefer ve canlı araç verisinin tek ekranda özeti."
        actions={
          <span className="chip-status chip-live">
            <Activity className="h-3.5 w-3.5" aria-hidden />
            {metrics.liveVehicles} canlı araç
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="surface p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="metric-label">{label}</p>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
            </div>
            <p className="metric-value mt-2">{value}</p>
            <p className="mt-1 text-xs text-ink-500">{detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Son 7 gün satış</CardTitle>
                <CardDescription>Başarılı demo ödemelerinden üretilir.</CardDescription>
              </div>
              <Link href="/reports" className="ops-btn ops-btn-secondary">
                Raporlar
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {sales.length ? (
              <ul className="flex h-44 items-end gap-2">
                {sales.map((day) => {
                  const height = Math.round((day.revenueMinor / peakRevenue) * 100);
                  return (
                    <li key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <span className="text-2xs font-bold text-ink-600">{day.tickets}</span>
                      <span className="flex w-full flex-1 items-end">
                        <span
                          className="w-full rounded-t bg-brand-600/90"
                          style={{ height: `${Math.max(4, height)}%` }}
                          title={`${(day.revenueMinor / 100).toLocaleString('tr-TR')} ₺`}
                        />
                      </span>
                      <span className="w-full truncate text-center text-2xs text-ink-500">
                        {new Date(`${day.date}T12:00:00`).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-10 text-center text-sm text-ink-500">
                Henüz başarılı demo ödemesi bulunmuyor.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Koltuk doluluğu</CardTitle>
            <CardDescription>Satılan koltukların toplam envantere oranı.</CardDescription>
          </CardHeader>
          <CardContent>
            {reports ? (
              <>
                <div className="flex items-end justify-between gap-3">
                  <p className="metric-value text-brand-700">%{reports.occupancy.percent}</p>
                  <span className="chip-status chip-brand">
                    <Percent className="h-3.5 w-3.5" aria-hidden />
                    {reports.occupancy.sold}/{reports.occupancy.seats}
                  </span>
                </div>
                <div className="ops-meter mt-3">
                  <span
                    className="ops-meter-fill"
                    style={{ width: `${Math.min(100, reports.occupancy.percent)}%` }}
                  />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-2">
                  <div className="surface-muted p-3">
                    <dt className="metric-label">Satılan koltuk</dt>
                    <dd className="mt-1 font-display text-lg font-bold">
                      {reports.occupancy.sold}
                    </dd>
                  </div>
                  <div className="surface-muted p-3">
                    <dt className="metric-label">Toplam koltuk</dt>
                    <dd className="mt-1 font-display text-lg font-bold">
                      {reports.occupancy.seats}
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="py-10 text-center text-sm text-ink-500">
                Rapor verisi şu anda alınamadı.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Canlı filo</CardTitle>
              <CardDescription>Biniş ve yolculuk aşamasındaki seferler.</CardDescription>
            </div>
            <Link href="/operations/fleet" className="ops-btn ops-btn-secondary">
              Haritada aç
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {fleet.length ? (
            <ul className="divide-y divide-ink-100">
              {fleet.map((trip) => (
                <li
                  key={trip.tripId}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold text-ink-900">
                      {trip.plateNumber}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {trip.originName} → {trip.destinationName}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
                      <Gauge className="h-3.5 w-3.5 text-ink-400" aria-hidden />
                      {trip.latest ? `${Math.round(trip.latest.speedKph)} km/sa` : '—'}
                    </span>
                    <Badge tone={freshnessTone[trip.freshness]}>
                      {freshnessLabel[trip.freshness]}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-ink-500">
              Şu anda yolda olan sefer bulunmuyor.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-2xs text-ink-500">
        Veriler PostgreSQL işlem kayıtlarından ve Redis konum anlık görüntüsünden üretilir · Son
        güncelleme {new Date(metrics.generatedAt).toLocaleString('tr-TR')}
      </p>
    </div>
  );
}
