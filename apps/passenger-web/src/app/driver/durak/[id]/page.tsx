import { notFound } from 'next/navigation';
import { stops } from '@/features/driver/demo';
import { StopDetail } from '@/features/driver/StopDetail';

export default async function StopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stop = stops.find((item) => item.id === id);
  if (!stop) notFound();
  return <StopDetail stop={stop} />;
}
