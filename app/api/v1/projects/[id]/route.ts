import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';

const db = () => getAdminFirestore();
function ts(v: any) { return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v; }
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, ts(v) ?? v]));
}
const projId = (url: string) => url.split('/projects/')[1]?.split('/')[0];

// GET /api/v1/projects/:id
export const GET = withAuth(async (req, { userId }) => {
  const id = projId(req.url);
  if (!id) return err('Missing project id', 404);
  const snap = await db().collection('projects').doc(id).get();
  if (!snap.exists) return err('Project not found', 404);
  const data = snap.data()!;
  if (!data.memberIds?.includes(userId)) return err('Forbidden', 403);
  return ok({ id: snap.id, ...serialize(data) });
});

// PATCH /api/v1/projects/:id
export const PATCH = withAuth(async (req, { userId }) => {
  const id = projId(req.url);
  if (!id) return err('Missing project id', 404);
  const ref = db().collection('projects').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return err('Project not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden — only owner can update', 403);
  const body = await parseBody(req);
  if (!body) return err('Invalid JSON body');
  const updates = { ...(body as any), updatedAt: new Date() };
  delete updates.userId; delete updates.id; delete updates.memberIds; delete updates.members;
  await ref.update(updates);
  return ok({ id, updated: true });
});

// DELETE /api/v1/projects/:id
export const DELETE = withAuth(async (req, { userId }) => {
  const id = projId(req.url);
  if (!id) return err('Missing project id', 404);
  const ref = db().collection('projects').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return err('Project not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden — only owner can delete', 403);
  await ref.delete();
  return ok({ id, deleted: true });
});
