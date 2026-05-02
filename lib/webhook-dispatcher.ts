/**
 * Webhook dispatcher — fires registered webhooks for named events
 */
import { getAdminFirestore } from './firebase-admin';

export type WebhookEvent =
  | 'task.created'
  | 'task.updated'
  | 'task.completed'
  | 'task.deleted'
  | 'habit.checked_in'
  | 'goal.milestone_completed'
  | 'timer.started'
  | 'timer.stopped'
  | 'achievement.unlocked'
  | 'xp.awarded'
  | 'reminder.completed';

export interface WebhookRegistration {
  id: string;
  userId: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  secret?: string;
  createdAt: Date;
  lastTriggeredAt?: Date;
  failureCount: number;
}

import crypto from 'crypto';

function signPayload(secret: string, payload: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export async function fireWebhook(
  userId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const db = getAdminFirestore();
  const snap = await db.collection('webhooks')
    .where('userId', '==', userId)
    .where('active', '==', true)
    .get();

  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });

  const promises = snap.docs
    .filter((d) => {
      const events: WebhookEvent[] = d.data().events ?? [];
      return events.includes(event) || events.includes('*' as WebhookEvent);
    })
    .map(async (d) => {
      const wh = d.data() as WebhookRegistration;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-TimeFlow-Event': event,
        'X-TimeFlow-Delivery': crypto.randomUUID(),
      };
      if (wh.secret) {
        headers['X-TimeFlow-Signature'] = signPayload(wh.secret, payload);
      }

      try {
        const res = await fetch(wh.url, { method: 'POST', headers, body: payload });
        await d.ref.update({
          lastTriggeredAt: new Date(),
          failureCount: res.ok ? 0 : (wh.failureCount ?? 0) + 1,
        });
        if (!res.ok) console.warn(`[Webhook] ${wh.url} responded ${res.status}`);
      } catch (e) {
        await d.ref.update({ failureCount: (wh.failureCount ?? 0) + 1 });
        console.error(`[Webhook] Failed to deliver to ${wh.url}:`, e);
      }
    });

  await Promise.allSettled(promises);
}
