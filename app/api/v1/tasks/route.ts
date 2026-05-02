import { NextRequest, NextResponse } from 'next/server';
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

// GET /api/v1/tasks — list tasks
// POST /api/v1/tasks — create task
// POST /api/v1/tasks?bulk=1 — bulk create

export const GET = withAuth(async (req, { userId }) => {
  const { searchParams } = new URL(req.url);
  let q = db().collection('tasks').where('userId', '==', userId) as FirebaseFirestore.Query;
  if (searchParams.get('status')) q = q.where('status', '==', searchParams.get('status'));
  if (searchParams.get('priority')) q = q.where('priority', '==', searchParams.get('priority'));
  if (searchParams.get('projectId')) q = q.where('projectId', '==', searchParams.get('projectId'));

  const snap = await q.get();
  const tasks = snap.docs.map((d) => ({ id: d.id, ...serializeDates(d.data()) }));

  // tag filter is post-Firestore (no composite index needed)
  const tag = searchParams.get('tag');
  const filtered = tag ? tasks.filter((t: any) => t.tags?.includes(tag)) : tasks;

  return ok({ tasks: filtered, count: filtered.length });
});

export const POST = withAuth(async (req, { userId }) => {
  const { searchParams } = new URL(req.url);
  const isBulk = searchParams.get('bulk') === '1';
  const body = await parseBody(req);
  if (!body) return err('Invalid JSON body');

  if (isBulk) {
    const items = (body as any).tasks;
    if (!Array.isArray(items)) return err('Provide { tasks: [...] } for bulk create');
    const batch = db().batch();
    const ids: string[] = [];
    for (const task of items) {
      const ref = db().collection('tasks').doc();
      ids.push(ref.id);
      batch.set(ref, { ...task, userId, createdAt: new Date(), updatedAt: new Date() });
    }
    await batch.commit();
    // Fire webhooks for first task as representative (or you could fire per task)
    fireWebhook(userId, 'task.created', { bulk: true, count: ids.length, ids }).catch(() => {});
    return ok({ ids }, 201);
  }

  const { title, ...rest } = body as any;
  if (!title) return err('title is required');

  const ref = await db().collection('tasks').add({
    ...rest,
    title,
    userId,
    status: rest.status ?? 'todo',
    priority: rest.priority ?? 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  fireWebhook(userId, 'task.created', { id: ref.id, title }).catch(() => {});
  return ok({ id: ref.id }, 201);
});
