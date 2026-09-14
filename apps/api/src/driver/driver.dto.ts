import { z } from 'zod';

export const DriverTripStatusSchema = z.object({
  status: z.enum(['scheduled', 'boarding', 'in_transit', 'completed']),
});

export const PassengerBoardingStatusSchema = z.object({
  status: z.enum(['pending', 'boarded', 'no_show']),
});

export const DriverLocationSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  speedKph: z.number().min(0).max(180).default(0),
  headingDeg: z.number().min(0).max(360).default(0),
  recordedAt: z.string().datetime().optional(),
});

export type DriverTripStatusDto = z.infer<typeof DriverTripStatusSchema>;
export type PassengerBoardingStatusDto = z.infer<typeof PassengerBoardingStatusSchema>;
export type DriverLocationDto = z.infer<typeof DriverLocationSchema>;

export const DriverAssignmentSchema = z.object({ driverId: z.string().uuid() });
export type DriverAssignmentDto = z.infer<typeof DriverAssignmentSchema>;
