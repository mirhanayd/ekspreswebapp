import { StatusBadge } from '@ekspres/ui';
import { ApplicationStatus } from '@ekspres/contracts';

export default function Home() {
  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Admin Web Application is operational.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">System Status</h3>
          </div>
          <div className="p-6 pt-0">
            <StatusBadge status={ApplicationStatus.OK} />
          </div>
        </div>
      </div>
    </div>
  );
}
