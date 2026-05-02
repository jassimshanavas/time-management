import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import type { WebhookEvent } from '@/lib/webhook-dispatcher';

const db = () => getAdminFirestore();
function ts(v: any) { return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v; }
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, ts(v) ?? v]));
}

const ALL_EVENTS: WebhookEvent[] = [
  'task.created', 'task.updated', 'task.completed', 'task.deleted',
  'habit.checked_in', 'goal.milestone_completed',
  'timer.started', 'timer.stopped',
  'achievement.unlocked', 'xp.awarded', 'reminder.completed',
];

// GET /api/v1/webhooks — list registered webhooks
export const GET = withAuth(async (req, { userId }) => {
  const snap = await db().collection('webhooks').where('userId', '==', userId).get();
  const webhooks = snap.docs.map((d) => {
    const data = serialize(d.data());
    // Don't expose secret in list
    delete (data as any).secret;
    return { id: d.id, ...data };
  });
  return ok({ webhooks, count: webhooks.length, availableEvents: ALL_EVENTS });
});

// POST /api/v1/webhooks — register a new webhook
export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody<{ name: string; url: string; events: WebhookEvent[]; secret?: string }>(req);
  if (!body?.name) return err('name is required');
  if (!body?.url) return err('url is required');

  // Validate URL
  try { new URL(body.url); } catch { return err('url must be a valid URL'); }

  const events = body.events?.length ? body.events : ALL_EVENTS;
  const invalidEvents = events.filter((e) => !ALL_EVENTS.includes(e));
  if (invalidEvents.length > 0) return err(`Unknown events: ${invalidEvents.join(', ')}`);

  const ref = await db().collection('webhooks').add({
    userId,
    name: body.name,
    url: body.url,
    events,
    secret: body.secret ?? null,
    active: true,
    failureCount: 0,
    createdAt: new Date(),
  });

  return ok({
    id: ref.id,
    name: body.name,
    url: body.url,
    events,
    active: true,
    message: 'Webhook registered. Events will be delivered via POST with X-TimeFlow-Event header.',
  }, 201);
});
