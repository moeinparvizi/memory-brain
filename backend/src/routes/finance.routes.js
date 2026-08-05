const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const { month } = req.query;
    const where = { userId: req.userId };
    if (month) where.month = month;
    const entries = await prisma.financeEntry.findMany({ where });
    if (month) {
      return res.json(entries[0] || null);
    }
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { month, income, expenses, allocations, notes } = req.body;
    const entry = await prisma.financeEntry.create({
      data: { userId: req.userId, month, income, expenses, allocations, notes },
    });
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { month, income, expenses, allocations, notes } = req.body;
    const entry = await prisma.financeEntry.update({
      where: { id: parseInt(id) },
      data: { month, income, expenses, allocations, notes },
    });
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

router.get('/debts', async (req, res, next) => {
  try {
    const debts = await prisma.debt.findMany({ where: { userId: req.userId } });
    res.json(debts);
  } catch (err) {
    next(err);
  }
});

router.post('/debts', async (req, res, next) => {
  try {
    const { title, totalAmount, paidAmount, monthlyPay, dueDate, done } = req.body;
    const debt = await prisma.debt.create({
      data: { userId: req.userId, title, totalAmount, paidAmount, monthlyPay, dueDate: dueDate ? new Date(dueDate) : null, done },
    });
    res.status(201).json(debt);
  } catch (err) {
    next(err);
  }
});

router.put('/debts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, totalAmount, paidAmount, monthlyPay, dueDate, done } = req.body;
    const debt = await prisma.debt.update({
      where: { id: parseInt(id) },
      data: { title, totalAmount, paidAmount, monthlyPay, dueDate: dueDate ? new Date(dueDate) : null, done },
    });
    res.json(debt);
  } catch (err) {
    next(err);
  }
});

router.delete('/debts/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.debt.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Debt deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
