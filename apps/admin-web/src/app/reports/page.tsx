import { Banknote, Percent, Ticket } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyRow,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { AdminReports } from '@/lib/admin-types';
import { adminApiJson } from '@/lib/server-api';

const labels: Record<string, string> = {
  scheduled: 'Planlandı',
  boarding: 'Biniş',
  in_transit: 'Yolda',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  active: 'Aktif',
  used: 'Kullanıldı',
  expired: 'Süresi doldu',
};

export default async function ReportsPage() {
  const report = await adminApiJson<AdminReports>('/admin/reports');
  const totalRevenue = report.dailySales.reduce((sum, day) => sum + day.revenueMinor, 0);
  const totalTickets = report.dailySales.reduce((sum, day) => sum + day.tickets, 0);
  const peakRevenue = Math.max(1, ...report.dailySales.map((day) => day.revenueMinor));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Raporlar"
        title="Operasyon metrikleri"
        description="Satış, sefer durumu ve koltuk envanterinden türetilen gerçek veriler."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricTile
          icon={<Percent aria-hidden />}
          label="Genel doluluk"
          value={`%${report.occupancy.percent}`}
          hint={`${report.occupancy.sold}/${report.occupancy.seats} koltuk`}
          meter={report.occupancy.percent}
        />
        <MetricTile
          icon={<Ticket aria-hidden />}
          label="7 günlük bilet"
          value={totalTickets.toString()}
          hint="Başarılı ödemeler"
        />
        <MetricTile
          icon={<Banknote aria-hidden />}
          label="7 günlük gelir"
          value={`${(totalRevenue / 100).toLocaleString('tr-TR')} ₺`}
          hint="Demo tahsilat toplamı"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <DistributionCard
          title="Sefer durumları"
          description="Planlanan ve yürüyen sefer dağılımı."
          items={report.tripStatuses}
        />
        <DistributionCard
          title="Bilet durumları"
          description="Kesilen biletlerin güncel durumu."
          items={report.ticketStatuses}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Son 7 satış günü</CardTitle>
          <CardDescription>Gün bazında bilet adedi ve tahsil edilen tutar.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 py-0 sm:px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Bilet</TableHead>
                <TableHead>Gelir</TableHead>
                <TableHead className="w-2/5">Dağılım</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.dailySales.map((day) => (
                <TableRow key={day.date}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(`${day.date}T12:00:00`).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>{day.tickets}</TableCell>
                  <TableCell className="whitespace-nowrap font-semibold">
                    {(day.revenueMinor / 100).toLocaleString('tr-TR')} ₺
                  </TableCell>
                  <TableCell>
                    <span className="ops-meter">
                      <span
                        className="ops-meter-fill"
                        style={{
                          width: `${Math.max(3, Math.round((day.revenueMinor / peakRevenue) * 100))}%`,
                        }}
                      />
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {!report.dailySales.length ? (
                <EmptyRow colSpan={4}>Henüz başarılı demo ödemesi yok.</EmptyRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-2xs text-ink-500">
        Rapor üretim zamanı: {new Date(report.generatedAt).toLocaleString('tr-TR')}
      </p>
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
  hint,
  meter,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  meter?: number;
}) {
  return (
    <div className="surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="metric-label">{label}</p>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </span>
      </div>
      <p className="metric-value mt-2">{value}</p>
      <p className="mt-1 text-xs text-ink-500">{hint}</p>
      {typeof meter === 'number' ? (
        <span className="ops-meter mt-3">
          <span className="ops-meter-fill" style={{ width: `${Math.min(100, meter)}%` }} />
        </span>
      ) : null}
    </div>
  );
}

function DistributionCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: Array<{ status: string; value: number }>;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const percent = Math.round((item.value / total) * 100);
          return (
            <div key={item.status}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink-700">
                  {labels[item.status] || item.status}
                </span>
                <span className="font-semibold text-ink-900">
                  {item.value}
                  <span className="ml-1.5 text-xs font-medium text-ink-500">%{percent}</span>
                </span>
              </div>
              <span className="ops-meter mt-1.5">
                <span className="ops-meter-fill" style={{ width: `${percent}%` }} />
              </span>
            </div>
          );
        })}
        {!items.length ? (
          <p className="py-6 text-center text-sm text-ink-500">Veri bulunmuyor.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
