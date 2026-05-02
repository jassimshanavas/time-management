import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';

const db = () => getAdminFirestore();

// POST /api/v1/goals/:id/progress
// Body: { progress: number (0-100) }
export const POST = withAuth(async (req, { userId }) => {
  const goalId = req.url.split('/goals/')[1]?.split('/')[0];
  if (!goalId) return err('Missing goal id', 404);

  const ref = db().collection('goals').doc(goalId);
  const snap = await ref.get();
  if (!snap.exists) return err('Goal not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);

  const body = await parseBody<{ progress: number }>(req);
  if (body?.progress === undefined) return err('progress (0-100) is required');
  const progress = Math.max(0, Math.min(100, Number(body.progress)));

  await ref.update({ progress, updatedAt: new Date() });
  return ok({ id: goalId, progress });
});
