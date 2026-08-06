import { StatusBadge } from '@ekspres/ui';
import { ApplicationStatus } from '@ekspres/contracts';

export default function Home() {
  return (
    <main>
      <h1>Siirt Kurtalan Ekspres Admin</h1>
      <p>Admin Web Application is operational.</p>
      <div>
        Status: <StatusBadge status={ApplicationStatus.OK} />
      </div>
    </main>
  );
}
