import { DEMO_CREDENTIALS, DEMO_IDS } from '../demo-constants';

const apiBaseUrl = process.env.API_URL || 'http://127.0.0.1:3001/api/v1';

async function request<T>(path: string, init: Parameters<typeof fetch>[1] = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, init);
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) {
    throw new Error(
      `${init.method || 'GET'} ${path} failed (${response.status}): ${payload.message || 'unknown error'}`,
    );
  }
  return payload;
}

async function main() {
  const login = await request<{ accessToken: string }>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(DEMO_CREDENTIALS.passenger),
  });
  const authenticatedHeaders = {
    Authorization: `Bearer ${login.accessToken}`,
    'Content-Type': 'application/json',
  };

  const profile = await request<{ id: string; role: string }>('/auth/me', {
    headers: authenticatedHeaders,
  });
  if (profile.id !== DEMO_IDS.passenger || profile.role !== 'passenger') {
    throw new Error('Demo passenger identity does not match the deterministic seed.');
  }

  const seatMap = await request<{ seats: Array<{ seatNo: string; status: string }> }>(
    `/seats/trip/${DEMO_IDS.morningTrip}`,
  );
  const seat = seatMap.seats.find((candidate) => candidate.status === 'available');
  if (!seat) throw new Error('No available seat exists for the demo journey.');

  const hold = await request<{ holdId: string }>('/seats/hold', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({ tripId: DEMO_IDS.morningTrip, seatNo: seat.seatNo }),
  });
  const order = await request<{ id: string }>('/checkout/order', {
    method: 'POST',
    headers: authenticatedHeaders,
    body: JSON.stringify({
      tripId: DEMO_IDS.morningTrip,
      seatNo: seat.seatNo,
      holdId: hold.holdId,
      passengerFirstName: 'Demo',
      passengerLastName: 'Yolcu',
      passengerPhone: '05550000000',
      passengerEmail: DEMO_CREDENTIALS.passenger.email,
      idempotencyKey: `demo-journey-${DEMO_IDS.morningTrip}-${seat.seatNo}`,
    }),
  });
  const payment = await request<{ ticket: { id: string; ticketNo: string } }>(
    `/checkout/order/${order.id}/pay`,
    { method: 'POST', headers: authenticatedHeaders },
  );
  const ticket = await request<{ id: string; orderId: string }>(`/tickets/${payment.ticket.id}`, {
    headers: authenticatedHeaders,
  });
  if (ticket.orderId !== order.id)
    throw new Error('Issued ticket is not linked to the paid order.');
  await request<{ qrToken: string }>(`/tickets/${ticket.id}/qr`, {
    headers: authenticatedHeaders,
  });

  console.log('Demo passenger journey verified: login -> hold -> order -> pay -> ticket -> QR.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
