import { Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@ekspres/ui';

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Raporlar</h2>
        <p className="text-muted-foreground">Sistem performans ve satış raporları.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Son Günlük Raporlar (Demo)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Toplam Bilet</TableHead>
                <TableHead>Toplam Gelir</TableHead>
                <TableHead>Doluluk Oranı</TableHead>
                <TableHead className="text-right">Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Bugün</TableCell>
                <TableCell>12</TableCell>
                <TableCell>₺4,500</TableCell>
                <TableCell>%45</TableCell>
                <TableCell className="text-right text-green-600">Tamamlandı</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Dün</TableCell>
                <TableCell>28</TableCell>
                <TableCell>₺11,200</TableCell>
                <TableCell>%82</TableCell>
                <TableCell className="text-right text-green-600">Tamamlandı</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Önceki Gün</TableCell>
                <TableCell>24</TableCell>
                <TableCell>₺9,600</TableCell>
                <TableCell>%71</TableCell>
                <TableCell className="text-right text-green-600">Tamamlandı</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
