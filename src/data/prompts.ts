import { QuickPrompt } from '../types';

export const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: '1',
    category: 'Knowledge',
    title: 'Explain Quantum Computing',
    prompt: 'Can you explain quantum computing in simple terms for a beginner?',
    iconName: 'Sparkles',
  },
  {
    id: '2',
    category: 'Writing',
    title: 'Draft a Professional Email',
    prompt: 'Help me draft a concise, polite follow-up email after a job interview.',
    iconName: 'PenTool',
  },
  {
    id: '3',
    category: 'Creativity',
    title: 'Brainstorm App Ideas',
    prompt: 'Give me 3 innovative mobile app ideas that solve everyday daily problems.',
    iconName: 'Lightbulb',
  },
  {
    id: '4',
    category: 'Learning',
    title: 'Learn a New Concept',
    prompt: 'Explain the 80/20 rule (Pareto Principle) with practical daily life examples.',
    iconName: 'BookOpen',
  },
  {
    id: '5',
    category: 'Productivity',
    title: 'Daily Planning Routine',
    prompt: 'What is a realistic 3-step morning routine to stay focused throughout the day?',
    iconName: 'CheckCircle2',
  },
  {
    id: '6',
    category: 'Coding',
    title: 'JavaScript Async/Await',
    prompt: 'How does async/await work in JavaScript? Show a simple code example.',
    iconName: 'Code',
  },
];
