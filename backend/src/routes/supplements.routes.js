const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/timeslots', async (req, res, next) => {
  try {
    const timeslots = await prisma.timeSlot.findMany({
      where: { userId: req.userId },
      include: { supplements: { orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    });
    res.json(timeslots);
  } catch (err) {
    next(err);
  }
});

router.post('/timeslots', async (req, res, next) => {
  try {
    const { label, time, emoji, order } = req.body;
    let finalOrder = order;
    if (finalOrder == null) {
      const last = await prisma.timeSlot.findFirst({ where: { userId: req.userId }, orderBy: { order: 'desc' } });
      finalOrder = last ? last.order + 1 : 1;
    }
    const timeslot = await prisma.timeSlot.create({
      data: { userId: req.userId, label, time, emoji, order: finalOrder },
    });
    res.status(201).json(timeslot);
  } catch (err) {
    next(err);
  }
});

router.put('/timeslots/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { label, time, emoji, order } = req.body;
    const timeslot = await prisma.timeSlot.update({
      where: { id: parseInt(id) },
      data: { label, time, emoji, order },
    });
    res.json(timeslot);
  } catch (err) {
    next(err);
  }
});

router.delete('/timeslots/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.timeSlot.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'TimeSlot deleted' });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { timeSlotId } = req.query;
    const where = timeSlotId ? { timeSlotId: parseInt(timeSlotId) } : {};
    const supplements = await prisma.supplement.findMany({
      where,
      orderBy: { order: 'asc' },
    });
    res.json(supplements);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { timeSlotId, name, dose, notes, category, order } = req.body;
    const supplement = await prisma.supplement.create({
      data: { timeSlotId, name, dose, notes, category, order },
    });
    res.status(201).json(supplement);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { timeSlotId, name, dose, notes, category, order } = req.body;
    const supplement = await prisma.supplement.update({
      where: { id: parseInt(id) },
      data: { timeSlotId, name, dose, notes, category, order },
    });
    res.json(supplement);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.supplement.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Supplement deleted' });
  } catch (err) {
    next(err);
  }
});

router.post('/log', async (req, res, next) => {
  try {
    const { supplementId, date, taken } = req.body;
    const logDate = date ? new Date(date) : new Date();
    logDate.setHours(0, 0, 0, 0);

    const existing = await prisma.supplementLog.findFirst({
      where: { supplementId, date: logDate },
    });

    if (existing) {
      const log = await prisma.supplementLog.update({
        where: { id: existing.id },
        data: { taken, takenAt: taken ? new Date() : null },
      });
      return res.json(log);
    }

    const log = await prisma.supplementLog.create({
      data: {
        supplementId,
        date: logDate,
        taken,
        takenAt: taken ? new Date() : null,
      },
    });
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
});

router.get('/log', async (req, res, next) => {
  try {
    const { date } = req.query;
    let where = {};
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setDate(d.getDate() + 1);
      where.date = { gte: d, lt: end };
    }
    const logs = await prisma.supplementLog.findMany({ where });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const userTimeSlots = await prisma.timeSlot.findMany({
      where: { userId: req.userId },
      include: { supplements: true },
    });
    const allSupplements = userTimeSlots.flatMap(ts => ts.supplements).filter(s => s.category === 'daily');
    const totalExpected = allSupplements.length * 7;

    const logs = await prisma.supplementLog.findMany({
      where: { date: { gte: weekStart, lt: weekEnd }, taken: true },
    });

    const percentage = totalExpected > 0 ? Math.round((logs.length / totalExpected) * 100) : 0;

    res.json({ totalExpected, taken: logs.length, percentage, weekStart, weekEnd });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
