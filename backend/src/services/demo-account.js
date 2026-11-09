const prisma = require('../config/db');

const DEMO_ID = 'memory-brain-public-demo-v1';
const isDemoUser = user => user.googleId === DEMO_ID;

async function getDemoAccount() {
  const existing = await prisma.user.findUnique({ where: { googleId: DEMO_ID } });
  if (existing) return existing;
  try {
    return await prisma.$transaction(async tx => {
      const user = await tx.user.create({ data: {
        googleId: DEMO_ID, name: 'Demo', email: 'demo@memory-brain.invalid',
      } });
      const userId = user.id;
      await tx.checklistItem.createMany({ data: [
        { userId, text: 'Explore your dashboard', category: 'Getting started', order: 1 },
        { userId, text: 'Add a task of your own', category: 'Getting started', order: 2 },
      ] });
      await tx.habit.createMany({ data: [
        { userId, name: 'Read for 20 minutes', emoji: '📚', color: '#8b5cf6', order: 1 },
        { userId, name: 'Go for a walk', emoji: '🚶', color: '#22c55e', order: 2 },
      ] });
      await tx.phase.create({ data: {
        userId, title: 'Learn something new', duration: '1 month', goal: 'Build a small project',
        status: 'in-progress', order: 1,
        tasks: { create: [{ month: 1, topic: 'Choose a topic', done: true, order: 1 }, { month: 1, topic: 'Create your first project', order: 2 }] },
      } });
      await tx.scheduleBlock.createMany({ data: [
        { userId, dayType: 'workday', startTime: '08:00', endTime: '09:00', activity: 'Morning focus', category: 'work', order: 1 },
        { userId, dayType: 'workday', startTime: '17:00', endTime: '17:30', activity: 'Walk outside', category: 'exercise', order: 2 },
      ] });
      await tx.workoutSession.create({ data: {
        userId, day: 'شنبه', startTime: '17:00', endTime: '18:00', type: 'Full body', duration: '60',
        exercises: { create: [{ name: 'Bodyweight squat', sets: 3, reps: '12', order: 1 }] },
      } });
      await tx.timeSlot.create({ data: {
        userId, label: 'Morning', time: '08:00', emoji: '☀️', order: 1,
        supplements: { create: [{ name: 'Sample supplement', dose: 'Example only', notes: 'Sample data, not a health recommendation.', order: 1 }] },
      } });
      const today = new Date();
      await tx.financeEntry.createMany({ data: [2, 1, 0].map((offset, index) => {
        const date = new Date(today.getFullYear(), today.getMonth() - offset, 15);
        return { userId, month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, income: 20000000 + index * 2000000,
          expenses: { housing: 6000000, food: 3000000 }, allocations: { debt: 1000000, savings: 4000000, self: 2000000 }, notes: 'Public sample data' };
      }) });
      await tx.resource.create({ data: { userId, topic: 'Getting started', name: 'Memory Brain on GitHub', url: 'https://github.com/moeinparvizi/memory-brain', type: 'website', order: 1 } });
      await tx.setting.create({ data: { userId, key: 'weeklyWorkoutGoal', value: 3 } });
      return user;
    });
  } catch (error) {
    // Concurrent first logins may race; the losing transaction is rolled back.
    if (error.code === 'P2002') {
      const user = await prisma.user.findUnique({ where: { googleId: DEMO_ID } });
      if (user) return user;
    }
    throw error;
  }
}

module.exports = { getDemoAccount, isDemoUser };
