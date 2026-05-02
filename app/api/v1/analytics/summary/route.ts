import { NextRequest } from 'next/server';
import { withAuth, ok, err } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';

const db = () => getAdminFirestore();
function ts(v: any) { return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v; }
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, ts(v) ?? v]));
}

// GET /api/v1/analytics/summary?period=week|month|day
export const GET = withAuth(async (req, { userId }) => {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') ?? 'week';

  const now = new Date();
  const from = new Date(now);
  if (period === 'day') from.setDate(now.getDate() - 1);
  else if (period === 'month') from.setMonth(now.getMonth() - 1);
  else from.setDate(now.getDate() - 7); // week default

  // Fetch in parallel
  const [tasksSnap, habitsSnap, timeSnap, sleepSnap] = await Promise.all([
    db().collection('tasks').where('userId', '==', userId).get(),
    db().collection('habits').where('userId', '==', userId).get(),
    db().collection('timeEntries').where('userId', '==', userId).get(),
    db().collection('sleepEntries').where('userId', '==', userId).get(),
  ]);

  const tasks = tasksSnap.docs.map((d) => d.data());
  const habits = habitsSnap.docs.map((d) => d.data());
  const timeEntries = timeSnap.docs.map((d) => d.data());
  const sleepEntries = sleepSnap.docs.map((d) => d.data());

  // Task stats
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
  const todoTasks = tasks.filter((t) => t.status === 'todo').length;
  const overdueTasks = tasks.filter((t) => {
    const dl = t.deadline?.toDate ? t.deadline.toDate() : t.deadline ? new Date(t.deadline) : null;
    return dl && dl < now && t.status !== 'done';
  }).length;

  // Time tracking stats (period)
  const periodEntries = timeEntries.filter((e) => {
    const st = e.startTime?.toDate ? e.startTime.toDate() : new Date(e.startTime);
    return st >= from;
  });
  const totalMinutes = periodEntries.reduce((sum, e) => sum + (e.duration ?? 0), 0);
  const avgProductivity = periodEntries.length > 0
    ? periodEntries.filter((e) => e.productivityScore).reduce((sum, e) => sum + e.productivityScore, 0) /
      periodEntries.filter((e) => e.productivityScore).length
    : null;

  // Time by category
  const byCategory: Record<string, number> = {};
  for (const e of periodEntries) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + (e.duration ?? 0);
  }

  // Habit stats
  const activeHabits = habits.length;
  const habitStreaks = habits.map((h) => ({ title: h.title, streak: h.streak ?? 0, longestStreak: h.longestStreak ?? 0 }));
  const bestStreak = Math.max(0, ...habits.map((h) => h.streak ?? 0));

  // Sleep stats (period)
  const periodSleep = sleepEntries.filter((e) => {
    const d = e.date?.toDate ? e.date.toDate() : e.date ? new Date(e.date) : null;
    return d && d >= from;
  });
  const avgSleepHours = periodSleep.length > 0
    ? periodSleep.reduce((sum, e) => sum + (e.durationMins ?? 0), 0) / periodSleep.length / 60
    : null;
  const avgSleepQuality = periodSleep.length > 0
    ? periodSleep.reduce((sum, e) => sum + (e.quality ?? 0), 0) / periodSleep.length
    : null;

  return ok({
    period,
    from: from.toISOString(),
    to: now.toISOString(),
    tasks: { total: tasks.length, completed: completedTasks, inProgress: inProgressTasks, todo: todoTasks, overdue: overdueTasks },
    time: { totalMinutes, totalHours: +(totalMinutes / 60).toFixed(1), avgProductivity: avgProductivity ? +avgProductivity.toFixed(1) : null, byCategory },
    habits: { active: activeHabits, bestStreak, streaks: habitStreaks },
    sleep: { avgHours: avgSleepHours ? +avgSleepHours.toFixed(1) : null, avgQuality: avgSleepQuality ? +avgSleepQuality.toFixed(1) : null, nights: periodSleep.length },
  });
});
