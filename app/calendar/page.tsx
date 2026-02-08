'use client';

import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/store';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    CheckSquare,
    Target,
    Bell,
    Filter,
    Plus,
    Sparkles,
    Brain,
    Zap,
    Workflow,
    Flame,
    Clock,
    CheckCircle2,
    Circle,
    AlertCircle,
    TrendingUp,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, addDays, subDays, parseISO, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, Goal } from '@/types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface DayStats {
    totalTasks: number;
    completedTasks: number;
    totalGoals: number;
    totalReminders: number;
    highPriorityCount: number;
    completionRate: number;
    isOverbooked: boolean;
}

export default function CalendarPage() {
    const { tasks, goals, reminders, selectedProjectId } = useStore();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showTasks, setShowTasks] = useState(true);
    const [showGoals, setShowGoals] = useState(true);
    const [showReminders, setShowReminders] = useState(true);
    const [selectedGoalFilter, setSelectedGoalFilter] = useState<string>('all');
    const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

    // Filter by workspace
    const filterByWorkspace = <T extends { projectId?: string }>(items: T[]) => {
        if (selectedProjectId === null) return items;
        if (selectedProjectId === 'personal') return items.filter((item) => !item.projectId);
        return items.filter((item) => item.projectId === selectedProjectId);
    };

    const filteredTasks = filterByWorkspace(tasks);
    const filteredGoals = filterByWorkspace(goals);
    const filteredReminders = filterByWorkspace(reminders);

    // Calculate task statistics for each day
    const dayStatsMap = useMemo(() => {
        const statsMap = new Map<string, DayStats>();

        filteredTasks.forEach(task => {
            const taskDate = task.scheduledStart || task.deadline;
            if (!taskDate) return;

            const date = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
            const dateKey = format(date, 'yyyy-MM-dd');

            const existing = statsMap.get(dateKey) || {
                totalTasks: 0,
                completedTasks: 0,
                totalGoals: 0,
                totalReminders: 0,
                highPriorityCount: 0,
                completionRate: 0,
                isOverbooked: false,
            };

            if (showTasks) {
                existing.totalTasks++;

                if (task.status === 'done') {
                    existing.completedTasks++;
                }

                if (task.priority === 'high') {
                    existing.highPriorityCount++;
                }

                existing.completionRate = existing.totalTasks > 0
                    ? (existing.completedTasks / existing.totalTasks) * 100
                    : 0;
            }

            statsMap.set(dateKey, existing);
        });

        if (showGoals) {
            filteredGoals.forEach(goal => {
                if (goal.targetDate) {
                    const date = typeof goal.targetDate === 'string' ? parseISO(goal.targetDate) : goal.targetDate;
                    const dateKey = format(date, 'yyyy-MM-dd');

                    const existing = statsMap.get(dateKey) || {
                        totalTasks: 0,
                        completedTasks: 0,
                        totalGoals: 0,
                        totalReminders: 0,
                        highPriorityCount: 0,
                        completionRate: 0,
                        isOverbooked: false,
                    };

                    existing.totalGoals++;
                    statsMap.set(dateKey, existing);
                }
            });
        }

        if (showReminders) {
            filteredReminders.forEach(reminder => {
                if (reminder.dueDate) {
                    const date = typeof reminder.dueDate === 'string' ? parseISO(reminder.dueDate) : reminder.dueDate;
                    const dateKey = format(date, 'yyyy-MM-dd');

                    const existing = statsMap.get(dateKey) || {
                        totalTasks: 0,
                        completedTasks: 0,
                        totalGoals: 0,
                        totalReminders: 0,
                        highPriorityCount: 0,
                        completionRate: 0,
                        isOverbooked: false,
                    };

                    existing.totalReminders++;
                    statsMap.set(dateKey, existing);
                }
            });
        }

        return statsMap;
    }, [filteredTasks, filteredGoals, filteredReminders, showTasks, showGoals, showReminders]);

    // Calculate productivity streak
    const productivityStreak = useMemo(() => {
        const today = new Date();
        let streak = 0;
        let currentDate = today;

        while (true) {
            const dateKey = format(currentDate, 'yyyy-MM-dd');
            const stats = dayStatsMap.get(dateKey);

            if (!stats || stats.completionRate < 50) break;

            streak++;
            currentDate = subDays(currentDate, 1);

            if (streak > 30) break;
        }

        return streak;
    }, [dayStatsMap]);

    // Get days to display in calendar
    const calendarDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth));
        const end = endOfWeek(endOfMonth(currentMonth));
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    // Get items for selected/hovered date
    const getDateItems = (date: Date | null) => {
        if (!date) return { tasks: [], goals: [], reminders: [] };

        const dateTasks = filteredTasks.filter(task => {
            const taskDate = task.scheduledStart || task.deadline;
            if (!taskDate) return false;
            const d = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
            return isSameDay(d, date);
        });

        const dateGoals = filteredGoals.filter(goal => {
            if (!goal.targetDate) return false;
            const d = typeof goal.targetDate === 'string' ? parseISO(goal.targetDate) : goal.targetDate;
            return isSameDay(d, date);
        });

        const dateReminders = filteredReminders.filter(reminder => {
            if (!reminder.dueDate) return false;
            const d = typeof reminder.dueDate === 'string' ? parseISO(reminder.dueDate) : reminder.dueDate;
            return isSameDay(d, date);
        });

        return { tasks: dateTasks, goals: dateGoals, reminders: dateReminders };
    };

    const getDayColor = (date: Date): string => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const stats = dayStatsMap.get(dateKey);

        if (!stats || (stats.totalTasks === 0 && stats.totalGoals === 0 && stats.totalReminders === 0)) return 'transparent';

        const totalItems = stats.totalTasks + stats.totalGoals + stats.totalReminders;
        const intensity = Math.min(totalItems / 8, 1);

        if (stats.completionRate === 100) {
            return `rgba(16, 185, 129, ${0.1 + intensity * 0.2})`;
        } else if (stats.completionRate >= 50) {
            return `rgba(59, 130, 246, ${0.1 + intensity * 0.2})`;
        } else {
            return `rgba(245, 158, 11, ${0.1 + intensity * 0.2})`;
        }
    };

    const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const handleToday = () => {
        setCurrentMonth(new Date());
        setSelectedDate(new Date());
    };

    const selectedDateItems = getDateItems(selectedDate);
    const hoveredDateItems = getDateItems(hoveredDate);

    return (
        <ProtectedRoute>
            <DataLoader>
                <MainLayout>
                    <div className="space-y-8 pb-12">
                        {/* Header */}
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between px-1">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-500 border-emerald-500/20 px-2 py-0 h-4">
                                        Event Matrix
                                    </Badge>
                                    {productivityStreak > 0 && (
                                        <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[9px] font-black px-2">
                                            <Flame className="h-2.5 w-2.5 mr-1" />
                                            {productivityStreak} day streak
                                        </Badge>
                                    )}
                                </div>
                                <h1 className="text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent italic">
                                    Global Event Matrix
                                </h1>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-70">
                                    Synthesizing multidimensional operational timelines
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleToday}
                                    className="h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest bg-background/40 border-primary/10 shadow-sm transition-all hover:scale-105 active:scale-95"
                                >
                                    Jump to Present
                                </Button>
                                <Button size="icon" className="h-10 w-10 rounded-xl bg-primary shadow-lg shadow-primary/20">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Filters */}
                        <Card className="px-1 sm:p-5 bg-background/60 backdrop-blur-2xl border-none shadow-2xl rounded-[2rem] overflow-hidden">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between p-4 sm:p-0">
                                <div className="flex items-center gap-3 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
                                    <div className="flex items-center gap-2 min-w-max">
                                        <div className="h-8 w-8 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center mr-2">
                                            <Filter className="h-4 w-4 text-primary" />
                                        </div>
                                        <Button
                                            variant={showTasks ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setShowTasks(!showTasks)}
                                            className={cn(
                                                "h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                                                !showTasks && "bg-background/40 border-primary/10"
                                            )}
                                        >
                                            <CheckSquare className="h-3.5 w-3.5 mr-2" />
                                            Operations
                                        </Button>
                                        <Button
                                            variant={showGoals ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setShowGoals(!showGoals)}
                                            className={cn(
                                                "h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                                                !showGoals && "bg-background/40 border-primary/10"
                                            )}
                                        >
                                            <Target className="h-3.5 w-3.5 mr-2" />
                                            Targets
                                        </Button>
                                        <Button
                                            variant={showReminders ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setShowReminders(!showReminders)}
                                            className={cn(
                                                "h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                                                !showReminders && "bg-background/40 border-primary/10"
                                            )}
                                        >
                                            <Bell className="h-3.5 w-3.5 mr-2" />
                                            Neural Alerts
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                                    <Select value={selectedGoalFilter} onValueChange={setSelectedGoalFilter}>
                                        <SelectTrigger className="h-9 w-40 rounded-xl border-primary/10 bg-background/40 text-[10px] font-black uppercase tracking-widest">
                                            <SelectValue placeholder="All Goals" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl">
                                            <SelectItem value="all">All Goals</SelectItem>
                                            {goals.map(goal => (
                                                <SelectItem key={goal.id} value={goal.id}>
                                                    {goal.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </Card>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main Calendar */}
                            <Card className="lg:col-span-2 p-6 border-none bg-background/60 backdrop-blur-2xl shadow-2xl rounded-[3rem] overflow-hidden">
                                {/* Calendar Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handlePreviousMonth}
                                            className="h-10 w-10 rounded-xl hover:bg-primary/10"
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </Button>

                                        <h2 className="text-2xl font-black italic tracking-tight">
                                            {format(currentMonth, 'MMMM yyyy')}
                                        </h2>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleNextMonth}
                                            className="h-10 w-10 rounded-xl hover:bg-primary/10"
                                        >
                                            <ChevronRight className="h-5 w-5" />
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Completed</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">Active</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Weekday Headers */}
                                <div className="grid grid-cols-7 gap-2 mb-4">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                        <div
                                            key={day}
                                            className="h-10 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/40"
                                        >
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Days */}
                                <div className="grid grid-cols-7 gap-2">
                                    {calendarDays.map((day, i) => {
                                        const dateKey = format(day, 'yyyy-MM-dd');
                                        const stats = dayStatsMap.get(dateKey);
                                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                                        const isCurrentMonth = isSameMonth(day, currentMonth);
                                        const isTodayDate = isToday(day);
                                        const totalItems = stats ? (stats.totalTasks + stats.totalGoals + stats.totalReminders) : 0;

                                        return (
                                            <motion.button
                                                key={i}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setSelectedDate(day)}
                                                onMouseEnter={() => setHoveredDate(day)}
                                                onMouseLeave={() => setHoveredDate(null)}
                                                className={cn(
                                                    "relative h-20 rounded-2xl transition-all duration-200 group border",
                                                    isSelected && "ring-2 ring-primary shadow-lg shadow-primary/20 border-primary",
                                                    isTodayDate && !isSelected && "ring-1 ring-primary/30 border-primary/30",
                                                    !isCurrentMonth && "opacity-30",
                                                    isCurrentMonth && "hover:bg-primary/10 border-primary/10"
                                                )}
                                                style={{
                                                    backgroundColor: isSelected ? 'rgba(var(--primary), 0.1)' : getDayColor(day)
                                                }}
                                            >
                                                <div className="flex flex-col items-center justify-center h-full p-2">
                                                    <span className={cn(
                                                        "text-lg font-bold mb-1",
                                                        isSelected && "text-primary",
                                                        isTodayDate && !isSelected && "text-primary",
                                                        !isCurrentMonth && "text-muted-foreground"
                                                    )}>
                                                        {format(day, 'd')}
                                                    </span>

                                                    {/* Event Indicators */}
                                                    {totalItems > 0 && (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="flex items-center gap-1">
                                                                {stats!.highPriorityCount > 0 && (
                                                                    <Zap className="h-2.5 w-2.5 text-red-500 fill-current" />
                                                                )}
                                                                <span className="text-[9px] font-black text-muted-foreground">
                                                                    {totalItems}
                                                                </span>
                                                            </div>
                                                            {stats!.completionRate === 100 && (
                                                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </Card>

                            {/* Selected Date Details */}
                            <Card className="p-6 border-none bg-background/60 backdrop-blur-2xl shadow-2xl rounded-[3rem] overflow-hidden">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-black italic tracking-tight">
                                        {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'Select a Date'}
                                    </h3>
                                    {selectedDate && (
                                        <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black">
                                            {selectedDateItems.tasks.length + selectedDateItems.goals.length + selectedDateItems.reminders.length} items
                                        </Badge>
                                    )}
                                </div>

                                <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                                    {selectedDate ? (
                                        <>
                                            {/* Tasks */}
                                            {selectedDateItems.tasks.length > 0 && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <CheckSquare className="h-4 w-4 text-blue-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                                            Operations ({selectedDateItems.tasks.length})
                                                        </span>
                                                    </div>
                                                    {selectedDateItems.tasks.map((task) => (
                                                        <div
                                                            key={task.id}
                                                            className="flex items-center gap-3 p-3 rounded-xl bg-background/40 hover:bg-background/60 transition-colors border border-primary/5"
                                                        >
                                                            {task.status === 'done' ? (
                                                                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                                            ) : task.status === 'in-progress' ? (
                                                                <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                                            ) : (
                                                                <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold truncate">{task.title}</p>
                                                                {task.estimatedDuration && (
                                                                    <p className="text-[9px] text-muted-foreground">
                                                                        {Math.floor(task.estimatedDuration / 60)}h {task.estimatedDuration % 60}m
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {task.priority === 'high' && (
                                                                <Zap className="h-3 w-3 text-red-500 fill-current flex-shrink-0" />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Goals */}
                                            {selectedDateItems.goals.length > 0 && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Target className="h-4 w-4 text-emerald-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                                            Targets ({selectedDateItems.goals.length})
                                                        </span>
                                                    </div>
                                                    {selectedDateItems.goals.map((goal) => (
                                                        <div
                                                            key={goal.id}
                                                            className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
                                                        >
                                                            <Target className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                                            <p className="text-xs font-bold flex-1 truncate">{goal.title}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Reminders */}
                                            {selectedDateItems.reminders.length > 0 && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Bell className="h-4 w-4 text-pink-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                                            Alerts ({selectedDateItems.reminders.length})
                                                        </span>
                                                    </div>
                                                    {selectedDateItems.reminders.map((reminder) => (
                                                        <div
                                                            key={reminder.id}
                                                            className="flex items-center gap-3 p-3 rounded-xl bg-pink-500/5 border border-pink-500/20"
                                                        >
                                                            <Bell className="h-4 w-4 text-pink-500 flex-shrink-0" />
                                                            <p className="text-xs font-bold flex-1 truncate">{reminder.title}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {selectedDateItems.tasks.length === 0 && selectedDateItems.goals.length === 0 && selectedDateItems.reminders.length === 0 && (
                                                <div className="text-center py-12 opacity-40">
                                                    <CalendarIcon className="h-12 w-12 mx-auto mb-3" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">No events scheduled</p>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center py-12 opacity-40">
                                            <CalendarIcon className="h-12 w-12 mx-auto mb-3" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Select a date to view events</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* Stats */}
                        <div className="grid gap-6 grid-cols-2 lg:grid-cols-4 px-1">
                            <Card className="relative overflow-hidden border-none bg-background/60 backdrop-blur-2xl shadow-xl rounded-[2rem] p-6 transition-all duration-500 hover:shadow-violet-500/5 group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-2xl bg-violet-500/5 border border-violet-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <Workflow className="h-5 w-5 text-violet-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black italic tabular-nums leading-none mb-1">
                                            {filteredTasks.filter((t) => t.deadline).length}
                                        </p>
                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Deadlines</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="relative overflow-hidden border-none bg-background/60 backdrop-blur-2xl shadow-xl rounded-[2rem] p-6 transition-all duration-500 hover:shadow-emerald-500/5 group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <Zap className="h-5 w-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black italic tabular-nums leading-none mb-1">
                                            {filteredGoals.filter((g) => g.targetDate).length}
                                        </p>
                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Targets</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="relative overflow-hidden border-none bg-background/60 backdrop-blur-2xl shadow-xl rounded-[2rem] p-6 transition-all duration-500 hover:shadow-pink-500/5 group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-2xl bg-pink-500/5 border border-pink-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <Bell className="h-5 w-5 text-pink-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black italic tabular-nums leading-none mb-1">{filteredReminders.length}</p>
                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Alerts</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="relative overflow-hidden border-none bg-background/60 backdrop-blur-2xl shadow-xl rounded-[2rem] p-6 transition-all duration-500 hover:shadow-orange-500/5 group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <Flame className="h-5 w-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black italic tabular-nums leading-none mb-1">{productivityStreak}</p>
                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Day Streak</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>

                    <style jsx global>{`
                        .scrollbar-hide::-webkit-scrollbar {
                            display: none;
                        }
                        .scrollbar-hide {
                            -ms-overflow-style: none;
                            scrollbar-width: none;
                        }
                        .custom-scrollbar::-webkit-scrollbar {
                            width: 6px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background: transparent;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: rgba(128, 128, 128, 0.2);
                            border-radius: 10px;
                        }
                        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                            background: rgba(128, 128, 128, 0.4);
                        }
                    `}</style>
                </MainLayout>
            </DataLoader>
        </ProtectedRoute>
    );
}
