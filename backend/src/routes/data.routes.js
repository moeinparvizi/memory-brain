const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/export', async (req, res, next) => {
  try {
    const userId = req.userId;
    const [phases, tasks, scheduleBlocks, habits, habitLogs, timeSlots, supplements, supplementLogs, workoutSessions, workoutExercises, workoutLogs, financeEntries, financeDebts, resources, checklistItems, settings] = await Promise.all([
      prisma.phase.findMany({ where: { userId }, include: { tasks: { orderBy: { order: 'asc' } } } }),
      prisma.scheduleBlock.findMany({ where: { userId } }),
      prisma.habit.findMany({ where: { userId } }),
      prisma.habitLog.findMany({ where: { habit: { userId } } }),
      prisma.timeSlot.findMany({ where: { userId }, include: { supplements: true } }),
      prisma.supplement.findMany({ where: { timeSlot: { userId } } }),
      prisma.supplementLog.findMany({ where: { supplement: { timeSlot: { userId } } } }),
      prisma.workoutSession.findMany({ where: { userId }, include: { exercises: true } }),
      prisma.workoutExercise.findMany({ where: { session: { userId } } }),
      prisma.workoutLog.findMany({ where: { session: { userId } } }),
      prisma.financeEntry.findMany({ where: { userId } }),
      prisma.financeDebt.findMany({ where: { userId } }),
      prisma.resource.findMany({ where: { userId } }),
      prisma.checklistItem.findMany({ where: { userId } }),
      prisma.setting.findMany({ where: { userId } }),
    ]);

    res.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        phases,
        scheduleBlocks,
        habits,
        habitLogs,
        timeSlots,
        supplements,
        supplementLogs,
        workoutSessions,
        workoutExercises,
        workoutLogs,
        financeEntries,
        financeDebts,
        resources,
        checklistItems,
        settings,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const userId = req.userId;
    const { data } = req.body;
    if (!data) return res.status(400).json({ error: 'No data provided' });

    await prisma.$transaction(async (tx) => {
      if (data.phases) {
        for (const phase of data.phases) {
          const { id: _pid, tasks: phaseTasks, ...phaseData } = phase;
          const created = await tx.phase.upsert({
            where: { id: phase.id },
            update: { ...phaseData, userId },
            create: { ...phaseData, userId },
          });
          if (phaseTasks) {
            for (const task of phaseTasks) {
              const { id: _tid, ...taskData } = task;
              await tx.task.upsert({
                where: { id: task.id },
                update: { ...taskData, phaseId: created.id },
                create: { ...taskData, phaseId: created.id },
              });
            }
          }
        }
      }

      if (data.scheduleBlocks) {
        for (const block of data.scheduleBlocks) {
          const { id: _bid, ...blockData } = block;
          await tx.scheduleBlock.upsert({
            where: { id: block.id },
            update: { ...blockData, userId },
            create: { ...blockData, userId },
          });
        }
      }

      if (data.habits) {
        for (const habit of data.habits) {
          const { id: _hid, ...habitData } = habit;
          await tx.habit.upsert({
            where: { id: habit.id },
            update: { ...habitData, userId },
            create: { ...habitData, userId },
          });
        }
      }

      if (data.habitLogs) {
        for (const log of data.habitLogs) {
          const { id: _lid, ...logData } = log;
          await tx.habitLog.upsert({
            where: { id: log.id },
            update: logData,
            create: logData,
          });
        }
      }

      if (data.timeSlots) {
        for (const slot of data.timeSlots) {
          const { id: _sid, supplements: slotSupplements, ...slotData } = slot;
          const created = await tx.timeSlot.upsert({
            where: { id: slot.id },
            update: { ...slotData, userId },
            create: { ...slotData, userId },
          });
          if (slotSupplements) {
            for (const supp of slotSupplements) {
              const { id: _suppId, ...suppData } = supp;
              await tx.supplement.upsert({
                where: { id: supp.id },
                update: { ...suppData, timeSlotId: created.id },
                create: { ...suppData, timeSlotId: created.id },
              });
            }
          }
        }
      }

      if (data.supplementLogs) {
        for (const log of data.supplementLogs) {
          const { id: _slid, ...logData } = log;
          await tx.supplementLog.upsert({
            where: { id: log.id },
            update: logData,
            create: logData,
          });
        }
      }

      if (data.workoutSessions) {
        for (const session of data.workoutSessions) {
          const { id: _wsid, exercises: sessionExercises, ...sessionData } = session;
          const created = await tx.workoutSession.upsert({
            where: { id: session.id },
            update: { ...sessionData, userId },
            create: { ...sessionData, userId },
          });
          if (sessionExercises) {
            for (const ex of sessionExercises) {
              const { id: _eid, ...exData } = ex;
              await tx.workoutExercise.upsert({
                where: { id: ex.id },
                update: { ...exData, sessionId: created.id },
                create: { ...exData, sessionId: created.id },
              });
            }
          }
        }
      }

      if (data.workoutLogs) {
        for (const log of data.workoutLogs) {
          const { id: _wlid, ...logData } = log;
          await tx.workoutLog.upsert({
            where: { id: log.id },
            update: logData,
            create: logData,
          });
        }
      }

      if (data.financeEntries) {
        for (const entry of data.financeEntries) {
          const { id: _feid, ...entryData } = entry;
          await tx.financeEntry.upsert({
            where: { id: entry.id },
            update: { ...entryData, userId },
            create: { ...entryData, userId },
          });
        }
      }

      if (data.financeDebts) {
        for (const debt of data.financeDebts) {
          const { id: _fdid, ...debtData } = debt;
          await tx.financeDebt.upsert({
            where: { id: debt.id },
            update: { ...debtData, userId },
            create: { ...debtData, userId },
          });
        }
      }

      if (data.resources) {
        for (const resource of data.resources) {
          const { id: _rid, ...resourceData } = resource;
          await tx.resource.upsert({
            where: { id: resource.id },
            update: { ...resourceData, userId },
            create: { ...resourceData, userId },
          });
        }
      }

      if (data.checklistItems) {
        for (const item of data.checklistItems) {
          const { id: _ciid, ...itemData } = item;
          await tx.checklistItem.upsert({
            where: { id: item.id },
            update: { ...itemData, userId },
            create: { ...itemData, userId },
          });
        }
      }

      if (data.settings) {
        for (const setting of data.settings) {
          const { id: _stid, ...settingData } = setting;
          await tx.setting.upsert({
            where: { id: setting.id },
            update: { ...settingData, userId },
            create: { ...settingData, userId },
          });
        }
      }
    });

    res.json({ message: 'Import successful' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
