import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';

const db = () => getAdminFirestore();
function ts(v: any) { return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v; }
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, ts(v) ?? v]));
}
const sleepId = (url: string) => url.split('/sleep/')[1]?.split('/')[0];

export const GET = withAuth(async (req, { userId }) => {
  const id = sleepId(req.url);
  if (!id) return err('Missing sleep entry id', 404);
  const snap = await db().collection('sleepEntries').doc(id).get();
  if (!snap.exists) return err('Entry not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);
  return ok({ id: snap.id, ...serialize(snap.data()!) });
});

export const PATCH = withAuth(async (req, { userId }) => {
  const id = sleepId(req.url);
  if (!id) return err('Missing sleep entry id', 404);
  const ref = db().collection('sleepEntries').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return err('Entry not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);
  const body = await parseBody(req);
  if (!body) return err('Invalid JSON body');
  const updates = { ...(body as any) };
  delete updates.userId; delete updates.id;
  if (updates.bedtime) updates.bedtime = new Date(updates.bedtime);
  if (updates.wakeTime) updates.wakeTime = new Date(updates.wakeTime);
  await ref.update(updates);
  return ok({ id, updated: true });
});

export const DELETE = withAuth(async (req, { userId }) => {
  const id = sleepId(req.url);
  if (!id) return err('Missing sleep entry id', 404);
  const ref = db().collection('sleepEntries').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return err('Entry not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);
  await ref.delete();
  return ok({ id, deleted: true });
});
