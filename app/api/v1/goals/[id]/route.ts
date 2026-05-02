import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { fireWebhook } from '@/lib/webhook-dispatcher';
import crypto from 'crypto';

const db = () => getAdminFirestore();
function ts(v: any) { return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v; }
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k,
      Array.isArray(v) ? v.map((i: any) => (typeof i === 'object' && i !== null ? Object.fromEntries(Object.entries(i).map(([ik, iv]) => [ik, ts(iv)])) : i)) : ts(v) ?? v
    ])
  );
}

const goalId = (url: string) => url.split('/goals/')[1]?.split('/')[0];

// GET /api/v1/goals/:id
export const GET = withAuth(async (req, { userId }) => {
  const id = goalId(req.url);
  if (!id) return err('Missing goal id', 404);
  const snap = await db().collection('goals').doc(id).get();
  if (!snap.exists) return err('Goal not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);
  return ok({ id: snap.id, ...serialize(snap.data()!) });
});

// PATCH /api/v1/goals/:id
export const PATCH = withAuth(async (req, { userId }) => {
  const id = goalId(req.url);
  if (!id) return err('Missing goal id', 404);
  const ref = db().collection('goals').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return err('Goal not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);
  const body = await parseBody(req);
  if (!body) return err('Invalid JSON body');
  const updates = { ...(body as any), updatedAt: new Date() };
  delete updates.userId; delete updates.id;
  await ref.update(updates);
  return ok({ id, updated: true });
});

// DELETE /api/v1/goals/:id
export const DELETE = withAuth(async (req, { userId }) => {
  const id = goalId(req.url);
  if (!id) return err('Missing goal id', 404);
  const ref = db().collection('goals').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return err('Goal not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);
  await ref.delete();
  return ok({ id, deleted: true });
});
