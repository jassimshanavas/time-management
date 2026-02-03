'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStore } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Edit,
  Edit2,
  Trash2,
  Target,
  Flag,
  CheckCircle2,
  Circle,
  PlayCircle,
  Tag,
  MessageSquare,
  Send,
  X,
  ListTodo,
  Link2,
  BookOpen,
  Play,
  Square,
  Plus,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Zap,
  TrendingUp,
  FileText,
  Search,
  Coffee,
  Camera,
  Download,
  Share2,
  Settings
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { toast } from 'sonner';
import { format, formatDistanceToNow, addDays, subDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { Task, TaskComment, TaskSubtask, TaskJournalEntry, TimeEntry } from '@/types';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';

const PRESET_CATEGORIES = [
  'Work',
  'Deep Work',
  'Meetings',
  'Research',
  'Personal',
  'Planning'
];

const ROUTINE_TEMPLATES = [
  { name: 'Focus Session', duration: 90, category: 'Deep Work', icon: Zap },
  { name: 'Admin Sprint', duration: 30, category: 'Work', icon: FileText },
  { name: 'Quick Catchup', duration: 15, category: 'Meetings', icon: MessageSquare },
  { name: 'Research Block', duration: 60, category: 'Research', icon: Search },
  { name: 'Break', duration: 15, category: 'Personal', icon: Coffee },
];

function TaskDetailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const taskId = params.id as string;
  const {
    tasks,
    goals,
    updateTask,
    deleteTask,
    timeEntries,
    addTimeEntry,
    stopTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
  } = useStore();
  const [task, setTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newJournalEntry, setNewJournalEntry] = useState('');
  const [isAddingJournal, setIsAddingJournal] = useState(false);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [isDependencyModalOpen, setIsDependencyModalOpen] = useState(false);
  const [sessionSummary, setSessionSummary] = useState('');
  const [sessionCategory, setSessionCategory] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [pendingManualEntry, setPendingManualEntry] = useState<Omit<TimeEntry, 'id'> | null>(null);
  const [timerForm, setTimerForm] = useState({ category: '', description: '' });
  const [manualEntry, setManualEntry] = useState({
    category: '',
    description: '',
    hours: '0',
    minutes: '30',
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAllDependencies, setShowAllDependencies] = useState(false);
  const [showAllTimeEntries, setShowAllTimeEntries] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const [isModalExpanded, setIsModalExpanded] = useState(false);
  const [isCreationMode, setIsCreationMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectionRange, setSelectionRange] = useState<{ start: number, end: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isZoomMarqueeMode, setIsZoomMarqueeMode] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const captureAreaRef = useRef<HTMLDivElement>(null);

  // Helper function to safely convert dates
  const toDate = useCallback((date: any): Date | null => {
    if (!date) return null;
    try {
      // Handle Firestore Timestamp
      if (date?.toDate && typeof date.toDate === 'function') {
        return date.toDate();
      }
      // Handle Date object
      if (date instanceof Date) {
        return isNaN(date.getTime()) ? null : date;
      }
      // Handle string or number
      const converted = new Date(date);
      return isNaN(converted.getTime()) ? null : converted;
    } catch {
      return null;
    }
  }, []);

  // Calculate Biological Prime Time (Heatmap)
  const heatmapGradient = useMemo(() => {
    const scores = new Array(24).fill(0);
    timeEntries.filter(e => !e.isRunning).forEach(entry => {
      const start = toDate(entry.startTime);
      const end = toDate(entry.endTime);
      if (!start || !end) return;

      const startHour = start.getHours() + start.getMinutes() / 60;
      const endHour = end.getHours() + end.getMinutes() / 60;

      for (let h = 0; h < 24; h++) {
        const overlap = Math.max(0, Math.min(h + 1, endHour) - Math.max(h, startHour));
        scores[h] += overlap;
      }
    });

    const max = Math.max(...scores, 1);
    const normalized = scores.map(s => s / max);

    const gradientParts = normalized.map((score, i) => {
      const pos = (i / 24) * 100;
      // Use a slightly more saturated HSL for professional presence
      return `hsl(263 70% 50% / ${score * 0.5}) ${pos}%`;
    });
    gradientParts.push(`hsl(263 70% 50% / ${normalized[23] * 0.5}) 100%`);

    return `linear-gradient(to right, ${gradientParts.join(', ')})`;
  }, [timeEntries, toDate]);

  // Initialize category when task is loaded
  useEffect(() => {
    if (task && !timerForm.category) {
      setTimerForm(prev => ({ ...prev, category: task.title }));
    }
  }, [task]);

  const runningEntry = timeEntries.find((entry) => entry.isRunning);
  const taskRunningEntry =
    runningEntry && task && runningEntry.taskId === task?.id ? runningEntry : null;
  const otherTaskRunning =
    runningEntry && task && runningEntry.taskId && runningEntry.taskId !== task.id
      ? runningEntry
      : null;

  const formatDuration = (minutes: number) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  const getElapsedTime = (startTime: Date) => {
    const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getEntryDuration = (entry: TimeEntry) => {
    const start = toDate(entry.startTime);
    if (!start) return 0;
    if (entry.duration) return entry.duration;
    if (entry.isRunning) {
      return Math.max(
        0,
        Math.floor((currentTime.getTime() - start.getTime()) / 60000)
      );
    }
    const end = entry.endTime ? toDate(entry.endTime) : null;
    const effectiveEnd = end || currentTime;
    return Math.max(
      0,
      Math.floor((effectiveEnd.getTime() - start.getTime()) / 60000)
    );
  };

  const getCategoryColor = (category?: string) => {
    if (!category) return 'hsl(var(--primary))';

    const categories = [
      { name: 'Work', color: 'hsl(221, 83%, 53%)' }, // Blue
      { name: 'Deep Work', color: 'hsl(262, 83%, 58%)' }, // Purple
      { name: 'Meetings', color: 'hsl(142, 71%, 45%)' }, // Green
      { name: 'Research', color: 'hsl(32, 95%, 44%)' }, // Orange
      { name: 'Personal', color: 'hsl(346, 84%, 61%)' }, // Pink
      { name: 'Planning', color: 'hsl(173, 80%, 40%)' }, // Teal
    ];

    const found = categories.find(c => c.name.toLowerCase() === category.toLowerCase());
    if (found) return found.color;

    // Fallback: Generate a color from string hash
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 65%, 55%)`;
  };

  const isSameDay = (dateA: Date, dateB: Date) =>
    dateA.toDateString() === dateB.toDateString();

  const todayDate = new Date();

  const handleStopTimer = (id: string) => {
    const entry = timeEntries.find(e => e.id === id);
    if (entry) {
      setSessionCategory(entry.category || task?.title || '');
    }
    setIsSummaryDialogOpen(true);
  };

  const handleConfirmStop = async () => {
    if (editingEntryId) {
      await updateTimeEntry(editingEntryId, {
        notes: sessionSummary,
        category: sessionCategory
      });
      setEditingEntryId(null);
    } else if (pendingManualEntry) {
      await addTimeEntry({
        ...pendingManualEntry,
        notes: sessionSummary,
        category: sessionCategory || pendingManualEntry.category,
      });
      setPendingManualEntry(null);
      setManualEntry((prev) => ({
        ...prev,
        description: '',
        hours: '0',
        minutes: '30',
      }));
    } else if (taskRunningEntry) {
      await stopTimeEntry(taskRunningEntry.id, sessionSummary);
    }
    setSessionSummary('');
    setSessionCategory('');
    setIsSummaryDialogOpen(false);
  };

  const handleEditNotes = (entry: TimeEntry) => {
    setEditingEntryId(entry.id);
    setSessionSummary(entry.notes || '');
    setSessionCategory(entry.category || task?.title || '');
    setIsSummaryDialogOpen(true);
  };

  const handleDropTemplate = (templateName: string, hour: number) => {
    if (!task || !selectedDayDate) return;
    const template = ROUTINE_TEMPLATES.find(t => t.name === templateName);
    if (!template) return;

    const start = new Date(selectedDayDate);
    start.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);

    const end = new Date(start.getTime() + template.duration * 60000);

    setPendingManualEntry({
      category: template.category,
      description: template.name,
      taskId: task.id,
      startTime: start,
      endTime: end,
      duration: template.duration,
      isRunning: false,
    });
    setSessionSummary('');
    setSessionCategory(template.category);
    setIsSummaryDialogOpen(true);
  };

  const handleStartTaskTimer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !timerForm.category.trim()) return;
    if (otherTaskRunning) {
      alert('Another timer is currently running. Please stop it before starting a new one.');
      return;
    }
    await addTimeEntry({
      category: timerForm.category.trim(),
      description: timerForm.description.trim() || undefined,
      taskId: task.id,
      startTime: new Date(),
      isRunning: true,
    });
    setTimerForm((prev) => ({ ...prev, description: '' }));
  };

  const handleLogManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    const hours = parseInt(manualEntry.hours, 10) || 0;
    const minutes = parseInt(manualEntry.minutes, 10) || 0;
    const totalMinutes = hours * 60 + minutes;
    if (totalMinutes <= 0) return;
    const now = new Date();
    const startTime = new Date(now.getTime() - totalMinutes * 60000);

    const timeString = format(startTime, 'h:mm a');
    const baseDescription = manualEntry.description.trim() || 'Manual Calibration';
    const finalDescription = `${baseDescription} (Started at ${timeString})`;

    setPendingManualEntry({
      category: manualEntry.category.trim() || task.title,
      description: finalDescription,
      taskId: task.id,
      startTime,
      endTime: now,
      duration: totalMinutes,
      isRunning: false,
    });
    setSessionSummary(manualEntry.description.trim() || '');
    setSessionCategory(manualEntry.category.trim() || task.title);
    setIsSummaryDialogOpen(true);
  };

  const handleResumeEntry = async (entry: TimeEntry) => {
    if (!task || runningEntry) return;
    await addTimeEntry({
      category: entry.category,
      description: entry.description,
      taskId: task.id,
      startTime: new Date(),
      isRunning: true,
    });
  };

  const handleCapture = async () => {
    if (!captureAreaRef.current) return;

    setIsCapturing(true);
    const toastId = toast.loading('Generating your Day Summary...');

    try {
      // Small delay to ensure styles and layouts are consistent
      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await htmlToImage.toPng(captureAreaRef.current, {
        cacheBust: true,
        backgroundColor: 'transparent',
        pixelRatio: 2, // High resolution
        filter: (node) => {
          const exclusionClasses = ['no-capture'];
          return !exclusionClasses.some(cls => (node as HTMLElement).classList?.contains(cls));
        }
      });

      const link = document.createElement('a');
      link.download = `habits-summary-${selectedDayDate ? format(selectedDayDate, 'yyyy-MM-dd') : 'today'}.png`;
      link.href = dataUrl;
      link.click();

      toast.success('Summary ready to share!', { id: toastId });
    } catch (err) {
      console.error('Capture failed:', err);
      toast.error('Failed to generate summary', { id: toastId });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDeleteTimeEntry = async (entryId: string) => {
    if (confirm('Delete this time entry?')) {
      await deleteTimeEntry(entryId);
    }
  };



  useEffect(() => {
    const foundTask = tasks.find(t => t.id === taskId);
    if (foundTask) {
      setTask(foundTask);
    }
  }, [taskId, tasks]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!task) return;
    setTimerForm((prev) =>
      prev.category ? prev : { ...prev, category: task.title }
    );
    setManualEntry((prev) =>
      prev.category ? prev : { ...prev, category: task.title }
    );
  }, [task]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return;

    const comment: TaskComment = {
      id: `comment-${Date.now()}`,
      text: newComment.trim(),
      createdAt: new Date(),
    };

    const updatedComments = [...(task.comments || []), comment];
    await updateTask(task.id, { comments: updatedComments });
    setNewComment('');
    setIsAddingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task) return;

    const updatedComments = (task.comments || []).filter(c => c.id !== commentId);
    await updateTask(task.id, { comments: updatedComments });
  };

  const handleAddSubtask = async () => {
    if (!task || !newSubtaskTitle.trim()) return;

    const subtask: TaskSubtask = {
      id: `subtask-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      done: false,
    };

    const updatedSubtasks = [...(task.subtasks || []), subtask];
    await updateTask(task.id, { subtasks: updatedSubtasks });
    setNewSubtaskTitle('');
    setIsAddingSubtask(false);
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!task || !task.subtasks) return;

    const updatedSubtasks = task.subtasks.map((subtask) =>
      subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask
    );
    await updateTask(task.id, { subtasks: updatedSubtasks });
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!task || !task.subtasks) return;

    const updatedSubtasks = task.subtasks.filter((subtask) => subtask.id !== subtaskId);
    await updateTask(task.id, { subtasks: updatedSubtasks });
  };

  const handleToggleDependency = async (dependencyId: string) => {
    if (!task) return;
    if (dependencyId === task.id) return;

    const currentDependencies = task.dependencyIds || [];
    const updatedDependencies = currentDependencies.includes(dependencyId)
      ? currentDependencies.filter((id) => id !== dependencyId)
      : [...currentDependencies, dependencyId];

    await updateTask(task.id, { dependencyIds: updatedDependencies });
  };

  const handleToggleDependent = async (otherTaskId: string) => {
    if (!task) return;
    const otherTask = tasks.find(t => t.id === otherTaskId);
    if (!otherTask) return;

    const currentDeps = otherTask.dependencyIds || [];
    const updatedDeps = currentDeps.includes(task.id)
      ? currentDeps.filter(id => id !== task.id)
      : [...currentDeps, task.id];

    await updateTask(otherTaskId, { dependencyIds: updatedDeps });
  };

  const handleAddJournalEntry = async () => {
    if (!task || !newJournalEntry.trim()) return;

    const entry: TaskJournalEntry = {
      id: `journal-${Date.now()}`,
      text: newJournalEntry.trim(),
      createdAt: new Date(),
    };

    const updatedJournal = [...(task.journal || []), entry];
    await updateTask(task.id, { journal: updatedJournal });
    setNewJournalEntry('');
    setIsAddingJournal(false);
  };

  const handleDeleteJournalEntry = async (entryId: string) => {
    if (!task || !task.journal) return;

    const updatedJournal = task.journal.filter((entry) => entry.id !== entryId);
    await updateTask(task.id, { journal: updatedJournal });
  };

  const taskEntries = useMemo(() => {
    if (!task) return [];
    return timeEntries.filter((entry) => entry.taskId === task.id);
  }, [timeEntries, task?.id]);

  const totalTrackedMinutes = taskEntries.reduce(
    (acc, entry) => acc + getEntryDuration(entry),
    0
  );

  const todayTrackedMinutes = taskEntries.reduce((acc, entry) => {
    const start = toDate(entry.startTime);
    if (!start) return acc;
    return isSameDay(start, todayDate) ? acc + getEntryDuration(entry) : acc;
  }, 0);

  const averageSessionMinutes = taskEntries.length
    ? Math.round(totalTrackedMinutes / taskEntries.length)
    : 0;

  const progressToEstimate = task?.estimatedDuration
    ? Math.min(100, Math.round((totalTrackedMinutes / task.estimatedDuration) * 100))
    : null;

  const flowMinutes = taskEntries.filter(e => getEntryDuration(e) >= 90).reduce(
    (acc, entry) => acc + getEntryDuration(entry),
    0
  );
  const flowScore = totalTrackedMinutes > 0
    ? Math.round((flowMinutes / totalTrackedMinutes) * 100)
    : 0;

  const sevenDayAverage = useMemo(() => {
    const sevenDaysAgo = subDays(new Date(), 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Filter entries from the last 7 days, excluding today
    const recentPreviousEntries = taskEntries.filter(e => {
      const start = toDate(e.startTime);
      return start && start >= sevenDaysAgo && !isSameDay(start, todayDate);
    });

    const totalMinutes = recentPreviousEntries.reduce((acc, e) => acc + getEntryDuration(e), 0);
    return Math.round(totalMinutes / 7);
  }, [taskEntries, toDate, todayDate, isSameDay]);

  const momentumRatio = useMemo(() => {
    if (sevenDayAverage === 0) {
      return todayTrackedMinutes > 30 ? 2 : todayTrackedMinutes > 0 ? 1.2 : 0;
    }
    return todayTrackedMinutes / sevenDayAverage;
  }, [todayTrackedMinutes, sevenDayAverage]);

  const momentumConfig = useMemo(() => {
    if (momentumRatio >= 1.5) return { label: 'CRUSHING', color: 'bg-primary', text: 'text-primary', icon: Zap, glow: '0 0 20px rgba(var(--primary-rgb), 0.6)' };
    if (momentumRatio >= 1.2) return { label: 'EXCELING', color: 'bg-blue-500', text: 'text-blue-500', icon: Zap, glow: '0 0 15px rgba(59, 130, 246, 0.5)' };
    if (momentumRatio >= 0.8) return { label: 'STABLE', color: 'bg-emerald-500', text: 'text-emerald-500', icon: TrendingUp, glow: '0 0 10px rgba(16, 185, 129, 0.3)' };
    if (momentumRatio > 0) return { label: 'REGAINING', color: 'bg-orange-500', text: 'text-orange-500', icon: Target, glow: '0 0 10px rgba(245, 158, 11, 0.3)' };
    return { label: 'INERT', color: 'bg-muted-foreground/20', text: 'text-muted-foreground/40', icon: Circle, glow: 'none' };
  }, [momentumRatio]);

  const linkedGoal = task?.goalId ? goals.find(g => g.id === task.goalId) : null;
  const linkedMilestone = linkedGoal && task?.milestoneId
    ? linkedGoal.milestones.find(m => m.id === task.milestoneId)
    : null;
  const totalSubtasks = task?.subtasks?.length || 0;
  const completedSubtasks = task?.subtasks?.filter((s) => s.done).length || 0;
  const otherTasks = tasks.filter((t) => t.id !== task?.id);

  const dependencies = useMemo(() => {
    if (!task || !task.dependencyIds) return [];
    return tasks.filter(t => task.dependencyIds?.includes(t.id));
  }, [tasks, task?.dependencyIds]);

  const dependents = useMemo(() => {
    if (!task) return [];
    return tasks.filter(t => t.dependencyIds?.includes(task.id));
  }, [tasks, task?.id]);

  const isTaskBlocked = dependencies.some(d => d.status !== 'done');
  const areDependentsUnlocked = task?.status === 'done';

  const recentEntries = useMemo(
    () =>
      [...taskEntries]
        .sort(
          (a, b) =>
            (toDate(b.startTime)?.getTime() || 0) - (toDate(a.startTime)?.getTime() || 0)
        ),
    [taskEntries, toDate]
  );

  if (!task) {
    return (
      <ProtectedRoute>
        <DataLoader>
          <MainLayout>
            <div className="flex items-center justify-center min-h-[60vh]">
              <Card className="w-full max-w-md">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Task not found</p>
                  <Button
                    onClick={() => router.push('/tasks')}
                    className="mt-4"
                    variant="outline"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Tasks
                  </Button>
                </CardContent>
              </Card>
            </div>
          </MainLayout>
        </DataLoader>
      </ProtectedRoute>
    );
  }


  const handleStatusChange = async (newStatus: Task['status']) => {
    await updateTask(task.id, { status: newStatus });
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(task.id);
      router.push('/tasks');
    }
  };

  const getStatusIcon = () => {
    switch (task.status) {
      case 'done':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'in-progress':
        return <PlayCircle className="h-6 w-6 text-yellow-500" />;
      default:
        return <Circle className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
          <div className="max-w-[1600px] mx-auto space-y-8 pb-20">
            {/* Header / Navigation */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const fromView = searchParams.get('fromView');
                    if (fromView === 'kanban' || fromView === 'timeline' || fromView === 'list') {
                      router.push(fromView === 'list' ? '/tasks' : `/tasks?view=${fromView}`);
                    } else if (fromView === 'time-tracking-gantt') {
                      router.push('/timeline/gantt');
                    } else if (fromView === 'time-tracking') {
                      router.push('/time-tracking');
                    } else {
                      router.back();
                    }
                  }}
                  className="group -ml-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Back to workspace
                </Button>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl bg-background border-l-4 ${getPriorityColor()} shadow-sm`}>
                    {getStatusIcon()}
                  </div>
                  <div className="relative group/title">
                    <h1 className="text-4xl font-black tracking-tight">{task.title}</h1>
                    {/* Momentum Neon Line */}
                    <div className="absolute -bottom-3 left-0 h-[3px] rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.min(100, momentumRatio * 50)}%`,
                        maxWidth: '400px',
                        background: momentumConfig.color.includes('primary') ? 'hsl(var(--primary))' : momentumConfig.color.replace('bg-', ''),
                        boxShadow: momentumConfig.glow
                      }}>
                      {momentumRatio >= 1.2 && (
                        <div className="absolute inset-0 animate-pulse bg-white/20" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <Badge variant="outline" className="font-bold opacity-60">Created {format(toDate(task.createdAt)!, 'MMM d, yyyy')}</Badge>
                      {task.projectId && (
                        <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10">Project Member</Badge>
                      )}
                      <div className={`flex items-center gap-1.5 ml-2 ${momentumConfig.text} font-black text-[10px] tracking-[0.2em] animate-in fade-in slide-in-from-left-2 duration-500`}>
                        <momentumConfig.icon className="h-3 w-3" />
                        {momentumConfig.label}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="rounded-xl font-bold h-11 border-primary/10 hover:bg-muted"
                  onClick={() => router.push(`/tasks?edit=${task.id}`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Task
                </Button>
                <Button
                  variant="destructive"
                  className="rounded-xl font-bold h-11 shadow-lg shadow-destructive/10"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

              {/* Left Column: Execution & Details */}
              <div className="lg:col-span-8 space-y-8">

                {/* Cover & Description */}
                {(task.coverImage || task.description) && (
                  <Card className="overflow-hidden border-none bg-muted/20 shadow-none">
                    {task.coverImage && (
                      <div className="w-full h-80 overflow-hidden">
                        <img
                          src={task.coverImage}
                          alt={task.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {task.description && (
                      <CardContent className="p-8">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-4 text-primary">Mission Description</h3>
                        <p className="text-xl leading-relaxed font-medium text-foreground/80 italic">
                          "{task.description}"
                        </p>
                      </CardContent>
                    )}
                  </Card>
                )}

                {/* Subtasks - Main Context */}
                <Card className="border-primary/5 shadow-sm overflow-hidden">
                  <CardHeader className="border-b bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <ListTodo className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-lg font-black italic">Execution Checklist</CardTitle>
                      </div>
                      {!isAddingSubtask && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setIsAddingSubtask(true)}
                          className="font-bold text-[10px] uppercase tracking-widest text-primary"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Add Phase
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {isAddingSubtask && (
                      <div className="flex flex-col sm:flex-row gap-2 mb-6 p-4 rounded-xl bg-muted/30">
                        <Input
                          placeholder="What needs to be done?"
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          className="bg-background"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => { setIsAddingSubtask(false); setNewSubtaskTitle(''); }}>Cancel</Button>
                          <Button size="sm" onClick={handleAddSubtask} disabled={!newSubtaskTitle.trim()}>Initialize</Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {task.subtasks && task.subtasks.length > 0 ? (
                        task.subtasks.map((subtask) => (
                          <div key={subtask.id} className="group flex items-center justify-between gap-4 p-4 rounded-xl border border-primary/5 bg-background hover:border-primary/20 transition-all shadow-sm hover:shadow-md">
                            <div className="flex items-center gap-4">
                              <Checkbox
                                checked={subtask.done}
                                onCheckedChange={() => handleToggleSubtask(subtask.id)}
                                className="h-5 w-5 rounded-md border-primary/20 data-[state=checked]:bg-primary"
                              />
                              <span className={`font-bold transition-all ${subtask.done ? 'line-through opacity-40' : 'text-foreground'}`}>
                                {subtask.title}
                              </span>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteSubtask(subtask.id)} className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive hover:bg-destructive/5 transition-opacity">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : !isAddingSubtask && (
                        <div className="text-center py-10 opacity-30 italic font-medium">No operational subtasks defined</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Time Tracking Section - Prominent in main column */}
                <Card className="overflow-hidden border-primary/10 shadow-lg bg-gradient-to-br from-background to-muted/20">
                  <CardHeader className="bg-primary/5 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg font-black italic">Temporal Logs & Tracking</CardTitle>
                      </div>
                      {taskRunningEntry && (
                        <Badge className="bg-primary text-primary-foreground animate-pulse font-black px-3 py-1">LIVE</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-8">
                      {[
                        { label: 'Total Invested', value: formatDuration(totalTrackedMinutes) },
                        { label: 'Today', value: formatDuration(todayTrackedMinutes) },
                        { label: 'Avg Session', value: formatDuration(averageSessionMinutes) },
                        { label: 'Efficiency', value: progressToEstimate !== null ? `${progressToEstimate}%` : 'N/A' },
                        { label: 'Flow Score', value: `${flowScore}%` },
                      ].map((stat, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">{stat.label}</p>
                          <p className="text-3xl font-black tabular-nums tracking-tighter">{stat.value}</p>
                        </div>
                      ))}

                      {/* Momentum Gauge */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Momentum</p>
                        <div className="flex items-end gap-2">
                          <p className={`text-3xl font-black tabular-nums tracking-tighter ${momentumConfig.text}`}>
                            {Math.round(momentumRatio * 100)}%
                          </p>
                          <momentumConfig.icon className={`h-5 w-5 mb-1 ${momentumConfig.text} ${momentumRatio >= 1.2 ? 'animate-bounce' : ''}`} />
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${momentumConfig.color} transition-all duration-1000`}
                            style={{ width: `${Math.min(100, momentumRatio * 50)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-primary/5" />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                          <Play className="h-3 w-3 fill-current" /> Active Relay
                        </p>
                        {taskRunningEntry ? (
                          <div className="p-8 rounded-[2rem] bg-primary/5 border-2 border-primary/10 text-center space-y-6">
                            <p className="text-5xl font-black font-mono tracking-tighter tabular-nums text-primary">
                              {getElapsedTime(taskRunningEntry.startTime)}
                            </p>
                            <Button variant="destructive" className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-destructive/20" onClick={() => handleStopTimer(taskRunningEntry.id)}>
                              <Square className="h-4 w-4 mr-2 fill-current" /> Terminate Session
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4 bg-muted/30 p-6 rounded-[2rem] border border-primary/5">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                              <div className="min-w-0">
                                <Select value={timerForm.category} onValueChange={(v) => setTimerForm(prev => ({ ...prev, category: v }))}>
                                  <SelectTrigger className="bg-background border-none h-12 rounded-xl font-black text-[9px] uppercase tracking-wider w-full overflow-hidden">
                                    <div className="truncate text-left w-full">
                                      <SelectValue placeholder="Category" />
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent className="rounded-2xl border-primary/10">
                                    <SelectItem value={task?.title || 'General'}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: getCategoryColor(task?.title || 'General') }} />
                                        <span className="truncate">{task?.title || 'General'}</span>
                                      </div>
                                    </SelectItem>
                                    {PRESET_CATEGORIES.map(cat => (
                                      <SelectItem key={cat} value={cat}>
                                        <div className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: getCategoryColor(cat) }} />
                                          <span>{cat}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="min-w-0">
                                <Input
                                  placeholder="Session notes..."
                                  value={timerForm.description}
                                  onChange={(e) => setTimerForm({ ...timerForm, description: e.target.value })}
                                  className="bg-background border-none h-12 rounded-xl font-medium text-xs px-4 w-full"
                                />
                              </div>
                            </div>
                            <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20" onClick={handleStartTaskTimer} disabled={!!otherTaskRunning}>
                              <Play className="h-4 w-4 mr-2 fill-current" /> Initiate Timer
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                          <Plus className="h-3 w-3" /> Manual Calibration
                        </p>
                        <div className="bg-muted/30 p-6 rounded-[2rem] border border-primary/5 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-2 space-y-2">
                              <p className="text-[8px] font-black text-muted-foreground/60 uppercase ml-1 tracking-widest">Hrs</p>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={manualEntry.hours}
                                onChange={(e) => setManualEntry({ ...manualEntry, hours: e.target.value.replace(/\D/g, '') })}
                                className="h-12 rounded-xl bg-background/50 border-primary/5 text-center font-black text-lg focus:ring-primary/20 focus:border-primary/20 px-1"
                              />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                              <p className="text-[8px] font-black text-muted-foreground/60 uppercase ml-1 tracking-widest">Min</p>
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={manualEntry.minutes}
                                onChange={(e) => setManualEntry({ ...manualEntry, minutes: e.target.value.replace(/\D/g, '') })}
                                className="h-12 rounded-xl bg-background/50 border-primary/5 text-center font-black text-lg focus:ring-primary/20 focus:border-primary/20 px-1"
                              />
                            </div>
                            <div className="md:col-span-8">
                              <Button variant="secondary" className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-secondary/10 px-2 group" onClick={handleLogManualEntry}>
                                <CheckCircle2 className="h-3 w-3 mr-2 group-hover:scale-110 transition-transform" /> Log Past Session
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                            <div className="min-w-0">
                              <Select
                                value={manualEntry.category || task?.title || 'General'}
                                onValueChange={(v) => setManualEntry(prev => ({ ...prev, category: v }))}
                              >
                                <SelectTrigger className="bg-background border-none h-12 rounded-xl font-black text-[9px] uppercase tracking-wider w-full overflow-hidden">
                                  <div className="truncate text-left w-full">
                                    <SelectValue placeholder="Category" />
                                  </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-primary/10">
                                  <SelectItem value={task?.title || 'General'}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: getCategoryColor(task?.title || 'General') }} />
                                      <span className="truncate">{task?.title || 'General'}</span>
                                    </div>
                                  </SelectItem>
                                  {PRESET_CATEGORIES.map(cat => (
                                    <SelectItem key={cat} value={cat}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: getCategoryColor(cat) }} />
                                        <span>{cat}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="min-w-0">
                              <Input placeholder="What happened then?..." value={manualEntry.description} onChange={(e) => setManualEntry({ ...manualEntry, description: e.target.value })} className="bg-background border-none h-12 rounded-xl text-xs font-medium px-4 w-full" />
                            </div>
                          </div>

                          <div className="pt-2">
                            <Button
                              variant="ghost"
                              className="w-full h-12 rounded-xl border border-dashed border-primary/20 hover:border-primary/50 hover:bg-primary/5 text-[10px] font-black uppercase tracking-widest gap-2 group"
                              onClick={() => {
                                setSelectedDayDate(new Date());
                                setIsCreationMode(true);
                                setIsDayDetailOpen(true);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Maximize2 className="h-3 w-3 group-hover:scale-110 transition-transform" />
                                Interactive Timeline Mapping
                              </div>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Compact Chronological Log */}
                    <div className="space-y-4 pt-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 italic">
                        Historical Timeline {!showAllTimeEntries && recentEntries.length > 5 && `(Recent 5)`}
                      </p>
                      <div className="grid gap-2">
                        {recentEntries.length > 0 ? (
                          <>
                            {(showAllTimeEntries ? recentEntries : recentEntries.slice(0, 5)).map((entry) => (
                              <div key={entry.id} className="group flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-transparent hover:border-primary/10 hover:bg-muted/40 transition-all">
                                <div className="flex flex-col">
                                  <p className="text-sm font-black text-foreground/80">{entry.description || "Calibration Session"}</p>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                                    {toDate(entry.startTime) ? format(toDate(entry.startTime)!, 'MMM d, h:mm a') : 'Unstable Data'} • {formatDuration(getEntryDuration(entry))}
                                  </p>
                                  {entry.notes && <p className="mt-1 text-[10px] italic text-primary/60 truncate max-w-md">{entry.notes}</p>}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => handleEditNotes(entry)}><Edit2 className="h-3 w-3" /></Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => handleResumeEntry(entry)} disabled={!!runningEntry}><RotateCcw className="h-3 w-3" /></Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTimeEntry(entry.id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </div>
                            ))}
                            {recentEntries.length > 5 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAllTimeEntries(!showAllTimeEntries)}
                                className="w-full h-9 rounded-xl font-black text-[10px] uppercase tracking-widest text-primary hover:bg-primary/5"
                              >
                                {showAllTimeEntries ? (
                                  <>Show Less</>
                                ) : (
                                  <>Show {recentEntries.length - 5} More Entries</>
                                )}
                              </Button>
                            )}
                          </>
                        ) : (
                          <p className="text-[10px] italic opacity-30">No temporal data available for this task</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Secondary Streams - Tabs */}
                <Tabs defaultValue="comments" className="w-full">
                  <TabsList className="w-full bg-muted/20 p-1 h-14 rounded-2xl border border-primary/5">
                    <TabsTrigger value="comments" className="flex-1 rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm">
                      <MessageSquare className="h-3.5 w-3.5 mr-2" /> Comments
                    </TabsTrigger>
                    <TabsTrigger value="journal" className="flex-1 rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm">
                      <BookOpen className="h-3.5 w-3.5 mr-2" /> Project Journal
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="flex-1 rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-sm">
                      Activity
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="comments" className="pt-6">
                    <Card className="border-none shadow-none bg-muted/10 rounded-3xl p-6">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Communication Channel</h4>
                          <Button size="sm" variant="ghost" className="font-bold text-[10px] uppercase tracking-widest text-primary" onClick={() => setIsAddingComment(true)}>
                            Add Transmission
                          </Button>
                        </div>

                        {isAddingComment && (
                          <div className="space-y-3 p-4 bg-background rounded-2xl border border-primary/10 shadow-lg">
                            <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Type message..." className="min-h-[100px] border-none focus-visible:ring-0 resize-none font-medium text-sm" autoFocus />
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => { setIsAddingComment(false); setNewComment(''); }}>Cancel</Button>
                              <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>Post Transmission</Button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          {task.comments && task.comments.length > 0 ? [...task.comments].reverse().map((comment) => (
                            <div key={comment.id} className="group relative p-4 bg-background rounded-2xl border border-primary/5 hover:border-primary/10 transition-all">
                              <p className="text-sm font-medium text-foreground/80 mb-2">{comment.text}</p>
                              <div className="flex items-center justify-between">
                                <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">
                                  {toDate(comment.createdAt) && format(toDate(comment.createdAt)!, 'MMMM d, h:mm a')}
                                </p>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteComment(comment.id)} className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )) : <div className="text-center py-10 opacity-20 italic font-medium">No active transmissions</div>}
                        </div>
                      </div>
                    </Card>
                  </TabsContent>

                  <TabsContent value="journal" className="pt-6">
                    <Card className="border-none shadow-none bg-muted/10 rounded-3xl p-6">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Research & Reflections</h4>
                          <Button size="sm" variant="ghost" className="font-bold text-[10px] uppercase tracking-widest text-primary" onClick={() => setIsAddingJournal(true)}>
                            Log Entry
                          </Button>
                        </div>

                        {isAddingJournal && (
                          <div className="space-y-3 p-4 bg-background rounded-2xl border border-primary/10 shadow-lg">
                            <Textarea value={newJournalEntry} onChange={(e) => setNewJournalEntry(e.target.value)} placeholder="Capture reflections..." className="min-h-[100px] border-none focus-visible:ring-0 resize-none font-medium text-sm" />
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => { setIsAddingJournal(false); setNewJournalEntry(''); }}>Cancel</Button>
                              <Button size="sm" onClick={handleAddJournalEntry} disabled={!newJournalEntry.trim()}>Save Log</Button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          {task.journal && task.journal.length > 0 ? [...task.journal].sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0)).map((entry) => (
                            <div key={entry.id} className="p-5 bg-background rounded-2xl border border-primary/5">
                              <p className="text-sm font-medium leading-relaxed mb-3">{entry.text}</p>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">
                                {toDate(entry.createdAt) && format(toDate(entry.createdAt)!, 'MMMM d, h:mm a')}
                              </p>
                            </div>
                          )) : <div className="text-center py-10 opacity-20 italic font-medium">Journal is empty</div>}
                        </div>
                      </div>
                    </Card>
                  </TabsContent>

                  <TabsContent value="activity" className="pt-6">
                    <Card className="border-none shadow-none bg-muted/10 rounded-3xl p-8">
                      <div className="space-y-8">
                        <div className="flex gap-6">
                          <div className="flex flex-col items-center">
                            <div className="w-4 h-4 rounded-full border-4 border-primary bg-background shadow-sm" />
                            <div className="w-0.5 h-full bg-primary/20" />
                          </div>
                          <div className="pb-4">
                            <p className="text-xs font-black uppercase tracking-widest mb-1">Initialization Complete</p>
                            <p className="text-sm font-medium text-muted-foreground">Original task creation date</p>
                            <p className="text-[10px] font-bold text-primary mt-1">{toDate(task.createdAt) && format(toDate(task.createdAt)!, 'MMMM d, yyyy')}</p>
                          </div>
                        </div>
                        {task.updatedAt && (
                          <div className="flex gap-6">
                            <div className="flex flex-col items-center">
                              <div className="w-4 h-4 rounded-full border-4 border-muted bg-background shadow-sm" />
                            </div>
                            <div>
                              <p className="text-xs font-black uppercase tracking-widest mb-1">Last Calibration</p>
                              <p className="text-sm font-medium text-muted-foreground">System synchronization</p>
                              <p className="text-[10px] font-bold text-muted-foreground mt-1">{format(toDate(task.updatedAt)!, 'MMMM d, yyyy \'at\' h:mm a')}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Right Column: Status & Intelligence */}
              <div className="lg:col-span-4 space-y-8">

                {/* Visual Status Controller */}
                <Card className="border-none bg-primary/5 rounded-[2.5rem] p-4">
                  <CardHeader>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 text-center">Status Configuration</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { id: 'todo', label: 'In Queue', icon: Circle, color: 'hover:bg-muted' },
                      { id: 'in-progress', label: 'Deploying', icon: PlayCircle, color: 'hover:bg-yellow-500/10' },
                      { id: 'done', label: 'Synchronized', icon: CheckCircle2, color: 'hover:bg-green-500/10' }
                    ].map((s) => (
                      <Button
                        key={s.id}
                        onClick={() => handleStatusChange(s.id as any)}
                        variant={task.status === s.id ? 'default' : 'ghost'}
                        className={`w-full h-14 rounded-2xl justify-start px-6 gap-4 font-black uppercase tracking-widest text-[10px] transition-all transform active:scale-95 ${task.status === s.id ? 'shadow-lg shadow-primary/20' : s.color}`}
                      >
                        <s.icon className={`h-4 w-4 ${task.status === s.id ? 'fill-current' : ''}`} />
                        {s.label}
                      </Button>
                    ))}
                  </CardContent>
                </Card>

                {/* Tactical Intel - Deadline & Estimate */}
                <Card className="border-primary/5 shadow-sm rounded-[2rem] overflow-hidden">
                  <div className="bg-primary/5 p-6 border-b border-primary/5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Mission Parameters</p>
                  </div>
                  <CardContent className="p-8 space-y-8">
                    {/* Deadline View */}
                    <div className="flex gap-4">
                      <div className="p-3 rounded-xl bg-muted/50 text-muted-foreground">
                        <CalendarIcon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hard Deadline</p>
                        {task.deadline ? (
                          <>
                            <p className="text-xl font-black">{format(toDate(task.deadline)!, 'MMM d, yyyy')}</p>
                            <p className="text-[11px] font-bold text-destructive uppercase tracking-widest opacity-60">
                              {toDate(task.deadline)!.getTime() > Date.now() ? 'Due ' : 'Missed '}
                              {formatDistanceToNow(toDate(task.deadline)!, { addSuffix: true })}
                            </p>
                          </>
                        ) : <p className="text-sm font-bold opacity-30 italic">No Deadline Set</p>}
                      </div>
                    </div>

                    {/* Estimate Progress */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Workload Intel</p>
                        </div>
                        <p className="text-sm font-black italic">{progressToEstimate || 0}%</p>
                      </div>
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ease-out ${((progressToEstimate || 0) > 100) ? 'bg-destructive' : 'bg-primary'}`}
                          style={{ width: `${Math.min(100, progressToEstimate || 0)}%` }}
                        />
                      </div>
                      {task.estimatedDuration && <p className="text-[10px] font-bold text-muted-foreground italic">Estimated: {formatDuration(task.estimatedDuration)}</p>}
                    </div>

                    {/* Goal Association */}
                    {linkedGoal && (
                      <div className="space-y-4 pt-4 border-t border-primary/5">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Strategic Objective</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                          <p className="text-sm font-black italic truncate">{linkedGoal.title}</p>
                          <p className="text-[10px] font-bold text-muted-foreground mt-1">{linkedGoal.progress}% toward achievement</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Timeline Grid Visualization */}
                <Card className="border-primary/5 shadow-sm rounded-[2rem] overflow-hidden">
                  <div className="bg-primary/5 p-6 border-b border-primary/5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Temporal Activity Map</p>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    {/* GitHub-style Contribution Grid */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Activity Heatmap</p>
                        <p className="text-[8px] font-bold text-muted-foreground/60">Last 8 Weeks</p>
                      </div>

                      {/* Week labels */}
                      <div className="flex gap-1">
                        <div className="w-6"></div>
                        <div className="flex-1 grid grid-cols-8 gap-1">
                          {Array.from({ length: 8 }).map((_, weekIndex) => {
                            const weekDate = new Date();
                            weekDate.setDate(weekDate.getDate() - (7 - weekIndex) * 7);
                            return (
                              <div key={weekIndex} className="text-center">
                                <p className="text-[7px] font-bold text-muted-foreground/40">
                                  {format(weekDate, 'MMM d')}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Grid by day of week */}
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, dayOfWeek) => (
                        <div key={dayName} className="flex gap-1 items-center">
                          <div className="w-6">
                            <p className="text-[7px] font-bold text-muted-foreground/60">{dayName[0]}</p>
                          </div>
                          <div className="flex-1 grid grid-cols-8 gap-1">
                            {Array.from({ length: 8 }).map((_, weekIndex) => {
                              const date = new Date();
                              // Calculate the date for this cell
                              const daysBack = (7 - weekIndex) * 7 + (6 - dayOfWeek);
                              date.setDate(date.getDate() - daysBack);
                              date.setHours(0, 0, 0, 0);

                              // Skip future dates
                              if (date > new Date()) {
                                return <div key={weekIndex} className="aspect-square"></div>;
                              }

                              const dayEntries = taskEntries.filter(entry => {
                                const entryDate = toDate(entry.startTime);
                                if (!entryDate) return false;
                                const entryDay = new Date(entryDate);
                                entryDay.setHours(0, 0, 0, 0);
                                return entryDay.getTime() === date.getTime();
                              });

                              const dayMinutes = dayEntries.reduce((sum, entry) => sum + getEntryDuration(entry), 0);

                              // 5-level intensity (like GitHub)
                              let intensityLevel = 0;
                              if (dayMinutes > 0) intensityLevel = 1;
                              if (dayMinutes >= 30) intensityLevel = 2;
                              if (dayMinutes >= 60) intensityLevel = 3;
                              if (dayMinutes >= 120) intensityLevel = 4;

                              const isToday = date.toDateString() === new Date().toDateString();
                              const isDeadlineDay = task.deadline && toDate(task.deadline) &&
                                new Date(toDate(task.deadline)!).toDateString() === date.toDateString();

                              // Date range highlighting (Airbnb-style)
                              const createdDate = toDate(task.createdAt);
                              const deadlineDate = task.deadline ? toDate(task.deadline) : null;

                              let isInRange = false;
                              let isRangeStart = false;
                              let isRangeEnd = false;

                              if (createdDate && deadlineDate) {
                                const created = new Date(createdDate);
                                created.setHours(0, 0, 0, 0);
                                const deadline = new Date(deadlineDate);
                                deadline.setHours(0, 0, 0, 0);

                                isRangeStart = date.getTime() === created.getTime();
                                isRangeEnd = date.getTime() === deadline.getTime();
                                isInRange = date.getTime() >= created.getTime() && date.getTime() <= deadline.getTime();
                              }

                              const intensityColors = [
                                'bg-muted/50',
                                'bg-primary/20',
                                'bg-primary/40',
                                'bg-primary/70',
                                'bg-primary'
                              ];

                              return (
                                <div
                                  key={weekIndex}
                                  className={`aspect-square rounded-sm transition-all relative ${intensityColors[intensityLevel]} ${isRangeStart
                                    ? 'ring-2 ring-green-500 ring-offset-1 ring-offset-background scale-110'
                                    : isRangeEnd
                                      ? 'ring-2 ring-destructive ring-offset-1 ring-offset-background scale-110'
                                      : isInRange
                                        ? 'ring-1 ring-primary/30'
                                        : isToday
                                          ? 'ring-1 ring-primary scale-110'
                                          : ''
                                    } hover:scale-125 hover:ring-1 hover:ring-primary/50 cursor-pointer`}
                                  title={`${format(date, 'MMM d, yyyy')}: ${formatDuration(dayMinutes)}${isRangeStart ? ' (START)' : ''}${isRangeEnd ? ' (DEADLINE)' : ''}${isToday ? ' (TODAY)' : ''}`}
                                  onClick={() => {
                                    setSelectedDayDate(date);
                                    setIsDayDetailOpen(true);
                                  }}
                                >
                                  {/* Range overlay */}
                                  {isInRange && !isRangeStart && !isRangeEnd && (
                                    <div className="absolute inset-0 bg-primary/5 rounded-sm"></div>
                                  )}

                                  {/* Start marker */}
                                  {isRangeStart && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                    </div>
                                  )}

                                  {/* End/Deadline marker */}
                                  {isRangeEnd && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-1.5 h-1.5 rounded-full bg-destructive"></div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Legend */}
                      <div className="flex items-center justify-between pt-2 border-t border-primary/5">
                        <p className="text-[7px] font-bold text-muted-foreground/60">Less</p>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-sm bg-muted/50"></div>
                          <div className="w-3 h-3 rounded-sm bg-primary/20"></div>
                          <div className="w-3 h-3 rounded-sm bg-primary/40"></div>
                          <div className="w-3 h-3 rounded-sm bg-primary/70"></div>
                          <div className="w-3 h-3 rounded-sm bg-primary"></div>
                        </div>
                        <p className="text-[7px] font-bold text-muted-foreground/60">More</p>
                      </div>
                      <div className="flex items-center justify-center gap-4 text-[7px] font-bold text-muted-foreground/60">
                        <span>0min</span>
                        <span>30min</span>
                        <span>1h</span>
                        <span>2h+</span>
                      </div>
                    </div>

                    {/* Deadline Countdown */}
                    {task.deadline && toDate(task.deadline) && (
                      <div className="pt-4 border-t border-primary/5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Time Remaining</p>
                          <CalendarIcon className="h-3 w-3 text-destructive/60" />
                        </div>
                        {(() => {
                          const now = Date.now();
                          const deadlineTime = toDate(task.deadline)!.getTime();
                          const createdTime = toDate(task.createdAt)?.getTime() || now;
                          const totalDuration = deadlineTime - createdTime;
                          const elapsed = now - createdTime;
                          const remaining = deadlineTime - now;
                          const percentElapsed = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
                          const isOverdue = remaining < 0;

                          return (
                            <>
                              <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
                                <div
                                  className={`h-full transition-all ${isOverdue ? 'bg-destructive' : 'bg-gradient-to-r from-green-500 via-yellow-500 to-destructive'}`}
                                  style={{ width: `${percentElapsed}%` }}
                                />
                              </div>
                              <p className={`text-[10px] font-black ${isOverdue ? 'text-destructive' : 'text-foreground/60'}`}>
                                {isOverdue ? 'OVERDUE' : formatDistanceToNow(toDate(task.deadline)!, { addSuffix: false }).toUpperCase()}
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dependency Graph Visualization */}
                <Card className="border-primary/5 shadow-sm rounded-[2rem] overflow-hidden bg-muted/5 relative">
                  <div className="p-6 bg-muted/20 border-b border-primary/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-primary" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Strategic Context Map</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`text-[8px] font-black uppercase tracking-widest ${isTaskBlocked ? 'text-destructive border-destructive/20' : 'text-green-500 border-green-500/20'}`}>
                        {isTaskBlocked ? 'Path Blocked' : 'Path Clear'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-primary/10 transition-colors"
                        onClick={() => setIsDependencyModalOpen(true)}
                        title="Edit Dependencies"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-8 relative min-h-[300px] flex items-center justify-between gap-4">
                    {/* Tactical Grid Background */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                      style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                    {/* Pre-requisites Column */}
                    <div className="flex flex-col gap-8 z-10 w-1/3">
                      <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-2 text-center">Pre-requisites</p>
                      {dependencies.length > 0 ? dependencies.map(dep => (
                        <div key={dep.id}
                          className={`p-3 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer relative group ${dep.status === 'done' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}
                          onClick={() => router.push(`/tasks/${dep.id}`)}>
                          <p className="text-[10px] font-black truncate">{dep.title}</p>
                          <div className={`absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${dep.status === 'done' ? 'bg-green-500' : 'bg-destructive'} border border-background shadow-[0_0_8px_currentColor]`} />
                        </div>
                      )) : (
                        <div className="py-8 border border-dashed border-primary/10 rounded-xl text-center">
                          <p className="text-[9px] font-bold opacity-30 italic">No Ancestors</p>
                        </div>
                      )}
                    </div>

                    {/* Center Node: Current Task */}
                    <div className="z-20 w-1/3 flex flex-col items-center">
                      <div className={`p-5 rounded-[2rem] shadow-2xl ring-8 transition-all duration-500 ${isTaskBlocked ? 'bg-destructive ring-destructive/10' : 'bg-primary ring-primary/10'} text-white text-center w-full max-w-[160px] relative`}>
                        <Zap className="h-4 w-4 absolute -top-2 -right-2 text-yellow-400 drop-shadow-lg" />
                        <p className="text-[10px] font-black uppercase tracking-widest line-clamp-2">THIS TASK</p>
                        <div className={`mt-2 h-1 rounded-full bg-white/30 overflow-hidden`}>
                          <div className="h-full bg-white transition-all duration-1000" style={{ width: `${task.status === 'done' ? 100 : task.status === 'in-progress' ? 50 : 10}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Dependents Column */}
                    <div className="flex flex-col gap-8 z-10 w-1/3">
                      <p className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] mb-2 text-center">Unlocks</p>
                      {dependents.length > 0 ? dependents.map(dep => (
                        <div key={dep.id}
                          className={`p-3 rounded-xl border-2 transition-all hover:scale-105 cursor-pointer relative ${areDependentsUnlocked ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted/10 border-muted/20 text-muted-foreground opacity-60'}`}
                          onClick={() => router.push(`/tasks/${dep.id}`)}>
                          <p className="text-[10px] font-black truncate">{dep.title}</p>
                          <div className={`absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${areDependentsUnlocked ? 'bg-primary' : 'bg-muted-foreground/40'} border border-background shadow-[0_0_8px_currentColor]`} />
                        </div>
                      )) : (
                        <div className="py-8 border border-dashed border-primary/10 rounded-xl text-center">
                          <p className="text-[9px] font-bold opacity-30 italic">No Dependents</p>
                        </div>
                      )}
                    </div>

                    {/* Connection Lines (Static SVG approximation for robustness) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-current opacity-20" style={{ color: 'hsl(var(--primary))' }}>
                      <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                          <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
                        </marker>
                      </defs>
                      {/* Left connects to Center (simplified visual only) */}
                      {dependencies.length > 0 && <path d="M 33% 150 L 50% 150" fill="none" strokeWidth="1" strokeDasharray="5,3" />}
                      {/* Center connects to Right (simplified visual only) */}
                      {dependents.length > 0 && <path d="M 50% 150 L 66% 150" fill="none" strokeWidth="1" strokeDasharray="5,3" />}
                    </svg>
                  </CardContent>

                  {/* Footer Context */}
                  <div className="p-4 bg-primary/5 text-center">
                    <p className="text-[8px] font-bold text-muted-foreground/60 tracking-widest uppercase">
                      {isTaskBlocked ? 'Current Objective is Stalled by Pre-requisites' : areDependentsUnlocked ? 'Objective Completed - Critical Path Unlocked' : 'Operational Independence Achieved'}
                    </p>
                  </div>
                </Card>

                {/* Tags Metadata */}
                {task.tags && task.tags.length > 0 && (
                  <div className="space-y-3 px-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">System Labels</p>
                    <div className="flex flex-wrap gap-2">
                      {task.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="rounded-lg bg-muted/10 border-primary/10 font-black text-[9px] uppercase tracking-widest py-1">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <Dialog
            open={isSummaryDialogOpen}
            onOpenChange={(open) => {
              setIsSummaryDialogOpen(open);
              if (!open) {
                setEditingEntryId(null);
                setPendingManualEntry(null);
                setSessionSummary('');
              }
            }}
          >
            <DialogContent className="max-w-xl p-0 overflow-hidden rounded-[2rem] border-primary/10 bg-background/95 backdrop-blur-2xl shadow-2xl">
              <div className="p-8 sm:p-10">
                <DialogHeader className="mb-8">
                  <DialogTitle className="text-2xl font-black tracking-tight italic">
                    {editingEntryId ? 'Edit Session Notes' : pendingManualEntry ? 'Log Details' : 'Session Summary'}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-black uppercase tracking-widest opacity-40">
                    {editingEntryId ? 'Update your reflections for this session' : pendingManualEntry ? 'Review and save your manual log' : 'Capture the outcomes of this temporal cycle'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Session Identity</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <Select
                          value={sessionCategory || (pendingManualEntry?.category) || task?.title || 'General'}
                          onValueChange={(v) => setSessionCategory(v)}
                        >
                          <SelectTrigger className="bg-muted/30 border-primary/5 h-12 rounded-xl font-black text-[9px] uppercase tracking-wider w-full overflow-hidden">
                            <div className="truncate text-left w-full">
                              <SelectValue placeholder="Category" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-primary/10">
                            <SelectItem value={task?.title || 'General'}>
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: getCategoryColor(task?.title || 'General') }} />
                                <span className="truncate">{task?.title || 'General'}</span>
                              </div>
                            </SelectItem>
                            {PRESET_CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: getCategoryColor(cat) }} />
                                  <span>{cat}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center px-4 h-12 rounded-xl bg-muted/10 border border-primary/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">
                        {pendingManualEntry ? 'Manual Mode' : 'Live Relay'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Accomplishments & Notes</Label>
                    <Textarea
                      value={sessionSummary}
                      onChange={(e) => setSessionSummary(e.target.value)}
                      placeholder="What did you achieve? Any pending items or next steps?"
                      className="bg-muted/30 min-h-[150px] rounded-2xl border-primary/5 focus:ring-primary/20 transition-all text-base font-medium p-4 resize-none"
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsSummaryDialogOpen(false);
                        setEditingEntryId(null);
                        setPendingManualEntry(null);
                        setSessionSummary('');
                      }}
                      className="flex-1 h-14 rounded-xl font-black text-[10px] uppercase tracking-widest border-primary/10 hover:bg-muted/50"
                    >
                      {editingEntryId || pendingManualEntry ? 'Cancel' : 'Discard & Keep Running'}
                    </Button>
                    <Button
                      onClick={handleConfirmStop}
                      className="flex-1 h-14 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20"
                    >
                      {editingEntryId ? 'Update Notes' : pendingManualEntry ? 'Save Log' : 'Terminate & Save'}
                    </Button>
                  </div>

                  {!editingEntryId && !pendingManualEntry && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (taskRunningEntry) {
                          stopTimeEntry(taskRunningEntry.id);
                          setIsSummaryDialogOpen(false);
                        }
                      }}
                      className="w-full text-[9px] font-black uppercase tracking-[0.2em] opacity-30 hover:opacity-100 transition-opacity"
                    >
                      Terminate without summary
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Day Detail Modal */}
          <Dialog open={isDayDetailOpen} onOpenChange={(open) => {
            setIsDayDetailOpen(open);
            if (!open) {
              setIsCreationMode(false);
              setSelectionRange(null);
            }
          }}>
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
                          onClick={() => selectedDayDate && setSelectedDayDate(subDays(selectedDayDate, 1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                              <DialogTitle className="text-2xl font-black tracking-tight cursor-pointer hover:text-primary transition-colors">
                                {selectedDayDate && format(selectedDayDate, 'EEEE, MMMM d, yyyy')}
                              </DialogTitle>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl border-primary/10" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDayDate || undefined}
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
                          onClick={() => selectedDayDate && setSelectedDayDate(addDays(selectedDayDate, 1))}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <DialogDescription className="text-xs font-black uppercase tracking-widest opacity-40 px-10">
                        Daily Time Allocation
                      </DialogDescription>
                    </div>
                    {/* Zoom & Expansion Controls */}
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
                          onClick={() => setZoomLevel(prev => Math.max(1, prev - 1))}
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
                          onClick={() => setZoomLevel(prev => Math.min(20, prev + 1))}
                          disabled={zoomLevel >= 20}
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                      </div>

                      <Button
                        variant={isZoomMarqueeMode ? "default" : "ghost"}
                        size="icon"
                        className={`h-10 w-10 rounded-xl transition-all ${isZoomMarqueeMode ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-muted/30 border border-primary/5 hover:bg-primary/5'}`}
                        onClick={() => {
                          setIsZoomMarqueeMode(!isZoomMarqueeMode);
                          setIsCreationMode(false);
                        }}
                        title={isZoomMarqueeMode ? "Disable Zoom Tool" : "Zoom to Selection"}
                      >
                        <Search className="h-4 w-4" />
                      </Button>

                      <Button
                        variant={isCreationMode ? "default" : "ghost"}
                        size="icon"
                        className={`h-10 w-10 rounded-xl transition-all ${isCreationMode ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-muted/30 border border-primary/5 hover:bg-primary/5'}`}
                        onClick={() => {
                          setIsCreationMode(!isCreationMode);
                          setIsZoomMarqueeMode(false);
                        }}
                        title={isCreationMode ? "Disable Selection Mode" : "Enable Selection Mode"}
                      >
                        <Plus className={`h-4 w-4 transition-transform duration-300 ${isCreationMode ? 'rotate-45' : ''}`} />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-xl bg-muted/30 border border-primary/5 hover:bg-primary/5"
                        onClick={() => setIsModalExpanded(!isModalExpanded)}
                        title={isModalExpanded ? "Close Full Width" : "Full Width View"}
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
                  {isCapturing && (
                    <div className="mb-10 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary shadow-xl shadow-primary/20">
                          <Zap className="h-6 w-6 text-white text-primary-foreground fill-current" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-black tracking-tighter text-white">Focus OS Summary</h2>
                          <p className="text-sm font-bold text-primary/60 uppercase tracking-widest">{selectedDayDate && format(selectedDayDate, 'EEEE, MMMM d, yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <Badge className="bg-primary/20 text-primary border-primary/30 font-black text-xs px-4 py-2">PRIME TIME ANALYTICS</Badge>
                      </div>
                    </div>
                  )}

                  {selectedDayDate && (() => {
                    const dayEntries = taskEntries.filter(entry => {
                      const entryDate = toDate(entry.startTime);
                      if (!entryDate) return false;
                      const entryDay = new Date(entryDate);
                      entryDay.setHours(0, 0, 0, 0);
                      const selectedDay = new Date(selectedDayDate);
                      selectedDay.setHours(0, 0, 0, 0);
                      return entryDay.getTime() === selectedDay.getTime();
                    });

                    const totalMinutes = dayEntries.reduce((sum, entry) => sum + getEntryDuration(entry), 0);

                    return (
                      <div className="space-y-6">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-4">
                          <Card className="border-primary/5 rounded-2xl overflow-hidden">
                            <CardContent className="p-4">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Time</p>
                              <p className="text-2xl font-black">{formatDuration(totalMinutes)}</p>
                            </CardContent>
                          </Card>
                          <Card className="border-primary/5 rounded-2xl overflow-hidden">
                            <CardContent className="p-4">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Sessions</p>
                              <p className="text-2xl font-black">{dayEntries.length}</p>
                            </CardContent>
                          </Card>
                          <Card className="border-primary/5 rounded-2xl overflow-hidden">
                            <CardContent className="p-4">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Avg Session</p>
                              <p className="text-2xl font-black">{dayEntries.length > 0 ? formatDuration(Math.round(totalMinutes / dayEntries.length)) : '0m'}</p>
                            </CardContent>
                          </Card>
                        </div>

                        {/* 24-Hour Timeline */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">24-Hour Timeline</p>
                            <p className="text-[8px] font-bold text-muted-foreground/60">Drag to Pan • Zoom for Precision</p>
                          </div>

                          {/* Timeline Grid */}
                          <style dangerouslySetInnerHTML={{
                            __html: `
                          .custom-scrollbar::-webkit-scrollbar {
                            width: 6px !important;
                            height: 6px !important;
                          }
                          .custom-scrollbar::-webkit-scrollbar-track {
                            background: transparent !important;
                          }
                          .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: rgba(128, 128, 128, 0.2) !important;
                            border-radius: 10px !important;
                          }
                          .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                            background: rgba(128, 128, 128, 0.4) !important;
                          }
                          .occupied-mesh {
                            background-image: repeating-linear-gradient(
                              -45deg,
                              rgba(245, 158, 11, 0.15) 0px,
                              rgba(245, 158, 11, 0.15) 1px,
                              transparent 1px,
                              transparent 5px
                            );
                            background-size: 8px 8px;
                            /* Custom Shield Cursor for "Protected Time" - URL Encoded for browser compatibility */
                            cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'%3E%3C/path%3E%3C/svg%3E") 12 12, help;
                          }
                          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: rgba(128, 128, 128, 0.6) !important;
                          }
                          .custom-scrollbar {
                            scrollbar-width: thin !important;
                            scrollbar-color: rgba(128, 128, 128, 0.2) transparent !important;
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
                        `}} />
                          <div
                            ref={timelineRef}
                            className="custom-scrollbar relative bg-muted/20 rounded-2xl p-6 overflow-x-auto select-none cursor-grab active:cursor-grabbing"
                            onMouseDown={(e) => {
                              if (isCreationMode) return; // Delegate to inner bar in creation mode
                              if (!timelineRef.current) return;
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
                              {/* Dynamic Markers (Hours + Minutes) */}
                              <div className="relative h-6 mb-2" style={{ width: '100%' }}>
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

                                {/* 30m Markers (Visible at 4x zoom) */}
                                {zoomLevel >= 4 && Array.from({ length: 24 }).map((_, hour) => (
                                  <div
                                    key={`label-m30-${hour}`}
                                    className="absolute -translate-x-1/2 flex flex-col items-center opacity-40"
                                    style={{ left: `${((hour * 60 + 30) / (24 * 60)) * 100}%` }}
                                  >
                                    <p className="text-[7px] font-bold">30</p>
                                    <div className="w-px h-1 bg-muted-foreground/20 mt-1" />
                                  </div>
                                ))}

                                {/* 15m Markers (Visible at 8x zoom) */}
                                {zoomLevel >= 8 && Array.from({ length: 24 * 4 }).map((_, i) => {
                                  const minutes = i * 15;
                                  if (minutes % 60 === 0 || minutes % 60 === 30) return null;
                                  return (
                                    <div
                                      key={`label-m15-${i}`}
                                      className="absolute -translate-x-1/2 flex flex-col items-center opacity-30"
                                      style={{ left: `${(minutes / (24 * 60)) * 100}%` }}
                                    >
                                      <p className="text-[6px] font-medium">{minutes % 60}</p>
                                      <div className="w-px h-0.5 bg-muted-foreground/20 mt-0.5" />
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Timeline bar */}
                              <div
                                className={`relative h-20 bg-muted/40 rounded-2xl border border-primary/5 shadow-inner group/bar transition-all overflow-hidden ${isCreationMode ? 'cursor-crosshair ring-2 ring-primary/20' : isZoomMarqueeMode ? 'cursor-zoom-in ring-2 ring-primary/20 bg-primary/5' : 'cursor-grab active:cursor-grabbing'} ${isSelecting ? 'scale-[1.005] bg-muted/60 shadow-xl' : ''}`}
                                style={{ width: '100%' }}
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

                                    // Magnetic Snap to 15-minute intervals (0.25h)
                                    moveHour = Math.round(moveHour * 4) / 4;

                                    setSelectionRange(prev => prev ? { ...prev, end: moveHour } : null);
                                  };

                                  const handleMouseUp = () => {
                                    document.removeEventListener('mousemove', handleMouseMove);
                                    document.removeEventListener('mouseup', handleMouseUp);

                                    setSelectionRange(currentRange => {
                                      if (currentRange && Math.abs(currentRange.start - currentRange.end) > 0.05) {
                                        const startHour = Math.min(currentRange.start, currentRange.end);
                                        const endHour = Math.max(currentRange.start, currentRange.end);
                                        const durationHours = endHour - startHour;

                                        if (isZoomMarqueeMode) {
                                          // Perform Marquee Zoom
                                          const targetZoom = Math.min(20, Math.max(1, 24 / durationHours));
                                          setZoomLevel(targetZoom);

                                          // Center the view on the selection
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
                                          // Trigger entry creation
                                          const start = new Date(selectedDayDate!);
                                          start.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);

                                          const end = new Date(selectedDayDate!);
                                          end.setHours(Math.floor(endHour), (endHour % 1) * 60, 0, 0);

                                          const duration = Math.round((end.getTime() - start.getTime()) / 60000);

                                          if (duration >= 1) {
                                            const timeString = format(start, 'h:mm a');
                                            setPendingManualEntry({
                                              category: task?.title || 'Manual Entry',
                                              description: `Manual Calibration (Started at ${timeString})`,
                                              taskId: task!.id,
                                              startTime: start,
                                              endTime: end,
                                              duration,
                                              isRunning: false,
                                            });
                                            setSessionSummary('');
                                            setSessionCategory(task?.title || 'Manual Entry');
                                            setIsSummaryDialogOpen(true);
                                          }
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
                                {/* Biological Prime Time Heatmap Underlay (Perfect Shadow Glow) */}
                                <div
                                  className="absolute inset-0 pointer-events-none opacity-100 transition-opacity duration-1000 z-0 blur-lg"
                                  style={{
                                    background: heatmapGradient
                                  }}
                                />

                                {/* Occupied Time Strips (Other Tasks) */}
                                {(() => {
                                  const otherDayEntries = timeEntries.filter(entry => {
                                    if (entry.taskId === task?.id || entry.isRunning) return false;
                                    const entryDate = toDate(entry.startTime);
                                    if (!entryDate || !selectedDayDate) return false;
                                    const entryDay = new Date(entryDate);
                                    entryDay.setHours(0, 0, 0, 0);
                                    const selectedDay = new Date(selectedDayDate);
                                    selectedDay.setHours(0, 0, 0, 0);
                                    return entryDay.getTime() === selectedDay.getTime();
                                  });

                                  return otherDayEntries.map(entry => {
                                    const start = toDate(entry.startTime);
                                    const end = toDate(entry.endTime);
                                    if (!start || !end) return null;

                                    const startHour = start.getHours() + start.getMinutes() / 60;
                                    const endHour = end.getHours() + end.getMinutes() / 60;
                                    const duration = endHour - startHour;

                                    return (
                                      <div
                                        key={`occupied-${entry.id}`}
                                        className={`absolute top-0 bottom-0 occupied-mesh border-x border-amber-500/10 z-[5] ${(isCreationMode || isZoomMarqueeMode) ? 'pointer-events-none' : ''}`}
                                        style={{
                                          left: `${(startHour / 24) * 100}%`,
                                          width: `${(duration / 24) * 100}%`
                                        }}
                                        title={`Occupied by: ${entry.category || 'Other Task'}`}
                                      />
                                    );
                                  });
                                })()}

                                {/* Selection Highlight */}
                                {selectionRange && (
                                  <div
                                    className="absolute top-0 bottom-0 bg-primary/20 border-x border-primary/50 z-20 pointer-events-none"
                                    style={{
                                      left: `${(Math.min(selectionRange.start, selectionRange.end) / 24) * 100}%`,
                                      width: `${(Math.abs(selectionRange.end - selectionRange.start) / 24) * 100}%`,
                                      zIndex: 30
                                    }}
                                  />
                                )}

                                {/* Hour grid lines */}
                                {Array.from({ length: 25 }).map((_, hour) => (
                                  <div
                                    key={`hour-grid-${hour}`}
                                    className="absolute top-0 bottom-0 border-l border-primary/10 z-10 pointer-events-none"
                                    style={{ left: `${(hour / 24) * 100}%` }}
                                  />
                                ))}

                                {/* 5-minute precision grid (Dynamic opacity based on zoom) */}
                                {zoomLevel >= 3 && Array.from({ length: 24 * 12 + 1 }).map((_, interval) => {
                                  const minutes = interval * 5;
                                  const position = (minutes / (24 * 60)) * 100;
                                  if (minutes % 60 === 0) return null;

                                  const isQuarter = minutes % 15 === 0;
                                  const isHalf = minutes % 30 === 0;

                                  return (
                                    <div
                                      key={`min-grid-${interval}`}
                                      className={`absolute top-0 bottom-0 border-l ${isHalf ? 'border-primary/5' : isQuarter ? 'border-muted-foreground/10' : 'border-muted-foreground/5'
                                        } z-0 pointer-events-none`}
                                      style={{
                                        left: `${position}%`,
                                        opacity: zoomLevel < 6 && !isHalf ? 0 : 1
                                      }}
                                    />
                                  );
                                })}

                                {/* Time entries */}
                                {(() => {
                                  // Intelligent Overlap Detection Logic
                                  const sortedEntries = [...dayEntries].sort((a, b) => {
                                    const startA = toDate(a.startTime)?.getTime() || 0;
                                    const startB = toDate(b.startTime)?.getTime() || 0;
                                    return startA - startB;
                                  });

                                  // Assign rows to overlapping entries
                                  const entryRows: Record<string, number> = {};
                                  const entryHasConflict: Record<string, boolean> = {};
                                  const columns: TimeEntry[][] = [];

                                  sortedEntries.forEach(entry => {
                                    const start = toDate(entry.startTime);
                                    const end = toDate(entry.endTime);
                                    if (!start || !end) return;

                                    let placed = false;
                                    for (let i = 0; i < columns.length; i++) {
                                      const lastInCol = columns[i][columns[i].length - 1];
                                      const lastEnd = toDate(lastInCol.endTime);

                                      if (lastEnd && start.getTime() >= lastEnd.getTime()) {
                                        columns[i].push(entry);
                                        entryRows[entry.id] = i;
                                        placed = true;
                                        break;
                                      }
                                    }

                                    if (!placed) {
                                      entryRows[entry.id] = columns.length;
                                      columns.push([entry]);
                                    }

                                    // Detect if this entry conflicts with ANY other entry for red glow
                                    const hasConflict = dayEntries.some(other => {
                                      if (other.id === entry.id) return false;
                                      const otherStart = toDate(other.startTime);
                                      const otherEnd = toDate(other.endTime);
                                      if (!otherStart || !otherEnd) return false;

                                      return (start < otherEnd && end > otherStart);
                                    });
                                    entryHasConflict[entry.id] = hasConflict;
                                  });

                                  const rowCount = Math.max(1, columns.length);

                                  return dayEntries.map((entry) => {
                                    const startTime = toDate(entry.startTime);
                                    const endTime = toDate(entry.endTime);
                                    if (!startTime || !endTime) return null;

                                    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                                    const endHour = endTime.getHours() + endTime.getMinutes() / 60;
                                    const duration = Math.max(0.1, endHour - startHour); // Minimum width for visibility

                                    const left = (startHour / 24) * 100;
                                    const width = (duration / 24) * 100;

                                    const categoryColor = getCategoryColor(entry.category || task?.title);
                                    const hasConflict = entryHasConflict[entry.id];
                                    const isDeepFlow = getEntryDuration(entry) >= 90;
                                    const row = entryRows[entry.id] || 0;

                                    // Visual "Split" calculation
                                    const topOffset = 8 + (row * (64 / rowCount));
                                    const height = Math.max(20, (64 / rowCount) - 4);

                                    return (
                                      <div
                                        key={entry.id}
                                        className={`absolute rounded-lg shadow-lg hover:shadow-xl transition-all group cursor-pointer z-20 ${hasConflict ? 'ring-2 ring-destructive ring-offset-1 animate-pulse-subtle' :
                                          isDeepFlow ? 'border-2 border-white/60 animate-flow-pulse' : ''
                                          }`}
                                        style={{
                                          left: `${left}%`,
                                          width: `${width}%`,
                                          top: `${topOffset}px`,
                                          height: `${height}px`,
                                          background: categoryColor,
                                          boxShadow: hasConflict ? `0 0 20px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.2)` : undefined
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditNotes(entry);
                                        }}
                                        title={`${entry.category || task?.title} | ${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}: ${entry.description || 'Session'}${hasConflict ? ' (OVERLAP DETECTED)' : ''
                                          }`}
                                      >
                                        <div className="absolute inset-0 flex flex-col items-center justify-center px-1 overflow-hidden pointer-events-none">
                                          <p className="text-[8px] font-black text-primary-foreground leading-none">
                                            {getEntryDuration(entry)}m
                                          </p>
                                          {isDeepFlow && (
                                            <p className="text-[6px] font-black text-white uppercase tracking-[0.1em] mt-0.5 opacity-80">
                                              Deep Flow
                                            </p>
                                          )}
                                          {zoomLevel >= 8 && height > 25 && (
                                            <p className="text-[6px] font-bold text-primary-foreground/70 mt-0.5 truncate uppercase">
                                              {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                                            </p>
                                          )}
                                        </div>
                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-5 w-5 bg-black/20 hover:bg-destructive text-white border-none rounded-md"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteTimeEntry(entry.id);
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                        {hasConflict && (
                                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full border border-background z-20" />
                                        )}
                                        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary-foreground/20 opacity-0 group-hover:opacity-100"></div>
                                        <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-primary-foreground/20 opacity-0 group-hover:opacity-100"></div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>

                              {/* Current time indicator (if today) */}
                              {selectedDayDate.toDateString() === new Date().toDateString() && (() => {
                                const now = new Date();
                                const currentHour = now.getHours() + now.getMinutes() / 60;
                                const position = (currentHour / 24) * 100;
                                return (
                                  <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10 animate-breathing-glow"
                                    style={{
                                      left: `${position}%`,
                                      boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
                                    }}
                                  >
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-destructive rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Routine Stencils (Quick Templates) */}
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

                        {/* Entry List */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Session Details</p>
                          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {dayEntries.length > 0 ? dayEntries.map((entry) => (
                              <div key={entry.id} className="p-4 rounded-xl bg-muted/20 border border-primary/5 hover:border-primary/20 transition-all">
                                <div className="flex items-start gap-4">
                                  <div
                                    className="w-1 self-stretch rounded-full opacity-60"
                                    style={{ background: getCategoryColor(entry.category || task?.title) }}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-sm font-black">{entry.description || 'Calibration Session'}</p>
                                      <Badge variant="outline" className="text-[8px] h-4 font-bold border-primary/10 bg-primary/5 uppercase tracking-tighter">
                                        {entry.category || task?.title}
                                      </Badge>
                                    </div>
                                    <p className="text-[10px] font-bold text-muted-foreground">
                                      {toDate(entry.startTime) && format(toDate(entry.startTime)!, 'h:mm a')} - {toDate(entry.endTime) && format(toDate(entry.endTime)!, 'h:mm a')}
                                    </p>
                                    {entry.notes && <p className="text-[10px] italic text-primary/60 mt-2">{entry.notes}</p>}
                                  </div>
                                  <div className="flex items-center gap-2 no-capture">
                                    <Badge variant="secondary" className="font-black">{formatDuration(getEntryDuration(entry))}</Badge>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/10" onClick={() => handleEditNotes(entry)}>
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTimeEntry(entry.id)}>
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
                    );
                  })()}

                  {isCapturing && (
                    <div className="mt-12 flex items-center justify-between opacity-40 border-t border-primary/10 pt-8">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-white">Verified Progress Block</span>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase italic tracking-widest">Built with Astra-Timer</span>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {/* Dependency Management Modal */}
          <Dialog open={isDependencyModalOpen} onOpenChange={setIsDependencyModalOpen}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[2.5rem] border-primary/10 bg-background/95 backdrop-blur-2xl shadow-2xl">
              <div className="p-8 sm:p-10">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-3xl font-black tracking-tight italic flex items-center gap-3">
                    <Link2 className="h-6 w-6 text-primary" />
                    Strategic Critical Path
                  </DialogTitle>
                  <DialogDescription className="text-xs font-black uppercase tracking-widest opacity-40">
                    Configure situational relationships for "{task?.title}"
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="pre-requisites" className="w-full">
                  <TabsList className="w-full grid grid-cols-2 bg-muted/20 p-1 h-12 rounded-xl mb-6">
                    <TabsTrigger value="pre-requisites" className="rounded-lg font-black uppercase tracking-widest text-[9px] data-[state=active]:bg-background">
                      Pre-requisites
                    </TabsTrigger>
                    <TabsTrigger value="unlocks" className="rounded-lg font-black uppercase tracking-widest text-[9px] data-[state=active]:bg-background">
                      Unlocks (Dependents)
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="pre-requisites" className="space-y-4">
                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-2">
                      {otherTasks.length > 0 ? otherTasks.map(other => (
                        <div
                          key={other.id}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${task?.dependencyIds?.includes(other.id) ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-muted/10 border-transparent hover:border-primary/10 hover:bg-muted/20'}`}
                          onClick={() => handleToggleDependency(other.id)}
                        >
                          <div className="flex items-center gap-4">
                            <Checkbox
                              checked={task?.dependencyIds?.includes(other.id) || false}
                              className={`rounded-full h-5 w-5 border-2 ${task?.dependencyIds?.includes(other.id) ? 'bg-primary border-primary' : 'border-primary/10'}`}
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-sm truncate">{other.title}</p>
                              <p className="text-[10px] font-black uppercase tracking-tighter opacity-40">{other.status}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[8px] font-black hidden group-hover:flex ${other.status === 'done' ? 'text-green-500 border-green-500/10' : 'text-muted-foreground border-muted-foreground/10'}`}>
                            {other.status.toUpperCase()}
                          </Badge>
                        </div>
                      )) : (
                        <div className="py-20 text-center opacity-30 italic">No other tasks available in mission control</div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="unlocks" className="space-y-4">
                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-2">
                      {otherTasks.length > 0 ? otherTasks.map(other => {
                        const isDependent = other.dependencyIds?.includes(task?.id || '');
                        return (
                          <div
                            key={other.id}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${isDependent ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-muted/10 border-transparent hover:border-primary/10 hover:bg-muted/20'}`}
                            onClick={() => handleToggleDependent(other.id)}
                          >
                            <div className="flex items-center gap-4">
                              <Checkbox
                                checked={isDependent || false}
                                className={`rounded-full h-5 w-5 border-2 ${isDependent ? 'bg-primary border-primary' : 'border-primary/10'}`}
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-sm truncate">{other.title}</p>
                                <p className="text-[10px] font-black uppercase tracking-tighter opacity-40">{other.status}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className={`text-[8px] font-black hidden group-hover:flex ${other.status === 'done' ? 'text-green-500 border-green-500/10' : 'text-muted-foreground border-muted-foreground/10'}`}>
                              {other.status.toUpperCase()}
                            </Badge>
                          </div>
                        );
                      }) : (
                        <div className="py-20 text-center opacity-30 italic">No other tasks available in mission control</div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="pt-6 border-t border-primary/5">
                  <Button
                    onClick={() => setIsDependencyModalOpen(false)}
                    className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20"
                  >
                    Save Operational Mapping
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

        </MainLayout>
      </DataLoader>
    </ProtectedRoute>
  );
}

export default function TaskDetailPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground animate-pulse">Syncing task details...</p>
        </div>
      </MainLayout>
    }>
      <TaskDetailPageContent />
    </Suspense>
  );
}
