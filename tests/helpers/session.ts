import { vi } from 'vitest';

import { authFirebase } from '../../src/config/firebase';

export type FakeUser = {
  uid: string;
  email?: string;
  name?: string;
};

/**
 * Configura el mock de Firebase para que `verifySessionCookie` devuelva el
 * usuario dado, y devuelve el valor de cookie que el request debe mandar.
 * Uso típico:
 *
 *   const cookie = mockSession({ uid: 'user-1', email: 'a@b.com' });
 *   const res = await request(app).get('/api/users/me').set('Cookie', cookie);
 */
export function mockSession(user: FakeUser): string {
  vi.mocked(authFirebase.verifySessionCookie).mockResolvedValue(user as any);
  return `_secure_tk=fake-session-token-${user.uid}`;
}

/**
 * Restablece el mock a rechazar la validación de sesión — útil para tests
 * que verifican el flujo sin sesión.
 */
export function clearSession(): void {
  vi.mocked(authFirebase.verifySessionCookie).mockRejectedValue(new Error('not mocked'));
}
