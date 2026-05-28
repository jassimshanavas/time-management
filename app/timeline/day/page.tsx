'use client';

import { useState, useEffect, useMemo, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/store';
import {
    Clock,
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    GripVertical,
    Plus,
    Search,
    Sparkles,
    Layout,
    Zap,
    Coffee,
    FileText,
    MessageSquare,
    Camera,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Minimize2,
    Maximize2,
    Trash2,
    Edit2,
    CheckCircle2
} from 'lucide-react';
import { format, addDays, subDays, startOfDay, isSameDay, addMinutes, differenceInMinutes, startOfHour, setHours, setMinutes, parseISO } from 'date-fns';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { toast, Toaster } from 'sonner';
import { Task, TimeEntry } from '@/types';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { EisenhowerMatrix } from '@/components/timeline/eisenhower-matrix';
import { Grid2X2, List } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ProjectSelector } from '@/components/projects/project-selector';

const HOUR_HEIGHT = 60;
const STEP_MINUTES = 15;
const STEP_HEIGHT = (STEP_MINUTES / 60) * HOUR_HEIGHT;

const toSafeDate = (val: any): Date | null => {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (val && typeof val === 'object' && typeof val.toDate === 'function') {
    return val.toDate();
  }
  if (val && typeof val === 'object' && typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000 + (val.nanoseconds || 0) / 1000000);
  }
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const getElapsedTime = (startTime: Date, currentTime: Date) => {
  const elapsed = Math.max(
    0,
    Math.floor((currentTime.getTime() - (toSafeDate(startTime)?.getTime() || 0)) / 1000)
  );
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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

function DayTimelineContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const {
        tasks,
        updateTask,
        addTask,
        selectedProjectId,
        projects,
        timeEntries,
        addTimeEntry,
        updateTimeEntry,
        deleteTimeEntry,
        stopTimeEntry
    } = useStore();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    // Page level workspace toggle
    const [viewState, setViewState] = useState<'plan' | 'calibrate'>('plan');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const [isDragOverBucket, setIsDragOverBucket] = useState(false);
    const [activeDragOverLaneKey, setActiveDragOverLaneKey] = useState<string | null>(null);
    const [isDragOverGrid, setIsDragOverGrid] = useState(false);
    
    // Calibrator Grid states
    const [zoomLevel, setZoomLevel] = useState(1.5);
    const [isModalExpanded, setIsModalExpanded] = useState(false);
    const [isCreationMode, setIsCreationMode] = useState(false);
    const [isZoomMarqueeMode, setIsZoomMarqueeMode] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);

    const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [stoppingEntryId, setStoppingEntryId] = useState<string | null>(null);
    const [pendingManualEntry, setPendingManualEntry] = useState<Omit<TimeEntry, 'id'> | null>(null);
    
    const [sessionSummary, setSessionSummary] = useState('');
    const [sessionCategory, setSessionCategory] = useState('');
    const [sessionProjectId, setSessionProjectId] = useState<string | undefined>('');
    const [sessionTaskId, setSessionTaskId] = useState('');
    const [isSummaryTaskSearchOpen, setIsSummaryTaskSearchOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const [editingStartTime, setEditingStartTime] = useState('');
    const [editingEndTime, setEditingEndTime] = useState('');

    const timelineRef = useRef<HTMLDivElement | null>(null);
    const captureAreaRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const dateParam = searchParams.get('date');
        if (dateParam) {
            try {
                const parsedDate = parseISO(dateParam);
                setSelectedDate(parsedDate);
            } catch (e) {
                console.error('Failed to parse date from URL:', e);
            }
        }
    }, [searchParams]);

    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizingSidebar) return;
        const newWidth = Math.max(200, Math.min(600, e.clientX - 40));
        setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
        setIsResizingSidebar(false);
    };

    useEffect(() => {
        if (isResizingSidebar) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingSidebar]);

    // Filter tasks by project and date
    const filterByWorkspace = <T extends { projectId?: string }>(items: T[]) => {
        if (selectedProjectId === null) return items;
        if (selectedProjectId === 'personal') return items.filter((item) => !item.projectId);
        return items.filter((item) => item.projectId === selectedProjectId);
    };

    const filteredTasks = useMemo(() => filterByWorkspace(tasks), [tasks, selectedProjectId]);

    const scheduledTasks = useMemo(() => {
        return filteredTasks.filter(t => {
            const start = toSafeDate(t.scheduledStart);
            return start && isSameDay(start, selectedDate);
        });
    }, [filteredTasks, selectedDate]);

    const unscheduledTasks = useMemo(() => {
        return filteredTasks.filter(t => {
            const start = toSafeDate(t.scheduledStart);
            return !start || !isSameDay(start, selectedDate);
        })
        .filter(t => t.status !== 'done')
        .filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [filteredTasks, selectedDate, searchQuery]);

    const dayTimeEntries = useMemo(() => {
        return timeEntries.filter(entry => {
            const start = toSafeDate(entry.startTime);
            return start && isSameDay(start, selectedDate);
        });
    }, [timeEntries, selectedDate]);

    const [currentSuggestionIndex, setCurrentSuggestionIndex] = useState(0);

    // Dynamic suggestions logic for the AI Flow Co-Pilot
    const suggestions = useMemo(() => {
        const list = [];

        // 1. Time Calibration suggestion
        const actualMins = dayTimeEntries.reduce((sum, entry) => {
            const start = toSafeDate(entry.startTime);
            const end = entry.endTime ? toSafeDate(entry.endTime) || new Date() : new Date();
            if (!start) return sum;
            return sum + Math.max(0, differenceInMinutes(end, start));
        }, 0);
        const scheduledMins = scheduledTasks.reduce((sum, t) => sum + (t.estimatedDuration || 60), 0);
        
        list.push({
            id: 'calibrate',
            type: 'info',
            title: 'Temporal Alignment',
            text: `You have planned ${formatDuration(scheduledMins)} and logged ${formatDuration(actualMins)} actual time logs. Align planned vs actual details in the Calibration Modal.`,
            actionLabel: 'Open Calibrator',
            action: () => setViewState('calibrate'),
            icon: Clock,
        });

        // 2. Overload & Sweep suggestion (Move to Bucket List)
        const carryovers = scheduledTasks.filter(t => t.status !== 'done' && t.priority !== 'high');
        if (scheduledMins > 300 && carryovers.length > 0) {
            list.push({
                id: 'sweep',
                type: 'warning',
                title: 'Burnout Warning',
                text: `Today is heavily loaded with ${formatDuration(scheduledMins)} of scheduled work. Consider sweeping ${carryovers.length} lower priority / carryover items to your Bucket List to focus.`,
                actionLabel: 'Clean Sweep',
                action: async () => {
                    try {
                        await Promise.all(carryovers.map(t => updateTask(t.id, { scheduledStart: undefined, scheduledEnd: undefined })));
                        toast.success(`Clean Sweep complete! Swept ${carryovers.length} tasks back into the Bucket List.`);
                    } catch (e) {
                        toast.error("Failed to sweep carryovers.");
                    }
                },
                icon: Plus, // Plus acts as a cross to clear
            });
        }

        // 3. Morning energy block deployment
        const highPriorityUnscheduled = unscheduledTasks.find(t => t.priority === 'high');
        if (highPriorityUnscheduled) {
            list.push({
                id: 'deploy-high',
                type: 'success',
                title: 'Cognitive Energy Peak',
                text: `High priority task "${highPriorityUnscheduled.title}" is unscheduled. Deploy it to your calendar at 09:00 AM for high cognitive energy.`,
                actionLabel: 'Deploy at 09:00',
                action: async () => {
                    const nineAM = setHours(startOfDay(selectedDate), 9);
                    try {
                        await updateTask(highPriorityUnscheduled.id, {
                            scheduledStart: nineAM,
                            scheduledEnd: addMinutes(nineAM, highPriorityUnscheduled.estimatedDuration || 60),
                            estimatedDuration: highPriorityUnscheduled.estimatedDuration || 60
                        });
                        toast.success(`Scheduled ${highPriorityUnscheduled.title} at 09:00 AM.`);
                    } catch (e) {
                        toast.error("Failed to schedule.");
                    }
                },
                icon: Sparkles,
            });
        }

        // 4. Back-to-back decompress break buffer block
        for (let i = 0; i < scheduledTasks.length; i++) {
            const taskA = scheduledTasks[i];
            if (!taskA.scheduledEnd) continue;
            const endA = toSafeDate(taskA.scheduledEnd);
            if (!endA) continue;
            
            const nextTask = scheduledTasks.find(t => {
                if (t.id === taskA.id || !t.scheduledStart) return false;
                const startB = toSafeDate(t.scheduledStart);
                return startB && Math.abs(differenceInMinutes(startB, endA)) < 5; // back-to-back
            });

            if (nextTask) {
                list.push({
                    id: `buffer-${taskA.id}`,
                    type: 'info',
                    title: 'Flow Compression',
                    text: `Back-to-back tasks detected: "${taskA.title}" and "${nextTask.title}". Add a 15-minute buffer to decompress and refresh your focus.`,
                    actionLabel: 'Add 15m Buffer',
                    action: async () => {
                        if (!nextTask.scheduledStart || !nextTask.scheduledEnd) return;
                        const newStart = addMinutes(nextTask.scheduledStart, 15);
                        const newEnd = addMinutes(nextTask.scheduledEnd, 15);
                        try {
                            await updateTask(nextTask.id, {
                                scheduledStart: newStart,
                                scheduledEnd: newEnd,
                            });
                            toast.success(`Buffer break added! Shifted "${nextTask.title}" by 15 mins.`);
                        } catch (e) {
                            toast.error("Failed to insert buffer break.");
                        }
                    },
                    icon: Zap,
                });
                break; // only suggest one buffer break at a time
            }
        }

        return list;
    }, [scheduledTasks, unscheduledTasks, dayTimeEntries, selectedDate, updateTask]);

    // Keep suggestions index safe when count drops
    useEffect(() => {
        if (currentSuggestionIndex >= suggestions.length) {
            setCurrentSuggestionIndex(Math.max(0, suggestions.length - 1));
        }
    }, [suggestions.length, currentSuggestionIndex]);

    const handleScheduleUnscheduled = async (task: Task) => {
        // Find a free slot or just default to 9 AM
        const nineAM = setHours(startOfDay(selectedDate), 9);
        try {
            await updateTask(task.id, {
                scheduledStart: nineAM,
                scheduledEnd: addMinutes(nineAM, task.estimatedDuration || 60),
                estimatedDuration: task.estimatedDuration || 60
            });
            toast.success(`Added to Focus Bucket: ${task.title}`);
        } catch (e) {
            toast.error("Failed to add task to focus bucket");
        }
    }

    const handleScheduleFromMatrix = async (task: Task, dropY?: number) => {
        handleScheduleUnscheduled(task);
    };

    // Actual Logs calculations & helpers
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

    const getEntryDuration = (entry: TimeEntry) => {
        if (entry.duration !== undefined) {
          return entry.duration;
        }

        const start = toSafeDate(entry.startTime);
        const effectiveEnd = entry.endTime ? toSafeDate(entry.endTime) || currentTime : currentTime;
        if (!start) return 0;
        return Math.max(0, Math.floor((effectiveEnd.getTime() - start.getTime()) / 60000));
    };

    const findTaskTitle = useCallback(
        (taskId?: string) => (taskId ? tasks.find((task) => task.id === taskId)?.title : undefined),
        [tasks]
    );

    const [emptyTracks, setEmptyTracks] = useState<string[]>([]);

    const timelineTracks = useMemo(() => {
        const trackMap = new Map<string, { key: string; label: string; entries: TimeEntry[] }>();

        // Pre-populate empty tracks that have been dragged
        emptyTracks.forEach((trackKey) => {
          let label = 'General';
          if (trackKey.startsWith('task:')) {
            const taskId = trackKey.substring(5);
            label = findTaskTitle(taskId) || 'Task';
          } else if (trackKey.startsWith('category:')) {
            label = trackKey.substring(9);
          }
          trackMap.set(trackKey, { key: trackKey, label, entries: [] });
        });

        dayTimeEntries.forEach((entry) => {
          const taskLabel = entry.taskId ? findTaskTitle(entry.taskId) : undefined;
          const label = taskLabel || entry.category || 'General';
          const key = entry.taskId ? `task:${entry.taskId}` : `category:${label}`;

          if (!trackMap.has(key)) {
            trackMap.set(key, { key, label, entries: [] });
          }

          // Push entry into the list of entries
          trackMap.get(key)?.entries.push(entry);
        });

        return Array.from(trackMap.values()).sort((a, b) => {
          const firstA = a.entries[0] ? toSafeDate(a.entries[0].startTime)?.getTime() || 0 : 0;
          const firstB = b.entries[0] ? toSafeDate(b.entries[0].startTime)?.getTime() || 0 : 0;
          
          // Sort active lanes first, empty lanes last
          if (firstA === 0 && firstB !== 0) return 1;
          if (firstB === 0 && firstA !== 0) return -1;
          return firstA - firstB;
        });
    }, [dayTimeEntries, findTaskTitle, emptyTracks]);

    const heatmapGradient = useMemo(() => {
        const scores = new Array(24).fill(0);
        timeEntries.filter((entry) => !entry.isRunning).forEach((entry) => {
          const start = toSafeDate(entry.startTime);
          const end = toSafeDate(entry.endTime);
          if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

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
        ? timeEntries.filter(entry => entry.isRunning).find((entry) => entry.id === stoppingEntryId)
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
        const startVal = toSafeDate(entry.startTime);
        const endVal = toSafeDate(entry.endTime);
        setEditingStartTime(startVal ? toLocalDateTimeInputValue(startVal) : '');
        setEditingEndTime(endVal ? toLocalDateTimeInputValue(endVal) : '');
        setIsSummaryDialogOpen(true);
    };

    const handleConfirmStop = async () => {
        if (editingEntryId) {
          const currentEntry = timeEntries.find((entry) => entry.id === editingEntryId);
          if (!currentEntry) {
            setIsSummaryDialogOpen(false);
            return;
          }

          const currentStart = toSafeDate(currentEntry.startTime) || new Date();
          const currentEnd = toSafeDate(currentEntry.endTime);
          const nextStart = editingStartTime ? new Date(editingStartTime) : currentStart;
          const nextEnd = editingEndTime ? new Date(editingEndTime) : currentEnd || undefined;
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
          toast.success('Log entry details updated!');
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
          toast.success('Temporal log calibrated and saved!');
          return;
        }
    };

    const handleCreateTaskForSelectedProject = async () => {
        const title = newTaskTitle.trim();
        if (!title) return;

        const newTask: Omit<Task, 'id' | 'userId'> = {
            title,
            description: '',
            status: 'todo',
            priority: 'medium',
            projectId: sessionProjectId || undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const createdTaskId = await addTask(newTask);
        setNewTaskTitle('');
        if (createdTaskId) {
            setSessionTaskId(createdTaskId);
            setIsSummaryTaskSearchOpen(false);
            setSessionCategory((prev) =>
              !prev.trim() || prev === 'General' ? title : prev
            );
            toast.success(`Task "${title}" created and linked!`);
        } else {
            toast.success(`Task "${title}" created! Please select it from the search list.`);
        }
    };

    const buildManualEntryFromRange = (startHour: number, endHour: number) => {
        const start = new Date(selectedDate);
        start.setHours(Math.floor(startHour), Math.round((startHour % 1) * 60), 0, 0);

        const end = new Date(selectedDate);
        end.setHours(Math.floor(endHour), Math.round((endHour % 1) * 60), 0, 0);
        const now = new Date();
        const isToday = selectedDate.toDateString() === now.toDateString();
        const shouldContinueNow = isToday && start.getTime() < now.getTime() && end.getTime() > now.getTime();

        const duration = Math.round((end.getTime() - start.getTime()) / 60000);
        if (duration < 1) return;

        const timeString = format(start, 'h:mm a');
        const description = `Manual Calibration (Started at ${timeString})`;

        setEditingEntryId(null);
        setStoppingEntryId(null);
        setPendingManualEntry({
          category: 'General',
          description,
          taskId: undefined,
          projectId: undefined,
          startTime: start,
          endTime: shouldContinueNow ? undefined : end,
          duration: shouldContinueNow ? undefined : duration,
          isRunning: shouldContinueNow,
        });
        setSessionSummary('');
        setSessionCategory('General');
        setSelectionRange(null);
        setIsSelecting(false);
        setIsSummaryDialogOpen(true);
    };

    const handleDropTemplate = (templateName: string, hour: number) => {
        const template = ROUTINE_TEMPLATES.find((item) => item.name === templateName);
        if (!template) return;

        const start = new Date(selectedDate);
        start.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
        const end = new Date(start.getTime() + template.duration * 60000);

        setPendingManualEntry({
          category: template.category,
          description: template.name,
          taskId: undefined,
          projectId: undefined,
          startTime: start,
          endTime: end,
          duration: template.duration,
          isRunning: false,
        });
        setSessionSummary('');
        setSessionCategory(template.category);
        setSessionTaskId('');
        setSessionProjectId('');
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
          link.download = `temporal-calibration-day-${format(selectedDate, 'yyyy-MM-dd')}.png`;
          link.href = dataUrl;
          link.click();
          toast.success('Temporal flow visualization snap captured!');
        } catch (error) {
          console.error('Error capturing screen:', error);
          setIsCapturing(false);
          toast.error('Failed to capture snapshot.');
        }
    };

    const totalBucketTasks = scheduledTasks.length;
    const completedBucketTasks = scheduledTasks.filter(t => t.status === 'done').length;
    const bucketProgress = totalBucketTasks > 0 ? Math.round((completedBucketTasks / totalBucketTasks) * 100) : 0;

    return (
        <ProtectedRoute>
            <DataLoader>
                <MainLayout>
                    <Toaster position="top-right" richColors />
                    <div className="flex flex-col h-full bg-background/50 animate-in fade-in duration-700">
                        
                        {/* Header */}
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-8 p-4 sm:p-0">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                                    <Clock className="h-6 w-6 text-primary animate-pulse" />
                                    Plan My Day
                                </h1>
                                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                    {viewState === 'plan' ? 'Orchestrate your focus and sweep today\'s goals' : 'Calibrate planning against actual logged time'}
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-2 bg-background/40 backdrop-blur-xl p-1.5 rounded-xl border border-primary/10 shadow-lg">
                                {viewState === 'plan' && (
                                    <div className="flex items-center gap-1 bg-background/40 backdrop-blur-xl p-1 rounded-xl border border-primary/10 shadow-lg mr-2">
                                        <Button
                                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className={cn("h-8 px-4 rounded-lg font-black text-[10px] uppercase tracking-widest gap-2", viewMode === 'list' && "bg-primary text-primary-foreground")}
                                            onClick={() => setViewMode('list')}
                                        >
                                            Backlog List
                                        </Button>
                                        <Button
                                            variant={viewMode === 'matrix' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className={cn("h-8 px-4 rounded-lg font-black text-[10px] uppercase tracking-widest gap-2", viewMode === 'matrix' && "bg-primary text-primary-foreground")}
                                            onClick={() => setViewMode('matrix')}
                                        >
                                            <Grid2X2 className="h-4 w-4" />
                                            Matrix
                                        </Button>
                                    </div>
                                )}
                                <div className="flex items-center gap-0.5">
                                    <Button variant="ghost" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="h-8 w-8 rounded-lg hover:bg-primary/10">
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                    </Button>
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/5 rounded-lg border border-primary/5">
                                        <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                                        <span className="font-black text-xs min-w-[100px] text-center uppercase tracking-tighter">
                                            {format(selectedDate, 'EEE, MMM d')}
                                        </span>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="h-8 w-8 rounded-lg hover:bg-primary/10">
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                <div className="hidden sm:block h-4 w-px bg-primary/10 mx-0.5" />
                                <Button variant="secondary" size="sm" onClick={() => setSelectedDate(new Date())} className="w-full sm:w-auto h-8 rounded-lg font-bold px-4 text-xs mr-1">
                                    Today
                                </Button>
                                <Button
                                    variant={viewState === 'calibrate' ? 'secondary' : 'default'}
                                    size="sm"
                                    onClick={() => setViewState(viewState === 'plan' ? 'calibrate' : 'plan')}
                                    className="w-full sm:w-auto h-8 rounded-lg font-black uppercase tracking-widest text-[9px] bg-primary text-primary-foreground shadow-md shadow-primary/20 gap-1.5 active:scale-95 transition-all"
                                >
                                    {viewState === 'plan' ? (
                                        <>
                                            <Clock className="h-3.5 w-3.5 animate-pulse" />
                                            Calibrate Time
                                        </>
                                    ) : (
                                        <>
                                            <Layout className="h-3.5 w-3.5 animate-pulse" />
                                            Back to Planning
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* PLANNING WORKSPACE VIEW */}
                        {viewState === 'plan' ? (
                            <>
                                {/* AI Flow Co-Pilot dynamic suggestions panel */}
                                <AnimatePresence mode="wait">
                                    {suggestions.length > 0 && (
                                        <motion.div
                                            key={`suggestion-${currentSuggestionIndex}`}
                                            initial={{ opacity: 0, y: -15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -15 }}
                                            className="mb-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur-xl border border-primary/10 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg mx-4 sm:mx-0 animate-in fade-in slide-in-from-top-4 duration-500"
                                        >
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <div className="p-2.5 bg-primary/15 text-primary rounded-xl shrink-0 mt-0.5 border border-primary/20">
                                                    {(() => {
                                                        const Icon = suggestions[currentSuggestionIndex].icon;
                                                        return <Icon className="h-4 w-4" />;
                                                    })()}
                                                </div>
                                                <div className="space-y-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                                                            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                                                            {suggestions[currentSuggestionIndex].title}
                                                        </span>
                                                        <Badge variant="outline" className="text-[8px] h-3.5 py-0 font-bold bg-background/50 border-primary/10 text-primary uppercase shrink-0">
                                                            Suggestion {currentSuggestionIndex + 1} of {suggestions.length}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs font-semibold leading-relaxed text-foreground/80">
                                                        {suggestions[currentSuggestionIndex].text}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-center justify-between sm:justify-end">
                                                {suggestions.length > 1 && (
                                                    <div className="flex items-center gap-1 mr-2 no-capture">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg hover:bg-primary/10"
                                                            onClick={() => setCurrentSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)}
                                                        >
                                                            <ChevronLeft className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg hover:bg-primary/10"
                                                            onClick={() => setCurrentSuggestionIndex(prev => (prev + 1) % suggestions.length)}
                                                        >
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                                <Button
                                                    onClick={suggestions[currentSuggestionIndex].action}
                                                    className="h-9 px-4 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all"
                                                >
                                                    {suggestions[currentSuggestionIndex].actionLabel}
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0 bg-transparent relative">
                                    {/* Left Panel: Backlog / Strategy Matrix */}
                                    <Card
                                        className={cn(
                                            "flex flex-col bg-background/40 backdrop-blur-xl border-primary/5 shadow-xl rounded-2xl overflow-hidden shrink-0 transition-all duration-300",
                                            "h-[450px] lg:h-full"
                                        )}
                                        style={{
                                            width: viewMode === 'matrix' ? `${sidebarWidth * 1.5}px` : `${sidebarWidth}px`,
                                            maxWidth: '100%'
                                        }}
                                    >
                                        <CardHeader className="p-0 border-b border-primary/5 bg-background/20 backdrop-blur-md">
                                            <div className="flex p-1 gap-1">
                                                <Button
                                                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                                    size="sm"
                                                    className={cn(
                                                        "flex-1 h-9 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 transition-all duration-300",
                                                        viewMode === 'list'
                                                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                            : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                                                    )}
                                                    onClick={() => setViewMode('list')}
                                                >
                                                    <List className="h-3.5 w-3.5" />
                                                    Backlog List
                                                </Button>
                                                <Button
                                                    variant={viewMode === 'matrix' ? 'secondary' : 'ghost'}
                                                    size="sm"
                                                    className={cn(
                                                        "flex-1 h-9 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 transition-all duration-300",
                                                        viewMode === 'matrix'
                                                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                            : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                                                    )}
                                                    onClick={() => setViewMode('matrix')}
                                                >
                                                    <Grid2X2 className="h-3.5 w-3.5" />
                                                    Strategy Matrix
                                                </Button>
                                            </div>
                                            <AnimatePresence mode="wait">
                                                {viewMode === 'list' && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="relative group"
                                                    >
                                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                                        <Input
                                                            placeholder="Audit tasks..."
                                                            className="h-8 pl-8 text-xs bg-background/50 border-primary/5 rounded-lg focus:ring-2 focus:ring-primary/20 transition-all"
                                                            value={searchQuery}
                                                            onChange={e => setSearchQuery(e.target.value)}
                                                        />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </CardHeader>
                                        <CardContent className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar">
                                            {viewMode === 'list' ? (
                                                <>
                                                    {unscheduledTasks.map(task => (
                                                        <div
                                                            key={task.id}
                                                            draggable
                                                            onDragStart={(e) => {
                                                                e.dataTransfer.setData('taskId', task.id);
                                                                e.dataTransfer.setData('application/habit-task-id', task.id);
                                                                e.dataTransfer.setData('text/plain', `task:${task.id}`);
                                                                e.dataTransfer.effectAllowed = 'copyMove';
                                                            }}
                                                            className="p-3 bg-background/60 backdrop-blur-sm rounded-xl border border-transparent hover:border-primary/20 cursor-grab active:cursor-grabbing transition-all hover:shadow-md group shadow-sm active:scale-[0.98] select-none"
                                                            onClick={() => handleScheduleUnscheduled(task)}
                                                        >
                                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                                <h4 className="text-xs font-bold leading-tight group-hover:text-primary transition-colors line-clamp-1">{task.title}</h4>
                                                                <div className={cn(
                                                                    "h-1.5 w-1.5 rounded-full mt-1 shrink-0 shadow-[0_0_6px_currentColor]",
                                                                    task.priority === 'high' ? 'text-red-500 bg-red-500' : task.priority === 'medium' ? 'text-yellow-500 bg-yellow-500' : 'text-blue-500 bg-blue-500'
                                                                )} />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                                                                    <Clock className="h-2.5 w-2.5" />
                                                                    <span className="text-[9px] font-black font-mono">
                                                                        {task.estimatedDuration || 60}m
                                                                    </span>
                                                                </div>
                                                                <div className="flex-1" />
                                                                <div className="opacity-0 group-hover:opacity-100 transition-all">
                                                                    <Badge variant="default" className="text-[7px] h-4 py-0 font-black uppercase tracking-widest bg-primary text-primary-foreground">Add to Bucket</Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {unscheduledTasks.length === 0 && (
                                                        <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                                            <Sparkles className="h-12 w-12 mb-4 text-primary" />
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-center">Your path is clear</p>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <EisenhowerMatrix
                                                    tasks={unscheduledTasks}
                                                    onScheduleTask={handleScheduleFromMatrix}
                                                    onUpdateTask={updateTask}
                                                />
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Resizer Handle */}
                                    <div
                                        className={cn(
                                            "hidden lg:flex w-2 hover:w-3 items-center justify-center cursor-col-resize group transition-all z-50",
                                            isResizingSidebar && "w-3"
                                        )}
                                        onMouseDown={() => setIsResizingSidebar(true)}
                                    >
                                        <div className={cn(
                                            "h-16 w-1 rounded-full bg-primary/10 group-hover:bg-primary/40 transition-colors",
                                            isResizingSidebar && "bg-primary/60 scale-x-150 h-24"
                                        )} />
                                    </div>

                                    {/* Right Panel: TODAY'S FOCUS BUCKET */}
                                    <Card 
                                        onDragEnter={(e) => {
                                            e.preventDefault();
                                            setIsDragOverBucket(true);
                                        }}
                                        onDragLeave={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            if (
                                                e.clientX < rect.left ||
                                                e.clientX >= rect.right ||
                                                e.clientY < rect.top ||
                                                e.clientY >= rect.bottom
                                            ) {
                                                setIsDragOverBucket(false);
                                            }
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'copy';
                                        }}
                                        onDrop={async (e) => {
                                            e.preventDefault();
                                            setIsDragOverBucket(false);
                                            const rawData = e.dataTransfer.getData('text/plain');
                                            let taskId = e.dataTransfer.getData('application/habit-task-id') || e.dataTransfer.getData('taskId');
                                            if (rawData && rawData.startsWith('task:')) {
                                                taskId = rawData.substring(5);
                                            }
                                            if (taskId) {
                                                const target = tasks.find(t => t.id === taskId);
                                                if (target) {
                                                    await handleScheduleUnscheduled(target);
                                                }
                                            }
                                        }}
                                        className={cn(
                                            "flex-1 relative overflow-hidden flex flex-col bg-background/40 backdrop-blur-xl border-primary/10 shadow-xl rounded-2xl min-h-[500px] p-6 transition-all duration-300",
                                            isDragOverBucket && "border-primary/50 bg-primary/[0.02] ring-2 ring-primary/20 shadow-primary/10"
                                        )}
                                    >
                                        {isDragOverBucket && (
                                            <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] border-2 border-dashed border-primary/40 rounded-2xl flex flex-col items-center justify-center gap-3 z-50 pointer-events-none animate-in fade-in duration-200">
                                                <div className="p-4 bg-primary/10 text-primary rounded-full border border-primary/20 shadow-lg shadow-primary/10 animate-bounce">
                                                    <Sparkles className="h-6 w-6 text-primary" />
                                                </div>
                                                <p className="text-sm font-black uppercase tracking-widest text-primary animate-pulse">Drop to Add to Today's Focus</p>
                                            </div>
                                        )}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-primary/5 gap-3">
                                            <div>
                                                <h2 className="text-lg font-black tracking-tight flex items-center gap-2 text-primary">
                                                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                                                    Today's Focus Bucket
                                                </h2>
                                                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Focus intensely on these selected items today</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="font-mono font-black text-xs px-2.5 py-1">
                                                    {completedBucketTasks} / {totalBucketTasks} Done
                                                </Badge>
                                                {totalBucketTasks > 0 && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 rounded-lg font-black text-[9px] uppercase tracking-widest text-destructive hover:bg-destructive/10 hover:text-destructive border-primary/10"
                                                        onClick={async () => {
                                                            const carryovers = scheduledTasks.filter(t => t.status !== 'done');
                                                            if (carryovers.length === 0) {
                                                                toast.info("No incomplete tasks to sweep!");
                                                                return;
                                                            }
                                                            try {
                                                                await Promise.all(carryovers.map(t => updateTask(t.id, { scheduledStart: undefined, scheduledEnd: undefined })));
                                                                toast.success(`Clean Sweep complete! Swept ${carryovers.length} tasks back into the backlog.`);
                                                            } catch (e) {
                                                                toast.error("Failed to sweep carryovers.");
                                                            }
                                                        }}
                                                    >
                                                        Clear All
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        {totalBucketTasks > 0 && (
                                            <div className="mt-4 space-y-1.5">
                                                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-muted-foreground/60">
                                                    <span>Focus Progress</span>
                                                    <span className="font-mono text-primary">{bucketProgress}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-primary/5 rounded-full overflow-hidden border border-primary/5">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${bucketProgress}%` }}
                                                        className="h-full bg-primary rounded-full"
                                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Bucket List cards */}
                                        <div className="flex-1 overflow-y-auto custom-scrollbar mt-6 space-y-3 pr-1">
                                            {scheduledTasks.length > 0 ? (
                                                <AnimatePresence>
                                                    {scheduledTasks.map((task) => {
                                                        const project = projects.find(p => p.id === task.projectId);
                                                        const isDone = task.status === 'done';

                                                        return (
                                                            <motion.div
                                                                key={task.id}
                                                                initial={{ opacity: 0, x: 20 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: -20 }}
                                                                className={cn(
                                                                    "p-4 rounded-xl border bg-background/50 hover:bg-background/80 transition-all shadow-sm hover:shadow-md flex items-center justify-between gap-4 group relative overflow-hidden",
                                                                    isDone ? "border-primary/5 opacity-65" : "border-primary/10 hover:border-primary/20"
                                                                )}
                                                                style={{
                                                                    borderLeftWidth: '4px',
                                                                    borderLeftColor: project?.color || (task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#3b82f6')
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                    {/* Checkbox button */}
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            try {
                                                                                await updateTask(task.id, { status: isDone ? 'todo' : 'done' });
                                                                                toast.success(isDone ? `Marked todo: ${task.title}` : `Completed: ${task.title}`);
                                                                            } catch (err) {
                                                                                toast.error("Failed to update status.");
                                                                            }
                                                                        }}
                                                                        className={cn(
                                                                            "h-5 w-5 rounded border transition-colors flex items-center justify-center shrink-0 cursor-pointer",
                                                                            isDone
                                                                                ? "bg-primary border-primary text-primary-foreground"
                                                                                : "border-primary/30 bg-background hover:border-primary"
                                                                        )}
                                                                    >
                                                                        {isDone && <CheckCircle2 className="h-3.5 w-3.5 stroke-[3]" />}
                                                                    </button>

                                                                    <div className="min-w-0">
                                                                        <h4 className={cn(
                                                                            "text-xs font-bold leading-snug truncate",
                                                                            isDone && "line-through text-muted-foreground font-medium italic"
                                                                        )}>
                                                                            {task.title}
                                                                        </h4>
                                                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                            <Badge variant="outline" className="text-[8px] h-4 py-0 font-mono bg-background/50 border-primary/5 uppercase shrink-0">
                                                                                {task.estimatedDuration || 60}m
                                                                            </Badge>
                                                                            {project ? (
                                                                                <Badge variant="outline" className="text-[8px] h-4 py-0 font-black uppercase tracking-tighter bg-background/40 shrink-0" style={{ color: project.color, borderColor: `${project.color}33` }}>
                                                                                    {project.name}
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge variant="outline" className="text-[8px] h-4 py-0 font-black uppercase tracking-tighter bg-background/40 text-muted-foreground/60 border-primary/5 shrink-0">
                                                                                    Personal
                                                                                </Badge>
                                                                            )}
                                                                            {task.priority === 'high' && (
                                                                                <Badge className="text-[7px] h-3.5 py-0 bg-red-500/10 text-red-500 border-red-500/20 font-black uppercase shrink-0">HIGH</Badge>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Actions */}
                                                                <div className="flex items-center gap-2 shrink-0 no-capture">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            try {
                                                                                await updateTask(task.id, { scheduledStart: undefined, scheduledEnd: undefined });
                                                                                toast.success(`Removed: ${task.title} from focus bucket.`);
                                                                            } catch (err) {
                                                                                toast.error("Failed to remove task.");
                                                                            }
                                                                        }}
                                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                                                        title="Remove from Bucket"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </motion.div>
                                                        );
                                                    })}
                                                </AnimatePresence>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-24 text-center opacity-30">
                                                    <Sparkles className="h-12 w-12 mb-4 text-primary animate-pulse" />
                                                    <p className="text-xs font-black uppercase tracking-widest">Today's Bucket is Empty</p>
                                                    <p className="text-[10px] text-muted-foreground/80 mt-1 max-w-[200px]">Click backlog items or matrix cards on the left to add tasks to today's focus bucket.</p>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </div>
                            </>
                        ) : (
                            /* FULL PAGE TEMPORAL CALIBRATION WORKSPACE */
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 bg-transparent relative"
                            >
                                {/* Left Side Panel: TODAY'S BUCKET TASKS FOR LINKING */}
                                <Card className="w-[300px] shrink-0 bg-background/40 backdrop-blur-xl border-primary/5 shadow-xl rounded-2xl overflow-hidden flex flex-col h-full">
                                    <CardHeader className="border-b border-primary/5 bg-background/20 py-4 px-5">
                                        <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                                            Today's Focus Tasks
                                        </CardTitle>
                                        <p className="text-[9px] text-muted-foreground/75 font-medium leading-relaxed mt-1">
                                            Drag tasks directly onto timeline tracks to stamp actual logs, or click to prepopulate details.
                                        </p>
                                    </CardHeader>
                                    <CardContent className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
                                        {scheduledTasks.length > 0 ? scheduledTasks.map((task) => {
                                            const project = projects.find(p => p.id === task.projectId);
                                            const isDone = task.status === 'done';

                                            return (
                                                <div
                                                    key={task.id}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData('taskId', task.id);
                                                        e.dataTransfer.setData('application/habit-task-id', task.id);
                                                        e.dataTransfer.setData('text/plain', `task:${task.id}`);
                                                        e.dataTransfer.effectAllowed = 'copy';
                                                    }}
                                                    onClick={() => {
                                                        setEditingEntryId(null);
                                                        setStoppingEntryId(null);
                                                        
                                                        // Prepopulate manual log details
                                                        const defaultStart = setHours(startOfDay(selectedDate), 9);
                                                        const defaultEnd = addMinutes(defaultStart, task.estimatedDuration || 60);

                                                        setPendingManualEntry({
                                                            category: task.title,
                                                            description: `Focus session: ${task.title}`,
                                                            taskId: task.id,
                                                            projectId: task.projectId || undefined,
                                                            startTime: defaultStart,
                                                            endTime: defaultEnd,
                                                            duration: task.estimatedDuration || 60,
                                                            isRunning: false,
                                                        });
                                                        setSessionSummary('');
                                                        setSessionCategory(task.title);
                                                        setSessionProjectId(task.projectId || '');
                                                        setSessionTaskId(task.id);
                                                        setIsSummaryDialogOpen(true);
                                                    }}
                                                    className={cn(
                                                        "p-3 rounded-xl border bg-background/40 hover:bg-background/80 hover:border-primary/20 shadow-sm transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-3 group select-none active:scale-[0.98]",
                                                        isDone && "opacity-60 border-primary/5"
                                                    )}
                                                    style={{
                                                        borderLeftWidth: '3px',
                                                        borderLeftColor: project?.color || (task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#3b82f6')
                                                    }}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className={cn("text-xs font-bold truncate leading-tight group-hover:text-primary transition-colors", isDone && "line-through italic text-muted-foreground")}>
                                                            {task.title}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5 mt-1">
                                                            <Badge variant="outline" className="text-[7px] h-3.5 py-0 font-mono bg-background/50 border-primary/5 uppercase">
                                                                {task.estimatedDuration || 60}m
                                                            </Badge>
                                                            {project && (
                                                                <span className="text-[8px] font-bold opacity-60" style={{ color: project.color }}>
                                                                    {project.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Plus className="h-3.5 w-3.5 shrink-0 opacity-20 group-hover:opacity-100 group-hover:text-primary transition-all rotate-0 group-hover:scale-110" />
                                                </div>
                                            );
                                        }) : (
                                            <div className="text-center py-16 opacity-35 text-[10px] font-black uppercase tracking-widest italic leading-relaxed">
                                                No tasks in Today's Focus Bucket. Return to Planning to focus items.
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Right Column: HORIZONTAL MULTI-TRACK TIMELINE GRID */}
                                <Card className="flex-1 relative overflow-hidden flex flex-col bg-background/40 backdrop-blur-xl border-primary/10 shadow-xl rounded-2xl min-h-[500px]">
                                    <div className="p-5 border-b border-primary/5 bg-background/20 sticky top-0 z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="flex flex-col gap-1">
                                            <h3 className="text-sm font-black uppercase tracking-widest text-primary">Temporal Flow Timeline</h3>
                                            <p className="text-[9px] text-muted-foreground/75 font-semibold">Audited time logged: {formatDuration(dayTimeEntries.reduce((sum, entry) => sum + getEntryDuration(entry), 0))} over {dayTimeEntries.length} sessions.</p>
                                        </div>

                                        <div className="flex items-center gap-2 no-capture">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 shadow-lg shadow-primary/5 transition-all"
                                                onClick={handleCapture}
                                                title="Capture Snap PNG"
                                                disabled={isCapturing}
                                            >
                                                <Camera className={`h-4.5 w-4.5 ${isCapturing ? 'animate-pulse' : ''}`} />
                                            </Button>

                                            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-primary/5">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-lg"
                                                    onClick={() => setZoomLevel((prev) => Math.max(1, prev - 0.25))}
                                                    disabled={zoomLevel <= 1}
                                                >
                                                    <ZoomOut className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    className="px-2 h-7 text-[9px] font-black rounded-lg hover:bg-primary/10 transition-colors flex items-center gap-1"
                                                    onClick={() => {
                                                        setZoomLevel(1.5);
                                                        if (timelineRef.current) {
                                                            timelineRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                                                        }
                                                    }}
                                                >
                                                    {zoomLevel !== 1.5 && <RotateCcw className="h-3 w-3 animate-in fade-in" />}
                                                    {zoomLevel.toFixed(2)}x
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 rounded-lg"
                                                    onClick={() => setZoomLevel((prev) => Math.min(20, prev + 0.25))}
                                                    disabled={zoomLevel >= 20}
                                                >
                                                    <ZoomIn className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>

                                            <Button
                                                variant={isZoomMarqueeMode ? 'default' : 'ghost'}
                                                size="icon"
                                                className={cn("h-9 w-9 rounded-xl transition-all border border-primary/5 bg-muted/30 hover:bg-primary/5", isZoomMarqueeMode && "bg-primary text-primary-foreground shadow-lg")}
                                                onClick={() => {
                                                    setIsZoomMarqueeMode(!isZoomMarqueeMode);
                                                    setIsCreationMode(false);
                                                }}
                                                title="Zoom Selection Range"
                                            >
                                                <Search className="h-4 w-4" />
                                            </Button>

                                            <Button
                                                variant={isCreationMode ? 'default' : 'ghost'}
                                                size="icon"
                                                className={cn("h-9 w-9 rounded-xl transition-all border border-primary/5 bg-muted/30 hover:bg-primary/5", isCreationMode && "bg-primary text-primary-foreground shadow-lg")}
                                                onClick={() => {
                                                    setIsCreationMode(!isCreationMode);
                                                    setIsZoomMarqueeMode(false);
                                                }}
                                                title="Creation Range Mode"
                                            >
                                                <Plus className={cn("h-4 w-4 transition-transform", isCreationMode && "rotate-45")} />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Capture Area wrapper */}
                                    <div
                                        ref={captureAreaRef}
                                        className={cn("p-6 flex-1 flex flex-col gap-6 overflow-hidden", isCapturing && "bg-[#0a0a0a] rounded-[2rem] border-4 border-primary/20")}
                                        style={isCapturing ? { width: '1200px' } : {}}
                                    >
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

                                         {/* Timeline Grid tracks container */}
                                         <div
                                             ref={timelineRef}
                                             className={cn(
                                                 "custom-scrollbar relative rounded-2xl p-6 overflow-x-auto select-none border flex-1 transition-all duration-300",
                                                 isDragOverGrid ? "bg-primary/[0.02] border-primary/30 shadow-lg shadow-primary/5" : "bg-muted/10 border-primary/5",
                                                 (isCreationMode || isZoomMarqueeMode) ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
                                             )}
                                             onDragOver={(e) => {
                                                 e.preventDefault();
                                                 e.dataTransfer.dropEffect = 'copy';
                                             }}
                                             onDragEnter={(e) => {
                                                 e.preventDefault();
                                                 setIsDragOverGrid(true);
                                             }}
                                             onDragLeave={(e) => {
                                                 const rect = e.currentTarget.getBoundingClientRect();
                                                 if (
                                                     e.clientX < rect.left ||
                                                     e.clientX >= rect.right ||
                                                     e.clientY < rect.top ||
                                                     e.clientY >= rect.bottom
                                                 ) {
                                                     setIsDragOverGrid(false);
                                                 }
                                             }}
                                             onDrop={(e) => {
                                                 e.preventDefault();
                                                 setIsDragOverGrid(false);
                                                 
                                                 const rawData = e.dataTransfer.getData('text/plain');
                                                 let templateName = e.dataTransfer.getData('application/habit-template');
                                                 let taskId = e.dataTransfer.getData('application/habit-task-id') || e.dataTransfer.getData('taskId');
                                                 
                                                 if (rawData) {
                                                     if (rawData.startsWith('task:')) {
                                                         taskId = rawData.substring(5);
                                                     } else if (rawData.startsWith('template:')) {
                                                         templateName = rawData.substring(9);
                                                     }
                                                 }

                                                 const rect = e.currentTarget.getBoundingClientRect();
                                                 const padding = 24;
                                                 const x = Math.max(0, e.clientX - rect.left - padding);
                                                 const activeWidth = rect.width - padding * 2;
                                                 const hour = Math.min(24, Math.max(0, (x / activeWidth) * 24));

                                                 if (taskId) {
                                                     const targetTask = tasks.find(t => t.id === taskId);
                                                     if (targetTask) {
                                                         const trackKey = `task:${targetTask.id}`;
                                                         if (!emptyTracks.includes(trackKey)) {
                                                             setEmptyTracks((prev) => [...prev, trackKey]);
                                                             toast.success(`Track lane created for "${targetTask.title}". You can start logging actual hours on it later!`);
                                                         } else {
                                                             toast.info(`Track lane for "${targetTask.title}" already exists.`);
                                                         }
                                                     }
                                                 } else if (templateName) {
                                                     handleDropTemplate(templateName, hour);
                                                 }
                                             }}
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
                                                
                                                {/* Header hours grid labels */}
                                                <div className="relative h-6 mb-4" style={{ width: '100%' }}>
                                                    {Array.from({ length: 25 }).map((_, hour) => (
                                                      <div
                                                        key={`label-h-${hour}`}
                                                        className="absolute -translate-x-1/2 flex flex-col items-center"
                                                        style={{ left: `${(hour / 24) * 100}%` }}
                                                      >
                                                        <p className="text-[10px] font-black text-primary/75 leading-none font-mono">
                                                          {(hour % 24).toString().padStart(2, '0')}
                                                        </p>
                                                        <div className="w-px h-1 bg-primary/20 mt-1" />
                                                      </div>
                                                    ))}
                                                </div>

                                                {/* Track lanes rendering */}
                                                <div className="space-y-3.5">
                                                    {timelineTracks.length > 0 ? timelineTracks.map((track) => (
                                                      <div key={track.key} className="grid grid-cols-[140px_minmax(0,1fr)] gap-4 items-center">
                                                        
                                                        {/* Track Label */}
                                                        <div className="rounded-xl border border-primary/5 bg-background/80 p-3 shadow-sm min-w-0">
                                                          <div className="flex items-center gap-1.5">
                                                            <p className="text-[8px] font-black uppercase tracking-wider text-muted-foreground/60 truncate">Track</p>
                                                            {track.entries.some((entry) => entry.isRunning) && (
                                                              <Badge className="h-3.5 bg-primary/10 text-primary border border-primary/20 text-[6px] font-black uppercase tracking-widest animate-pulse px-1">
                                                                LIVE
                                                              </Badge>
                                                            )}
                                                          </div>
                                                          <p className="mt-0.5 text-xs font-black truncate text-foreground">{track.label}</p>
                                                        </div>

                                                        {/* Interactive Lane Grid */}
                                                        <div
                                                          className={cn(
                                                            "relative h-16 bg-background/20 rounded-xl border border-primary/5 shadow-inner overflow-hidden transition-all",
                                                            isCreationMode && 'cursor-crosshair ring-1 ring-primary/35 bg-primary/5',
                                                            isZoomMarqueeMode && 'cursor-zoom-in ring-1 ring-primary/25 bg-primary/5',
                                                            isSelecting && 'scale-[1.002] bg-background/50 shadow-md',
                                                            activeDragOverLaneKey === track.key && 'border-primary/40 bg-primary/[0.04] ring-1 ring-primary/35 shadow-md shadow-primary/5 scale-[1.001]'
                                                          )}
                                                          onDragEnter={() => setActiveDragOverLaneKey(track.key)}
                                                          onDragLeave={() => setActiveDragOverLaneKey(null)}
                                                          onDragOver={(e) => {
                                                            e.preventDefault();
                                                            e.dataTransfer.dropEffect = 'copy';
                                                          }}
                                                           onDrop={(e) => {
                                                             e.preventDefault();
                                                             e.stopPropagation();
                                                             setActiveDragOverLaneKey(null);
                                                             const rawData = e.dataTransfer.getData('text/plain');
                                                             let templateName = e.dataTransfer.getData('application/habit-template');
                                                             let taskId = e.dataTransfer.getData('application/habit-task-id') || e.dataTransfer.getData('taskId');
                                                             
                                                             if (rawData) {
                                                                 if (rawData.startsWith('task:')) {
                                                                     taskId = rawData.substring(5);
                                                                 } else if (rawData.startsWith('template:')) {
                                                                     templateName = rawData.substring(9);
                                                                 }
                                                             }
                                                             
                                                             const rect = e.currentTarget.getBoundingClientRect();
                                                             const x = e.clientX - rect.left;
                                                             const hour = (x / rect.width) * 24;

                                                             if (taskId) {
                                                                 const targetTask = tasks.find(t => t.id === taskId);
                                                                 if (targetTask) {
                                                                     const start = new Date(selectedDate);
                                                                     start.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
                                                                     const end = new Date(start.getTime() + 60 * 60000); // 1hr block default

                                                                     setPendingManualEntry({
                                                                         category: targetTask.title,
                                                                         description: `Logged Focus: ${targetTask.title}`,
                                                                         taskId: targetTask.id,
                                                                         projectId: targetTask.projectId || undefined,
                                                                         startTime: start,
                                                                         endTime: end,
                                                                         duration: 60,
                                                                         isRunning: false,
                                                                     });
                                                                     setSessionSummary('');
                                                                     setSessionCategory(targetTask.title);
                                                                     setSessionProjectId(targetTask.projectId || '');
                                                                     setSessionTaskId(targetTask.id);
                                                                     setIsSummaryDialogOpen(true);
                                                                 }
                                                             } else if (templateName) {
                                                                 handleDropTemplate(templateName, hour);
                                                             }
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
                                                              className="absolute top-0 bottom-0 bg-primary/25 border-x border-primary/60 z-20 pointer-events-none"
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

                                                          {/* Session stamps */}
                                                          {track.entries.map((entry) => {
                                                            const startTime = toSafeDate(entry.startTime) || new Date();
                                                            const endTime = entry.endTime ? toSafeDate(entry.endTime) || currentTime : currentTime;
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
                                                                }}
                                                                onClick={(event) => {
                                                                  event.stopPropagation();
                                                                  handleEditNotes(entry);
                                                                }}
                                                                title={`${entry.category} | ${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`}
                                                              >
                                                                <div className="absolute inset-0 flex flex-col items-center justify-center px-1 overflow-hidden pointer-events-none select-none text-white font-black">
                                                                  {isRunning ? (
                                                                    <span className="text-[7px] tracking-widest text-white/95">LIVE ({getElapsedTime(startTime, currentTime)})</span>
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

                                                          {/* NOW vertical marker line */}
                                                          {selectedDate.toDateString() === new Date().toDateString() && (
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
                                                      <div className="rounded-2xl border border-dashed border-primary/10 bg-background/40 px-6 py-12 text-center text-xs font-black uppercase tracking-widest text-muted-foreground/40 leading-relaxed">
                                                        No calibration timeline tracks created. Drag a task from the Focus Sidebar onto the grid to stamp entries.
                                                      </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Routine template stamps */}
                                        <div className="space-y-2 no-capture mt-4">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Routine stamps</p>
                                            <div className="flex flex-wrap gap-2">
                                                {ROUTINE_TEMPLATES.map((template) => {
                                                  const Icon = template.icon;
                                                  return (
                                                    <div
                                                      key={template.name}
                                                      draggable
                                                      onDragStart={(e) => {
                                                         e.dataTransfer.setData('application/habit-template', template.name);
                                                         e.dataTransfer.setData('text/plain', `template:${template.name}`);
                                                         e.dataTransfer.effectAllowed = 'copy';
                                                      }}
                                                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/40 border border-primary/5 hover:border-primary/20 hover:bg-primary/5 transition-all cursor-grab active:cursor-grabbing group shadow-sm shrink-0"
                                                    >
                                                      <div
                                                        className="w-3.5 h-3.5 rounded flex items-center justify-center p-0.5"
                                                        style={{ background: getCategoryColor(template.category) }}
                                                      >
                                                        <Icon className="h-full w-full text-white" />
                                                      </div>
                                                      <div className="flex flex-col select-none">
                                                        <span className="text-[8px] font-black uppercase tracking-tight text-foreground/80 leading-none">{template.name}</span>
                                                        <span className="text-[7px] font-bold text-muted-foreground/50 mt-0.5 leading-none">{formatDuration(template.duration)}</span>
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                        
                        <Dialog
                          open={isSummaryDialogOpen}
                          onOpenChange={(open) => {
                            setIsSummaryDialogOpen(open);
                            if (!open) {
                              setEditingEntryId(null);
                              setPendingManualEntry(null);
                              setSessionSummary('');
                              setSessionCategory('');
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
                                              <CommandEmpty>No tasks found.</CommandEmpty>
                                              
                                              {/* Today's Focus Tasks (Focus Bucket) Section */}
                                              {scheduledTasks.length > 0 && (
                                                <CommandGroup heading="Today's Focus Tasks (From Bucket)">
                                                  {scheduledTasks.map((task) => {
                                                    const projectName = task.projectId
                                                      ? projects.find((project) => project.id === task.projectId)?.name || 'Project'
                                                      : 'Personal';

                                                    return (
                                                      <CommandItem
                                                        key={`bucket-${task.id}`}
                                                        value={`bucket-${task.title} ${projectName}`}
                                                        onSelect={() => {
                                                          setSessionTaskId(task.id);
                                                          setSessionProjectId(task.projectId || '');
                                                          setSessionCategory((prev) =>
                                                            !prev.trim() || prev === 'General' ? task.title : prev
                                                          );
                                                          setIsSummaryTaskSearchOpen(false);
                                                        }}
                                                        className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 cursor-pointer hover:bg-primary/5"
                                                      >
                                                        <div className="min-w-0">
                                                          <p className="truncate text-xs font-bold">{task.title}</p>
                                                          <p className="truncate text-[9px] text-muted-foreground">{projectName}</p>
                                                        </div>
                                                      </CommandItem>
                                                    );
                                                  })}
                                                </CommandGroup>
                                              )}

                                              <CommandGroup heading="All Backlog Tasks">
                                                <CommandItem
                                                  value="No task"
                                                  onSelect={() => {
                                                    setSessionTaskId('');
                                                    setIsSummaryTaskSearchOpen(false);
                                                  }}
                                                  className="rounded-xl px-3 py-2 cursor-pointer hover:bg-primary/5"
                                                >
                                                  <div>
                                                    <p className="text-xs font-bold">Unlinked Block</p>
                                                    <p className="text-[9px] text-muted-foreground">Calibration is not connected to tasks</p>
                                                  </div>
                                                </CommandItem>
                                                {summarySearchTasks
                                                  .filter((task) => !scheduledTasks.some((t) => t.id === task.id))
                                                  .map((task) => {
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
                                                        className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 cursor-pointer hover:bg-primary/5"
                                                      >
                                                        <div className="min-w-0">
                                                          <p className="truncate text-xs font-bold">{task.title}</p>
                                                          <p className="truncate text-[9px] text-muted-foreground">{projectName}</p>
                                                        </div>
                                                      </CommandItem>
                                                    );
                                                  })}
                                              </CommandGroup>
                                              
                                              <CommandSeparator />
                                              <CommandGroup heading="Create if missing">
                                                <div className="px-2 pb-2 pt-1" onKeyDown={(e) => e.stopPropagation()}>
                                                  <div className="rounded-2xl border border-dashed border-primary/15 bg-primary/5 p-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                      <div className="min-w-0">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary/70">
                                                          Missing Task?
                                                        </p>
                                                        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                                                          Create one in the current {sessionProjectId ? 'project' : 'personal space'}.
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
                                                      placeholder={sessionProjectId ? 'New task for this project...' : 'New personal task...'}
                                                      className="mt-3 h-10 rounded-xl border-primary/10 bg-background/80 text-xs font-medium"
                                                    />
                                                  </div>
                                                </div>
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
                                    type="button"
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
                                    type="button"
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
                    </div>
                </MainLayout>
            </DataLoader>
        </ProtectedRoute>
    );
}

// Loading fallback component
function DayTimelineLoading() {
    return (
        <ProtectedRoute>
            <DataLoader>
                <MainLayout>
                    <div className="flex items-center justify-center h-screen">
                        <div className="flex flex-col items-center gap-4">
                            <Clock className="h-12 w-12 text-primary animate-pulse" />
                            <p className="text-sm text-muted-foreground">Loading workspace...</p>
                        </div>
                    </div>
                </MainLayout>
            </DataLoader>
        </ProtectedRoute>
    );
}

// Default export with Suspense boundary
export default function DayTimelinePage() {
    return (
        <Suspense fallback={<DayTimelineLoading />}>
            <DayTimelineContent />
        </Suspense>
    );
}
