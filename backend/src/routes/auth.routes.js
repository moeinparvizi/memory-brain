const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../config/db');
const rateLimit = require('express-rate-limit');
const appSession = require('../services/app-session');

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });
router.use(['/login', '/firebase', '/google', '/phone/send-otp', '/phone/verify-otp'], authLimiter);
router.use(require('./public-auth.routes')());

// ─── Phone OTP Helpers ───

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendSms(phone, message) {
  const provider = process.env.SMS_PROVIDER || 'kavenegar';

  if (provider === 'kavenegar') {
    const receptor = phone.replace('+', '');
    const apiUrl = `https://api.kavenegar.com/v1/${process.env.KAVENEGAR_API_KEY}/verify.json?receptor=${receptor}&token=${message}&template=${process.env.SMS_TEMPLATE || 'memory-verify'}`;
    const res = await fetch(apiUrl);
    const data = await res.json();
    if (data.return && data.return.status !== 200) {
      throw new Error(data.return.message || 'SMS send failed');
    }
  } else if (provider === 'smsir') {
    const res = await fetch('https://api.sms.ir/v1/send/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SMSIR_API_KEY}`,
      },
      body: JSON.stringify({
        mobile: phone.replace('+', ''),
        templateId: parseInt(process.env.SMSIR_TEMPLATE_ID),
        parameters: [{ name: 'CODE', value: message }],
      }),
    });
    const data = await res.json();
    if (!data.isSuccess) {
      throw new Error(data.message || 'SMS send failed');
    }
  } else if (provider === 'console') {
    console.log(`[SMS] OTP for ${phone}: ${message}`);
  } else {
    throw new Error(`Unknown SMS provider: ${provider}`);
  }
}

function normalizePhone(phone) {
  let p = phone.replace(/\s|-/g, '');
  if (p.startsWith('0')) {
    p = '+98' + p.slice(1);
  } else if (!p.startsWith('+')) {
    p = '+98' + p;
  }
  return p;
}

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// Google Sign-In: verify Google token and issue JWT
router.post('/google', async (req, res, next) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || (process.env.NODE_ENV === 'production' && !process.env.AUTH_ALLOWED_GOOGLE_EMAIL)) {
      return res.status(404).json({ error: 'Google sign-in is not enabled' });
    }
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
    if (process.env.NODE_ENV === 'production' &&
        (!payload.email_verified || email?.toLowerCase() !== process.env.AUTH_ALLOWED_GOOGLE_EMAIL.toLowerCase())) {
      return res.status(403).json({ error: 'This account is not allowed' });
    }

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
    if (process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD &&
        typeof username === 'string' && typeof password === 'string' &&
        username === process.env.AUTH_USERNAME && password === process.env.AUTH_PASSWORD) {
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

    res.json(appSession(user));
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

// ─── Phone OTP Login ───

// Send OTP code to phone number
router.post('/phone/send-otp', async (req, res, next) => {
  try {
    if (!process.env.SMS_PROVIDER || (process.env.NODE_ENV === 'production' &&
        (!process.env.AUTH_ALLOWED_PHONE || process.env.SMS_PROVIDER === 'console'))) {
      return res.status(404).json({ error: 'Phone sign-in is not enabled' });
    }
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'شماره موبایل الزامی است' });
    }

    const normalizedPhone = normalizePhone(phone);
    if (process.env.NODE_ENV === 'production' && normalizedPhone !== normalizePhone(process.env.AUTH_ALLOWED_PHONE)) {
      return res.status(403).json({ error: 'This account is not allowed' });
    }
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

    // Save OTP to database
    await prisma.phoneVerification.create({
      data: {
        phone: normalizedPhone,
        code,
        expiresAt,
      },
    });

    // Send SMS
    await sendSms(normalizedPhone, code);

    res.json({ message: 'کد تایید ارسال شد' });
  } catch (err) {
    console.error('Send OTP error:', err);
    next(err);
  }
});

// Verify OTP and login/register
router.post('/phone/verify', async (req, res, next) => {
  try {
    if (!process.env.SMS_PROVIDER || (process.env.NODE_ENV === 'production' &&
        (!process.env.AUTH_ALLOWED_PHONE || process.env.SMS_PROVIDER === 'console'))) {
      return res.status(404).json({ error: 'Phone sign-in is not enabled' });
    }
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: 'شماره موبایل و کد تایید الزامی است' });
    }

    const normalizedPhone = normalizePhone(phone);
    if (process.env.NODE_ENV === 'production' && normalizedPhone !== normalizePhone(process.env.AUTH_ALLOWED_PHONE)) {
      return res.status(403).json({ error: 'This account is not allowed' });
    }

    // Find valid OTP
    const verification = await prisma.phoneVerification.findFirst({
      where: {
        phone: normalizedPhone,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      return res.status(401).json({ error: 'کد تایید نامعتبر یا منقضی شده است' });
    }

    // Mark OTP as used
    await prisma.phoneVerification.update({
      where: { id: verification.id },
      data: { used: true },
    });

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: normalizedPhone,
          name: `کاربر ${normalizedPhone.slice(-4)}`,
        },
      });
    }

    // Issue JWT
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '365d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    next(err);
  }
});

module.exports = router;
