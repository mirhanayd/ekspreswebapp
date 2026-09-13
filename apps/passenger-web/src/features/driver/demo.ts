export type PassengerStatus = 'waiting' | 'boarded' | 'missed';
export type Passenger = {
  id: string;
  name: string;
  seat: number;
  phone: string;
  origin: string;
  destination: string;
  status: PassengerStatus;
};

export const driver = {
  name: 'Mehmet Kaya',
  vehicle: 'Mercedes-Benz Tourismo',
  plate: '61 ABC 123',
  trip: 'SKE · 061',
  phone: '05xx xxx 61 61',
};

export const stops = [
  {
    id: 'trabzon',
    name: 'Trabzon Otogar',
    city: 'Trabzon',
    planned: '09:00',
    estimated: '09:00',
    eta: 0,
    progress: 0,
    longitude: 39.757,
    latitude: 40.981,
  },
  {
    id: 'gumushane',
    name: 'Gümüşhane Otogar',
    city: 'Gümüşhane',
    planned: '10:40',
    estimated: '10:40',
    eta: 24,
    progress: 28,
    longitude: 39.478,
    latitude: 40.459,
  },
  {
    id: 'bayburt',
    name: 'Bayburt Otogar',
    city: 'Bayburt',
    planned: '12:10',
    estimated: '12:10',
    eta: 18,
    progress: 58,
    longitude: 40.226,
    latitude: 40.255,
  },
  {
    id: 'erzurum',
    name: 'Erzurum Otogar',
    city: 'Erzurum',
    planned: '14:00',
    estimated: '14:00',
    eta: 32,
    progress: 85,
    longitude: 41.236,
    latitude: 39.928,
  },
];
export type DriverStop = (typeof stops)[number];

export const initialPassengers: Passenger[] = [
  ...[
    'Burak Şahin',
    'Ayşe Yıldız',
    'Emre Çelik',
    'Fatma Arslan',
    'Can Öztürk',
    'Selin Koç',
    'Hasan Acar',
    'Derya Aksoy',
    'Onur Tekin',
    'Esra Yalçın',
    'Yusuf Polat',
    'İrem Güneş',
  ].map((name, index): Passenger => ({
    id: `passenger-${index + 1}`,
    name,
    seat: index + 1,
    phone: `05xx xxx ${String(index + 10)} ${String(index + 20)}`,
    origin: index < 7 ? 'trabzon' : 'gumushane',
    destination: index < 2 ? 'gumushane' : index < 5 ? 'bayburt' : 'erzurum',
    status: 'boarded',
  })),
  ...['Ahmet Yılmaz', 'Elif Demir', 'Mert Kaya', 'Zeynep Aydın'].map((name, index): Passenger => ({
    id: `passenger-${index + 13}`,
    name,
    seat: index + 13,
    phone: `05xx xxx 24 ${String(index + 30)}`,
    origin: 'bayburt',
    destination: 'erzurum',
    status: index === 3 ? 'missed' : 'waiting',
  })),
];

export const statusLabels: Record<PassengerStatus, string> = {
  waiting: 'Bekleniyor',
  boarded: 'Bindi',
  missed: 'Binmedi',
};
export const statusClasses: Record<PassengerStatus, string> = {
  waiting: 'badge-amber',
  boarded: 'badge-lime',
  missed: 'badge-muted',
};
export function stopName(id: string) {
  return stops.find((stop) => stop.id === id)?.city ?? id;
}
