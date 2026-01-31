// Global State Management using Zustand with Firebase
import { create } from 'zustand';
import type { Task, Reminder, Note, Goal, Habit, TimeEntry, User, AppSettings, Project } from '@/types';
import type { UserGamification, XPReward, Achievement } from '@/types/gamification';
import * as firebaseService from './firebase-service';
import * as gamificationService from './firebase-gamification';
import {
  checkAchievements,
  getNewlyUnlockedAchievements,
  calculateLevel,
  initializeAchievements,
  XP_REWARDS,
  XPSource
} from './gamification';

interface AppStore {
  // User & Auth
  userId: string | null;
  setUserId: (id: string | null) => void;

  // Settings
  settings: AppSettings;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;

  // Gamification
  gamification: UserGamification | null;
  loadGamification: () => Promise<void>;
  initializeGamification: () => Promise<void>;
  addXP: (xpReward: XPReward) => Promise<Achievement[]>; // Returns newly unlocked achievements
  updateStats: (stats: Partial<UserGamification['stats']>) => Promise<void>;
  checkAndUpdateAchievements: () => Promise<Achievement[]>;

  // Tasks
  tasks: Task[];
  loadTasks: () => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'userId'>) => Promise<void>;
  updateTask: (id: string, task: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // Reminders
  reminders: Reminder[];
  loadReminders: () => Promise<void>;
  addReminder: (reminder: Omit<Reminder, 'id'>) => Promise<void>;
  updateReminder: (id: string, reminder: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;

  // Notes
  notes: Note[];
  loadNotes: () => Promise<void>;
  addNote: (note: Omit<Note, 'id'>) => Promise<void>;
  updateNote: (id: string, note: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  // Goals
  goals: Goal[];
  loadGoals: () => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (id: string, goal: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  // Habits
  habits: Habit[];
  loadHabits: () => Promise<void>;
  addHabit: (habit: Omit<Habit, 'id'>) => Promise<void>;
  updateHabit: (id: string, habit: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleHabitCompletion: (id: string, date: Date) => Promise<void>;

  // Time Tracking
  timeEntries: TimeEntry[];
  loadTimeEntries: () => Promise<void>;
  addTimeEntry: (entry: Omit<TimeEntry, 'id'>) => Promise<void>;
  updateTimeEntry: (id: string, entry: Partial<TimeEntry>) => Promise<void>;
  deleteTimeEntry: (id: string) => Promise<void>;
  stopTimeEntry: (id: string, notes?: string) => Promise<void>;

  // Projects
  projects: Project[];
  loadProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id' | 'userId'>) => Promise<void>;
  updateProject: (id: string, project: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Workspace / Global Filter
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;

  // Utility
  loadAllData: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

export const useStore = create<AppStore>()((set, get) => ({
  // User & Auth
  userId: null,
  setUserId: (id) => set({ userId: id }),

  // Gamification
  gamification: null,
  loadGamification: async () => {
    const userId = get().userId;
    if (!userId) return;
    try {
      const data = await gamificationService.getUserGamification(userId);
      if (data) set({ gamification: data });
    } catch (error) {
      console.error('Error loading gamification:', error);
    }
  },
  initializeGamification: async () => {
    const userId = get().userId;
    if (!userId) return;
    try {
      await gamificationService.initializeUserGamification(userId);
      const data = await gamificationService.getUserGamification(userId);
      if (data) set({ gamification: data });
    } catch (error) {
      console.error('Error initializing gamification:', error);
    }
  },
  addXP: async (xpReward) => {
    const { userId, gamification, checkAndUpdateAchievements } = get();
    if (!userId || !gamification) return [];

    try {
      const newXP = gamification.xp + xpReward.amount;
      const newLevel = calculateLevel(newXP);

      await gamificationService.updateUserXP(userId, xpReward.amount);
      if (newLevel > gamification.level) {
        await gamificationService.updateUserLevel(userId, newLevel);
      }

      set((state) => ({
        gamification: state.gamification ? {
          ...state.gamification,
          xp: newXP,
          level: newLevel
        } : null
      }));

      return await checkAndUpdateAchievements();
    } catch (error) {
      console.error('Error adding XP:', error);
      return [];
    }
  },
  updateStats: async (stats) => {
    const { userId, gamification } = get();
    if (!userId || !gamification) return;

    try {
      await gamificationService.updateUserStats(userId, stats);
      set((state) => ({
        gamification: state.gamification ? {
          ...state.gamification,
          stats: { ...state.gamification.stats, ...stats }
        } : null
      }));
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  },
  checkAndUpdateAchievements: async () => {
    const { userId, gamification } = get();
    if (!userId || !gamification) return [];

    try {
      const updatedAchievements = checkAchievements(gamification.stats, gamification.achievements);
      const newlyUnlocked = getNewlyUnlockedAchievements(gamification.achievements, updatedAchievements);

      if (newlyUnlocked.length > 0) {
        await gamificationService.updateAchievements(userId, updatedAchievements);
        set((state) => ({
          gamification: state.gamification ? {
            ...state.gamification,
            achievements: updatedAchievements
          } : null
        }));
      }

      return newlyUnlocked;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  },



  // Settings
  settings: {
    theme: 'system',
    notifications: true,
    soundEnabled: true,
  },
  loadSettings: async () => {
    const userId = get().userId;
    if (!userId) return;
    try {
      const settings = await firebaseService.getSettings(userId);
      if (settings) set({ settings });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  },
  updateSettings: async (newSettings) => {
    const userId = get().userId;
    if (!userId) return;
    try {
      const updated = { ...get().settings, ...newSettings };
      await firebaseService.updateSettings(userId, updated);
      set({ settings: updated });
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  },

  // Tasks
  tasks: [],
  loadTasks: async () => {
    const userId = get().userId;
    if (!userId) return;
    try {
      const tasks = await firebaseService.getTasks(userId);
      set({ tasks });
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  },
  addTask: async (task) => {
    const userId = get().userId;
    if (!userId) return;
    try {
      const taskId = await firebaseService.addTask(userId, task);
      set((state) => ({ tasks: [...state.tasks, { ...task, id: taskId, userId }] }));
    } catch (error) {
      console.error('Error adding task:', error);
    }
  },
  updateTask: async (id, updatedTask) => {
    // Optimistic update - update UI immediately
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...updatedTask, updatedAt: new Date() } : task
      ),
    }));

    try {
      // Then sync with Firestore
      await firebaseService.updateTask(id, { ...updatedTask, updatedAt: new Date() });
    } catch (error: any) {
      console.error('Error updating task:', error);
      // If task doesn't exist, remove from local state
      if (error?.message?.includes('does not exist')) {
        console.warn('Task does not exist in Firestore, removing from local state');
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id)
        }));
      } else {
        // Revert the optimistic update on other errors
        throw error;
      }
    }
  },
  deleteTask: async (id) => {
    try {
      await firebaseService.deleteTask(id);
      set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) }));
    } catch (error: any) {
      console.error('Error deleting task:', error);
      // If task doesn't exist in Firestore, just remove from local state
      if (error?.message?.includes('does not exist') || error?.message?.includes('No document')) {
        console.warn('Task not in Firestore, removing from local state only');
        set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) }));
      } else {
        throw error; // Re-throw other errors so UI can handle them
      }
    }
  },

  // Reminders
  reminders: [],
  loadReminders: async () => {
    const userId = get().userId;
    if (!userId) return;
    try {
      const reminders = await firebaseService.getReminders(userId);
      set({ reminders });
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  },
  addReminder: async (reminder) => {
    const userId = get().userId;
    if (!userId) return;
    try {
      const reminderId = await firebaseService.addReminder(userId, reminder);
      set((state) => ({ reminders: [...state.reminders, { ...reminder, id: reminderId }] }));
    } catch (error) {
      console.error('Error adding reminder:', error);
    }
  },
  updateReminder: async (id, updatedReminder) => {
    try {
      await firebaseService.updateReminder(id, updatedReminder);
      set((state) => ({
        reminders: state.reminders.map((reminder) =>
          reminder.id === id ? { ...reminder, ...updatedReminder } : reminder
        ),
      }));
    } catch (error) {
      console.error('Error updating reminder:', error);
    }
  },
  deleteReminder: async (id) => {
    try {
      await firebaseService.deleteReminder(id);
      set((state) => ({ reminders: state.reminders.filter((reminder) => reminder.id !== id) }));
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  },

  // Notes
  notes: [],
  loadNotes: async () => {
    const userId = get().userId;
    if (!userId) return;
    try {
      const notes = await firebaseService.getNotes(userId);
      set({ notes });
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  },
  addNote: async (note) => {
    const userId = get().userId;
    if (!userId) return;
    try {
      const noteId = await firebaseService.addNote(userId, note);
      set((state) => ({ notes: [...state.notes, { ...note, id: noteId }] }));
    } catch (error) {
      console.error('Error adding note:', error);
    }
  },
  updateNote: async (id, updatedNote) => {
    try {
      await firebaseService.updateNote(id, { ...updatedNote, updatedAt: new Date() });
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id ? { ...note, ...updatedNote, updatedAt: new Date() } : note
        ),
      }));
    } catch (error) {
      console.error('Error updating note:', error);
    }
  },
  deleteNote: async (id) => {
    try {
      await firebaseService.deleteNote(id);
      set((state) => ({ notes: state.notes.filter((note) => note.id !== id) }));
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  },

  // Goals
  goals: [],
  loadGoals: async () => {
    const userId = get().userId;
    if (!userId) return;
    try {
      const goals = await firebaseService.getGoals(userId);
      set({ goals });
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  },
  addGoal: async (goal) => {
    const userId = get().userId;
    if (!userId) return;
    try {
      const goalId = await firebaseService.addGoal(userId, goal);
      set((state) => ({ goals: [...state.goals, { ...goal, id: goalId }] }));
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  },
  updateGoal: async (id, updatedGoal) => {
    try {
      await firebaseService.updateGoal(id, updatedGoal);
      set((state) => ({
        goals: state.goals.map((goal) =>
          goal.id === id ? { ...goal, ...updatedGoal } : goal
        ),
      }));
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  },
  deleteGoal: async (id) => {
    try {
      await firebaseService.deleteGoal(id);
      set((state) => ({ goals: state.goals.filter((goal) => goal.id !== id) }));
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  },

  // Habits
  habits: [],
  loadHabits: async () => {
    const userId = get().userId;
    if (!userId) return;
    try {
      const habits = await firebaseService.getHabits(userId);
      set({ habits });
    } catch (error) {
      console.error('Error loading habits:', error);
    }
  },
  addHabit: async (habit) => {
    const userId = get().userId;
    if (!userId) return;
    try {
      const habitId = await firebaseService.addHabit(userId, habit);
      set((state) => ({ habits: [...state.habits, { ...habit, id: habitId }] }));
    } catch (error) {
      console.error('Error adding habit:', error);
    }
  },
  updateHabit: async (id, updatedHabit) => {
    try {
      await firebaseService.updateHabit(id, updatedHabit);
      set((state) => ({
        habits: state.habits.map((habit) =>
          habit.id === id ? { ...habit, ...updatedHabit } : habit
        ),
      }));
    } catch (error) {
      console.error('Error updating habit:', error);
    }
  },
  deleteHabit: async (id) => {
    try {
      await firebaseService.deleteHabit(id);
      set((state) => ({ habits: state.habits.filter((habit) => habit.id !== id) }));
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  },
  toggleHabitCompletion: async (id, date) => {
    const habit = get().habits.find((h) => h.id === id);
    if (!habit) return;

    const dateStr = date.toDateString();
    const isCompleted = habit.completedDates.some(
      (d) => new Date(d).toDateString() === dateStr
    );

    let completedDates = [...habit.completedDates];
    if (isCompleted) {
      completedDates = completedDates.filter(
        (d) => new Date(d).toDateString() !== dateStr
      );
    } else {
      completedDates.push(date);
    }

    // Calculate streak
    const sortedDates = completedDates
      .map((d) => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedDates.length; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const hasDate = sortedDates.some(
        (d) => d.toDateString() === checkDate.toDateString()
      );
      if (hasDate) {
        streak++;
      } else {
        break;
      }
    }

    const longestStreak = Math.max(habit.longestStreak || 0, streak);

    try {
      await firebaseService.updateHabit(id, {
        completedDates,
        streak,
        longestStreak,
      });
      set((state) => ({
        habits: state.habits.map((h) =>
          h.id === id
            ? { ...h, completedDates, streak, longestStreak }
            : h
        ),
      }));
    } catch (error) {
      console.error('Error toggling habit completion:', error);
    }
  },

  // Time Tracking
  timeEntries: [],
  loadTimeEntries: async () => {
    const userId = get().userId;
    if (!userId) return;
    try {
      const timeEntries = await firebaseService.getTimeEntries(userId);
      set({ timeEntries });
    } catch (error) {
      console.error('Error loading time entries:', error);
    }
  },
  addTimeEntry: async (entry) => {
    const userId = get().userId;
    if (!userId) return;
    try {
      const entryId = await firebaseService.addTimeEntry(userId, entry);
      set((state) => ({ timeEntries: [...state.timeEntries, { ...entry, id: entryId }] }));
    } catch (error) {
      console.error('Error adding time entry:', error);
    }
  },
  updateTimeEntry: async (id, updatedEntry) => {
    try {
      await firebaseService.updateTimeEntry(id, updatedEntry);
      set((state) => ({
        timeEntries: state.timeEntries.map((entry) =>
          entry.id === id ? { ...entry, ...updatedEntry } : entry
        ),
      }));
    } catch (error) {
      console.error('Error updating time entry:', error);
    }
  },
  deleteTimeEntry: async (id) => {
    try {
      await firebaseService.deleteTimeEntry(id);
      set((state) => ({ timeEntries: state.timeEntries.filter((entry) => entry.id !== id) }));
    } catch (error) {
      console.error('Error deleting time entry:', error);
    }
  },
  stopTimeEntry: async (id, notes) => {
    const entry = get().timeEntries.find((e) => e.id === id);
    if (!entry || !entry.isRunning) return;

    const endTime = new Date();
    const duration = Math.floor(
      (endTime.getTime() - new Date(entry.startTime).getTime()) / 60000
    );

    try {
      await firebaseService.updateTimeEntry(id, { endTime, duration, isRunning: false, notes });
      set((state) => ({
        timeEntries: state.timeEntries.map((e) =>
          e.id === id ? { ...e, endTime, duration, isRunning: false, notes } : e
        ),
      }));
    } catch (error) {
      console.error('Error stopping time entry:', error);
    }
  },

  // Projects
  projects: [],
  loadProjects: async () => {
    const userId = get().userId;
    if (!userId) return;
    try {
      const projects = await firebaseService.getProjects(userId);
      set({ projects });
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  },
  addProject: async (project) => {
    const userId = get().userId;
    if (!userId) return;
    try {
      const projectId = await firebaseService.addProject(userId, project);
      set((state) => ({ projects: [...state.projects, { ...project, id: projectId, userId }] }));
    } catch (error) {
      console.error('Error adding project:', error);
    }
  },
  updateProject: async (id, updatedProject) => {
    try {
      await firebaseService.updateProject(id, { ...updatedProject, updatedAt: new Date() });
      set((state) => ({
        projects: state.projects.map((project) =>
          project.id === id ? { ...project, ...updatedProject, updatedAt: new Date() } : project
        ),
      }));
    } catch (error) {
      console.error('Error updating project:', error);
    }
  },
  deleteProject: async (id) => {
    try {
      await firebaseService.deleteProject(id);
      set((state) => ({ projects: state.projects.filter((project) => project.id !== id) }));
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  },

  // Workspace / Global Filter
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),

  // Utility
  loadAllData: async () => {
    await Promise.all([
      get().loadTasks(),
      get().loadReminders(),
      get().loadNotes(),
      get().loadGoals(),
      get().loadHabits(),
      get().loadTimeEntries(),
      get().loadProjects(),
      get().loadSettings(),
    ]);
  },
  clearAllData: async () => {
    const userId = get().userId;
    if (!userId) return;
    try {
      await firebaseService.clearAllData(userId);
      set({
        tasks: [],
        reminders: [],
        notes: [],
        goals: [],
        habits: [],
        timeEntries: [],
        projects: [],
      });
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  },
}));
