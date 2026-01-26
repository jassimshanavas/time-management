// Gamification Type Definitions

export type AchievementCategory = 'tasks' | 'habits' | 'goals' | 'time' | 'streaks' | 'special';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  requirement: number;
  tier: BadgeTier;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number; // Current progress towards requirement
}

export interface UserStats {
  totalTasksCompleted: number;
  totalHabitsCompleted: number;
  totalGoalsCompleted: number;
  totalTimeTracked: number; // in minutes
  longestStreak: number;
  currentStreak: number;
  earlyBirdTasks: number; // Tasks completed before 9 AM
  nightOwlTasks: number; // Tasks completed after 10 PM
  perfectDays: number; // Days with all tasks completed
  consecutivePerfectDays: number;
}

export interface UserGamification {
  userId: string;
  xp: number;
  level: number;
  achievements: Achievement[];
  stats: UserStats;
  lastLoginDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum XPSource {
  TASK_COMPLETED_LOW = 'task_completed_low',
  TASK_COMPLETED_MEDIUM = 'task_completed_medium',
  TASK_COMPLETED_HIGH = 'task_completed_high',
  HABIT_STREAK = 'habit_streak',
  GOAL_MILESTONE = 'goal_milestone',
  GOAL_COMPLETED = 'goal_completed',
  TIME_TRACKED = 'time_tracked',
  DAILY_LOGIN = 'daily_login',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
}

export interface XPReward {
  source: XPSource;
  amount: number;
  message: string;
}

export interface LevelInfo {
  currentLevel: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpToNextLevel: number;
  progressPercent: number;
}
