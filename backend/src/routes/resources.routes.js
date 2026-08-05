const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const resources = await prisma.resource.findMany({
      where: { userId: req.userId },
      orderBy: { order: 'asc' },
    });
    res.json(resources);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { topic, name, url, type, order } = req.body;
    let finalOrder = order;
    if (finalOrder == null) {
      const last = await prisma.resource.findFirst({ where: { userId: req.userId }, orderBy: { order: 'desc' } });
      finalOrder = last ? last.order + 1 : 1;
    }
    const resource = await prisma.resource.create({
      data: { userId: req.userId, topic, name, url, type, order: finalOrder },
    });
    res.status(201).json(resource);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { topic, name, url, type, order } = req.body;
    const resource = await prisma.resource.update({
      where: { id: parseInt(id) },
      data: { topic, name, url, type, order },
    });
    res.json(resource);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.resource.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Resource deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
