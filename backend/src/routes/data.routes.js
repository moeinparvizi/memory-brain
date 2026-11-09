const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');
const router = express.Router();
router.use(auth);

// Backup keys remain stable while database IDs are always freshly allocated.
const collections = [
  ['phases', 'phase', 'title duration goal status progress order', 'userId'],
  ['tasks', 'task', 'month topic output done notes order', 'phaseId', 'phases', 'tasks'],
  ['scheduleBlocks', 'scheduleBlock', 'dayType startTime endTime activity category order', 'userId'],
  ['habits', 'habit', 'name emoji color active order', 'userId'],
  ['habitLogs', 'habitLog', 'date done', 'habitId', 'habits'],
  ['timeSlots', 'timeSlot', 'label time emoji order', 'userId'],
  ['supplements', 'supplement', 'name dose notes category order', 'timeSlotId', 'timeSlots', 'supplements'],
  ['supplementLogs', 'supplementLog', 'date taken takenAt', 'supplementId', 'supplements'],
  ['workoutSessions', 'workoutSession', 'day startTime endTime type duration', 'userId'],
  ['workoutExercises', 'exercise', 'name sets reps weight order', 'sessionId', 'workoutSessions', 'exercises'],
  ['workoutLogs', 'workoutLog', 'date completed notes', 'sessionId', 'workoutSessions'],
  ['financeEntries', 'financeEntry', 'month income expenses allocations notes', 'userId'],
  ['financeDebts', 'debt', 'title totalAmount paidAmount monthlyPay dueDate done', 'userId'],
  ['resources', 'resource', 'topic name url type order', 'userId'],
  ['checklistItems', 'checklistItem', 'text done category order', 'userId'],
  ['settings', 'setting', 'key value', 'userId'],
];
const relationScopes = {
  tasks: userId => ({ phase: { userId } }),
  habitLogs: userId => ({ habit: { userId } }),
  supplements: userId => ({ timeSlot: { userId } }),
  supplementLogs: userId => ({ supplement: { timeSlot: { userId } } }),
  workoutExercises: userId => ({ session: { userId } }),
  workoutLogs: userId => ({ userId, session: { userId } }),
};
router.get('/export', async (req, res, next) => {
  try {
    const rows = await Promise.all(collections.map(([key, model]) => prisma[model].findMany({ where: relationScopes[key]?.(req.userId) || { userId: req.userId } })));
    const data = Object.fromEntries(collections.map(([key], index) => [key, rows[index]]));
    // Preserve the nested form consumed by older backup importers.
    for(const [parents, children, nested, foreignKey] of [['phases','tasks','tasks','phaseId'],['timeSlots','supplements','supplements','timeSlotId'],['workoutSessions','workoutExercises','exercises','sessionId']]) {
      data[parents] = data[parents].map(parent => ({...parent, [nested]: data[children].filter(child => child[foreignKey] === parent.id)}));
    }
    res.json({ version: 1, exportedAt: new Date().toISOString(), data });
  } catch(error) { next(error); }
});
router.post('/import', async (req, res, next) => {
  try {
    const { data } = req.body;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return res.status(400).json({ error: 'No data provided' });
    await prisma.$transaction(async tx => {
      const maps = {};
      for(const [key, model, fields, foreignKey, parents, nested] of collections) {
        if(data[key] !== undefined && !Array.isArray(data[key])) { const error = new Error('Invalid backup collection'); error.status = 400; throw error; }
        const records = [...(data[key] || [])];
        if(nested) for(const parent of data[parents] || []) for(const child of parent[nested] || []) {
          if(child.id === undefined || !records.some(record => record.id === child.id)) records.push({...child,[foreignKey]:parent.id});
        }
        maps[key] = new Map();
        for(const record of records) {
          const row = Object.fromEntries(fields.split(' ').filter(field => record[field] !== undefined).map(field => [field, record[field]]));
          if(foreignKey === 'userId') row.userId = req.userId;
          else {
            row[foreignKey] = maps[parents].get(record[foreignKey]);
            if(row[foreignKey] === undefined) { const error = new Error('Backup contains an unresolved parent'); error.status = 400; throw error; }
          }
          if(model === 'workoutLog') row.userId = req.userId;
          const created = model === 'setting'
            ? await tx.setting.upsert({where:{userId_key:{userId:req.userId,key:row.key}},create:row,update:{value:row.value}})
            : await tx[model].create({data:row});
          if(record.id !== undefined) maps[key].set(record.id,created.id);
        }
      }
    });
    res.json({message:'Import successful'});
  } catch(error) {
    if(error.status === 400) return res.status(400).json({error:error.message});
    next(error);
  }
});
module.exports = router;
