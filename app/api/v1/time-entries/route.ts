import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { fireWebhook } from '@/lib/webhook-dispatcher';

const db = () => getAdminFirestore();
function ts(v: any) { return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v; }
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, ts(v) ?? v]));
}

// GET /api/v1/time-entries?taskId=&from=&to=
export const GET = withAuth(async (req, { userId }) => {
  const { searchParams } = new URL(req.url);
  let q = db().collection('timeEntries').where('userId', '==', userId) as FirebaseFirestore.Query;
  if (searchParams.get('taskId')) q = q.where('taskId', '==', searchParams.get('taskId'));

  const snap = await q.get();
  let entries = snap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) }));

  // Date range filter (post-query)
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (from) {
    const fromDate = new Date(from);
    entries = entries.filter((e: any) => new Date(e.startTime) >= fromDate);
  }
  if (to) {
    const toDate = new Date(to);
    entries = entries.filter((e: any) => new Date(e.startTime) <= toDate);
  }

  return ok({ entries, count: entries.length });
});

// POST /api/v1/time-entries — start a timer
export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody(req);
  if (!body) return err('Invalid JSON body');
  const { category, ...rest } = body as any;
  if (!category) return err('category is required');

  // Stop any currently running timer first
  const runningSnap = await db().collection('timeEntries')
    .where('userId', '==', userId)
    .where('isRunning', '==', true)
    .get();
  for (const doc of runningSnap.docs) {
    const entry = doc.data();
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - entry.startTime.toDate().getTime()) / 60000);
    await doc.ref.update({ endTime, duration, isRunning: false });
  }

  const ref = await db().collection('timeEntries').add({
    ...rest,
    category,
    userId,
    startTime: new Date(),
    isRunning: true,
  });

  fireWebhook(userId, 'timer.started', { id: ref.id, category }).catch(() => {});
  return ok({ id: ref.id }, 201);
});
