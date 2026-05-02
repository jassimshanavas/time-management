import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { fireWebhook } from '@/lib/webhook-dispatcher';

const db = () => getAdminFirestore();
function ts(v: any) { return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v; }
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, ts(v) ?? v]));
}
const remId = (url: string) => url.split('/reminders/')[1]?.split('/')[0];

export const GET = withAuth(async (req, { userId }) => {
  const id = remId(req.url);
  if (!id) return err('Missing reminder id', 404);
  const snap = await db().collection('reminders').doc(id).get();
  if (!snap.exists) return err('Reminder not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);
  return ok({ id: snap.id, ...serialize(snap.data()!) });
});

export const PATCH = withAuth(async (req, { userId }) => {
  const id = remId(req.url);
  if (!id) return err('Missing reminder id', 404);
  const ref = db().collection('reminders').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return err('Reminder not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);
  const body = await parseBody(req);
  if (!body) return err('Invalid JSON body');
  const updates = { ...(body as any) };
  delete updates.userId; delete updates.id;
  await ref.update(updates);
  return ok({ id, updated: true });
});

export const DELETE = withAuth(async (req, { userId }) => {
  const id = remId(req.url);
  if (!id) return err('Missing reminder id', 404);
  const ref = db().collection('reminders').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return err('Reminder not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);
  await ref.delete();
  return ok({ id, deleted: true });
});

// POST /api/v1/reminders/:id/complete
export const POST = withAuth(async (req, { userId }) => {
  const parts = req.url.split('/reminders/')[1]?.split('/');
  const id = parts?.[0];
  if (!id) return err('Missing reminder id', 404);
  const ref = db().collection('reminders').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return err('Reminder not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);
  await ref.update({ completed: true });
  fireWebhook(userId, 'reminder.completed', { id, title: snap.data()!.title }).catch(() => {});
  return ok({ id, completed: true });
});
