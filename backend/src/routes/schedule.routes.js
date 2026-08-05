const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const { dayType } = req.query;
    const where = { userId: req.userId };
    if (dayType) where.dayType = dayType;
    const blocks = await prisma.scheduleBlock.findMany({
      where,
      orderBy: { order: 'asc' },
    });
    res.json(blocks);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { dayType, startTime, endTime, activity, category, order } = req.body;
    let finalOrder = order;
    if (finalOrder == null) {
      const last = await prisma.scheduleBlock.findFirst({ where: { userId: req.userId }, orderBy: { order: 'desc' } });
      finalOrder = last ? last.order + 1 : 1;
    }
    const block = await prisma.scheduleBlock.create({
      data: { userId: req.userId, dayType, startTime, endTime, activity, category, order: finalOrder },
    });
    res.status(201).json(block);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dayType, startTime, endTime, activity, category, order } = req.body;
    const block = await prisma.scheduleBlock.update({
      where: { id: parseInt(id) },
      data: { dayType, startTime, endTime, activity, category, order },
    });
    res.json(block);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.scheduleBlock.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Schedule block deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
