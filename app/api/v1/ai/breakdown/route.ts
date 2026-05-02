import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';

const db = () => getAdminFirestore();
function ts(v: any) { return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v; }
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, ts(v) ?? v]));
}

/**
 * POST /api/v1/ai/breakdown
 * Body: { taskId: string }
 * Reads a task and generates smart subtasks using AI.
 * Optionally saves the subtasks directly to the task.
 */
export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody<{ taskId: string; save?: boolean }>(req);
  if (!body?.taskId) return err('taskId is required');

  const snap = await db().collection('tasks').doc(body.taskId).get();
  if (!snap.exists) return err('Task not found', 404);
  if (snap.data()!.userId !== userId) return err('Forbidden', 403);

  const task = snap.data()!;
  const groqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  if (!groqKey) return err('AI not configured', 503);

  const prompt = `Break down this task into 3-8 concrete, actionable subtasks.

Task title: "${task.title}"
Description: "${task.description ?? 'None'}"
Priority: ${task.priority}
${task.deadline ? `Deadline: ${ts(task.deadline)}` : ''}

Return a JSON object with a "subtasks" array. Each subtask has:
- title: string (specific, actionable, starts with a verb)
- estimatedMinutes: integer or null

Return ONLY valid JSON.`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) return err('AI breakdown failed', 502);

  const result = await response.json();
  const parsed = JSON.parse(result.choices[0].message.content);
  const subtasks = (parsed.subtasks ?? []).map((s: any, i: number) => ({
    id: crypto.randomUUID(),
    title: s.title,
    done: false,
    estimatedMinutes: s.estimatedMinutes ?? null,
  }));

  if (body.save) {
    const existing: any[] = task.subtasks ?? [];
    await snap.ref.update({ subtasks: [...existing, ...subtasks], updatedAt: new Date() });
    return ok({ subtasks, saved: true, taskId: body.taskId });
  }

  return ok({ subtasks, saved: false, hint: 'POST with save:true to auto-add subtasks to the task' });
});

