import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { fireWebhook } from '@/lib/webhook-dispatcher';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

const db = () => getAdminFirestore();

// POST /api/v1/goals/:id/milestones
// Body: { title: string }
export const POST = withAuth(async (req, { userId }) => {
  const goalId = req.url.split('/goals/')[1]?.split('/')[0];
  if (!goalId) return err('Missing goal id', 404);

  const ref = db().collection('goals').doc(goalId);
  const snap = await ref.get();
  if (!snap.exists) return err('Goal not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);

  const body = await parseBody<{ title: string }>(req);
  if (!body?.title) return err('title is required');

  const milestone = {
    id: crypto.randomUUID(),
    title: body.title,
    completed: false,
  };

  await ref.update({
    milestones: FieldValue.arrayUnion(milestone),
    updatedAt: new Date(),
  });

  return ok({ milestone }, 201);
});

// PATCH /api/v1/goals/:id/milestones/:mId  — complete/update a milestone
export const PATCH = withAuth(async (req, { userId }) => {
  const parts = req.url.split('/goals/')[1]?.split('/');
  const goalId = parts?.[0];
  const mId = parts?.[2];
  if (!goalId || !mId) return err('Missing goal id or milestone id', 404);

  const ref = db().collection('goals').doc(goalId);
  const snap = await ref.get();
  if (!snap.exists) return err('Goal not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);

  const body = await parseBody(req);
  if (!body) return err('Invalid JSON body');

  const milestones: any[] = snap.data()!.milestones ?? [];
  const idx = milestones.findIndex((m) => m.id === mId);
  if (idx === -1) return err('Milestone not found', 404);

  milestones[idx] = { ...milestones[idx], ...(body as any) };
  if ((body as any).completed && !milestones[idx].completedAt) {
    milestones[idx].completedAt = new Date().toISOString();
    fireWebhook(userId, 'goal.milestone_completed', {
      goalId, milestoneId: mId, title: milestones[idx].title,
    }).catch(() => {});
  }

  await ref.update({ milestones, updatedAt: new Date() });
  return ok({ milestone: milestones[idx] });
});
