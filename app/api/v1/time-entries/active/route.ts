import { NextRequest } from 'next/server';
import { withAuth, ok, err } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';

const db = () => getAdminFirestore();
function ts(v: any) { return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v; }
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, ts(v) ?? v]));
}

// GET /api/v1/time-entries/active — currently running timer
export const GET = withAuth(async (req, { userId }) => {
  const snap = await db().collection('timeEntries')
    .where('userId', '==', userId)
    .where('isRunning', '==', true)
    .limit(1)
    .get();

  if (snap.empty) return ok({ active: null });

  const doc = snap.docs[0];
  const data = serialize(doc.data());
  const elapsed = Math.floor(
    (Date.now() - new Date(data.startTime as string).getTime()) / 60000
  );

  return ok({ active: { id: doc.id, ...data, elapsedMinutes: elapsed } });
});
