import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { fireWebhook } from '@/lib/webhook-dispatcher';

const db = () => getAdminFirestore();

function ts(v: any) {
  return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v;
}
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [
      k,
      Array.isArray(v) ? v.map((i: any) => (i?.toDate ? i.toDate().toISOString() : i)) : ts(v) ?? v,
    ])
  );
}

// GET /api/v1/habits
export const GET = withAuth(async (req, { userId }) => {
  const snap = await db().collection('habits').where('userId', '==', userId).get();
  const habits = snap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) }));
  return ok({ habits, count: habits.length });
});

// POST /api/v1/habits
export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody(req);
  if (!body) return err('Invalid JSON body');
  const { title, ...rest } = body as any;
  if (!title) return err('title is required');

  const ref = await db().collection('habits').add({
    ...rest,
    title,
    userId,
    frequency: rest.frequency ?? 'daily',
    streak: 0,
    longestStreak: 0,
    completedDates: [],
    createdAt: new Date(),
  });

  return ok({ id: ref.id }, 201);
});
