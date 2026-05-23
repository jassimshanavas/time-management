/**
 * Astra AI Brain — powered by Groq (Llama 3.3 70B)
 * Supports:
 *  - Simple conversational replies (getAstraResponse)
 *  - Full tool-calling agent loop (getAstraResponseWithTools)
 */

import { ASTRA_TOOL_DEFINITIONS, executeAstraTool, type ToolAction, type AstraContext } from './astra-tools';

// ─── Provider Configuration & Selection ─────────────────────────────────────────

export interface ActiveProvider {
  name: string;
  displayName: string;
  url: string;
  model: string;
  key: string;
  headers: Record<string, string>;
}

function getApiKey(provider: 'groq' | 'cerebras' | 'openrouter'): string {
  if (typeof window !== 'undefined') {
    const localKey = window.localStorage.getItem(`NEXT_PUBLIC_${provider.toUpperCase()}_API_KEY`);
    if (localKey) return localKey;
  }
  if (provider === 'groq') return process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
  if (provider === 'cerebras') return process.env.NEXT_PUBLIC_CEREBRAS_API_KEY || '';
  if (provider === 'openrouter') return process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
  return '';
}

export function getAvailableProviders(): ActiveProvider[] {
  const providers: ActiveProvider[] = [];

  const groqKey = getApiKey('groq');
  if (groqKey && groqKey !== 'your_groq_api_key_here') {
    providers.push({
      name: 'groq',
      displayName: 'Groq (Llama 3.3 70B)',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.3-70b-versatile',
      key: groqKey,
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  const cerebrasKey = getApiKey('cerebras');
  if (cerebrasKey && cerebrasKey !== 'your_cerebras_api_key_here') {
    providers.push({
      name: 'cerebras',
      displayName: 'Cerebras (GPT OSS 120B)',
      url: 'https://api.cerebras.ai/v1/chat/completions',
      model: 'gpt-oss-120b',
      key: cerebrasKey,
      headers: {
        'Authorization': `Bearer ${cerebrasKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  const openrouterKey = getApiKey('openrouter');
  if (openrouterKey && openrouterKey !== 'your_openrouter_api_key_here') {
    providers.push({
      name: 'openrouter-llama',
      displayName: 'OpenRouter Llama 3.3 70B (Free)',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      key: openrouterKey,
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        'X-Title': 'TimeFlow'
      }
    });
    
    providers.push({
      name: 'openrouter-qwen',
      displayName: 'OpenRouter Qwen 2.5 72B (Free)',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      model: 'qwen/qwen-2.5-72b-instruct:free',
      key: openrouterKey,
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        'X-Title': 'TimeFlow'
      }
    });
  }

  return providers;
}

// ─── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Astra, a highly advanced AI productivity assistant integrated into TimeFlow — a personal time management and habit tracking app. You are inspired by JARVIS from Iron Man.

Personality & Cognitive Style:
- Professional, efficient, highly analytical, and slightly witty.
- Address the user as "Sir" or "Ma'am" occasionally.
- Act as a true Agentic Framework: When asked about user activity, productivity, or workspace status, perform a multi-source analysis. Do not just read from a single static list.
- Cross-reference multiple indicators (time entries logged today, tasks updated today, tasks completed today, habits checked today) to reconstruct a perfect narrative of the user's day.
- Show your cognitive reasoning and critical thinking: explain *why* you concluded certain tasks were worked on (e.g. "Since you logged 45 minutes of tracked focus time on 'LLAPI Validations' today...", "Since 'Suda Suda App' was marked done today...").
- If there is ambiguity or a lack of tracked history, state it transparently ("I see no focus sessions tracked for today, Sir. Perhaps we should spin up the focus engine using /timer?").
- Balance conciseness with comprehensiveness: be direct but give full, detailed, structured answers when analyzing data or listing tasks. Never compromise crucial details.

Available Tools (22 total — use them proactively):
- create_task: Create new tasks
- complete_task: Mark a task done
- update_task: Edit task (priority, title, status, deadline, tags)
- delete_task: Remove a task permanently
- list_tasks: List/filter tasks by status, priority, or limit
- start_timer: Start a time tracking session
- stop_timer: Stop the running timer
- check_in_habit: Mark a habit as done today
- list_habits: Show all habits with streak and today status
- create_habit: Create a new daily/weekly habit
- update_habit: Rename or change habit frequency
- breakdown_task: AI-generate subtasks for a task
- get_analytics: Weekly/monthly productivity stats
- list_goals: Show all goals with progress %
- create_goal: Create a new goal
- update_goal_progress: Set a goal's progress percentage
- create_reminder: Set a time-based reminder
- list_reminders: Show upcoming reminders
- add_journal_entry: Add a note to a task
- get_sleep_summary: Show sleep trends and stats
- log_sleep: Log a new sleep entry
- brave_search: Search the web for news, jobs, AI updates

CRITICAL TOOL-CALLING RULES:
- NEVER use XML-style tags like <function=name> or <function_calls>. This format is INVALID.
- ALWAYS use the structured JSON tool_calls format provided by the API.
- If you need to call a tool, emit it as a tool_call — never embed it in your text response.

CRITICAL COGNITIVE ANALYTICS & DATA RULES:
- When asked "what did I do today?", "list all tasks I worked on today", or "what have I done", ALWAYS critically inspect the "TODAY'S RAW ACTIVITY TELEMETRY" section in your system context first. Do not just blindly call list_tasks and return static in-progress states. Cross-reference tasks with tracked time entries today, tasks completed today, or tasks updated today to compile a precise list of active achievements.
- If certain tasks show no activity logs or time tracked today, do not claim they were worked on today!
- NEVER say "I was unable to find" when the user asks for specific tasks, habits, or goals — always call the appropriate tool (list_tasks, list_habits, list_goals) to get live data.
- When the user says "what are those X tasks/habits/goals?", ALWAYS call list_tasks/list_habits/list_goals with the appropriate filter.
- Example: if context says "2 high priority tasks", and user asks "what are they?", call list_tasks with priority: "high" and limit: 5.
- Never guess or make up task names from memory — always use the tool.

CRITICAL SEARCH & NEWS RULES:
- By default, when the user asks for general "news", "trending updates", or "trends", prioritize high-signal tech, AI, and developer-centric topics (like AI tools, remote developer jobs, software updates, tech startups).
- If the user explicitly requests a specific non-tech topic (such as "Indian stock markets", "weather", "sports", or any other area of interest), ALWAYS satisfy their request immediately! Perform the web search (using brave_search) for their exact query and give them accurate, high-quality, up-to-date answers. Do NOT refuse or say you only do tech.
- When searching for tech trends, proactively construct high-signal tech queries (e.g. "latest AI tools", "hacker news tech trends today"). When searching for user-requested topics, use their exact query parameters.
- Avoid generic daily mainstream political headlines (like CNN/Fox News frontpage) unless the user specifically asks for global/politics headlines.
- Synthesize all search results in a classic JARVIS analytical, highly helpful, and witty style, including clean markdown links to the sources.

When users ask about their data, ALWAYS use the appropriate tool to get live data if it's not already in your raw telemetry context.
When responding after using tools, be brief and acknowledge what was done.`;

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
  providerUsed?: string;
  providerModelUsed?: string;
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

  // Today's detailed activities (multi-source logs)
  const tasksCompletedToday = ctx.tasks.filter(t => {
    if (t.status !== 'done') return false;
    const updatedDate = t.updatedAt ? new Date(t.updatedAt) : null;
    return updatedDate && updatedDate.toDateString() === today;
  });

  const tasksCreatedToday = ctx.tasks.filter(t => {
    const createdDate = t.createdAt ? new Date(t.createdAt) : null;
    return createdDate && createdDate.toDateString() === today;
  });

  const tasksUpdatedToday = ctx.tasks.filter(t => {
    if (t.status === 'done') return false;
    const updatedDate = t.updatedAt ? new Date(t.updatedAt) : null;
    const createdDate = t.createdAt ? new Date(t.createdAt) : null;
    // updated today but not created today
    return updatedDate && updatedDate.toDateString() === today && (!createdDate || createdDate.toDateString() !== today);
  });

  const timeEntriesToday = ctx.timeEntries.filter(e => {
    const startDate = e.startTime ? new Date(e.startTime) : null;
    return startDate && startDate.toDateString() === today;
  });

  const timeEntriesWithTask = timeEntriesToday.map(e => {
    const task = ctx.tasks.find(t => t.id === e.taskId);
    return {
      category: e.category,
      description: e.description,
      duration: e.duration || 0,
      taskTitle: task ? task.title : 'General/Untracked Task',
      isRunning: e.isRunning
    };
  });

  const lines = [
    `\n\n=== LIVE USER DATA (${now.toLocaleString()}) ===`,
    `Active tasks: ${activeTasks.length} (${highPriority.length} high priority)`,
    overdue.length > 0 ? `OVERDUE: ${overdue.map(t => `"${t.title}"`).join(', ')}` : 'No overdue tasks',
    activeTimer ? `ACTIVE TIMER: ${activeTimer.category}${activeTimer.description ? ` — ${activeTimer.description}` : ''}` : 'No active timer',
    `\nTask list (top 8 active):`,
    ...activeTasks.slice(0, 8).map(t => `  - [${t.priority}] "${t.title}" (${t.status})${t.deadline ? ` due ${new Date(t.deadline).toLocaleDateString()}` : ''}`),
    `\nHabits today:`,
    ...habitsToday.map(h => `  - "${h.name}" streak:${h.streak} ${h.checkedToday ? '✓' : '○'}`),
    `\nGoals:`,
    ...activeGoals.map(g => `  - "${g.title}" ${g.progress}% complete`),
    latestSleep ? `\nLast sleep: ${Math.round(latestSleep.durationMins / 60 * 10) / 10}h quality:${latestSleep.quality}/5` : '',
    `\nGamification: Level ${ctx.gamification?.level ?? 1} · ${ctx.gamification?.xp ?? 0} XP`,
    
    `\n--- TODAY'S RAW ACTIVITY TELEMETRY ---`,
    `Tasks Created Today: ${tasksCreatedToday.length > 0 ? tasksCreatedToday.map(t => `"${t.title}"`).join(', ') : 'None'}`,
    `Tasks Completed Today: ${tasksCompletedToday.length > 0 ? tasksCompletedToday.map(t => `"${t.title}"`).join(', ') : 'None'}`,
    `Tasks Modified/Moved Today: ${tasksUpdatedToday.length > 0 ? tasksUpdatedToday.map(t => `"${t.title}" (${t.status})`).join(', ') : 'None'}`,
    `Tracked Focus Sessions Today: ${timeEntriesWithTask.length > 0 ? timeEntriesWithTask.map(e => `"${e.taskTitle}" (${e.category}: ${e.duration} mins${e.isRunning ? ' - RUNNING' : ''})`).join(', ') : 'None'}`,
    `Habits Checked In Today: ${habitsToday.filter(h => h.checkedToday).length > 0 ? habitsToday.filter(h => h.checkedToday).map(h => `"${h.name}"`).join(', ') : 'None'}`,
    '=== END DATA ===',
  ];

  return lines.filter(Boolean).join('\n');
}

// ─── Simple conversational reply (no tools) ────────────────────────────────────

export async function getAstraResponse(prompt: string, context?: any): Promise<string> {
  const providers = getAvailableProviders();
  if (providers.length === 0) {
    return "Sir, I am currently disconnected from my neural core. Please configure a Groq, Cerebras, or OpenRouter API key in the environment variables or browser LocalStorage.";
  }

  const contextStr = context
    ? `\n\nStatus: ${context.activeTasks} active tasks · ${context.highPriorityTasks} high priority · Level ${context.level}`
    : '';

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      console.log(`[Astra] Attempting conversational request with ${provider.displayName}...`);
      const res = await fetch(provider.url, {
        method: 'POST',
        headers: provider.headers,
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT + contextStr },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 400,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const text = data.choices[0]?.message?.content;
      if (text) {
        console.log(`[Astra] ✓ Connected successfully via ${provider.displayName}`);
        return text;
      }
      throw new Error("Empty response returned from model");
    } catch (e: any) {
      console.warn(`[Astra] Provider ${provider.displayName} failed:`, e.message || e);
      errors.push(`${provider.displayName}: ${e.message || e}`);
    }
  }

  return `Sir, all my reasoning systems are experiencing interference. Tried: ${errors.join(', ')}. Please verify your network and API keys.`;
}

// ─── Tool-calling agent loop ────────────────────────────────────────────────────

export async function getAstraResponseWithTools(
  userMessage: string,
  history: ChatMessage[],
  ctx: AstraContext,
  onToolAction?: (action: ToolAction) => void
): Promise<AstraAgentResult> {
  const providers = getAvailableProviders();
  if (providers.length === 0) {
    return {
      response: "Sir, I am currently disconnected from my core reasoning systems. Please configure an API key for Groq, Cerebras, or OpenRouter to begin.",
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
  let successfulProvider: ActiveProvider | null = null;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let completionData: any = null;
    let providerUsed: ActiveProvider | null = null;
    const errors: string[] = [];

    // Attempt completion with active providers in priority order
    for (const provider of providers) {
      try {
        console.log(`[Astra] Round ${round + 1} completion attempt via ${provider.displayName}...`);

        const reqBody: Record<string, any> = {
          model: provider.model,
          messages,
          temperature: 0.1, // Low temp for maximum tool adherence
          max_tokens: 600,
        };

        if (ASTRA_TOOL_DEFINITIONS && ASTRA_TOOL_DEFINITIONS.length > 0) {
          reqBody.tools = ASTRA_TOOL_DEFINITIONS;
          reqBody.tool_choice = 'auto';
        }

        const res = await fetch(provider.url, {
          method: 'POST',
          headers: provider.headers,
          body: JSON.stringify(reqBody),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`[Astra] ${provider.displayName} completion error:`, errText);

          try {
            const errObj = JSON.parse(errText);
            
            // Special Groq recovery for tool_use_failed (XML tag generation fallback)
            if (provider.name === 'groq' && errObj.error?.code === 'tool_use_failed' && errObj.error?.failed_generation) {
              const rawGen: string = errObj.error.failed_generation;
              console.log('[Astra] Groq tool_use_failed — attempting to parse & execute from failed_generation...');

              const xmlMatch = rawGen.match(/<function=(\w+)\s*[>]?\s*(\{[\s\S]*?\})\s*<\/function>/i)
                ?? rawGen.match(/<function=(\w+)(\{[\s\S]*?\})/i);

              if (xmlMatch) {
                const toolName = xmlMatch[1];
                const args = JSON.parse(xmlMatch[2]) as Record<string, unknown>;
                console.log('[Astra] Parsed XML tool call from failed_generation:', toolName, args);

                const fakeId = `recovery-${Date.now()}`;
                const { result, action } = await executeAstraTool(toolName, args, ctx);
                allToolActions.push(action);
                onToolAction?.(action);

                messages.push({
                  role: 'assistant',
                  content: '',
                  tool_calls: [{
                    id: fakeId,
                    type: 'function',
                    function: { name: toolName, arguments: JSON.stringify(args) },
                  }],
                });
                messages.push({
                  role: 'tool',
                  tool_call_id: fakeId,
                  content: result,
                  name: toolName,
                });

                completionData = { recovered: true };
                providerUsed = provider;
                successfulProvider = provider;
                break; // Recovered successfully! Break provider loop
              }
            }
          } catch (recoveryErr) {
            console.error('[Astra] Failed during XML tool execution recovery:', recoveryErr);
          }

          throw new Error(`HTTP ${res.status}: ${errText}`);
        }

        const data = await res.json();
        if (data.choices && data.choices[0]) {
          completionData = data;
          providerUsed = provider;
          successfulProvider = provider;
          break; // Completion success, break provider loop
        } else {
          throw new Error("Empty choices array in API response");
        }
      } catch (e: any) {
        console.warn(`[Astra] Failover triggered: ${provider.displayName} failed.`, e.message || e);
        errors.push(`${provider.displayName}: ${e.message || e}`);
      }
    }

    if (!completionData) {
      return {
        response: `Sir, all active providers failed to execute your command. Errors:\n${errors.join('\n')}`,
        toolActions: allToolActions,
      };
    }

    // If we recovered using XML parser, the messages history has been injected and we continue to the next round.
    if (completionData.recovered) {
      continue;
    }

    const choice = completionData.choices[0];
    const assistantMsg = choice.message;

    // ── Safety net: model sometimes emits tool-call JSON as plain text ───────
    if (
      (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) &&
      assistantMsg.content
    ) {
      const content = assistantMsg.content.trim();

      const extractFirstJSON = (s: string): Record<string, unknown> | null => {
        try { return JSON.parse(s) as Record<string, unknown>; } catch {}
        const start = s.indexOf('{');
        if (start === -1) return null;
        let depth = 0;
        let inStr = false;
        let escape = false;
        for (let i = start; i < s.length; i++) {
          const ch = s[i];
          if (escape) { escape = false; continue; }
          if (ch === '\\' && inStr) { escape = true; continue; }
          if (ch === '"') { inStr = !inStr; continue; }
          if (inStr) continue;
          if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) {
              try { return JSON.parse(s.slice(start, i + 1)) as Record<string, unknown>; } catch { return null; }
            }
          }
        }
        return null;
      };

      const parsed = extractFirstJSON(content);
      if (parsed) {
        let toolName: string | undefined;
        if (typeof parsed.name === 'string') {
          toolName = parsed.name;
        } else if (typeof parsed.function === 'string') {
          toolName = parsed.function;
        } else if (typeof (parsed.function as any)?.name === 'string') {
          toolName = (parsed.function as any).name;
        }

        const rawArgs = parsed.parameters ?? parsed.arguments ?? parsed.args ?? parsed.input ?? {};

        if (toolName && typeof rawArgs === 'object') {
          console.log('[Astra] Intercepted plain text-format tool call:', toolName, rawArgs);
          const args = rawArgs as Record<string, unknown>;

          const fakeToolCallId = `auto-${Date.now()}`;
          const { result, action } = await executeAstraTool(toolName, args, ctx);
          allToolActions.push(action);
          onToolAction?.(action);

          messages.push({
            role: 'assistant',
            content: '',
            tool_calls: [{
              id: fakeToolCallId,
              type: 'function',
              function: { name: toolName, arguments: JSON.stringify(args) },
            }],
          });
          messages.push({
            role: 'tool',
            tool_call_id: fakeToolCallId,
            content: result,
            name: toolName,
          });
          continue; // Let the model reply natural language in the next loop round
        }
      }
    }

    // If no tool calls → final response
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      return {
        response: assistantMsg.content ?? "Sir, operations completed.",
        toolActions: allToolActions,
        providerUsed: providerUsed?.displayName || 'Unknown',
        providerModelUsed: providerUsed?.model || 'Unknown',
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
  }

  return {
    response: "Sir, I have completed the requested operations.",
    toolActions: allToolActions,
    providerUsed: successfulProvider?.displayName || 'Unknown',
    providerModelUsed: successfulProvider?.model || 'Unknown',
  };
}

// ─── Speech Telemetry Purifier ────────────────────────────────────────────────

export function cleanTextForSpeech(text: string): string {
  if (!text) return "";
  let clean = text;

  // Handle markdown tables
  if (clean.includes("|")) {
    const lines = clean.split("\n");
    const speechLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        // Discard separator lines e.g. |---|---| or |:---:|
        if (/^[|:\-\s]+$/.test(line)) {
          continue;
        }
        // If it's a data or header row, split by | and grab the non-empty cells
        const cells = line.split('|')
          .map(c => c.trim())
          .filter(c => c.length > 0);
        
        if (cells.length > 0) {
          speechLines.push(cells.join(", "));
        }
      } else {
        speechLines.push(lines[i]);
      }
    }
    clean = speechLines.join("\n");
  }

  // 1. Remove all double and single asterisks (bold/italic markers)
  clean = clean.replace(/\*\*/g, "");
  clean = clean.replace(/\*/g, "");

  // 2. Remove other markdown tags (headers, inline code quotes, underscores)
  clean = clean.replace(/#/g, "");
  clean = clean.replace(/`/g, "");
  clean = clean.replace(/_/g, "");

  // 3. Clean up slash commands so it says "command" instead of pronouncing the slash symbol
  // E.g., "/task" -> "task command", "/timer" -> "timer command"
  clean = clean.replace(/\/([a-zA-Z0-9\-]+)/g, "$1 command");

  // 4. Convert bullet list dashes to brief natural conversational pauses (commas)
  clean = clean.replace(/^\s*[-*]\s+/gm, ", ");

  // 5. Replace technical hyphens separating clauses with natural pauses
  clean = clean.replace(/\s+-\s+/g, ", ");

  // 6. Clean up redundant spaces
  clean = clean.replace(/\s+/g, " ");

  // 7. Truncate to reasonable speaking length so it doesn't ramble
  return clean.trim().slice(0, 250);
}

