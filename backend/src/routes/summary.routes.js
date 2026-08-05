const express = require('express');
const prisma = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/daily', async (req, res, next) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const dayType = isWeekend ? 'weekend' : 'workday';

    const [habits, habitLogs, timeSlots, supplementLogs, scheduleBlocks, phases, workoutSessions, workoutLogs] = await Promise.all([
      prisma.habit.findMany({ where: { userId, active: true } }),
      prisma.habitLog.findMany({ where: { habit: { userId }, date: { gte: today, lt: tomorrow } } }),
      prisma.timeSlot.findMany({ where: { userId }, include: { supplements: true } }),
      prisma.supplementLog.findMany({ where: { supplement: { timeSlot: { userId } }, date: { gte: today, lt: tomorrow } } }),
      prisma.scheduleBlock.findMany({ where: { userId, dayType } }),
      prisma.phase.findMany({ where: { userId }, include: { tasks: true } }),
      prisma.workoutSession.findMany({ where: { userId } }),
      prisma.workoutLog.findMany({ where: { session: { userId }, date: { gte: weekAgo, lt: tomorrow } } }),
    ]);

    const sections = [];

    // Habits
    const doneHabits = habitLogs.filter(l => l.done);
    const missedHabits = habits.length - doneHabits.length;
    if (habits.length > 0) {
      const pct = Math.round((doneHabits.length / habits.length) * 100);
      if (pct === 100) {
        sections.push({ icon: '🎯', title: 'عادت‌ها', text: `عالی! تمام ${habits.length} عادت امروز را انجام دادید.`, mood: 'great' });
      } else if (pct >= 50) {
        sections.push({ icon: '✅', title: 'عادت‌ها', text: `${doneHabits.length} از ${habits.length} عادت انجام شده (${pct}%). ${missedHabits} عادت باقی مانده.`, mood: 'good' });
      } else {
        sections.push({ icon: '⚠️', title: 'عادت‌ها', text: `فقط ${doneHabits.length} از ${habits.length} عادت انجام شده. فردا بهتر خواهد بود!`, mood: 'needs-work' });
      }
    }

    // Supplements
    const allSupplements = timeSlots.flatMap(s => s.supplements);
    const takenSupps = supplementLogs.filter(l => l.taken);
    if (allSupplements.length > 0) {
      const pct = Math.round((takenSupps.length / allSupplements.length) * 100);
      if (pct === 100) {
        sections.push({ icon: '💊', title: 'مکمل‌ها', text: `تمام ${allSupplements.length} مکمل مصرف شد.`, mood: 'great' });
      } else {
        const pending = allSupplements.length - takenSupps.length;
        sections.push({ icon: '💊', title: 'مکمل‌ها', text: `${takenSupps.length} از ${allSupplements.length} مکمل مصرف شده. ${pending} مکمل باقی مانده.`, mood: pct >= 50 ? 'good' : 'needs-work' });
      }
    }

    // Schedule
    const hour = now.getHours();
    const activeBlocks = scheduleBlocks.filter(b => {
      const [sh] = b.startTime.split(':').map(Number);
      const [eh] = b.endTime.split(':').map(Number);
      return sh <= hour && hour < eh;
    });
    if (activeBlocks.length > 0) {
      sections.push({ icon: '📅', title: 'برنامه الان', text: `الان وقت "${activeBlocks[0].activity}" است.`, mood: 'neutral' });
    }

    // Roadmap
    const inProgress = phases.find(p => p.status === 'in-progress');
    if (inProgress) {
      const completedTasks = inProgress.tasks.filter(t => t.status === 'done').length;
      const totalTasks = inProgress.tasks.length;
      sections.push({ icon: '🗺️', title: 'نقشه راه', text: `فاز "${inProgress.title}": ${completedTasks}/${totalTasks} تسک تکمیل شده (${inProgress.progress}%).`, mood: inProgress.progress >= 70 ? 'great' : inProgress.progress >= 30 ? 'good' : 'needs-work' });
    }

    // Workout
    const weekWorkouts = new Set(
      workoutLogs.filter(l => l.completed).map(l => new Date(l.date).toDateString())
    ).size;
    if (weekWorkouts > 0) {
      sections.push({ icon: '🏋️', title: 'ورزش', text: `این هفته ${weekWorkouts} روز ورزش کردید.`, mood: weekWorkouts >= 3 ? 'great' : weekWorkouts >= 1 ? 'good' : 'needs-work' });
    }

    // Overall score
    const moodScores = { 'great': 3, 'good': 2, 'neutral': 1, 'needs-work': 0 };
    const totalScore = sections.reduce((sum, s) => sum + (moodScores[s.mood as keyof typeof moodScores] || 0), 0);
    const maxScore = sections.length * 3;
    const overallPct = sections.length > 0 ? Math.round((totalScore / maxScore) * 100) : 50;

    let overallMood = 'روز خوبی دارید!';
    if (overallPct >= 80) overallMood = 'روز عالی‌ای دارید! 🌟';
    else if (overallPct >= 50) overallMood = 'روز خوبی دارید! 👍';
    else if (overallPct >= 25) overallMood = 'روز متوسطی دارید. 💪';
    else overallMood = 'فردا روز بهتری خواهد بود! 🌱';

    res.json({
      date: today.toISOString().split('T')[0],
      sections,
      overall: { score: overallPct, mood: overallMood },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/weekly', async (req, res, next) => {
  try {
    const userId = req.userId;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const [habits, habitLogs, supplementLogs, workoutLogs, financeEntries] = await Promise.all([
      prisma.habit.findMany({ where: { userId, active: true } }),
      prisma.habitLog.findMany({ where: { habit: { userId }, date: { gte: weekStart, lt: weekEnd } } }),
      prisma.supplementLog.findMany({ where: { supplement: { timeSlot: { userId } }, date: { gte: weekStart, lt: weekEnd }, taken: true } }),
      prisma.workoutLog.findMany({ where: { session: { userId }, date: { gte: weekStart, lt: weekEnd }, completed: true } }),
      prisma.financeEntry.findMany({ where: { userId, month: { gte: weekStart.toISOString().slice(0, 7) } } }),
    ]);

    const uniqueHabitDays = new Set(habitLogs.filter(l => l.done).map(l => new Date(l.date).toDateString()));
    const habitCompletion = habits.length > 0 ? Math.round((uniqueHabitDays.size / 7) * 100) : 0;

    const workoutDays = new Set(workoutLogs.map(l => new Date(l.date).toDateString())).size;

    const totalSuppExpected = habits.length * 7;
    const suppRate = totalSuppExpected > 0 ? Math.round((supplementLogs.length / totalSuppExpected) * 100) : 0;

    const totalSpent = financeEntries.reduce((sum, e) => sum + (e.expenses || 0), 0);

    const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
    const dailyHabits = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLogs = habitLogs.filter(l => new Date(l.date).toDateString() === d.toDateString());
      dailyHabits.push({
        day: days[i],
        completed: dayLogs.filter(l => l.done).length,
        total: habits.length,
        percent: habits.length > 0 ? Math.round((dayLogs.filter(l => l.done).length / habits.length) * 100) : 0,
      });
    }

    res.json({
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      stats: {
        habitCompletion,
        workoutDays,
        supplementRate: suppRate,
        totalSpent,
      },
      dailyHabits,
      summary: `این هفته ${habitCompletion}% عادت‌ها انجام شد، ${workoutDays} روز ورزش شد، و ${suppRate}% مکمل‌ها مصرف شد.`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
