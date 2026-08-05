const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// ─── PHASES ───

router.get('/phases', async (req, res, next) => {
  try {
    const phases = await prisma.phase.findMany({
      where: { userId: req.userId },
      include: { tasks: { orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    });
    res.json(phases);
  } catch (err) {
    next(err);
  }
});

router.post('/phases', async (req, res, next) => {
  try {
    const { title, duration, goal, status, progress, order } = req.body;
    let finalOrder = order;
    if (finalOrder == null) {
      const last = await prisma.phase.findFirst({ where: { userId: req.userId }, orderBy: { order: 'desc' } });
      finalOrder = last ? last.order + 1 : 1;
    }
    const phase = await prisma.phase.create({
      data: { userId: req.userId, title, duration, goal, status: status || 'not-started', progress: progress || 0, order: finalOrder },
    });
    res.status(201).json(phase);
  } catch (err) {
    next(err);
  }
});

router.put('/phases/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, duration, goal, status, progress, order } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (duration !== undefined) data.duration = duration;
    if (goal !== undefined) data.goal = goal;
    if (status !== undefined) data.status = status;
    if (progress !== undefined) data.progress = progress;
    if (order !== undefined) data.order = order;
    const phase = await prisma.phase.update({ where: { id: parseInt(id) }, data });
    res.json(phase);
  } catch (err) {
    next(err);
  }
});

router.delete('/phases/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.phase.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Phase deleted' });
  } catch (err) {
    next(err);
  }
});

router.patch('/phases/reorder', async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    const updates = orderedIds.map((id, index) =>
      prisma.phase.update({ where: { id }, data: { order: index + 1 } })
    );
    await prisma.$transaction(updates);
    res.json({ message: 'Phases reordered' });
  } catch (err) {
    next(err);
  }
});

// ─── TASKS ───

router.get('/phases/:id/tasks', async (req, res, next) => {
  try {
    const { id } = req.params;
    const tasks = await prisma.task.findMany({
      where: { phaseId: parseInt(id) },
      orderBy: { order: 'asc' },
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

router.post('/phases/:id/tasks', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { month, topic, output, done, notes, order } = req.body;
    let finalOrder = order;
    if (finalOrder == null) {
      const last = await prisma.task.findFirst({
        where: { phaseId: parseInt(id) },
        orderBy: { order: 'desc' },
      });
      finalOrder = last ? last.order + 1 : 1;
    }
    const task = await prisma.task.create({
      data: { phaseId: parseInt(id), month, topic, output, done: done || false, notes, order: finalOrder },
    });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

router.put('/phases/:phaseId/tasks/:taskId', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { month, topic, output, done, notes, order } = req.body;
    const data = {};
    if (month !== undefined) data.month = month;
    if (topic !== undefined) data.topic = topic;
    if (output !== undefined) data.output = output;
    if (done !== undefined) data.done = done;
    if (notes !== undefined) data.notes = notes;
    if (order !== undefined) data.order = order;
    const task = await prisma.task.update({ where: { id: parseInt(taskId) }, data });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.delete('/phases/:phaseId/tasks/:taskId', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    await prisma.task.delete({ where: { id: parseInt(taskId) } });
    res.json({ message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
});

router.patch('/phases/:phaseId/tasks/:taskId/toggle', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const task = await prisma.task.findUnique({ where: { id: parseInt(taskId) } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const updated = await prisma.task.update({
      where: { id: parseInt(taskId) },
      data: { done: !task.done },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.patch('/phases/:phaseId/tasks/reorder', async (req, res, next) => {
  try {
    const { orderedIds } = req.body;
    const updates = orderedIds.map((id, index) =>
      prisma.task.update({ where: { id }, data: { order: index + 1 } })
    );
    await prisma.$transaction(updates);
    res.json({ message: 'Tasks reordered' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
