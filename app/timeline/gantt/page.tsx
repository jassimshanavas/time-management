'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/store';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Target,
  History,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Layers,
  TrendingUp,
  Clock,
  Crosshair,
  Plus,
  Moon,
  Star,
  Sunrise,
  Trash2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { DateRange } from 'react-day-picker';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  differenceInDays,
  addMonths,
  subMonths,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  eachHourOfInterval,
  isSameDay,
  isWithinInterval,
  areIntervalsOverlapping,
} from 'date-fns';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────
const SIDEBAR_PX = 224;
const ROW_H = 72; // px – comfortable row height

// ─── Helpers ─────────────────────────────────────────────────────────────────
function statusGradient(status: string) {
  switch (status) {
    case 'done':
      return 'from-emerald-500 to-teal-500';
    case 'in-progress':
      return 'from-blue-500 to-indigo-500';
    default:
      return 'from-slate-500/60 to-slate-600/60';
  }
}

function priorityRing(priority: string) {
  switch (priority) {
    case 'high': return 'ring-red-500/60';
    case 'medium': return 'ring-amber-400/60';
    default: return 'ring-primary/20';
  }
}

function priorityDot(priority: string) {
  switch (priority) {
    case 'high': return 'bg-red-500';
    case 'medium': return 'bg-amber-400';
    default: return 'bg-slate-400';
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GanttViewPage() {
  const { tasks, projects, timeEntries, sleepEntries, addSleepEntry, deleteSleepEntry } = useStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateRangeSelection, setDateRangeSelection] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'quarter'>('month');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isMarqueeMode, setIsMarqueeMode] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [hoveredTask, setHoveredTask] = useState<{ task: any; loggedMins: number; util: number; plannedStart: Date; project: any } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // ── Sleep modal state ────────────────────────────────────────────────────────
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [sleepForm, setSleepForm] = useState({
    bedtimeDate: format(new Date(), 'yyyy-MM-dd'),
    bedtimeTime: '23:00',
    wakeDate: format(new Date(), 'yyyy-MM-dd'),
    wakeTime: '07:00',
    quality: 3 as 1 | 2 | 3 | 4 | 5,
    mood: 'okay' as 'great' | 'good' | 'okay' | 'tired' | 'awful',
    notes: '',
  });
  const [sleepSaving, setSleepSaving] = useState(false);
  const [hoveredSleep, setHoveredSleep] = useState<{ entry: any } | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // col width per slot ─ wider for readability
  const COL_PX = viewMode === 'day' ? 80 : 100;

  // ── Date range ──────────────────────────────────────────────────────────────
  const dateRange = useMemo(() => {
    if (viewMode === 'day') {
      const from = dateRangeSelection?.from || currentDate;
      const to = dateRangeSelection?.to || from;
      return { start: startOfDay(from), end: endOfDay(to) };
    }
    if (viewMode === 'month') {
      return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
    return { start: startOfMonth(currentDate), end: endOfMonth(addMonths(currentDate, 2)) };
  }, [currentDate, viewMode, dateRangeSelection]);

  const timeSlots = useMemo(
    () => viewMode === 'day' ? eachHourOfInterval(dateRange) : eachDayOfInterval(dateRange),
    [dateRange, viewMode]
  );

  // ── Task helpers ────────────────────────────────────────────────────────────
  const getTaskDates = (task: any) => {
    const plannedStart = new Date(task.scheduledStart || task.createdAt);
    const estimatedEnd = task.estimatedDuration
      ? new Date(plannedStart.getTime() + task.estimatedDuration * 60000)
      : null;
    const potentialEnds = [
      task.deadline ? new Date(task.deadline) : null,
      task.scheduledEnd ? new Date(task.scheduledEnd) : null,
      estimatedEnd,
    ].filter(Boolean) as Date[];

    let plannedEnd = potentialEnds.length > 0
      ? new Date(Math.max(...potentialEnds.map(d => d.getTime())))
      : new Date(plannedStart);
    if (plannedEnd < plannedStart) plannedEnd = new Date(plannedStart);

    const actualEnd = task.status === 'done'
      ? new Date(task.lastStatusChange || task.updatedAt || plannedEnd)
      : new Date(Math.max(plannedStart.getTime(), Date.now()));

    return { plannedStart, plannedEnd, actualEnd };
  };

  const filteredTasks = useMemo(() => tasks.filter(task => {
    if (selectedProjectId && task.projectId !== selectedProjectId) return false;
    const { plannedStart, plannedEnd, actualEnd } = getTaskDates(task);
    try {
      return (
        areIntervalsOverlapping({ start: plannedStart, end: plannedEnd }, dateRange) ||
        areIntervalsOverlapping({ start: plannedStart, end: actualEnd }, dateRange)
      );
    } catch {
      if (task.deadline) return isWithinInterval(new Date(task.deadline), dateRange);
      return false;
    }
  }), [tasks, selectedProjectId, dateRange]);

  const filteredSleepEntries = useMemo(() => sleepEntries.filter(entry => {
    const bed = new Date(entry.bedtime);
    const wake = new Date(entry.wakeTime);
    try {
      return areIntervalsOverlapping({ start: bed, end: wake }, dateRange);
    } catch { return false; }
  }), [sleepEntries, dateRange]);

  const tasksByProject = useMemo(() => {
    const grouped: Record<string, typeof tasks> = {};
    filteredTasks.forEach(task => {
      const key = task.projectId || '__none__';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(task);
    });
    // Ensure "Personal" shows up if we have sleep data even with no personal tasks
    if (filteredSleepEntries.length > 0 && !grouped['__none__']) {
      grouped['__none__'] = [];
    }
    return grouped;
  }, [filteredTasks, filteredSleepEntries]);

  const getProject = (id: string) => id === '__none__' ? null : projects.find(p => p.id === id);

  const loggedDurations = useMemo(() => {
    const map: Record<string, number> = {};
    timeEntries.forEach(entry => {
      if (entry.taskId) map[entry.taskId] = (map[entry.taskId] || 0) + (entry.duration || 0);
    });
    return map;
  }, [timeEntries]);

  const formatMin = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const getTaskRangePositions = (task: any) => {
    const { plannedStart, plannedEnd, actualEnd } = getTaskDates(task);
    const deadlineDate = task.deadline ? new Date(task.deadline) : plannedEnd;
    const total = dateRange.end.getTime() - dateRange.start.getTime();
    if (total <= 0) return { start: 0, plannedWidth: 0, actualWidth: 0, deadlinePct: 0, loggedPct: 0, isOverrun: false, isDelayed: false, delayStart: 0, delayWidth: 0 };
    const toRange = (d: Date) => Math.max(0, Math.min(100, ((d.getTime() - dateRange.start.getTime()) / total) * 100));
    const startPct = toRange(plannedStart);
    const deadlinePct = toRange(deadlineDate);
    const actualEndPct = toRange(actualEnd);
    const nowPct = toRange(new Date());
    const plannedPct = Math.max(0, deadlinePct - startPct);
    const actualPct = Math.max(0, actualEndPct - startPct);
    const isOverdue = task.status !== 'done' && new Date() > deadlineDate;
    const delayStartPct = Math.min(deadlinePct, nowPct);
    const delayWidthPct = isOverdue ? Math.max(0, nowPct - deadlinePct) : 0;
    return { start: startPct, plannedWidth: plannedPct, actualWidth: actualPct, deadlinePct, isOverrun: actualEnd > plannedEnd && actualEnd <= dateRange.end, isDelayed: isOverdue, delayStart: delayStartPct, delayWidth: delayWidthPct };
  };

  // ── Sleep helpers ────────────────────────────────────────────────────────────
  const getSleepBarPositions = (entry: any) => {
    const total = dateRange.end.getTime() - dateRange.start.getTime();
    if (total <= 0) return { start: 0, width: 0 };
    const toRange = (d: Date) => Math.max(0, Math.min(100, ((d.getTime() - dateRange.start.getTime()) / total) * 100));
    const startPct = toRange(new Date(entry.bedtime));
    const endPct = toRange(new Date(entry.wakeTime));
    return { start: startPct, width: Math.max(0, endPct - startPct) };
  };

  const sleepQualityLabel = (q: number) => ['', 'Terrible', 'Poor', 'Okay', 'Good', 'Excellent'][q] || '';
  const sleepMoodEmoji = (m: string) => ({ great: '😁', good: '🙂', okay: '😐', tired: '😴', awful: '😩' }[m] || '😐');

  const handleSaveSleep = async () => {
    const bedtime = new Date(`${sleepForm.bedtimeDate}T${sleepForm.bedtimeTime}:00`);
    const wakeTime = new Date(`${sleepForm.wakeDate}T${sleepForm.wakeTime}:00`);
    if (isNaN(bedtime.getTime()) || isNaN(wakeTime.getTime())) return;
    if (wakeTime <= bedtime) {
      // Handle next-day wake: if wakeTime < bedtime on same day, add 1 day
      wakeTime.setDate(wakeTime.getDate() + 1);
    }
    const durationMins = Math.round((wakeTime.getTime() - bedtime.getTime()) / 60000);
    setSleepSaving(true);
    try {
      await addSleepEntry({
        userId: '', // filled by store
        bedtime,
        wakeTime,
        durationMins,
        quality: sleepForm.quality,
        mood: sleepForm.mood,
        notes: sleepForm.notes || undefined,
        date: wakeTime,
        createdAt: new Date(),
      });
      setShowSleepModal(false);
      setSleepForm(f => ({
        ...f,
        bedtimeDate: format(new Date(), 'yyyy-MM-dd'),
        bedtimeTime: '23:00',
        wakeDate: format(new Date(), 'yyyy-MM-dd'),
        wakeTime: '07:00',
        quality: 3,
        mood: 'okay',
        notes: '',
      }));
    } finally {
      setSleepSaving(false);
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalTasks = filteredTasks.length;
  const doneTasks = filteredTasks.filter(t => t.status === 'done').length;
  const activeTasks = filteredTasks.filter(t => t.status === 'in-progress').length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // ── Content width (fixed pixel base for perfect alignment) ─────────────────
  const totalGridWidth = timeSlots.length * COL_PX * zoomLevel;
  const contentWidth = `${SIDEBAR_PX + totalGridWidth}px`;

  // ── Panning ─────────────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMarqueeMode) {
      const container = timelineRef.current!;
      const rect = container.getBoundingClientRect();
      const pLeft = parseFloat(window.getComputedStyle(container).paddingLeft);
      const sidebarEl = container.querySelector('.gantt-sidebar') as HTMLElement | null;
      const sidebarW = sidebarEl ? sidebarEl.getBoundingClientRect().width : SIDEBAR_PX;
      const gridW = container.scrollWidth - sidebarW - pLeft;

      const pct = (x: number) => Math.max(0, Math.min(1, (x - rect.left + container.scrollLeft - pLeft - sidebarW) / gridW));

      setIsSelecting(true);
      setSelectionRange({ start: pct(e.clientX), end: pct(e.clientX) });

      const onMove = (ev: MouseEvent) => setSelectionRange(prev => prev ? { ...prev, end: pct(ev.clientX) } : null);
      const onUp = () => {
        setIsSelecting(false);
        setSelectionRange(cur => {
          if (cur && Math.abs(cur.start - cur.end) > 0.005) {
            const s = Math.min(cur.start, cur.end);
            const enD = Math.max(cur.start, cur.end);
            const tgt = Math.min(10, Math.max(zoomLevel, zoomLevel / (enD - s)));
            setZoomLevel(tgt);
            setTimeout(() => {
              if (!timelineRef.current) return;
              const c = timelineRef.current;
              const sw = c.scrollWidth; const nPL = parseFloat(window.getComputedStyle(c).paddingLeft);
              const nSW = (c.querySelector('.gantt-sidebar') as HTMLElement | null)?.getBoundingClientRect().width ?? SIDEBAR_PX;
              const nGW = sw - nSW - nPL;
              c.scrollTo({ left: nPL + nSW + ((s + enD) / 2) * nGW - c.clientWidth / 2, behavior: 'smooth' });
            }, 50);
          }
          return null;
        });
        setIsMarqueeMode(false);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      return;
    }

    const sc = timelineRef.current!;
    const rect = sc.getBoundingClientRect();
    const initL = sc.scrollLeft;
    const maxL = sc.scrollWidth - sc.clientWidth;
    const startX = e.clientX - rect.left;
    sc.style.scrollBehavior = 'auto';
    setIsPanning(true);

    let vel = 0, lastX = e.clientX, lastT = Date.now(), raf = 0;

    const onMove = (ev: MouseEvent) => {
      const dt = Date.now() - lastT;
      if (dt > 0) vel = (ev.clientX - lastX) / dt;
      lastX = ev.clientX; lastT = Date.now();
      const walk = (ev.clientX - rect.left - startX) * 1.5;
      const tgt = initL - walk;
      sc.scrollLeft = Math.max(0, Math.min(maxL, tgt));
      if (contentRef.current) {
        const over = tgt < 0 ? tgt : tgt > maxL ? tgt - maxL : 0;
        contentRef.current.style.transform = over ? `translateX(${-Math.sign(over) * Math.min(40, Math.pow(Math.abs(over), 0.5))}px)` : '';
      }
    };
    const onUp = () => {
      setIsPanning(false);
      sc.style.scrollBehavior = '';
      if (contentRef.current) {
        contentRef.current.style.transition = 'transform 0.4s cubic-bezier(0.175,0.885,0.32,1.2)';
        contentRef.current.style.transform = '';
      }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      let mom = vel * 15;
      const step = () => { if (Math.abs(mom) < 0.1) { cancelAnimationFrame(raf); return; } sc.scrollLeft -= mom; mom *= 0.95; raf = requestAnimationFrame(step); };
      if (Math.abs(mom) > 2) raf = requestAnimationFrame(step);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // ── Slot grouping (memoised) ─────────────────────────────────────────────────
  const slotDayGroups = useMemo(() => {
    const groups: { date: Date; slots: Date[] }[] = [];
    timeSlots.forEach(slot => {
      const last = groups[groups.length - 1];
      if (last && isSameDay(last.date, slot)) last.slots.push(slot);
      else groups.push({ date: slot, slots: [slot] });
    });
    return groups;
  }, [timeSlots]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
          <style dangerouslySetInnerHTML={{
            __html: `
            .gs-scroll::-webkit-scrollbar{width:5px;height:5px}
            .gs-scroll::-webkit-scrollbar-track{background:transparent}
            .gs-scroll::-webkit-scrollbar-thumb{background:rgba(128,128,128,.18);border-radius:99px}
            .gs-scroll:hover::-webkit-scrollbar-thumb{background:rgba(128,128,128,.35)}
            @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
            .shimmer{background:linear-gradient(90deg,transparent 25%,rgba(var(--primary),.08) 50%,transparent 75%);background-size:200% 100%;animation:shimmer 2.5s infinite linear}
          ` }} />

          <div className="space-y-5">

            {/* ── Top header bar ─────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Link href="/timeline">
                  <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-primary/10 border border-primary/5 bg-background/40 backdrop-blur-xl">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
                  <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/40 bg-clip-text text-transparent uppercase leading-none">
                    Strategic Gantt
                  </h1>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/50 mt-0.5">
                    Resource Allocation · Temporal Intelligence
                  </p>
                </motion.div>
              </div>

              {/* right controls */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* zoom strip */}
                <div className="flex items-center gap-0.5 bg-background/40 backdrop-blur-xl border border-primary/10 p-1 rounded-2xl shadow-sm">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl opacity-70 hover:opacity-100"
                    onClick={() => setZoomLevel(p => Math.max(1, p - 1))} disabled={zoomLevel <= 1}>
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <button
                    className="px-2.5 h-8 text-[10px] font-black rounded-xl hover:bg-primary/10 transition-colors min-w-[3rem] tabular-nums"
                    onClick={() => { setZoomLevel(1); timelineRef.current?.scrollTo({ left: 0, behavior: 'smooth' }); }}
                  >{zoomLevel}×</button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl opacity-70 hover:opacity-100"
                    onClick={() => setZoomLevel(p => Math.min(10, p + 1))} disabled={zoomLevel >= 10}>
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                  <div className="w-px h-4 bg-primary/10 mx-0.5" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl opacity-60 hover:opacity-100"
                    title="Reset view"
                    onClick={() => { setZoomLevel(1); timelineRef.current?.scrollTo({ left: 0, behavior: 'smooth' }); }}>
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                </div>

                {/* marquee zoom */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isMarqueeMode ? 'default' : 'ghost'}
                        size="icon"
                        className={cn('h-10 w-10 rounded-2xl transition-all border',
                          isMarqueeMode
                            ? 'bg-primary border-primary shadow-lg shadow-primary/25'
                            : 'bg-background/40 backdrop-blur-xl border-primary/10 hover:bg-primary/5'
                        )}
                        onClick={() => setIsMarqueeMode(p => !p)}
                      >
                        <Crosshair className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[10px] font-black uppercase tracking-widest">
                      {isMarqueeMode ? 'Cancel Zoom Select' : 'Drag to Zoom'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* view selector */}
                <Select value={viewMode} onValueChange={(v: 'day' | 'month' | 'quarter') => { setViewMode(v); setZoomLevel(1); }}>
                  <SelectTrigger className="w-36 h-10 rounded-2xl bg-background/40 backdrop-blur-xl border-primary/10 font-black text-[11px] uppercase tracking-widest">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-primary/10">
                    <SelectItem value="day">Daily Pulse</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="quarter">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Stats row ──────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              {[
                { icon: Layers, label: 'Total Tasks', value: totalTasks, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                { icon: TrendingUp, label: 'Completion', value: `${completionRate}%`, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { icon: History, label: 'In Progress', value: activeTasks, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { icon: CheckCircle2, label: 'Completed', value: doneTasks, color: 'text-teal-400', bg: 'bg-teal-500/10' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-background/40 backdrop-blur-xl border border-primary/5 shadow-sm hover:border-primary/20 transition-all group">
                  <div className={cn('p-2 rounded-xl shrink-0', s.bg)}>
                    <s.icon className={cn('h-4 w-4', s.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 truncate">{s.label}</p>
                    <p className="text-xl font-black tracking-tight group-hover:text-primary transition-colors">{s.value}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* ── Nav + filter bar ───────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-background/40 backdrop-blur-xl border-primary/5 shadow-xl rounded-3xl">
                <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">

                  {/* date nav */}
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-0.5 bg-muted/30 p-1 rounded-2xl">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-background"
                        onClick={() => {
                          if (viewMode === 'day' && dateRangeSelection?.from && dateRangeSelection?.to) {
                            const d = Math.max(1, differenceInDays(dateRangeSelection.to, dateRangeSelection.from) + 1);
                            setDateRangeSelection({ from: subDays(dateRangeSelection.from, d), to: subDays(dateRangeSelection.to, d) });
                          } else setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : subMonths(currentDate, 3));
                        }}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" className="h-9 px-4 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-background"
                        onClick={() => { const t = new Date(); setCurrentDate(t); setDateRangeSelection({ from: startOfDay(t), to: endOfDay(t) }); }}>
                        Today
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-background"
                        onClick={() => {
                          if (viewMode === 'day' && dateRangeSelection?.from && dateRangeSelection?.to) {
                            const d = Math.max(1, differenceInDays(dateRangeSelection.to, dateRangeSelection.from) + 1);
                            setDateRangeSelection({ from: addDays(dateRangeSelection.from, d), to: addDays(dateRangeSelection.to, d) });
                          } else setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : addMonths(currentDate, 3));
                        }}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* date display / picker */}
                    {viewMode === 'day' ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex items-center gap-2 group/dt outline-none cursor-pointer hover:text-primary transition-colors">
                            <CalendarIcon className="h-3.5 w-3.5 text-primary/50 group-hover/dt:text-primary transition-colors" />
                            <span className="text-sm font-black tracking-tight uppercase">
                              {format(dateRange.start, 'MMM d')}
                              <span className="text-primary/30 mx-1.5">—</span>
                              {format(dateRange.end, 'MMM d, yyyy')}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-primary/20 bg-background/95 backdrop-blur-2xl shadow-2xl rounded-2xl" align="start">
                          <Calendar initialFocus mode="range" defaultMonth={dateRangeSelection?.from || currentDate}
                            selected={dateRangeSelection} onSelect={setDateRangeSelection} numberOfMonths={2} className="bg-transparent" />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <span className="text-sm font-black tracking-tight uppercase text-foreground/80">
                        {format(dateRange.start, 'MMM yyyy')}
                        {viewMode === 'quarter' && <span className="text-primary/30 mx-2">→</span>}
                        {viewMode === 'quarter' && format(dateRange.end, 'MMM yyyy')}
                      </span>
                    )}
                  </div>

                  {/* project filter */}
                  <div className="flex items-center gap-2 w-full sm:w-auto bg-muted/20 border border-primary/5 p-1.5 rounded-2xl">
                    <Filter className="h-3.5 w-3.5 text-primary/50 ml-2 shrink-0" />
                    <Select value={selectedProjectId || '__all__'} onValueChange={v => setSelectedProjectId(v === '__all__' ? undefined : v)}>
                      <SelectTrigger className="w-full sm:w-56 h-9 rounded-xl bg-background/50 border-transparent font-black text-[10px] uppercase tracking-widest">
                        <SelectValue placeholder="All Projects" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-primary/10">
                        <SelectItem value="__all__">All Projects</SelectItem>
                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        <SelectItem value="__none__">Personal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Log Sleep button */}
                  <Button
                    onClick={() => setShowSleepModal(true)}
                    className="flex items-center gap-2 h-10 px-4 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 hover:text-indigo-300 transition-all text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-none"
                  >
                    <Moon className="h-3.5 w-3.5" />
                    Log Sleep
                  </Button>

                </CardContent>
              </Card>
            </motion.div>

            {/* ── Legend row ─────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 px-1">
              {[
                { swatch: <div className="h-3 w-10 rounded-full bg-primary/8 border border-primary/15" />, label: 'Planned Range' },
                { swatch: <div className="h-3 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />, label: 'In Progress' },
                { swatch: <div className="h-3 w-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />, label: 'Completed' },
                {
                  swatch: (
                    <div className="h-3 w-10 rounded-full overflow-hidden border border-red-500/30 bg-red-500/10">
                      <div className="h-full w-full bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(239,68,68,0.35)_4px,rgba(239,68,68,0.35)_8px)]" />
                    </div>
                  ), label: 'Overrun'
                },
                { swatch: <div className="h-3 w-10 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 opacity-80" />, label: 'Sleep' },
              ].map((l, i) => (
                <div key={i} className="flex items-center gap-2 group/l">
                  {l.swatch}
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 group-hover/l:text-muted-foreground transition-colors">{l.label}</span>
                </div>
              ))}

              {/* marquee hint */}
              <AnimatePresence>
                {isMarqueeMode && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                    className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest"
                  >
                    <Crosshair className="h-3 w-3 animate-pulse" />
                    Drag to zoom a region
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Main timeline card ─────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="bg-background/40 backdrop-blur-xl border-primary/5 shadow-2xl rounded-3xl overflow-hidden">
                <CardContent
                  ref={timelineRef}
                  className={cn('p-0 overflow-x-auto gs-scroll select-none relative',
                    isMarqueeMode ? 'cursor-crosshair' : isPanning ? 'cursor-grabbing' : 'cursor-grab'
                  )}
                  onMouseDown={handleMouseDown}
                >
                  <div
                    ref={contentRef}
                    className="relative"
                    style={{
                      width: '100%',
                      minWidth: contentWidth,
                    }}
                  >
                    {/* marquee selection overlay */}
                    {isSelecting && selectionRange && (
                      <div
                        className="absolute inset-y-0 bg-primary/10 border-x-2 border-primary z-[999] pointer-events-none backdrop-blur-[1px]"
                        style={{
                          left: `calc(${SIDEBAR_PX}px + (100% - ${SIDEBAR_PX}px) * ${Math.min(selectionRange.start, selectionRange.end)})`,
                          width: `calc((100% - ${SIDEBAR_PX}px) * ${Math.abs(selectionRange.end - selectionRange.start)})`,
                        }}
                      />
                    )}

                    {/* ── Sticky column header ─────────────────────────── */}
                    <div className="sticky top-0 z-[90] border-b border-primary/10 bg-background/95 backdrop-blur-xl shadow-sm overflow-hidden"
                      style={{ display: 'grid', gridTemplateColumns: `${SIDEBAR_PX}px 1fr`, width: contentWidth }}>
                      {/* sidebar label */}
                      <div className="shrink-0 flex items-center gap-2 px-5 border-r border-primary/10 bg-background/95 backdrop-blur-xl z-[100]" style={{ height: 52 }}>
                        <Layers className="h-3.5 w-3.5 text-primary/50" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/70">
                          {selectedProjectId ? projects.find(p => p.id === selectedProjectId)?.name ?? 'Project' : 'All Tasks'}
                        </span>
                        <Badge variant="outline" className="ml-auto text-[8px] font-black border-primary/10 bg-primary/5 text-primary/60 py-0 h-4">
                          {filteredTasks.length}
                        </Badge>
                      </div>

                      {/* time slots */}
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${timeSlots.length}, minmax(${COL_PX * zoomLevel}px, 1fr))` }}>
                        {slotDayGroups.map((group, gi) => {
                          const startIdx = timeSlots.findIndex(s => s.getTime() === group.slots[0].getTime()) + 1;
                          return (
                            <div key={gi} className="flex flex-col border-r border-primary/15 last:border-r-0"
                              style={{ gridColumnStart: startIdx, gridColumnEnd: `span ${group.slots.length}` }}>
                              {/* day banner (multi-day) */}
                              {slotDayGroups.length > 1 && (
                                <div className={cn(
                                  'px-3 py-0.5 text-[8px] font-black uppercase tracking-widest border-b border-primary/5 whitespace-nowrap sticky top-0',
                                  isSameDay(group.date, new Date())
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-muted/10 text-muted-foreground/50'
                                )}>
                                  {format(group.date, 'EEE, MMM d')}
                                </div>
                              )}
                              <div className="flex flex-1">
                                {group.slots.map((slot, si) => {
                                  const isToday = isSameDay(slot, new Date());
                                  const isCurrHour = isToday && slot.getHours() === new Date().getHours();
                                  const isWeekend = !isToday && (slot.getDay() === 0 || slot.getDay() === 6);
                                  return (
                                    <div
                                      key={si}
                                      className={cn(
                                        'flex-1 flex flex-col items-center justify-center text-[9px] font-black border-r border-primary/5 last:border-r-0 transition-colors h-full min-h-[32px]',
                                        viewMode === 'day'
                                          ? isCurrHour ? 'bg-primary/20 text-primary' : 'text-muted-foreground/50'
                                          : isToday ? 'bg-primary/15 text-primary'
                                            : isWeekend ? 'bg-muted/5 text-muted-foreground/25'
                                              : 'text-muted-foreground/50'
                                      )}
                                    >
                                      {viewMode === 'day' ? (
                                        <>
                                          <span className="opacity-70 leading-none">{format(slot, 'HH')}</span>
                                          <span className="text-[7px] opacity-40 mt-0.5">00</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="opacity-50 leading-none text-[7px]">{format(slot, 'EEE')[0]}</span>
                                          <span className={cn('leading-none mt-0.5', isToday && 'text-sm')}>{format(slot, 'd')}</span>
                                        </>
                                      )}
                                      {(viewMode === 'day' ? isCurrHour : isToday) && (
                                        <div className="h-1 w-1 rounded-full bg-primary mt-0.5 animate-ping" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Global sleep zones (slanted stripes over the entire timeline) ── */}
                    {viewMode === 'day' && (
                      <div className="absolute inset-y-0 pointer-events-none overflow-hidden" style={{ left: SIDEBAR_PX, right: 0, zIndex: 0 }}>
                        {filteredSleepEntries.map(entry => {
                          const sleepPos = getSleepBarPositions(entry);
                          if (sleepPos.width <= 0) return null;
                          return (
                            <div
                              key={`global-sleep-${entry.id}`}
                              className="absolute inset-y-0"
                              style={{
                                left: `${sleepPos.start}%`,
                                width: `${sleepPos.width}%`,
                                background: `repeating-linear-gradient(135deg, rgba(99,102,241,0.06) 0, rgba(99,102,241,0.06) 12px, transparent 12px, transparent 24px)`,
                                borderLeft: '1px solid rgba(129,140,248,0.1)',
                                borderRight: '1px solid rgba(129,140,248,0.1)',
                              }}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* ── Task rows ─────────────────────────────────────── */}
                    {Object.keys(tasksByProject).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-30">
                        <CalendarIcon className="h-16 w-16" />
                        <p className="font-black uppercase tracking-widest text-sm">Horizon is clear</p>
                        <p className="text-xs font-bold opacity-60">No tasks in this period</p>
                      </div>
                    ) : (
                      Object.entries(tasksByProject).map(([projectId, projectTasks]) => {
                        const project = getProject(projectId);
                        return (
                          <div key={projectId} className="border-b border-primary/5 last:border-b-0">
                            {/* project header */}
                            <div className="border-b border-primary/5 bg-gradient-to-r from-muted/20 to-transparent"
                              style={{ display: 'grid', gridTemplateColumns: `${SIDEBAR_PX}px 1fr`, width: contentWidth }}>
                              <div className="shrink-0 px-5 py-2.5 sticky left-0 bg-background/90 backdrop-blur-xl z-40 border-r border-primary/5">
                                <div className="flex items-center gap-2">
                                  {project ? (
                                    <>
                                      <div className="h-2.5 w-2.5 rounded-full ring-2 ring-offset-2 ring-offset-background shrink-0"
                                        style={{ backgroundColor: project.color, ringColor: project.color + '40' } as any} />
                                      <span className="text-[10px] font-black uppercase tracking-widest truncate">{project.name}</span>
                                    </>
                                  ) : (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Personal</span>
                                  )}
                                  <Badge variant="outline" className="ml-auto text-[8px] font-black border-primary/10 bg-primary/5 py-0 h-4 shrink-0">
                                    {projectTasks.length}
                                  </Badge>
                                </div>
                              </div>
                              {/* project stripe across grid */}
                              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${timeSlots.length}, minmax(${COL_PX * zoomLevel}px, 1fr))`, height: 32 }}>
                                {slotDayGroups.map((g, gi) => {
                                  const startIdx = timeSlots.findIndex(s => s.getTime() === g.slots[0].getTime()) + 1;
                                  return (
                                    <div key={gi} className="border-r border-primary/5 last:border-r-0"
                                      style={{ gridColumnStart: startIdx, gridColumnEnd: `span ${g.slots.length}` }} />
                                  );
                                })}
                              </div>
                            </div>

                            {/* task rows */}
                            {projectTasks.map((task, taskIdx) => {
                              const range = getTaskRangePositions(task);
                              const { plannedStart, plannedEnd, actualEnd } = getTaskDates(task);
                              const util = range.plannedWidth > 0 ? Math.round((range.actualWidth / range.plannedWidth) * 100) : 0;
                              const isOverdue = task.status !== 'done' && new Date(task.deadline || task.scheduledEnd || 0) < new Date();
                              const loggedMins = loggedDurations[task.id] || 0;

                              return (
                                <motion.div
                                  key={task.id}
                                  initial={{ opacity: 0, x: -4 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: Math.min(taskIdx * 0.04, 0.3) }}
                                  className={cn(
                                    'border-b border-primary/5 last:border-b-0 group/row',
                                    'hover:bg-primary/[0.015] transition-colors',
                                    !isPanning && 'hover:z-[60] relative',
                                    (isMarqueeMode || isPanning) && 'pointer-events-none'
                                  )}
                                  style={{ height: ROW_H, display: 'grid', gridTemplateColumns: `${SIDEBAR_PX}px 1fr` }}
                                >
                                  {/* ── Label column ───────────────────── */}
                                  <div className="shrink-0 px-5 sticky left-0 bg-background/95 backdrop-blur-xl z-50 border-r border-primary/5 flex items-center">
                                    <div className="flex items-center gap-3 w-full min-w-0">
                                      {/* status icon */}
                                      <div className={cn(
                                        'shrink-0 h-9 w-9 rounded-2xl flex items-center justify-center ring-2 transition-all duration-300',
                                        task.status === 'done'
                                          ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                                          : task.status === 'in-progress'
                                            ? 'bg-blue-500/10 text-blue-400 ring-blue-500/20 animate-pulse'
                                            : cn('bg-muted/40 text-muted-foreground/40 group-hover/row:scale-105 group-hover/row:text-primary group-hover/row:bg-primary/10', priorityRing(task.priority), 'ring-offset-background ring-offset-1')
                                      )}>
                                        {task.status === 'done'
                                          ? <CheckCircle2 className="h-4 w-4" />
                                          : task.status === 'in-progress'
                                            ? <History className="h-4 w-4" />
                                            : <Target className="h-4 w-4 opacity-70 group-hover/row:opacity-100" />
                                        }
                                      </div>

                                      {/* text info */}
                                      <div className="min-w-0 flex-1">
                                        <Link
                                          href={`/tasks/${task.id}?fromView=gantt`}
                                          className="text-[11px] font-black truncate block tracking-tight group-hover/row:text-primary transition-colors"
                                        >
                                          {task.title}
                                        </Link>
                                        <div className="flex items-center gap-1.5 mt-1">
                                          {/* priority dot */}
                                          <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', priorityDot(task.priority))} />
                                          {/* mini progress */}
                                          <div className="h-1 flex-1 rounded-full bg-muted/50 overflow-hidden">
                                            <div
                                              className={cn('h-full rounded-full transition-all duration-700', util > 100 ? 'bg-red-500' : 'bg-primary/50')}
                                              style={{ width: `${Math.min(100, util)}%` }}
                                            />
                                          </div>
                                          <span className={cn('text-[8px] font-black shrink-0 tabular-nums', util > 100 ? 'text-red-400' : 'text-muted-foreground/40')}>
                                            {util}%
                                          </span>
                                          {isOverdue && (
                                            <AlertCircle className="h-2.5 w-2.5 text-red-400 shrink-0 animate-pulse" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* ── Grid column ────────────────────── */}
                                  <div className="relative group/grid"
                                    style={{ display: 'grid', gridTemplateColumns: `repeat(${timeSlots.length}, minmax(${COL_PX * zoomLevel}px, 1fr))` }}>
                                    {/* background grid cells */}
                                    {slotDayGroups.map((g, gi) => {
                                      const startIdx = timeSlots.findIndex(s => s.getTime() === g.slots[0].getTime()) + 1;
                                      return (
                                        <div key={gi} className="flex border-r border-primary/10 last:border-r-0"
                                          style={{ gridColumn: `${startIdx} / span ${g.slots.length}` }}>
                                          {g.slots.map((slot, si) => (
                                            <div
                                              key={si}
                                              className={cn('flex-1 border-r border-primary/5 last:border-r-0 transition-colors h-full',
                                                viewMode === 'day'
                                                  ? slot.getHours() === new Date().getHours() && isSameDay(slot, new Date()) ? 'bg-primary/[0.04]' : ''
                                                  : isSameDay(slot, new Date()) ? 'bg-primary/[0.02]' : ''
                                              )}
                                            />
                                          ))}
                                        </div>
                                      );
                                    })}

                                    {/* today / now line */}
                                    {isWithinInterval(new Date(), dateRange) && (
                                      <div
                                        className="absolute top-0 bottom-0 w-px bg-primary/40 z-[5] pointer-events-none"
                                        style={{
                                          left: `${Math.min(99.9, ((Date.now() - dateRange.start.getTime()) / (dateRange.end.getTime() - dateRange.start.getTime())) * 100)}%`,
                                          boxShadow: '0 0 8px rgba(var(--primary),0.3)'
                                        }}
                                      >
                                        <div className="absolute -top-0.5 -left-[3px] w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                      </div>
                                    )}

                                    {/* ── Task bar ─────────────────────── */}
                                    <div className="absolute top-1/2 -translate-y-1/2 z-20 group/bar cursor-default" style={{ left: 0, right: 0, height: ROW_H }}
                                      onMouseEnter={() => setHoveredTask({ task, loggedMins, util, plannedStart, project })}
                                      onMouseLeave={() => setHoveredTask(null)}
                                      onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}
                                    >

                                      {/* ── Layer 1: Delay zone (Deadline → Now) ── */}
                                      {range.isDelayed && range.delayWidth > 0 && (() => {
                                        const delayDays = Math.round(range.delayWidth / 100 * (dateRange.end.getTime() - dateRange.start.getTime()) / 86400000);
                                        return (
                                          <>
                                            {/* Full-height red wash behind the delay zone */}
                                            <div
                                              className="absolute top-0 bottom-0 pointer-events-none z-[1]"
                                              style={{
                                                left: `${range.deadlinePct}%`,
                                                width: `${range.delayWidth}%`,
                                                background: 'linear-gradient(90deg, rgba(239,68,68,0.18) 0%, rgba(239,68,68,0.06) 100%)',
                                              }}
                                            />
                                            {/* Solid red deadline wall */}
                                            <div
                                              className="absolute top-0 bottom-0 w-0.5 z-[2] pointer-events-none"
                                              style={{
                                                left: `${range.deadlinePct}%`,
                                                background: 'linear-gradient(180deg, rgba(239,68,68,0) 0%, rgba(239,68,68,0.9) 30%, rgba(239,68,68,0.9) 70%, rgba(239,68,68,0) 100%)',
                                              }}
                                            />
                                            {/* Connecting dashed line from deadline to "now" dot at mid-height */}
                                            <div
                                              className="absolute top-1/2 -translate-y-1/2 z-[2] pointer-events-none"
                                              style={{
                                                left: `${range.deadlinePct}%`,
                                                width: `${range.delayWidth}%`,
                                                height: 2,
                                                background: 'repeating-linear-gradient(90deg, rgba(239,68,68,0.7) 0px, rgba(239,68,68,0.7) 5px, transparent 5px, transparent 9px)',
                                              }}
                                            />
                                            {/* Floating overdue badge above the midpoint of delay zone */}
                                            <div
                                              className="absolute z-30 pointer-events-none"
                                              style={{
                                                left: `calc(${range.deadlinePct}% + ${range.delayWidth / 2}%)`,
                                                top: '50%',
                                                transform: 'translate(-50%, -220%)',
                                              }}
                                            >
                                              <div className="flex items-center gap-1 bg-red-500/90 text-white px-1.5 py-0.5 rounded-full text-[7px] font-black whitespace-nowrap shadow-lg shadow-red-500/30 backdrop-blur-sm">
                                                <div className="h-1 w-1 rounded-full bg-white animate-pulse" />
                                                +{delayDays}d overdue
                                              </div>
                                              {/* small arrow pointing down */}
                                              <div className="mx-auto w-0 h-0" style={{ borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid rgba(239,68,68,0.9)' }} />
                                            </div>
                                          </>
                                        );
                                      })()}

                                      {/* ── Layer 2: Ghost window (Start → Deadline) ── */}
                                      {range.plannedWidth > 0 && (
                                        <div
                                          className="absolute top-1/2 -translate-y-1/2 rounded-2xl border border-dashed border-primary/20 bg-primary/[0.04] pointer-events-none"
                                          style={{ left: `${range.start}%`, width: `${range.plannedWidth}%`, height: 20 }}
                                        >
                                          {/* deadline tick */}
                                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-amber-400/60 rounded-full" />
                                        </div>
                                      )}

                                      {/* ── Layer 3: Execution bar (Start → Done/Now) ── */}
                                      {range.actualWidth > 0 && (
                                        <div
                                          className={cn('absolute top-1/2 -translate-y-1/2 rounded-2xl bg-gradient-to-r overflow-hidden shadow-sm transition-all group-hover/bar:shadow-md', statusGradient(task.status))}
                                          style={{ left: `${range.start}%`, width: `${Math.min(range.actualWidth, range.plannedWidth + range.delayWidth || 100)}%`, height: 28 }}
                                        >
                                          {/* shine */}
                                          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-2xl pointer-events-none" />

                                          {/* logged-work inner fill */}
                                          {loggedMins > 0 && task.estimatedDuration && task.estimatedDuration > 0 && (
                                            <div
                                              className="absolute left-0 top-0 bottom-0 bg-white/20 rounded-l-2xl pointer-events-none"
                                              style={{ width: `${Math.min(100, (loggedMins / task.estimatedDuration) * 100)}%` }}
                                            />
                                          )}

                                          {/* overrun stripe (when past deadline) */}
                                          {range.isOverrun && (
                                            <div className="absolute right-0 top-0 bottom-0 w-6 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(239,68,68,0.4)_3px,rgba(239,68,68,0.4)_6px)] rounded-r-2xl" />
                                          )}

                                          {/* task title inside bar */}
                                          <div className="absolute inset-0 flex items-center px-2.5 overflow-hidden pointer-events-none">
                                            <span className="text-[8px] font-black text-white/85 truncate tracking-tight leading-none whitespace-nowrap opacity-0 group-hover/bar:opacity-100 transition-opacity">
                                              {task.title}
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {/* ── Hover edge labels ── */}
                                      <div className="absolute inset-0 opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none" style={{ top: -22 }}>
                                        <div
                                          className="absolute text-[8px] font-black text-primary/70 whitespace-nowrap bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-primary/10 shadow-sm"
                                          style={{ left: `${range.start}%` }}
                                        >
                                          {viewMode === 'day' ? format(plannedStart, 'HH:mm') : format(plannedStart, 'MMM d')}
                                        </div>
                                        {task.deadline && (
                                          <div
                                            className="absolute text-[8px] font-black text-amber-400/80 whitespace-nowrap bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-amber-500/20 shadow-sm"
                                            style={{ left: `${range.deadlinePct}%`, transform: 'translateX(-100%)' }}
                                          >
                                            {viewMode === 'day' ? format(new Date(task.deadline), 'HH:mm') : format(new Date(task.deadline), 'MMM d')}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}

                            {/* ── Sleep rows (only in Personal section) ────── */}
                            {projectId === '__none__' && filteredSleepEntries.length > 0 && (
                              <div className="border-t border-indigo-500/10">
                                {/* Sleep sub-header */}
                                <div
                                  className="border-b border-indigo-500/10 bg-gradient-to-r from-indigo-500/5 to-transparent"
                                  style={{ display: 'grid', gridTemplateColumns: `${SIDEBAR_PX}px 1fr`, width: contentWidth }}
                                >
                                  <div className="shrink-0 px-5 py-1.5 sticky left-0 bg-background/90 backdrop-blur-xl z-40 border-r border-indigo-500/10 flex items-center gap-2">
                                    <Moon className="h-3 w-3 text-indigo-400/70" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400/60">Sleep</span>
                                    <Badge variant="outline" className="ml-auto text-[8px] font-black border-indigo-500/20 bg-indigo-500/8 text-indigo-400/70 py-0 h-4 shrink-0">
                                      {filteredSleepEntries.length}
                                    </Badge>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${timeSlots.length}, minmax(${COL_PX * zoomLevel}px, 1fr))`, height: 24 }}>
                                    {slotDayGroups.map((g, gi) => {
                                      const startIdx = timeSlots.findIndex(s => s.getTime() === g.slots[0].getTime()) + 1;
                                      return (
                                        <div key={gi} className="border-r border-indigo-500/5 last:border-r-0"
                                          style={{ gridColumnStart: startIdx, gridColumnEnd: `span ${g.slots.length}` }} />
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Sleep entry rows */}
                                {filteredSleepEntries.map((entry, entryIdx) => {
                                  const sleepPos = getSleepBarPositions(entry);
                                  const bedtime = new Date(entry.bedtime);
                                  const wakeTime = new Date(entry.wakeTime);
                                  const h = Math.floor(entry.durationMins / 60);
                                  const m = entry.durationMins % 60;
                                  return (
                                    <motion.div
                                      key={entry.id}
                                      initial={{ opacity: 0, x: -4 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: Math.min(entryIdx * 0.04, 0.2) }}
                                      className={cn(
                                        'border-b border-indigo-500/5 last:border-b-0 group/sleeprow',
                                        'hover:bg-indigo-500/[0.02] transition-colors relative',
                                        (isMarqueeMode || isPanning) && 'pointer-events-none'
                                      )}
                                      style={{ height: ROW_H, display: 'grid', gridTemplateColumns: `${SIDEBAR_PX}px 1fr` }}
                                    >
                                      {/* Sleep label column */}
                                      <div className="shrink-0 px-5 sticky left-0 bg-background/95 backdrop-blur-xl z-50 border-r border-indigo-500/10 flex items-center">
                                        <div className="flex items-center gap-3 w-full min-w-0">
                                          <div className="shrink-0 h-9 w-9 rounded-2xl flex items-center justify-center ring-2 ring-indigo-500/20 bg-indigo-500/10 text-indigo-400 transition-all group-hover/sleeprow:ring-indigo-500/40 group-hover/sleeprow:bg-indigo-500/15">
                                            <Moon className="h-4 w-4" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <span className="text-[11px] font-black truncate block tracking-tight text-indigo-300/80 group-hover/sleeprow:text-indigo-300 transition-colors">
                                              {format(bedtime, 'MMM d')} Sleep
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-1">
                                              {/* Quality stars */}
                                              <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                  <Star key={s} className={cn('h-2 w-2', s <= entry.quality ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')} />
                                                ))}
                                              </div>
                                              <span className="text-[8px] font-black text-muted-foreground/40 tabular-nums">
                                                {h}h{m > 0 ? ` ${m}m` : ''}
                                              </span>
                                              {entry.mood && (
                                                <span className="text-[10px] leading-none">{sleepMoodEmoji(entry.mood)}</span>
                                              )}
                                            </div>
                                          </div>
                                          {/* Delete button */}
                                          <button
                                            onClick={() => deleteSleepEntry(entry.id)}
                                            className="shrink-0 h-6 w-6 rounded-lg flex items-center justify-center opacity-0 group-hover/sleeprow:opacity-100 transition-all hover:bg-red-500/10 hover:text-red-400 text-muted-foreground/30"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Sleep grid column */}
                                      <div
                                        className="relative group/sleepgrid"
                                        style={{ display: 'grid', gridTemplateColumns: `repeat(${timeSlots.length}, minmax(${COL_PX * zoomLevel}px, 1fr))` }}
                                      >
                                        {/* background grid cells */}
                                        {slotDayGroups.map((g, gi) => {
                                          const startIdx = timeSlots.findIndex(s => s.getTime() === g.slots[0].getTime()) + 1;
                                          return (
                                            <div key={gi} className="flex border-r border-primary/10 last:border-r-0"
                                              style={{ gridColumn: `${startIdx} / span ${g.slots.length}` }}>
                                              {g.slots.map((slot, si) => (
                                                <div
                                                  key={si}
                                                  className={cn('flex-1 border-r border-primary/5 last:border-r-0 h-full',
                                                    isSameDay(slot, new Date()) ? 'bg-primary/[0.02]' : ''
                                                  )}
                                                />
                                              ))}
                                            </div>
                                          );
                                        })}

                                        {/* today / now line */}
                                        {isWithinInterval(new Date(), dateRange) && (
                                          <div
                                            className="absolute top-0 bottom-0 w-px bg-primary/40 z-[5] pointer-events-none"
                                            style={{
                                              left: `${Math.min(99.9, ((Date.now() - dateRange.start.getTime()) / (dateRange.end.getTime() - dateRange.start.getTime())) * 100)}%`,
                                              boxShadow: '0 0 8px rgba(var(--primary),0.3)'
                                            }}
                                          >
                                            <div className="absolute -top-0.5 -left-[3px] w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                          </div>
                                        )}

                                        {/* ── Sleep bar ─────────────────── */}
                                        {sleepPos.width > 0 && (
                                          <div
                                            className="absolute top-1/2 -translate-y-1/2 z-20 group/sleepbar cursor-default"
                                            style={{ left: 0, right: 0, height: ROW_H }}
                                            onMouseEnter={() => { setHoveredTask(null); setHoveredSleep({ entry }); }}
                                            onMouseLeave={() => setHoveredSleep(null)}
                                            onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}
                                          >
                                            {/* Main sleep bar */}
                                            <div
                                              className="absolute top-1/2 -translate-y-1/2 rounded-2xl overflow-hidden shadow-md shadow-indigo-500/20 transition-all group-hover/sleepbar:shadow-indigo-500/40 group-hover/sleepbar:scale-y-110"
                                              style={{
                                                left: `${sleepPos.start}%`,
                                                width: `${sleepPos.width}%`,
                                                height: 28,
                                                background: 'linear-gradient(90deg, rgb(99,102,241) 0%, rgb(139,92,246) 50%, rgb(168,85,247) 100%)',
                                              }}
                                            >
                                              {/* Shimmer / stars overlay */}
                                              <div
                                                className="absolute inset-0 opacity-30 pointer-events-none shimmer"
                                                style={{
                                                  background: 'linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.3) 50%, transparent 75%)',
                                                  backgroundSize: '200% 100%',
                                                }}
                                              />
                                              {/* Top shine */}
                                              <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                                              {/* Quality star dots */}
                                              <div className="absolute inset-0 flex items-center justify-center gap-0.5 pointer-events-none">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                  <Star key={s} className={cn('h-2.5 w-2.5 opacity-0 group-hover/sleepbar:opacity-100 transition-opacity', s <= entry.quality ? 'fill-white text-white' : 'text-white/30')} />
                                                ))}
                                              </div>
                                              {/* Duration text inside bar */}
                                              <div className="absolute inset-0 flex items-center px-2.5 overflow-hidden pointer-events-none">
                                                <span className="text-[8px] font-black text-white/90 truncate tracking-tight leading-none whitespace-nowrap opacity-0 group-hover/sleepbar:opacity-100 transition-opacity">
                                                  {h}h{m > 0 ? ` ${m}m` : ''} · {sleepQualityLabel(entry.quality)}
                                                </span>
                                              </div>
                                            </div>

                                            {/* Hover edge labels */}
                                            <div className="absolute inset-0 opacity-0 group-hover/sleepbar:opacity-100 transition-opacity pointer-events-none" style={{ top: -22 }}>
                                              <div
                                                className="absolute text-[8px] font-black text-indigo-400/80 whitespace-nowrap bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-indigo-500/20 shadow-sm"
                                                style={{ left: `${sleepPos.start}%` }}
                                              >
                                                {viewMode === 'day' ? format(bedtime, 'HH:mm') : format(bedtime, 'MMM d HH:mm')}
                                              </div>
                                              <div
                                                className="absolute text-[8px] font-black text-amber-400/80 whitespace-nowrap bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-amber-500/20 shadow-sm"
                                                style={{ left: `${sleepPos.start + sleepPos.width}%`, transform: 'translateX(-100%)' }}
                                              >
                                                {viewMode === 'day' ? format(wakeTime, 'HH:mm') : format(wakeTime, 'MMM d HH:mm')}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}

                    {/* ── Standalone sleep section (when no tasks at all but sleep exists) ── */}
                    {Object.keys(tasksByProject).length === 0 && filteredSleepEntries.length > 0 && (
                      <div className="border-b border-indigo-500/10">
                        <div
                          className="border-b border-indigo-500/10 bg-gradient-to-r from-indigo-500/8 to-transparent"
                          style={{ display: 'grid', gridTemplateColumns: `${SIDEBAR_PX}px 1fr`, width: contentWidth }}
                        >
                          <div className="shrink-0 px-5 py-2.5 sticky left-0 bg-background/90 backdrop-blur-xl z-40 border-r border-indigo-500/10 flex items-center gap-2">
                            <Moon className="h-3.5 w-3.5 text-indigo-400/70" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400/60">Personal · Sleep</span>
                            <Badge variant="outline" className="ml-auto text-[8px] font-black border-indigo-500/20 bg-indigo-500/8 text-indigo-400/70 py-0 h-4 shrink-0">
                              {filteredSleepEntries.length}
                            </Badge>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${timeSlots.length}, minmax(${COL_PX * zoomLevel}px, 1fr))`, height: 32 }}>
                            {slotDayGroups.map((g, gi) => {
                              const startIdx = timeSlots.findIndex(s => s.getTime() === g.slots[0].getTime()) + 1;
                              return (
                                <div key={gi} className="border-r border-indigo-500/5 last:border-r-0"
                                  style={{ gridColumnStart: startIdx, gridColumnEnd: `span ${g.slots.length}` }} />
                              );
                            })}
                          </div>
                        </div>
                        {filteredSleepEntries.map((entry, entryIdx) => {
                          const sleepPos = getSleepBarPositions(entry);
                          const bedtime = new Date(entry.bedtime);
                          const wakeTime = new Date(entry.wakeTime);
                          const h = Math.floor(entry.durationMins / 60);
                          const m = entry.durationMins % 60;
                          return (
                            <motion.div
                              key={entry.id}
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: Math.min(entryIdx * 0.04, 0.2) }}
                              className={cn(
                                'border-b border-indigo-500/5 last:border-b-0 group/sleeprow hover:bg-indigo-500/[0.02] transition-colors relative',
                                (isMarqueeMode || isPanning) && 'pointer-events-none'
                              )}
                              style={{ height: ROW_H, display: 'grid', gridTemplateColumns: `${SIDEBAR_PX}px 1fr` }}
                            >
                              <div className="shrink-0 px-5 sticky left-0 bg-background/95 backdrop-blur-xl z-50 border-r border-indigo-500/10 flex items-center">
                                <div className="flex items-center gap-3 w-full min-w-0">
                                  <div className="shrink-0 h-9 w-9 rounded-2xl flex items-center justify-center ring-2 ring-indigo-500/20 bg-indigo-500/10 text-indigo-400">
                                    <Moon className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[11px] font-black truncate block tracking-tight text-indigo-300/80">{format(bedtime, 'MMM d')} Sleep</span>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map(s => <Star key={s} className={cn('h-2 w-2', s <= entry.quality ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')} />)}
                                      </div>
                                      <span className="text-[8px] font-black text-muted-foreground/40 tabular-nums">{h}h{m > 0 ? ` ${m}m` : ''}</span>
                                      {entry.mood && <span className="text-[10px] leading-none">{sleepMoodEmoji(entry.mood)}</span>}
                                    </div>
                                  </div>
                                  <button onClick={() => deleteSleepEntry(entry.id)} className="shrink-0 h-6 w-6 rounded-lg flex items-center justify-center opacity-0 group-hover/sleeprow:opacity-100 transition-all hover:bg-red-500/10 hover:text-red-400 text-muted-foreground/30">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="relative" style={{ display: 'grid', gridTemplateColumns: `repeat(${timeSlots.length}, minmax(${COL_PX * zoomLevel}px, 1fr))` }}>
                                {slotDayGroups.map((g, gi) => {
                                  const startIdx = timeSlots.findIndex(s => s.getTime() === g.slots[0].getTime()) + 1;
                                  return (
                                    <div key={gi} className="flex border-r border-primary/10 last:border-r-0" style={{ gridColumn: `${startIdx} / span ${g.slots.length}` }}>
                                      {g.slots.map((slot, si) => <div key={si} className="flex-1 border-r border-primary/5 last:border-r-0 h-full" />)}
                                    </div>
                                  );
                                })}
                                {sleepPos.width > 0 && (
                                  <div
                                    className="absolute top-1/2 -translate-y-1/2 z-20 group/sleepbar cursor-default"
                                    style={{ left: 0, right: 0, height: ROW_H }}
                                    onMouseEnter={() => { setHoveredTask(null); setHoveredSleep({ entry }); }}
                                    onMouseLeave={() => setHoveredSleep(null)}
                                    onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}
                                  >
                                    <div
                                      className="absolute top-1/2 -translate-y-1/2 rounded-2xl overflow-hidden shadow-md shadow-indigo-500/20 transition-all group-hover/sleepbar:shadow-indigo-500/40 z-10"
                                      style={{ left: `${sleepPos.start}%`, width: `${sleepPos.width}%`, height: 28, background: 'linear-gradient(90deg, rgb(99,102,241), rgb(139,92,246), rgb(168,85,247))' }}
                                    >
                                      <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                                      <div className="absolute inset-0 flex items-center px-2.5 pointer-events-none">
                                        <span className="text-[8px] font-black text-white/90 truncate opacity-0 group-hover/sleepbar:opacity-100 transition-opacity">{h}h{m > 0 ? ` ${m}m` : ''} · {sleepQualityLabel(entry.quality)}</span>
                                      </div>
                                    </div>
                                    <div className="absolute inset-0 opacity-0 group-hover/sleepbar:opacity-100 transition-opacity pointer-events-none" style={{ top: -22 }}>
                                      <div className="absolute text-[8px] font-black text-indigo-400/80 whitespace-nowrap bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-indigo-500/20 shadow-sm" style={{ left: `${sleepPos.start}%` }}>
                                        {format(bedtime, 'HH:mm')}
                                      </div>
                                      <div className="absolute text-[8px] font-black text-amber-400/80 whitespace-nowrap bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-amber-500/20 shadow-sm" style={{ left: `${sleepPos.start + sleepPos.width}%`, transform: 'translateX(-100%)' }}>
                                        {format(wakeTime, 'HH:mm')}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

          </div>
        </MainLayout>
      </DataLoader>

      {/* ── Sleep Log Modal ────────────────────────────────────────────── */}
      <Dialog open={showSleepModal} onOpenChange={setShowSleepModal}>
        <DialogContent className="max-w-md p-0 border-indigo-500/20 bg-background/98 backdrop-blur-3xl rounded-[2rem] shadow-[0_40px_80px_-12px_rgba(99,102,241,0.4)] overflow-hidden gap-0" showCloseButton={false}>
          {/* Header gradient strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 shrink-0" />

          <div className="p-6 space-y-5 overflow-y-auto max-h-[85vh]">
            {/* Title */}
            <DialogHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3 text-left">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                  <Moon className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black tracking-tight text-foreground">Log Sleep</DialogTitle>
                  <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/70">Recovery · Restoration</DialogDescription>
                </div>
              </div>
              <button
                onClick={() => setShowSleepModal(false)}
                className="h-8 w-8 rounded-xl flex items-center justify-center hover:bg-muted/40 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogHeader>

            {/* Bedtime & Wake fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-1.5">
                  <Moon className="h-3 w-3 text-indigo-400" /> Bedtime
                </label>
                <input
                  type="date"
                  value={sleepForm.bedtimeDate}
                  onChange={e => setSleepForm(f => ({ ...f, bedtimeDate: e.target.value }))}
                  className="w-full h-9 px-3 rounded-xl bg-muted/30 border border-primary/10 text-[11px] font-bold text-foreground focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all"
                />
                <input
                  type="time"
                  value={sleepForm.bedtimeTime}
                  onChange={e => setSleepForm(f => ({ ...f, bedtimeTime: e.target.value }))}
                  className="w-full h-9 px-3 rounded-xl bg-muted/30 border border-primary/10 text-[11px] font-bold text-foreground focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-1.5">
                  <Sunrise className="h-3 w-3 text-amber-400" /> Wake Time
                </label>
                <input
                  type="date"
                  value={sleepForm.wakeDate}
                  onChange={e => setSleepForm(f => ({ ...f, wakeDate: e.target.value }))}
                  className="w-full h-9 px-3 rounded-xl bg-muted/30 border border-primary/10 text-[11px] font-bold text-foreground focus:outline-none focus:border-amber-500/50 focus:bg-amber-500/5 transition-all"
                />
                <input
                  type="time"
                  value={sleepForm.wakeTime}
                  onChange={e => setSleepForm(f => ({ ...f, wakeTime: e.target.value }))}
                  className="w-full h-9 px-3 rounded-xl bg-muted/30 border border-primary/10 text-[11px] font-bold text-foreground focus:outline-none focus:border-amber-500/50 focus:bg-amber-500/5 transition-all"
                />
              </div>
            </div>

            {/* Duration preview */}
            {(() => {
              const bed = new Date(`${sleepForm.bedtimeDate}T${sleepForm.bedtimeTime}:00`);
              let wake = new Date(`${sleepForm.wakeDate}T${sleepForm.wakeTime}:00`);
              if (wake <= bed) wake = new Date(wake.getTime() + 86400000);
              const mins = Math.round((wake.getTime() - bed.getTime()) / 60000);
              const h = Math.floor(mins / 60); const m = mins % 60;
              const isGood = h >= 7 && h <= 9;
              return mins > 0 ? (
                <div className={cn('flex items-center justify-center gap-2 py-2.5 rounded-2xl border text-[11px] font-black',
                  isGood ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/8 border-amber-500/20 text-amber-400'
                )}>
                  <Clock className="h-3.5 w-3.5" />
                  {h}h {m}m sleep · {isGood ? '✓ Optimal range' : h < 7 ? '⚠ Under target' : '⚠ Over target'}
                </div>
              ) : null;
            })()}

            {/* Sleep quality */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Sleep Quality</label>
              <div className="flex gap-2">
                {([1, 2, 3, 4, 5] as const).map(q => (
                  <button
                    key={q}
                    onClick={() => setSleepForm(f => ({ ...f, quality: q }))}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all text-[10px] font-black',
                      sleepForm.quality === q
                        ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 scale-[1.04]'
                        : 'bg-muted/20 border-primary/5 text-muted-foreground/40 hover:border-primary/20'
                    )}
                  >
                    <Star className={cn('h-3.5 w-3.5', sleepForm.quality >= q ? 'fill-current text-amber-400' : 'text-muted-foreground/20')} />
                    {q}
                  </button>
                ))}
              </div>
              <p className="text-center text-[9px] text-indigo-400/70 font-black uppercase tracking-widest">{sleepQualityLabel(sleepForm.quality)}</p>
            </div>

            {/* Wake mood */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Wake-up Mood</label>
              <div className="flex gap-2">
                {(['great', 'good', 'okay', 'tired', 'awful'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setSleepForm(f => ({ ...f, mood: m }))}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-all',
                      sleepForm.mood === m
                        ? 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20 scale-[1.04]'
                        : 'bg-muted/10 border-transparent hover:bg-muted/30'
                    )}
                  >
                    <span className="text-base leading-none">{sleepMoodEmoji(m)}</span>
                    <span className={cn('text-[8px] font-black uppercase tracking-widest capitalize', sleepForm.mood === m ? 'text-amber-400/80' : 'text-muted-foreground/30')}>{m}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Notes (optional)</label>
              <textarea
                value={sleepForm.notes}
                onChange={e => setSleepForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Vivid dreams, woke up early..."
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-primary/10 text-[11px] font-medium text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowSleepModal(false)}
                className="flex-1 h-11 rounded-2xl border border-primary/10 bg-muted/20 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted/40 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSleep}
                disabled={sleepSaving}
                className="flex-1 h-11 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sleepSaving ? (
                  <><div className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><Moon className="h-3.5 w-3.5" /> Log Sleep</>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Cursor-following task hover card (portal) ──────────────── */}
      {mounted && hoveredTask && createPortal(
        (() => {
          const { task, loggedMins, util, plannedStart, project } = hoveredTask;
          const CARD_W = 320;
          const CARD_H = 340;
          const GAP = 18;
          const vpW = window.innerWidth;
          const vpH = window.innerHeight;
          const left = mousePos.x + CARD_W + GAP > vpW ? mousePos.x - CARD_W - GAP : mousePos.x + GAP;
          const top = mousePos.y + CARD_H + GAP > vpH ? mousePos.y - CARD_H - GAP : mousePos.y + GAP;
          return (
            <div
              className="fixed z-[9999] pointer-events-none"
              style={{ left, top, width: CARD_W }}
            >
              <div className="bg-background/98 backdrop-blur-2xl border border-primary/20 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.7)] rounded-[2rem] overflow-hidden text-foreground">
                {/* status gradient strip */}
                <div className={cn('h-1.5 w-full bg-gradient-to-r', statusGradient(task.status))} />
                <div className="p-5 space-y-4">
                  {/* Header */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">
                        {project?.name || 'Private Task'}
                      </span>
                      <Badge variant="outline" className={cn('text-[8px] font-black uppercase py-0 px-2 h-4 border-none bg-primary/10', task.status === 'done' ? 'text-emerald-400' : 'text-primary')}>
                        {task.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-black tracking-tight leading-snug text-foreground">{task.title}</h4>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="space-y-3">
                      {/* Created */}
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-1 rounded-md bg-muted/40 border border-primary/5">
                          <Plus className="h-3 w-3 text-violet-400/70" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Created</p>
                          <p className="text-[10px] font-black text-foreground/90">{format(new Date(task.createdAt), 'MMM d, HH:mm')}</p>
                        </div>
                      </div>
                      {/* Scheduled Start */}
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-1 rounded-md bg-muted/40 border border-primary/5">
                          <CalendarIcon className="h-3 w-3 text-primary/70" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Schedule</p>
                          <p className="text-[10px] font-black text-foreground/90">{format(plannedStart, 'MMM d, HH:mm')}</p>
                        </div>
                      </div>
                      {/* Closed date (only if done) */}
                      {task.status === 'done' && (task.lastStatusChange || task.updatedAt) && (
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 p-1 rounded-md bg-emerald-500/10 border border-emerald-500/10">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400/80" />
                          </div>
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Closed</p>
                            <p className="text-[10px] font-black text-emerald-400">
                              {format(new Date(task.lastStatusChange ?? task.updatedAt), 'MMM d, HH:mm')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Deadline */}
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-1 rounded-md bg-muted/40 border border-primary/5">
                          <Target className="h-3 w-3 text-amber-500/70" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Deadline</p>
                          <p className="text-[10px] font-black text-foreground/90">{task.deadline ? format(new Date(task.deadline), 'MMM d, HH:mm') : 'None Set'}</p>
                        </div>
                      </div>
                      {/* Estimated */}
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-1 rounded-md bg-muted/40 border border-primary/5">
                          <Clock className="h-3 w-3 text-blue-400/70" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Estimated</p>
                          <p className="text-[10px] font-black text-foreground/90">{formatMin(task.estimatedDuration || 0)}</p>
                        </div>
                      </div>
                      {/* Logged */}
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-1 rounded-md bg-muted/40 border border-primary/5">
                          <History className="h-3 w-3 text-emerald-400/70" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Logged</p>
                          <p className="text-[10px] font-black text-foreground/90">{formatMin(loggedMins)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Efficiency progress */}
                  <div className="pt-2 border-t border-primary/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-1.5">
                        <TrendingUp className="h-3 w-3 text-primary/40" />
                        Efficiency Load
                      </span>
                      <span className={cn('text-[10px] font-bold tabular-nums', util > 100 ? 'text-red-400' : 'text-foreground')}>
                        {util}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/40 border border-primary/5 overflow-hidden p-0.5">
                      <div
                        className={cn('h-full rounded-full transition-all', util > 100 ? 'bg-red-500' : 'bg-gradient-to-r from-primary/50 to-primary')}
                        style={{ width: `${Math.min(100, util)}%` }}
                      />
                    </div>
                    {util > 100 && (
                      <p className="text-[8px] font-black text-red-400/80 uppercase tracking-widest mt-2 flex items-center gap-1">
                        <AlertCircle className="h-2.5 w-2.5" />
                        Capacity Overrun Detected
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()
        , document.body)}

      {/* ── Cursor-following sleep hover card (portal) ────────────── */}
      {mounted && hoveredSleep && createPortal(
        (() => {
          const { entry } = hoveredSleep;
          const CARD_W = 280;
          const CARD_H = 300;
          const GAP = 18;
          const vpW = window.innerWidth;
          const vpH = window.innerHeight;
          const left = mousePos.x + CARD_W + GAP > vpW ? mousePos.x - CARD_W - GAP : mousePos.x + GAP;
          const top = mousePos.y + CARD_H + GAP > vpH ? mousePos.y - CARD_H - GAP : mousePos.y + GAP;
          const h = Math.floor(entry.durationMins / 60);
          const m = entry.durationMins % 60;

          return (
            <div
              className="fixed z-[9999] pointer-events-none"
              style={{ left, top, width: CARD_W }}
            >
              <div className="bg-background/98 backdrop-blur-3xl border border-indigo-500/20 shadow-[0_32px_64px_-12px_rgba(99,102,241,0.4)] rounded-[2rem] overflow-hidden text-foreground">
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/60 flex items-center gap-1.5">
                      <Moon className="h-3 w-3" /> Recovery Session
                    </span>
                    {entry.mood && <span className="text-base">{sleepMoodEmoji(entry.mood)}</span>}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-black tracking-tight leading-snug text-foreground">
                      Sleep Quality: {sleepQualityLabel(entry.quality)}
                    </h4>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={cn('h-3 w-3', s <= entry.quality ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')} />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-1 rounded-md bg-indigo-500/10 border border-indigo-500/10">
                          <Moon className="h-3 w-3 text-indigo-400/80" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Bedtime</p>
                          <p className="text-[10px] font-black text-foreground/90">{format(new Date(entry.bedtime), 'HH:mm')}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-1 rounded-md bg-amber-500/10 border border-amber-500/10">
                          <Sunrise className="h-3 w-3 text-amber-500/80" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Woke up</p>
                          <p className="text-[10px] font-black text-foreground/90">{format(new Date(entry.wakeTime), 'HH:mm')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-1 rounded-md bg-violet-500/10 border border-violet-500/10">
                          <Clock className="h-3 w-3 text-violet-400/80" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Duration</p>
                          <p className="text-[10px] font-black text-foreground/90">{h}h {m}m</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-1 rounded-md bg-muted/40 border border-primary/5">
                          <Star className="h-3 w-3 text-muted-foreground/50" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1">Date</p>
                          <p className="text-[10px] font-black text-foreground/90">{format(new Date(entry.wakeTime), 'MMM d')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {entry.notes && (
                    <div className="pt-3 border-t border-primary/5">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1.5 flex items-center gap-1.5">
                        <Plus className="h-3 w-3" /> Dreams & Notes
                      </p>
                      <p className="text-[10px] leading-relaxed text-muted-foreground italic">&ldquo;{entry.notes}&rdquo;</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()
        , document.body)}

    </ProtectedRoute>
  );
}
