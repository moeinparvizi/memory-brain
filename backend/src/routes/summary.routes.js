const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');
const phaseProgress = require('../utils/phase-progress');

const router = express.Router();
router.use(auth);

const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

router.get('/daily', async (req, res, next) => {
  try {
    const t = (fa, en) => req.query.lang === 'en' ? en : fa;
    const userId = req.userId;
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - ((today.getDay() + 1) % 7));

    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const dayType = isWeekend ? 'weekend' : 'workday';

    const [habits, habitLogs, timeSlots, supplementLogs, scheduleBlocks, phases, workoutGoal, workoutLogs] = await Promise.all([
      prisma.habit.findMany({ where: { userId, active: true } }),
      prisma.habitLog.findMany({ where: { habit: { userId }, date: { gte: today, lt: tomorrow } } }),
      prisma.timeSlot.findMany({ where: { userId }, include: { supplements: true } }),
      prisma.supplementLog.findMany({ where: { supplement: { timeSlot: { userId } }, date: { gte: today, lt: tomorrow } } }),
      prisma.scheduleBlock.findMany({ where: { userId, dayType } }),
      prisma.phase.findMany({ where: { userId }, include: { tasks: true } }),
      prisma.setting.findUnique({ where: { userId_key: { userId, key: 'weeklyWorkoutGoal' } } }),
      prisma.workoutLog.findMany({ where: { session: { userId }, date: { gte: weekAgo, lt: tomorrow } } }),
    ]);

    const sections = [];

    // Habits
    const activeHabitIds = new Set(habits.map(h => h.id));
    const doneHabits = habitLogs.filter(l => l.done && activeHabitIds.has(l.habitId));
    const missedHabits = habits.length - doneHabits.length;
    if (habits.length > 0) {
      const pct = Math.round((doneHabits.length / habits.length) * 100);
      if (pct === 100) {
        sections.push({ icon: '🎯', title: t('عادت‌ها', 'Habits'), text: t(`عالی! تمام ${habits.length} عادت امروز را انجام دادید.`, `Great! You completed all ${habits.length} habits today.`), mood: 'great' });
      } else if (pct >= 50) {
        sections.push({ icon: '✅', title: t('عادت‌ها', 'Habits'), text: t(`${doneHabits.length} از ${habits.length} عادت انجام شده (${pct}%). ${missedHabits} عادت باقی مانده.`, `${doneHabits.length} of ${habits.length} habits completed (${pct}%). ${missedHabits} remaining.`), mood: 'good' });
      } else {
        sections.push({ icon: '⚠️', title: t('عادت‌ها', 'Habits'), text: t(`فقط ${doneHabits.length} از ${habits.length} عادت انجام شده. فردا بهتر خواهد بود!`, `Only ${doneHabits.length} of ${habits.length} habits completed. Tomorrow is a fresh start!`), mood: 'needs-work' });
      }
    }

    // Supplements
    const allSupplements = timeSlots.flatMap(s => s.supplements);
    const supplementIds = new Set(allSupplements.map(s => s.id));
    const takenCount = new Set(supplementLogs.filter(l => l.taken && supplementIds.has(l.supplementId)).map(l => l.supplementId)).size;
    if (allSupplements.length > 0) {
      const pct = Math.round((takenCount / allSupplements.length) * 100);
      if (pct === 100) {
        sections.push({ icon: '💊', title: t('مکمل‌ها', 'Supplements'), text: t(`تمام ${allSupplements.length} مکمل مصرف شد.`, `All ${allSupplements.length} supplements taken.`), mood: 'great' });
      } else {
        const pending = allSupplements.length - takenCount;
        sections.push({ icon: '💊', title: t('مکمل‌ها', 'Supplements'), text: t(`${takenCount} از ${allSupplements.length} مکمل مصرف شده. ${pending} مکمل باقی مانده.`, `${takenCount} of ${allSupplements.length} supplements taken. ${pending} remaining.`), mood: pct >= 50 ? 'good' : 'needs-work' });
      }
    }

    // Schedule
    const hour = now.getHours();
    const activeBlocks = scheduleBlocks.filter(b => {
      const current = `${String(hour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      return b.startTime <= current && current < b.endTime;
    });
    if (activeBlocks.length > 0) {
      sections.push({ icon: '📅', title: t('برنامه الان', 'Current schedule'), text: t(`الان وقت "${activeBlocks[0].activity}" است.`, `It is time for "${activeBlocks[0].activity}".`), mood: 'neutral' });
    }

    // Roadmap
    const inProgress = phases.find(p => p.status === 'in-progress');
    if (inProgress) {
      const completedTasks = inProgress.tasks.filter(t => t.done).length;
      const totalTasks = inProgress.tasks.length;
      const progress = phaseProgress(inProgress);
      sections.push({ icon: '🗺️', title: t('نقشه راه', 'Roadmap'), text: t(`فاز "${inProgress.title}": ${completedTasks}/${totalTasks} تسک تکمیل شده (${progress}%).`, `Phase "${inProgress.title}": ${completedTasks}/${totalTasks} tasks completed (${progress}%).`), mood: progress >= 70 ? 'great' : progress >= 30 ? 'good' : 'needs-work' });
    }

    // Workout
    const weekWorkouts = new Set(
      workoutLogs.filter(l => l.completed).map(l => new Date(l.date).toDateString())
    ).size;
    if (weekWorkouts > 0) {
      const storedGoal = Number(workoutGoal?.value);
      const goal = Number.isInteger(storedGoal) && storedGoal >= 1 && storedGoal <= 7 ? storedGoal : 3;
      sections.push({ icon: '🏋️', title: t('ورزش', 'Workout'), text: t(`این هفته ${weekWorkouts} روز ورزش کردید. هدف هفتگی: ${goal} روز.`, `You exercised on ${weekWorkouts} ${weekWorkouts === 1 ? "day" : "days"} this week. Weekly goal: ${goal} ${goal === 1 ? "day" : "days"}.`), mood: weekWorkouts >= goal ? 'great' : 'good' });
    }

    // Overall score
    const moodScores = { 'great': 3, 'good': 2, 'neutral': 1, 'needs-work': 0 };
    const totalScore = sections.reduce((sum, s) => sum + (moodScores[s.mood] || 0), 0);
    const maxScore = sections.length * 3;
    const overallPct = sections.length > 0 ? Math.round((totalScore / maxScore) * 100) : 50;

    let overallMood = t('روز خوبی دارید!', 'You are having a good day!');
    if (overallPct >= 80) overallMood = t('روز عالی‌ای دارید! 🌟', 'You are having a great day! 🌟');
    else if (overallPct >= 50) overallMood = t('روز خوبی دارید! 👍', 'You are having a good day! 👍');
    else if (overallPct >= 25) overallMood = t('روز متوسطی دارید. 💪', 'Keep going. You can do this! 💪');
    else overallMood = t('فردا روز بهتری خواهد بود! 🌱', 'Tomorrow is a fresh start! 🌱');

    res.json({
      date: dateKey(today),
      sections,
      overall: { score: overallPct, mood: overallMood },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/weekly', async (req, res, next) => {
  try {
    const t = (fa, en) => req.query.lang === 'en' ? en : fa;
    const userId = req.userId;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 1) % 7));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const [habits, habitLogs, supplementLogs, workoutLogs, financeEntries, timeSlots] = await Promise.all([
      prisma.habit.findMany({ where: { userId, active: true } }),
      prisma.habitLog.findMany({ where: { habit: { userId }, date: { gte: weekStart, lt: weekEnd } } }),
      prisma.supplementLog.findMany({ where: { supplement: { timeSlot: { userId } }, date: { gte: weekStart, lt: weekEnd }, taken: true } }),
      prisma.workoutLog.findMany({ where: { session: { userId }, date: { gte: weekStart, lt: weekEnd }, completed: true } }),
      prisma.financeEntry.findMany({ where: { userId, month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` } }),
      prisma.timeSlot.findMany({ where: { userId }, include: { supplements: true } }),
    ]);

    const activeIds = new Set(habits.map(h => h.id));
    const doneHabits = habitLogs.filter(l => l.done && activeIds.has(l.habitId));
    const habitCompletion = habits.length > 0 ? Math.round((doneHabits.length / (habits.length * 7)) * 100) : 0;

    const workoutDays = new Set(workoutLogs.map(l => new Date(l.date).toDateString())).size;

    const totalSuppExpected = timeSlots.reduce((sum, slot) => sum + slot.supplements.length, 0) * 7;
    const supplementIds = new Set(timeSlots.flatMap(slot => slot.supplements.map(s => s.id)));
    const takenDays = new Set(supplementLogs.filter(l => supplementIds.has(l.supplementId)).map(l => `${l.supplementId}:${dateKey(new Date(l.date))}`));
    const suppRate = totalSuppExpected > 0 ? Math.round((takenDays.size / totalSuppExpected) * 100) : 0;

    const totalSpent = financeEntries.reduce((sum, e) => sum + (Array.isArray(e.expenses) ? e.expenses.reduce((total, expense) => total + (Number(expense.amount) || 0), 0) : 0), 0);

    const days = t(['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'], ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    const dailyHabits = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dayLogs = habitLogs.filter(l => new Date(l.date).toDateString() === d.toDateString());
      dailyHabits.push({
        day: days[i],
        completed: dayLogs.filter(l => l.done && activeIds.has(l.habitId)).length,
        total: habits.length,
        percent: habits.length > 0 ? Math.round((dayLogs.filter(l => l.done && activeIds.has(l.habitId)).length / habits.length) * 100) : 0,
      });
    }

    const lastDay = new Date(weekEnd);
    lastDay.setDate(lastDay.getDate() - 1);
    res.json({
      weekStart: dateKey(weekStart),
      weekEnd: dateKey(lastDay),
      stats: {
        habitCompletion,
        workoutDays,
        supplementRate: suppRate,
        totalSpent,
      },
      dailyHabits,
      summary: t(`این هفته ${habitCompletion}% عادت‌ها انجام شد، ${workoutDays} روز ورزش شد، و ${suppRate}% مکمل‌ها مصرف شد.`, `This week, ${habitCompletion}% of habits were completed, you exercised on ${workoutDays} ${workoutDays === 1 ? "day" : "days"}, and ${suppRate}% of supplements were taken.`),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
