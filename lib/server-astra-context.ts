import { getAdminFirestore } from './firebase-admin';
import type { AstraContext } from './astra-tools';
import type { Task, Habit, Goal, TimeEntry, SleepEntry } from '@/types';
import type { UserGamification } from '@/types/gamification';

export async function buildServerAstraContext(userId: string): Promise<AstraContext> {
  const db = getAdminFirestore();

  // Fetch all user context concurrently
  const [
    tasksSnap,
    habitsSnap,
    goalsSnap,
    timeSnap,
    sleepSnap,
    gamificationSnap
  ] = await Promise.all([
    db.collection('tasks').where('userId', '==', userId).get(),
    db.collection('habits').where('userId', '==', userId).get(),
    db.collection('goals').where('userId', '==', userId).get(),
    db.collection('timeEntries').where('userId', '==', userId).get(),
    db.collection('sleepEntries').where('userId', '==', userId).get(),
    db.collection('gamification').doc(userId).get()
  ]);

  const mapDoc = (doc: any) => ({ id: doc.id, ...doc.data() });

  const tasks = tasksSnap.docs.map(mapDoc) as Task[];
  const habits = habitsSnap.docs.map(mapDoc) as Habit[];
  const goals = goalsSnap.docs.map(mapDoc) as Goal[];
  const timeEntries = timeSnap.docs.map(mapDoc) as TimeEntry[];
  const sleepEntries = sleepSnap.docs.map(mapDoc) as SleepEntry[];
  
  const gamification = gamificationSnap.exists 
    ? (gamificationSnap.data() as UserGamification)
    : null;

  return {
    userId,
    tasks,
    habits,
    goals,
    timeEntries,
    sleepEntries,
    gamification,
    getToken: async () => process.env.INTERNAL_API_SECRET || null
  };
}
