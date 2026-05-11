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
  Maximize2,
  MessageSquare,
  Minimize2,
  MonitorUp,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Square,
  Trash2,
  TrendingUp,
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
import type { Task, TimeEntry } from '@/types';

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
    setSessionSummary(entry?.notes || '');
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

      await updateTimeEntry(editingEntryId, {
        notes: sessionSummary,
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
      await stopTimeEntry(stoppingEntryId, sessionSummary);
      await updateTimeEntry(stoppingEntryId, {
        category: sessionCategory || timeEntries.find((entry) => entry.id === stoppingEntryId)?.category,
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
    setSessionSummary(entry.notes || '');
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
          <div className="space-y-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="h-4 border-primary/20 bg-primary/5 px-2 py-0 text-[9px] font-black uppercase tracking-widest text-primary"
                  >
                    Chronos System
                  </Badge>
                </div>
                <h1 className="bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-3xl font-black italic tracking-tight text-transparent lg:text-4xl">
                  Temporal Audit
                </h1>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground opacity-70">
                  Quantifying your cognitive attention
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {selectedProjectId && (
                  <Badge
                    variant="outline"
                    className="flex h-10 items-center gap-2 border-primary/10 bg-background/40 px-4 text-[10px] font-black uppercase tracking-widest shadow-sm backdrop-blur-sm"
                  >
                    <span className="text-muted-foreground opacity-50">Context:</span>
                    {selectedProjectId === 'personal'
                      ? 'Personal'
                      : projects.find((project) => project.id === selectedProjectId)?.name}
                  </Badge>
                )}

                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="h-10 rounded-xl px-4 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                >
                  <Play className="mr-2 h-4 w-4 fill-current" />
                  Start Another Timer
                </Button>

                <Link href="/time-tracking/calendar">
                  <Button
                    variant="outline"
                    className="h-10 rounded-xl border-primary/10 bg-background/40 px-4 text-[10px] font-black uppercase tracking-widest"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Timeline View
                  </Button>
                </Link>
              </div>
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

            <Card className="group relative overflow-hidden rounded-[2.5rem] border-none bg-background/40 shadow-2xl transition-all duration-500 hover:shadow-primary/5 backdrop-blur-2xl">
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
                      {runningEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-[2rem] border border-primary/10 bg-background/50 p-6 shadow-lg shadow-primary/5"
                        >
                          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 space-y-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-base font-black uppercase tracking-tight italic text-primary">
                                  {entry.category}
                                </span>
                                {entry.projectId && <ProjectBadge projectId={entry.projectId} className="h-5" />}
                                {entry.taskId && (
                                  <button
                                    type="button"
                                    onClick={() => handleNavigateToTask(entry.taskId!)}
                                    className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary/10"
                                  >
                                    {findTaskTitle(entry.taskId) || 'Linked task'}
                                  </button>
                                )}
                              </div>

                              {entry.description && (
                                <p className="max-w-xl text-sm font-medium italic text-muted-foreground/65">
                                  {entry.description}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/50">
                                <div className="flex items-center gap-2 rounded-full border border-primary/10 bg-muted/20 px-3 py-1.5">
                                  <Clock className="h-3 w-3 text-primary animate-spin-slow" />
                                  Started {formatDistanceToNow(new Date(entry.startTime), { addSuffix: true })}
                                </div>
                                <div className="rounded-full border border-primary/10 bg-muted/20 px-3 py-1.5">
                                  {format(new Date(entry.startTime), 'MMM d, h:mm a')}
                                </div>
                              </div>
                            </div>

                            <div className="flex min-w-[180px] flex-col items-start gap-4 sm:items-end">
                              <div className="font-mono text-3xl font-black tracking-tighter text-foreground tabular-nums sm:text-4xl">
                                {getElapsedTime(entry.startTime, currentTime)}
                              </div>
                              <Button
                                onClick={() => handleStopTimer(entry.id)}
                                className="h-12 w-full rounded-2xl bg-destructive text-sm font-black text-destructive-foreground shadow-xl shadow-destructive/20 transition-all hover:scale-[1.01] hover:bg-destructive/90 active:scale-[0.99] sm:w-auto"
                              >
                                <Square className="mr-2 h-4 w-4 fill-current" />
                                Stop This Timer
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
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

            <Card className="overflow-hidden rounded-[2rem] border-primary/5 bg-background/60 shadow-2xl backdrop-blur-xl">
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

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <Card className="group relative overflow-hidden rounded-[1.5rem] border-primary/5 bg-background/40 p-6 backdrop-blur-sm transition-all duration-500 hover:border-primary/20">
                <div className="absolute right-0 top-0 p-4 opacity-5 transition-opacity group-hover:opacity-10">
                  <Clock className="h-12 w-12 text-primary" />
                </div>
                <h3 className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  Temporal Flow [24H]
                </h3>
                <div className="flex items-baseline gap-1">
                  <div className="text-3xl font-black tracking-tighter text-primary tabular-nums">
                    {formatDuration(totalTimeToday).split(' ')[0]}
                  </div>
                  <span className="text-sm font-black uppercase tracking-widest text-primary/40">
                    {formatDuration(totalTimeToday).split(' ')[1] || 'm'}
                  </span>
                </div>
                <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-primary/5">
                  <div
                    className="h-full bg-primary animate-in slide-in-from-left duration-1000"
                    style={{ width: '70%' }}
                  />
                </div>
              </Card>

              <Card className="group relative overflow-hidden rounded-[1.5rem] border-primary/5 bg-background/40 p-6 backdrop-blur-sm transition-all duration-500 hover:border-primary/20">
                <div className="absolute right-0 top-0 p-4 opacity-5 transition-opacity group-hover:opacity-10">
                  <TrendingUp className="h-12 w-12 text-emerald-500" />
                </div>
                <h3 className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                  <div className="h-1 w-1 rounded-full bg-emerald-500" />
                  Focus Snapshots
                </h3>
                <div className="text-4xl font-black leading-none tracking-tighter text-foreground">
                  {todayEntries.length}
                </div>
                <p className="mt-3 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
                  Initialized Sessions Today
                </p>
              </Card>

              <Card className="group relative overflow-hidden rounded-[1.5rem] border-primary/5 bg-background/40 p-6 backdrop-blur-sm transition-all duration-500 hover:border-primary/20">
                <div className="absolute right-0 top-0 p-4 opacity-5 transition-opacity group-hover:opacity-10">
                  <Sparkles className="h-12 w-12 text-blue-500" />
                </div>
                <h3 className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                  <div className="h-1 w-1 rounded-full bg-blue-500" />
                  Context Diversity
                </h3>
                <div className="text-4xl font-black leading-none tracking-tighter text-foreground">
                  {Object.keys(categorySummary).length}
                </div>
                <p className="mt-3 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
                  {Object.keys(categorySummary).length === 1 ? 'Focus Context' : 'Unique Contexts'}
                </p>
              </Card>
            </div>

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

              <Card className="overflow-hidden rounded-[2rem] border-primary/5 bg-background/60 shadow-2xl backdrop-blur-xl lg:col-span-2">
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

                            {entry.notes && (
                              <div className="mt-4 rounded-xl border border-primary/10 bg-primary/5 p-4">
                                <p className="whitespace-pre-wrap text-[11px] font-medium italic leading-relaxed text-foreground/80">
                                  {entry.notes}
                                </p>
                              </div>
                            )}
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
            <DialogContent className="max-w-xl overflow-hidden rounded-[2rem] border-primary/10 bg-background/95 p-0 shadow-2xl backdrop-blur-2xl">
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
                                  {entry.notes && <p className="text-[10px] italic text-primary/60 mt-2">{entry.notes}</p>}
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
