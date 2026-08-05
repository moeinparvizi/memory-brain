const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const habits = await prisma.habit.findMany({
      where: { userId: req.userId },
      orderBy: { order: 'asc' },
    });
    res.json(habits);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, emoji, color, active, order } = req.body;
    let finalOrder = order;
    if (finalOrder == null) {
      const last = await prisma.habit.findFirst({ where: { userId: req.userId }, orderBy: { order: 'desc' } });
      finalOrder = last ? last.order + 1 : 1;
    }
    const habit = await prisma.habit.create({
      data: { userId: req.userId, name, emoji, color, active, order: finalOrder },
    });
    res.status(201).json(habit);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, emoji, color, active, order } = req.body;
    const habit = await prisma.habit.update({
      where: { id: parseInt(id) },
      data: { name, emoji, color, active, order },
    });
    res.json(habit);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.habit.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Habit deleted' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/log', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, done } = req.body;
    const logDate = date ? new Date(date) : new Date();
    logDate.setHours(0, 0, 0, 0);

    const existing = await prisma.habitLog.findUnique({
      where: { habitId_date: { habitId: parseInt(id), date: logDate } },
    });

    if (existing) {
      const log = await prisma.habitLog.update({
        where: { id: existing.id },
        data: { done },
      });
      return res.json(log);
    }

    const log = await prisma.habitLog.create({
      data: { habitId: parseInt(id), date: logDate, done },
    });
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
});

router.get('/log', async (req, res, next) => {
  try {
    const { week } = req.query;
    let where = {};
    if (week) {
      const d = new Date(week);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      where.date = { gte: weekStart, lt: weekEnd };
    }
    const userHabits = await prisma.habit.findMany({ where: { userId: req.userId }, select: { id: true } });
    const habitIds = userHabits.map(h => h.id);
    where.habitId = { in: habitIds };

    const logs = await prisma.habitLog.findMany({
      where,
      include: { habit: true },
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

router.get('/streak/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const logs = await prisma.habitLog.findMany({
      where: { habitId: parseInt(id), done: true },
      orderBy: { date: 'desc' },
    });

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);

      const found = logs.find((l) => {
        const logDate = new Date(l.date);
        logDate.setHours(0, 0, 0, 0);
        return logDate.getTime() === checkDate.getTime();
      });

      if (found) {
        streak++;
      } else if (i > 0) {
        break;
      } else {
        break;
      }
    }

    res.json({ habitId: parseInt(id), streak });
  } catch (err) {
    next(err);
  }
});

router.patch('/reorder', async (req, res, next) => {
  try {
    const { habitIds } = req.body;
    if (!Array.isArray(habitIds)) {
      return res.status(400).json({ error: 'habitIds must be an array' });
    }
    const updates = habitIds.map((id, index) =>
      prisma.habit.update({ where: { id }, data: { order: index + 1 } })
    );
    await prisma.$transaction(updates);
    res.json({ message: 'Reordered successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
