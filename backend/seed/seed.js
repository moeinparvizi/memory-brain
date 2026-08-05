const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.supplementLog.deleteMany();
  await prisma.habitLog.deleteMany();
  await prisma.workoutLog.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.workoutSession.deleteMany();
  await prisma.supplement.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.task.deleteMany();
  await prisma.phase.deleteMany();
  await prisma.scheduleBlock.deleteMany();
  await prisma.habit.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.financeEntry.deleteMany();
  await prisma.debt.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating default user...');
  const user = await prisma.user.create({
    data: {
      googleId: 'legacy-admin',
      email: 'admin@moein.local',
      name: 'معین',
    },
  });
  const userId = user.id;

  console.log('Seeding TimeSlots...');
  const timeSlotsData = [
    { label: "بعد از صبحانه", time: "08:00", emoji: "☀️", order: 1 },
    { label: "۳۰-۶۰ دقیقه قبل از تمرین", time: "19:30", emoji: "🏋️", order: 2 },
    { label: "بعد از ناهار", time: "13:00", emoji: "🍽️", order: 3 },
    { label: "بعد از شام", time: "20:00", emoji: "🌙", order: 4 },
    { label: "۳۰-۶۰ دقیقه قبل از خواب", time: "21:30", emoji: "😴", order: 5 },
  ];
  const timeSlots = [];
  for (const ts of timeSlotsData) {
    const created = await prisma.timeSlot.create({ data: { ...ts, userId } });
    timeSlots.push(created);
  }

  console.log('Seeding Supplements...');
  const supplementsData = [
    { name: "مولتی‌ویتامین", dose: "۱ عدد", notes: "همراه غذا", timeSlotIndex: 0, category: "daily", order: 1 },
    { name: "Reduxa", dose: "۱ عدد", notes: "", timeSlotIndex: 0, category: "daily", order: 2 },
    { name: "CLA", dose: "۱ عدد", notes: "", timeSlotIndex: 0, category: "daily", order: 3 },
    { name: "Chromium", dose: "۱ عدد", notes: "", timeSlotIndex: 0, category: "daily", order: 4 },
    { name: "L-Carnitine", dose: "۱ عدد", notes: "۳۰-۶۰ دقیقه قبل", timeSlotIndex: 1, category: "workout", order: 1 },
    { name: "Omega-3", dose: "۱ عدد", notes: "همراه غذای چرب", timeSlotIndex: 2, category: "daily", order: 1 },
    { name: "Reduxa", dose: "۱ عدد", notes: "ترجیحاً قبل از ساعت ۴ عصر", timeSlotIndex: 2, category: "daily", order: 2 },
    { name: "CLA", dose: "۱ عدد", notes: "", timeSlotIndex: 3, category: "daily", order: 1 },
    { name: "Zinc", dose: "۱ عدد", notes: "اگر مولتی‌ویتامین زینک کافی نداره", timeSlotIndex: 3, category: "optional", order: 2 },
    { name: "Magnesium", dose: "۱ عدد", notes: "فاصله از مولتی‌ویتامین و زینک", timeSlotIndex: 4, category: "daily", order: 1 },
    { name: "پروتئین وی", dose: "۱ اسکوپ (۳۰ گرم)", notes: "بعد از تمرین یا صبح", timeSlotIndex: 1, category: "workout", order: 2 },
    { name: "کراتین مونوهیدرات", dose: "۵ گرم", notes: "هر روز، حتی روزهای استراحت", timeSlotIndex: 0, category: "daily", order: 5 },
  ];
  for (const s of supplementsData) {
    await prisma.supplement.create({
      data: {
        timeSlotId: timeSlots[s.timeSlotIndex].id,
        name: s.name, dose: s.dose, notes: s.notes, category: s.category, order: s.order,
      },
    });
  }

  console.log('Seeding Workouts...');
  const workouts = [
    { day: "شنبه", startTime: "20:30", endTime: "21:00", type: "HIIT خانگی", duration: "۳۰ دقیقه",
      exercises: [
        { name: "Burpees", sets: 4, reps: "12", order: 1 },
        { name: "Jump Squats", sets: 4, reps: "15", order: 2 },
        { name: "Mountain Climbers", sets: 4, reps: "20", order: 3 },
        { name: "Plank", sets: 3, reps: "45 ثانیه", order: 4 },
      ]},
    { day: "دوشنبه", startTime: "20:30", endTime: "21:00", type: "قدرتی", duration: "۳۰ دقیقه",
      exercises: [
        { name: "Push-ups", sets: 4, reps: "15", order: 1 },
        { name: "Dumbbell Rows", sets: 4, reps: "12", order: 2 },
        { name: "Shoulder Press", sets: 3, reps: "12", order: 3 },
        { name: "Bicep Curls", sets: 3, reps: "12", order: 4 },
      ]},
    { day: "پنجشنبه", startTime: "16:00", endTime: "17:30", type: "باشگاه / دویدن", duration: "۶۰-۹۰ دقیقه",
      exercises: [
        { name: "گرم کردن / دویدن", sets: 1, reps: "10 دقیقه", order: 1 },
        { name: "اسکوات", sets: 4, reps: "10", order: 2 },
        { name: "ددلیفت", sets: 4, reps: "8", order: 3 },
        { name: "پرس سینه", sets: 4, reps: "10", order: 4 },
        { name: "زیربغل سیم‌کش", sets: 4, reps: "12", order: 5 },
        { name: "سرد کردن / کشش", sets: 1, reps: "10 دقیقه", order: 6 },
      ]},
  ];
  for (const w of workouts) {
    await prisma.workoutSession.create({
      data: {
        userId, day: w.day, startTime: w.startTime, endTime: w.endTime, type: w.type, duration: w.duration,
        exercises: { create: w.exercises },
      },
    });
  }

  console.log('Seeding Phases...');
  const phases = [
    { title: "ساختن فونداسیون", duration: "ماه ۱ تا ۶", goal: "Angular Mid-Level + ابزارهای مدرن", status: "in-progress", progress: 0, order: 1,
      tasks: [
        { month: 1, topic: "TypeScript پیشرفته (Generics, Decorators, Utility Types) + RxJS عمیق", output: "۳ تمرین عملی", order: 1 },
        { month: 2, topic: "Angular Signals, Standalone Components, Control Flow جدید", output: "بازسازی یه پروژه قدیمی", order: 2 },
        { month: 3, topic: "State Management (NgRx/NGXS) + HTTP Interceptors + Lazy Loading", output: "یه اپلیکیشن CRUD کامل", order: 3 },
        { month: 4, topic: "Testing (Jasmine/Karma + Cypress) + CI/CD مقدماتی", output: "پوشش تست ۷۰٪", order: 4 },
        { month: 5, topic: "Next.js/Nuxt.js مقدماتی + SSR/SSG", output: "یه پروژه SEO-friendly", order: 5 },
        { month: 6, topic: "پروژه Portfolio (داشبورد مدیریت)", output: "دیپلوی Vercel + GitHub", order: 6 },
      ]},
    { title: "ورود به بازار ریموت", duration: "ماه ۷ تا ۱۲", goal: "اولین درآمد دلاری", status: "not-started", progress: 0, order: 2,
      tasks: [
        { month: 7, topic: "ثبت‌نام کایا + Upwork + ساخت پروفایل", output: "پروفایل کامل", order: 1 },
        { month: 8, topic: "ارسال ۵-۱۰ پروپوزال/هفته + ۲ پروژه نمونه", output: "۱۰+ پروپوزال", order: 2 },
        { month: 9, topic: "اولین پروژه فریلنسری (۱۵-۲۰$/ساعت)", output: "اولین درآمد", order: 3 },
        { month: 10, topic: "افزایش نرخ + ۲-۳ کلاینت ثابت", output: "کلاینت ثابت", order: 4 },
        { month: 11, topic: "Full-Stack شدن (NestJS/Node.js)", output: "پروژه فول‌استک", order: 5 },
        { month: 12, topic: "هدف: ۱,۰۰۰-۱,۵۰۰$/ماه", output: "درآمد پایدار", order: 6 },
      ]},
    { title: "اسکیل و تثبیت", duration: "ماه ۱۳ تا ۲۴", goal: "۲,۵۰۰-۳,۰۰۰$/ماه", status: "not-started", progress: 0, order: 3,
      tasks: [
        { month: 13, topic: "Senior Angular/Full-Stack + معماری نرم‌افزار", output: "", order: 1 },
        { month: 15, topic: "قرارداد بلندمدت ۳۰-۵۰$/ساعت", output: "", order: 2 },
        { month: 18, topic: "Personal Brand + مقاله + LinkedIn", output: "", order: 3 },
        { month: 20, topic: "شروع پروسه مهاجرت آلمان", output: "", order: 4 },
        { month: 24, topic: "هدف: ۲,۵۰۰-۳,۰۰۰$/ماه ثابت", output: "", order: 5 },
      ]},
    { title: "انتخاب نهایی", duration: "ماه ۲۵ تا ۳۰", goal: "تثبیت مسیر بلندمدت", status: "not-started", progress: 0, order: 4,
      tasks: [
        { month: 25, topic: "مسیر A: ریموت ۳,۰۰۰-۵,۰۰۰$/ماه", output: "", order: 1 },
        { month: 25, topic: "مسیر B: Blue Card آلمان (حقوق ≥۴۵,۹۳۴€)", output: "", order: 2 },
        { month: 30, topic: "تصمیم نهایی + اجرا", output: "", order: 3 },
      ]},
  ];
  for (const p of phases) {
    await prisma.phase.create({
      data: {
        userId, title: p.title, duration: p.duration, goal: p.goal, status: p.status, progress: p.progress, order: p.order,
        tasks: { create: p.tasks },
      },
    });
  }

  console.log('Seeding Schedule...');
  const workdaySchedule = [
    { startTime: "05:30", endTime: "06:00", activity: "بیدار شدن + صبحانه", category: "personal", order: 1 },
    { startTime: "06:00", endTime: "07:00", activity: "🔥 یادگیری برنامه‌نویسی", category: "learning", order: 2 },
    { startTime: "07:00", endTime: "07:30", activity: "آماده شدن + حرکت", category: "personal", order: 3 },
    { startTime: "07:30", endTime: "08:00", activity: "🚌 اتوبوس: پادکست انگلیسی / فلش‌کارت", category: "commute", order: 4 },
    { startTime: "08:00", endTime: "17:00", activity: "💼 کار", category: "work", order: 5 },
    { startTime: "17:00", endTime: "17:30", activity: "🚌 اتوبوس: استراحت / پادکست", category: "commute", order: 6 },
    { startTime: "17:30", endTime: "18:30", activity: "استراحت + شام", category: "personal", order: 7 },
    { startTime: "18:30", endTime: "20:30", activity: "🔥 یادگیری / پروژه عملی", category: "learning", order: 8 },
    { startTime: "20:30", endTime: "21:00", activity: "🏋️ ورزش (۳ روز) / استراحت (۲ روز)", category: "exercise", order: 9 },
    { startTime: "21:00", endTime: "22:00", activity: "🌐 آزاد / زبان انگلیسی سبک", category: "learning", order: 10 },
    { startTime: "22:00", endTime: "22:30", activity: "آماده خواب", category: "personal", order: 11 },
  ];
  for (const b of workdaySchedule) {
    await prisma.scheduleBlock.create({ data: { userId, dayType: "workday", ...b } });
  }

  const weekendSchedule = [
    { startTime: "07:00", endTime: "08:00", activity: "بیدار شدن + صبحانه", category: "personal", order: 1 },
    { startTime: "08:00", endTime: "12:00", activity: "🔥 پروژه عملی / یادگیری عمیق (۴ ساعت)", category: "learning", order: 2 },
    { startTime: "12:00", endTime: "13:00", activity: "ناهار + استراحت", category: "personal", order: 3 },
    { startTime: "13:00", endTime: "16:00", activity: "🔥 ادامه پروژه / فریلنسری (۳ ساعت)", category: "learning", order: 4 },
    { startTime: "16:00", endTime: "17:30", activity: "🏋️ ورزش (پنجشنبه) / آزاد (جمعه)", category: "exercise", order: 5 },
    { startTime: "17:30", endTime: "19:00", activity: "🌐 زبان انگلیسی / شبکه‌سازی", category: "learning", order: 6 },
    { startTime: "19:00", endTime: "23:00", activity: "استراحت کامل (بدون گناه!)", category: "personal", order: 7 },
  ];
  for (const b of weekendSchedule) {
    await prisma.scheduleBlock.create({ data: { userId, dayType: "weekend", ...b } });
  }

  console.log('Seeding Habits...');
  const habitsData = [
    { name: "یادگیری صبح (۶-۷)", emoji: "🌅", color: "#f59e0b", order: 1 },
    { name: "یادگیری شب (۱۸:۳۰-۲۰:۳۰)", emoji: "🔥", color: "#ef4444", order: 2 },
    { name: "زبان انگلیسی", emoji: "🌐", color: "#3b82f6", order: 3 },
    { name: "ورزش", emoji: "🏋️", color: "#22c55e", order: 4 },
    { name: "مکمل‌ها", emoji: "💊", color: "#a855f7", order: 5 },
    { name: "بدون اینستاگرام", emoji: "📵", color: "#6b7280", order: 6 },
  ];
  for (const h of habitsData) {
    await prisma.habit.create({ data: { ...h, userId } });
  }

  console.log('Seeding Resources...');
  const resourcesData = [
    { topic: "Angular 2026", name: "roadmap.sh/angular", url: "https://roadmap.sh/angular", type: "website", order: 1 },
    { topic: "Angular", name: "angular.dev/roadmap", url: "https://angular.dev", type: "website", order: 2 },
    { topic: "TypeScript", name: "Programming TypeScript (Boris Cherny)", url: "", type: "book", order: 3 },
    { topic: "RxJS", name: "RxJS in Action", url: "", type: "book", order: 4 },
    { topic: "RxJS", name: "Fireship YouTube", url: "https://youtube.com/@Fireship", type: "youtube", order: 5 },
    { topic: "انگلیسی", name: "Duolingo", url: "https://duolingo.com", type: "website", order: 6 },
    { topic: "انگلیسی", name: "English with Lucy", url: "", type: "youtube", order: 7 },
    { topic: "ضد اهمال‌کاری", name: "Atomic Habits - James Clear", url: "", type: "book", order: 8 },
    { topic: "ضد اهمال‌کاری", name: "The Now Habit - Neil Fiore", url: "", type: "book", order: 9 },
    { topic: "فریلنسری", name: "The Freelancer's Bible", url: "", type: "book", order: 10 },
    { topic: "مهاجرت آلمان", name: "make-it-in-germany.com", url: "https://make-it-in-germany.com", type: "website", order: 11 },
  ];
  for (const r of resourcesData) {
    await prisma.resource.create({ data: { ...r, userId } });
  }

  console.log('Seeding Checklist...');
  const checklistData = [
    { text: "نصب Anki + ساخت فلش‌کارت انگلیسی (برای اتوبوس)", category: "زبان", order: 1 },
    { text: "ساخت حساب GitHub + LinkedIn انگلیسی", category: "شغلی", order: 2 },
    { text: "شروع TypeScript پیشرفته (روزی ۱ ساعت)", category: "فنی", order: 3 },
    { text: "چاپ Habit Tracker و چسباندن روی یخچال", category: "عادت", order: 4 },
    { text: "پیدا کردن ۱ Accountability Partner", category: "عادت", order: 5 },
    { text: "حذف اینستاگرام/توییتر از گوشی", category: "عادت", order: 6 },
    { text: "ثبت‌نام کلاس مکالمه انگلیسی آنلاین (هفته‌ای ۲ جلسه)", category: "زبان", order: 7 },
    { text: "بررسی سایت kaya.ir و پلن‌هاش", category: "فریلنسری", order: 8 },
    { text: "ثبت‌نام پونیشا + ساخت پروفایل قوی", category: "فریلنسری", order: 9 },
    { text: "ساخت حساب GitLab + انتقال پروژه‌ها", category: "فنی", order: 10 },
    { text: "ساخت حساب آبان‌تتر یا سرمایکس", category: "مالی", order: 11 },
    { text: "نصب Duolingo + شروع روزانه", category: "زبان", order: 12 },
  ];
  for (const c of checklistData) {
    await prisma.checklistItem.create({ data: { ...c, userId } });
  }

  console.log('Seeding Settings...');
  const warnings = [
    "۵۰۰ میلیون در ۶ ماه نمی‌رسه. حداقل ۱۸ ماه کار مداوم لازمه.",
    "استارتاپ الان = خودکشی مالی. اول درآمد پایدار، بعد استارتاپ.",
    "انگلیسی بدون مذاکره‌ست. بدون B2 ریموت و مهاجرت قفلن.",
    "مهاجرت بدون ۳ سال سابقه ممکن نیست (Blue Card آلمان).",
    "اهمال‌کاری با سیستم حل می‌شه، نه انگیزه. روزای بی‌انگیزه هم بشین.",
  ];
  const supplementNotes = [
    "مولتی‌ویتامین همراه غذا → جذب و تحمل گوارشی بهتر",
    "امگا ۳ همراه غذای چرب → جذب بهتر",
    "منیزیم را چند ساعت از مولتی‌ویتامین و زینک فاصله بده",
    "اگر مولتی‌ویتامین ۱۵-۲۰mg زینک دارد → زینک جدا لازم نیست",
    "اگر مولتی‌ویتامین ۲۰۰-۴۰۰mg منیزیم دارد → منیزیم جدا لازم نیست",
  ];

  await prisma.setting.create({ data: { userId, key: 'warnings', value: warnings } });
  await prisma.setting.create({ data: { userId, key: 'supplementNotes', value: supplementNotes } });
  await prisma.setting.create({ data: { userId, key: 'theme', value: 'dark' } });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
