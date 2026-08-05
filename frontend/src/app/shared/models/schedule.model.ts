export interface ScheduleBlock {
  id: number;
  dayType: 'workday' | 'weekend';
  startTime: string;
  endTime: string;
  activity: string;
  category: 'learning' | 'work' | 'exercise' | 'personal' | 'commute';
  order: number;
}
