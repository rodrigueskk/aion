export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  color: string;
  points: Point[];
  isEraser?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  imageUrl?: string;
  timestamp: number;
  isPinned?: boolean;
  strokes?: Stroke[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  isPinned?: boolean;
}
