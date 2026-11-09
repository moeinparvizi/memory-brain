const { initializeApp, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

async function verifyIdToken(idToken) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('Firebase identity verification is not configured securely');
  }
  const name = `identity-${projectId}`;
  const app = getApps().find(app => app.name === name) || initializeApp({ projectId }, name);
  // Signature, expiry, audience, issuer and subject are validated by the Admin SDK.
  // No service-account key is needed for public certificate verification.
  return getAuth(app).verifyIdToken(idToken);
}

module.exports = { verifyIdToken };
