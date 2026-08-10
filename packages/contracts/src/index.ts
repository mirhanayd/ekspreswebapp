export const ApplicationStatus = {
  OK: 'ok',
  DEGRADED: 'degraded',
  MAINTENANCE: 'maintenance',
} as const;

export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export type HealthCheckResponse = {
  service: string;
  status: ApplicationStatus;
  timestamp: string;
};
