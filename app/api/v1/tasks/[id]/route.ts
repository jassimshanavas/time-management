import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { fireWebhook } from '@/lib/webhook-dispatcher';
import { FieldValue } from 'firebase-admin/firestore';

const db = () => getAdminFirestore();

function serializeDates(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && 'toDate' in v && typeof (v as any).toDate === 'function') {
      result[k] = (v as any).toDate().toISOString();
    } else if (v instanceof Date) {
      result[k] = v.toISOString();
    } else if (Array.isArray(v)) {
      result[k] = v.map((item) =>
        item && typeof item === 'object' && 'toDate' in item
          ? (item as any).toDate().toISOString()
          : item
      );
    } else {
      result[k] = v;
    }
  }
  return result;
}

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/v1/tasks/:id
export const GET = withAuth(async (req, { userId }) => {
  const { id } = await (req as any)._ctx?.params ?? {};
  // Next.js 15 passes params via second arg - extract from URL
  const taskId = req.url.split('/tasks/')[1]?.split('/')[0];
  if (!taskId) return err('Missing task id', 404);

  const snap = await db().collection('tasks').doc(taskId).get();
  if (!snap.exists) return err('Task not found', 404);
  const data = snap.data()!;
  if (data.userId !== userId) return err('Forbidden', 403);

  return ok({ id: snap.id, ...serializeDates(data) });
});

// PATCH /api/v1/tasks/:id
export const PATCH = withAuth(async (req, { userId }) => {
  const taskId = req.url.split('/tasks/')[1]?.split('/')[0];
  if (!taskId) return err('Missing task id', 404);

  const ref = db().collection('tasks').doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) return err('Task not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);

  const body = await parseBody(req);
  if (!body) return err('Invalid JSON body');

  const updates = { ...(body as any), updatedAt: new Date() };
  // Don't allow overriding userId
  delete updates.userId;
  delete updates.id;

  await ref.update(updates);
  fireWebhook(userId, 'task.updated', { id: taskId, ...updates }).catch(() => {});
  return ok({ id: taskId, updated: true });
});

// DELETE /api/v1/tasks/:id
export const DELETE = withAuth(async (req, { userId }) => {
  const taskId = req.url.split('/tasks/')[1]?.split('/')[0];
  if (!taskId) return err('Missing task id', 404);

  const ref = db().collection('tasks').doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) return err('Task not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);

  await ref.delete();
  fireWebhook(userId, 'task.deleted', { id: taskId }).catch(() => {});
  return ok({ id: taskId, deleted: true });
});
