import { StatusBadge } from '@ekspres/ui';
import { ApplicationStatus } from '@ekspres/contracts';

export default function Home() {
  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Siirt Kurtalan Ekspres</h1>
        <p className="text-muted-foreground">Passenger Web Application is operational.</p>
      </div>
      <div className="flex items-center gap-2 rounded-lg border p-4 bg-card text-card-foreground shadow-sm">
        <span className="text-sm font-medium">Status:</span>
        <StatusBadge status={ApplicationStatus.OK} />
      </div>
    </div>
  );
}
