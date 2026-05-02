/**
 * Firebase Admin SDK — Server-side only (used in API route handlers)
 * Initialized lazily so it doesn't run in the browser bundle.
 */
import * as admin from 'firebase-admin';

function getAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // When FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is set (production), use it.
  // Otherwise fall back to Application Default Credentials (local dev / CI with gcloud auth).
  const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
    });
  }

  // If GOOGLE_APPLICATION_CREDENTIALS is set in .env.local, applicationDefault() will find it automatically.
  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });
}

export function getAdminFirestore() {
  return getAdminApp().firestore();
}

export function getAdminAuth() {
  return getAdminApp().auth();
}
