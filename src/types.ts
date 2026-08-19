export interface SourceLink {
  title: string;
  url: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  isError?: boolean;
  sources?: SourceLink[];
}

export interface QuickPrompt {
  id: string;
  category: string;
  title: string;
  prompt: string;
  iconName: string;
}
