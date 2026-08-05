const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ results: [] });
    }

    const query = q.trim();
    const userId = req.userId;

    const [phases, habits, timeSlots, supplements, financeEntries, financeDebts, resources, checklistItems, scheduleBlocks, workoutSessions] = await Promise.all([
      prisma.phase.findMany({
        where: { userId, OR: [{ title: { contains: query } }, { description: { contains: query } }] },
        include: { tasks: true },
      }),
      prisma.habit.findMany({
        where: { userId, OR: [{ name: { contains: query } }, { description: { contains: query } }] },
      }),
      prisma.timeSlot.findMany({
        where: { userId, OR: [{ label: { contains: query } }] },
        include: { supplements: true },
      }),
      prisma.supplement.findMany({
        where: { timeSlot: { userId }, OR: [{ name: { contains: query } }, { notes: { contains: query } }] },
      }),
      prisma.financeEntry.findMany({
        where: { userId, OR: [{ month: { contains: query } }, { notes: { contains: query } }] },
      }),
      prisma.financeDebt.findMany({
        where: { userId, OR: [{ person: { contains: query } }, { notes: { contains: query } }] },
      }),
      prisma.resource.findMany({
        where: { userId, OR: [{ name: { contains: query } }, { description: { contains: query } }, { url: { contains: query } }] },
      }),
      prisma.checklistItem.findMany({
        where: { userId, OR: [{ title: { contains: query } }] },
      }),
      prisma.scheduleBlock.findMany({
        where: { userId, OR: [{ activity: { contains: query } }, { notes: { contains: query } }] },
      }),
      prisma.workoutSession.findMany({
        where: { userId, OR: [{ name: { contains: query } }, { notes: { contains: query } }] },
      }),
    ]);

    const results = [];

    phases.forEach(p => results.push({ type: 'phase', icon: '🗺️', label: p.title, detail: p.description || '', route: '/roadmap' }));
    habits.forEach(h => results.push({ type: 'habit', icon: h.emoji || '✅', label: h.name, detail: h.description || '', route: '/habits' }));
    timeSlots.forEach(s => results.push({ type: 'supplement-slot', icon: s.emoji || '💊', label: s.label, detail: s.time, route: '/supplements' }));
    supplements.forEach(s => results.push({ type: 'supplement', icon: '💊', label: s.name, detail: s.dose || '', route: '/supplements' }));
    financeEntries.forEach(e => results.push({ type: 'finance', icon: '💰', label: e.month, detail: e.notes || '', route: '/finance' }));
    financeDebts.forEach(d => results.push({ type: 'debt', icon: '💸', label: `${d.person}: ${d.amount}`, detail: d.notes || '', route: '/finance' }));
    resources.forEach(r => results.push({ type: 'resource', icon: '📚', label: r.name, detail: r.description || '', route: '/resources' }));
    checklistItems.forEach(i => results.push({ type: 'checklist', icon: i.done ? '☑️' : '☐', label: i.title, detail: '', route: '/checklist' }));
    scheduleBlocks.forEach(b => results.push({ type: 'schedule', icon: '📅', label: b.activity, detail: `${b.startTime}-${b.endTime}`, route: '/schedule' }));
    workoutSessions.forEach(s => results.push({ type: 'workout', icon: '🏋️', label: s.name, detail: s.notes || '', route: '/workout' }));

    res.json({ results: results.slice(0, 50) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
