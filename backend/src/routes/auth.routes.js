const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../config/db');

const router = express.Router();

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// Google Sign-In: verify Google token and issue JWT
router.post('/google', async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId,
          email,
          name,
          avatar: picture,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name, avatar: picture, email },
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error('Google auth error:', err);
    next(err);
  }
});

// Legacy login (keep for backward compatibility)
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (username === process.env.AUTH_USERNAME && password === process.env.AUTH_PASSWORD) {
      let user = await prisma.user.findFirst({ where: { email: 'admin@moein.local' } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            googleId: 'legacy-admin',
            email: 'admin@moein.local',
            name: username,
          },
        });
      }
      const token = jwt.sign(
        { userId: user.id, email: user.email, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '365d' }
      );
      return res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    }
    res.status(401).json({ error: 'Invalid credentials' });
  } catch (err) {
    next(err);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const newToken = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    res.json({
      token: newToken,
      user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
    });
  } catch (err) {
    next(err);
  }
});

// Get current user info
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ id: user.id, email: user.email, name: user.name, avatar: user.avatar });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
