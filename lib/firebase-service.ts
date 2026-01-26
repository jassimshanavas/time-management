import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  deleteField,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Task, Reminder, Note, Goal, Habit, TimeEntry, User, AppSettings, Project } from '@/types';

// Helper to convert Firestore timestamps to Date objects
const convertTimestamps = (data: any) => {
  const converted = { ...data };
  Object.keys(converted).forEach((key) => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    }
    if (Array.isArray(converted[key])) {
      converted[key] = converted[key].map((item: any) =>
        item instanceof Timestamp ? item.toDate() : item
      );
    }
  });
  return converted;
};

const removeUndefinedFields = (data: Record<string, any>) =>
  Object.entries(data).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>);

// ==================== TASKS ====================
export const getTasks = async (userId: string): Promise<Task[]> => {
  const q = query(collection(db, 'tasks'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Task[];
};

export const addTask = async (userId: string, task: Omit<Task, 'id' | 'userId'>): Promise<string> => {
  const serializedTask = removeUndefinedFields({
    ...task,
    userId,
    createdAt: Timestamp.fromDate(task.createdAt),
    updatedAt: Timestamp.fromDate(task.updatedAt),
    deadline: task.deadline ? Timestamp.fromDate(task.deadline) : null,
    scheduledStart: task.scheduledStart ? Timestamp.fromDate(task.scheduledStart) : null,
    scheduledEnd: task.scheduledEnd ? Timestamp.fromDate(task.scheduledEnd) : null,
  });

  const docRef = await addDoc(collection(db, 'tasks'), serializedTask);
  return docRef.id;
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<void> => {
  const taskRef = doc(db, 'tasks', taskId);

  // Check if document exists first
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) {
    throw new Error(`Task with ID ${taskId} does not exist in Firestore`);
  }

  const data = Object.entries(updates).reduce((acc, [key, value]) => {
    if (value === undefined) {
      acc[key] = deleteField();
      return acc;
    }

    if (value instanceof Date) {
      acc[key] = Timestamp.fromDate(value);
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {} as Record<string, any>);

  if (Object.keys(data).length === 0) return;

  await updateDoc(taskRef, data);
};

export const deleteTask = async (taskId: string): Promise<void> => {
  console.log('Firebase deleteTask called with ID:', taskId);
  const taskRef = doc(db, 'tasks', taskId);

  // Check if document exists first
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) {
    console.warn('Task does not exist, but will proceed with deletion from local state');
    // Don't throw error - just let it proceed to remove from local state
    return;
  }

  await deleteDoc(taskRef);
  console.log('Firestore deleteDoc completed successfully for:', taskId);
};

// ==================== REMINDERS ====================
export const getReminders = async (userId: string): Promise<Reminder[]> => {
  const q = query(collection(db, 'reminders'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Reminder[];
};

export const addReminder = async (userId: string, reminder: Omit<Reminder, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'reminders'), {
    ...reminder,
    userId,
    dueDate: Timestamp.fromDate(reminder.dueDate),
    createdAt: Timestamp.fromDate(reminder.createdAt),
  });
  return docRef.id;
};

export const updateReminder = async (reminderId: string, updates: Partial<Reminder>): Promise<void> => {
  const reminderRef = doc(db, 'reminders', reminderId);
  const data: any = { ...updates };
  if (data.dueDate) data.dueDate = Timestamp.fromDate(data.dueDate);
  await updateDoc(reminderRef, data);
};

export const deleteReminder = async (reminderId: string): Promise<void> => {
  await deleteDoc(doc(db, 'reminders', reminderId));
};

// ==================== NOTES ====================
export const getNotes = async (userId: string): Promise<Note[]> => {
  const q = query(collection(db, 'notes'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Note[];
};

export const addNote = async (userId: string, note: Omit<Note, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'notes'), {
    ...note,
    userId,
    createdAt: Timestamp.fromDate(note.createdAt),
    updatedAt: Timestamp.fromDate(note.updatedAt),
  });
  return docRef.id;
};

export const updateNote = async (noteId: string, updates: Partial<Note>): Promise<void> => {
  const noteRef = doc(db, 'notes', noteId);
  const data: any = { ...updates };
  if (data.updatedAt) data.updatedAt = Timestamp.fromDate(data.updatedAt);
  await updateDoc(noteRef, data);
};

export const deleteNote = async (noteId: string): Promise<void> => {
  await deleteDoc(doc(db, 'notes', noteId));
};

// ==================== GOALS ====================
export const getGoals = async (userId: string): Promise<Goal[]> => {
  const q = query(collection(db, 'goals'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Goal[];
};

export const addGoal = async (userId: string, goal: Omit<Goal, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'goals'), {
    ...goal,
    userId,
    createdAt: Timestamp.fromDate(goal.createdAt),
    targetDate: goal.targetDate ? Timestamp.fromDate(goal.targetDate) : null,
    milestones: goal.milestones.map((m) => ({
      ...m,
      completedAt: m.completedAt ? Timestamp.fromDate(m.completedAt) : null,
    })),
  });
  return docRef.id;
};

export const updateGoal = async (goalId: string, updates: Partial<Goal>): Promise<void> => {
  const goalRef = doc(db, 'goals', goalId);
  const data: any = { ...updates };
  if (data.targetDate) data.targetDate = Timestamp.fromDate(data.targetDate);
  if (data.milestones) {
    data.milestones = data.milestones.map((m: any) => ({
      ...m,
      completedAt: m.completedAt ? Timestamp.fromDate(m.completedAt) : null,
    }));
  }
  await updateDoc(goalRef, data);
};

export const deleteGoal = async (goalId: string): Promise<void> => {
  await deleteDoc(doc(db, 'goals', goalId));
};

// ==================== PROJECTS ====================
export const getProjects = async (userId: string): Promise<Project[]> => {
  const q = query(collection(db, 'projects'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Project[];
};

export const addProject = async (userId: string, project: Omit<Project, 'id' | 'userId'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'projects'), {
    ...project,
    userId,
    createdAt: Timestamp.fromDate(project.createdAt),
    updatedAt: Timestamp.fromDate(project.updatedAt),
  });
  return docRef.id;
};

export const updateProject = async (projectId: string, updates: Partial<Project>): Promise<void> => {
  const projectRef = doc(db, 'projects', projectId);
  const data: any = { ...updates };
  if (data.updatedAt) data.updatedAt = Timestamp.fromDate(data.updatedAt);
  await updateDoc(projectRef, data);
};

export const deleteProject = async (projectId: string): Promise<void> => {
  await deleteDoc(doc(db, 'projects', projectId));
};

// ==================== HABITS ====================
export const getHabits = async (userId: string): Promise<Habit[]> => {
  const q = query(collection(db, 'habits'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()),
  })) as Habit[];
};

export const addHabit = async (userId: string, habit: Omit<Habit, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'habits'), {
    ...habit,
    userId,
    createdAt: Timestamp.fromDate(habit.createdAt),
    completedDates: habit.completedDates.map((d) => Timestamp.fromDate(d)),
  });
  return docRef.id;
};

export const updateHabit = async (habitId: string, updates: Partial<Habit>): Promise<void> => {
  const habitRef = doc(db, 'habits', habitId);
  const data: any = { ...updates };
  if (data.completedDates) {
    data.completedDates = data.completedDates.map((d: Date) => Timestamp.fromDate(d));
  }
  await updateDoc(habitRef, data);
};

export const deleteHabit = async (habitId: string): Promise<void> => {
  await deleteDoc(doc(db, 'habits', habitId));
};

// ==================== TIME ENTRIES ====================
export const getTimeEntries = async (userId: string): Promise<TimeEntry[]> => {
  const q = query(collection(db, 'timeEntries'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = convertTimestamps(doc.data());
    return {
      ...data,
      id: doc.id,
    } as TimeEntry;
  });
};

export const addTimeEntry = async (userId: string, entry: Omit<TimeEntry, 'id'>): Promise<string> => {
  const payload: Record<string, any> = {
    ...entry,
    userId,
    startTime: Timestamp.fromDate(entry.startTime),
    endTime: entry.endTime ? Timestamp.fromDate(entry.endTime) : null,
  };
  delete payload.id;

  const docRef = await addDoc(collection(db, 'timeEntries'), payload);
  return docRef.id;
};

export const updateTimeEntry = async (entryId: string, updates: Partial<TimeEntry>): Promise<void> => {
  const entryRef = doc(db, 'timeEntries', entryId);
  const data: any = { ...updates };
  if (data.startTime) data.startTime = Timestamp.fromDate(data.startTime);
  if (data.endTime) data.endTime = Timestamp.fromDate(data.endTime);
  await updateDoc(entryRef, data);
};

export const deleteTimeEntry = async (entryId: string): Promise<void> => {
  await deleteDoc(doc(db, 'timeEntries', entryId));
};

// ==================== USER & SETTINGS ====================
export const getUser = async (userId: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) return null;
  return { id: userDoc.id, ...userDoc.data() } as User;
};

export const createUser = async (userId: string, user: Omit<User, 'id'>): Promise<void> => {
  await updateDoc(doc(db, 'users', userId), user);
};

export const updateUser = async (userId: string, updates: Partial<User>): Promise<void> => {
  await updateDoc(doc(db, 'users', userId), updates);
};

export const getSettings = async (userId: string): Promise<AppSettings | null> => {
  const settingsDoc = await getDoc(doc(db, 'settings', userId));
  if (!settingsDoc.exists()) return null;
  return settingsDoc.data() as AppSettings;
};

export const updateSettings = async (userId: string, settings: AppSettings): Promise<void> => {
  await updateDoc(doc(db, 'settings', userId), { ...settings });
};

// ==================== BULK OPERATIONS ====================
export const clearAllData = async (userId: string): Promise<void> => {
  const batch = writeBatch(db);

  const collections = ['tasks', 'reminders', 'notes', 'goals', 'habits', 'timeEntries', 'projects'];

  for (const collectionName of collections) {
    const q = query(collection(db, collectionName), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
  }

  await batch.commit();
};

export const exportAllData = async (userId: string) => {
  const [tasks, reminders, notes, goals, habits, timeEntries, projects, user, settings] = await Promise.all([
    getTasks(userId),
    getReminders(userId),
    getNotes(userId),
    getGoals(userId),
    getHabits(userId),
    getTimeEntries(userId),
    getProjects(userId),
    getUser(userId),
    getSettings(userId),
  ]);

  return {
    tasks,
    reminders,
    notes,
    goals,
    habits,
    timeEntries,
    projects,
    user,
    settings,
    exportDate: new Date().toISOString(),
  };
};
