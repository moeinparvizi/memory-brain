const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const items = await prisma.checklistItem.findMany({
      where: { userId: req.userId },
      orderBy: { order: 'asc' },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { text, done, category, order } = req.body;
    let finalOrder = order;
    if (finalOrder == null) {
      const last = await prisma.checklistItem.findFirst({ where: { userId: req.userId }, orderBy: { order: 'desc' } });
      finalOrder = last ? last.order + 1 : 1;
    }
    const item = await prisma.checklistItem.create({
      data: { userId: req.userId, text, done, category, order: finalOrder },
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, done, category, order } = req.body;
    const item = await prisma.checklistItem.update({
      where: { id: parseInt(id) },
      data: { text, done, category, order },
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.checklistItem.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Checklist item deleted' });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/toggle', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { done } = req.body;
    const item = await prisma.checklistItem.findUnique({ where: { id: parseInt(id) } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const updated = await prisma.checklistItem.update({
      where: { id: parseInt(id) },
      data: { done: done !== undefined ? done : !item.done },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
