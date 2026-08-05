export interface WorkoutSession {
  id: number;
  day: string;
  startTime: string;
  endTime: string;
  type: string;
  duration: string;
  exercises: Exercise[];
}

export interface Exercise {
  id: number;
  sessionId: number;
  name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  order: number;
}

export interface WorkoutLog {
  id: number;
  sessionId: number;
  date: string;
  completed: boolean;
  notes: string | null;
}
