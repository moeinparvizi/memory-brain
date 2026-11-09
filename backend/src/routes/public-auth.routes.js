const express = require('express');
const prisma = require('../config/db');
const firebaseIdentity = require('../services/firebase-identity');
const { getDemoAccount } = require('../services/demo-account');
const appSession = require('../services/app-session');

function createPublicAuthRouter({ verifyIdToken = token => firebaseIdentity.verifyIdToken(token) } = {}) {
  const router = express.Router();
  router.post('/login', async (req, res, next) => {
    if (process.env.DEMO_LOGIN_ENABLED !== 'true' || req.body.username !== 'demo') return next();
    if (req.body.password !== 'demo1234') return res.status(401).json({ error: 'Invalid credentials' });
    try { return res.json(appSession(await getDemoAccount())); } catch (error) { next(error); }
  });
  router.post('/firebase', async (req, res, next) => {
    if (!process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      return res.status(503).json({ code: 'FIREBASE_NOT_CONFIGURED', error: 'Firebase sign-in is not configured' });
    }
    const { idToken } = req.body;
    if (typeof idToken !== 'string' || !idToken.trim() || idToken.length > 16384) {
      return res.status(400).json({ code: 'INVALID_ID_TOKEN', error: 'A Firebase ID token is required' });
    }
    let identity;
    try { identity = await verifyIdToken(idToken); }
    catch { return res.status(401).json({ code: 'INVALID_ID_TOKEN', error: 'Invalid or expired identity token' }); }
    if (identity.email_verified !== true || typeof identity.email !== 'string' || !identity.email.includes('@')) {
      return res.status(403).json({ code: 'EMAIL_NOT_VERIFIED', error: 'Verify your email before signing in' });
    }
    if (typeof identity.uid !== 'string' || !identity.uid || identity.uid.length > 128) {
      return res.status(401).json({ code: 'INVALID_ID_TOKEN', error: 'Invalid identity' });
    }
    try {
      const email = identity.email.toLowerCase();
      const name = (typeof identity.name === 'string' && identity.name.trim().slice(0, 100)) || email.split('@')[0];
      const avatar = typeof identity.picture === 'string' && identity.picture.startsWith('https://') ? identity.picture : null;
      const user = await prisma.user.upsert({
        where: { firebaseUid: identity.uid },
        create: { firebaseUid: identity.uid, email, name, avatar },
        update: { email, name, avatar },
      });
      return res.json(appSession(user));
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ code: 'ACCOUNT_EXISTS', error: 'An existing account uses this email. Sign in with its original method.' });
      }
      next(error);
    }
  });
  return router;
}

module.exports = createPublicAuthRouter;
