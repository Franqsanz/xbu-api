import { authFirebase } from '../config/firebase';

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 1 día

export const AuthService = {
  get sessionDurationMs() {
    return SESSION_DURATION_MS;
  },

  async createSessionCookie(idToken: string): Promise<string> {
    return await authFirebase.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });
  },

  async verifySessionCookie(sessionCookie: string) {
    return await authFirebase.verifySessionCookie(sessionCookie);
  },

  async revokeUserSessions(uid: string): Promise<void> {
    try {
      await authFirebase.revokeRefreshTokens(uid);
    } catch (error) {
      // No queremos que falle el logout si Firebase no responde
      console.error('Error revocando tokens en Firebase:', error);
    }
  },
};
