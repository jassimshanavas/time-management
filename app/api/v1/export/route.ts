import { NextRequest } from 'next/server';
import { withAuth, ok, err } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';

const db = () => getAdminFirestore();
function ts(v: any) { return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v; }
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, ts(v) ?? v]));
}

// GET /api/v1/export — Full JSON export of all user data
export const GET = withAuth(async (req, { userId }) => {
  const collections = ['tasks', 'reminders', 'notes', 'goals', 'habits', 'timeEntries', 'sleepEntries', 'projects'];

  const results = await Promise.all(
    collections.map(async (col) => {
      const snap = await db().collection(col).where('userId', '==', userId).get();
      return [col, snap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) }))];
    })
  );

  const data = Object.fromEntries(results);
  data.exportedAt = new Date().toISOString();
  data.userId = userId;

  return ok(data);
});
