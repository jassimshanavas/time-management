import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { fireWebhook } from '@/lib/webhook-dispatcher';
import { FieldValue } from 'firebase-admin/firestore';

const db = () => getAdminFirestore();

// POST /api/v1/habits/:id/check-in
// Body: { date?: "2026-05-02" }  — defaults to today
export const POST = withAuth(async (req, { userId }) => {
  const habitId = req.url.split('/habits/')[1]?.split('/')[0];
  if (!habitId) return err('Missing habit id', 404);

  const ref = db().collection('habits').doc(habitId);
  const snap = await ref.get();
  if (!snap.exists) return err('Habit not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);

  const data = snap.data()!;
  let body: any = {};
  try { body = await req.json(); } catch {}

  const targetDate = body.date ? new Date(body.date) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  const completedDates: any[] = data.completedDates ?? [];
  const dateStr = targetDate.toDateString();
  const alreadyDone = completedDates.some((d: any) => {
    const dt = d?.toDate ? d.toDate() : new Date(d);
    return dt.toDateString() === dateStr;
  });

  let newDates = [...completedDates];
  let action: 'checked_in' | 'unchecked';

  if (alreadyDone) {
    newDates = newDates.filter((d: any) => {
      const dt = d?.toDate ? d.toDate() : new Date(d);
      return dt.toDateString() !== dateStr;
    });
    action = 'unchecked';
  } else {
    newDates.push(targetDate);
    action = 'checked_in';
  }

  // Recalculate streak
  const sorted = newDates
    .map((d: any) => (d?.toDate ? d.toDate() : new Date(d)))
    .sort((a, b) => b.getTime() - a.getTime());

  const today = new Date(); today.setHours(0, 0, 0, 0);
  let streak = 0;
  for (let i = 0; i < sorted.length; i++) {
    const check = new Date(today); check.setDate(check.getDate() - i);
    if (sorted.some((d) => d.toDateString() === check.toDateString())) streak++;
    else break;
  }
  const longestStreak = Math.max(data.longestStreak ?? 0, streak);

  await ref.update({ completedDates: newDates, streak, longestStreak });

  if (action === 'checked_in') {
    fireWebhook(userId, 'habit.checked_in', { id: habitId, title: data.title, streak }).catch(() => {});
  }

  return ok({ id: habitId, action, streak, longestStreak });
});
