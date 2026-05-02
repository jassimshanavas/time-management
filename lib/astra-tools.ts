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
