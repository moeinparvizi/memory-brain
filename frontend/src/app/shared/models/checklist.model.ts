export interface ChecklistItem {
  id: number;
  text: string;
  done: boolean;
  category: string | null;
  order: number;
}
