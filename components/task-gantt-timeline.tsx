'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Task, Goal, TimeEntry } from '@/types';
import { format, startOfDay, endOfDay, addHours, isSameDay, isBefore, isAfter, parseISO, differenceInMinutes } from 'date-fns';
import { Clock, CheckCircle2, Circle, AlertCircle, ChevronDown, ChevronRight, Filter, Target, TrendingUp, Zap, History } from 'lucide-react';
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

interface TaskGanttTimelineProps {
  tasks: Task[];
  goals: Goal[];
  timeEntries?: TimeEntry[];
  selectedDate: Date;
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

export function TaskGanttTimeline({ tasks, goals, timeEntries = [], selectedDate, isProjectView = false }: TaskGanttTimelineProps) {
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
    return (hours * 80) + (minutes / 60 * 80);
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

        <div className="flex items-center gap-4">
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
          <div className="flex flex-col lg:flex-row">
            {/* Left sidebar - Hierarchy */}
            <div className="w-full lg:w-80 bg-muted/20 border-r border-primary/5 flex-shrink-0 overflow-y-auto scrollbar-none scroll-smooth" style={{ maxHeight: '650px' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={filters.viewMode}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  {groupedTasks.map((group) => {
                    const isExpanded = expandedGoals.has(group.goalId || 'ungrouped') || filters.viewMode === 'tasks';
                    const groupId = group.goalId || 'ungrouped';

                    return (
                      <div key={groupId} className="border-b border-primary/5 group/row">
                        {/* Row Header */}
                        <div
                          className={cn(
                            "p-5 cursor-pointer transition-all duration-300 hover:bg-primary/5",
                            filters.viewMode === 'tasks' && "py-4"
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
                                  "font-bold truncate tracking-tight",
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

                              {filters.showStats && (
                                <div className="space-y-2.5">
                                  {filters.viewMode === 'goals' && (
                                    <div className="space-y-3">
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
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Tasks under goal (Only in Goals View) */}
                        {isExpanded && filters.viewMode === 'goals' && (
                          <div className="bg-primary/5 backdrop-blur-sm px-2 pb-2">
                            {group.tasks.map((task) => (
                              <div
                                key={task.id}
                                className="px-5 py-3 rounded-2xl hover:bg-background/80 transition-all duration-300 cursor-pointer mb-1 group/item"
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
            <div className="flex-1 relative bg-background/5" style={{ minHeight: '650px', maxHeight: '650px' }}>
              {/* Time Oracle Header */}
              <div className="sticky top-0 z-40 bg-background/60 backdrop-blur-xl border-b border-primary/5 flex shadow-xl shadow-background/20">
                {timeSlots.map((slot) => (
                  <div
                    key={slot.hour}
                    className="flex-1 min-w-[80px] border-r border-primary/5 p-4 text-center group/slot"
                  >
                    <span className="text-[10px] font-black text-muted-foreground/60 group-hover/slot:text-primary transition-colors uppercase tracking-widest">{slot.label}</span>
                  </div>
                ))}
              </div>

              {/* Matrix Core */}
              <div className="relative overflow-auto scrollbar-none" style={{ height: 'calc(650px - 58px)' }}>
                {/* Visual Grid */}
                <div className="flex h-full absolute inset-0 pointer-events-none">
                  {timeSlots.map((slot) => (
                    <div
                      key={slot.hour}
                      className="flex-1 min-w-[80px] border-r border-primary/5 h-full opacity-20"
                    />
                  ))}
                </div>

                {/* Current Momentum Beam (Glowing Vertical Halo) */}
                {currentTimePosition !== null && (
                  <div
                    className="absolute top-0 bottom-0 z-40 pointer-events-none flex"
                    style={{ left: `${(currentTimePosition / (24 * 80)) * 100}%` }}
                  >
                    {/* Momentum Shadow (Fading backwards) - Refined and thinned */}
                    <div className="absolute top-0 bottom-0 right-[100%] w-[60px] bg-gradient-to-r from-transparent to-primary/10" />

                    {/* The Kinetic Line */}
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
                      {/* Neural Junction Point */}
                      <div className="absolute top-0 -left-[2px] w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_#fff]" />

                      {/* Floating ID Badge - Relocated to bottom and made subtle */}
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
                    if (!isExpanded) return null;

                    return (
                      <div key={group.goalId || `group-${groupIndex}`} className="relative border-b border-primary/5" style={{ height: `${group.tasks.length * 60}px` }}>
                        {group.tasks.map((task, taskIndex) => {
                          return (
                            <div key={task.id} className="absolute inset-x-0" style={{ top: `${taskIndex * 60 + 10}px`, height: '42px' }}>
                              {/* Neural Window Indication (Full Lifespan Background) */}
                              {(() => {
                                const rangeStart = task.scheduledStart || task.createdAt;
                                const rangeEnd = task.deadline || task.scheduledEnd || rangeStart;

                                const rS = typeof rangeStart === 'string' ? parseISO(rangeStart) : rangeStart;
                                const rE = typeof rangeEnd === 'string' ? parseISO(rangeEnd) : rangeEnd;

                                const viewStart = startOfDay(selectedDate);
                                const viewEnd = endOfDay(selectedDate);

                                // Clamp to today's view
                                const displayStart = isBefore(rS, viewStart) ? viewStart : rS;
                                const displayEnd = isAfter(rE, viewEnd) ? viewEnd : rE;

                                if (isAfter(displayStart, displayEnd)) return null;

                                const startHours = displayStart.getHours() + displayStart.getMinutes() / 60;
                                const endHours = displayEnd.getHours() + displayEnd.getMinutes() / 60;

                                const left = (startHours / 24) * 100;
                                const width = ((endHours - startHours) / 24) * 100;

                                return (
                                  <div
                                    className="absolute inset-y-0 rounded-xl border overflow-hidden transition-all duration-700"
                                    style={{
                                      left: `${left}%`,
                                      width: `${Math.max(width, 0.5)}%`,
                                      backgroundColor: `color-mix(in srgb, ${group.goalColor}, transparent 98%)`,
                                      borderColor: `color-mix(in srgb, ${group.goalColor}, transparent 80%)`,
                                      backgroundImage: `repeating-linear-gradient(-45deg, color-mix(in srgb, ${group.goalColor}, transparent 85%) 0px, color-mix(in srgb, ${group.goalColor}, transparent 85%) 2px, transparent 2px, transparent 12px)`,
                                      zIndex: 0,
                                    }}
                                  >
                                    <div
                                      className="absolute top-1 right-2 text-[6px] font-black uppercase tracking-widest opacity-40"
                                      style={{ color: group.goalColor }}
                                    >
                                      {isSameDay(rE, selectedDate) ? 'Junction' : 'Stream'}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Active Task Bar (Specific Scheduled Plan) */}
                              {task.scheduledStart && isSameDay(new Date(task.scheduledStart), selectedDate) && (
                                <motion.div
                                  initial={{ opacity: 0, scaleX: 0 }}
                                  animate={{ opacity: 1, scaleX: 1 }}
                                  className={cn(
                                    "absolute rounded-xl p-2.5 transition-all hover:z-50 cursor-pointer overflow-hidden backdrop-blur-md group/bar border-l-4",
                                    task.status === 'done' ? "bg-emerald-500/10 border-emerald-500/30" :
                                      task.status === 'in-progress' ? "bg-primary/10 border-primary/30" : "bg-muted/10 border-muted-foreground/20"
                                  )}
                                  style={{
                                    left: `${((new Date(task.scheduledStart).getHours() + new Date(task.scheduledStart).getMinutes() / 60) / 24) * 100}%`,
                                    width: `${((task.estimatedDuration || 60) / 60 / 24) * 100}%`,
                                    height: '80%',
                                    top: '10%',
                                    borderColor: group.goalColor,
                                    zIndex: 1,
                                  }}
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
                                >
                                  <div className="flex items-center gap-2 h-full">
                                    <Clock className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0" />
                                    <span className="text-[8px] font-black uppercase tracking-tighter truncate opacity-60">
                                      {task.title} (Plan)
                                    </span>
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
        </CardContent>
      </Card>
    </div>
  );
}
