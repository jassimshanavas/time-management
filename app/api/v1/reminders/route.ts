import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { fireWebhook } from '@/lib/webhook-dispatcher';

const db = () => getAdminFirestore();
function ts(v: any) { return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v; }
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, ts(v) ?? v]));
}

// GET /api/v1/reminders
export const GET = withAuth(async (req, { userId }) => {
  const snap = await db().collection('reminders').where('userId', '==', userId).get();
  const reminders = snap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) }));
  return ok({ reminders, count: reminders.length });
});

// POST /api/v1/reminders
export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody(req);
  if (!body) return err('Invalid JSON body');
  const { title, dueDate, ...rest } = body as any;
  if (!title) return err('title is required');
  if (!dueDate) return err('dueDate is required (ISO string)');

  const ref = await db().collection('reminders').add({
    ...rest,
    title,
    dueDate: new Date(dueDate),
    userId,
    completed: false,
    notified: false,
    createdAt: new Date(),
  });
  return ok({ id: ref.id }, 201);
});
