import { config } from 'dotenv';
import { credential } from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';

config();

export function firebaseInitialize() {
  initializeApp({
    credential: credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
