'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addDays, format, formatDistanceToNow, subDays } from 'date-fns';
import {
  ArrowUpRight,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Clock,
  Edit2,
  FileText,
  Layers3,
  Lock,
  Maximize2,
  MessageSquare,
  Minimize2,
  MonitorUp,
  MoreHorizontal,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Square,
  Trash2,
  TrendingUp,
  Unlock,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/main-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import { ProjectBadge } from '@/components/projects/project-badge';
import { ProjectSelector } from '@/components/projects/project-selector';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import type { Task, TimeEntry, LiveUpdateNode, JournalThread } from '@/types';
import { CompletedOutliner } from '@/components/time-tracking/completed-outliner';
import { MarkdownNotesRenderer } from '@/components/time-tracking/markdown-notes-renderer';
import { getReflectionsOnly, compileUpdatesToMarkdown } from '@/components/time-tracking/completed-outliner-helpers';

const getElapsedTime = (startTime: Date, currentTime: Date) => {
  const elapsed = Math.max(
    0,
    Math.floor((currentTime.getTime() - new Date(startTime).getTime()) / 1000)
  );
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const PRESET_CATEGORIES = [
  'Work',
  'Deep Work',
  'Meetings',
  'Research',
  'Personal',
  'Planning',
];

const ROUTINE_TEMPLATES = [
  { name: 'Focus Session', duration: 90, category: 'Deep Work', icon: Zap },
  { name: 'Admin Sprint', duration: 30, category: 'Work', icon: FileText },
  { name: 'Quick Catchup', duration: 15, category: 'Meetings', icon: MessageSquare },
  { name: 'Research Block', duration: 60, category: 'Research', icon: Search },
  { name: 'Break', duration: 15, category: 'Personal', icon: Coffee },
];

const THREAD_PALETTE: { color: string; hsl: string; bg: string; border: string; text: string }[] = [
  { color: 'violet', hsl: 'hsl(263,70%,58%)',  bg: 'bg-violet-500/10',  border: 'border-violet-500/25',  text: 'text-violet-400' },
  { color: 'cyan',   hsl: 'hsl(187,85%,43%)',  bg: 'bg-cyan-500/10',    border: 'border-cyan-500/25',    text: 'text-cyan-400' },
  { color: 'emerald',hsl: 'hsl(152,60%,45%)',  bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400' },
  { color: 'amber',  hsl: 'hsl(38,92%,50%)',   bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   text: 'text-amber-400' },
  { color: 'rose',   hsl: 'hsl(346,84%,61%)',  bg: 'bg-rose-500/10',    border: 'border-rose-500/25',    text: 'text-rose-400' },
  { color: 'indigo', hsl: 'hsl(234,89%,63%)',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/25',  text: 'text-indigo-400' },
];

const getThreadPalette = (color: string) =>
  THREAD_PALETTE.find((p) => p.color === color) ?? THREAD_PALETTE[0];

const toLocalDateTimeInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};



export default function TimeTrackingPage() {
  const router = useRouter();
  const {
    tasks,
    timeEntries,
    addTask,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    stopTimeEntry,
    selectedProjectId,
    projects,
    gamification,
  } = useStore();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [isTaskSearchOpen, setIsTaskSearchOpen] = useState(false);
  const [isSummaryTaskSearchOpen, setIsSummaryTaskSearchOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionSummary, setSessionSummary] = useState('');
  const [sessionCategory, setSessionCategory] = useState('');
  const [sessionProjectId, setSessionProjectId] = useState<string | undefined>('');
  const [sessionTaskId, setSessionTaskId] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [stoppingEntryId, setStoppingEntryId] = useState<string | null>(null);
  const [pendingManualEntry, setPendingManualEntry] = useState<Omit<TimeEntry, 'id'> | null>(null);
  const [editingStartTime, setEditingStartTime] = useState('');
  const [editingEndTime, setEditingEndTime] = useState('');
  const [isTimelineMapperOpen, setIsTimelineMapperOpen] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<Date>(new Date());
  const [isModalExpanded, setIsModalExpanded] = useState(false);
  const [isCreationMode, setIsCreationMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isZoomMarqueeMode, setIsZoomMarqueeMode] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    taskId: '',
    projectId: '' as string | undefined,
  });
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [manualEntry, setManualEntry] = useState({
    category: '',
    description: '',
    hours: '0',
    minutes: '30',
    projectId: '' as string | undefined,
    continueNow: false,
  });
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const captureAreaRef = useRef<HTMLDivElement | null>(null);

  // Chronos Journal State Dictionaries (keyed by TimeEntry ID for multi-timer support)
  const [activePhases, setActivePhases] = useState<Record<string, string>>({});
  const [inputTexts, setInputTexts] = useState<Record<string, string>>({});
  const [isTodoMode, setIsTodoMode] = useState<Record<string, boolean>>({});
  const [indentLevels, setIndentLevels] = useState<Record<string, number>>({});
  const [expandedJournals, setExpandedJournals] = useState<Record<string, boolean>>({});
  const [editingNodeId, setEditingNodeId] = useState<{ entryId: string; nodeId: string } | null>(null);
  const [editNodeText, setEditNodeText] = useState('');
  const [openNodeMenu, setOpenNodeMenu] = useState<string | null>(null);

  // Thread state (keyed by TimeEntry ID)
  const [activeThreadIds, setActiveThreadIds] = useState<Record<string, string>>({});
  const [threadInputNames, setThreadInputNames] = useState<Record<string, string>>({});
  const [showAddThread, setShowAddThread] = useState<Record<string, boolean>>({});
  const [viewingThreadId, setViewingThreadId] = useState<Record<string, string | 'all'>>({});
  const [viewingNotesMode, setViewingNotesMode] = useState<Record<string, 'outliner' | 'reflections'>>({});

  // Dependency/Blocker state
  const [unlockedNodes, setUnlockedNodes] = useState<Record<string, boolean>>({});
  const [isSelectingBlocker, setIsSelectingBlocker] = useState<string | null>(null);

  const handleAddLiveUpdate = async (entryId: string) => {
    const text = inputTexts[entryId]?.trim();
    if (!text) return;

    const entry = timeEntries.find((e) => e.id === entryId);
    if (!entry) return;

    const currentUpdates = entry.liveUpdates || [];
    const phase = activePhases[entryId] || 'Deep Work';
    const type = isTodoMode[entryId] ? 'todo' : 'note';
    const indent = indentLevels[entryId] || 0;

    let parentId: string | undefined = undefined;
    if (indent > 0) {
      for (let i = currentUpdates.length - 1; i >= 0; i--) {
        const node = currentUpdates[i];
        const nodeIndent = node.indent || 0;
        if (nodeIndent < indent) {
          parentId = node.id;
          break;
        }
      }
    }

    const newNode: LiveUpdateNode = {
      id: `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      timestamp: new Date(),
      elapsedTime: getElapsedTime(entry.startTime, currentTime),
      parentId,
      indent,
      completed: type === 'todo' ? false : undefined,
      phase,
      type,
      threadId: activeThreadIds[entryId] || undefined,
    };

    const nextUpdates = [...currentUpdates, newNode];
    await updateTimeEntry(entryId, { liveUpdates: nextUpdates });

    setInputTexts((prev) => ({ ...prev, [entryId]: '' }));
    setIndentLevels((prev) => ({ ...prev, [entryId]: 0 }));
  };

  const handleToggleUpdateCompletion = async (entryId: string, nodeId: string) => {
    const entry = timeEntries.find((e) => e.id === entryId);
    if (!entry || !entry.liveUpdates) return;

    const nodeToToggle = entry.liveUpdates.find((n) => n.id === nodeId);
    if (!nodeToToggle) return;

    const isNowCompleted = !nodeToToggle.completed;

    let nextUpdates = entry.liveUpdates.map((node) => {
      if (node.id === nodeId) {
        return { ...node, completed: !node.completed };
      }
      return node;
    });

    if (isNowCompleted) {
      // Find any nodes blocked by this node
      const blockedNodes = entry.liveUpdates.filter((n) => n.blockedBy === nodeId);
      if (blockedNodes.length > 0) {
        // Trigger local unlock animation
        blockedNodes.forEach((n) => {
          setUnlockedNodes((prev) => ({ ...prev, [n.id]: true }));
          setTimeout(() => {
            setUnlockedNodes((prev) => {
              const next = { ...prev };
              delete next[n.id];
              return next;
            });
          }, 1500);
        });

        // Clear blockedBy database field
        nextUpdates = nextUpdates.map((node) => {
          if (node.blockedBy === nodeId) {
            const { blockedBy, ...rest } = node;
            return rest as LiveUpdateNode;
          }
          return node;
        });
      }
    }

    await updateTimeEntry(entryId, { liveUpdates: nextUpdates });
  };

  const handleDeleteLiveUpdate = async (entryId: string, nodeId: string) => {
    const entry = timeEntries.find((e) => e.id === entryId);
    if (!entry || !entry.liveUpdates) return;

    const nodesToKeep = entry.liveUpdates
      .filter((node) => node.id !== nodeId && node.parentId !== nodeId)
      .map((node) => {
        if (node.blockedBy === nodeId) {
          const { blockedBy, ...rest } = node;
          return rest as LiveUpdateNode;
        }
        return node;
      });

    await updateTimeEntry(entryId, { liveUpdates: nodesToKeep });
  };

  const handleIndentNode = async (entryId: string, nodeId: string, direction: 'indent' | 'outdent') => {
    const entry = timeEntries.find((e) => e.id === entryId);
    if (!entry || !entry.liveUpdates) return;

    const nextUpdates = entry.liveUpdates.map((node) => {
      if (node.id === nodeId) {
        const currentIndent = node.indent || 0;
        const newIndent =
          direction === 'indent'
            ? Math.min(2, currentIndent + 1)
            : Math.max(0, currentIndent - 1);
        return { ...node, indent: newIndent };
      }
      return node;
    });

    await updateTimeEntry(entryId, { liveUpdates: nextUpdates });
  };

  const handleStartEditNode = (entryId: string, nodeId: string, currentText: string) => {
    setEditingNodeId({ entryId, nodeId });
    setEditNodeText(currentText);
  };

  const handleSaveEditNode = async () => {
    if (!editingNodeId) return;
    const { entryId, nodeId } = editingNodeId;
    const entry = timeEntries.find((e) => e.id === entryId);
    if (!entry || !entry.liveUpdates) return;

    const text = editNodeText.trim();
    if (!text) {
      setEditingNodeId(null);
      setEditNodeText('');
      return;
    }

    const nextUpdates = entry.liveUpdates.map((node) => {
      if (node.id === nodeId) return { ...node, text };
      return node;
    });

    await updateTimeEntry(entryId, { liveUpdates: nextUpdates });
    setEditingNodeId(null);
    setEditNodeText('');
  };

  const handleCancelEditNode = () => {
    setEditingNodeId(null);
    setEditNodeText('');
  };

  // ─── Thread Handlers ───────────────────────────────────────────────────────

  const handleAddThread = async (entryId: string) => {
    const name = threadInputNames[entryId]?.trim();
    if (!name) return;

    const entry = timeEntries.find((e) => e.id === entryId);
    if (!entry) return;

    const existingThreads = entry.threads || [];
    const colorIndex = existingThreads.length % THREAD_PALETTE.length;
    const newThread: JournalThread = {
      id: `thread-${Date.now()}`,
      name,
      color: THREAD_PALETTE[colorIndex].color,
      status: 'active',
      createdAt: getElapsedTime(entry.startTime, currentTime),
    };

    await updateTimeEntry(entryId, { threads: [...existingThreads, newThread] });
    setActiveThreadIds((prev) => ({ ...prev, [entryId]: newThread.id }));
    setViewingThreadId((prev) => ({ ...prev, [entryId]: newThread.id }));
    setThreadInputNames((prev) => ({ ...prev, [entryId]: '' }));
    setShowAddThread((prev) => ({ ...prev, [entryId]: false }));
  };

  const handleDeleteThread = async (entryId: string, threadId: string) => {
    const entry = timeEntries.find((e) => e.id === entryId);
    if (!entry) return;

    const nextThreads = (entry.threads || []).filter((t) => t.id !== threadId);
    // Un-assign nodes that belonged to the deleted thread
    const nextUpdates = (entry.liveUpdates || []).map((node) =>
      node.threadId === threadId ? { ...node, threadId: undefined } : node
    );

    await updateTimeEntry(entryId, { threads: nextThreads, liveUpdates: nextUpdates });

    if (activeThreadIds[entryId] === threadId) {
      setActiveThreadIds((prev) => ({ ...prev, [entryId]: '' }));
    }
    if (viewingThreadId[entryId] === threadId) {
      setViewingThreadId((prev) => ({ ...prev, [entryId]: 'all' }));
    }
  };

  const handleCycleThreadStatus = async (entryId: string, threadId: string) => {
    const entry = timeEntries.find((e) => e.id === entryId);
    if (!entry) return;
    const cycle: JournalThread['status'][] = ['active', 'paused', 'blocked'];
    const nextThreads = (entry.threads || []).map((t) => {
      if (t.id !== threadId) return t;
      const idx = cycle.indexOf(t.status);
      return { ...t, status: cycle[(idx + 1) % cycle.length] };
    });
    await updateTimeEntry(entryId, { threads: nextThreads });
  };

  const handleMoveNodeToThread = async (entryId: string, nodeId: string, threadId: string | undefined) => {
    const entry = timeEntries.find((e) => e.id === entryId);
    if (!entry || !entry.liveUpdates) return;
    const nextUpdates = entry.liveUpdates.map((node) =>
      node.id === nodeId ? { ...node, threadId } : node
    );
    await updateTimeEntry(entryId, { liveUpdates: nextUpdates });
    setOpenNodeMenu(null);
  };

  const handleToggleNodeType = async (entryId: string, nodeId: string) => {
    const entry = timeEntries.find((e) => e.id === entryId);
    if (!entry || !entry.liveUpdates) return;

    const nextUpdates = entry.liveUpdates.map((node) => {
      if (node.id === nodeId) {
        const nextType: 'todo' | 'note' = node.type === 'todo' ? 'note' : 'todo';
        return {
          ...node,
          type: nextType,
          completed: nextType === 'todo' ? false : undefined,
        };
      }
      return node;
    });

    await updateTimeEntry(entryId, { liveUpdates: nextUpdates });
  };

  const wouldCreateCircularDependency = (
    updates: LiveUpdateNode[],
    nodeId: string,
    potentialBlockerId: string
  ): boolean => {
    let currentId: string | undefined = potentialBlockerId;
    const visited = new Set<string>();
    while (currentId) {
      if (currentId === nodeId) return true;
      if (visited.has(currentId)) return true;
      visited.add(currentId);
      const nextNode = updates.find((n) => n.id === currentId);
      currentId = nextNode?.blockedBy;
    }
    return false;
  };

  const handleSetBlocker = async (entryId: string, nodeId: string, blockerNodeId: string | null) => {
    const entry = timeEntries.find((e) => e.id === entryId);
    if (!entry || !entry.liveUpdates) return;

    const nextUpdates = entry.liveUpdates.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          blockedBy: blockerNodeId || undefined,
        };
      }
      return node;
    });

    await updateTimeEntry(entryId, { liveUpdates: nextUpdates });
  };



  useEffect(() => {
    const timerId = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const runningEntries = useMemo(
    () =>
      [...timeEntries]
        .filter((entry) => entry.isRunning)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [timeEntries]
  );

  const startModalSearchTasks = useMemo(() => {
    const selectedProjectTasks = tasks.filter((task) =>
      formData.projectId ? task.projectId === formData.projectId : !task.projectId
    );

    const otherTasks = tasks.filter((task) =>
      formData.projectId ? task.projectId !== formData.projectId : Boolean(task.projectId)
    );

    return [...selectedProjectTasks, ...otherTasks];
  }, [formData.projectId, tasks]);

  const handleStartTimer = (e: React.FormEvent) => {
    e.preventDefault();

    const newEntry: Omit<TimeEntry, 'id'> = {
      category: formData.category,
      description: formData.description,
      taskId: formData.taskId || undefined,
      projectId: formData.projectId || undefined,
      startTime: new Date(),
      isRunning: true,
    };

    void addTimeEntry(newEntry);
    setFormData({ category: '', description: '', taskId: '', projectId: '' });
    setNewTaskTitle('');
    setIsTaskSearchOpen(false);
    setIsDialogOpen(false);
  };

  const handleCreateTaskForSelectedProject = async () => {
    const title = newTaskTitle.trim();
    if (!title) return;

    const newTask: Omit<Task, 'id' | 'userId'> = {
      title,
      description: '',
      status: 'todo',
      priority: 'medium',
      projectId: formData.projectId || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await addTask(newTask);
    setNewTaskTitle('');
  };

  const handleStopTimer = (id: string) => {
    const entry = timeEntries.find((item) => item.id === id);
    setEditingEntryId(null);
    setStoppingEntryId(id);

    setSessionSummary(getReflectionsOnly(entry?.notes || ''));
    setSessionCategory(entry?.category || '');
    setSessionProjectId(entry?.projectId || '');
    setSessionTaskId(entry?.taskId || '');
    setIsSummaryDialogOpen(true);
  };

  const handleConfirmStop = async () => {
    if (editingEntryId) {
      const currentEntry = timeEntries.find((entry) => entry.id === editingEntryId);
      if (!currentEntry) {
        setEditingEntryId(null);
        setSessionSummary('');
        setSessionCategory('');
        setSessionProjectId('');
        setSessionTaskId('');
        setEditingStartTime('');
        setEditingEndTime('');
        setIsSummaryDialogOpen(false);
        return;
      }

      const nextStart = editingStartTime
        ? new Date(editingStartTime)
        : new Date(currentEntry.startTime);
      const nextEnd = editingEndTime
        ? new Date(editingEndTime)
        : currentEntry.endTime
          ? new Date(currentEntry.endTime)
          : undefined;

      const nextDuration = nextEnd
        ? Math.max(0, Math.floor((nextEnd.getTime() - nextStart.getTime()) / 60000))
        : undefined;

      // Merge reflections with compiled session log
      const compiledLog = currentEntry.liveUpdates && currentEntry.liveUpdates.length > 0
        ? compileUpdatesToMarkdown(currentEntry.liveUpdates, currentEntry.threads)
        : null;
      const mergedNotes = sessionSummary && compiledLog
        ? `${sessionSummary}\n\n${compiledLog}`
        : sessionSummary || compiledLog || '';

      await updateTimeEntry(editingEntryId, {
        notes: mergedNotes,
        category: sessionCategory || currentEntry.category,
        taskId: sessionTaskId || undefined,
        projectId: sessionProjectId || undefined,
        startTime: nextStart,
        endTime: nextEnd,
        duration: nextDuration,
      });
      setEditingEntryId(null);
      setSessionSummary('');
      setSessionCategory('');
      setSessionProjectId('');
      setSessionTaskId('');
      setEditingStartTime('');
      setEditingEndTime('');
      setIsSummaryDialogOpen(false);
      return;
    }

    if (pendingManualEntry) {
      await addTimeEntry({
        ...pendingManualEntry,
        notes: sessionSummary || undefined,
        category: sessionCategory || pendingManualEntry.category,
        taskId: sessionTaskId || undefined,
        projectId: sessionProjectId || undefined,
      });
      setPendingManualEntry(null);
      setSessionSummary('');
      setSessionCategory('');
      setSessionProjectId('');
      setSessionTaskId('');
      setEditingStartTime('');
      setEditingEndTime('');
      setIsSummaryDialogOpen(false);
      setManualEntry((prev) => ({
        ...prev,
        description: '',
        hours: '0',
        minutes: '30',
        continueNow: false,
      }));
      return;
    }

    if (stoppingEntryId) {
      const stoppingEntry = timeEntries.find((entry) => entry.id === stoppingEntryId);
      // Merge user reflections with compiled session log on stop
      const compiledLog = stoppingEntry?.liveUpdates && stoppingEntry.liveUpdates.length > 0
        ? compileUpdatesToMarkdown(stoppingEntry.liveUpdates, stoppingEntry.threads)
        : null;
      const finalNotes = sessionSummary && compiledLog
        ? `${sessionSummary}\n\n${compiledLog}`
        : sessionSummary || compiledLog || '';
      await stopTimeEntry(stoppingEntryId, finalNotes);
      await updateTimeEntry(stoppingEntryId, {
        category: sessionCategory || stoppingEntry?.category,
        taskId: sessionTaskId || undefined,
        projectId: sessionProjectId || undefined,
      });
      setStoppingEntryId(null);
      setSessionSummary('');
      setSessionCategory('');
      setSessionProjectId('');
      setSessionTaskId('');
      setEditingStartTime('');
      setEditingEndTime('');
      setIsSummaryDialogOpen(false);
    }
  };

  const handleEditNotes = (entry: TimeEntry) => {
    setPendingManualEntry(null);
    setStoppingEntryId(null);
    setEditingEntryId(entry.id);
    // Prefill only the user's reflections, not the compiled session log
    setSessionSummary(getReflectionsOnly(entry.notes || ''));
    setSessionCategory(entry.category || '');
    setSessionProjectId(entry.projectId || '');
    setSessionTaskId(entry.taskId || '');
    setEditingStartTime(toLocalDateTimeInputValue(new Date(entry.startTime)));
    setEditingEndTime(entry.endTime ? toLocalDateTimeInputValue(new Date(entry.endTime)) : '');
    setIsSummaryDialogOpen(true);
  };

  const handleLogManualEntry = (e: React.FormEvent) => {
    e.preventDefault();

    const hours = parseInt(manualEntry.hours, 10) || 0;
    const minutes = parseInt(manualEntry.minutes, 10) || 0;
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes <= 0) {
      return;
    }

    const now = new Date();
    const startTime = new Date(now.getTime() - totalMinutes * 60000);
    const timeString = format(startTime, 'h:mm a');
    const baseDescription = manualEntry.description.trim() || 'Manual Calibration';
    const finalDescription = `${baseDescription} (Started at ${timeString})`;
    const shouldContinueNow = manualEntry.continueNow;

    setEditingEntryId(null);
    setStoppingEntryId(null);
    setPendingManualEntry({
      category: manualEntry.category.trim() || 'General',
      description: finalDescription,
      taskId: undefined,
      projectId: manualEntry.projectId || undefined,
      startTime,
      endTime: shouldContinueNow ? undefined : now,
      duration: shouldContinueNow ? undefined : totalMinutes,
      isRunning: shouldContinueNow,
    });
    setSessionSummary(manualEntry.description.trim() || '');
    setSessionCategory(manualEntry.category.trim() || 'General');
    setIsSummaryDialogOpen(true);
  };

  const findTaskTitle = useCallback(
    (taskId?: string) => (taskId ? tasks.find((task) => task.id === taskId)?.title : undefined),
    [tasks]
  );

  const selectedDayEntries = useMemo(() => {
    return [...timeEntries]
      .filter((entry) => {
        const entryDate = new Date(entry.startTime);
        return entryDate.toDateString() === selectedDayDate.toDateString();
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [selectedDayDate, timeEntries]);

  const timelineTracks = useMemo(() => {
    const trackMap = new Map<string, { key: string; label: string; entries: TimeEntry[] }>();

    selectedDayEntries.forEach((entry) => {
      const taskLabel = entry.taskId ? findTaskTitle(entry.taskId) : undefined;
      const label = taskLabel || entry.category || 'General';
      const key = entry.taskId ? `task:${entry.taskId}` : `category:${label}`;

      if (!trackMap.has(key)) {
        trackMap.set(key, { key, label, entries: [] });
      }

      trackMap.get(key)?.entries.push(entry);
    });

    return Array.from(trackMap.values()).sort((a, b) => {
      const firstA = a.entries[0] ? new Date(a.entries[0].startTime).getTime() : 0;
      const firstB = b.entries[0] ? new Date(b.entries[0].startTime).getTime() : 0;
      return firstA - firstB;
    });
  }, [selectedDayEntries, findTaskTitle]);

  const getEntryDuration = (entry: TimeEntry) => {
    if (entry.duration !== undefined) {
      return entry.duration;
    }

    const start = new Date(entry.startTime);
    const effectiveEnd = entry.endTime ? new Date(entry.endTime) : currentTime;
    return Math.max(0, Math.floor((effectiveEnd.getTime() - start.getTime()) / 60000));
  };

  const getCategoryColor = (category?: string) => {
    if (!category) return 'hsl(var(--primary))';

    const categories = [
      { name: 'Work', color: 'hsl(221, 83%, 53%)' },
      { name: 'Deep Work', color: 'hsl(262, 83%, 58%)' },
      { name: 'Meetings', color: 'hsl(142, 71%, 45%)' },
      { name: 'Research', color: 'hsl(32, 95%, 44%)' },
      { name: 'Personal', color: 'hsl(346, 84%, 61%)' },
      { name: 'Planning', color: 'hsl(173, 80%, 40%)' },
    ];

    const found = categories.find((item) => item.name.toLowerCase() === category.toLowerCase());
    if (found) return found.color;

    let hash = 0;
    for (let i = 0; i < category.length; i += 1) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 65%, 55%)`;
  };

  const heatmapGradient = useMemo(() => {
    const scores = new Array(24).fill(0);
    timeEntries.filter((entry) => !entry.isRunning).forEach((entry) => {
      const start = new Date(entry.startTime);
      const end = entry.endTime ? new Date(entry.endTime) : null;
      if (!end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

      const startHour = start.getHours() + start.getMinutes() / 60;
      const endHour = end.getHours() + end.getMinutes() / 60;

      for (let hour = 0; hour < 24; hour += 1) {
        const overlap = Math.max(0, Math.min(hour + 1, endHour) - Math.max(hour, startHour));
        scores[hour] += overlap;
      }
    });

    const max = Math.max(...scores, 1);
    const gradientParts = scores.map((score, index) => {
      const pos = (index / 24) * 100;
      return `hsl(263 70% 50% / ${(score / max) * 0.5}) ${pos}%`;
    });
    gradientParts.push(`hsl(263 70% 50% / ${(scores[23] / max) * 0.5}) 100%`);

    return `linear-gradient(to right, ${gradientParts.join(', ')})`;
  }, [timeEntries]);

  const buildManualEntryFromRange = (startHour: number, endHour: number) => {
    const start = new Date(selectedDayDate);
    start.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);

    const end = new Date(selectedDayDate);
    end.setHours(Math.floor(endHour), Math.round((endHour % 1) * 60), 0, 0);
    const now = new Date();
    const isToday = selectedDayDate.toDateString() === now.toDateString();
    const shouldContinueNow = isToday && start.getTime() < now.getTime() && end.getTime() > now.getTime();

    const duration = Math.round((end.getTime() - start.getTime()) / 60000);
    if (duration < 1) {
      return;
    }

    const timeString = format(start, 'h:mm a');
    const description = manualEntry.description.trim()
      ? `${manualEntry.description.trim()} (Started at ${timeString})`
      : `Manual Calibration (Started at ${timeString})`;

    setEditingEntryId(null);
    setStoppingEntryId(null);
    setPendingManualEntry({
      category: manualEntry.category.trim() || 'General',
      description,
      taskId: undefined,
      projectId: manualEntry.projectId || undefined,
      startTime: start,
      endTime: shouldContinueNow ? undefined : end,
      duration: shouldContinueNow ? undefined : duration,
      isRunning: shouldContinueNow,
    });
    setSessionSummary(manualEntry.description.trim() || '');
    setSessionCategory(manualEntry.category.trim() || 'General');
    setSelectionRange(null);
    setIsSelecting(false);
    setIsSummaryDialogOpen(true);
  };

  const handleDropTemplate = (templateName: string, hour: number) => {
    const template = ROUTINE_TEMPLATES.find((item) => item.name === templateName);
    if (!template) return;

    const start = new Date(selectedDayDate);
    start.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
    const end = new Date(start.getTime() + template.duration * 60000);

    setPendingManualEntry({
      category: template.category,
      description: template.name,
      taskId: undefined,
      projectId: manualEntry.projectId || undefined,
      startTime: start,
      endTime: end,
      duration: template.duration,
      isRunning: false,
    });
    setSessionSummary('');
    setSessionCategory(template.category);
    setSelectionRange(null);
    setIsSummaryDialogOpen(true);
  };

  const handleCapture = async () => {
    if (!captureAreaRef.current) return;

    setIsCapturing(true);
    const toastId = toast.loading('Generating your time map...');

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const dataUrl = await htmlToImage.toPng(captureAreaRef.current, {
        cacheBust: true,
        backgroundColor: 'transparent',
        pixelRatio: 2,
        filter: (node) => !((node as HTMLElement).classList?.contains('no-capture')),
      });

      const link = document.createElement('a');
      link.download = `timeflow-summary-${format(selectedDayDate, 'yyyy-MM-dd')}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Summary ready to share', { id: toastId });
    } catch (error) {
      console.error('Capture failed:', error);
      toast.error('Failed to generate summary', { id: toastId });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleNavigateToTask = (taskId: string) => {
    router.push(`/tasks/${taskId}?fromView=time-tracking`);
  };

  const todayEntries = timeEntries.filter((entry) => {
    const entryDate = new Date(entry.startTime);
    const today = new Date();
    return entryDate.toDateString() === today.toDateString();
  });

  const totalTimeToday = todayEntries.reduce((acc, entry) => {
    if (entry.duration) {
      return acc + entry.duration;
    }

    if (entry.isRunning) {
      return acc + Math.floor((currentTime.getTime() - new Date(entry.startTime).getTime()) / 60000);
    }

    return acc;
  }, 0);

  const categorySummary = timeEntries.reduce((acc, entry) => {
    const duration = entry.duration
      ?? (entry.isRunning
        ? Math.floor((currentTime.getTime() - new Date(entry.startTime).getTime()) / 60000)
        : 0);

    if (duration > 0) {
      acc[entry.category] = (acc[entry.category] || 0) + duration;
    }

    return acc;
  }, {} as Record<string, number>);

  const filteredTimeEntries = timeEntries.filter((entry) => {
    if (selectedProjectId !== null) {
      if (selectedProjectId === 'personal') {
        if (entry.projectId) return false;
      } else if (entry.projectId !== selectedProjectId) {
        return false;
      }
    }

    return true;
  });

  const sortedFilteredEntries = useMemo(
    () =>
      [...filteredTimeEntries].sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      ),
    [filteredTimeEntries]
  );

  const activeEntryBeingStopped = stoppingEntryId
    ? runningEntries.find((entry) => entry.id === stoppingEntryId)
    : null;
  const activeEntryBeingEdited = editingEntryId
    ? timeEntries.find((entry) => entry.id === editingEntryId) || null
    : null;
  const previewEntry = activeEntryBeingEdited || activeEntryBeingStopped;
  const summarySearchTasks = useMemo(() => {
    const selectedProjectTasks = tasks.filter((task) =>
      sessionProjectId ? task.projectId === sessionProjectId : !task.projectId
    );

    const otherTasks = tasks.filter((task) =>
      sessionProjectId ? task.projectId !== sessionProjectId : Boolean(task.projectId)
    );

    return [...selectedProjectTasks, ...otherTasks];
  }, [sessionProjectId, tasks]);
  const miniWindowSupported =
    typeof window !== 'undefined'
    && Boolean(
      (
        window as Window & {
          documentPictureInPicture?: { requestWindow: (options?: { width?: number; height?: number }) => Promise<Window> };
        }
      ).documentPictureInPicture?.requestWindow
    );

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
          <div className="space-y-8 select-none relative overflow-hidden pb-12">
            {/* Immersive Background Glow Elements */}
            <div className="absolute top-0 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full filter blur-[120px] pointer-events-none" />
            <div className="absolute top-1/3 right-1/4 translate-y-1/2 w-[400px] h-[400px] bg-purple-500/5 rounded-full filter blur-[100px] pointer-events-none" />

            {/* Redesigned Header: Temporal Cockpit Dashboard */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-primary/5 pb-6">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
                  <Badge
                    variant="outline"
                    className="h-5 border-primary/20 bg-primary/10 px-2.5 py-0 text-[9px] font-black uppercase tracking-widest text-primary shadow-[0_0_10px_rgba(99,102,241,0.1)]"
                  >
                    Chronos Temporal HUD v4.2
                  </Badge>
                </div>
                <h1 className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/50 bg-clip-text text-3xl font-black italic tracking-tight text-transparent lg:text-4xl">
                  Temporal Dashboard
                </h1>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-65">
                  Cognitive Focus Matrix & Attention Auditing
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {selectedProjectId && (
                  <Badge
                    variant="outline"
                    className="flex h-11 items-center gap-2 border-primary/10 bg-background/30 px-4 text-[10px] font-black uppercase tracking-widest shadow-sm backdrop-blur-sm"
                  >
                    <span className="text-muted-foreground opacity-50">Focus stream:</span>
                    {selectedProjectId === 'personal'
                      ? 'Personal'
                      : projects.find((project) => project.id === selectedProjectId)?.name}
                  </Badge>
                )}

                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="h-11 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/95 hover:to-primary/75 px-5 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Play className="mr-2 h-4 w-4 fill-current animate-pulse" />
                  Initiate Stream
                </Button>

                <Link href="/time-tracking/calendar">
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl border-primary/10 bg-background/25 hover:bg-muted/30 px-5 text-[10px] font-black uppercase tracking-widest hover:border-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Timeline View
                  </Button>
                </Link>
              </div>
            </div>

            {/* Redesigned HUD Grid */}
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {/* Card 1: Donut Focus Ring */}
              <Card className="relative overflow-hidden rounded-3xl border-primary/5 bg-background/25 shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:border-primary/25 group">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Audited Today</p>
                    <h3 className="font-mono text-3xl font-black tracking-tight text-foreground tabular-nums">
                      {Math.floor(totalTimeToday / 60)}h {totalTimeToday % 60}m
                    </h3>
                    <p className="text-[9px] font-bold text-muted-foreground/50">Daily Goal: 6 hours</p>
                  </div>
                  {/* Glowing SVG Donut ring */}
                  <div className="relative h-16 w-16 flex items-center justify-center shrink-0">
                    <svg className="absolute w-full h-full transform -rotate-90">
                      <circle cx="32" cy="32" r="26" className="stroke-muted/15 fill-none" strokeWidth="4" />
                      <circle 
                        cx="32" 
                        cy="32" 
                        r="26" 
                        className="stroke-primary fill-none transition-all duration-1000" 
                        strokeWidth="4" 
                        strokeDasharray={2 * Math.PI * 26}
                        strokeDashoffset={2 * Math.PI * 26 * (1 - Math.min(1, totalTimeToday / 360))}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="text-[10px] font-black tracking-tighter text-primary tabular-nums">
                      {Math.round(Math.min(100, (totalTimeToday / 360) * 100))}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Attention Distribution HUD */}
              <Card className="relative overflow-hidden rounded-3xl border-primary/5 bg-background/25 shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:border-primary/25 group">
                <CardContent className="p-6 space-y-3.5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Cognitive Breakdown</p>
                  <div className="space-y-2">
                    {Object.keys(categorySummary).length > 0 ? (
                      Object.entries(categorySummary).slice(0, 3).map(([cat, duration]) => {
                        const total = Object.values(categorySummary).reduce((a, b) => a + b, 0);
                        const pct = total > 0 ? Math.round((duration / total) * 100) : 0;
                        const catColor = getCategoryColor(cat);

                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider">
                              <span className="truncate max-w-[120px]">{cat}</span>
                              <span className="text-muted-foreground/50 tabular-nums">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
                              <div 
                                style={{ width: `${pct}%`, backgroundColor: catColor }}
                                className="h-full rounded-full transition-all duration-700"
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[10px] font-bold text-muted-foreground/40 italic py-2">No attention breakdown logged today</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Active Temporal Streams */}
              <Card className="relative overflow-hidden rounded-3xl border-primary/5 bg-background/25 shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:border-primary/25 group">
                <CardContent className="p-6 flex items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Active Matrix</p>
                    <h3 className="font-mono text-3xl font-black tracking-tight text-foreground tabular-nums">
                      {runningEntries.length} <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Session{runningEntries.length === 1 ? '' : 's'}</span>
                    </h3>
                    <p className="text-[9px] font-bold text-muted-foreground/50">
                      {runningEntries.length > 0 
                        ? `Head stream: ${runningEntries[0].category}`
                        : 'Standby mode (ready to track)'}
                    </p>
                  </div>
                  <div className="h-11 w-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Clock className={cn("h-5 w-5 text-primary", runningEntries.length > 0 && "animate-spin-slow")} />
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Gamified Focus HUD */}
              <Card className="relative overflow-hidden rounded-3xl border-primary/5 bg-background/25 shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:border-primary/25 group">
                <CardContent className="p-6 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Focus Rank</p>
                    <h3 className="font-mono text-3xl font-black tracking-tight text-foreground">
                      Rank {gamification?.level || 1}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[8px] font-black uppercase tracking-wider text-primary/75">
                        {gamification?.xp || 0} XP Audited
                      </span>
                    </div>
                  </div>
                  <div className="h-11 w-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="max-h-[90vh] max-w-xl overflow-hidden rounded-[2rem] border-primary/10 bg-background/95 p-0 shadow-2xl backdrop-blur-2xl">
                <ScrollArea className="max-h-[85vh]">
                  <div className="p-6 sm:p-8">
                    <DialogHeader className="mb-6">
                      <DialogTitle className="text-2xl font-black italic tracking-tight">
                        Start Sequence
                      </DialogTitle>
                      <DialogDescription className="max-w-lg text-xs font-black uppercase tracking-widest opacity-40">
                        Launch a new focus stream without interrupting the others.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleStartTimer} className="space-y-5">
                      <div className="grid gap-4 text-start sm:grid-cols-2">
                        <div className="space-y-3">
                          <Label
                            htmlFor="projectId"
                            className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60"
                          >
                            Project First
                          </Label>
                          <ProjectSelector
                            value={formData.projectId}
                            onChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                projectId: value,
                                taskId: '',
                              }))
                            }
                            placeholder="Personal Project"
                          />
                          <p className="min-h-[32px] text-[10px] leading-relaxed text-muted-foreground/60">
                            Leave it on personal to track work outside a project.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                            Then Select Task
                          </Label>
                          <Popover open={isTaskSearchOpen} onOpenChange={setIsTaskSearchOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-11 w-full justify-between rounded-xl border-primary/5 bg-muted/30 px-3 text-xs font-bold hover:bg-muted/40"
                              >
                                <span className="truncate">
                                  {formData.taskId
                                    ? tasks.find((task) => task.id === formData.taskId)?.title || 'Select a task'
                                    : 'Search and select task'}
                                </span>
                                <Search className="h-4 w-4 shrink-0 opacity-60" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[380px] rounded-2xl border-primary/10 bg-background/95 p-0 shadow-2xl backdrop-blur-xl" align="start">
                              <Command className="rounded-2xl bg-transparent">
                                <CommandInput className="border-primary/10" placeholder="Search tasks..." />
                                <CommandList
                                  className="custom-scrollbar max-h-[320px]"
                                  onWheel={(e) => {
                                    e.stopPropagation();
                                    e.currentTarget.scrollTop += e.deltaY;
                                  }}
                                >
                                  <CommandEmpty>No matching task found.</CommandEmpty>
                                  <CommandGroup heading={formData.projectId ? 'Selected project first' : 'Personal tasks first'}>
                                    {startModalSearchTasks.map((task) => {
                                      const projectName = task.projectId
                                        ? projects.find((project) => project.id === task.projectId)?.name || 'Project'
                                        : 'Personal';

                                      return (
                                        <CommandItem
                                          key={task.id}
                                          value={`${task.title} ${projectName}`}
                                          onSelect={() => {
                                            setFormData((prev) => ({
                                              ...prev,
                                              taskId: task.id,
                                              projectId: task.projectId || '',
                                              category: prev.category || task.title,
                                            }));
                                            setIsTaskSearchOpen(false);
                                          }}
                                          className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                                        >
                                          <div className="min-w-0">
                                            <p className="truncate text-xs font-bold">{task.title}</p>
                                            <p className="truncate text-[10px] font-medium text-muted-foreground">
                                              {projectName}
                                            </p>
                                          </div>
                                          {task.projectId ? (
                                            <ProjectBadge projectId={task.projectId} className="h-5 shrink-0" />
                                          ) : (
                                            <Badge variant="outline" className="h-5 shrink-0 text-[8px] uppercase tracking-widest">
                                              Personal
                                            </Badge>
                                          )}
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                  <CommandSeparator />
                                  <CommandGroup heading="Create if missing">
                                    <div className="px-2 pb-2 pt-1">
                                      <div className="rounded-2xl border border-dashed border-primary/15 bg-primary/5 p-3">
                                        <div className="flex items-center justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary/70">
                                              Missing Task?
                                            </p>
                                            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                                              Create one in the current {formData.projectId ? 'project' : 'personal space'}.
                                            </p>
                                          </div>
                                          <Button
                                            type="button"
                                            variant="secondary"
                                            className="shrink-0 rounded-xl text-[9px] font-black uppercase tracking-widest"
                                            onClick={async () => {
                                              await handleCreateTaskForSelectedProject();
                                            }}
                                            disabled={!newTaskTitle.trim()}
                                          >
                                            <Plus className="mr-1.5 h-3 w-3" />
                                            Create
                                          </Button>
                                        </div>
                                        <Input
                                          value={newTaskTitle}
                                          onChange={(e) => setNewTaskTitle(e.target.value)}
                                          placeholder={formData.projectId ? 'New task for this project...' : 'New personal task...'}
                                          className="mt-3 h-10 rounded-xl border-primary/10 bg-background/80 text-xs font-medium"
                                        />
                                      </div>
                                    </div>
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <p className="min-h-[32px] text-[10px] leading-relaxed text-muted-foreground/60">
                            Search any task. Choosing one will automatically sync the project above.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-primary/5 bg-muted/15 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary/70">
                              Quick Start
                            </p>
                            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                              Start immediately if you need to. You can attach project and task later while saving the session.
                            </p>
                          </div>
                          <Badge variant="outline" className="h-6 shrink-0 border-primary/15 bg-primary/5 text-[8px] font-black uppercase tracking-widest">
                            Optional
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label
                          htmlFor="category"
                          className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60"
                        >
                          Operation Category
                        </Label>
                        <Input
                          id="category"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          placeholder="e.g. CORE.DEVELOPMENT"
                          required
                          className="h-12 rounded-2xl border-primary/5 bg-muted/30 text-base font-bold transition-all focus:ring-primary/20"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label
                          htmlFor="description"
                          className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60"
                        >
                          Execution Details
                        </Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Objective parameters..."
                          className="h-12 rounded-2xl border-primary/5 bg-muted/30"
                        />
                      </div>

                      <Button
                        type="submit"
                        className="mt-4 h-14 w-full rounded-2xl text-base font-black tracking-tight shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <Play className="mr-2 h-4 w-4 fill-current" />
                        Initialize Timer
                      </Button>
                    </form>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            <Card className="group relative overflow-hidden rounded-3xl border border-primary/5 bg-background/25 shadow-2xl backdrop-blur-2xl transition-all duration-500 hover:border-primary/15">
              <div className="absolute left-0 top-0 h-1 w-full bg-muted/20">
                <div
                  className={cn(
                    'h-full bg-gradient-to-r from-primary via-primary/80 to-primary/50 transition-all duration-1000',
                    runningEntries.length > 0 ? 'w-full animate-pulse' : 'w-0'
                  )}
                />
              </div>

              <CardContent className="p-8 sm:p-12">
                {runningEntries.length > 0 ? (
                  <div className="space-y-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                      <div className="space-y-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary animate-pulse"
                          >
                            {runningEntries.length} Active {runningEntries.length === 1 ? 'Session' : 'Sessions'}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-primary/10 bg-background/40 px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                          >
                            <Layers3 className="mr-1 h-3 w-3" />
                            Multi-timer enabled
                          </Badge>
                          {miniWindowSupported && (
                            <Badge
                              variant="outline"
                              className="border-primary/10 bg-background/40 px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                            >
                              <MonitorUp className="mr-1 h-3 w-3" />
                              Mini window available
                            </Badge>
                          )}
                        </div>

                        <div>
                          <div className="font-mono text-5xl font-black tracking-tighter text-foreground tabular-nums sm:text-7xl">
                            {getElapsedTime(runningEntries[0].startTime, currentTime)}
                          </div>
                          <p className="mt-3 max-w-2xl text-sm text-muted-foreground/70">
                            Your oldest active timer is shown as the headline clock, and every running timer stays independently stoppable below.
                          </p>
                        </div>
                      </div>

                      <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto">
                        <Button
                          onClick={() => setIsDialogOpen(true)}
                          className="h-14 rounded-2xl text-sm font-black shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                          <Play className="mr-2 h-5 w-5 fill-current" />
                          Start Another Timer
                        </Button>
                        <p className="rounded-2xl border border-primary/10 bg-muted/20 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                          Use the floating dock or mini window to keep timers visible while navigating elsewhere.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      {runningEntries.map((entry) => {
                        const catColor = getCategoryColor(entry.category);
                        return (
                          <div
                            key={entry.id}
                            className="relative overflow-hidden rounded-[2.5rem] border border-primary/5 bg-background/25 p-8 shadow-2xl backdrop-blur-2xl transition-all duration-500 hover:border-primary/20 hover:shadow-primary/5 group pl-10"
                          >
                            {/* Color bar indicator based on focus category */}
                            <div 
                              className="absolute left-0 top-0 bottom-0 w-2.5 transition-all duration-500" 
                              style={{ backgroundColor: catColor }}
                            />

                            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge 
                                    variant="outline" 
                                    className="border-current text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-background/50"
                                    style={{ color: catColor }}
                                  >
                                    {entry.category}
                                  </Badge>
                                  {entry.projectId && <ProjectBadge projectId={entry.projectId} className="h-5" />}
                                  {entry.taskId && (
                                    <button
                                      type="button"
                                      onClick={() => handleNavigateToTask(entry.taskId!)}
                                      className="rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-primary transition-all hover:bg-primary/10 hover:border-primary/30"
                                    >
                                      {findTaskTitle(entry.taskId) || 'Linked task'}
                                    </button>
                                  )}
                                </div>

                                {entry.description && (
                                  <p className="max-w-xl text-xs font-semibold italic text-foreground/80">
                                    &ldquo;{entry.description}&rdquo;
                                  </p>
                                )}

                                <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/45">
                                  <div className="flex items-center gap-1.5 rounded-full border border-primary/5 bg-muted/10 px-3 py-1.5">
                                    <Clock className="h-3 w-3 text-primary animate-spin-slow" />
                                    Started {formatDistanceToNow(new Date(entry.startTime), { addSuffix: true })}
                                  </div>
                                  <div className="rounded-full border border-primary/5 bg-muted/10 px-3 py-1.5">
                                    {format(new Date(entry.startTime), 'MMM d, h:mm a')}
                                  </div>
                                </div>
                              </div>

                              <div className="flex min-w-[180px] flex-col items-start gap-4 sm:items-end shrink-0">
                                <div className="space-y-0.5 sm:text-right">
                                  <div className="font-mono text-3xl font-black tracking-tighter text-foreground tabular-nums sm:text-4xl bg-gradient-to-r from-foreground to-foreground/75 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                                    {getElapsedTime(entry.startTime, currentTime)}
                                  </div>
                                  <span className="text-[8px] font-black uppercase tracking-widest text-primary/55 block">Stopwatch Cockpit active</span>
                                </div>
                                <Button
                                  onClick={() => handleStopTimer(entry.id)}
                                  className="h-12 w-full rounded-2xl bg-destructive hover:bg-destructive/90 text-xs font-black text-destructive-foreground shadow-lg shadow-destructive/15 transition-all hover:scale-[1.01] active:scale-[0.99] sm:w-auto"
                                >
                                  <Square className="mr-2 h-4 w-4 fill-current animate-pulse" />
                                  Stop Focus Stream
                                </Button>
                              </div>
                            </div>

                          {/* Chronos Journal Live Logging Panel */}
                          <div className="mt-6 border-t border-primary/10 pt-6">
                            <div className="flex items-center justify-between mb-4">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedJournals((prev) => ({
                                    ...prev,
                                    [entry.id]: !prev[entry.id],
                                  }))
                                }
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:text-primary/80 transition-colors"
                              >
                                <Sparkles className={cn("h-4 w-4 text-primary", (expandedJournals[entry.id] ?? true) && "animate-pulse")} />
                                Chronos Journal
                                <Badge variant="outline" className="h-5 border-primary/20 bg-primary/5 text-[9px] px-1.5 py-0">
                                  {entry.liveUpdates?.length || 0} logs
                                </Badge>
                              </button>
                              
                              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                Active Phase: <span className="text-primary italic">{activePhases[entry.id] || 'Deep Work'}</span>
                              </div>
                            </div>

                            {(expandedJournals[entry.id] ?? true) && (
                              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                
                                {/* 1. Phase Shift Console */}
                                <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-muted/20 border border-primary/5">
                                  {[
                                    { label: 'Deep Work', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
                                    { label: 'Planning', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
                                    { label: 'Coding', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
                                    { label: 'Debugging', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
                                    { label: 'Break', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' }
                                  ].map((p) => {
                                    const isActive = (activePhases[entry.id] || 'Deep Work') === p.label;
                                    return (
                                      <button
                                        key={p.label}
                                        type="button"
                                        onClick={() =>
                                          setActivePhases((prev) => ({
                                            ...prev,
                                            [entry.id]: p.label,
                                          }))
                                        }
                                        className={cn(
                                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all",
                                          isActive
                                            ? `${p.color} border-current scale-[1.03] shadow-sm`
                                            : "border-transparent bg-transparent text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40"
                                        )}
                                      >
                                        <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-current animate-ping" : "bg-muted-foreground/35")} />
                                        {p.label}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* 2. Active Outliner Prompt */}
                                <div className="flex items-center gap-2">
                                  <div className="relative flex-1">
                                    <Input
                                      value={inputTexts[entry.id] || ''}
                                      onChange={(e) =>
                                        setInputTexts((prev) => ({
                                          ...prev,
                                          [entry.id]: e.target.value,
                                        }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleAddLiveUpdate(entry.id);
                                        } else if (e.key === 'Tab') {
                                          e.preventDefault();
                                          if (e.shiftKey) {
                                            // Outdent
                                            setIndentLevels((prev) => ({
                                              ...prev,
                                              [entry.id]: Math.max(0, (prev[entry.id] || 0) - 1),
                                            }));
                                          } else {
                                            // Indent
                                            setIndentLevels((prev) => ({
                                              ...prev,
                                              [entry.id]: Math.min(2, (prev[entry.id] || 0) + 1),
                                            }));
                                          }
                                        }
                                      }}
                                      placeholder="Log node... (Tab to indent, Enter to save)"
                                      className="h-10 pr-24 rounded-xl border-primary/10 bg-background/60 text-xs font-medium placeholder:text-muted-foreground/45"
                                    />
                                    
                                    {/* Indentation Level Indicator Badge */}
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                      <Badge variant="outline" className="h-5 border-primary/10 bg-muted/30 text-[8px] font-black uppercase">
                                        {(indentLevels[entry.id] || 0) === 0 ? 'Root' : `Indent ${(indentLevels[entry.id] || 0)}`}
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Prompt Action Toolbar */}
                                  <div className="flex items-center gap-1 bg-muted/20 border border-primary/5 rounded-xl p-0.5">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() =>
                                        setIndentLevels((prev) => ({
                                          ...prev,
                                          [entry.id]: Math.max(0, (prev[entry.id] || 0) - 1),
                                        }))
                                      }
                                      title="Outdent (Shift+Tab)"
                                      className="h-9 w-9 rounded-lg text-muted-foreground/75 hover:bg-primary/5"
                                    >
                                      <ChevronLeft className="h-4 w-4" />
                                    </Button>

                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() =>
                                        setIndentLevels((prev) => ({
                                          ...prev,
                                          [entry.id]: Math.min(2, (prev[entry.id] || 0) + 1),
                                        }))
                                      }
                                      title="Indent (Tab)"
                                      className="h-9 w-9 rounded-lg text-muted-foreground/75 hover:bg-primary/5"
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                    </Button>

                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() =>
                                        setIsTodoMode((prev) => ({
                                          ...prev,
                                          [entry.id]: !prev[entry.id],
                                        }))
                                      }
                                      title="Toggle Task Checklist Node"
                                      className={cn(
                                        "h-9 w-9 rounded-lg transition-colors",
                                        isTodoMode[entry.id]
                                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                                          : "text-muted-foreground/75 hover:bg-primary/5"
                                      )}
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>

                                    <Button
                                      size="icon"
                                      onClick={() => handleAddLiveUpdate(entry.id)}
                                      className="h-9 w-9 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground shadow"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                {/* ─── Thread Lanes Bar ─────────────────────────────── */}
                                {(() => {
                                  const threads = entry.threads || [];
                                  const currentView = viewingThreadId[entry.id] || 'all';
                                  const activeInput = threadInputNames[entry.id] || '';
                                  const isAdding = showAddThread[entry.id];
                                  const activeLoggingThread = activeThreadIds[entry.id] || '';

                                  const statusDot: Record<JournalThread['status'], string> = {
                                    active: 'bg-emerald-400 animate-pulse',
                                    paused: 'bg-amber-400',
                                    blocked: 'bg-rose-400',
                                  };
                                  const statusLabel: Record<JournalThread['status'], string> = {
                                    active: 'Active',
                                    paused: 'Paused',
                                    blocked: 'Blocked',
                                  };

                                  if (threads.length === 0 && !isAdding) {
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => setShowAddThread((p) => ({ ...p, [entry.id]: true }))}
                                        className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 hover:text-primary/70 transition-colors py-1"
                                      >
                                        <Plus className="h-3 w-3" />
                                        Add work thread
                                      </button>
                                    );
                                  }

                                  return (
                                    <div className="space-y-3">
                                      {/* Thread pill tabs */}
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {/* All tab */}
                                        <button
                                          type="button"
                                          onClick={() => setViewingThreadId((p) => ({ ...p, [entry.id]: 'all' }))}
                                          className={cn(
                                            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border",
                                            currentView === 'all'
                                              ? "bg-primary/10 border-primary/20 text-primary"
                                              : "border-transparent text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30"
                                          )}
                                        >
                                          All
                                          <span className="ml-1 opacity-60">{entry.liveUpdates?.length || 0}</span>
                                        </button>

                                        {threads.map((thread) => {
                                          const pal = getThreadPalette(thread.color);
                                          const isViewing = currentView === thread.id;
                                          const isLogging = activeLoggingThread === thread.id;
                                          const nodeCount = (entry.liveUpdates || []).filter((n) => n.threadId === thread.id).length;
                                          return (
                                            <div key={thread.id} className="group/thread relative flex items-center">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setViewingThreadId((p) => ({ ...p, [entry.id]: thread.id }));
                                                  setActiveThreadIds((p) => ({ ...p, [entry.id]: thread.id }));
                                                }}
                                                className={cn(
                                                  "flex items-center gap-1.5 pl-2.5 pr-6 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all",
                                                  isViewing
                                                    ? `${pal.bg} ${pal.border} ${pal.text}`
                                                    : "border-transparent text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30"
                                                )}
                                              >
                                                {/* Status dot — click cycles status */}
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    void handleCycleThreadStatus(entry.id, thread.id);
                                                  }}
                                                  title={`Status: ${statusLabel[thread.status]} — click to cycle`}
                                                  className="h-2 w-2 rounded-full shrink-0 transition-all"
                                                >
                                                  <span className={cn("block h-2 w-2 rounded-full", statusDot[thread.status])} />
                                                </button>
                                                {thread.name}
                                                <span className="opacity-50">{nodeCount}</span>
                                                {isLogging && (
                                                  <span className="absolute right-4 h-1.5 w-1.5 rounded-full bg-current animate-ping" />
                                                )}
                                              </button>
                                              {/* × delete thread */}
                                              <button
                                                type="button"
                                                onClick={() => void handleDeleteThread(entry.id, thread.id)}
                                                title="Remove thread"
                                                className="absolute right-1 opacity-0 group-hover/thread:opacity-100 h-4 w-4 flex items-center justify-center rounded text-muted-foreground/60 hover:text-destructive transition-all"
                                              >
                                                <span className="text-[10px] leading-none">&times;</span>
                                              </button>
                                            </div>
                                          );
                                        })}

                                        {/* + Thread button / input */}
                                        {isAdding ? (
                                          <input
                                            autoFocus
                                            value={activeInput}
                                            onChange={(e) => setThreadInputNames((p) => ({ ...p, [entry.id]: e.target.value }))}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') { e.preventDefault(); void handleAddThread(entry.id); }
                                              if (e.key === 'Escape') setShowAddThread((p) => ({ ...p, [entry.id]: false }));
                                            }}
                                            onBlur={() => void handleAddThread(entry.id)}
                                            placeholder="Thread name…"
                                            className="h-7 w-28 rounded-lg border border-primary/20 bg-background/60 px-2.5 text-[10px] font-semibold outline-none focus:border-primary/40 placeholder:text-muted-foreground/35 transition-colors"
                                          />
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setShowAddThread((p) => ({ ...p, [entry.id]: true }))}
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-primary/15 text-[9px] font-black uppercase tracking-wider text-muted-foreground/40 hover:border-primary/30 hover:text-primary/60 transition-all"
                                          >
                                            <Plus className="h-2.5 w-2.5" />
                                            Thread
                                          </button>
                                        )}
                                      </div>

                                      {/* Thread Timeline Strip */}
                                      {threads.length > 0 && (entry.liveUpdates?.length || 0) > 0 && (() => {
                                        const total = entry.liveUpdates!.length;
                                        const threadSegments = threads.map((t) => ({
                                          thread: t,
                                          count: entry.liveUpdates!.filter((n) => n.threadId === t.id).length,
                                        })).filter((s) => s.count > 0);
                                        const unassigned = entry.liveUpdates!.filter((n) => !n.threadId).length;

                                        return (
                                          <div className="space-y-1">
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/35">Thread Timeline</p>
                                            <div className="flex h-1.5 w-full overflow-hidden rounded-full gap-px">
                                              {threadSegments.map(({ thread, count }) => {
                                                const pal = getThreadPalette(thread.color);
                                                return (
                                                  <Popover key={thread.id}>
                                                    <PopoverTrigger asChild>
                                                      <div
                                                        title={`${thread.name}: ${count} node${count > 1 ? 's' : ''}`}
                                                        style={{ width: `${(count / total) * 100}%`, backgroundColor: pal.hsl, opacity: 0.7 }}
                                                        className="h-full cursor-pointer hover:opacity-100 transition-opacity rounded-full"
                                                      />
                                                    </PopoverTrigger>
                                                    <PopoverContent side="top" className="w-40 p-2.5 rounded-xl border-primary/10 bg-background/95 backdrop-blur-xl shadow-xl text-[10px]">
                                                      <div className="flex items-center gap-2 mb-1">
                                                        <span className={cn("h-2 w-2 rounded-full shrink-0", pal.bg, pal.border, 'border')} style={{ backgroundColor: pal.hsl }} />
                                                        <span className={cn("font-black", pal.text)}>{thread.name}</span>
                                                      </div>
                                                      <p className="text-muted-foreground/60 font-semibold">{count} node{count > 1 ? 's' : ''} · {Math.round((count / total) * 100)}% of session</p>
                                                      <p className="text-muted-foreground/40 font-semibold mt-0.5">Since {thread.createdAt}</p>
                                                    </PopoverContent>
                                                  </Popover>
                                                );
                                              })}
                                              {unassigned > 0 && (
                                                <div
                                                  title={`Unthreaded: ${unassigned} node${unassigned > 1 ? 's' : ''}`}
                                                  style={{ width: `${(unassigned / total) * 100}%` }}
                                                  className="h-full bg-muted/40 rounded-full"
                                                />
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  );
                                })()}

                                {/* 3. Live Indented Milestone Tree */}
                                {entry.liveUpdates && entry.liveUpdates.length > 0 ? (
                                  <div className="relative border-l border-primary/10 ml-3 pl-4 py-2 space-y-4">
                                    {entry.liveUpdates
                                      .filter((node) => {
                                        const view = viewingThreadId[entry.id] || 'all';
                                        if (view === 'all') return true;
                                        return node.threadId === view;
                                      })
                                      .map((node) => {
                                      const isTodo = node.type === 'todo';
                                      const isDone = node.completed === true;
                                      const nodeThread = (entry.threads || []).find((t) => t.id === node.threadId);
                                      const nodePal = nodeThread ? getThreadPalette(nodeThread.color) : null;
                                      
                                      const phaseColors: Record<string, string> = {
                                        'Deep Work': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
                                        'Planning': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
                                        'Coding': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
                                        'Debugging': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
                                        'Break': 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                      };
                                      const phaseColor = phaseColors[node.phase || ''] || 'bg-muted/30 text-muted-foreground/80';

                                      const isEditingThisNode =
                                        editingNodeId?.entryId === entry.id &&
                                        editingNodeId?.nodeId === node.id;

                                      const blockerNode = node.blockedBy ? (entry.liveUpdates || []).find((n) => n.id === node.blockedBy) : null;
                                      const isCurrentlyBlocked = !!blockerNode && !blockerNode.completed;

                                      return (
                                        <div
                                          key={node.id}
                                          style={{
                                            paddingLeft: `${(node.indent || 0) * 1.25}rem`,
                                          }}
                                          className="group relative flex items-start justify-between gap-2 py-1 transition-all"
                                        >
                                          {/* Thread color accent bar on left edge */}
                                          {nodePal && (
                                            <div
                                              className="absolute -left-4 top-1.5 bottom-1.5 w-0.5 rounded-full opacity-60"
                                              style={{ backgroundColor: nodePal.hsl }}
                                            />
                                          )}
                                          {/* Visual Hierarchy Connector Line Indicator */}
                                          {(node.indent || 0) > 0 && (
                                            <div 
                                              style={{ left: `${((node.indent || 0) - 1) * 1.25}rem` }}
                                              className="absolute -top-3 bottom-1/2 w-4 border-l border-b border-primary/15 rounded-bl-lg animate-in fade-in" 
                                            />
                                          )}

                                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                            {isCurrentlyBlocked ? (
                                              <div 
                                                className="mt-0.5 h-4 w-4 flex items-center justify-center text-amber-500 shrink-0 cursor-not-allowed animate-pulse"
                                                title={`Blocked by: ${blockerNode?.text}`}
                                              >
                                                <Lock className="h-3.5 w-3.5 stroke-[2.5]" />
                                              </div>
                                            ) : unlockedNodes[node.id] ? (
                                              <div className="mt-0.5 h-4 w-4 flex items-center justify-center text-emerald-400 shrink-0 animate-bounce">
                                                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                                              </div>
                                            ) : isTodo ? (
                                              <button
                                                type="button"
                                                onClick={() => handleToggleUpdateCompletion(entry.id, node.id)}
                                                className={cn(
                                                  "mt-0.5 h-4 w-4 rounded border transition-colors flex items-center justify-center shrink-0",
                                                  isDone
                                                    ? "bg-primary border-primary text-primary-foreground"
                                                    : "border-primary/30 hover:border-primary/60 bg-background"
                                                )}
                                              >
                                                {isDone && <CheckCircle2 className="h-3 w-3 stroke-[3]" />}
                                              </button>
                                            ) : (
                                              <div className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/45 shrink-0" />
                                            )}

                                            <div className="min-w-0 flex-1">
                                              {isEditingThisNode ? (
                                                <input
                                                  autoFocus
                                                  value={editNodeText}
                                                  onChange={(e) => setEditNodeText(e.target.value)}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                      e.preventDefault();
                                                      void handleSaveEditNode();
                                                    }
                                                    if (e.key === 'Escape') handleCancelEditNode();
                                                  }}
                                                  onBlur={() => void handleSaveEditNode()}
                                                  className="w-full bg-transparent text-xs font-semibold text-foreground/90 border-b border-primary/40 focus:border-primary/70 outline-none pb-0.5 leading-relaxed caret-primary placeholder:text-muted-foreground/40 transition-colors"
                                                />
                                              ) : (
                                                <p
                                                  className={cn(
                                                    "text-xs font-semibold leading-relaxed break-words text-foreground/85 cursor-text select-text transition-colors",
                                                    isDone && "line-through text-muted-foreground/50 italic",
                                                    isCurrentlyBlocked && "text-muted-foreground/40 italic cursor-not-allowed"
                                                  )}
                                                  onDoubleClick={() => {
                                                    if (!isCurrentlyBlocked) {
                                                      handleStartEditNode(entry.id, node.id, node.text);
                                                    }
                                                  }}
                                                  title={isCurrentlyBlocked ? `Blocked by: ${blockerNode?.text}` : "Double-click to edit"}
                                                >
                                                  {node.text}
                                                </p>
                                              )}
                                              
                                              {isCurrentlyBlocked && blockerNode && (
                                                <div className="mt-1 flex items-center gap-1 text-[9px] font-semibold text-amber-500/70 animate-in fade-in slide-in-from-top-1">
                                                  <Lock className="h-2.5 w-2.5 shrink-0" />
                                                  <span>Waiting for: {blockerNode.text}</span>
                                                </div>
                                              )}

                                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-wider">
                                                <span className="text-primary/50 tabular-nums">
                                                  {node.elapsedTime}
                                                </span>
                                                <Badge variant="outline" className={cn("h-4 text-[7px] px-1 py-0 border-current font-bold uppercase", phaseColor)}>
                                                  {node.phase}
                                                </Badge>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Single ⋮ kebab — clean context menu on click */}
                                          <Popover
                                            open={openNodeMenu === `${entry.id}:${node.id}`}
                                            onOpenChange={(open) => {
                                              setOpenNodeMenu(open ? `${entry.id}:${node.id}` : null);
                                              if (!open) {
                                                setIsSelectingBlocker(null);
                                              }
                                            }}
                                          >
                                            <PopoverTrigger asChild>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                type="button"
                                                className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/40 transition-all duration-150 shrink-0"
                                              >
                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                              </Button>
                                            </PopoverTrigger>

                                            <PopoverContent
                                              side="left"
                                              align="center"
                                              sideOffset={8}
                                              className="w-48 p-1.5 rounded-2xl border-primary/10 bg-background/95 backdrop-blur-xl shadow-2xl"
                                            >
                                              {isSelectingBlocker === node.id ? (
                                                <>
                                                  <div className="flex items-center gap-1.5 px-2 py-1 mb-1.5 border-b border-primary/5">
                                                    <button
                                                      type="button"
                                                      onClick={() => setIsSelectingBlocker(null)}
                                                      className="rounded p-1 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                                    >
                                                      <ChevronLeft className="h-3 w-3" />
                                                    </button>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-foreground/80">Select Blocker</span>
                                                  </div>
                                                  <div className="max-h-48 overflow-y-auto py-1 space-y-0.5">
                                                    {(entry.liveUpdates || [])
                                                      .filter((n) => {
                                                        // Cannot block on self
                                                        if (n.id === node.id) return false;
                                                        // Cannot block on completed nodes
                                                        if (n.completed) return false;
                                                        // Prevent circular dependencies
                                                        if (wouldCreateCircularDependency(entry.liveUpdates || [], node.id, n.id)) return false;
                                                        return true;
                                                      })
                                                      .map((n) => (
                                                        <button
                                                          key={n.id}
                                                          type="button"
                                                          onClick={() => {
                                                            void handleSetBlocker(entry.id, node.id, n.id);
                                                            setIsSelectingBlocker(null);
                                                            setOpenNodeMenu(null);
                                                          }}
                                                          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[11px] font-semibold text-foreground/70 transition-colors hover:bg-muted/40 hover:text-foreground"
                                                          title={n.text}
                                                        >
                                                          <span className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                                                          <span className="truncate">{n.text}</span>
                                                        </button>
                                                      ))}
                                                    {(entry.liveUpdates || []).filter((n) => n.id !== node.id && !n.completed && !wouldCreateCircularDependency(entry.liveUpdates || [], node.id, n.id)).length === 0 && (
                                                      <p className="text-[10px] text-muted-foreground/50 px-3 py-4 italic text-center leading-normal">
                                                        No eligible blocker tasks found in this session.
                                                      </p>
                                                    )}
                                                  </div>
                                                </>
                                              ) : (
                                                <>
                                                  {/* Hierarchy section */}
                                                  <p className="px-3 pt-1 pb-0.5 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Hierarchy</p>

                                                  <button
                                                    type="button"
                                                    disabled={(node.indent || 0) === 0}
                                                    onClick={() => {
                                                      void handleIndentNode(entry.id, node.id, 'outdent');
                                                      setOpenNodeMenu(null);
                                                    }}
                                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[11px] font-semibold text-foreground/70 transition-colors hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                                                  >
                                                    <ChevronLeft className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                                                    Promote
                                                    <span className="ml-auto text-[9px] font-black text-muted-foreground/30">Shift+Tab</span>
                                                  </button>

                                                  <button
                                                    type="button"
                                                    disabled={(node.indent || 0) >= 2}
                                                    onClick={() => {
                                                      void handleIndentNode(entry.id, node.id, 'indent');
                                                      setOpenNodeMenu(null);
                                                    }}
                                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[11px] font-semibold text-foreground/70 transition-colors hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                                                  >
                                                    <ChevronRight className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                                                    Demote
                                                    <span className="ml-auto text-[9px] font-black text-muted-foreground/30">Tab</span>
                                                  </button>

                                                  <div className="my-1.5 border-t border-primary/5" />

                                                  {/* Edit section */}
                                                  <p className="px-3 pb-0.5 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Node</p>

                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      handleStartEditNode(entry.id, node.id, node.text);
                                                      setOpenNodeMenu(null);
                                                    }}
                                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[11px] font-semibold text-foreground/70 transition-colors hover:bg-muted/40 hover:text-foreground"
                                                  >
                                                    <Edit2 className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                                                    Edit text
                                                    <span className="ml-auto text-[9px] font-black text-muted-foreground/30">Dbl-click</span>
                                                  </button>

                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      void handleToggleNodeType(entry.id, node.id);
                                                      setOpenNodeMenu(null);
                                                    }}
                                                    className={cn(
                                                      "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[11px] font-semibold transition-colors",
                                                      isTodo
                                                        ? "text-emerald-500 hover:bg-emerald-500/10"
                                                        : "text-foreground/70 hover:bg-muted/40 hover:text-foreground"
                                                    )}
                                                  >
                                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                                    {isTodo ? 'Remove checklist' : 'Make checklist'}
                                                  </button>

                                                  {/* Move to thread section */}
                                                  {(entry.threads || []).length > 0 && (
                                                    <>
                                                      <div className="my-1.5 border-t border-primary/5" />
                                                      <p className="px-3 pb-0.5 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Move to thread</p>

                                                      {node.threadId && (
                                                        <button
                                                          type="button"
                                                          onClick={() => void handleMoveNodeToThread(entry.id, node.id, undefined)}
                                                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[11px] font-semibold text-muted-foreground/50 transition-colors hover:bg-muted/40 hover:text-foreground"
                                                        >
                                                          <span className="h-2 w-2 rounded-full bg-muted/50 shrink-0" />
                                                          Unassign
                                                        </button>
                                                      )}

                                                      {(entry.threads || []).filter((t) => t.id !== node.threadId).map((t) => {
                                                        const tp = getThreadPalette(t.color);
                                                        return (
                                                          <button
                                                            key={t.id}
                                                            type="button"
                                                            onClick={() => void handleMoveNodeToThread(entry.id, node.id, t.id)}
                                                            className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[11px] font-semibold transition-colors hover:bg-muted/40", tp.text)}
                                                          >
                                                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tp.hsl }} />
                                                            {t.name}
                                                          </button>
                                                        );
                                                      })}
                                                    </>
                                                  )}

                                                  <div className="my-1.5 border-t border-primary/5" />
                                                  <p className="px-3 pb-0.5 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Dependencies</p>

                                                  {node.blockedBy ? (
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        void handleSetBlocker(entry.id, node.id, null);
                                                        setOpenNodeMenu(null);
                                                      }}
                                                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[11px] font-semibold text-amber-500 hover:bg-amber-500/10 transition-colors"
                                                    >
                                                      <Unlock className="h-3.5 w-3.5 shrink-0" />
                                                      Remove blocker
                                                    </button>
                                                  ) : (
                                                    <button
                                                      type="button"
                                                      onClick={() => setIsSelectingBlocker(node.id)}
                                                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[11px] font-semibold text-foreground/70 hover:bg-muted/40 hover:text-foreground transition-colors"
                                                    >
                                                      <Lock className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                                                      Block on...
                                                    </button>
                                                  )}

                                                  <div className="my-1.5 border-t border-primary/5" />

                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      void handleDeleteLiveUpdate(entry.id, node.id);
                                                      setOpenNodeMenu(null);
                                                    }}
                                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[11px] font-semibold text-destructive/70 transition-colors hover:bg-destructive/8 hover:text-destructive"
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                                    Delete
                                                  </button>
                                                </>
                                              )}
                                            </PopoverContent>
                                          </Popover>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center py-6 rounded-2xl border border-dashed border-primary/10 bg-muted/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/45">
                                      Your logged milestones and micro-notes will appear here.
                                    </p>
                                  </div>
                                )}

                              </div>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-6 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-primary/10 bg-background/40 px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                        >
                          Ready to track
                        </Badge>
                      </div>

                      <div className="mb-4 text-4xl font-black tracking-tight text-foreground sm:text-6xl">
                        Start a timer from here, then keep it visible from anywhere in the app.
                      </div>

                      <p className="max-w-2xl text-sm text-muted-foreground/70">
                        New sessions appear in the floating dock, and supported browsers can pop them into a compact always-on-top mini window for easier monitoring while you work elsewhere.
                      </p>
                    </div>

                    <Button
                      onClick={() => setIsDialogOpen(true)}
                      className="group/btn h-16 w-full rounded-[1.5rem] text-lg font-black shadow-2xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Play className="mr-3 h-6 w-6 fill-current transition-transform group-hover/btn:scale-110" />
                      Initiate Temporal Capture
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-3xl border-primary/5 bg-background/25 shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:border-primary/15">
              <CardHeader className="border-b border-primary/5 p-6">
                <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                  <Plus className="h-3.5 w-3.5" />
                  Retroactive Logging
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-6">
                <div className="rounded-[2rem] border border-primary/5 bg-muted/20 p-6 shadow-sm">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-foreground/85">Manual Calibration</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Backfill a completed session quickly, or map it directly on the day timeline below.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 rounded-xl border border-dashed border-primary/20 px-4 text-[10px] font-black uppercase tracking-widest hover:border-primary/50 hover:bg-primary/5"
                      onClick={() => setIsTimelineMapperOpen(true)}
                    >
                      <Maximize2 className="mr-2 h-3.5 w-3.5" />
                      Interactive Timeline Mapper
                    </Button>
                  </div>

                  <form onSubmit={handleLogManualEntry} className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
                      <div className="space-y-2 md:col-span-3">
                        <p className="ml-1 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Hrs</p>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={manualEntry.hours}
                          onChange={(e) =>
                            setManualEntry((prev) => ({
                              ...prev,
                              hours: e.target.value.replace(/\D/g, ''),
                            }))
                          }
                          className="h-10 rounded-xl border-primary/5 bg-background/50 px-1 text-center text-sm font-black focus:ring-primary/20"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-3">
                        <p className="ml-1 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Min</p>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={manualEntry.minutes}
                          onChange={(e) =>
                            setManualEntry((prev) => ({
                              ...prev,
                              minutes: e.target.value.replace(/\D/g, ''),
                            }))
                          }
                          className="h-10 rounded-xl border-primary/5 bg-background/50 px-1 text-center text-sm font-black focus:ring-primary/20"
                        />
                      </div>

                      <div className="md:col-span-6">
                        <Button
                          type="submit"
                          variant="secondary"
                          className="h-10 w-full rounded-xl px-2 text-[9px] font-black uppercase tracking-widest shadow-lg shadow-secondary/10 group"
                        >
                          <CheckCircle2 className="mr-1.5 h-3 w-3 transition-transform group-hover:scale-110" />
                          Log Past
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                      <div className="min-w-0">
                        <Select
                          value={manualEntry.category || 'General'}
                          onValueChange={(value) =>
                            setManualEntry((prev) => ({ ...prev, category: value }))
                          }
                        >
                          <SelectTrigger className="h-10 w-full rounded-xl border-none bg-background text-[9px] font-black uppercase tracking-wider">
                            <div className="w-full truncate text-left">
                              <SelectValue placeholder="Category" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-primary/10">
                            <SelectItem value="General">General</SelectItem>
                            {PRESET_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="min-w-0">
                        <ProjectSelector
                          value={manualEntry.projectId}
                          onChange={(value) =>
                            setManualEntry((prev) => ({ ...prev, projectId: value }))
                          }
                          placeholder="Project Context"
                        />
                      </div>

                      <div className="min-w-0">
                        <Input
                          placeholder="What happened then?..."
                          value={manualEntry.description}
                          onChange={(e) =>
                            setManualEntry((prev) => ({ ...prev, description: e.target.value }))
                          }
                          className="h-10 w-full rounded-xl border-none bg-background px-4 text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-primary/10 bg-background/40 px-4 py-3">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/80">
                          Continuing now
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Keep this past-started session live instead of closing it at the current time.
                        </p>
                      </div>
                      <Switch
                        checked={manualEntry.continueNow}
                        onCheckedChange={(checked) =>
                          setManualEntry((prev) => ({ ...prev, continueNow: checked }))
                        }
                        aria-label="Keep this manual entry running now"
                      />
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>



            <div className="grid items-start gap-6 lg:grid-cols-3">
              {Object.keys(categorySummary).length > 0 && (
                <Card className="overflow-hidden rounded-[2rem] border-primary/5 bg-background/60 shadow-2xl backdrop-blur-xl">
                  <CardHeader className="border-b border-primary/5 p-6">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                      Context Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {Object.entries(categorySummary)
                        .sort(([, a], [, b]) => b - a)
                        .map(([category, duration]) => (
                          <div
                            key={category}
                            className="group flex items-center justify-between rounded-2xl border border-transparent bg-muted/10 p-4 transition-all duration-300 hover:border-primary/10"
                          >
                            <span className="text-[11px] font-black uppercase tracking-tight italic text-foreground/80">
                              {category}
                            </span>
                            <Badge
                              variant="secondary"
                              className="border-primary/10 bg-primary/5 text-[9px] font-black uppercase tracking-widest text-primary"
                            >
                              {formatDuration(duration)}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="overflow-hidden rounded-3xl border-primary/5 bg-background/25 shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:border-primary/15 lg:col-span-2">
                <CardHeader className="border-b border-primary/5 p-6">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                    Chronological Logs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {filteredTimeEntries.length === 0 ? (
                      <div className="group flex flex-col items-center justify-center py-20 text-center grayscale opacity-30 transition-all duration-500 hover:opacity-100">
                        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-muted/50 transition-all duration-500 group-hover:scale-110 group-hover:bg-primary/5">
                          <Clock className="h-8 w-8 text-primary/40 transition-colors group-hover:text-primary" />
                        </div>
                        <p className="mb-1 text-xs font-black uppercase tracking-[0.2em]">Temporal Voids</p>
                        <p className="text-[10px] font-medium text-muted-foreground">
                          Zero sessions detected in current timeline scope.
                        </p>
                      </div>
                    ) : (
                      sortedFilteredEntries.slice(0, 10).map((entry) => (
                        <div
                          key={entry.id}
                          className="group relative flex flex-col items-start justify-between gap-4 rounded-[1.5rem] border border-transparent bg-muted/10 p-5 transition-all duration-500 hover:border-primary/10 hover:shadow-xl hover:shadow-primary/5 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-tight italic text-primary/80">
                                {entry.category}
                              </span>
                              {entry.projectId && (
                                <ProjectBadge projectId={entry.projectId} className="h-4 px-1.5 text-[8px]" />
                              )}
                              {entry.threads && entry.threads.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 ml-1">
                                  {entry.threads.map((thread) => {
                                    const tp = getThreadPalette(thread.color);
                                    return (
                                      <Badge
                                        key={thread.id}
                                        variant="outline"
                                        className={cn("h-4.5 text-[7px] font-black uppercase tracking-widest px-2 border-current bg-background/30", tp.bg, tp.border, tp.text)}
                                      >
                                        <span className="h-1 w-1 rounded-full shrink-0 mr-1" style={{ backgroundColor: tp.hsl }} />
                                        {thread.name}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                              {entry.isRunning && (
                                <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-primary animate-pulse">
                                  Live Flow
                                </div>
                              )}
                            </div>

                            {entry.description && (
                              <p className="mb-2 line-clamp-1 text-[11px] font-medium italic text-muted-foreground opacity-70">
                                {entry.description}
                              </p>
                            )}

                            {entry.taskId && (
                              <div className="mb-3 flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className="h-4 border-primary/30 bg-primary/5 px-1.5 py-0 text-[8px] font-black uppercase tracking-widest text-primary/60"
                                >
                                  Linked Synapse
                                </Badge>
                                <span className="truncate text-[10px] font-black text-muted-foreground/40">
                                  {findTaskTitle(entry.taskId)}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
                              {format(new Date(entry.startTime), 'MMM d, h:mm a')}
                              {entry.endTime && ` - ${format(new Date(entry.endTime), 'h:mm a')}`}
                            </div>

                            {((entry.liveUpdates && entry.liveUpdates.length > 0) || entry.notes) && (() => {
                              const hasUpdates = entry.liveUpdates && entry.liveUpdates.length > 0;
                              const reflections = getReflectionsOnly(entry.notes || '');
                              const hasNotes = !!reflections;
                              const mode = viewingNotesMode[entry.id] || (hasUpdates ? 'outliner' : 'reflections');

                              return (
                                <div className="mt-4 rounded-2xl border border-primary/10 bg-primary/5 p-4 space-y-3">
                                  {/* Tab Switcher if both are present */}
                                  {hasUpdates && hasNotes && (
                                    <div className="flex items-center gap-1.5 border-b border-primary/5 pb-2">
                                      <button
                                        type="button"
                                        onClick={() => setViewingNotesMode((p) => ({ ...p, [entry.id]: 'outliner' }))}
                                        className={cn(
                                          "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md transition-all border",
                                          mode === 'outliner'
                                            ? "bg-primary/10 border-primary/20 text-primary"
                                            : "border-transparent text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30"
                                        )}
                                      >
                                        Chronos Outliner
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setViewingNotesMode((p) => ({ ...p, [entry.id]: 'reflections' }))}
                                        className={cn(
                                          "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md transition-all border",
                                          mode === 'reflections'
                                            ? "bg-primary/10 border-primary/20 text-primary"
                                            : "border-transparent text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30"
                                        )}
                                      >
                                        Reflections
                                      </button>
                                    </div>
                                  )}

                                  {mode === 'outliner' && hasUpdates ? (
                                    <CompletedOutliner entry={entry} />
                                  ) : (
                                    <MarkdownNotesRenderer notes={hasUpdates ? reflections : (entry.notes || '')} />
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          <div className="flex w-full items-center gap-3 sm:w-auto">
                            {entry.duration !== undefined && (
                              <div className="rounded-2xl border border-primary/10 bg-primary/5 px-5 py-2.5 text-[13px] font-black tracking-tighter text-primary tabular-nums">
                                {formatDuration(entry.duration)}
                              </div>
                            )}
                            <div className="ml-auto flex shrink-0 gap-1 opacity-100 transition-all duration-300 sm:opacity-0 group-hover:opacity-100">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditNotes(entry);
                                }}
                                className="h-9 w-9 rounded-xl transition-all hover:bg-primary/10 hover:text-primary"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void deleteTimeEntry(entry.id);
                                }}
                                className="h-9 w-9 rounded-xl transition-all hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Dialog
            open={isSummaryDialogOpen}
            onOpenChange={(open) => {
              setIsSummaryDialogOpen(open);
              if (!open) {
                setEditingEntryId(null);
                setStoppingEntryId(null);
                setPendingManualEntry(null);
                setSessionSummary('');
                setSessionProjectId('');
                setSessionTaskId('');
                setIsSummaryTaskSearchOpen(false);
              }
            }}
          >
            <DialogContent className="max-h-[90vh] max-w-xl overflow-hidden rounded-[2rem] border-primary/10 bg-background/95 p-0 shadow-2xl backdrop-blur-2xl">
              <ScrollArea className="max-h-[85vh]">
                <div className="p-8 sm:p-10">
                <DialogHeader className="mb-8">
                  <DialogTitle className="text-2xl font-black italic tracking-tight">
                    {editingEntryId ? 'Edit Session Notes' : 'Session Summary'}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-black uppercase tracking-widest opacity-40">
                    {editingEntryId
                      ? 'Update your reflections for this session'
                      : pendingManualEntry
                        ? pendingManualEntry.isRunning
                          ? 'Review this past-started live session before it joins your active timers'
                          : `Confirm your manual calibration for ${formatDuration(pendingManualEntry.duration || 0)}`
                        : activeEntryBeingStopped
                          ? `Capture the outcomes for ${activeEntryBeingStopped.category}`
                        : 'Capture the outcomes of this temporal cycle'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                      Project & Task
                    </Label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/50">
                          Project
                        </Label>
                        <ProjectSelector
                          value={sessionProjectId}
                          onChange={(value) => {
                            setSessionProjectId(value || '');
                            setSessionTaskId('');
                          }}
                          placeholder="Personal Project"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/50">
                          Task
                        </Label>
                        <Popover open={isSummaryTaskSearchOpen} onOpenChange={setIsSummaryTaskSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-12 w-full justify-between rounded-xl border-primary/5 bg-muted/30 px-3 font-medium hover:bg-muted/40"
                            >
                              <span className="truncate text-left">
                                {sessionTaskId
                                  ? tasks.find((task) => task.id === sessionTaskId)?.title || 'Select task'
                                  : 'Search and select task'}
                              </span>
                              <Search className="h-4 w-4 shrink-0 opacity-60" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[360px] rounded-2xl border-primary/10 bg-background/95 p-0 shadow-2xl backdrop-blur-xl" align="start">
                            <Command className="rounded-2xl bg-transparent">
                              <CommandInput className="border-primary/10" placeholder="Search tasks..." />
                              <CommandList
                                className="custom-scrollbar max-h-[280px]"
                                onWheel={(e) => {
                                  e.stopPropagation();
                                  e.currentTarget.scrollTop += e.deltaY;
                                }}
                              >
                                <CommandEmpty>No matching task found.</CommandEmpty>
                                <CommandGroup heading={sessionProjectId ? 'Selected project first' : 'Personal tasks first'}>
                                  <CommandItem
                                    value="No task"
                                    onSelect={() => {
                                      setSessionTaskId('');
                                      setIsSummaryTaskSearchOpen(false);
                                    }}
                                    className="rounded-xl px-3 py-2.5"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-bold">No task</p>
                                      <p className="truncate text-[10px] font-medium text-muted-foreground">
                                        Leave this session unlinked
                                      </p>
                                    </div>
                                  </CommandItem>
                                  {summarySearchTasks.map((task) => {
                                    const projectName = task.projectId
                                      ? projects.find((project) => project.id === task.projectId)?.name || 'Project'
                                      : 'Personal';

                                    return (
                                      <CommandItem
                                        key={task.id}
                                        value={`${task.title} ${projectName}`}
                                        onSelect={() => {
                                          setSessionTaskId(task.id);
                                          setSessionProjectId(task.projectId || '');
                                          setSessionCategory((prev) =>
                                            !prev.trim() || prev === 'General' ? task.title : prev
                                          );
                                          setIsSummaryTaskSearchOpen(false);
                                        }}
                                        className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                                      >
                                        <div className="min-w-0">
                                          <p className="truncate text-xs font-bold">{task.title}</p>
                                          <p className="truncate text-[10px] font-medium text-muted-foreground">
                                            {projectName}
                                          </p>
                                        </div>
                                        {task.projectId ? (
                                          <ProjectBadge projectId={task.projectId} className="h-5 shrink-0" />
                                        ) : (
                                          <Badge variant="outline" className="h-5 shrink-0 text-[8px] uppercase tracking-widest">
                                            Personal
                                          </Badge>
                                        )}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <p className="text-[10px] leading-relaxed text-muted-foreground/60">
                          Search any task here too. Picking one will sync the project automatically.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                      Objective Category
                    </Label>
                    <Input
                      value={sessionCategory}
                      onChange={(e) => setSessionCategory(e.target.value)}
                      placeholder="e.g. Deep Work, Admin, Review"
                      className="h-12 rounded-xl border-primary/5 bg-muted/30 px-4 font-medium"
                    />
                    <p className="text-[10px] leading-relaxed text-muted-foreground/60">
                      This is the session label that appears in your timeline. Picking a task can prefill it.
                    </p>
                  </div>

                  {editingEntryId && activeEntryBeingEdited && (
                    <>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                          Session Timing
                        </Label>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/50">
                              Start Time
                            </Label>
                            <Input
                              type="datetime-local"
                              value={editingStartTime}
                              onChange={(e) => setEditingStartTime(e.target.value)}
                              className="h-12 rounded-xl border-primary/5 bg-muted/30 font-medium"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/50">
                              End Time
                            </Label>
                            <Input
                              type="datetime-local"
                              value={editingEndTime}
                              onChange={(e) => setEditingEndTime(e.target.value)}
                              className="h-12 rounded-xl border-primary/5 bg-muted/30 font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      {activeEntryBeingEdited.taskId && (
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                            Linked Task
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsSummaryDialogOpen(false);
                              handleNavigateToTask(activeEntryBeingEdited.taskId!);
                            }}
                            className="w-full justify-between rounded-xl border-primary/10 bg-muted/10 px-4 py-6 text-left hover:bg-primary/5"
                          >
                            <span className="truncate text-sm font-black">
                              {findTaskTitle(activeEntryBeingEdited.taskId) || 'View linked task'}
                            </span>
                            <ArrowUpRight className="h-4 w-4 shrink-0" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {previewEntry && previewEntry.liveUpdates && previewEntry.liveUpdates.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                        Session Log Preview
                      </Label>
                      <div className="max-h-[220px] overflow-y-auto rounded-2xl border border-primary/10 bg-muted/10 p-4 custom-scrollbar text-start">
                        <CompletedOutliner entry={previewEntry} />
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                      Accomplishments & Notes
                    </Label>
                    <Textarea
                      value={sessionSummary}
                      onChange={(e) => setSessionSummary(e.target.value)}
                      placeholder="What did you achieve? Any pending items or next steps?"
                      className="min-h-[150px] resize-none rounded-2xl border-primary/5 bg-muted/30 p-4 text-base font-medium transition-all focus:ring-primary/20"
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsSummaryDialogOpen(false);
                        setEditingEntryId(null);
                        setStoppingEntryId(null);
                        setPendingManualEntry(null);
                        setSessionSummary('');
                        setSessionCategory('');
                        setSessionProjectId('');
                        setSessionTaskId('');
                        setEditingStartTime('');
                        setEditingEndTime('');
                      }}
                      className="h-14 flex-1 rounded-xl border-primary/10 text-[10px] font-black uppercase tracking-widest hover:bg-muted/50"
                    >
                      {editingEntryId ? 'Cancel' : pendingManualEntry ? 'Discard Calibration' : 'Discard & Keep Running'}
                    </Button>
                    <Button
                      onClick={handleConfirmStop}
                      className="h-14 flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                    >
                      {editingEntryId ? 'Update Notes' : 'Terminate & Save'}
                    </Button>
                  </div>

                  {!editingEntryId && (
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        if (pendingManualEntry) {
                          await addTimeEntry({
                            ...pendingManualEntry,
                            category: sessionCategory || pendingManualEntry.category,
                            taskId: sessionTaskId || undefined,
                            projectId: sessionProjectId || undefined,
                          });
                          setPendingManualEntry(null);
                          setIsSummaryDialogOpen(false);
                          setSessionCategory('');
                          setSessionProjectId('');
                          setSessionTaskId('');
                        } else if (stoppingEntryId) {
                          await stopTimeEntry(stoppingEntryId);
                          await updateTimeEntry(stoppingEntryId, {
                            category: sessionCategory || timeEntries.find((entry) => entry.id === stoppingEntryId)?.category,
                            taskId: sessionTaskId || undefined,
                            projectId: sessionProjectId || undefined,
                          });
                          setStoppingEntryId(null);
                          setIsSummaryDialogOpen(false);
                          setSessionCategory('');
                          setSessionProjectId('');
                          setSessionTaskId('');
                        }
                      }}
                      className="w-full text-[9px] font-black uppercase tracking-[0.2em] opacity-30 transition-opacity hover:opacity-100"
                    >
                      {pendingManualEntry ? 'Save Calibration Without Notes' : 'Terminate without summary'}
                    </Button>
                  )}
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
          </Dialog>

          <Dialog
            open={isTimelineMapperOpen}
            onOpenChange={(open) => {
              setIsTimelineMapperOpen(open);
              if (!open) {
                setIsCreationMode(false);
                setIsZoomMarqueeMode(false);
                setSelectionRange(null);
              }
            }}
          >
            <DialogContent className={`${isModalExpanded ? 'sm:max-w-[95vw] w-[95vw]' : 'sm:max-w-4xl w-[95vw]'} max-h-[90vh] p-0 overflow-hidden rounded-[2rem] border-primary/10 bg-background/95 backdrop-blur-2xl shadow-2xl transition-all duration-300 ease-in-out`}>
              <div className="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <DialogHeader className="mb-6 sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-primary/10"
                          onClick={() => setSelectedDayDate((prev) => subDays(prev, 1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                              <DialogTitle className="text-2xl font-black tracking-tight cursor-pointer hover:text-primary transition-colors">
                                {format(selectedDayDate, 'EEEE, MMMM d, yyyy')}
                              </DialogTitle>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl border-primary/10" align="start">
                            <CalendarPicker
                              mode="single"
                              selected={selectedDayDate}
                              onSelect={(date) => date && setSelectedDayDate(date)}
                              initialFocus
                              className="rounded-2xl"
                            />
                          </PopoverContent>
                        </Popover>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg hover:bg-primary/10"
                          onClick={() => setSelectedDayDate((prev) => addDays(prev, 1))}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <DialogDescription className="text-xs font-black uppercase tracking-widest opacity-40 px-10">
                        Daily Time Allocation
                      </DialogDescription>
                    </div>

                    <div className="flex items-center gap-2 no-capture">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 shadow-lg shadow-primary/5 transition-all"
                        onClick={handleCapture}
                        title="Social Media Share Capture"
                        disabled={isCapturing}
                      >
                        <Camera className={`h-5 w-5 ${isCapturing ? 'animate-pulse' : ''}`} />
                      </Button>

                      <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-primary/5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => setZoomLevel((prev) => Math.max(1, prev - 1))}
                          disabled={zoomLevel <= 1}
                        >
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          className="px-2 h-8 text-[10px] font-black rounded-lg hover:bg-primary/10 transition-colors flex items-center gap-1.5"
                          onClick={() => {
                            setZoomLevel(1);
                            if (timelineRef.current) {
                              timelineRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                            }
                          }}
                          title="Reset View (1x)"
                        >
                          {zoomLevel > 1 && <RotateCcw className="h-3 w-3 animate-in fade-in zoom-in duration-300" />}
                          {zoomLevel.toFixed(1)}x
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => setZoomLevel((prev) => Math.min(20, prev + 1))}
                          disabled={zoomLevel >= 20}
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        variant={isZoomMarqueeMode ? 'default' : 'ghost'}
                        size="icon"
                        className={`h-10 w-10 rounded-xl transition-all ${isZoomMarqueeMode ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-muted/30 border border-primary/5 hover:bg-primary/5'}`}
                        onClick={() => {
                          setIsZoomMarqueeMode(!isZoomMarqueeMode);
                          setIsCreationMode(false);
                        }}
                        title={isZoomMarqueeMode ? 'Disable Zoom Tool' : 'Zoom to Selection'}
                      >
                        <Search className="h-4 w-4" />
                      </Button>

                      <Button
                        variant={isCreationMode ? 'default' : 'ghost'}
                        size="icon"
                        className={`h-10 w-10 rounded-xl transition-all ${isCreationMode ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-muted/30 border border-primary/5 hover:bg-primary/5'}`}
                        onClick={() => {
                          setIsCreationMode(!isCreationMode);
                          setIsZoomMarqueeMode(false);
                        }}
                        title={isCreationMode ? 'Disable Selection Mode' : 'Enable Selection Mode'}
                      >
                        <Plus className={`h-4 w-4 transition-transform duration-300 ${isCreationMode ? 'rotate-45' : ''}`} />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl bg-muted/30 border border-primary/5 hover:bg-primary/5"
                        onClick={() => setIsModalExpanded(!isModalExpanded)}
                        title={isModalExpanded ? 'Close Full Width' : 'Full Width View'}
                      >
                        {isModalExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                <div
                  ref={captureAreaRef}
                  className={`p-10 transition-all duration-500 ${isCapturing ? 'bg-[#0a0a0a] rounded-[3rem] border-4 border-primary/20' : ''}`}
                  style={isCapturing ? { width: '1200px' } : {}}
                >
                  {selectedDayDate && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <Card className="border-primary/5 rounded-2xl overflow-hidden">
                          <CardContent className="p-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Time</p>
                            <p className="text-2xl font-black">
                              {formatDuration(selectedDayEntries.reduce((sum, entry) => sum + getEntryDuration(entry), 0))}
                            </p>
                          </CardContent>
                        </Card>
                        <Card className="border-primary/5 rounded-2xl overflow-hidden">
                          <CardContent className="p-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Sessions</p>
                            <p className="text-2xl font-black">{selectedDayEntries.length}</p>
                          </CardContent>
                        </Card>
                        <Card className="border-primary/5 rounded-2xl overflow-hidden">
                          <CardContent className="p-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Avg Session</p>
                            <p className="text-2xl font-black">
                              {selectedDayEntries.length > 0
                                ? formatDuration(Math.round(selectedDayEntries.reduce((sum, entry) => sum + getEntryDuration(entry), 0) / selectedDayEntries.length))
                                : '0m'}
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Multi-Track Timeline</p>
                            <p className="mt-1 text-[8px] font-bold text-muted-foreground/60">Audio/video-style lanes for concurrent tasks and contexts</p>
                          </div>
                          <p className="text-[8px] font-bold text-muted-foreground/60">Drag to Pan • Zoom for Precision</p>
                        </div>

                        <style dangerouslySetInnerHTML={{
                          __html: `
                            .occupied-mesh {
                              background-image: repeating-linear-gradient(
                                -45deg,
                                rgba(245, 158, 11, 0.15) 0px,
                                rgba(245, 158, 11, 0.15) 1px,
                                transparent 1px,
                                transparent 5px
                              );
                              background-size: 8px 8px;
                            }
                            @keyframes flow-pulse {
                              0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); border-color: rgba(255, 255, 255, 0.6); }
                              50% { box-shadow: 0 0 20px 4px rgba(255, 255, 255, 0.2); border-color: rgba(255, 255, 255, 1); }
                              100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); border-color: rgba(255, 255, 255, 0.6); }
                            }
                            .animate-flow-pulse {
                              animation: flow-pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
                            }
                            @keyframes breathing-glow {
                              0% { box-shadow: 0 0 0px rgba(239, 68, 68, 0.4); opacity: 0.8; }
                              50% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.8); opacity: 1; }
                              100% { box-shadow: 0 0 0px rgba(239, 68, 68, 0.4); opacity: 0.8; }
                            }
                            .animate-breathing-glow {
                              animation: breathing-glow 2.5s infinite ease-in-out;
                            }
                          `,
                        }} />

                        <div
                          ref={timelineRef}
                          className="custom-scrollbar relative bg-muted/20 rounded-2xl p-6 overflow-x-auto select-none cursor-grab active:cursor-grabbing"
                          onMouseDown={(e) => {
                            if (isCreationMode || isZoomMarqueeMode || !timelineRef.current) return;
                            const scrollContainer = timelineRef.current;
                            const startX = e.pageX - scrollContainer.offsetLeft;
                            const scrollLeft = scrollContainer.scrollLeft;

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                              const x = moveEvent.pageX - scrollContainer.offsetLeft;
                              const walk = (x - startX) * 2;
                              scrollContainer.scrollLeft = scrollLeft - walk;
                            };

                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove);
                              document.removeEventListener('mouseup', handleMouseUp);
                            };

                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                          }}
                        >
                          <div className="relative" style={{ width: `${zoomLevel * 100}%`, minWidth: '100%' }}>
                            <div className="relative h-6 mb-4" style={{ width: '100%' }}>
                              {Array.from({ length: 25 }).map((_, hour) => (
                                <div
                                  key={`label-h-${hour}`}
                                  className="absolute -translate-x-1/2 flex flex-col items-center"
                                  style={{ left: `${(hour / 24) * 100}%` }}
                                >
                                  <p className="text-[10px] font-black text-primary leading-none">
                                    {(hour % 24).toString().padStart(2, '0')}
                                  </p>
                                  <div className="w-px h-1 bg-primary/30 mt-1" />
                                </div>
                              ))}
                            </div>

                            <div className="space-y-3">
                              {timelineTracks.length > 0 ? timelineTracks.map((track) => (
                                <div key={track.key} className="grid grid-cols-[180px_minmax(0,1fr)] gap-4 items-center">
                                  <div className="rounded-xl border border-primary/5 bg-background/70 px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground/60">Track</p>
                                      {track.entries.some((entry) => entry.isRunning) && (
                                        <Badge className="h-5 bg-primary/15 text-primary border border-primary/20 text-[8px] font-black uppercase tracking-widest animate-pulse">
                                          Live
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="mt-1 text-sm font-black truncate">{track.label}</p>
                                    <p className="mt-1 text-[9px] font-bold text-muted-foreground/50">
                                      {track.entries.length} {track.entries.length === 1 ? 'clip' : 'clips'}
                                    </p>
                                  </div>

                                  <div
                                    className={`relative h-20 bg-muted/40 rounded-2xl border border-primary/5 shadow-inner transition-all overflow-hidden ${isCreationMode ? 'cursor-crosshair ring-2 ring-primary/20' : isZoomMarqueeMode ? 'cursor-zoom-in ring-2 ring-primary/20 bg-primary/5' : ''} ${isSelecting ? 'scale-[1.005] bg-muted/60 shadow-xl' : ''}`}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = 'copy';
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      const templateName = e.dataTransfer.getData('application/habit-template');
                                      if (!templateName) return;
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const x = e.clientX - rect.left;
                                      const hour = (x / rect.width) * 24;
                                      handleDropTemplate(templateName, hour);
                                    }}
                                    onMouseDown={(e) => {
                                      if (!isCreationMode && !isZoomMarqueeMode) return;
                                      e.stopPropagation();

                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const x = e.clientX - rect.left;
                                      const hour = (x / rect.width) * 24;
                                      setIsSelecting(true);
                                      setSelectionRange({ start: hour, end: hour });

                                      const handleMouseMove = (moveEvent: MouseEvent) => {
                                        const moveX = moveEvent.clientX - rect.left;
                                        let moveHour = Math.max(0, Math.min(24, (moveX / rect.width) * 24));
                                        moveHour = Math.round(moveHour * 4) / 4;
                                        setSelectionRange((prev) => prev ? { ...prev, end: moveHour } : null);
                                      };

                                      const handleMouseUp = () => {
                                        document.removeEventListener('mousemove', handleMouseMove);
                                        document.removeEventListener('mouseup', handleMouseUp);
                                        setSelectionRange((currentRange) => {
                                          if (currentRange && Math.abs(currentRange.start - currentRange.end) > 0.05) {
                                            const startHour = Math.min(currentRange.start, currentRange.end);
                                            const endHour = Math.max(currentRange.start, currentRange.end);
                                            if (isZoomMarqueeMode) {
                                              const selectionDuration = endHour - startHour;
                                              const targetZoom = Math.min(Math.max(24 / selectionDuration, 1), 20);
                                              setZoomLevel(targetZoom);
                                              setTimeout(() => {
                                                if (timelineRef.current) {
                                                  const containerWidth = timelineRef.current.clientWidth;
                                                  const totalWidth = timelineRef.current.scrollWidth;
                                                  const centerHour = (startHour + endHour) / 2;
                                                  const scrollTarget = (centerHour / 24) * totalWidth - containerWidth / 2;
                                                  timelineRef.current.scrollTo({ left: scrollTarget, behavior: 'smooth' });
                                                }
                                              }, 100);
                                              setIsZoomMarqueeMode(false);
                                            } else {
                                              buildManualEntryFromRange(startHour, endHour);
                                            }
                                          }
                                          return null;
                                        });
                                        setIsSelecting(false);
                                      };

                                      document.addEventListener('mousemove', handleMouseMove);
                                      document.addEventListener('mouseup', handleMouseUp);
                                    }}
                                  >
                                    <div
                                      className="absolute inset-0 pointer-events-none opacity-100 transition-opacity duration-1000 z-0 blur-lg"
                                      style={{ background: heatmapGradient }}
                                    />

                                    {selectionRange && (
                                      <div
                                        className="absolute top-0 bottom-0 bg-primary/20 border-x border-primary/50 z-20 pointer-events-none"
                                        style={{
                                          left: `${(Math.min(selectionRange.start, selectionRange.end) / 24) * 100}%`,
                                          width: `${(Math.abs(selectionRange.end - selectionRange.start) / 24) * 100}%`,
                                          zIndex: 30,
                                        }}
                                      />
                                    )}

                                    {Array.from({ length: 25 }).map((_, hour) => (
                                      <div
                                        key={`${track.key}-hour-grid-${hour}`}
                                        className="absolute top-0 bottom-0 border-l border-primary/10 z-10 pointer-events-none"
                                        style={{ left: `${(hour / 24) * 100}%` }}
                                      />
                                    ))}

                                    {track.entries.map((entry) => {
                                      const startTime = new Date(entry.startTime);
                                      const endTime = entry.endTime ? new Date(entry.endTime) : currentTime;
                                      const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                                      const endHour = endTime.getHours() + endTime.getMinutes() / 60;
                                      const duration = Math.max(0.1, endHour - startHour);
                                      const left = (startHour / 24) * 100;
                                      const width = (duration / 24) * 100;
                                      const categoryColor = getCategoryColor(entry.category);
                                      const isDeepFlow = getEntryDuration(entry) >= 90;
                                      const isRunning = entry.isRunning;

                                      return (
                                        <div
                                          key={entry.id}
                                          className={`absolute rounded-lg shadow-lg hover:shadow-xl transition-all group cursor-pointer z-20 ${isDeepFlow ? 'border-2 border-white/60 animate-flow-pulse' : ''} ${isRunning ? 'ring-2 ring-primary/70 ring-offset-2 ring-offset-background animate-pulse' : ''}`}
                                          style={{
                                            left: `${left}%`,
                                            width: `${width}%`,
                                            top: '8px',
                                            height: '64px',
                                            background: categoryColor,
                                            boxShadow: isRunning ? '0 0 0 1px rgba(255,255,255,0.15), 0 0 24px rgba(59,130,246,0.3)' : undefined,
                                          }}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            handleEditNotes(entry);
                                          }}
                                          title={`${entry.category} | ${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}: ${entry.description || 'Session'}`}
                                        >
                                          <div className="absolute inset-0 flex flex-col items-center justify-center px-1 overflow-hidden pointer-events-none">
                                            {isRunning && (
                                              <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/25 px-1.5 py-0.5">
                                                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                                <span className="text-[6px] font-black uppercase tracking-[0.18em] text-white">Live</span>
                                              </div>
                                            )}
                                            <p className="text-[8px] font-black text-primary-foreground leading-none">
                                              {isRunning ? getElapsedTime(startTime, currentTime) : `${getEntryDuration(entry)}m`}
                                            </p>
                                            {isDeepFlow && (
                                              <p className="text-[6px] font-black text-white uppercase tracking-[0.1em] mt-0.5 opacity-80">
                                                Deep Flow
                                              </p>
                                            )}
                                          </div>
                                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-5 w-5 bg-black/20 hover:bg-destructive text-white border-none rounded-md"
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                void deleteTimeEntry(entry.id);
                                              }}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {selectedDayDate.toDateString() === new Date().toDateString() && (
                                      <div
                                        className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10 animate-breathing-glow"
                                        style={{
                                          left: `${(((currentTime.getHours() + currentTime.getMinutes() / 60) / 24) * 100)}%`,
                                          boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
                                        }}
                                      >
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-destructive rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )) : (
                                <div className="rounded-2xl border border-dashed border-primary/10 bg-background/40 px-6 py-10 text-center text-sm italic text-muted-foreground">
                                  No timeline tracks for this day yet.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Quick Routine Stencils</p>
                          <p className="text-[8px] font-bold text-muted-foreground/40 italic">Drag onto timeline to stamp</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {ROUTINE_TEMPLATES.map((template) => {
                            const Icon = template.icon;
                            return (
                              <div
                                key={template.name}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('application/habit-template', template.name);
                                  e.dataTransfer.effectAllowed = 'copy';
                                }}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-primary/5 hover:border-primary/20 hover:bg-primary/5 transition-all cursor-grab active:cursor-grabbing group shadow-sm hover:shadow-md"
                              >
                                <div
                                  className="w-4 h-4 rounded-lg flex items-center justify-center p-0.5"
                                  style={{ background: getCategoryColor(template.category) }}
                                >
                                  <Icon className="h-full w-full text-white" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black uppercase tracking-tight leading-none">{template.name}</span>
                                  <span className="text-[7px] font-bold text-muted-foreground/60 leading-tight">{formatDuration(template.duration)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <Separator className="bg-primary/5" />

                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Session Details</p>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {selectedDayEntries.length > 0 ? selectedDayEntries.map((entry) => (
                            <div key={entry.id} className={`p-4 rounded-xl bg-muted/20 border transition-all ${entry.isRunning ? 'border-primary/25 bg-primary/5 shadow-lg shadow-primary/5' : 'border-primary/5 hover:border-primary/20'}`}>
                              <div className="flex items-start gap-4">
                                <div
                                  className={`w-1 self-stretch rounded-full ${entry.isRunning ? 'opacity-100 shadow-[0_0_12px_rgba(59,130,246,0.45)]' : 'opacity-60'}`}
                                  style={{ background: getCategoryColor(entry.category) }}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-black">{entry.description || 'Calibration Session'}</p>
                                    <Badge variant="outline" className="text-[8px] h-4 font-bold border-primary/10 bg-primary/5 uppercase tracking-tighter">
                                      {entry.category}
                                    </Badge>
                                    {entry.isRunning && (
                                      <Badge className="h-4 bg-primary/15 text-primary border border-primary/20 text-[8px] font-black uppercase tracking-widest animate-pulse">
                                        Live Flow
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[10px] font-bold text-muted-foreground">
                                    {format(new Date(entry.startTime), 'h:mm a')} - {entry.endTime ? format(new Date(entry.endTime), 'h:mm a') : 'Running'}
                                  </p>
                                  {entry.isRunning && (
                                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-primary/70">
                                      Live elapsed {getElapsedTime(new Date(entry.startTime), currentTime)}
                                    </p>
                                  )}
                                  {((entry.liveUpdates && entry.liveUpdates.length > 0) || entry.notes) && (() => {
                                    const hasUpdates = entry.liveUpdates && entry.liveUpdates.length > 0;
                                    const reflections = getReflectionsOnly(entry.notes || '');
                                    const hasNotes = !!reflections;
                                    const mode = viewingNotesMode[entry.id] || (hasUpdates ? 'outliner' : 'reflections');

                                    return (
                                      <div className="mt-3 rounded-2xl border border-primary/10 bg-primary/5 p-4 space-y-3 text-start">
                                        {/* Tab Switcher if both are present */}
                                        {hasUpdates && hasNotes && (
                                          <div className="flex items-center gap-1.5 border-b border-primary/5 pb-2">
                                            <button
                                              type="button"
                                              onClick={() => setViewingNotesMode((p) => ({ ...p, [entry.id]: 'outliner' }))}
                                              className={cn(
                                                "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md transition-all border",
                                                mode === 'outliner'
                                                  ? "bg-primary/10 border-primary/20 text-primary"
                                                  : "border-transparent text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30"
                                              )}
                                            >
                                              Chronos Outliner
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setViewingNotesMode((p) => ({ ...p, [entry.id]: 'reflections' }))}
                                              className={cn(
                                                "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md transition-all border",
                                                mode === 'reflections'
                                                  ? "bg-primary/10 border-primary/20 text-primary"
                                                  : "border-transparent text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/30"
                                              )}
                                            >
                                              Reflections
                                            </button>
                                          </div>
                                        )}

                                        {mode === 'outliner' && hasUpdates ? (
                                          <CompletedOutliner entry={entry} />
                                        ) : (
                                          <MarkdownNotesRenderer notes={hasUpdates ? reflections : (entry.notes || '')} />
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div className="flex items-center gap-2 no-capture">
                                  <Badge variant="secondary" className={`font-black ${entry.isRunning ? 'bg-primary text-primary-foreground' : ''}`}>
                                    {entry.isRunning ? getElapsedTime(new Date(entry.startTime), currentTime) : formatDuration(getEntryDuration(entry))}
                                  </Badge>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/10" onClick={() => handleEditNotes(entry)}>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => void deleteTimeEntry(entry.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )) : (
                            <p className="text-center text-sm text-muted-foreground italic py-8">No sessions recorded for this day</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute>
  );
}
