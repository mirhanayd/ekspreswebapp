import { redirect } from 'next/navigation';

/** Trip cards open the seat map directly; the old detail page now lands there too. */
export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/trips/${id}/seats`);
}
