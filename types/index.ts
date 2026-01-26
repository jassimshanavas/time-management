// Core Types for Time Manager App

export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskComment {
  id: string;
  text: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface TaskSubtask {
  id: string;
  title: string;
  done: boolean;
}

export interface TaskJournalEntry {
  id: string;
  text: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: Date;
  scheduledStart?: Date; // Optional: When task is scheduled to start
  scheduledEnd?: Date;   // Optional: When task is scheduled to end
  estimatedDuration?: number; // Optional: Estimated duration in minutes
  goalId?: string; // Optional: Link task to a goal
  milestoneId?: string; // Optional: Link task to a specific milestone within the goal
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  comments?: TaskComment[]; // Optional: Comments on the task
  subtasks?: TaskSubtask[]; // Optional: Subtasks checklist
  dependencyIds?: string[]; // Optional: Task dependencies (other task IDs)
  journal?: TaskJournalEntry[]; // Optional: Journal/notes entries
  userId: string; // Required for Firestore security rules
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  completed: boolean;
  createdAt: Date;
  notified?: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  pinned?: boolean;
}

import * as KanbanTypes from './kanban';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetDate?: Date;
  progress: number; // 0-100
  milestones: Milestone[];
  kanbanTasks?: KanbanTypes.Task[]; // Add Kanban tasks to the Goal interface
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Date;
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  longestStreak: number;
  completedDates: Date[];
  createdAt: Date;
}

export interface TimeEntry {
  id: string;
  category: string;
  description?: string;
  taskId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
  isRunning: boolean;
}

export interface TimelineEvent {
  id: string;
  type: 'task' | 'reminder' | 'habit' | 'time-entry';
  title: string;
  timestamp: Date;
  metadata?: any;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  location?: string;
  bio?: string;
  company?: string;
  website?: string;
  createdAt: Date;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  soundEnabled: boolean;
}
