export interface Resource {
  id: number;
  topic: string;
  name: string;
  url: string | null;
  type: 'book' | 'course' | 'website' | 'youtube' | null;
  order: number;
}
