const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
require('@angular/compiler');
const { Injector, runInInjectionContext } = require('@angular/core');
const { of } = require('rxjs');

// Load the real component classes with TypeScript's normal decorator transform.
const loaded = new Map();
function loadTs(relative) {
  const file = path.resolve(__dirname, relative);
  if (loaded.has(file)) return loaded.get(file).exports;
  const compiled = new Module(file, module);
  loaded.set(file, compiled);
  compiled.filename = file;
  compiled.paths = Module._nodeModulePaths(path.dirname(file));
  const requireModule = compiled.require.bind(compiled);
  compiled.require = name => {
    const source = path.resolve(path.dirname(file), name + '.ts');
    return name.startsWith('.') && fs.existsSync(source) ? loadTs(source) : requireModule(name);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText, file);
  return compiled.exports;
}
const { LocaleService } = loadTs('../src/app/core/services/locale.service.ts');
const locale = { language: () => 'fa', t: value => value, number: value => Number(value).toLocaleString('fa-IR') };
const { ApiService } = loadTs('../src/app/core/services/api.service.ts');
function createComponent(Component, api = {}) {
  return runInInjectionContext(Injector.create({ providers: [{ provide: LocaleService, useValue: locale }, { provide: ApiService, useValue: api }] }), () => new Component());
}

test('heatmap reflects data that arrives after the initial render', () => {
  const { HeatmapComponent } = loadTs('../src/app/shared/components/heatmap/heatmap.component.ts');
  const heatmap = createComponent(HeatmapComponent);
  heatmap.ngOnInit();
  const date = heatmap.weeks().at(-1).at(-1).date;
  heatmap.data = { [date]: 75 };
  heatmap.ngOnChanges?.({ data: { currentValue: heatmap.data, firstChange: false } });
  assert.equal(heatmap.weeks().at(-1).at(-1).value, 75);
});

test('timeline includes the earliest scheduled activity instead of clipping it above 06:00', () => {
  const { ScheduleComponent } = loadTs('../src/app/features/schedule/schedule.component.ts');
  const schedule = createComponent(ScheduleComponent);
  schedule.blocks.set([{ id: 1, dayType: 'workday', startTime: '05:30', endTime: '06:00' }]);
  assert.ok(parseFloat(schedule.getEventTop('05:30')) >= 0);
});

test('a half-hour timeline activity has enough height for its title and time', () => {
  const { ScheduleComponent } = loadTs('../src/app/features/schedule/schedule.component.ts');
  const schedule = createComponent(ScheduleComponent);
  assert.ok(parseFloat(schedule.getEventHeight('07:00', '07:30')) >= 44);
});

test('workout week and dashboard week both begin on Saturday', () => {
  const { WorkoutComponent } = loadTs('../src/app/features/workout/workout.component.ts');
  const workout = createComponent(WorkoutComponent);
  assert.equal(new Date(workout.weekDays[0].date + 'T12:00:00').getDay(), 6);
});

test('one completed workout counts as an exercised day regardless of saved session templates', () => {
  const { WorkoutComponent } = loadTs('../src/app/features/workout/workout.component.ts');
  const workout = createComponent(WorkoutComponent);
  workout.sessions.set([{ id: 1 }, { id: 2 }, { id: 3 }]);
  workout.workoutLogs.set([{ id: 1, sessionId: 1, date: workout.weekDays[0].date, completed: true }]);
  assert.equal(workout.getDayCompletionPercent(workout.weekDays[0].date), 100);
});

test('a newly saved checklist item is visible even when a different category was selected', () => {
  const { ChecklistComponent } = loadTs('../src/app/features/checklist/checklist.component.ts');
  const item = { id: 1, text: 'آیتم تازه', category: null, done: false, order: 0 };
  const checklist = createComponent(ChecklistComponent, { createChecklistItem: () => of(item), getChecklist: () => of([item]) });
  checklist.filterCategory.set('زبان');
  checklist.newItemText = item.text;
  checklist.addItem();
  assert.equal(checklist.filteredItems()[0].text, item.text);
});

test('toggling a habit refreshes its count, history, and summary without duplicate entries', () => {
  const { DashboardComponent } = loadTs('../src/app/features/dashboard/dashboard.component.ts');
  const { NotificationService } = loadTs('../src/app/core/services/notification.service.ts');
  const date = new Date();
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const log = { id: 1, habitId: 1, date: today, done: true };
  const api = {
    logHabit: () => of(log), getHabitLogs: () => of([log]),
    getDailySummary: () => of({ updated: true }), getWeeklyReport: () => of({ updated: true }),
  };
  const dashboard = runInInjectionContext(Injector.create({ providers: [{ provide: LocaleService, useValue: locale }, { provide: ApiService, useValue: api }, { provide: NotificationService, useValue: {} }] }), () => new DashboardComponent());
  dashboard.habits.set([{ id: 1, active: true }]);
  dashboard.toggleHabit(1, true);
  dashboard.toggleHabit(1, true);
  assert.equal(dashboard.completedHabits(), 1);
  assert.equal(dashboard.habitLogs().length, 1);
  assert.equal(dashboard.summary()?.updated, true);
  assert.equal(dashboard.weeklyReport()?.updated, true);
});


test('checklist displays the saved item without requiring a second network request', () => {
  const { ChecklistComponent } = loadTs('../src/app/features/checklist/checklist.component.ts');
  const item = { id: 1, text: 'آیتم تازه', category: null, done: false, order: 0 };
  const checklist = createComponent(ChecklistComponent, { createChecklistItem: () => of(item), getChecklist: () => of([]) });
  checklist.newItemText = item.text;
  checklist.addItem();
  assert.deepEqual(checklist.items(), [item]);
});

test('finance chart treats missing allocation categories as zero rather than rendering NaN', () => {
  const { FinanceComponent } = loadTs('../src/app/features/finance/finance.component.ts');
  const finance = createComponent(FinanceComponent);
  finance.currentEntry.set({ id: 1, income: 100, allocations: { savings: 50 } });
  assert.equal(finance.getAllocationPercent('debt'), 0);
  assert.equal(finance.getAllocationPercent('savings'), 100);
});
