import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BusFront,
  Gauge,
  ReceiptText,
  WifiOff,
  Ticket,
  TriangleAlert,
  UserX,
  Users,
} from 'lucide-react';
import {
  Avatar,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyRow,
  OccupancyBar,
  PageHeader,
  StatusChip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import type { DriverRecord } from '@/app/operations/trips/DriverManagement';
import type {
  AdminOverview,
  AdminReports,
  AdminTransport,
  AdminTrip,
  FleetTrip,
} from '@/lib/admin-types';
import { adminApiJson, adminApiJsonOptional } from '@/lib/server-api';
import {
  dayKey,
  formatClock,
  formatDay,
  formatMoney,
  initials,
  isClosedTrip,
  isSameOperationsDay,
  OPERATIONS_TIME_ZONE,
  statusMeta,
  tripCode,
  tripStatusBar,
  tripStatusOrder,
} from '@/lib/trip-status';

/** A vehicle silent for this long while on a trip needs an operator's attention. */
const SIGNAL_ALERT_SECONDS = 180;
const CHART_DAYS = 14;
/** The reports API returns at most this many sales days (see admin-service `getReports`). */
const REPORT_SALES_DAYS = 7;

export default async function DashboardPage() {
  const metrics = await adminApiJson<AdminOverview>('/admin/overview');
  const [fleet, reports, transport, drivers] = await Promise.all([
    adminApiJsonOptional<FleetTrip[]>('/admin/fleet', []),
    adminApiJsonOptional<AdminReports | null>('/admin/reports', null),
    adminApiJsonOptional<AdminTransport | null>('/admin/transport', null),
    adminApiJsonOptional<DriverRecord[]>('/admin/drivers', []),
  ]);

  const now = new Date();
  const trips = transport?.trips ?? [];
  const driverById = new Map(drivers.map((driver) => [driver.id, driver]));
  const tripById = new Map(trips.map((trip) => [trip.id, trip]));

  const todayTrips = trips.filter((trip) => isSameOperationsDay(trip.departureTime, now));
  const statusCounts = tripStatusOrder
    .map((status) => ({ status, value: todayTrips.filter((t) => t.status === status).length }))
    .filter((item) => item.value > 0);

  const todaySeats = todayTrips.reduce((sum, trip) => sum + trip.totalSeats, 0);
  const todaySold = todayTrips.reduce((sum, trip) => sum + trip.soldSeats, 0);
  const occupancy = todaySeats
    ? Math.round((todaySold / todaySeats) * 100)
    : (reports?.occupancy.percent ?? 0);

  const sales = reports?.dailySales ?? [];
  const todayKey = dayKey(now);
  const todayRevenue = sales.find((day) => day.date === todayKey)?.revenueMinor ?? 0;

  const upcoming = trips
    .filter((trip) => !isClosedTrip(trip.status) && trip.status !== 'in_transit')
    .filter((trip) => new Date(trip.arrivalTime).getTime() >= now.getTime())
    .sort((a, b) => a.departureTime.localeCompare(b.departureTime))
    .slice(0, 6);

  const unassigned = trips.filter(
    (trip) =>
      !trip.driverId &&
      !isClosedTrip(trip.status) &&
      new Date(trip.arrivalTime).getTime() >= now.getTime(),
  );
  const silent = fleet.filter(
    (trip) => trip.ageSeconds === null || trip.ageSeconds >= SIGNAL_ALERT_SECONDS,
  );
  const moving = fleet.filter((trip) => trip.status === 'in_transit' || trip.status === 'boarding');

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Genel bakış"
        title="Operasyon özeti"
        description={new Date(metrics.generatedAt).toLocaleDateString('tr-TR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          timeZone: OPERATIONS_TIME_ZONE,
        })}
        actions={
          <span className="chip-status chip-live h-8 px-3">
            <Activity className="h-3.5 w-3.5" aria-hidden />
            {metrics.liveVehicles} canlı araç
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={BusFront} label="Bugünkü seferler" value={todayTrips.length.toString()}>
          <StatusDistribution items={statusCounts} />
        </Kpi>
        <Kpi icon={Ticket} label="Satılan bilet" value={metrics.ticketsToday.toString()}>
          <p className="text-sm text-adm-muted">Bugün kesilen · {metrics.paidOrders} sipariş</p>
        </Kpi>
        <Kpi icon={Users} label="Ortalama doluluk" value={`%${occupancy}`}>
          <span className="ops-meter" aria-hidden>
            <span className="ops-meter-fill" style={{ width: `${Math.min(100, occupancy)}%` }} />
          </span>
          <p className="mt-2 text-sm text-adm-muted">
            {todaySeats ? `${todaySold}/${todaySeats} koltuk bugün` : 'Tüm seferler'}
          </p>
        </Kpi>
        <Kpi icon={ReceiptText} label="Bilet geliri" value={formatMoney(todayRevenue)}>
          <p className="text-sm text-adm-muted">
            Bugün · toplam {formatMoney(metrics.revenueMinor)}
          </p>
        </Kpi>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Son 14 gün satış</CardTitle>
                <CardDescription>Günlük başarılı ödeme geliri</CardDescription>
              </div>
              <Link href="/reports" className="ops-btn ops-btn-secondary">
                Raporlar
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <SalesChart sales={sales} todayKey={todayKey} />
          </CardContent>
        </Card>

        <Card className="scroll-mt-24" id="dikkat">
          <CardHeader>
            <CardTitle>Dikkat gerektirenler</CardTitle>
            <CardDescription>Şoförsüz seferler ve sinyali kesilen araçlar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {unassigned.slice(0, 4).map((trip) => (
              <Attention
                key={trip.id}
                icon={UserX}
                title={`${trip.originName} → ${trip.destinationName}`}
                detail={`${formatDay(trip.departureTime)} ${formatClock(trip.departureTime)} · şoför atanmadı`}
                href={`/operations/trips?trip=${trip.id}`}
                action="Şoför ata"
              />
            ))}
            {silent.slice(0, 4).map((trip) => (
              <Attention
                key={trip.tripId}
                icon={WifiOff}
                title={trip.plateNumber}
                mono
                detail={
                  trip.ageSeconds === null
                    ? 'Hiç konum alınmadı'
                    : `${Math.floor(trip.ageSeconds / 60)} dk sinyal yok`
                }
                href={`/operations/fleet?trip=${trip.tripId}`}
                action="Haritada aç"
              />
            ))}
            {unassigned.length + silent.length > 8 ? (
              <p className="text-sm text-adm-muted">
                +{unassigned.length + silent.length - 8} kayıt daha
              </p>
            ) : null}
            {!unassigned.length && !silent.length ? (
              <p className="py-8 text-center text-sm text-adm-muted">
                Şu an dikkat gerektiren bir durum yok.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Şu an yolda</CardTitle>
              <CardDescription>Yolcu alımı ve yolculuk aşamasındaki araçlar</CardDescription>
            </div>
            <Link href="/operations/fleet" className="ops-btn ops-btn-secondary">
              Canlı filo
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {moving.length ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {moving.map((trip) => {
                const detail = tripById.get(trip.tripId);
                const driver = detail?.driverId ? driverById.get(detail.driverId) : undefined;
                return (
                  <li key={trip.tripId} className="min-w-0">
                    <Link
                      href={`/operations/fleet?trip=${trip.tripId}`}
                      className="block rounded-card border border-adm-line p-4 transition hover:border-ink-300"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="plate">{trip.plateNumber}</span>
                        <StatusChip status={trip.status} />
                      </div>
                      <p className="mt-3 truncate text-sm font-medium">
                        {trip.originName} → {trip.destinationName}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-adm-muted">
                        {driver ? `${driver.firstName} ${driver.lastName}` : 'Şoför atanmadı'}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-sm text-adm-muted">
                        <span className="flex items-center gap-1.5">
                          <Gauge className="h-4 w-4" aria-hidden />
                          {trip.latest ? `${Math.round(trip.latest.speedKph)} km/sa` : '—'}
                        </span>
                        <span>Varış {formatClock(trip.arrivalTime)}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-adm-muted">
              Şu anda yolda olan sefer bulunmuyor.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Yaklaşan seferler</CardTitle>
              <CardDescription>Kalkışı yaklaşan planlı seferler</CardDescription>
            </div>
            <Link href="/operations/trips" className="ops-btn ops-btn-secondary">
              Tüm seferler
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kalkış</TableHead>
                <TableHead>Güzergâh</TableHead>
                <TableHead>Araç</TableHead>
                <TableHead>Şoför</TableHead>
                <TableHead>Doluluk</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcoming.map((trip) => (
                <UpcomingRow
                  key={trip.id}
                  trip={trip}
                  driver={driverById.get(trip.driverId ?? '')}
                />
              ))}
              {!upcoming.length ? <EmptyRow colSpan={6}>Yaklaşan sefer yok.</EmptyRow> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-adm-muted">
        Son güncelleme{' '}
        {new Date(metrics.generatedAt).toLocaleString('tr-TR', { timeZone: OPERATIONS_TIME_ZONE })}
      </p>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: typeof BusFront;
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="metric-label">{label}</h2>
        <Icon className="h-4 w-4 shrink-0 text-adm-muted" aria-hidden />
      </div>
      <p className="metric-value mt-2">{value}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function StatusDistribution({ items }: { items: Array<{ status: string; value: number }> }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (!total) return <p className="text-sm text-adm-muted">Bugün planlı sefer yok</p>;
  return (
    <div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {items.map((item) => (
          <span
            key={item.status}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(item.value / total) * 100}%`,
              backgroundColor: tripStatusBar[item.status as keyof typeof tripStatusBar],
            }}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-adm-muted">
        {items.map((item) => (
          <li key={item.status} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: tripStatusBar[item.status as keyof typeof tripStatusBar] }}
              aria-hidden
            />
            {statusMeta(item.status).label}{' '}
            <span className="font-medium text-adm-text">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SalesChart({ sales, todayKey }: { sales: AdminReports['dailySales']; todayKey: string }) {
  const byDay = new Map(sales.map((day) => [day.date, day]));
  // The API caps the series at REPORT_SALES_DAYS sales days; older days are unknown, not zero.
  const oldestKnown =
    sales.length >= REPORT_SALES_DAYS
      ? sales.reduce((min, day) => (day.date < min ? day.date : min), sales[0]!.date)
      : null;
  const today = new Date(`${todayKey}T12:00:00Z`);
  const days = Array.from({ length: CHART_DAYS }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (CHART_DAYS - 1 - index));
    const key = date.toISOString().slice(0, 10);
    const row = byDay.get(key);
    const known = Boolean(row) || !oldestKnown || key >= oldestKnown;
    return {
      key,
      label: date.getUTCDate().toString(),
      long: date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
      revenueMinor: row?.revenueMinor ?? 0,
      tickets: row?.tickets ?? 0,
      known,
    };
  });
  const peak = Math.max(1, ...days.map((day) => day.revenueMinor));
  const hasUnknown = days.some((day) => !day.known);

  return (
    <figure>
      <ul className="flex h-48 items-end gap-0.5 sm:gap-1.5" aria-hidden>
        {days.map((day) => {
          const isToday = day.key === todayKey;
          const height = day.known ? Math.max(2, Math.round((day.revenueMinor / peak) * 100)) : 100;
          return (
            <li key={day.key} className="group relative flex h-full min-w-0 flex-1 flex-col">
              <span className="relative flex-1">
                <span
                  className={`absolute inset-x-0 bottom-0 rounded-t ${
                    day.known
                      ? isToday
                        ? 'bg-adm-brand'
                        : 'bg-adm-bar group-hover:bg-ink-400'
                      : 'border border-dashed border-adm-line bg-transparent'
                  }`}
                  style={{ height: `${height}%` }}
                />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-btn bg-adm-text px-2 py-1 text-xs text-white group-hover:block">
                  {day.long} ·{' '}
                  {day.known
                    ? `${formatMoney(day.revenueMinor)} · ${day.tickets} bilet`
                    : 'veri yok'}
                </span>
              </span>
              <span
                className={`mt-1.5 text-center text-xs ${isToday ? 'font-semibold text-adm-sel-text' : 'text-adm-muted'}`}
              >
                {day.label}
              </span>
            </li>
          );
        })}
      </ul>
      <table className="sr-only">
        <caption>Son 14 gün günlük satış</caption>
        <thead>
          <tr>
            <th scope="col">Gün</th>
            <th scope="col">Gelir</th>
            <th scope="col">Bilet</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.key}>
              <td>{day.long}</td>
              <td>{day.known ? formatMoney(day.revenueMinor) : 'veri yok'}</td>
              <td>{day.known ? day.tickets : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasUnknown ? (
        <figcaption className="mt-3 text-xs text-adm-muted">
          Kesikli çubuklar: rapor servisi yalnızca son {REPORT_SALES_DAYS} satış gününü döndürüyor.
        </figcaption>
      ) : null}
    </figure>
  );
}

function Attention({
  icon: Icon,
  title,
  detail,
  href,
  action,
  mono = false,
}: {
  icon: typeof UserX;
  title: string;
  detail: string;
  href: string;
  action: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-adm-line p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-btn bg-[#FEF3C7] text-[#92400E]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${mono ? 'font-mono' : ''}`}>{title}</p>
        <p className="truncate text-xs text-adm-muted">{detail}</p>
      </div>
      <Link href={href} className="ops-link shrink-0 text-sm">
        {action}
      </Link>
    </div>
  );
}

function UpcomingRow({ trip, driver }: { trip: AdminTrip; driver?: DriverRecord }) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">
        <p className="font-medium">{formatClock(trip.departureTime)}</p>
        <p className="font-mono text-xs text-adm-muted">{tripCode(trip.id)}</p>
      </TableCell>
      <TableCell>
        <p className="font-medium">
          {trip.originName} → {trip.destinationName}
        </p>
        <p className="text-xs text-adm-muted">
          {formatDay(trip.departureTime)} · varış {formatClock(trip.arrivalTime)}
        </p>
      </TableCell>
      <TableCell>
        <span className="plate">{trip.plateNumber}</span>
      </TableCell>
      <TableCell>
        {driver ? (
          <span className="flex items-center gap-2 whitespace-nowrap">
            <Avatar name={initials(driver.firstName, driver.lastName)} />
            {driver.firstName} {driver.lastName}
          </span>
        ) : (
          <Link href={`/operations/trips?trip=${trip.id}`} className="ops-link whitespace-nowrap">
            <TriangleAlert className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            Şoför ata
          </Link>
        )}
      </TableCell>
      <TableCell>
        <OccupancyBar sold={trip.soldSeats} total={trip.totalSeats} />
      </TableCell>
      <TableCell>
        <StatusChip status={trip.status} />
      </TableCell>
    </TableRow>
  );
}
