export interface TimeSlot {
  id: number;
  label: string;
  time: string;
  emoji: string | null;
  order: number;
  supplements: Supplement[];
}

export interface Supplement {
  id: number;
  timeSlotId: number;
  name: string;
  dose: string | null;
  notes: string | null;
  category: 'daily' | 'workout' | 'optional';
  order: number;
}

export interface SupplementLog {
  id: number;
  supplementId: number;
  date: string;
  taken: boolean;
  takenAt: string | null;
}
