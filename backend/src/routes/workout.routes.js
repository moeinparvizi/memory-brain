const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/sessions', async (req, res, next) => {
  try {
    const sessions = await prisma.workoutSession.findMany({
      where: { userId: req.userId },
      include: { exercises: { orderBy: { order: 'asc' } } },
    });
    res.json(sessions);
  } catch (err) {
    next(err);
  }
});

router.post('/sessions', async (req, res, next) => {
  try {
    const { day, startTime, endTime, type, duration, exercises } = req.body;
    const session = await prisma.workoutSession.create({
      data: {
        userId: req.userId,
        day,
        startTime,
        endTime,
        type,
        duration,
        exercises: exercises
          ? { create: exercises.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, weight: e.weight, order: e.order })) }
          : undefined,
      },
      include: { exercises: true },
    });
    res.status(201).json(session);
  } catch (err) {
    next(err);
  }
});

router.put('/sessions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { day, startTime, endTime, type, duration, exercises } = req.body;
    const sessionId = parseInt(id);

    if (exercises) {
      const exerciseIds = exercises.filter(e => e.id).map(e => e.id);
      const existingExercises = await prisma.exercise.findMany({ where: { sessionId } });
      const existingIds = existingExercises.map(e => e.id);

      for (const existingId of existingIds) {
        if (!exerciseIds.includes(existingId)) {
          await prisma.exercise.delete({ where: { id: existingId } });
        }
      }

      for (const exercise of exercises) {
        if (exercise.id) {
          await prisma.exercise.update({
            where: { id: exercise.id },
            data: { name: exercise.name, sets: exercise.sets, reps: exercise.reps, weight: exercise.weight, order: exercise.order },
          });
        } else {
          await prisma.exercise.create({
            data: {
              sessionId,
              name: exercise.name,
              sets: exercise.sets,
              reps: exercise.reps,
              weight: exercise.weight,
              order: exercise.order ?? 0,
            },
          });
        }
      }
    }

    const session = await prisma.workoutSession.update({
      where: { id: sessionId },
      data: { day, startTime, endTime, type, duration },
      include: { exercises: { orderBy: { order: 'asc' } } },
    });
    res.json(session);
  } catch (err) {
    next(err);
  }
});

router.delete('/sessions/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.workoutSession.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Session deleted' });
  } catch (err) {
    next(err);
  }
});

router.post('/sessions/:id/exercises', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, sets, reps, weight, order } = req.body;
    let finalOrder = order;
    if (finalOrder == null) {
      const last = await prisma.exercise.findFirst({ where: { sessionId: parseInt(id) }, orderBy: { order: 'desc' } });
      finalOrder = last ? last.order + 1 : 1;
    }
    const exercise = await prisma.exercise.create({
      data: { sessionId: parseInt(id), name, sets, reps, weight, order: finalOrder },
    });
    res.status(201).json(exercise);
  } catch (err) {
    next(err);
  }
});

router.put('/exercises/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, sets, reps, weight, order } = req.body;
    const exercise = await prisma.exercise.update({
      where: { id: parseInt(id) },
      data: { name, sets, reps, weight, order },
    });
    res.json(exercise);
  } catch (err) {
    next(err);
  }
});

router.delete('/exercises/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.exercise.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Exercise deleted' });
  } catch (err) {
    next(err);
  }
});

router.post('/log', async (req, res, next) => {
  try {
    const { sessionId, date, completed, notes } = req.body;
    const log = await prisma.workoutLog.create({
      data: {
        userId: req.userId,
        sessionId,
        date: date ? new Date(date) : new Date(),
        completed,
        notes,
      },
    });
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
});

router.delete('/log/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.workoutLog.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Log deleted' });
  } catch (err) {
    next(err);
  }
});

router.get('/log', async (req, res, next) => {
  try {
    const { month } = req.query;
    const where = { userId: req.userId };
    if (month) {
      const start = new Date(`${month}-01`);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);
      where.date = { gte: start, lt: end };
    }
    const logs = await prisma.workoutLog.findMany({ where });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
