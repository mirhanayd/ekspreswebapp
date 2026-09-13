import { House, MapPin, Route, Users, UserRound } from 'lucide-react';

export const isDriverPath = (path: string) => path === '/driver' || path.startsWith('/driver/');

export const driverNavigation = [
  { href: '/driver', label: 'Ana sayfa', icon: House, match: (p: string) => p === '/driver' },
  {
    href: '/driver/sefer',
    label: 'Sefer',
    icon: Route,
    match: (p: string) => p.startsWith('/driver/sefer') || p.startsWith('/driver/durak'),
  },
  {
    href: '/driver/yolcular',
    label: 'Yolcular',
    icon: Users,
    match: (p: string) => p === '/driver/yolcular',
  },
  {
    href: '/driver/konum',
    label: 'Konum',
    icon: MapPin,
    match: (p: string) => p === '/driver/konum',
  },
  {
    href: '/driver/profil',
    label: 'Profil',
    icon: UserRound,
    match: (p: string) => p === '/driver/profil',
  },
];
