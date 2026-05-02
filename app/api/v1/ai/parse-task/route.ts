import { NextRequest } from 'next/server';
import { withAuth, ok, err, parseBody } from '@/lib/api-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

const db = () => getAdminFirestore();
function ts(v: any) { return v?.toDate ? v.toDate().toISOString() : v instanceof Date ? v.toISOString() : v; }
function serialize(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, ts(v) ?? v]));
}

/**
 * POST /api/v1/ai/parse-task
 * Body: { input: string }
 * Parses natural language into a structured Task object using Groq/Gemini.
 * Does NOT save — returns parsed fields for the caller to POST to /api/v1/tasks.
 */
export const POST = withAuth(async (req, { userId }) => {
  const body = await parseBody<{ input: string; save?: boolean }>(req);
  if (!body?.input) return err('input is required');

  const groqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  if (!groqKey) return err('AI not configured — set NEXT_PUBLIC_GROQ_API_KEY', 503);

  const today = new Date().toISOString().split('T')[0];
  const prompt = `You are a task parser. Convert the following natural language input into a JSON task object.

Today's date: ${today}

Rules:
- title: short, action-oriented
- priority: "low" | "medium" | "high"
- status: always "todo"
- deadline: ISO 8601 date string or null
- tags: array of strings (inferred from context)
- estimatedDuration: minutes (integer) or null
- isUrgent: boolean
- isImportant: boolean
- energyLevel: "low" | "medium" | "high" or null

Return ONLY valid JSON, no explanation.

Input: "${body.input}"`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 512,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[parse-task] Groq error:', errText);
    return err('AI parsing failed', 502);
  }

  const result = await response.json();
  const parsed = JSON.parse(result.choices[0].message.content);

  // Optionally auto-save
  if (body.save) {
    const ref = await db().collection('tasks').add({
      ...parsed,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...(parsed.deadline && { deadline: new Date(parsed.deadline) }),
    });
    return ok({ id: ref.id, task: parsed, saved: true }, 201);
  }

  return ok({ task: parsed, saved: false, hint: 'POST this to /api/v1/tasks to save' });
});
