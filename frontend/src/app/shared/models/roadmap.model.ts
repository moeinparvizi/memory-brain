export interface Phase {
  id: number;
  title: string;
  duration: string;
  goal: string;
  status: 'not-started' | 'in-progress' | 'completed';
  progress: number;
  order: number;
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  phaseId: number;
  month: number;
  topic: string;
  output: string | null;
  done: boolean;
  notes: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}
