'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format, addDays, subDays, differenceInMinutes } from 'date-fns';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Minimize2,
  Maximize2,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  ZoomIn,
  ZoomOut,
  Zap,
  Coffee,
  FileText,
  MessageSquare,
  Sparkles,
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { toast } from 'sonner';
import { useStore } from '@/lib/store';
import type { Task, TimeEntry, LiveUpdateNode } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { ProjectBadge } from '@/components/projects/project-badge';
import { ProjectSelector } from '@/components/projects/project-selector';

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

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

const MarkdownNotesRenderer = ({ notes }: { notes: string }) => {
  if (!notes) return null;

  const hasMarkdown = notes.includes('###') || notes.includes('**') || notes.includes('- ') || notes.includes('- [');
  if (!hasMarkdown) {
    return (
      <p className="whitespace-pre-wrap text-[11px] font-medium italic leading-relaxed text-foreground/80">
        {notes}
      </p>
    );
  }

  const lines = notes.split('\n');

  return (
    <div className="space-y-2 text-start select-text cursor-text">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-1" />;

        const leadingSpaces = line.match(/^\s*/)?.[0].length || 0;
        const indentLevel = Math.floor(leadingSpaces / 2);
        const paddingLeft = indentLevel > 0 ? `${indentLevel * 1.25}rem` : '0px';

        if (trimmed.startsWith('###')) {
          const text = trimmed.replace(/^###\s*/, '');
          return (
            <h4
              key={index}
              style={{ paddingLeft }}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-4 mb-2 flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
              {text}
            </h4>
          );
        }

        if (trimmed.startsWith('**') && trimmed.endsWith('**:')) {
          const text = trimmed.replace(/^\*\*\s*/, '').replace(/\s*\*\*:\s*$/, '');
          const phaseColors: Record<string, string> = {
            'Deep Work': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
            'Planning': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
            'Coding': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
            'Debugging': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
            'Break': 'bg-amber-500/10 text-amber-500 border-amber-500/20'
          };
          const badgeStyle = phaseColors[text] || 'bg-muted/30 text-muted-foreground/80';

          return (
            <div key={index} style={{ paddingLeft }} className="mt-3 block">
              <Badge variant="outline" className={cn("h-5 text-[8px] font-black uppercase tracking-widest px-2.5 border-current bg-background/50", badgeStyle)}>
                {text}
              </Badge>
            </div>
          );
        }

        const todoMatch = trimmed.match(/^-\s*\[\s*([ xX])\s*\]\s*(.*)/);
        if (todoMatch) {
          const isDone = todoMatch[1].toLowerCase() === 'x';
          const rest = todoMatch[2].trim();

          const timeBadgeMatch = rest.match(/^`\[([\d:]+)\]`\s*(.*)/) || rest.match(/^\[([\d:]+)\]\s*(.*)/);
          const timeBadge = timeBadgeMatch ? timeBadgeMatch[1] : null;
          const content = timeBadgeMatch ? timeBadgeMatch[2] : rest;

          return (
            <div
              key={index}
              style={{ paddingLeft: `calc(${paddingLeft} + 0.5rem)` }}
              className={cn(
                "flex items-start gap-2.5 py-0.5 text-[11px] font-semibold leading-relaxed text-foreground/85",
                isDone && "line-through text-muted-foreground/50 italic"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 rounded border transition-colors flex items-center justify-center shrink-0",
                  isDone
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-primary/30 bg-background"
                )}
              >
                {isDone && <CheckCircle2 className="h-2.5 w-2.5 stroke-[3]" />}
              </div>
              <div className="min-w-0">
                {timeBadge && (
                  <Badge variant="outline" className="h-4 border-primary/10 bg-muted/20 text-[8px] font-black text-primary/65 mr-1.5 px-1.5 py-0 tabular-nums">
                    {timeBadge}
                  </Badge>
                )}
                {content}
              </div>
            </div>
          );
        }

        if (trimmed.startsWith('-')) {
          const rest = trimmed.replace(/^-\s*/, '').trim();

          const timeBadgeMatch = rest.match(/^`\[([\d:]+)\]`\s*(.*)/) || rest.match(/^\[([\d:]+)\]\s*(.*)/);
          const timeBadge = timeBadgeMatch ? timeBadgeMatch[1] : null;
          const content = timeBadgeMatch ? timeBadgeMatch[2] : rest;

          return (
            <div
              key={index}
              style={{ paddingLeft: `calc(${paddingLeft} + 0.5rem)` }}
              className="flex items-start gap-2.5 py-0.5 text-[11px] font-semibold leading-relaxed text-foreground/85"
            >
              <div className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/45 shrink-0" />
              <div className="min-w-0">
                {timeBadge && (
                  <Badge variant="outline" className="h-4 border-primary/10 bg-muted/20 text-[8px] font-black text-primary/65 mr-1.5 px-1.5 py-0 tabular-nums">
                    {timeBadge}
                  </Badge>
                )}
                {content}
              </div>
            </div>
          );
        }

        return (
          <p
            key={index}
            style={{ paddingLeft }}
            className="text-[11px] font-semibold leading-relaxed text-foreground/75"
          >
            {line}
          </p>
        );
      })}
    </div>
  );
};

interface TimeCalibrationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate: Date;
}

export function TimeCalibrationModal({
  isOpen,
  onOpenChange,
  initialDate,
}: TimeCalibrationModalProps) {
  const {
    tasks,
    timeEntries,
    projects,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    stopTimeEntry,
  } = useStore();

  const [selectedDayDate, setSelectedDayDate] = useState<Date>(initialDate);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Sync selected date from outside if modal is closed and re-opened
  useEffect(() => {
    if (isOpen) {
      setSelectedDayDate(initialDate);
    }
  }, [isOpen, initialDate]);

  const [isModalExpanded, setIsModalExpanded] = useState(false);
  const [isCreationMode, setIsCreationMode] = useState(false);
  const [isZoomMarqueeMode, setIsZoomMarqueeMode] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.5);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Editing Time Entries state
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [stoppingEntryId, setStoppingEntryId] = useState<string | null>(null);
  const [pendingManualEntry, setPendingManualEntry] = useState<Omit<TimeEntry, 'id'> | null>(null);
  
  const [sessionSummary, setSessionSummary] = useState('');
  const [sessionCategory, setSessionCategory] = useState('');
  const [sessionProjectId, setSessionProjectId] = useState<string | undefined>('');
  const [sessionTaskId, setSessionTaskId] = useState('');
  const [isSummaryTaskSearchOpen, setIsSummaryTaskSearchOpen] = useState(false);

  const [editingStartTime, setEditingStartTime] = useState('');
  const [editingEndTime, setEditingEndTime] = useState('');

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

  const selectedDayEntries = useMemo(() => {
    return [...timeEntries]
      .filter((entry) => {
        const entryDate = new Date(entry.startTime);
        return entryDate.toDateString() === selectedDayDate.toDateString();
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [selectedDayDate, timeEntries]);

  const findTaskTitle = useCallback(
    (taskId?: string) => (taskId ? tasks.find((task) => task.id === taskId)?.title : undefined),
    [tasks]
  );

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

  const handleConfirmStop = async () => {
    if (editingEntryId) {
      const currentEntry = timeEntries.find((entry) => entry.id === editingEntryId);
      if (!currentEntry) {
        setIsSummaryDialogOpen(false);
        return;
      }

      const nextStart = editingStartTime ? new Date(editingStartTime) : new Date(currentEntry.startTime);
      const nextEnd = editingEndTime ? new Date(editingEndTime) : currentEntry.endTime ? new Date(currentEntry.endTime) : undefined;
      const nextDuration = nextEnd ? Math.max(0, Math.floor((nextEnd.getTime() - nextStart.getTime()) / 60000)) : undefined;

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
      setIsSummaryDialogOpen(false);
      toast.success('Session updated successfully!');
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
      setIsSummaryDialogOpen(false);
      setManualEntry((prev) => ({
        ...prev,
        description: '',
        hours: '0',
        minutes: '30',
      }));
      toast.success('Manual entry calibrated and saved!');
      return;
    }
  };

  const buildManualEntryFromRange = (startHour: number, endHour: number) => {
    const start = new Date(selectedDayDate);
    start.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);

    const end = new Date(selectedDayDate);
    end.setHours(Math.floor(endHour), Math.round((endHour % 1) * 60), 0, 0);
    const now = new Date();
    const isToday = selectedDayDate.toDateString() === now.toDateString();
    const shouldContinueNow = isToday && start.getTime() < now.getTime() && end.getTime() > now.getTime();

    const duration = Math.round((end.getTime() - start.getTime()) / 60000);
    if (duration < 1) return;

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
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const dataUrl = await htmlToImage.toPng(captureAreaRef.current, {
        backgroundColor: '#0a0a0a',
        style: {
          transform: 'scale(1)',
        },
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList.contains('no-capture')) {
            return false;
          }
          return true;
        }
      });
      setIsCapturing(false);

      const link = document.createElement('a');
      link.download = `time-calibration-audit-${format(selectedDayDate, 'yyyy-MM-dd')}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Temporal flow visualization captured!');
    } catch (error) {
      console.error('Error capturing screen:', error);
      setIsCapturing(false);
      toast.error('Failed to capture snapshot.');
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          onOpenChange(open);
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
                    Daily Calibration Studio
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2 no-capture">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 shadow-lg shadow-primary/5 transition-all"
                    onClick={handleCapture}
                    title="Capture Screen"
                    disabled={isCapturing}
                  >
                    <Camera className={`h-5 w-5 ${isCapturing ? 'animate-pulse' : ''}`} />
                  </Button>

                  <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-primary/5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => setZoomLevel((prev) => Math.max(1, prev - 0.25))}
                      disabled={zoomLevel <= 1}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-2 h-8 text-[10px] font-black rounded-lg hover:bg-primary/10 transition-colors flex items-center gap-1.5"
                      onClick={() => {
                        setZoomLevel(1.5);
                        if (timelineRef.current) {
                          timelineRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                        }
                      }}
                      title="Reset View"
                    >
                      {zoomLevel !== 1.5 && <RotateCcw className="h-3 w-3 animate-in fade-in zoom-in duration-300" />}
                      {zoomLevel.toFixed(2)}x
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => setZoomLevel((prev) => Math.min(20, prev + 0.25))}
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
                    title="Zoom Selection"
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
                    title="Drag Selection Time logger"
                  >
                    <Plus className={`h-4 w-4 transition-transform duration-300 ${isCreationMode ? 'rotate-45' : ''}`} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl bg-muted/30 border border-primary/5 hover:bg-primary/5"
                    onClick={() => setIsModalExpanded(!isModalExpanded)}
                    title={isModalExpanded ? 'Shrink' : 'Full width'}
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
              <div className="space-y-6">
                {/* Micro KPIs */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-primary/5 rounded-2xl overflow-hidden bg-background/50 backdrop-blur-md">
                    <CardContent className="p-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Actual Logged</p>
                      <p className="text-2xl font-black">
                        {formatDuration(selectedDayEntries.reduce((sum, entry) => sum + getEntryDuration(entry), 0))}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/5 rounded-2xl overflow-hidden bg-background/50 backdrop-blur-md">
                    <CardContent className="p-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Recorded Sessions</p>
                      <p className="text-2xl font-black">{selectedDayEntries.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/5 rounded-2xl overflow-hidden bg-background/50 backdrop-blur-md">
                    <CardContent className="p-4">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Average Blocks</p>
                      <p className="text-2xl font-black">
                        {selectedDayEntries.length > 0
                          ? formatDuration(Math.round(selectedDayEntries.reduce((sum, entry) => sum + getEntryDuration(entry), 0) / selectedDayEntries.length))
                          : '0m'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Multilane Drag Panel */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Multi-Track Time Calibration Grid</p>
                      <p className="mt-1 text-[8px] font-bold text-muted-foreground/60">Audio/video-style lanes. Drag + select empty spaces to stamp actual calibrations.</p>
                    </div>
                    <p className="text-[8px] font-bold text-muted-foreground/60">Zoom: Mousewheel + Drag to Pan</p>
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
                    `
                  }} />

                  <div
                    ref={timelineRef}
                    className="custom-scrollbar relative bg-muted/20 rounded-2xl p-6 overflow-x-auto select-none cursor-grab active:cursor-grabbing border border-primary/5"
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
                      {/* Hours Label Header */}
                      <div className="relative h-6 mb-4" style={{ width: '100%' }}>
                        {Array.from({ length: 25 }).map((_, hour) => (
                          <div
                            key={`label-h-${hour}`}
                            className="absolute -translate-x-1/2 flex flex-col items-center"
                            style={{ left: `${(hour / 24) * 100}%` }}
                          >
                            <p className="text-[10px] font-black text-primary/70 leading-none font-mono">
                              {(hour % 24).toString().padStart(2, '0')}
                            </p>
                            <div className="w-px h-1 bg-primary/30 mt-1" />
                          </div>
                        ))}
                      </div>

                      {/* Tracks mapping */}
                      <div className="space-y-3">
                        {timelineTracks.length > 0 ? timelineTracks.map((track) => (
                          <div key={track.key} className="grid grid-cols-[160px_minmax(0,1fr)] gap-4 items-center">
                            <div className="rounded-xl border border-primary/5 bg-background/70 px-4 py-3 shadow-sm">
                              <div className="flex items-center gap-2">
                                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-muted-foreground/60">Category</p>
                                {track.entries.some((entry) => entry.isRunning) && (
                                  <Badge className="h-4 bg-primary/10 text-primary border border-primary/20 text-[7px] font-black uppercase tracking-widest animate-pulse px-1">
                                    LIVE
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs font-black truncate">{track.label}</p>
                              <p className="mt-0.5 text-[8px] font-bold text-muted-foreground/50">
                                {track.entries.length} {track.entries.length === 1 ? 'session' : 'sessions'}
                              </p>
                            </div>

                            <div
                              className={cn(
                                "relative h-16 bg-background/30 rounded-xl border border-primary/5 shadow-inner overflow-hidden",
                                isCreationMode && 'cursor-crosshair ring-1 ring-primary/35 bg-primary/5',
                                isZoomMarqueeMode && 'cursor-zoom-in ring-1 ring-primary/20 bg-primary/5',
                                isSelecting && 'scale-[1.002] bg-background/50 shadow-md'
                              )}
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
                                  moveHour = Math.round(moveHour * 4) / 4; // snap to 15m
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
                                        const targetZoom = Math.min(Math.max(24 / selectionDuration, 1.5), 20);
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
                                  className="absolute top-0 bottom-0 border-l border-primary/5 z-10 pointer-events-none"
                                  style={{ left: `${(hour / 24) * 100}%` }}
                                />
                              ))}

                              {/* Stamp Blocks */}
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
                                    className={cn(
                                      "absolute rounded-lg shadow-md hover:shadow-lg transition-all group cursor-pointer z-20 flex items-center justify-center border-l-4 border-black/15",
                                      isDeepFlow && 'border-2 border-white/60 animate-flow-pulse',
                                      isRunning && 'ring-2 ring-primary/70 ring-offset-2 ring-offset-background animate-pulse'
                                    )}
                                    style={{
                                      left: `${left}%`,
                                      width: `${width}%`,
                                      top: '6px',
                                      height: '52px',
                                      background: categoryColor,
                                      boxShadow: isRunning ? '0 0 0 1px rgba(255,255,255,0.15), 0 0 24px rgba(59,130,246,0.3)' : undefined,
                                    }}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleEditNotes(entry);
                                    }}
                                    title={`${entry.category} | ${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`}
                                  >
                                    <div className="absolute inset-0 flex flex-col items-center justify-center px-1 overflow-hidden pointer-events-none select-none text-white font-black">
                                      {isRunning ? (
                                        <span className="text-[7px] tracking-widest text-white/90">LIVE ({getElapsedTime(startTime, currentTime)})</span>
                                      ) : (
                                        <span className="text-[9px] tracking-tight">{getEntryDuration(entry)}m</span>
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

                              {/* Red NOW breathing line */}
                              {selectedDayDate.toDateString() === new Date().toDateString() && (
                                <div
                                  className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10 animate-breathing-glow"
                                  style={{
                                    left: `${(((currentTime.getHours() + currentTime.getMinutes() / 60) / 24) * 100)}%`,
                                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
                                  }}
                                >
                                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-destructive rounded-full" />
                                </div>
                              )}
                            </div>
                          </div>
                        )) : (
                          <div className="rounded-2xl border border-dashed border-primary/10 bg-background/40 px-6 py-10 text-center text-xs font-black uppercase tracking-widest text-muted-foreground/50">
                            No logs registered on this day. Open calibration mode using [+] above.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stencil stamps */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Calibration Stamps</p>
                    <p className="text-[8px] font-bold text-muted-foreground/40 italic">Drag one of these onto a track to immediately log a routine block.</p>
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
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/40 border border-primary/5 hover:border-primary/20 hover:bg-primary/5 transition-all cursor-grab active:cursor-grabbing group shadow-sm hover:shadow-md"
                        >
                          <div
                            className="w-4 h-4 rounded-lg flex items-center justify-center p-0.5 shrink-0"
                            style={{ background: getCategoryColor(template.category) }}
                          >
                            <Icon className="h-full w-full text-white" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-tight leading-none text-foreground/80">{template.name}</span>
                            <span className="text-[7px] font-bold text-muted-foreground/60 leading-tight mt-0.5">{formatDuration(template.duration)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Separator className="bg-primary/5" />

                {/* Session Details List */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Timeline Log Entries</p>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                    {selectedDayEntries.length > 0 ? selectedDayEntries.map((entry) => (
                      <div key={entry.id} className={cn("p-4 rounded-xl bg-background/30 border transition-all border-primary/5 hover:border-primary/20", entry.isRunning && 'border-primary/25 bg-primary/5 shadow-md shadow-primary/5')}>
                        <div className="flex items-start gap-4">
                          <div
                            className={cn("w-1 self-stretch rounded-full", entry.isRunning ? 'opacity-100 shadow-md' : 'opacity-65')}
                            style={{ background: getCategoryColor(entry.category) }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-sm font-black truncate">{entry.description || 'Calibration Block'}</p>
                              <Badge variant="outline" className="text-[8px] h-4 font-black border-primary/10 bg-primary/5 uppercase tracking-widest px-1.5 shrink-0">
                                {entry.category}
                              </Badge>
                              {entry.isRunning && (
                                <Badge className="h-4 bg-primary/10 text-primary border border-primary/20 text-[8px] font-black uppercase tracking-widest animate-pulse">
                                  LIVE TIMER
                                </Badge>
                              )}
                            </div>
                            <p className="text-[9px] font-bold text-muted-foreground/60 font-mono">
                              {format(new Date(entry.startTime), 'HH:mm')} - {entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : 'Running'}
                            </p>
                            {entry.notes && (
                              <div className="mt-2 text-start max-w-full overflow-hidden border-l-2 border-primary/10 pl-2">
                                <MarkdownNotesRenderer notes={entry.notes} />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 no-capture shrink-0">
                            <Badge variant="secondary" className="font-mono font-black text-xs">
                              {entry.isRunning ? getElapsedTime(new Date(entry.startTime), currentTime) : formatDuration(getEntryDuration(entry))}
                            </Badge>
                            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/10" onClick={() => handleEditNotes(entry)}>
                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => void deleteTimeEntry(entry.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <p className="text-center text-xs text-muted-foreground/50 italic py-8 uppercase tracking-widest font-black">No calibrated entries log on this date.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editing Dialog */}
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
              <DialogTitle className="text-2xl font-black tracking-tight">
                {editingEntryId ? 'Refining Session Notes' : 'Temporal Calibration Summary'}
              </DialogTitle>
              <DialogDescription className="text-xs font-black uppercase tracking-widest opacity-40">
                {editingEntryId
                  ? 'Refine your insights and calibration properties'
                  : pendingManualEntry
                    ? `Create calibrated log block for ${formatDuration(pendingManualEntry.duration || 0)}`
                    : 'Confirm session metadata'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                  Link Workspace Project & Task
                </Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/50">Project</Label>
                    <ProjectSelector
                      value={sessionProjectId}
                      onChange={(value) => {
                        setSessionProjectId(value || '');
                        setSessionTaskId('');
                      }}
                      placeholder="Personal Tasks"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/50">Task</Label>
                    <Popover open={isSummaryTaskSearchOpen} onOpenChange={setIsSummaryTaskSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-12 w-full justify-between rounded-xl border-primary/5 bg-muted/30 px-3 font-medium hover:bg-muted/40 text-left text-xs"
                        >
                          <span className="truncate">
                            {sessionTaskId
                              ? tasks.find((task) => task.id === sessionTaskId)?.title || 'Unlinked'
                              : 'Select target task'}
                          </span>
                          <Search className="h-4 w-4 shrink-0 opacity-60" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[360px] rounded-2xl border-primary/10 bg-background/95 p-0 shadow-2xl backdrop-blur-xl" align="start">
                        <Command className="rounded-2xl bg-transparent">
                          <CommandInput className="border-primary/10" placeholder="Search backlog tasks..." />
                          <CommandList className="custom-scrollbar max-h-[250px]">
                            <CommandEmpty>No tasks found in backlog.</CommandEmpty>
                            <CommandGroup heading="Available Tasks">
                              <CommandItem
                                value="No task"
                                onSelect={() => {
                                  setSessionTaskId('');
                                  setIsSummaryTaskSearchOpen(false);
                                }}
                                className="rounded-xl px-3 py-2"
                              >
                                <div>
                                  <p className="text-xs font-bold">Unlinked Block</p>
                                  <p className="text-[9px] text-muted-foreground">Calibration is not connected to tasks</p>
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
                                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-bold">{task.title}</p>
                                      <p className="truncate text-[9px] text-muted-foreground">{projectName}</p>
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Category Label</Label>
                <Input
                  value={sessionCategory}
                  onChange={(e) => setSessionCategory(e.target.value)}
                  placeholder="Deep Work, Work, Meetings..."
                  className="h-12 rounded-xl border-primary/5 bg-muted/30 px-4 font-medium text-xs"
                />
              </div>

              {editingEntryId && activeEntryBeingEdited && (
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Calibrated Duration</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/50">Start Time</Label>
                      <Input
                        type="datetime-local"
                        value={editingStartTime}
                        onChange={(e) => setEditingStartTime(e.target.value)}
                        className="h-12 rounded-xl border-primary/5 bg-muted/30 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/50">End Time</Label>
                      <Input
                        type="datetime-local"
                        value={editingEndTime}
                        onChange={(e) => setEditingEndTime(e.target.value)}
                        className="h-12 rounded-xl border-primary/5 bg-muted/30 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Reflections & Notes</Label>
                <Textarea
                  value={sessionSummary}
                  onChange={(e) => setSessionSummary(e.target.value)}
                  placeholder="Record what was done. Supports markdown bullets."
                  className="min-h-[120px] resize-none rounded-2xl border-primary/5 bg-muted/30 p-4 text-sm font-medium focus:ring-primary/20"
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
                    setSessionCategory('');
                  }}
                  className="h-12 flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  Discard Changes
                </Button>
                <Button
                  onClick={handleConfirmStop}
                  className="h-12 flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-primary/20"
                >
                  Save Calibrated Details
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
