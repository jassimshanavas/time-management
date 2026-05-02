import { NextRequest } from 'next/server';
import { withAuth, ok, err } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { fireWebhook } from '@/lib/webhook-dispatcher';
import { FieldValue } from 'firebase-admin/firestore';

const db = () => getAdminFirestore();

// POST /api/v1/tasks/:id/complete
// Body: {} (optional: { productivityScore: 1-5, notes: "..." })
export const POST = withAuth(async (req, { userId }) => {
  const parts = req.url.split('/tasks/')[1]?.split('/');
  const taskId = parts?.[0];
  if (!taskId) return err('Missing task id', 404);

  const ref = db().collection('tasks').doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) return err('Task not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);

  let body: any = {};
  try { body = await req.json(); } catch {}

  await ref.update({
    status: 'done',
    updatedAt: new Date(),
    lastStatusChange: new Date(),
    ...(body.productivityScore !== undefined && { productivityScore: body.productivityScore }),
    ...(body.notes !== undefined && { completionNotes: body.notes }),
  });

  fireWebhook(userId, 'task.completed', { id: taskId, title: snap.data()!.title }).catch(() => {});

  return ok({
    id: taskId,
    status: 'done',
    message: 'Task marked as complete',
  });
});
