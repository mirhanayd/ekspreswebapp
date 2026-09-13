import { DriverProvider } from '@/features/driver/DriverProvider';

export const metadata = { title: 'Şoför · Demo', robots: { index: false, follow: false } };

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return <DriverProvider>{children}</DriverProvider>;
}
