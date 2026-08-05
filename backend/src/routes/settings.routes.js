const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const settings = await prisma.setting.findMany({
      where: { userId: req.userId },
    });
    const result = {};
    settings.forEach((s) => { result[s.key] = s.value; });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const updates = req.body;
    const results = {};
    for (const [key, value] of Object.entries(updates)) {
      const setting = await prisma.setting.upsert({
        where: { userId_key: { userId: req.userId, key } },
        update: { value },
        create: { userId: req.userId, key, value },
      });
      results[setting.key] = setting.value;
    }
    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
