import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';

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

const habitId = (url: string) => url.split('/habits/')[1]?.split('/')[0];

// PATCH /api/v1/habits/:id
export const PATCH = withAuth(async (req, { userId }) => {
  const id = habitId(req.url);
  if (!id) return err('Missing habit id', 404);
  const ref = db().collection('habits').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return err('Habit not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);
  const body = await parseBody(req);
  if (!body) return err('Invalid JSON body');
  const updates = { ...(body as any) };
  delete updates.userId; delete updates.id;
  await ref.update(updates);
  return ok({ id, updated: true });
});

// DELETE /api/v1/habits/:id
export const DELETE = withAuth(async (req, { userId }) => {
  const id = habitId(req.url);
  if (!id) return err('Missing habit id', 404);
  const ref = db().collection('habits').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return err('Habit not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);
  await ref.delete();
  return ok({ id, deleted: true });
});

// GET /api/v1/habits/:id — single habit + streak summary
export const GET = withAuth(async (req, { userId }) => {
  const id = habitId(req.url);
  if (!id) return err('Missing habit id', 404);
  const snap = await db().collection('habits').doc(id).get();
  if (!snap.exists) return err('Habit not found', 404);
  const data = snap.data()!;
  if (data.userId !== userId) return err('Forbidden', 403);
  return ok({ id: snap.id, ...serialize(data) });
});
