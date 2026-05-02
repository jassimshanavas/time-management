'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, addDays, subDays, isWeekend, differenceInDays, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Clock, Target, TrendingUp, Zap, Flame, Award, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Task, Goal } from '@/types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

interface TimelineCalendarSelectorProps {
    selectedDate: Date;
    onDateChange: (date: Date) => void;
    tasks: Task[];
    goals: Goal[];
}

interface DayStats {
    totalTasks: number;
    completedTasks: number;
    totalDuration: number;
    completedDuration: number;
    highPriorityCount: number;
    completionRate: number;
    isOverbooked: boolean;
}

export function TimelineCalendarSelector({ selectedDate, onDateChange, tasks, goals }: TimelineCalendarSelectorProps) {
    const [currentMonth, setCurrentMonth] = useState(selectedDate);
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
    const [selectedGoalFilter, setSelectedGoalFilter] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

    // Calculate task statistics for each day
    const dayStatsMap = useMemo(() => {
        const statsMap = new Map<string, DayStats>();

        tasks.forEach(task => {
            const taskDate = task.scheduledStart || task.deadline;
            if (!taskDate) return;

            const date = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
            const dateKey = format(date, 'yyyy-MM-dd');

            const existing = statsMap.get(dateKey) || {
                totalTasks: 0,
                completedTasks: 0,
                totalDuration: 0,
                completedDuration: 0,
                highPriorityCount: 0,
                completionRate: 0,
                isOverbooked: false,
            };

            existing.totalTasks++;
            existing.totalDuration += task.estimatedDuration || 60;

            if (task.status === 'done') {
                existing.completedTasks++;
                existing.completedDuration += task.estimatedDuration || 60;
            }

            if (task.priority === 'high') {
                existing.highPriorityCount++;
            }

            existing.completionRate = existing.totalTasks > 0
                ? (existing.completedTasks / existing.totalTasks) * 100
                : 0;

            // Consider overbooked if more than 8 hours scheduled
            existing.isOverbooked = existing.totalDuration > 480;

            statsMap.set(dateKey, existing);
        });

        return statsMap;
    }, [tasks]);

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

            if (streak > 30) break; // Max 30 days to check
        }

        return streak;
    }, [dayStatsMap]);

    // Get days to display in calendar
    const calendarDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth));
        const end = endOfWeek(endOfMonth(currentMonth));
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    // Get tasks for hovered date
    const hoveredDateTasks = useMemo(() => {
        if (!hoveredDate) return [];

        return tasks.filter(task => {
            const taskDate = task.scheduledStart || task.deadline;
            if (!taskDate) return false;
            const date = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
            return isSameDay(date, hoveredDate);
        });
    }, [hoveredDate, tasks]);

    // Filter tasks by goal if selected
    const filteredTasks = useMemo(() => {
        if (selectedGoalFilter === 'all') return tasks;
        return tasks.filter(task => task.goalId === selectedGoalFilter);
    }, [tasks, selectedGoalFilter]);

    const getDayIntensity = (date: Date): number => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const stats = dayStatsMap.get(dateKey);
        if (!stats) return 0;

        // Return intensity from 0-4 based on task count
        if (stats.totalTasks === 0) return 0;
        if (stats.totalTasks <= 2) return 1;
        if (stats.totalTasks <= 4) return 2;
        if (stats.totalTasks <= 6) return 3;
        return 4;
    };

    const getDayColor = (date: Date): string => {
        const intensity = getDayIntensity(date);
        const dateKey = format(date, 'yyyy-MM-dd');
        const stats = dayStatsMap.get(dateKey);

        if (!stats) return 'transparent';

        // Color based on completion rate
        if (stats.completionRate === 100) {
            return `rgba(16, 185, 129, ${0.1 + intensity * 0.15})`; // Green for completed
        } else if (stats.completionRate >= 50) {
            return `rgba(59, 130, 246, ${0.1 + intensity * 0.15})`; // Blue for in progress
        } else {
            return `rgba(245, 158, 11, ${0.1 + intensity * 0.15})`; // Amber for pending
        }
    };

    const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const handleToday = () => {
        setCurrentMonth(new Date());
        onDateChange(new Date());
    };

    const handleDateSelect = (date: Date) => {
        onDateChange(date);
        setIsOpen(false);
    };

    const quickDateActions = [
        { label: 'Today', action: () => handleDateSelect(new Date()) },
        { label: 'Tomorrow', action: () => handleDateSelect(addDays(new Date(), 1)) },
        { label: 'Next Week', action: () => handleDateSelect(addDays(new Date(), 7)) },
    ];

    return (
        <div className="flex items-center gap-1 bg-background/40 backdrop-blur-md border border-primary/10 rounded-2xl shadow-lg p-1">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => onDateChange(new Date(selectedDate.getTime() - 86400000))}
                className="h-9 w-9 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                title="Previous Day"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        className={cn(
                            "h-9 px-4 rounded-xl hover:bg-primary/5 transition-all duration-300",
                            isOpen && "bg-primary/10 text-primary"
                        )}
                    >
                        <Calendar className="h-4 w-4 mr-2 text-primary/70" />
                        <span className="font-black text-sm tracking-tight">
                            {format(selectedDate, 'MMM dd, yyyy')}
                        </span>
                        {productivityStreak > 0 && (
                            <Badge className="ml-2 bg-orange-500/10 text-orange-500 border-orange-500/20 text-[9px] font-black px-1.5 py-0">
                                <Flame className="h-2.5 w-2.5 mr-1" />
                                {productivityStreak}
                            </Badge>
                        )}
                    </Button>
                </PopoverTrigger>

            <PopoverContent
                className="w-[480px] p-0 border-primary/10 bg-background/95 backdrop-blur-xl rounded-3xl shadow-2xl"
                align="start"
                sideOffset={8}
            >
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-6"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handlePreviousMonth}
                                className="h-9 w-9 rounded-xl hover:bg-primary/10"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <div className="flex items-center gap-2">
                                <Select
                                    value={format(currentMonth, 'M')}
                                    onValueChange={(month) => {
                                        const newDate = new Date(currentMonth);
                                        newDate.setMonth(parseInt(month) - 1);
                                        setCurrentMonth(newDate);
                                    }}
                                >
                                    <SelectTrigger className="h-9 w-32 rounded-xl border-primary/10 bg-background/40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <SelectItem key={i} value={String(i + 1)}>
                                                {format(new Date(2024, i, 1), 'MMMM')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={format(currentMonth, 'yyyy')}
                                    onValueChange={(year) => {
                                        const newDate = new Date(currentMonth);
                                        newDate.setFullYear(parseInt(year));
                                        setCurrentMonth(newDate);
                                    }}
                                >
                                    <SelectTrigger className="h-9 w-24 rounded-xl border-primary/10 bg-background/40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        {Array.from({ length: 10 }, (_, i) => {
                                            const year = new Date().getFullYear() - 2 + i;
                                            return (
                                                <SelectItem key={year} value={String(year)}>
                                                    {year}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleNextMonth}
                                className="h-9 w-9 rounded-xl hover:bg-primary/10"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleToday}
                            className="h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/10"
                        >
                            Today
                        </Button>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2 mb-4">
                        {quickDateActions.map((action, i) => (
                            <Button
                                key={i}
                                variant="outline"
                                size="sm"
                                onClick={action.action}
                                className="h-8 px-3 rounded-xl border-primary/10 bg-background/40 hover:bg-primary/10 text-[10px] font-black uppercase tracking-widest"
                            >
                                {action.label}
                            </Button>
                        ))}

                        <div className="flex-1" />

                        {/* Goal Filter */}
                        <Select value={selectedGoalFilter} onValueChange={setSelectedGoalFilter}>
                            <SelectTrigger className="h-8 w-32 rounded-xl border-primary/10 bg-background/40 text-[10px]">
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

                    {/* Productivity Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                            <div className="flex items-center gap-2 mb-1">
                                <Flame className="h-3 w-3 text-emerald-500" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/60">Streak</span>
                            </div>
                            <div className="text-lg font-black text-emerald-500">{productivityStreak} days</div>
                        </div>

                        <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                            <div className="flex items-center gap-2 mb-1">
                                <Target className="h-3 w-3 text-blue-500" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-500/60">This Month</span>
                            </div>
                            <div className="text-lg font-black text-blue-500">
                                {Array.from(dayStatsMap.values()).reduce((sum, stats) => sum + stats.totalTasks, 0)} tasks
                            </div>
                        </div>

                        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="h-3 w-3 text-amber-500" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500/60">Avg Rate</span>
                            </div>
                            <div className="text-lg font-black text-amber-500">
                                {Math.round(
                                    Array.from(dayStatsMap.values()).reduce((sum, stats) => sum + stats.completionRate, 0) /
                                    Math.max(dayStatsMap.size, 1)
                                )}%
                            </div>
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="space-y-2">
                        {/* Weekday Headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                <div
                                    key={day}
                                    className="h-8 flex items-center justify-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40"
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Days */}
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((day, i) => {
                                const dateKey = format(day, 'yyyy-MM-dd');
                                const stats = dayStatsMap.get(dateKey);
                                const isSelected = isSameDay(day, selectedDate);
                                const isCurrentMonth = isSameMonth(day, currentMonth);
                                const isTodayDate = isToday(day);
                                const intensity = getDayIntensity(day);

                                return (
                                    <motion.button
                                        key={i}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleDateSelect(day)}
                                        onMouseEnter={() => setHoveredDate(day)}
                                        onMouseLeave={() => setHoveredDate(null)}
                                        className={cn(
                                            "relative h-12 rounded-xl transition-all duration-200 group",
                                            isSelected && "ring-2 ring-primary shadow-lg shadow-primary/20",
                                            isTodayDate && !isSelected && "ring-1 ring-primary/30",
                                            !isCurrentMonth && "opacity-30",
                                            isCurrentMonth && "hover:bg-primary/10"
                                        )}
                                        style={{
                                            backgroundColor: isSelected ? 'rgba(var(--primary), 0.2)' : getDayColor(day)
                                        }}
                                    >
                                        <div className="flex flex-col items-center justify-center h-full">
                                            <span className={cn(
                                                "text-sm font-bold",
                                                isSelected && "text-primary",
                                                isTodayDate && !isSelected && "text-primary",
                                                !isCurrentMonth && "text-muted-foreground"
                                            )}>
                                                {format(day, 'd')}
                                            </span>

                                            {/* Task Indicators */}
                                            {stats && stats.totalTasks > 0 && (
                                                <div className="flex items-center gap-0.5 mt-0.5">
                                                    {stats.highPriorityCount > 0 && (
                                                        <Zap className="h-2 w-2 text-red-500 fill-current" />
                                                    )}
                                                    <span className="text-[8px] font-black text-muted-foreground">
                                                        {stats.totalTasks}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Completion Indicator */}
                                            {stats && stats.completionRate === 100 && (
                                                <CheckCircle2 className="absolute top-1 right-1 h-2.5 w-2.5 text-emerald-500" />
                                            )}

                                            {/* Overbooked Warning */}
                                            {stats && stats.isOverbooked && (
                                                <AlertCircle className="absolute top-1 left-1 h-2.5 w-2.5 text-amber-500" />
                                            )}
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Hovered Date Preview */}
                    <AnimatePresence>
                        {hoveredDate && hoveredDateTasks.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 overflow-hidden"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">
                                        {format(hoveredDate, 'EEEE, MMM dd')}
                                    </span>
                                    <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black">
                                        {hoveredDateTasks.length} tasks
                                    </Badge>
                                </div>

                                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                                    {hoveredDateTasks.slice(0, 5).map((task) => (
                                        <div
                                            key={task.id}
                                            className="flex items-center gap-2 p-2 rounded-xl bg-background/40 hover:bg-background/60 transition-colors"
                                        >
                                            {task.status === 'done' ? (
                                                <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                                            ) : task.status === 'in-progress' ? (
                                                <Clock className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                            ) : (
                                                <Circle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                            )}
                                            <span className="text-[10px] font-bold truncate flex-1">{task.title}</span>
                                            {task.priority === 'high' && (
                                                <Zap className="h-2.5 w-2.5 text-red-500 fill-current flex-shrink-0" />
                                            )}
                                        </div>
                                    ))}
                                    {hoveredDateTasks.length > 5 && (
                                        <div className="text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                                            +{hoveredDateTasks.length - 5} more
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Legend */}
                    <div className="mt-4 pt-4 border-t border-primary/10">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                <span>Completed</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-3 w-3 text-amber-500" />
                                <span>Overbooked</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap className="h-3 w-3 text-red-500" />
                                <span>High Priority</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </PopoverContent>
        </Popover>
        
        <Button
            variant="ghost"
            size="icon"
            onClick={() => onDateChange(new Date(selectedDate.getTime() + 86400000))}
            className="h-9 w-9 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="Next Day"
        >
            <ChevronRight className="h-4 w-4" />
        </Button>
    </div>
    );
}
