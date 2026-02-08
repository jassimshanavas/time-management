'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Task, Goal, TimeEntry } from '@/types';
import { format, startOfDay, endOfDay, addHours, isSameDay, isBefore, isAfter, parseISO, differenceInMinutes, addMinutes } from 'date-fns';
import { Clock, CheckCircle2, Circle, AlertCircle, ChevronDown, ChevronRight, Filter, Target, TrendingUp, Zap, History, ZoomIn, ZoomOut, RotateCcw, Minimize2, Maximize2, Camera } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, List as ListIcon, Search, Settings2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimelineCalendarSelector } from '@/components/timeline-calendar-selector';

interface TaskGanttTimelineProps {
  tasks: Task[];
  goals: Goal[];
  timeEntries?: TimeEntry[];
  selectedDate: Date;
  onDateChange?: (date: Date) => void;
  isProjectView?: boolean;
}

interface GroupedTasks {
  goalId: string | null;
  goalTitle: string;
  goalColor: string;
  tasks: Task[];
  totalDuration: number;
  completedDuration: number;
  progress: number;
}

const ROW_HEADER_HEIGHT = 80;
const ROW_HEADER_EXPANDED_HEIGHT = 180;
const TASK_SUB_ROW_HEIGHT = 60;

export function TaskGanttTimeline({ tasks, goals, timeEntries = [], selectedDate, onDateChange, isProjectView = false }: TaskGanttTimelineProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set(['ungrouped', ...goals.map(g => g.id)]));
  const [filters, setFilters] = useState({
    goalId: 'all',
    status: 'all',
    priority: 'all',
    search: '',
    tags: 'all',
    viewMode: 'goals' as 'goals' | 'tasks',
    showStats: true,
    showFilters: false,
  });

  const [zoomLevel, setZoomLevel] = useState(1);
  const [isZoomMarqueeMode, setIsZoomMarqueeMode] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [isModalExpanded, setIsModalExpanded] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);



  // Generate time slots (24 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const time = addHours(startOfDay(selectedDate), i);
    return {
      hour: i,
      time,
      label: format(time, 'HH:mm')
    };
  });

  // Filter tasks for selected date (including range overlap)
  const dayTasks = tasks
    .filter(task => {
      const rangeStart = task.scheduledStart || task.createdAt;
      const rangeEnd = task.deadline || task.scheduledEnd || rangeStart;

      if (!rangeStart || !rangeEnd) return false;

      const rS = typeof rangeStart === 'string' ? parseISO(rangeStart) : rangeStart;
      const rE = typeof rangeEnd === 'string' ? parseISO(rangeEnd) : rangeEnd;

      const viewStart = startOfDay(selectedDate);
      const viewEnd = endOfDay(selectedDate);

      // Check if task range overlaps with selected date
      const isWithinRange = !isAfter(rS, viewEnd) && !isBefore(rE, viewStart);

      if (!isWithinRange) return false;

      // Apply filters
      if (filters.goalId !== 'all' && task.goalId !== filters.goalId) return false;
      if (filters.status !== 'all' && task.status !== filters.status) return false;
      if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const goalTitle = task.goalId ? goals.find(g => String(g.id) === String(task.goalId))?.title.toLowerCase() : '';
        const matchesTask = task.title.toLowerCase().includes(query) || (task.description || '').toLowerCase().includes(query);
        const matchesGoal = goalTitle?.includes(query);
        if (!matchesTask && !matchesGoal) return false;
      }
      if (filters.tags !== 'all' && !task.tags?.includes(filters.tags)) return false;

      return true;
    })
    .sort((a, b) => {
      const dateA = a.scheduledStart || a.deadline;
      const dateB = b.scheduledStart || b.deadline;
      if (!dateA || !dateB) return 0;
      const timeA = typeof dateA === 'string' ? parseISO(dateA) : dateA;
      const timeB = typeof dateB === 'string' ? parseISO(dateB) : dateB;
      return timeA.getTime() - timeB.getTime();
    });

  // Sync expanded goals when goals or tasks change
  useEffect(() => {
    setExpandedGoals(prev => {
      const next = new Set(prev);
      next.add('ungrouped');
      // Add any new goal IDs that have tasks today
      dayTasks.forEach(t => {
        if (t.goalId) next.add(t.goalId);
      });
      return next;
    });
  }, [dayTasks.length]); // Re-run when day tasks change

  // Group tasks if enabled, otherwise create a single flat group
  const groupedTasks: GroupedTasks[] = [];

  if (filters.viewMode === 'goals') {
    // Add ungrouped tasks (tasks with no goal or a goal that isn't in our current view)
    const ungroupedTasks = dayTasks.filter(t => !t.goalId || !goals.some(g => String(g.id) === String(t.goalId)));
    if (ungroupedTasks.length > 0) {
      const totalDuration = ungroupedTasks.reduce((sum, t) => sum + (t.estimatedDuration || 60), 0);
      const completedDuration = ungroupedTasks
        .filter(t => t.status === 'done')
        .reduce((sum, t) => sum + (t.estimatedDuration || 60), 0);

      groupedTasks.push({
        goalId: null,
        goalTitle: 'Ungrouped Tasks',
        goalColor: '#64748b',
        tasks: ungroupedTasks,
        totalDuration,
        completedDuration,
        progress: totalDuration > 0 ? (completedDuration / totalDuration) * 100 : 0,
      });
    }

    // Add tasks grouped by goal
    goals.forEach(goal => {
      const goalTasks = dayTasks.filter(t => String(t.goalId) === String(goal.id));
      if (goalTasks.length > 0) {
        const totalDuration = goalTasks.reduce((sum, t) => sum + (t.estimatedDuration || 60), 0);
        const completedDuration = goalTasks
          .filter(t => t.status === 'done')
          .reduce((sum, t) => sum + (t.estimatedDuration || 60), 0);

        groupedTasks.push({
          goalId: goal.id,
          goalTitle: goal.title,
          goalColor: goal.color || getGoalColor(goal.id),
          tasks: goalTasks,
          totalDuration,
          completedDuration,
          progress: totalDuration > 0 ? (completedDuration / totalDuration) * 100 : 0,
        });
      }
    });
  } else {
    // Each task gets its own row for the Gantt view in "Tasks" mode
    dayTasks.forEach((task) => {
      groupedTasks.push({
        goalId: task.id,
        goalTitle: task.title,
        goalColor: task.goalId ? (goals.find(g => g.id === task.goalId)?.color || getGoalColor(task.goalId)) : '#64748b',
        tasks: [task],
        totalDuration: task.estimatedDuration || 60,
        completedDuration: task.status === 'done' ? (task.estimatedDuration || 60) : 0,
        progress: task.status === 'done' ? 100 : (task.status === 'in-progress' ? 50 : 0)
      });
    });
  }

  // Calculate Global Timeline Stats
  const totalTasks = dayTasks.length;
  const completedTasks = dayTasks.filter(t => t.status === 'done').length;
  const totalDayDuration = dayTasks.reduce((sum, t) => sum + (t.estimatedDuration || 60), 0);
  const completedDayDuration = dayTasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.estimatedDuration || 60), 0);
  const globalProgress = totalDayDuration > 0 ? (completedDayDuration / totalDayDuration) * 100 : 0;

  // Get task position and height based on time
  const getTaskStyle = (task: Task) => {
    const taskDate = task.scheduledStart || task.deadline;
    if (!taskDate) return { top: 0, height: 60, left: 0, width: 100 };

    const date = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // Each hour slot is 80px, calculate position
    const top = (hours * 80) + (minutes / 60 * 80);

    // Calculate width based on duration
    let height = 60;
    if (task.estimatedDuration) {
      height = Math.max(40, (task.estimatedDuration / 60) * 80);
    } else if (task.scheduledEnd) {
      const endDate = typeof task.scheduledEnd === 'string' ? parseISO(task.scheduledEnd) : task.scheduledEnd;
      const durationMinutes = (endDate.getTime() - date.getTime()) / 60000;
      height = Math.max(40, (durationMinutes / 60) * 80);
    }

    return { top, height };
  };

  // Get current time indicator position
  const getCurrentTimePosition = () => {
    if (!isSameDay(currentTime, selectedDate)) return null;
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return (hours * 60) + minutes;
  };

  const currentTimePosition = getCurrentTimePosition();

  // Toggle goal expansion
  const toggleGoal = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  // Get goal color
  function getGoalColor(goalId: string): string {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
    const index = goals.findIndex(g => g.id === goalId);
    return colors[index % colors.length];
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'in-progress':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default:
        return 'text-muted-foreground bg-muted/50 border-primary/5';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50';
    }
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Get all unique tags
  const allTags = Array.from(new Set(tasks.flatMap(t => t.tags || []))).sort();

  return (
    <div className="space-y-4">
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
            rgba(245, 158, 11, 0.25) 0px,
            rgba(245, 158, 11, 0.25) 1px,
            transparent 1px,
            transparent 5px
          );
          background-size: 8px 8px;
        }
      `}} />
      {/* Premium Header with View Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl bg-background/40 backdrop-blur-xl border border-primary/10 shadow-2xl">
        <div className="flex items-center gap-4">
          <Tabs
            value={filters.viewMode}
            onValueChange={(v) => setFilters({ ...filters, viewMode: v as any })}
            className="w-auto"
          >
            <TabsList className="bg-muted/30 p-1 rounded-2xl border border-primary/5">
              <TabsTrigger
                value="goals"
                className="rounded-xl px-5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
              >
                <Target className="h-3.5 w-3.5 mr-2" />
                Goals
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                className="rounded-xl px-5 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
              >
                <ListIcon className="h-3.5 w-3.5 mr-2" />
                Tasks
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="h-6 w-px bg-primary/10 hidden sm:block" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ ...filters, showFilters: !filters.showFilters })}
            className={cn(
              "rounded-xl font-black text-[9px] uppercase tracking-widest px-4 h-9 transition-all",
              filters.showFilters ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-primary/5"
            )}
          >
            <Settings2 className="h-3.5 w-3.5 mr-2" />
            Filters {filters.showFilters ? 'Active' : ''}
          </Button>
        </div>

        {/* Calendar Date Selector */}
        <TimelineCalendarSelector
          selectedDate={selectedDate}
          onDateChange={onDateChange || (() => { })}
          tasks={tasks}
          goals={goals}
        />

        <div className="flex items-center gap-3">
          {/* Zoom Controls */}
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
              {zoomLevel.toPrecision(2)}x
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
            <div className="w-px h-4 bg-primary/10 mx-0.5" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10"
              onClick={() => {
                setZoomLevel(1);
                if (timelineRef.current) {
                  timelineRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                }
              }}
              title="Reset View (1x)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button
            variant={isZoomMarqueeMode ? "default" : "ghost"}
            size="icon"
            className={cn(
              "h-9 w-9 rounded-xl transition-all",
              isZoomMarqueeMode ? "bg-primary shadow-lg shadow-primary/20" : "bg-muted/30 border border-primary/5 hover:bg-primary/5"
            )}
            onClick={() => setIsZoomMarqueeMode(!isZoomMarqueeMode)}
            title={isZoomMarqueeMode ? "Disable Zoom Tool" : "Zoom to Selection"}
          >
            <Search className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-primary/10 hidden sm:block mx-1" />

          <div className="flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-muted/20 border border-primary/5">
            <BarChart3 className="h-3 w-3 text-primary" />
            <Checkbox
              id="showStats"
              checked={filters.showStats}
              onCheckedChange={(checked) => setFilters({ ...filters, showStats: !!checked })}
              className="rounded-md"
            />
            <label htmlFor="showStats" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer">
              Stats
            </label>
          </div>
        </div>
      </div>

      {/* Premium Global Summary Stats */}
      <AnimatePresence>
        {filters.showStats && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {[
              { label: 'Total Syncs', value: totalTasks, icon: LayoutGrid, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Neural Load', value: formatDuration(totalDayDuration), icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
              { label: 'Executed', value: formatDuration(completedDayDuration), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'Sync Rate', value: `${Math.round(globalProgress)}%`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col p-4 rounded-3xl bg-background/40 backdrop-blur-md border border-primary/5 shadow-lg group hover:border-primary/20 transition-all">
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn("p-2 rounded-xl", stat.bg)}>
                    <stat.icon className={cn("h-3.5 w-3.5", stat.color)} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{stat.label}</span>
                </div>
                <div className="text-xl font-black tracking-tighter group-hover:text-primary transition-colors">{stat.value}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsible Expanded Filters */}
      <AnimatePresence>
        {filters.showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="bg-background/20 backdrop-blur-md border-primary/10 rounded-3xl overflow-hidden mt-2">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Execution Nexus</label>
                    <Select value={filters.goalId} onValueChange={(value) => setFilters({ ...filters, goalId: value })}>
                      <SelectTrigger className="h-10 rounded-xl bg-background/40 border-primary/5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-primary/10">
                        <SelectItem value="all">Global Reach</SelectItem>
                        {goals.map(goal => (
                          <SelectItem key={goal.id} value={goal.id}>{goal.title}</SelectItem>
                        ))}
                        <SelectItem value="ungrouped">Standalone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Status Phase</label>
                    <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                      <SelectTrigger className="h-10 rounded-xl bg-background/40 border-primary/5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-primary/10">
                        <SelectItem value="all">Entire Spectrum</SelectItem>
                        <SelectItem value="todo">Pending</SelectItem>
                        <SelectItem value="in-progress">Active</SelectItem>
                        <SelectItem value="done">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Priority Level</label>
                    <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value })}>
                      <SelectTrigger className="h-10 rounded-xl bg-background/40 border-primary/5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-primary/10">
                        <SelectItem value="all">Any Impact</SelectItem>
                        <SelectItem value="high">Critical</SelectItem>
                        <SelectItem value="medium">Standard</SelectItem>
                        <SelectItem value="low">Minor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Neural Search</label>
                    <div className="relative">
                      <Input
                        placeholder="Scan archives..."
                        value={filters.search}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, search: e.target.value })}
                        className="pl-9 h-10 rounded-xl bg-background/40 border-primary/5 placeholder:text-muted-foreground/40 placeholder:font-bold"
                      />
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/40" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gantt Timeline */}
      <Card className="overflow-hidden bg-background/40 backdrop-blur-xl border-primary/10 rounded-[2rem] shadow-2xl">
        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row overflow-y-auto custom-scrollbar scroll-smooth" style={{ height: '650px' }}>
            {/* Unified Vertical Scroll Container */}
            <div className="flex-1 flex flex-col lg:flex-row relative">
              {/* Left sidebar - Hierarchy */}
              <div className="w-full lg:w-80 bg-muted/20 border-r border-primary/5 flex-shrink-0 z-30">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={filters.viewMode}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    {/* Header Spacer to align with timeline header */}
                    <div className="sticky top-0 h-[58px] border-b border-primary/5 bg-muted/20 z-40" />

                    {groupedTasks.map((group) => {
                      const isExpanded = expandedGoals.has(group.goalId || 'ungrouped') || filters.viewMode === 'tasks';
                      const groupId = group.goalId || 'ungrouped';

                      return (
                        <div key={groupId} className="border-b border-primary/5 group/row">
                          {/* Row Header */}
                          <div
                            className={cn(
                              "px-5 cursor-pointer transition-all duration-300 hover:bg-primary/5 flex flex-col justify-center",
                              filters.viewMode === 'tasks' ? "h-[80px]" : (isExpanded ? "h-[180px]" : "h-[80px]")
                            )}
                            onClick={() => filters.viewMode === 'goals' && toggleGoal(groupId)}
                          >
                            <div className="flex items-start gap-4">
                              {filters.viewMode === 'goals' && (
                                <div className="h-6 w-6 mt-1 flex items-center justify-center rounded-lg bg-primary/5 text-primary group-hover:scale-110 transition-transform">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <div
                                    className="w-2.5 h-2.5 rounded-full ring-4 ring-offset-2 ring-offset-background"
                                    style={{ backgroundColor: group.goalColor, ringColor: `${group.goalColor}30` } as any}
                                  />
                                  <h3 className={cn(
                                    "font-bold truncate tracking-tight mb-1",
                                    filters.viewMode === 'tasks' ? "text-sm" : "text-base"
                                  )}>
                                    {group.goalTitle}
                                  </h3>
                                  {filters.viewMode === 'goals' && (
                                    <Badge className="bg-primary/10 text-primary border-none text-[10px] h-5 rounded-md px-2">
                                      {group.tasks.length}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  {isExpanded && filters.viewMode === 'goals' && (
                                    <div className="space-y-3 w-full">
                                      <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                          <span className="flex items-center gap-1">
                                            <Clock className="h-2.5 w-2.5" /> Total
                                          </span>
                                          <span>{formatDuration(group.totalDuration)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                                          <span className="flex items-center gap-1">
                                            <CheckCircle2 className="h-2.5 w-2.5" /> Executed
                                          </span>
                                          <span>{formatDuration(group.completedDuration)}</span>
                                        </div>
                                      </div>
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Progress Vector</span>
                                          <span className="text-[10px] font-black text-primary">{Math.round(group.progress)}%</span>
                                        </div>
                                        <div className="w-full bg-primary/5 rounded-full h-1.5 overflow-hidden">
                                          <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${group.progress}%` }}
                                            className="bg-gradient-to-r from-primary via-primary/80 to-emerald-500 h-full rounded-full shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {!isExpanded && filters.viewMode === 'goals' && (
                                    <div className="flex items-center gap-2">
                                      <div className="flex -space-x-2">
                                        {group.tasks.slice(0, 3).map((t, i) => (
                                          <div
                                            key={t.id}
                                            className="w-4 h-4 rounded-full border border-background shadow-sm"
                                            style={{ backgroundColor: group.goalColor, opacity: 1 - (i * 0.2) }}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">
                                        {formatDuration(group.totalDuration)}
                                      </span>
                                    </div>
                                  )}
                                  {filters.viewMode === 'tasks' && group.tasks[0] && (
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className={cn(
                                        "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border-none shadow-sm",
                                        getStatusColor(group.tasks[0].status)
                                      )}>
                                        {group.tasks[0].status}
                                      </Badge>
                                      <Badge variant="outline" className={cn(
                                        "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border-none shadow-sm",
                                        getPriorityColor(group.tasks[0].priority)
                                      )}>
                                        {group.tasks[0].priority}
                                      </Badge>
                                      <span className="text-[9px] font-bold ml-auto opacity-40 uppercase tracking-tighter">{formatDuration(group.totalDuration)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Tasks under goal (Only in Goals View) */}
                          {isExpanded && filters.viewMode === 'goals' && (
                            <div className="bg-primary/5 backdrop-blur-sm border-t border-primary/5">
                              {group.tasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="px-5 h-[60px] flex items-center hover:bg-background/80 transition-all duration-300 cursor-pointer border-b border-white/5 group/item"
                                  onClick={() => {
                                    const params = new URLSearchParams();
                                    params.set('fromView', 'timeline');
                                    if (isProjectView && task.projectId && task.projectId !== 'undefined') {
                                      params.set('fromProject', task.projectId);
                                    }
                                    params.set('fromTab', 'tasks');
                                    params.set('date', format(selectedDate, 'yyyy-MM-dd'));
                                    router.push(`/tasks/${task.id}?${params.toString()}`);
                                  }}
                                >
                                  <div className="flex items-center gap-4 ml-6">
                                    <div className={cn(
                                      "h-2 w-2 rounded-full",
                                      task.status === 'done' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                                        task.status === 'in-progress' ? "bg-blue-500 animate-pulse" : "bg-muted-foreground/40"
                                    )} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold truncate group-hover/item:text-primary transition-colors tracking-tight">{task.title}</p>
                                      <div className="flex items-center gap-2 mt-0.5 opacity-60">
                                        <span className="text-[10px] font-black uppercase tracking-tighter">
                                          {(() => {
                                            const taskDate = task.scheduledStart || task.deadline;
                                            if (!taskDate) return 'Sync Undefined';
                                            const date = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
                                            return format(date, 'HH:mm');
                                          })()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>

                {groupedTasks.length === 0 && (
                  <div className="p-20 text-center opacity-20 grayscale">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4" />
                    <p className="font-black text-[10px] uppercase tracking-widest italic">Zero Vectors Found</p>
                  </div>
                )}
              </div>

              {/* Right side - Dynamic Timeline Matrix */}
              <div
                ref={timelineRef}
                className={cn(
                  "flex-1 relative bg-background/5 overflow-x-auto custom-scrollbar select-none scroll-smooth transition-all duration-300",
                  isZoomMarqueeMode ? "cursor-zoom-in bg-primary/5" : "cursor-grab active:cursor-grabbing"
                )}
                style={{
                  height: `${58 + groupedTasks.reduce((total, group) => {
                    const isExpanded = expandedGoals.has(group.goalId || 'ungrouped') || filters.viewMode === 'tasks';
                    if (!isExpanded && filters.viewMode === 'goals') return total + ROW_HEADER_HEIGHT;
                    const headerHeight = filters.viewMode === 'tasks' ? ROW_HEADER_HEIGHT : ROW_HEADER_EXPANDED_HEIGHT;
                    const tasksHeight = filters.viewMode === 'goals' ? (group.tasks.length * TASK_SUB_ROW_HEIGHT) : 0;
                    return total + headerHeight + tasksHeight;
                  }, 0)}px`
                }}
                onMouseDown={(e) => {
                  if (isZoomMarqueeMode) {
                    const rect = timelineRef.current!.getBoundingClientRect();
                    const x = (e.clientX - rect.left + timelineRef.current!.scrollLeft);
                    const hour = (x / (24 * 80 * zoomLevel)) * 24;
                    setIsSelecting(true);
                    setSelectionRange({ start: hour, end: hour });

                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const moveX = (moveEvent.clientX - rect.left + timelineRef.current!.scrollLeft);
                      const moveHour = Math.max(0, Math.min(24, (moveX / (24 * 80 * zoomLevel)) * 24));
                      setSelectionRange(prev => prev ? { ...prev, end: moveHour } : null);
                    };

                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                      setIsSelecting(false);
                      setSelectionRange(currentRange => {
                        if (currentRange && Math.abs(currentRange.start - currentRange.end) > 0.05) {
                          const startHour = Math.min(currentRange.start, currentRange.end);
                          const endHour = Math.max(currentRange.start, currentRange.end);
                          const durationHours = endHour - startHour;
                          const targetZoom = Math.min(20, Math.max(1, 24 / durationHours));
                          setZoomLevel(targetZoom);

                          setTimeout(() => {
                            if (timelineRef.current) {
                              const containerWidth = timelineRef.current.clientWidth;
                              const totalWidth = 24 * 80 * targetZoom;
                              const centerHour = (startHour + endHour) / 2;
                              const scrollTarget = (centerHour / 24) * totalWidth - containerWidth / 2;
                              timelineRef.current.scrollTo({ left: scrollTarget, behavior: 'smooth' });
                            }
                          }, 50);
                        }
                        return null;
                      });
                      setIsZoomMarqueeMode(false);
                    };
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                    return;
                  }

                  if (!timelineRef.current) return;
                  const scrollContainer = timelineRef.current;
                  const startX = e.pageX - scrollContainer.offsetLeft;
                  const scrollLeft = scrollContainer.scrollLeft;

                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const x = moveEvent.pageX - scrollContainer.offsetLeft;
                    const walk = (x - startX) * 1.5;
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
                  {/* Selection Overlay */}
                  {isSelecting && selectionRange && (
                    <div
                      className="absolute inset-y-0 bg-primary/10 border-x border-primary z-50 pointer-events-none"
                      style={{
                        left: `${(Math.min(selectionRange.start, selectionRange.end) / 24) * 100}%`,
                        width: `${(Math.abs(selectionRange.end - selectionRange.start) / 24) * 100}%`
                      }}
                    />
                  )}

                  {/* Time Oracle Header */}
                  <div className="sticky top-0 z-40 bg-background/60 backdrop-blur-xl border-b border-primary/5 flex shadow-xl shadow-background/20">
                    {Array.from({ length: 25 }).map((_, hour) => (
                      <div
                        key={hour}
                        className="flex-1 min-w-[30px] border-r border-primary/5 p-4 text-center group/slot relative"
                        style={{ flex: `0 0 ${100 / 24}%` }}
                      >
                        <span className="text-[10px] font-black text-muted-foreground/60 group-hover/slot:text-primary transition-colors uppercase tracking-widest">
                          {hour.toString().padStart(2, '0')}:00
                        </span>
                        {/* Dynamic Markers for Zoomed View */}
                        {zoomLevel >= 3 && (
                          <div className="absolute left-1/2 top-full w-px h-2 bg-primary/20" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Matrix Core */}
                  <div className="relative" style={{
                    minHeight: `${groupedTasks.reduce((total, group) => {
                      const isExpanded = expandedGoals.has(group.goalId || 'ungrouped') || filters.viewMode === 'tasks';
                      if (!isExpanded && filters.viewMode === 'goals') return total + ROW_HEADER_HEIGHT;
                      const headerHeight = filters.viewMode === 'tasks' ? ROW_HEADER_HEIGHT : ROW_HEADER_EXPANDED_HEIGHT;
                      const tasksHeight = filters.viewMode === 'goals' ? (group.tasks.length * TASK_SUB_ROW_HEIGHT) : 0;
                      return total + headerHeight + tasksHeight;
                    }, 0)}px`
                  }}>
                    {/* Visual Grid - Elevated to be visible inside blocks */}
                    <div className="flex absolute inset-0 pointer-events-none z-40" style={{ height: '100%' }}>
                      {Array.from({ length: 24 }).map((_, hour) => (
                        <div
                          key={hour}
                          className="flex-1 border-r border-primary/5 h-full"
                          style={{ flex: `0 0 ${100 / 24}%` }}>
                          {zoomLevel >= 4 && (
                            <div className="h-full w-px bg-primary/5 mx-auto" style={{ marginLeft: '50%' }} />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Current Momentum Beam (Glowing Vertical Halo) */}
                    {currentTimePosition !== null && (
                      <div
                        className="absolute top-0 bottom-0 z-50 pointer-events-none flex"
                        style={{ left: `${(currentTimePosition / (24 * 60)) * 100}%` }}
                      >
                        <div className="absolute top-0 bottom-0 right-[100%] w-[60px] bg-gradient-to-r from-transparent to-primary/10" />
                        <motion.div
                          animate={{
                            opacity: [0.4, 0.8, 0.4],
                            boxShadow: [
                              "0 0 8px rgba(255,255,255,0.2)",
                              "0 0 15px rgba(255,255,255,0.4)",
                              "0 0 8px rgba(255,255,255,0.2)"
                            ]
                          }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          className="h-full w-[1px] bg-white/60 relative z-10"
                        >
                          <div className="absolute top-0 -left-[2px] w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_#fff]" />
                          <div className="absolute bottom-4 -left-10 px-2.5 py-0.5 bg-background/80 backdrop-blur-md text-primary text-[7px] font-black uppercase tracking-[0.2em] rounded-full border border-primary/20 flex items-center gap-1.5 whitespace-nowrap opacity-60">
                            <div className="w-1 h-1 rounded-full bg-primary animate-ping" />
                            NOW
                          </div>
                        </motion.div>
                      </div>
                    )}

                    {/* Synchronized Vector Bars */}
                    <div className="relative">
                      {groupedTasks.map((group, groupIndex) => {
                        const isExpanded = expandedGoals.has(group.goalId || 'ungrouped') || filters.viewMode === 'tasks';
                        if (!isExpanded && filters.viewMode === 'goals') {
                          return (
                            <div key={group.goalId || `group-${groupIndex}`} className="relative border-b border-primary/5" style={{ height: `${ROW_HEADER_HEIGHT}px` }}>
                              {/* Empty space for collapsed goal */}
                            </div>
                          );
                        }

                        const headerHeight = filters.viewMode === 'tasks' ? ROW_HEADER_HEIGHT : ROW_HEADER_EXPANDED_HEIGHT;
                        const tasksHeight = filters.viewMode === 'goals' ? (group.tasks.length * TASK_SUB_ROW_HEIGHT) : 0;
                        const totalHeight = headerHeight + tasksHeight;

                        return (
                          <div key={group.goalId || `group-${groupIndex}`} className="relative border-b border-primary/5" style={{ height: `${totalHeight}px` }}>
                            {group.tasks.map((task, taskIndex) => {
                              const taskTop = filters.viewMode === 'tasks'
                                ? (ROW_HEADER_HEIGHT - 42) / 2
                                : ROW_HEADER_EXPANDED_HEIGHT + (taskIndex * TASK_SUB_ROW_HEIGHT) + (TASK_SUB_ROW_HEIGHT - 42) / 2;
                              const lifecycleStart = task.createdAt;
                              const lifecycleEnd = task.deadline || task.scheduledEnd || lifecycleStart;

                              const rS = typeof lifecycleStart === 'string' ? parseISO(lifecycleStart) : lifecycleStart;
                              const rE = typeof lifecycleEnd === 'string' ? parseISO(lifecycleEnd) : lifecycleEnd;
                              const viewStart = startOfDay(selectedDate);
                              const viewEnd = endOfDay(selectedDate);

                              const displayStart = isBefore(rS, viewStart) ? viewStart : rS;
                              const displayEnd = isAfter(rE, viewEnd) ? viewEnd : rE;

                              if (isAfter(displayStart, displayEnd)) return null;

                              const startHours = displayStart.getHours() + displayStart.getMinutes() / 60;
                              const endHours = displayEnd.getHours() + displayEnd.getMinutes() / 60;
                              const left = (startHours / 24) * 100;
                              const width = ((endHours - startHours) / 24) * 100;

                              // Specific Scheduled Bar metrics
                              let scheduledLeft = left;
                              let scheduledWidth = width;
                              let isCurrentlyScheduled = false;

                              if (task.scheduledStart) {
                                const sStart = typeof task.scheduledStart === 'string' ? parseISO(task.scheduledStart) : task.scheduledStart;
                                const sEnd = task.scheduledEnd
                                  ? (typeof task.scheduledEnd === 'string' ? parseISO(task.scheduledEnd) : task.scheduledEnd)
                                  : addMinutes(sStart, task.estimatedDuration || 60);

                                if (isSameDay(sStart, selectedDate) || isSameDay(sEnd, selectedDate) || (isBefore(sStart, viewStart) && isAfter(sEnd, viewEnd))) {
                                  isCurrentlyScheduled = true;
                                  const dsStart = isBefore(sStart, viewStart) ? viewStart : sStart;
                                  const dsEnd = isAfter(sEnd, viewEnd) ? viewEnd : sEnd;

                                  const hsStart = dsStart.getHours() + dsStart.getMinutes() / 60;
                                  const hsEnd = dsEnd.getHours() + dsEnd.getMinutes() / 60;
                                  scheduledLeft = (hsStart / 24) * 100;
                                  scheduledWidth = ((hsEnd - hsStart) / 24) * 100;
                                }
                              }

                              return (
                                <div key={task.id} className="absolute inset-x-0" style={{ top: `${taskTop}px`, height: '42px' }}>
                                  {/* Neural Window Indication - The broader context shadow */}
                                  <div
                                    className="absolute inset-y-0 rounded-xl border overflow-hidden transition-all duration-700 opacity-40 group-hover:opacity-60"
                                    style={{
                                      left: `${left}%`,
                                      width: `${Math.max(width, 0.5)}%`,
                                      backgroundColor: `color-mix(in srgb, ${group.goalColor}, transparent 96%)`,
                                      borderColor: `color-mix(in srgb, ${group.goalColor}, transparent 70%)`,
                                      backgroundImage: `repeating-linear-gradient(-45deg, color-mix(in srgb, ${group.goalColor}, transparent 75%) 0px, color-mix(in srgb, ${group.goalColor}, transparent 75%) 2px, transparent 2px, transparent 12px)`,
                                      zIndex: 0,
                                    }}
                                  />

                                  {/* Active Task Bar - The specifically scheduled window */}
                                  {isCurrentlyScheduled && (
                                    <motion.div
                                      initial={{ opacity: 0, scaleX: 0 }}
                                      animate={{ opacity: 1, scaleX: 1 }}
                                      onClick={() => {
                                        const params = new URLSearchParams();
                                        params.set('fromView', 'timeline');
                                        if (isProjectView && task.projectId && task.projectId !== 'undefined') {
                                          params.set('fromProject', task.projectId);
                                        }
                                        params.set('fromTab', 'timeline');
                                        params.set('date', format(selectedDate, 'yyyy-MM-dd'));
                                        router.push(`/tasks/${task.id}?${params.toString()}`);
                                      }}
                                      className={cn(
                                        "absolute rounded-xl p-2.5 transition-all hover:z-50 cursor-pointer overflow-hidden backdrop-blur-md group/bar border-l-4",
                                        task.status === 'done' ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]" :
                                          task.status === 'in-progress' ? "bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "bg-muted/10 border-muted-foreground/20"
                                      )}
                                      style={{
                                        left: `${scheduledLeft}%`,
                                        width: `${Math.max(scheduledWidth, 0.5)}%`,
                                        zIndex: 1,
                                      }}
                                    >
                                      <div className="flex items-center justify-between h-full">
                                        <div className="flex flex-col min-w-0">
                                          <span className={cn(
                                            "text-[10px] font-black truncate tracking-tight uppercase group-hover/bar:text-primary transition-colors",
                                            task.status === 'done' && "line-through opacity-40"
                                          )}>
                                            {task.title}
                                          </span>
                                          {zoomLevel >= 2 && task.scheduledStart && (
                                            <div className="flex items-center gap-1.5 opacity-40">
                                              <span className="text-[7px] font-black">
                                                {format(typeof task.scheduledStart === 'string' ? parseISO(task.scheduledStart) : task.scheduledStart, 'HH:mm')}
                                                {task.scheduledEnd && ` - ${format(typeof task.scheduledEnd === 'string' ? parseISO(task.scheduledEnd) : task.scheduledEnd, 'HH:mm')}`}
                                              </span>
                                              {task.priority === 'high' && <Zap className="h-2 w-2 text-rose-500 fill-current" />}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}

                                  {/* Tracked & Manual Logs (Actual Execution Pulse) */}
                                  {timeEntries.filter(e => e.taskId === task.id).map((entry) => {
                                    const start = new Date(entry.startTime);
                                    const end = entry.endTime ? new Date(entry.endTime) : (entry.isRunning ? currentTime : new Date(start.getTime() + (entry.duration || 30) * 60000));

                                    const viewStart = startOfDay(selectedDate);
                                    const viewEnd = endOfDay(selectedDate);
                                    if (isAfter(start, viewEnd) || isBefore(end, viewStart)) return null;

                                    const dS = isBefore(start, viewStart) ? viewStart : start;
                                    const dE = isAfter(end, viewEnd) ? viewEnd : end;

                                    const startHours = dS.getHours() + dS.getMinutes() / 60;
                                    const endHours = dE.getHours() + dE.getMinutes() / 60;

                                    const left = (startHours / 24) * 100;
                                    const width = ((endHours - startHours) / 24) * 100;

                                    return (
                                      <motion.div
                                        key={entry.id}
                                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        whileHover={{ scale: 1.02, zIndex: 60 }}
                                        className={cn(
                                          "absolute h-[85%] top-[7.5%] rounded-lg border flex items-center px-2 gap-1.5 overflow-hidden transition-all backdrop-blur-md shadow-[0_8px_16px_-6px_rgba(0,0,0,0.2)]",
                                          entry.isRunning
                                            ? "ring-2 ring-orange-500/40 shadow-orange-500/20"
                                            : ""
                                        )}
                                        style={{
                                          left: `${left}%`,
                                          width: `${Math.max(width, 1.5)}%`,
                                          zIndex: 10,
                                          backgroundColor: entry.isRunning
                                            ? 'rgba(249, 115, 22, 0.7)'
                                            : `color-mix(in srgb, ${group.goalColor}, transparent 30%)`,
                                          borderColor: entry.isRunning
                                            ? 'rgba(251, 146, 60, 0.5)'
                                            : `color-mix(in srgb, ${group.goalColor}, transparent 60%)`,
                                          color: entry.isRunning ? '#fff' : 'white', // Ensure text is readable on dark glass
                                        }}
                                        title={`${entry.category}: ${entry.description || 'No description'}`}
                                      >
                                        {/* Top Edge Highlight for 3D Crystal Effect */}
                                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/30 z-20" />

                                        <Zap className={cn("w-2.5 h-2.5 shrink-0 z-10", entry.isRunning && "animate-pulse text-white")} />
                                        <span className="text-[7px] font-black uppercase tracking-widest truncate z-10 drop-shadow-sm">
                                          {entry.category || 'Manual Log'}
                                        </span>

                                        {entry.isRunning && (
                                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer z-0" />
                                        )}
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
