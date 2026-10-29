import { redirect } from 'next/navigation';

/** The assigned-trips list now lives on the profile tab. */
export default function DriverTripsPage() {
  redirect('/profile');
}
