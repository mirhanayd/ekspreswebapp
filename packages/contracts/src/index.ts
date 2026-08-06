export enum ApplicationStatus {
  OK = 'ok',
  DEGRADED = 'degraded',
  MAINTENANCE = 'maintenance',
}

export type HealthCheckResponse = {
  service: string;
  status: ApplicationStatus;
  timestamp: string;
};
