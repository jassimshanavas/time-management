'use client';

import { Task, Project, Goal } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, isToday, isPast } from 'date-fns';
import {
    AlertCircle,
    Target,
    Clock,
    Trash2,
    Edit,
    Maximize2,
    Play,
    Calendar as CalendarIcon,
    UserPlus,
    Coffee,
    Zap,
    Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TaskEisenhowerMatrixProps {
    tasks: Task[];
    projects: Project[];
    goals: Goal[];
    onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
    onDeleteTask: (id: string) => Promise<void>;
    onEditTask: (task: Task) => void;
}

export function TaskEisenhowerMatrix({
    tasks,
    projects,
    goals,
    onUpdateTask,
    onDeleteTask,
    onEditTask,
}: TaskEisenhowerMatrixProps) {
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [hoverQuadrant, setHoverQuadrant] = useState<number | null>(null);
    const [zoomQuadrant, setZoomQuadrant] = useState<number | null>(null);

    // Divide tasks into quadrants
    const getQuadrantTasks = (isUrgent: boolean, isImportant: boolean) => {
        return tasks.filter(task => {
            if (task.status === 'done') return false;

            // Logic for auto-classification if fields are missing
            const urgent = task.isUrgent ?? (task.deadline && (isToday(new Date(task.deadline)) || isPast(new Date(task.deadline))));
            const important = task.isImportant ?? (task.priority === 'high' || task.priority === 'medium' || task.goalId);

            return urgent === isUrgent && important === isImportant;
        });
    };

    const quadrants = [
        {
            id: 1,
            title: 'Crisis',
            subtitle: 'Critical Orbit',
            isUrgent: true,
            isImportant: true,
            icon: AlertCircle,
            color: 'from-red-500/10 to-red-600/[0.02]',
            borderColor: 'border-red-500/20',
            textColor: 'text-red-500',
            badgeColor: 'bg-red-500',
            tasks: getQuadrantTasks(true, true),
            action: 'Do Immediately',
            description: 'Urgent & Important'
        },
        {
            id: 2,
            title: 'Plan',
            subtitle: 'Strategic Core',
            isUrgent: false,
            isImportant: true,
            icon: Target,
            color: 'from-blue-500/10 to-blue-600/[0.02]',
            borderColor: 'border-blue-500/20',
            textColor: 'text-blue-500',
            badgeColor: 'bg-blue-500',
            tasks: getQuadrantTasks(false, true),
            action: 'Schedule',
            description: 'Important, Not Urgent'
        },
        {
            id: 3,
            title: 'Triage',
            subtitle: 'Delegate Matrix',
            isUrgent: true,
            isImportant: false,
            icon: Clock,
            color: 'from-amber-500/10 to-amber-600/[0.02]',
            borderColor: 'border-amber-500/20',
            textColor: 'text-amber-500',
            badgeColor: 'bg-amber-500',
            tasks: getQuadrantTasks(true, false),
            action: 'Delegate',
            description: 'Urgent, Not Important'
        },
        {
            id: 4,
            title: 'Noise',
            subtitle: 'Entropy Zone',
            isUrgent: false,
            isImportant: false,
            icon: Coffee,
            color: 'from-emerald-500/10 to-emerald-600/[0.02]',
            borderColor: 'border-emerald-500/20',
            textColor: 'text-emerald-500',
            badgeColor: 'bg-emerald-500',
            tasks: getQuadrantTasks(false, false),
            action: 'Minimize',
            description: 'Neither'
        }
    ];

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
        setDraggedTaskId(taskId);
    };

    const handleDrop = async (e: React.DragEvent, isUrgent: boolean, isImportant: boolean) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) {
            await onUpdateTask(taskId, { isUrgent, isImportant });
        }
        setDraggedTaskId(null);
        setHoverQuadrant(null);
    };

    const handleDragOver = (e: React.DragEvent, id: number) => {
        e.preventDefault();
        setHoverQuadrant(id);
    };

    const TaskItem = ({ task, quadrantId }: { task: Task, quadrantId: number }) => {
        const project = projects.find(p => p.id === task.projectId);

        return (
            <motion.div
                layoutId={task.id}
                draggable
                onDragStart={(e: any) => handleDragStart(e, task.id)}
                className={cn(
                    "group relative p-3 rounded-xl border bg-background/60 backdrop-blur-md hover:border-primary/30 hover:shadow-xl transition-all cursor-grab active:cursor-grabbing mb-2",
                    quadrantId === 4 ? "opacity-60 grayscale hover:opacity-100 hover:grayscale-0" : ""
                )}
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <h4 className={cn(
                            "text-xs font-bold truncate tracking-tight group-hover:text-primary transition-colors",
                            task.status === 'done' && "line-through opacity-50"
                        )}>
                            {task.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                            {project && (
                                <Badge variant="outline" className="text-[8px] font-black uppercase px-1 h-3.5" style={{ color: project.color, borderColor: `${project.color}40` }}>
                                    {project.name}
                                </Badge>
                            )}
                            {task.deadline && (
                                <span className="text-[8px] font-medium text-muted-foreground flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5" />
                                    {format(new Date(task.deadline), 'MMM d')}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {quadrantId === 1 && (
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:bg-red-500/10" title="Focus Mode">
                                <Play className="h-3 w-3" />
                            </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onEditTask(task)}>
                            <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => onDeleteTask(task.id)}>
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="h-full flex flex-col gap-4 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-[600px] p-1">
                {quadrants.map((q) => (
                    <motion.div
                        key={q.id}
                        layout
                        className={cn(
                            "relative flex flex-col rounded-3xl border-2 transition-all duration-500 overflow-hidden",
                            q.borderColor,
                            hoverQuadrant === q.id ? "scale-[1.01] shadow-2xl z-10 bg-background/50" : "bg-background/20",
                            zoomQuadrant && zoomQuadrant !== q.id ? "hidden" : zoomQuadrant === q.id ? "col-span-2 row-span-2" : ""
                        )}
                        onDragOver={(e) => handleDragOver(e, q.id)}
                        onDragLeave={() => setHoverQuadrant(null)}
                        onDrop={(e) => handleDrop(e, q.isUrgent, q.isImportant)}
                    >
                        {/* Background Gradient */}
                        <div className={cn("absolute inset-0 bg-gradient-to-br -z-10 opacity-50", q.color)} />

                        {/* Quadrant Header */}
                        <div className="p-4 flex items-center justify-between border-b border-primary/5 bg-background/30 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center shadow-inner border border-white/10", q.badgeColor + "/20")}>
                                    <q.icon className={cn("h-6 w-6", q.textColor)} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className={cn("font-black text-sm uppercase tracking-wider", q.textColor)}>{q.title}</h3>
                                        <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                                        <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-tighter">{q.subtitle}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-muted-foreground/50 italic">{q.description}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-black text-[10px] rounded-lg bg-background/50 border border-primary/5">
                                    {q.tasks.length}
                                </Badge>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-xl hover:bg-primary/5"
                                    onClick={() => setZoomQuadrant(zoomQuadrant === q.id ? null : q.id)}
                                >
                                    <Maximize2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Task List */}
                        <div className={cn(
                            "overflow-y-auto p-4 custom-scrollbar",
                            zoomQuadrant === q.id ? "flex-1" : "h-[300px]"
                        )}>
                            <AnimatePresence mode="popLayout">
                                {q.tasks.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-2">
                                        {q.tasks.map((task) => (
                                            <TaskItem key={task.id} task={task} quadrantId={q.id} />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                                        <div className={cn("p-4 rounded-full border-2 border-dashed border-current mb-4", q.textColor)}>
                                            <Sparkles className="h-8 w-8" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Deploy to {q.subtitle}</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Matrix Decorative Corner Label */}
                        <div className={cn(
                            "absolute bottom-0 right-0 p-3 text-[10px] font-black uppercase tracking-[0.3em] opacity-10 pointer-events-none select-none",
                            q.textColor
                        )}>
                            {q.action}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
