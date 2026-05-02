import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

const db = () => getAdminFirestore();

// POST /api/v1/tasks/:id/comments
// Body: { text: string }
export const POST = withAuth(async (req, { userId }) => {
  const taskId = req.url.split('/tasks/')[1]?.split('/')[0];
  if (!taskId) return err('Missing task id', 404);

  const ref = db().collection('tasks').doc(taskId);
  const snap = await ref.get();
  if (!snap.exists) return err('Task not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);

  const body = await parseBody<{ text: string }>(req);
  if (!body?.text) return err('text is required');

  const comment = {
    id: crypto.randomUUID(),
    text: body.text,
    createdAt: new Date().toISOString(),
  };

  await ref.update({
    comments: FieldValue.arrayUnion(comment),
    updatedAt: new Date(),
  });

  return ok({ comment }, 201);
});
