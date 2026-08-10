export const ApplicationStatus = {
  OK: 'ok',
  DEGRADED: 'degraded',
  MAINTENANCE: 'maintenance',
} as const;

export type ApplicationStatusValue = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export type HealthCheckResponse = {
  service: string;
  status: ApplicationStatusValue;
  timestamp: string;
};
