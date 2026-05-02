import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

const db = () => getAdminFirestore();

// POST /api/v1/tasks/:id/subtasks
// Body: { title: string, productivityScore?: number, outcome?: string }
export const POST = withAuth(async (req, { userId }) => {
  const taskId = req.url.split('/tasks/')[1]?.split('/')[0];
  if (!taskId) return err('Missing task id', 404);

  const ref = db().collection('tasks').doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) return err('Task not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);

  const body = await parseBody<{ title: string; productivityScore?: number; outcome?: string }>(req);
  if (!body?.title) return err('title is required');

  const newSubtask = {
    id: crypto.randomUUID(),
    title: body.title,
    done: false,
    ...(body.productivityScore !== undefined && { productivityScore: body.productivityScore }),
    ...(body.outcome !== undefined && { outcome: body.outcome }),
  };

  await ref.update({
    subtasks: FieldValue.arrayUnion(newSubtask),
    updatedAt: new Date(),
  });

  return ok({ subtask: newSubtask }, 201);
});

// PATCH /api/v1/tasks/:id/subtasks/:subId
// Note: Firestore doesn't support nested array element updates directly,
// so we read, mutate, and write back the full subtasks array.
export const PATCH = withAuth(async (req, { userId }) => {
  const urlParts = req.url.split('/tasks/')[1]?.split('/');
  const taskId = urlParts?.[0];
  const subId = urlParts?.[2]; // subtasks/:subId
  if (!taskId || !subId) return err('Missing task id or subtask id', 404);

  const ref = db().collection('tasks').doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) return err('Task not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);

  const body = await parseBody(req);
  if (!body) return err('Invalid JSON body');

  const subtasks: any[] = snap.data()!.subtasks ?? [];
  const idx = subtasks.findIndex((s: any) => s.id === subId);
  if (idx === -1) return err('Subtask not found', 404);

  subtasks[idx] = { ...subtasks[idx], ...body };
  if ((body as any).done && !(subtasks[idx].completedAt)) {
    subtasks[idx].completedAt = new Date().toISOString();
  }

  await ref.update({ subtasks, updatedAt: new Date() });
  return ok({ subtask: subtasks[idx] });
});
