import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  initializeAuth,
  inMemoryPersistence,
  type Auth,
} from "firebase/auth";
import { initializeFirestore, type Firestore } from "firebase/firestore";

import { env } from "@/config/env";

const APP_NAME = "micboxx-social-client";

let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

function getFirebaseClientApp(): FirebaseApp {
  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) return existing;

  if (
    !env.firebaseApiKey ||
    !env.firebaseAuthDomain ||
    !env.firebaseProjectId ||
    !env.firebaseAppId
  ) {
    throw new Error("Firebase client configuration is missing.");
  }

  return initializeApp(
    {
      apiKey: env.firebaseApiKey,
      authDomain: env.firebaseAuthDomain,
      projectId: env.firebaseProjectId,
      appId: env.firebaseAppId,
    },
    APP_NAME,
  );
}

export function getFirebaseClientAuth(): Auth {
  if (authInstance) return authInstance;

  // Use initializeAuth with explicit inMemoryPersistence to suppress the
  // "no AsyncStorage" warning. In-memory is intentional: Firebase Auth is
  // re-established on every app start by SocialAuthGate via the Drupal →
  // Firebase custom-token bridge. Persisting a custom token session would
  // cause stale-session errors (custom tokens are single-use, 1-hour TTL).
  authInstance = initializeAuth(getFirebaseClientApp(), {
    persistence: inMemoryPersistence,
  });
  return authInstance;
}

export function getFirebaseClientDb(): Firestore {
  if (firestoreInstance) return firestoreInstance;

  firestoreInstance = initializeFirestore(getFirebaseClientApp(), {
    experimentalForceLongPolling: true,
  });
  return firestoreInstance;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    env.firebaseApiKey &&
    env.firebaseAuthDomain &&
    env.firebaseProjectId &&
    env.firebaseAppId,
  );
}
