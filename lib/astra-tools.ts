/**
 * Astra Tool Definitions & Executor
 *
 * Defines the tools Astra can call (Groq function-calling format)
 * and executes them against the internal /api/v1 endpoints.
 */

import type { Task, Habit, Goal, TimeEntry, SleepEntry } from '@/types';
import type { UserGamification } from '@/types/gamification';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToolAction {
  tool: string;
  args: Record<string, unknown>;
  summary: string;
  success: boolean;
  emoji: string;
  data?: unknown;
}

export interface AstraContext {
  userId?: string; // Add optional userId for internal server loopback
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  timeEntries: TimeEntry[];
  sleepEntries: SleepEntry[];
  gamification: UserGamification | null;
  getToken: () => Promise<string | null>;
}

// ─── Tool Definitions (OpenAI-compatible for Groq) ────────────────────────────

export const ASTRA_TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task for the user. Use when the user asks to add, create, or remember a task.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short, action-oriented task title' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Task priority' },
          deadline: { type: 'string', description: 'ISO 8601 date string (e.g. 2026-05-03) or null' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Relevant tags' },
          estimatedDuration: { type: 'number', description: 'Estimated minutes to complete' },
          isUrgent: { type: 'boolean' },
          isImportant: { type: 'boolean' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'Mark a task as done/completed. Use when user says "done", "finished", "complete", "mark as done".',
      parameters: {
        type: 'object',
        properties: {
          task_name: { type: 'string', description: 'Name or partial name of the task to complete' },
          productivity_score: { type: 'number', description: 'Optional 1-5 productivity rating' },
          notes: { type: 'string', description: 'Optional completion notes' },
        },
        required: ['task_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'start_timer',
      description: 'Start a time tracking timer. Use when user says "start timer", "track time", "begin working on".',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Work category (e.g. Deep Work, Meetings, Learning)' },
          description: { type: 'string', description: 'What they are working on' },
          task_name: { type: 'string', description: 'Optional: link to existing task name' },
        },
        required: ['category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'stop_timer',
      description: 'Stop the currently running timer. Use when user says "stop timer", "done working", "end session".',
      parameters: {
        type: 'object',
        properties: {
          productivity_score: { type: 'number', description: '1-5 productivity rating for this session' },
          notes: { type: 'string', description: 'Session notes or reflection' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_in_habit',
      description: 'Mark a habit as done for today. Use when user says "did my X", "completed X", "check in X habit".',
      parameters: {
        type: 'object',
        properties: {
          habit_name: { type: 'string', description: 'Name or partial name of the habit' },
        },
        required: ['habit_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_analytics',
      description: 'Get productivity analytics summary. Use when user asks "how am I doing", "weekly review", "stats", "summary".',
      parameters: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['day', 'week', 'month'], description: 'Time period to analyze' },
        },
        required: ['period'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'breakdown_task',
      description: 'Use AI to break a task into subtasks. Use when user says "break down", "plan out", "what steps for".',
      parameters: {
        type: 'object',
        properties: {
          task_name: { type: 'string', description: 'Name or partial name of the task to break down' },
          save: { type: 'boolean', description: 'Whether to save the subtasks automatically (default true)' },
        },
        required: ['task_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description: 'List tasks with optional filters. Use when user asks "what are my tasks", "show me", "what is pending".',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['todo', 'in-progress', 'done'], description: 'Filter by status' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Filter by priority' },
          limit: { type: 'number', description: 'Max tasks to return (default 5)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_reminder',
      description: 'Set a reminder. Use when user says "remind me", "don\'t forget", "set a reminder".',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'What to remind about' },
          due_date: { type: 'string', description: 'ISO 8601 datetime string for when to remind' },
          description: { type: 'string', description: 'Optional details' },
        },
        required: ['title', 'due_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_journal_entry',
      description: 'Add a journal/note entry to a task. Use when user shares thoughts about a task, reflections.',
      parameters: {
        type: 'object',
        properties: {
          task_name: { type: 'string', description: 'Task to add journal entry to' },
          text: { type: 'string', description: 'The journal entry text' },
        },
        required: ['task_name', 'text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'brave_search',
      description: 'Search the web for real-time news, AI updates, career job openings, or general online information. Use when asked about trends, current news events, or job postings.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query string' },
        },
        required: ['query'],
      },
    },
  },
  // ─── NEW TOOLS ─────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Update/edit an existing task. Use when user asks to change priority, rename, reschedule, or update any task field. Also use to move a task to in-progress.',
      parameters: {
        type: 'object',
        properties: {
          task_name: { type: 'string', description: 'Name or partial name of the task to update' },
          title: { type: 'string', description: 'New title (if renaming)' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'New priority' },
          status: { type: 'string', enum: ['todo', 'in-progress', 'done'], description: 'New status' },
          deadline: { type: 'string', description: 'New ISO 8601 deadline date or null to clear' },
          tags: { type: 'array', items: { type: 'string' }, description: 'New tags array' },
          estimatedDuration: { type: 'number', description: 'New estimated minutes' },
        },
        required: ['task_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: 'Permanently delete a task. Use when user says "delete", "remove", "cancel", "get rid of" a task.',
      parameters: {
        type: 'object',
        properties: {
          task_name: { type: 'string', description: 'Name or partial name of the task to delete' },
        },
        required: ['task_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_habits',
      description: 'List all habits with their streak and today\'s check-in status. Use when user asks "what habits do I have", "show my habits", "my streaks".',
      parameters: {
        type: 'object',
        properties: {
          checked_today: { type: 'boolean', description: 'Filter: only show habits done today (true) or not done today (false)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_goals',
      description: 'List all active goals with progress percentage. Use when user asks "what are my goals", "show goals", "goal progress".',
      parameters: {
        type: 'object',
        properties: {
          min_progress: { type: 'number', description: 'Only return goals with progress >= this percentage' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_goal_progress',
      description: 'Update the progress percentage of a goal. Use when user says "I\'m X% done with my goal", "update goal progress".',
      parameters: {
        type: 'object',
        properties: {
          goal_name: { type: 'string', description: 'Name or partial name of the goal' },
          progress: { type: 'number', description: 'New progress percentage (0-100)' },
        },
        required: ['goal_name', 'progress'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_habit',
      description: 'Create a new habit to track. Use when user says "add habit", "I want to start doing", "track my X habit".',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Habit name, short and action-oriented' },
          description: { type: 'string', description: 'Optional description' },
          frequency: { type: 'string', enum: ['daily', 'weekly'], description: 'How often (daily or weekly)' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_habit',
      description: 'Update/rename/change frequency of an existing habit.',
      parameters: {
        type: 'object',
        properties: {
          habit_name: { type: 'string', description: 'Current name or partial name of the habit' },
          title: { type: 'string', description: 'New habit name' },
          description: { type: 'string', description: 'New description' },
          frequency: { type: 'string', enum: ['daily', 'weekly'], description: 'New frequency' },
        },
        required: ['habit_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_goal',
      description: 'Create a new goal. Use when user says "I want to achieve", "set a goal", "new goal".',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Goal title' },
          description: { type: 'string', description: 'Optional description' },
          targetDate: { type: 'string', description: 'ISO 8601 target date (e.g. 2026-12-31)' },
          emoji: { type: 'string', description: 'Optional emoji representing the goal' },
          color: { type: 'string', description: 'Optional hex color code' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_reminders',
      description: 'List upcoming reminders. Use when user asks "what are my reminders", "show reminders", "upcoming reminders".',
      parameters: {
        type: 'object',
        properties: {
          only_pending: { type: 'boolean', description: 'If true, only show uncompleted reminders' },
          limit: { type: 'number', description: 'Max number to return (default 5)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_sleep_summary',
      description: 'Get sleep trends and recent sleep data. Use when user asks "how did I sleep", "sleep stats", "sleep quality".',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Number of past days to analyze (default 7)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_sleep',
      description: 'Log a sleep entry. Use when user says "I slept X hours", "log my sleep", "went to bed at X".',
      parameters: {
        type: 'object',
        properties: {
          bedtime: { type: 'string', description: 'ISO 8601 datetime when they went to bed' },
          wake_time: { type: 'string', description: 'ISO 8601 datetime when they woke up' },
          quality: { type: 'number', description: '1-5 sleep quality rating (1=terrible, 5=excellent)' },
          mood: { type: 'string', enum: ['great', 'good', 'okay', 'tired', 'awful'], description: 'Wake-up mood' },
          notes: { type: 'string', description: 'Optional notes' },
        },
        required: ['bedtime', 'wake_time', 'quality'],
      },
    },
  },
];

// ─── Helper: fuzzy task/habit finder ─────────────────────────────────────────

function findByName<T extends { title: string; id: string }>(
  items: T[],
  name: string
): T | null {
  const lower = name.toLowerCase();
  // Exact match first
  let found = items.find((i) => i.title.toLowerCase() === lower);
  if (found) return found;
  // Starts with
  found = items.find((i) => i.title.toLowerCase().startsWith(lower));
  if (found) return found;
  // Contains
  found = items.find((i) => i.title.toLowerCase().includes(lower));
  return found ?? null;
}

// ─── Tool Executor ────────────────────────────────────────────────────────────

export async function executeAstraTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: AstraContext
): Promise<{ result: string; action: ToolAction }> {
  if (!args) {
    args = {};
  }
  const token = await ctx.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  // If the token matches the internal secret, use internal loopback auth headers
  if (token === process.env.INTERNAL_API_SECRET && ctx.userId) {
    headers['X-Internal-Secret'] = token;
    headers['X-Internal-User-Id'] = ctx.userId;
  } else if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Ensure absolute URL if running server-side (Node.js fetch requires absolute URLs)
  const baseUrl = typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') : '';

  const api = async (path: string, method = 'GET', body?: unknown) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    return res.json();
  };

  try {
    switch (toolName) {
      // ── Create Task ──────────────────────────────────────────────────────
      case 'create_task': {
        const taskBody: Record<string, unknown> = {
          title: args.title,
          priority: args.priority ?? 'medium',
          status: 'todo',
        };
        if (args.deadline) taskBody.deadline = args.deadline;
        if (args.tags) taskBody.tags = args.tags;
        if (args.estimatedDuration) taskBody.estimatedDuration = args.estimatedDuration;
        if (args.isUrgent !== undefined) taskBody.isUrgent = args.isUrgent;
        if (args.isImportant !== undefined) taskBody.isImportant = args.isImportant;

        const data = await api('/api/v1/tasks', 'POST', taskBody);
        return {
          result: JSON.stringify({ success: true, id: data.id, title: args.title }),
          action: { tool: 'create_task', args, emoji: '✅', summary: `Created task: "${args.title}"`, success: true, data },
        };
      }

      // ── Complete Task ─────────────────────────────────────────────────────
      case 'complete_task': {
        const task = findByName(ctx.tasks.filter(t => t.status !== 'done'), String(args.task_name));
        if (!task) {
          return {
            result: JSON.stringify({ success: false, error: `No active task found matching "${args.task_name}"` }),
            action: { tool: 'complete_task', args, emoji: '❌', summary: `Task not found: "${args.task_name}"`, success: false },
          };
        }
        const completeBody: Record<string, unknown> = {};
        if (args.productivity_score) completeBody.productivityScore = args.productivity_score;
        if (args.notes) completeBody.notes = args.notes;
        await api(`/api/v1/tasks/${task.id}/complete`, 'POST', completeBody);
        return {
          result: JSON.stringify({ success: true, task: task.title }),
          action: { tool: 'complete_task', args, emoji: '🎉', summary: `Completed: "${task.title}"`, success: true },
        };
      }

      // ── Start Timer ───────────────────────────────────────────────────────
      case 'start_timer': {
        // Find task ID if task_name provided
        let taskId: string | undefined;
        if (args.task_name) {
          const task = findByName(ctx.tasks, String(args.task_name));
          if (task) taskId = task.id;
        }
        const timerBody: Record<string, unknown> = {
          category: args.category,
          description: args.description,
        };
        if (taskId) timerBody.taskId = taskId;
        const data = await api('/api/v1/time-entries', 'POST', timerBody);
        return {
          result: JSON.stringify({ success: true, id: data.id, category: args.category }),
          action: { tool: 'start_timer', args, emoji: '⏱️', summary: `Timer started: ${args.category}${args.task_name ? ` → "${args.task_name}"` : ''}`, success: true },
        };
      }

      // ── Stop Timer ────────────────────────────────────────────────────────
      case 'stop_timer': {
        const activeData = await api('/api/v1/time-entries/active');
        if (!activeData.active) {
          return {
            result: JSON.stringify({ success: false, error: 'No timer is currently running' }),
            action: { tool: 'stop_timer', args, emoji: '⚠️', summary: 'No active timer found', success: false },
          };
        }
        const stopBody: Record<string, unknown> = {};
        if (args.productivity_score) stopBody.productivityScore = args.productivity_score;
        if (args.notes) stopBody.notes = args.notes;
        const stopped = await api(`/api/v1/time-entries/${activeData.active.id}/stop`, 'POST', stopBody);
        const mins = stopped.duration ?? activeData.active.elapsedMinutes ?? 0;
        const hrs = Math.floor(mins / 60);
        const rem = mins % 60;
        const durStr = hrs > 0 ? `${hrs}h ${rem}m` : `${mins}m`;
        return {
          result: JSON.stringify({ success: true, duration: mins, category: activeData.active.category }),
          action: { tool: 'stop_timer', args, emoji: '⏹️', summary: `Timer stopped · ${durStr} logged for ${activeData.active.category}`, success: true },
        };
      }

      // ── Check-in Habit ────────────────────────────────────────────────────
      case 'check_in_habit': {
        const habit = findByName(ctx.habits, String(args.habit_name));
        if (!habit) {
          return {
            result: JSON.stringify({ success: false, error: `No habit found matching "${args.habit_name}"` }),
            action: { tool: 'check_in_habit', args, emoji: '❌', summary: `Habit not found: "${args.habit_name}"`, success: false },
          };
        }
        const data = await api(`/api/v1/habits/${habit.id}/check-in`, 'POST', {});
        return {
          result: JSON.stringify({ success: true, habit: habit.title, action: data.action, streak: data.streak }),
          action: { tool: 'check_in_habit', args, emoji: '🔥', summary: `${habit.title} checked in · Streak: ${data.streak} days`, success: true },
        };
      }

      // ── Analytics ─────────────────────────────────────────────────────────
      case 'get_analytics': {
        const data = await api(`/api/v1/analytics/summary?period=${args.period ?? 'week'}`);
        return {
          result: JSON.stringify(data),
          action: { tool: 'get_analytics', args, emoji: '📊', summary: `Analytics fetched for this ${args.period}`, success: true, data },
        };
      }

      // ── Breakdown Task ────────────────────────────────────────────────────
      case 'breakdown_task': {
        const task = findByName(ctx.tasks, String(args.task_name));
        if (!task) {
          return {
            result: JSON.stringify({ success: false, error: `No task found matching "${args.task_name}"` }),
            action: { tool: 'breakdown_task', args, emoji: '❌', summary: `Task not found: "${args.task_name}"`, success: false },
          };
        }
        const data = await api('/api/v1/ai/breakdown', 'POST', {
          taskId: task.id,
          save: args.save !== false,
        });
        const count = data.subtasks?.length ?? 0;
        return {
          result: JSON.stringify({ success: true, task: task.title, subtasks: data.subtasks }),
          action: { tool: 'breakdown_task', args, emoji: '🧠', summary: `Generated ${count} subtasks for "${task.title}"`, success: true, data },
        };
      }

      // ── List Tasks ────────────────────────────────────────────────────────
      case 'list_tasks': {
        let tasks = ctx.tasks;
        if (args.status) tasks = tasks.filter(t => t.status === args.status);
        if (args.priority) tasks = tasks.filter(t => t.priority === args.priority);
        const limit = Number(args.limit ?? 5);
        const slice = tasks.slice(0, limit);
        return {
          result: JSON.stringify({ tasks: slice.map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, deadline: t.deadline })), total: tasks.length }),
          action: { tool: 'list_tasks', args, emoji: '📋', summary: `Found ${tasks.length} tasks`, success: true },
        };
      }

      // ── Create Reminder ───────────────────────────────────────────────────
      case 'create_reminder': {
        const data = await api('/api/v1/reminders', 'POST', {
          title: args.title,
          dueDate: args.due_date,
          description: args.description,
        });
        return {
          result: JSON.stringify({ success: true, id: data.id }),
          action: { tool: 'create_reminder', args, emoji: '🔔', summary: `Reminder set: "${args.title}"`, success: true },
        };
      }

      // ── Journal Entry ─────────────────────────────────────────────────────
      case 'add_journal_entry': {
        const task = findByName(ctx.tasks, String(args.task_name));
        if (!task) {
          return {
            result: JSON.stringify({ success: false, error: `No task found matching "${args.task_name}"` }),
            action: { tool: 'add_journal_entry', args, emoji: '❌', summary: `Task not found: "${args.task_name}"`, success: false },
          };
        }
        await api(`/api/v1/tasks/${task.id}/journal`, 'POST', { text: args.text });
        return {
          result: JSON.stringify({ success: true, task: task.title }),
          action: { tool: 'add_journal_entry', args, emoji: '📝', summary: `Journal entry added to "${task.title}"`, success: true },
        };
      }

      // ── Brave Search ──────────────────────────────────────────────────────
      case 'brave_search': {
        const query = String(args.query);
        const data = await api(`/api/v1/search?q=${encodeURIComponent(query)}`);
        if (data.error) {
          return {
            result: JSON.stringify({ success: false, error: data.error }),
            action: { tool: 'brave_search', args, emoji: '🔍', summary: `Failed search: "${query}"`, success: false },
          };
        }
        const resultsSummary = data.results?.slice(0, 4).map((r: any, i: number) =>
          `[${i + 1}] "${r.title}" - ${r.snippet} (URL: ${r.link})`
        ).join('\n\n') || 'No search results found.';
        return {
          result: JSON.stringify({ success: true, results: resultsSummary }),
          action: { tool: 'brave_search', args, emoji: '🔍', summary: `Searched web for "${query}"`, success: true, data },
        };
      }

      // ── Update Task ───────────────────────────────────────────────────────
      case 'update_task': {
        const task = findByName(ctx.tasks, String(args.task_name));
        if (!task) {
          return {
            result: JSON.stringify({ success: false, error: `No task found matching "${args.task_name}"` }),
            action: { tool: 'update_task', args, emoji: '❌', summary: `Task not found: "${args.task_name}"`, success: false },
          };
        }
        const patchBody: Record<string, unknown> = {};
        if (args.title) patchBody.title = args.title;
        if (args.priority) patchBody.priority = args.priority;
        if (args.status) patchBody.status = args.status;
        if (args.deadline !== undefined) patchBody.deadline = args.deadline;
        if (args.tags) patchBody.tags = args.tags;
        if (args.estimatedDuration) patchBody.estimatedDuration = args.estimatedDuration;
        await api(`/api/v1/tasks/${task.id}`, 'PATCH', patchBody);
        const changes = Object.keys(patchBody).map(k => `${k}: ${patchBody[k]}`).join(', ');
        return {
          result: JSON.stringify({ success: true, task: task.title, changes }),
          action: { tool: 'update_task', args, emoji: '✏️', summary: `Updated "${task.title}": ${changes}`, success: true },
        };
      }

      // ── Delete Task ───────────────────────────────────────────────────────
      case 'delete_task': {
        const task = findByName(ctx.tasks, String(args.task_name));
        if (!task) {
          return {
            result: JSON.stringify({ success: false, error: `No task found matching "${args.task_name}"` }),
            action: { tool: 'delete_task', args, emoji: '❌', summary: `Task not found: "${args.task_name}"`, success: false },
          };
        }
        await api(`/api/v1/tasks/${task.id}`, 'DELETE');
        return {
          result: JSON.stringify({ success: true, deleted: task.title }),
          action: { tool: 'delete_task', args, emoji: '🗑️', summary: `Deleted task: "${task.title}"`, success: true },
        };
      }

      // ── List Habits ───────────────────────────────────────────────────────
      case 'list_habits': {
        const today = new Date().toDateString();
        let habits = ctx.habits.map(h => {
          const checkedToday = h.completedDates?.some(
            (d: any) => new Date(d?.toDate ? d.toDate() : d).toDateString() === today
          ) ?? false;
          return { id: h.id, name: h.title, streak: h.streak, frequency: h.frequency, checkedToday };
        });
        if (args.checked_today === true) habits = habits.filter(h => h.checkedToday);
        if (args.checked_today === false) habits = habits.filter(h => !h.checkedToday);
        return {
          result: JSON.stringify({ habits, total: habits.length }),
          action: { tool: 'list_habits', args, emoji: '🔥', summary: `Found ${habits.length} habits`, success: true },
        };
      }

      // ── List Goals ────────────────────────────────────────────────────────
      case 'list_goals': {
        let goals = ctx.goals.map(g => ({
          id: g.id,
          title: g.title,
          progress: g.progress,
          targetDate: g.targetDate,
          description: g.description,
        }));
        if (typeof args.min_progress === 'number') {
          goals = goals.filter(g => (g.progress ?? 0) >= (args.min_progress as number));
        }
        return {
          result: JSON.stringify({ goals, total: goals.length }),
          action: { tool: 'list_goals', args, emoji: '🎯', summary: `Found ${goals.length} active goals`, success: true },
        };
      }

      // ── Update Goal Progress ──────────────────────────────────────────────
      case 'update_goal_progress': {
        const goal = ctx.goals.find(g => {
          const lower = String(args.goal_name).toLowerCase();
          return g.title.toLowerCase().includes(lower);
        });
        if (!goal) {
          return {
            result: JSON.stringify({ success: false, error: `No goal found matching "${args.goal_name}"` }),
            action: { tool: 'update_goal_progress', args, emoji: '❌', summary: `Goal not found: "${args.goal_name}"`, success: false },
          };
        }
        const progress = Math.min(100, Math.max(0, Number(args.progress)));
        await api(`/api/v1/goals/${goal.id}/progress`, 'POST', { progress });
        return {
          result: JSON.stringify({ success: true, goal: goal.title, progress }),
          action: { tool: 'update_goal_progress', args, emoji: '📈', summary: `"${goal.title}" progress set to ${progress}%`, success: true },
        };
      }

      // ── Create Habit ───────────────────────────────────────────────────────
      case 'create_habit': {
        const data = await api('/api/v1/habits', 'POST', {
          title: args.title,
          description: args.description,
          frequency: args.frequency ?? 'daily',
        });
        return {
          result: JSON.stringify({ success: true, id: data.id, title: args.title }),
          action: { tool: 'create_habit', args, emoji: '🔥', summary: `Created habit: "${args.title}"`, success: true },
        };
      }

      // ── Update Habit ───────────────────────────────────────────────────────
      case 'update_habit': {
        const habit = findByName(ctx.habits, String(args.habit_name));
        if (!habit) {
          return {
            result: JSON.stringify({ success: false, error: `No habit found matching "${args.habit_name}"` }),
            action: { tool: 'update_habit', args, emoji: '❌', summary: `Habit not found: "${args.habit_name}"`, success: false },
          };
        }
        const patch: Record<string, unknown> = {};
        if (args.title) patch.title = args.title;
        if (args.description) patch.description = args.description;
        if (args.frequency) patch.frequency = args.frequency;
        await api(`/api/v1/habits/${habit.id}`, 'PATCH', patch);
        return {
          result: JSON.stringify({ success: true, habit: habit.title }),
          action: { tool: 'update_habit', args, emoji: '✏️', summary: `Updated habit: "${habit.title}"`, success: true },
        };
      }

      // ── Create Goal ───────────────────────────────────────────────────────
      case 'create_goal': {
        const goalBody: Record<string, unknown> = {
          title: args.title,
          description: args.description ?? '',
          progress: 0,
          milestones: [],
        };
        if (args.targetDate) goalBody.targetDate = new Date(String(args.targetDate));
        if (args.emoji) goalBody.emoji = args.emoji;
        if (args.color) goalBody.color = args.color;
        const data = await api('/api/v1/goals', 'POST', goalBody);
        return {
          result: JSON.stringify({ success: true, id: data.id, title: args.title }),
          action: { tool: 'create_goal', args, emoji: '🎯', summary: `Created goal: "${args.title}"`, success: true },
        };
      }

      // ── List Reminders ────────────────────────────────────────────────────
      case 'list_reminders': {
        const data = await api('/api/v1/reminders');
        let reminders = (data.reminders ?? data ?? []) as Array<{
          id: string; title: string; description?: string; dueDate: any; completed: boolean;
        }>;
        if (args.only_pending !== false) reminders = reminders.filter(r => !r.completed);
        const limit = Number(args.limit ?? 5);
        const slice = reminders.slice(0, limit);
        return {
          result: JSON.stringify({ reminders: slice.map(r => ({
            id: r.id,
            title: r.title,
            dueDate: r.dueDate,
            completed: r.completed,
          })), total: reminders.length }),
          action: { tool: 'list_reminders', args, emoji: '🔔', summary: `Found ${reminders.length} reminders`, success: true },
        };
      }

      // ── Sleep Summary ────────────────────────────────────────────────────
      case 'get_sleep_summary': {
        const days = Number(args.days ?? 7);
        const cutoff = new Date(Date.now() - days * 86400000);
        const recent = ctx.sleepEntries
          .filter(e => new Date(e.date) >= cutoff)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (recent.length === 0) {
          return {
            result: JSON.stringify({ success: false, message: 'No sleep data in this period' }),
            action: { tool: 'get_sleep_summary', args, emoji: '😴', summary: 'No sleep data found', success: false },
          };
        }
        const avgHrs = Math.round((recent.reduce((s, e) => s + e.durationMins, 0) / recent.length / 60) * 10) / 10;
        const avgQuality = Math.round((recent.reduce((s, e) => s + e.quality, 0) / recent.length) * 10) / 10;
        const latest = recent[0];
        return {
          result: JSON.stringify({
            entries: recent.slice(0, 5).map(e => ({
              date: e.date,
              hours: Math.round(e.durationMins / 60 * 10) / 10,
              quality: e.quality,
              mood: e.mood,
            })),
            averageHours: avgHrs,
            averageQuality: avgQuality,
            lastSleep: { hours: Math.round(latest.durationMins / 60 * 10) / 10, quality: latest.quality, mood: latest.mood },
          }),
          action: { tool: 'get_sleep_summary', args, emoji: '😴', summary: `${days}-day sleep avg: ${avgHrs}h, quality ${avgQuality}/5`, success: true },
        };
      }

      // ── Log Sleep ───────────────────────────────────────────────────────────
      case 'log_sleep': {
        const bedtime = new Date(String(args.bedtime));
        const wakeTime = new Date(String(args.wake_time));
        const durationMins = Math.round((wakeTime.getTime() - bedtime.getTime()) / 60000);
        const data = await api('/api/v1/sleep', 'POST', {
          bedtime,
          wakeTime,
          durationMins,
          quality: args.quality,
          mood: args.mood,
          notes: args.notes,
          date: wakeTime,
        });
        const hrs = Math.round(durationMins / 60 * 10) / 10;
        return {
          result: JSON.stringify({ success: true, hours: hrs, quality: args.quality }),
          action: { tool: 'log_sleep', args, emoji: '🌙', summary: `Logged ${hrs}h sleep, quality ${args.quality}/5`, success: true },
        };
      }

      default:
        return {
          result: JSON.stringify({ error: `Unknown tool: ${toolName}` }),
          action: { tool: toolName, args, emoji: '❓', summary: `Unknown tool: ${toolName}`, success: false },
        };
    }
  } catch (e: any) {
    return {
      result: JSON.stringify({ error: e.message }),
      action: { tool: toolName, args, emoji: '❌', summary: `Error: ${e.message}`, success: false },
    };
  }
}
