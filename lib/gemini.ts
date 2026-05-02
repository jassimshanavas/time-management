/**
 * Astra AI Brain — powered by Groq (Llama 3.3 70B)
 * Supports:
 *  - Simple conversational replies (getAstraResponse)
 *  - Full tool-calling agent loop (getAstraResponseWithTools)
 */

import { ASTRA_TOOL_DEFINITIONS, executeAstraTool, type ToolAction, type AstraContext } from './astra-tools';

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// ─── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Astra, a highly advanced AI productivity assistant integrated into TimeFlow — a personal time management and habit tracking app. You are inspired by JARVIS from Iron Man.

Personality:
- Professional, efficient, slightly witty
- Address the user as "Sir" or "Ma'am" occasionally
- Be concise — max 2-3 sentences in conversational replies
- When you perform an action, confirm it briefly and offer a follow-up

Capabilities (you have tools for these — use them proactively):
- Create tasks from natural language
- Complete/update tasks
- Start and stop timers
- Check in habits
- Break down tasks into subtasks with AI
- Fetch analytics and productivity summaries
- Set reminders
- Add journal entries to tasks

When users ask about their data, ALWAYS use the appropriate tool to get live data.
When responding after using tools, be brief and acknowledge what was done.
Never make up task names, IDs, or data — always use the tool results.`;

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: GroqToolCall[];
  name?: string;
}

interface GroqToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface AstraAgentResult {
  response: string;
  toolActions: ToolAction[];
}

// ─── Build rich context string ─────────────────────────────────────────────────

export function buildRichContextString(ctx: Omit<AstraContext, 'getToken'>): string {
  const now = new Date();
  const today = now.toDateString();

  // Overdue tasks
  const overdue = ctx.tasks.filter(t => {
    if (t.status === 'done' || !t.deadline) return false;
    return new Date(t.deadline) < now;
  });

  // Today's tasks
  const activeTasks = ctx.tasks.filter(t => t.status !== 'done');
  const highPriority = activeTasks.filter(t => t.priority === 'high');

  // Active timer
  const activeTimer = ctx.timeEntries.find(e => e.isRunning);

  // Today's habit check-ins
  const habitsToday = ctx.habits.map(h => {
    const checkedToday = h.completedDates?.some(
      (d: any) => new Date(d?.toDate ? d.toDate() : d).toDateString() === today
    );
    return { name: h.title, streak: h.streak, checkedToday };
  });

  // Latest sleep
  const latestSleep = ctx.sleepEntries.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];

  // Goals
  const activeGoals = ctx.goals.slice(0, 5).map(g => ({
    title: g.title,
    progress: g.progress,
  }));

  const lines = [
    `\n\n=== LIVE USER DATA (${now.toLocaleString()}) ===`,
    `Active tasks: ${activeTasks.length} (${highPriority.length} high priority)`,
    overdue.length > 0 ? `OVERDUE: ${overdue.map(t => `"${t.title}"`).join(', ')}` : 'No overdue tasks',
    activeTimer ? `ACTIVE TIMER: ${activeTimer.category}${activeTimer.description ? ` — ${activeTimer.description}` : ''}` : 'No active timer',
    `\nTask list (top 8):`,
    ...activeTasks.slice(0, 8).map(t => `  - [${t.priority}] "${t.title}" (${t.status})${t.deadline ? ` due ${new Date(t.deadline).toLocaleDateString()}` : ''}`),
    `\nHabits today:`,
    ...habitsToday.map(h => `  - "${h.name}" streak:${h.streak} ${h.checkedToday ? '✓' : '○'}`),
    `\nGoals:`,
    ...activeGoals.map(g => `  - "${g.title}" ${g.progress}% complete`),
    latestSleep ? `\nLast sleep: ${Math.round(latestSleep.durationMins / 60 * 10) / 10}h quality:${latestSleep.quality}/5` : '',
    `\nGamification: Level ${ctx.gamification?.level ?? 1} · ${ctx.gamification?.xp ?? 0} XP`,
    '=== END DATA ===',
  ];

  return lines.filter(Boolean).join('\n');
}

// ─── Simple conversational reply (no tools) ────────────────────────────────────

export async function getAstraResponse(prompt: string, context?: any): Promise<string> {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
    return "Sir, I'm currently disconnected from my neural core. Please provide a Groq API key.";
  }

  const contextStr = context
    ? `\n\nStatus: ${context.activeTasks} active tasks · ${context.highPriorityTasks} high priority · Level ${context.level}`
    : '';

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT + contextStr },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.choices[0]?.message?.content ?? "Sir, I received an empty response.";
  } catch (e: any) {
    console.error('[Astra]', e);
    return "Sir, I'm experiencing interference. Please try again.";
  }
}

// ─── Tool-calling agent loop ────────────────────────────────────────────────────

export async function getAstraResponseWithTools(
  userMessage: string,
  history: ChatMessage[],
  ctx: AstraContext,
  onToolAction?: (action: ToolAction) => void
): Promise<AstraAgentResult> {
  if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
    return {
      response: "Sir, I'm currently disconnected. Please provide a Groq API key.",
      toolActions: [],
    };
  }

  const ctxWithoutToken = { ...ctx, getToken: undefined };
  const systemContent = SYSTEM_PROMPT + buildRichContextString(ctx as any);

  // Build the full message history
  const messages: ChatMessage[] = [
    { role: 'system', content: systemContent },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const allToolActions: ToolAction[] = [];
  const MAX_TOOL_ROUNDS = 5; // Prevent infinite loops

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: ASTRA_TOOL_DEFINITIONS,
        tool_choice: 'auto',
        temperature: 0.2, // Lowered to improve JSON reliability
        max_tokens: 500,  // Lowered from 1024 to dramatically reduce Requested TPM against Groq's 12K free limit
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Astra tool-call error]', errText);
      try {
        const errObj = JSON.parse(errText);
        if (errObj.error?.code === 'rate_limit_exceeded') {
          return { response: "Sir, we have momentarily hit our neural processing capacity limits. Please wait about 10 seconds before issuing your next command.", toolActions: allToolActions };
        }

        if (errObj.error?.code === 'tool_use_failed' && errObj.error?.failed_generation) {
          // It failed but gave us the raw string, e.g. <function=list_tasks={"limit":5}</function>
          console.log('[Astra] Recovering from Groq tool syntax error...');
          // Let's just retry once without tools so it answers Conversationally instead of breaking
          const fallbackRes = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: MODEL,
              messages,
              temperature: 0.3,
            }),
          });
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            return {
              response: fallbackData.choices[0]?.message?.content ?? "Sir, task completed.",
              toolActions: allToolActions,
            };
          }
        }
      } catch (e) {
        // ignore JSON parse error
      }

      return { response: "Sir, I encountered an error processing your request. The neural network failed to format the action correctly.", toolActions: allToolActions };
    }

    const data = await res.json();
    const choice = data.choices[0];
    const assistantMsg = choice.message;

    // If no tool calls → final response
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      return {
        response: assistantMsg.content ?? "Sir, task complete.",
        toolActions: allToolActions,
      };
    }

    // Add assistant's tool-call message to history
    messages.push({
      role: 'assistant',
      content: assistantMsg.content ?? '',
      tool_calls: assistantMsg.tool_calls,
    });

    // Execute each tool call
    for (const toolCall of assistantMsg.tool_calls) {
      const toolName = toolCall.function.name;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {}

      const { result, action } = await executeAstraTool(toolName, args, ctx);
      allToolActions.push(action);
      onToolAction?.(action);

      // Add tool result to messages
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: result,
        name: toolName,
      });
    }

    // Continue loop to get Groq's response after tool results
  }

  return {
    response: "Sir, I've completed the requested operations.",
    toolActions: allToolActions,
  };
}
