export interface Habit {
  id: number;
  name: string;
  emoji: string | null;
  color: string | null;
  active: boolean;
  order: number;
  logs?: HabitLog[];
}

export interface HabitLog {
  id: number;
  habitId: number;
  date: string;
  done: boolean;
}
