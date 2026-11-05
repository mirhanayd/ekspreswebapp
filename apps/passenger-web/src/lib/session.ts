import { getAccessToken } from './server-api';
import { requirePassengerToken } from './server-auth';

/** The signed-in passenger, or null; pages decide whether that means a redirect. */
export async function getSessionUser() {
  try {
    const token = await getAccessToken();
    if (!token) return null;
    return await requirePassengerToken(token);
  } catch {
    return null;
  }
}
