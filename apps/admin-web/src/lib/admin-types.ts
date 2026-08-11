export type AdminOverview = {
  revenueMinor: number;
  paidOrders: number;
  activeTrips: number;
  ticketsToday: number;
  passengers: number;
  liveVehicles: number;
  generatedAt: string;
};

export type AdminTrip = {
  id: string;
  routeName: string;
  originName: string;
  destinationName: string;
  plateNumber: string;
  departureTime: string;
  arrivalTime: string;
  status: string;
  basePrice: number;
  totalSeats: number;
  soldSeats: number;
};

export type AdminTransport = {
  locations: Array<{ id: string; name: string; type: string }>;
  routes: Array<{
    id: string;
    name: string;
    originName: string;
    destinationName: string;
  }>;
  buses: Array<{
    id: string;
    plateNumber: string;
    model: string | null;
    totalSeats: number;
    activeTrips: number;
  }>;
  trips: AdminTrip[];
};

export type AdminTicket = {
  id: string;
  ticketNo: string;
  status: string;
  issuedAt: string;
  passenger: string;
  passengerEmail: string;
  seatNo: string;
  tripId: string;
  routeName: string;
  originName: string;
  destinationName: string;
  departureTime: string;
  tripStatus: string;
  orderNo: string;
  amountMinor: number;
  currency: string;
};

export type FleetPosition = {
  tripId: string;
  busId: string;
  longitude: number;
  latitude: number;
  speedKph: number;
  headingDeg: number;
  recordedAt: string;
  sequence: number;
};

export type FleetTrip = {
  tripId: string;
  busId: string;
  plateNumber: string;
  model: string | null;
  routeName: string;
  originName: string;
  destinationName: string;
  departureTime: string;
  arrivalTime: string;
  status: string;
  routeGeometry: { type: 'LineString'; coordinates: number[][] } | null;
  latest: FleetPosition | null;
  ageSeconds: number | null;
  freshness: 'live' | 'delayed' | 'stale' | 'offline';
};

export type AdminReports = {
  dailySales: Array<{ date: string; tickets: number; revenueMinor: number }>;
  tripStatuses: Array<{ status: string; value: number }>;
  ticketStatuses: Array<{ status: string; value: number }>;
  occupancy: { seats: number; sold: number; percent: number };
  generatedAt: string;
};
