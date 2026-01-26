'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
    Layout
} from 'lucide-react';
import { format, addDays, subDays, startOfDay, isSameDay, addMinutes, differenceInMinutes, startOfHour, setHours, setMinutes } from 'date-fns';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import { motion, AnimatePresence, useMotionValue, useTransform, useDragControls } from 'framer-motion';
import { toast, Toaster } from 'sonner';
import { Task } from '@/types';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

const HOUR_HEIGHT = 80;
const STEP_MINUTES = 15;
const STEP_HEIGHT = (STEP_MINUTES / 60) * HOUR_HEIGHT;

export default function DayTimelinePage() {
    const { tasks, updateTask, selectedProjectId, projects } = useStore();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Filter tasks by project and date
    const filterByWorkspace = <T extends { projectId?: string }>(items: T[]) => {
        if (selectedProjectId === null) return items;
        if (selectedProjectId === 'personal') return items.filter((item) => !item.projectId);
        return items.filter((item) => item.projectId === selectedProjectId);
    };

    const filteredTasks = useMemo(() => filterByWorkspace(tasks), [tasks, selectedProjectId]);

    const scheduledTasks = useMemo(() => {
        return filteredTasks.filter(t => t.scheduledStart && isSameDay(new Date(t.scheduledStart), selectedDate));
    }, [filteredTasks, selectedDate]);

    const unscheduledTasks = useMemo(() => {
        return filteredTasks.filter(t => !t.scheduledStart || !isSameDay(new Date(t.scheduledStart), selectedDate))
            .filter(t => t.status !== 'done')
            .filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [filteredTasks, selectedDate, searchQuery]);

    // Handle Drag & Update
    const handleTaskMove = async (task: Task, newTop: number) => {
        const totalMinutes = (newTop / HOUR_HEIGHT) * 60;
        const roundedMinutes = Math.round(totalMinutes / STEP_MINUTES) * STEP_MINUTES;

        const newStart = startOfDay(selectedDate);
        const updatedStart = addMinutes(newStart, roundedMinutes);

        const duration = task.estimatedDuration || 60;
        const updatedEnd = addMinutes(updatedStart, duration);

        try {
            await updateTask(task.id, {
                scheduledStart: updatedStart,
                scheduledEnd: updatedEnd,
            });
            toast.success(`Moved: ${task.title} to ${format(updatedStart, 'HH:mm')}`);
        } catch (error) {
            toast.error('Failed to move task');
        }
    };

    const handleTaskResize = async (task: Task, newHeight: number) => {
        const durationMinutes = (newHeight / HOUR_HEIGHT) * 60;
        const roundedDuration = Math.max(STEP_MINUTES, Math.round(durationMinutes / STEP_MINUTES) * STEP_MINUTES);

        if (task.scheduledStart) {
            const updatedEnd = addMinutes(new Date(task.scheduledStart), roundedDuration);
            try {
                await updateTask(task.id, {
                    estimatedDuration: roundedDuration,
                    scheduledEnd: updatedEnd,
                });
                toast.success(`Resized: ${task.title} to ${Math.floor(roundedDuration / 60)}h ${roundedDuration % 60}m`);
            } catch (error) {
                toast.error('Failed to resize task');
            }
        }
    };

    const handleScheduleUnscheduled = async (task: Task) => {
        // Find a free slot or just default to 9 AM
        const nineAM = setHours(startOfDay(selectedDate), 9);
        try {
            await updateTask(task.id, {
                scheduledStart: nineAM,
                scheduledEnd: addMinutes(nineAM, task.estimatedDuration || 60),
                estimatedDuration: task.estimatedDuration || 60
            });
            toast.success(`Scheduled: ${task.title} at 09:00`);
        } catch (e) {
            toast.error("Failed to schedule task");
        }
    }

    // Scroll to current time or 8 AM on mount
    useEffect(() => {
        if (scrollContainerRef.current) {
            const now = new Date();
            const startHour = isSameDay(now, selectedDate) ? now.getHours() - 1 : 8;
            scrollContainerRef.current.scrollTop = Math.max(0, startHour * HOUR_HEIGHT);
        }
    }, [selectedDate]);

    return (
        <ProtectedRoute>
            <DataLoader>
                <MainLayout>
                    <Toaster position="top-right" richColors />
                    <div className="flex flex-col h-[calc(100vh-100px)]">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                                    <Clock className="h-8 w-8 text-primary" />
                                    Day Planner
                                </h1>
                                <p className="text-muted-foreground italic">Drag to move • Pull to resize</p>
                            </div>

                            <div className="flex items-center gap-4 bg-muted/50 p-1 rounded-xl border">
                                <Button variant="ghost" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="flex items-center gap-2 px-2">
                                    <CalendarIcon className="h-4 w-4 text-primary" />
                                    <span className="font-semibold min-w-[140px] text-center">
                                        {format(selectedDate, 'EEEE, MMM d')}
                                    </span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <div className="h-4 w-px bg-border mx-1" />
                                <Button variant="secondary" size="sm" onClick={() => setSelectedDate(new Date())}>
                                    Today
                                </Button>
                            </div>
                        </div>

                        <div className="flex gap-6 flex-1 min-h-0">
                            {/* Left Panel: Unscheduled Tasks */}
                            <Card className="w-80 flex flex-col bg-muted/20 border-primary/10">
                                <CardHeader className="pb-3 px-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <Layout className="h-4 w-4 text-purple-500" />
                                            Unscheduled
                                        </CardTitle>
                                        <Badge variant="secondary">{unscheduledTasks.length}</Badge>
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                        <Input
                                            placeholder="Find tasks..."
                                            className="h-8 pl-8 text-xs bg-background"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-y-auto px-2 space-y-2">
                                    {unscheduledTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className="p-3 bg-background rounded-lg border border-primary/5 hover:border-primary/30 cursor-pointer transition-all hover:shadow-md group shadow-sm"
                                            onClick={() => handleScheduleUnscheduled(task)}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">{task.title}</h4>
                                                <div className={cn(
                                                    "h-2 w-2 rounded-full mt-1 shrink-0",
                                                    task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                                                )} />
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Clock className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                    {task.estimatedDuration || 60} min
                                                </span>
                                                <div className="flex-1" />
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Badge variant="secondary" className="text-[9px] px-1 h-4">Schedule</Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {unscheduledTasks.length === 0 && (
                                        <div className="text-center py-10 opacity-30">
                                            <Sparkles className="h-10 w-10 mx-auto mb-2" />
                                            <p className="text-xs">No tasks to show</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Center: Timeline Grid */}
                            <Card className="flex-1 relative overflow-hidden flex flex-col border-primary/20 shadow-xl">
                                <div className="flex items-center justify-between p-4 border-b bg-card z-30">
                                    <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-2 w-4 rounded bg-primary/20 border border-primary/30" />
                                            <span>Active Workspace: {selectedProjectId === null ? 'Global' : projects.find(p => p.id === selectedProjectId)?.name || 'Personal'}</span>
                                        </div>
                                    </div>
                                    <div className="text-xs font-mono bg-primary/5 px-2 py-1 rounded">
                                        Daily Grid: {STEP_MINUTES}m increments
                                    </div>
                                </div>

                                <div
                                    ref={scrollContainerRef}
                                    className="flex-1 overflow-y-auto relative bg-[linear-gradient(to_bottom,transparent_79px,hsl(var(--border))_79px)] bg-[size:100%_80px]"
                                >
                                    <div className="flex min-h-full">
                                        {/* Hours column */}
                                        <div className="w-16 flex-shrink-0 bg-muted/10 border-r z-20">
                                            {Array.from({ length: 24 }).map((_, i) => (
                                                <div key={i} className="h-[80px] flex items-start justify-center pt-2">
                                                    <span className="text-[10px] font-mono font-bold text-muted-foreground tabular-nums">
                                                        {format(setHours(new Date(), i), 'HH:00')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Interaction Surface */}
                                        <div className="flex-1 relative">
                                            {/* Sub-hour lines (15m) */}
                                            <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
                                                {Array.from({ length: 24 * 4 }).map((_, i) => (
                                                    <div key={i} className="h-[20px] border-b border-dashed border-muted-foreground/30" />
                                                ))}
                                            </div>

                                            {/* Scheduled Tasks */}
                                            <AnimatePresence>
                                                {scheduledTasks.map(task => {
                                                    const start = new Date(task.scheduledStart!);
                                                    const top = (start.getHours() * HOUR_HEIGHT) + (start.getMinutes() / 60 * HOUR_HEIGHT);
                                                    const height = ((task.estimatedDuration || 60) / 60) * HOUR_HEIGHT;
                                                    const project = projects.find(p => p.id === task.projectId);

                                                    return (
                                                        <TimelineTask
                                                            key={task.id}
                                                            task={task}
                                                            initialTop={top}
                                                            initialHeight={height}
                                                            projectColor={project?.color}
                                                            projectName={project?.name}
                                                            onMove={(newTop) => handleTaskMove(task, newTop)}
                                                            onResize={(newHeight) => handleTaskResize(task, newHeight)}
                                                            onRemove={() => updateTask(task.id, { scheduledStart: undefined, scheduledEnd: undefined })}
                                                        />
                                                    );
                                                })}
                                            </AnimatePresence>

                                            {/* Current Time Line */}
                                            {isSameDay(new Date(), selectedDate) && <CurrentTimeLine />}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </MainLayout>
            </DataLoader>
        </ProtectedRoute>
    );
}

interface TimelineTaskProps {
    task: Task;
    initialTop: number;
    initialHeight: number;
    projectColor?: string;
    projectName?: string;
    onMove: (newTop: number) => void;
    onResize: (newHeight: number) => void;
    onRemove: () => void;
}

function TimelineTask({
    task,
    initialTop,
    initialHeight,
    projectColor,
    projectName,
    onMove,
    onResize,
    onRemove
}: TimelineTaskProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragControls = useDragControls();

    // Internal states for immediate visual feedback
    const [localTop, setLocalTop] = useState(initialTop);
    const [localHeight, setLocalHeight] = useState(initialHeight);

    // Sync local state with props when not interacting
    useEffect(() => {
        if (!isDragging && !isResizing) {
            setLocalTop(initialTop);
            setLocalHeight(initialHeight);
        }
    }, [initialTop, initialHeight, isDragging, isResizing]);

    const snapToStep = (value: number, step: number) => Math.round(value / step) * step;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.9 }}
            animate={{
                opacity: 1,
                x: 0,
                scale: 1,
                top: localTop,
                height: localHeight,
                zIndex: (isDragging || isResizing) ? 100 : 40
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false} // Only drag via handle
            dragConstraints={{ top: 0, bottom: 24 * HOUR_HEIGHT - localHeight }}
            dragElastic={0}
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDrag={(e, info) => {
                const newTop = initialTop + info.offset.y;
                const snappedTop = snapToStep(newTop, STEP_HEIGHT);
                setLocalTop(snappedTop);
            }}
            onDragEnd={(_, info) => {
                setIsDragging(false);
                const finalTop = initialTop + info.offset.y;
                onMove(finalTop);
            }}
            className={cn(
                "absolute left-4 right-8 rounded-xl border p-4 transition-shadow transition-colors group overflow-hidden bg-card",
                isDragging && "shadow-2xl ring-2 ring-primary scale-[1.01] brightness-110 z-[100]",
                isResizing && "shadow-xl ring-2 ring-primary bg-accent/5 z-[100]",
                task.status === 'done' ? "opacity-50 grayscale" : "shadow-lg"
            )}
            style={{
                borderLeft: `6px solid ${projectColor || (task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#3b82f6')}`
            }}
        >
            {/* Project Watermark */}
            <div className="absolute -bottom-2 -right-2 opacity-[0.03] rotate-[-5deg] select-none pointer-events-none">
                <span className="text-6xl font-black truncate max-w-full">{projectName || 'Personal'}</span>
            </div>

            <div className="flex h-full relative z-10">
                {/* Drag Handle (Left) */}
                <div
                    className="w-8 -ml-4 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-primary/5 transition-colors shrink-0 group/drag"
                    onPointerDown={(e) => dragControls.start(e)}
                >
                    <GripVertical className="h-5 w-5 text-muted-foreground/40 group-hover/drag:text-primary transition-colors" />
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-w-0 px-2 py-0.5 pointer-events-none">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[9px] h-4 py-0 font-mono bg-background/50 border-primary/20 shrink-0">
                            {format(addMinutes(startOfDay(new Date()), (localTop / HOUR_HEIGHT) * 60), 'HH:mm')}
                        </Badge>
                        <h4 className={cn("text-xs font-bold truncate", task.status === 'done' && "line-through")}>
                            {task.title}
                        </h4>
                    </div>
                    {localHeight > 60 && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight">
                            {task.description || "No description"}
                        </p>
                    )}
                </div>

                {/* Actions (Right) */}
                <div className="shrink-0 flex flex-col items-end gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-full transition-all opacity-0 group-hover:opacity-100"
                    >
                        <Plus className="h-4 w-4 rotate-45" />
                    </button>
                    {task.priority === 'high' && <Badge className="text-[8px] h-3 px-1 py-0 bg-red-500/10 text-red-500 border-red-500/20">HIGH</Badge>}
                </div>
            </div>

            {/* Interaction Visual Feedback */}
            {(isDragging || isResizing) && (
                <div className="absolute inset-0 bg-primary/10 backdrop-blur-[2px] flex items-center justify-center z-[60] pointer-events-none border-2 border-primary rounded-xl">
                    <div className="bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-2 scale-110">
                        <Clock className="h-4 w-4" />
                        {format(addMinutes(startOfDay(new Date()), (localTop / HOUR_HEIGHT) * 60), 'HH:mm')}
                        <span className="mx-1 opacity-50">|</span>
                        {Math.round((localHeight / HOUR_HEIGHT) * 60)}m
                    </div>
                </div>
            )}

            {/* Stable Resize Handle (Bottom) */}
            <div
                className="absolute bottom-0 left-0 right-0 h-6 cursor-ns-resize flex items-center justify-center group/resizer z-[110]"
                onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsResizing(true);

                    const startY = e.clientY;
                    const startHeight = localHeight;

                    const onPointerMove = (moveEvent: PointerEvent) => {
                        const dy = moveEvent.clientY - startY;
                        const newHeight = Math.max(STEP_HEIGHT, startHeight + dy);
                        setLocalHeight(snapToStep(newHeight, STEP_HEIGHT));
                    };

                    const onPointerUp = (upEvent: PointerEvent) => {
                        const dy = upEvent.clientY - startY;
                        const finalHeight = Math.max(STEP_HEIGHT, startHeight + dy);
                        setIsResizing(false);
                        onResize(finalHeight);
                        document.removeEventListener('pointermove', onPointerMove);
                        document.removeEventListener('pointerup', onPointerUp);
                    };

                    document.addEventListener('pointermove', onPointerMove);
                    document.addEventListener('pointerup', onPointerUp);
                }}
            >
                <div className="w-24 h-1.5 bg-primary/20 rounded-full group-hover/resizer:bg-primary/60 transition-all group-active/resizer:bg-primary group-active/resizer:w-32" />
            </div>
        </motion.div>
    );
}

function CurrentTimeLine() {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const top = (now.getHours() * HOUR_HEIGHT) + (now.getMinutes() / 60 * HOUR_HEIGHT);

    return (
        <div
            className="absolute left-0 right-0 flex items-center z-30 pointer-events-none"
            style={{ top }}
        >
            <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 border-2 border-white shadow-lg" />
            <div className="flex-1 h-0.5 bg-red-500/50" />
            <Badge variant="destructive" className="ml-2 text-[9px] h-4 py-0 shadow-lg">NOW</Badge>
        </div>
    );
}
