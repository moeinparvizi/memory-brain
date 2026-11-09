const prisma = require('../config/db');

// Resolve every client-supplied identifier through its owner before a handler can
// read or mutate it. Bulk and nested payloads are checked in full before writes.
module.exports = domain => async (req, res, next) => {
  const owned = (model, id, scope = {}) => prisma[model].findFirst({ where: { id: Number(id), ...scope } });
  const user = { userId: req.userId };
  const scopes = { task: { phase: user }, exercise: { session: user }, supplement: { timeSlot: user } };
  const check = async (model, id, extra = {}) => {
    if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id)) || !await owned(model, id, { ...(scopes[model] || user), ...extra })) {
      const error = new Error('Record not found'); error.status = 404; throw error;
    }
  };
  try {
    const parts = req.path.split('/').filter(Boolean).map(part => decodeURIComponent(part));
    const body = req.body || {};
    const simple = { resources: 'resource', habits: 'habit', finance: 'financeEntry', checklist: 'checklistItem', schedule: 'scheduleBlock' };
    if (simple[domain]) {
      if (domain === 'habits' && parts[0] === 'streak') await check('habit', parts[1]);
      else if (domain === 'finance' && parts[0] === 'debts' && parts[1]) await check('debt', parts[1]);
      else if (parts[0] && !(domain === 'habits' && ['log', 'reorder'].includes(parts[0])) && !(domain === 'finance' && parts[0] === 'debts')) await check(simple[domain], parts[0]);
      if (domain === 'habits' && parts[0] === 'reorder' && Array.isArray(body.habitIds)) for (const id of body.habitIds) await check('habit', id);
    }
    if (domain === 'roadmap') {
      if (parts[0] === 'phases' && parts[1] && parts[1] !== 'reorder') await check('phase', parts[1]);
      if (parts[2] === 'tasks' && parts[3] && parts[3] !== 'reorder') await check('task', parts[3], { phaseId: Number(parts[1]) });
      if (parts.at(-1) === 'reorder') {
        if (!Array.isArray(body.orderedIds)) return res.status(400).json({error:'orderedIds must be an array'});
        for(const id of body.orderedIds) await check(parts[2] === 'tasks' ? 'task' : 'phase', id, parts[2] === 'tasks' ? {phaseId:Number(parts[1])} : {});
      }
    }
    if (domain === 'supplements') {
      if(parts[0] === 'timeslots' && parts[1]) await check('timeSlot',parts[1]);
      else if(parts[0] && !['timeslots', 'log', 'stats'].includes(parts[0])) await check('supplement',parts[0]);
      if(body.timeSlotId !== undefined) await check('timeSlot',body.timeSlotId);
      if(body.supplementId !== undefined) await check('supplement',body.supplementId);
      if(req.query.timeSlotId !== undefined) await check('timeSlot',req.query.timeSlotId);
    }
    if (domain === 'workout') {
      if(parts[0] === 'sessions' && parts[1]) await check('workoutSession',parts[1]);
      if(parts[0] === 'exercises' && parts[1]) await check('exercise',parts[1]);
      if(parts[0] === 'log' && parts[1]) await check('workoutLog',parts[1]);
      if(body.sessionId !== undefined) await check('workoutSession',body.sessionId);
      if(req.method === 'PUT' && parts[0] === 'sessions' && parts[1] && Array.isArray(body.exercises)) for(const exercise of body.exercises) if(exercise.id !== undefined) await check('exercise',exercise.id,{sessionId:Number(parts[1])});
    }
    next();
  } catch(error) {
    if(error.status === 404) return res.status(404).json({error:'Record not found'});
    next(error);
  }
};
