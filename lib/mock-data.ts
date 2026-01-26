// Mock data for testing and demo purposes
import type { Task, Reminder, Note, Goal, Habit, TimeEntry } from '@/types';

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Complete project proposal',
    description: 'Write and submit the Q1 project proposal',
    status: 'in-progress',
    priority: 'high',
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    tags: ['work', 'urgent'],
    userId: 'mock-user',
  },
  {
    id: '2',
    title: 'Review code changes',
    description: 'Review pull requests from team members',
    status: 'todo',
    priority: 'medium',
    deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    tags: ['work', 'development'],
    userId: 'mock-user',
  },
  {
    id: '3',
    title: 'Update documentation',
    description: 'Update API documentation with new endpoints',
    status: 'done',
    priority: 'low',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    tags: ['documentation'],
    userId: 'mock-user',
  },
];

export const mockReminders: Reminder[] = [
  {
    id: '1',
    title: 'Team meeting',
    description: 'Weekly sync with the development team',
    dueDate: new Date(Date.now() + 3 * 60 * 60 * 1000),
    completed: false,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    title: 'Submit timesheet',
    description: 'Submit weekly timesheet by EOD',
    dueDate: new Date(Date.now() + 5 * 60 * 60 * 1000),
    completed: false,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    title: 'Call dentist',
    description: 'Schedule dental checkup appointment',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    completed: false,
    createdAt: new Date(),
  },
];

export const mockNotes: Note[] = [
  {
    id: '1',
    title: 'Meeting Notes - Jan 15',
    content: `# Team Sync Meeting

## Attendees
- John Doe
- Jane Smith
- Mike Johnson

## Key Points
- Discussed Q1 roadmap
- Reviewed sprint progress
- Assigned new tasks

## Action Items
- [ ] Update project timeline
- [ ] Schedule follow-up meeting
- [ ] Send meeting summary`,
    tags: ['meeting', 'work'],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    pinned: true,
  },
  {
    id: '2',
    title: 'Project Ideas',
    content: `# New Project Ideas

1. **Time Manager App** - A comprehensive productivity tool
2. **Habit Tracker** - Daily habit tracking with analytics
3. **Note Taking App** - Markdown-based note system

## Next Steps
Research existing solutions and identify gaps.`,
    tags: ['ideas', 'projects'],
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
];

export const mockGoals: Goal[] = [
  {
    id: '1',
    title: 'Learn TypeScript',
    description: 'Master TypeScript for better code quality',
    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    progress: 65,
    milestones: [
      { id: '1', title: 'Complete TypeScript basics', completed: true },
      { id: '2', title: 'Build a TypeScript project', completed: true },
      { id: '3', title: 'Learn advanced types', completed: false },
      { id: '4', title: 'Contribute to TS open source', completed: false },
    ],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: 'Fitness Goal - Run 5K',
    description: 'Train to run 5K in under 30 minutes',
    targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    progress: 40,
    milestones: [
      { id: '1', title: 'Run 1K without stopping', completed: true },
      { id: '2', title: 'Run 3K consistently', completed: true },
      { id: '3', title: 'Run 5K (any time)', completed: false },
      { id: '4', title: 'Run 5K under 30 min', completed: false },
    ],
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
  },
];

export const mockHabits: Habit[] = [
  {
    id: '1',
    title: 'Morning Exercise',
    description: '30 minutes of exercise every morning',
    frequency: 'daily',
    streak: 12,
    longestStreak: 25,
    completedDates: [
      new Date(),
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
    ],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    title: 'Read for 30 minutes',
    description: 'Daily reading habit',
    frequency: 'daily',
    streak: 7,
    longestStreak: 15,
    completedDates: [
      new Date(),
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    ],
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    title: 'Meditation',
    description: '10 minutes of meditation',
    frequency: 'daily',
    streak: 5,
    longestStreak: 10,
    completedDates: [
      new Date(),
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    ],
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  },
];

export const mockTimeEntries: TimeEntry[] = [
  {
    id: '1',
    category: 'Development',
    description: 'Working on Time Manager App',
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - 30 * 60 * 1000),
    duration: 90,
    isRunning: false,
  },
  {
    id: '2',
    category: 'Meeting',
    description: 'Team standup',
    startTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
    duration: 30,
    isRunning: false,
  },
  {
    id: '3',
    category: 'Learning',
    description: 'TypeScript tutorial',
    startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() - 22.5 * 60 * 60 * 1000),
    duration: 90,
    isRunning: false,
  },
];
