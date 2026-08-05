import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Phase, Task } from '../../shared/models/roadmap.model';
import { ScheduleBlock } from '../../shared/models/schedule.model';
import { WorkoutSession, WorkoutLog } from '../../shared/models/workout.model';
import { TimeSlot, SupplementLog } from '../../shared/models/supplement.model';
import { Habit, HabitLog } from '../../shared/models/habit.model';
import { FinanceEntry, Debt } from '../../shared/models/finance.model';
import { Resource } from '../../shared/models/resource.model';
import { ChecklistItem } from '../../shared/models/checklist.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  // Auth
  login(username: string, password: string): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.baseUrl}/auth/login`, { username, password });
  }

  refreshToken(): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.baseUrl}/auth/refresh`, {});
  }

  // Roadmap
  getPhases(): Observable<Phase[]> {
    return this.http.get<Phase[]>(`${this.baseUrl}/roadmap/phases`);
  }

  getPhase(id: number): Observable<Phase> {
    return this.http.get<Phase>(`${this.baseUrl}/roadmap/phases/${id}`);
  }

  createPhase(phase: Partial<Phase>): Observable<Phase> {
    return this.http.post<Phase>(`${this.baseUrl}/roadmap/phases`, phase);
  }

  updatePhase(id: number, phase: Partial<Phase>): Observable<Phase> {
    return this.http.put<Phase>(`${this.baseUrl}/roadmap/phases/${id}`, phase);
  }

  deletePhase(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/roadmap/phases/${id}`);
  }

  getTasks(phaseId: number): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/roadmap/phases/${phaseId}/tasks`);
  }

  createTask(phaseId: number, task: Partial<Task>): Observable<Task> {
    return this.http.post<Task>(`${this.baseUrl}/roadmap/phases/${phaseId}/tasks`, task);
  }

  updateTask(phaseId: number, taskId: number, task: Partial<Task>): Observable<Task> {
    return this.http.put<Task>(`${this.baseUrl}/roadmap/phases/${phaseId}/tasks/${taskId}`, task);
  }

  deleteTask(phaseId: number, taskId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/roadmap/phases/${phaseId}/tasks/${taskId}`);
  }

  toggleTaskDone(phaseId: number, taskId: number, done: boolean): Observable<Task> {
    return this.http.patch<Task>(`${this.baseUrl}/roadmap/phases/${phaseId}/tasks/${taskId}/toggle`, { done });
  }

  reorderPhases(orderedIds: number[]): Observable<any> {
    return this.http.patch(`${this.baseUrl}/roadmap/phases/reorder`, { orderedIds });
  }

  reorderTasks(phaseId: number, orderedIds: number[]): Observable<any> {
    return this.http.patch(`${this.baseUrl}/roadmap/phases/${phaseId}/tasks/reorder`, { orderedIds });
  }

  // Schedule
  getSchedule(): Observable<ScheduleBlock[]> {
    return this.http.get<ScheduleBlock[]>(`${this.baseUrl}/schedule`);
  }

  createScheduleBlock(block: Partial<ScheduleBlock>): Observable<ScheduleBlock> {
    return this.http.post<ScheduleBlock>(`${this.baseUrl}/schedule`, block);
  }

  updateScheduleBlock(id: number, block: Partial<ScheduleBlock>): Observable<ScheduleBlock> {
    return this.http.put<ScheduleBlock>(`${this.baseUrl}/schedule/${id}`, block);
  }

  deleteScheduleBlock(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/schedule/${id}`);
  }

  // Workout
  getWorkoutSessions(): Observable<WorkoutSession[]> {
    return this.http.get<WorkoutSession[]>(`${this.baseUrl}/workout/sessions`);
  }

  createWorkoutSession(session: Partial<WorkoutSession>): Observable<WorkoutSession> {
    return this.http.post<WorkoutSession>(`${this.baseUrl}/workout/sessions`, session);
  }

  updateWorkoutSession(id: number, session: Partial<WorkoutSession>): Observable<WorkoutSession> {
    return this.http.put<WorkoutSession>(`${this.baseUrl}/workout/sessions/${id}`, session);
  }

  deleteWorkoutSession(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/workout/sessions/${id}`);
  }

  getWorkoutLogs(): Observable<WorkoutLog[]> {
    return this.http.get<WorkoutLog[]>(`${this.baseUrl}/workout/log`);
  }

  logWorkout(sessionId: number, log: Partial<WorkoutLog>): Observable<WorkoutLog> {
    return this.http.post<WorkoutLog>(`${this.baseUrl}/workout/log`, { sessionId, ...log });
  }

  deleteWorkoutLog(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/workout/log/${id}`);
  }

  // Supplements
  getTimeSlots(): Observable<TimeSlot[]> {
    return this.http.get<TimeSlot[]>(`${this.baseUrl}/supplements/timeslots`);
  }

  createTimeSlot(slot: Partial<TimeSlot>): Observable<TimeSlot> {
    return this.http.post<TimeSlot>(`${this.baseUrl}/supplements/timeslots`, slot);
  }

  updateTimeSlot(id: number, slot: Partial<TimeSlot>): Observable<TimeSlot> {
    return this.http.put<TimeSlot>(`${this.baseUrl}/supplements/timeslots/${id}`, slot);
  }

  deleteTimeSlot(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/supplements/timeslots/${id}`);
  }

  deleteSupplement(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/supplements/${id}`);
  }

  getSupplementLogs(date?: string): Observable<SupplementLog[]> {
    const params = date ? `?date=${date}` : '';
    return this.http.get<SupplementLog[]>(`${this.baseUrl}/supplements/log${params}`);
  }

  logSupplement(supplementId: number, taken: boolean): Observable<SupplementLog> {
    return this.http.post<SupplementLog>(`${this.baseUrl}/supplements/log`, { supplementId, taken });
  }

  // Habits
  getHabits(): Observable<Habit[]> {
    return this.http.get<Habit[]>(`${this.baseUrl}/habits`);
  }

  createHabit(habit: Partial<Habit>): Observable<Habit> {
    return this.http.post<Habit>(`${this.baseUrl}/habits`, habit);
  }

  updateHabit(id: number, habit: Partial<Habit>): Observable<Habit> {
    return this.http.put<Habit>(`${this.baseUrl}/habits/${id}`, habit);
  }

  deleteHabit(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/habits/${id}`);
  }

  reorderHabits(orderedIds: number[]): Observable<any> {
    return this.http.patch(`${this.baseUrl}/habits/reorder`, { habitIds: orderedIds });
  }

  getHabitLogs(startDate: string): Observable<HabitLog[]> {
    return this.http.get<HabitLog[]>(`${this.baseUrl}/habits/log?week=${startDate}`);
  }

  logHabit(habitId: number, date: string, done: boolean): Observable<HabitLog> {
    return this.http.post<HabitLog>(`${this.baseUrl}/habits/${habitId}/log`, { date, done });
  }

  // Finance
  getFinanceEntries(): Observable<FinanceEntry[]> {
    return this.http.get<FinanceEntry[]>(`${this.baseUrl}/finance`);
  }

  getFinanceEntry(month: string): Observable<FinanceEntry> {
    return this.http.get<FinanceEntry>(`${this.baseUrl}/finance/${month}`);
  }

  createFinanceEntry(entry: Partial<FinanceEntry>): Observable<FinanceEntry> {
    return this.http.post<FinanceEntry>(`${this.baseUrl}/finance`, entry);
  }

  updateFinanceEntry(month: string, entry: Partial<FinanceEntry>): Observable<FinanceEntry> {
    return this.http.put<FinanceEntry>(`${this.baseUrl}/finance/${month}`, entry);
  }

  getDebts(): Observable<Debt[]> {
    return this.http.get<Debt[]>(`${this.baseUrl}/finance/debts`);
  }

  createDebt(debt: Partial<Debt>): Observable<Debt> {
    return this.http.post<Debt>(`${this.baseUrl}/finance/debts`, debt);
  }

  updateDebt(id: number, debt: Partial<Debt>): Observable<Debt> {
    return this.http.put<Debt>(`${this.baseUrl}/finance/debts/${id}`, debt);
  }

  deleteDebt(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/finance/debts/${id}`);
  }

  // Resources
  getResources(): Observable<Resource[]> {
    return this.http.get<Resource[]>(`${this.baseUrl}/resources`);
  }

  createResource(resource: Partial<Resource>): Observable<Resource> {
    return this.http.post<Resource>(`${this.baseUrl}/resources`, resource);
  }

  updateResource(id: number, resource: Partial<Resource>): Observable<Resource> {
    return this.http.put<Resource>(`${this.baseUrl}/resources/${id}`, resource);
  }

  deleteResource(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/resources/${id}`);
  }

  // Checklist
  getChecklist(): Observable<ChecklistItem[]> {
    return this.http.get<ChecklistItem[]>(`${this.baseUrl}/checklist`);
  }

  createChecklistItem(item: Partial<ChecklistItem>): Observable<ChecklistItem> {
    return this.http.post<ChecklistItem>(`${this.baseUrl}/checklist`, item);
  }

  updateChecklistItem(id: number, item: Partial<ChecklistItem>): Observable<ChecklistItem> {
    return this.http.put<ChecklistItem>(`${this.baseUrl}/checklist/${id}`, item);
  }

  deleteChecklistItem(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/checklist/${id}`);
  }

  toggleChecklistItem(id: number, done: boolean): Observable<ChecklistItem> {
    return this.http.patch<ChecklistItem>(`${this.baseUrl}/checklist/${id}/toggle`, { done });
  }

  exportData(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/data/export`);
  }

  importData(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/data/import`, { data });
  }

  search(query: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
  }

  getDailySummary(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/summary/daily`);
  }

  getWeeklyReport(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/summary/weekly`);
  }
}
