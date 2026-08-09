import { Card, CardContent, CardHeader, CardTitle, Badge, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@ekspres/ui';
import { cookies } from 'next/headers';
import Link from 'next/link';

async function getTrips() {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  
  if (!token) return [];

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  try {
    const res = await fetch(`${apiUrl}/trips`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      cache: 'no-store'
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    return [];
  }
}

export default async function TripsPage() {
  const trips = await getTrips();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Seferler</h2>
        <p className="text-muted-foreground">Tüm seferleri ve durumlarını yönetin.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sefer Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kalkış</TableHead>
                <TableHead>Varış</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.map((trip: any) => (
                <TableRow key={trip.id}>
                  <TableCell className="font-medium">{trip.route?.origin}</TableCell>
                  <TableCell>{trip.route?.destination}</TableCell>
                  <TableCell>{new Date(trip.departureTime).toLocaleString('tr-TR')}</TableCell>
                  <TableCell>
                    <Badge variant={trip.status === 'in_transit' ? 'default' : 'secondary'}>
                      {trip.status === 'scheduled' ? 'Planlandı' : trip.status === 'in_transit' ? 'Yolda' : 'Tamamlandı'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/operations/fleet`} className="text-primary hover:underline text-sm font-medium">
                      Haritada Gör
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {trips.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Sefer bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
