import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
};

export default async function ReportsPage() {
  const report = await adminApiJson<AdminReports>('/admin/reports');
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-red-700">Raporlar</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Gerçek demo metrikleri</h1>
        <p className="mt-1 text-sm text-slate-600">
          Satış, durum ve koltuk envanterinden türetilir.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Genel doluluk</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-black text-red-700">%{report.occupancy.percent}</p>
            <p className="mt-2 text-sm text-slate-500">
              {report.occupancy.sold} satın alınmış / {report.occupancy.seats} toplam koltuk
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sefer durumları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.tripStatuses.map((item) => (
              <div key={item.status} className="flex justify-between text-sm">
                <span>{labels[item.status] || item.status}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bilet durumları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.ticketStatuses.map((item) => (
              <div key={item.status} className="flex justify-between text-sm">
                <span>{labels[item.status] || item.status}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Son 7 satış günü</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Bilet</TableHead>
                <TableHead>Gelir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.dailySales.map((day) => (
                <TableRow key={day.date}>
                  <TableCell>
                    {new Date(`${day.date}T12:00:00`).toLocaleDateString('tr-TR')}
                  </TableCell>
                  <TableCell>{day.tickets}</TableCell>
                  <TableCell className="font-semibold">
                    {(day.revenueMinor / 100).toLocaleString('tr-TR')} ₺
                  </TableCell>
                </TableRow>
              ))}
              {!report.dailySales.length && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-slate-500">
                    Henüz başarılı demo ödemesi yok.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-slate-500">
        Üretim: {new Date(report.generatedAt).toLocaleString('tr-TR')}
      </p>
    </div>
  );
}
