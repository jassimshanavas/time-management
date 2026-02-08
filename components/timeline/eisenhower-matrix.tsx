'use client';

import { useMemo } from 'react';
import { Task } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, Target, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isToday, isPast, isFuture } from 'date-fns';
import { motion } from 'framer-motion';

interface EisenhowerMatrixProps {
    tasks: Task[];
    onScheduleTask: (task: Task, dropY?: number) => void;
    onUpdateTask?: (id: string, updates: Partial<Task>) => Promise<void>;
}

export function EisenhowerMatrix({ tasks, onScheduleTask, onUpdateTask }: EisenhowerMatrixProps) {
    const quadrants = useMemo(() => {
        const q1: Task[] = []; // Urgent & Important
        const q2: Task[] = []; // Important, Not Urgent
        const q3: Task[] = []; // Urgent, Not Important
        const q4: Task[] = []; // Neither

        tasks.forEach(task => {
            const isUrgent = task.isUrgent ?? (task.deadline && (isToday(new Date(task.deadline)) || isPast(new Date(task.deadline))));
            const isImportant = task.isImportant ?? (task.priority === 'high' || task.priority === 'medium' || !!task.goalId);

            if (isUrgent && isImportant) q1.push(task);
            else if (!isUrgent && isImportant) q2.push(task);
            else if (isUrgent && !isImportant) q3.push(task);
            else q4.push(task);
        });

        return { q1, q2, q3, q4 };
    }, [tasks]);

    const DraggableTask = ({ task, colorClass }: { task: Task; colorClass: string }) => {
        return (
            <motion.div
                layoutId={task.id}
                drag
                dragSnapToOrigin
                dragElastic={0.1}
                dragMomentum={false}
                onDragStart={(e: any) => {
                    e.dataTransfer.setData('taskId', task.id);
                    onScheduleTask(task); // Existing logic might need this to know what started
                }}
                onDragEnd={(e, info) => {
                    // Check if it was dropped over the timeline
                    onScheduleTask(task, info.point.y);
                }}
                className="p-2 bg-background/80 backdrop-blur-md rounded-lg border border-primary/10 hover:border-primary/30 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-lg group/task z-50 relative"
            >
                <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-[10px] font-black leading-tight line-clamp-2 group-hover/task:text-primary transition-colors">
                        {task.title}
                    </h4>
                    <div className={cn(
                        "h-1.5 w-1.5 rounded-full mt-0.5 shrink-0 shadow-[0_0_5px_currentColor]",
                        task.priority === 'high' ? 'text-red-500 bg-red-500' : task.priority === 'medium' ? 'text-yellow-500 bg-yellow-500' : 'text-blue-500 bg-blue-500'
                    )} />
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-1 py-0.5 rounded bg-muted/50 text-muted-foreground">
                        <Clock className="h-2 w-2" />
                        <span className="text-[8px] font-black font-mono">
                            {task.estimatedDuration || 60}m
                        </span>
                    </div>
                    {task.deadline && (
                        <div className="flex items-center gap-1 text-[7px] font-bold text-muted-foreground uppercase opacity-60">
                            <AlertCircle className="h-2 w-2" />
                            {isToday(new Date(task.deadline)) ? 'Today' : 'Soon'}
                        </div>
                    )}
                </div>
            </motion.div>
        );
    };

    const Quadrant = ({
        title,
        tasks,
        icon: Icon,
        colorClass,
        bgClass,
        description,
        isUrgent,
        isImportant
    }: {
        title: string;
        tasks: Task[];
        icon: any;
        colorClass: string;
        bgClass: string;
        description: string;
        isUrgent: boolean;
        isImportant: boolean;
    }) => (
        <div
            className={cn("flex flex-col h-full rounded-xl p-2.5 transition-all duration-300", bgClass)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData('taskId');
                if (taskId && onUpdateTask) {
                    await onUpdateTask(taskId, { isUrgent, isImportant });
                }
            }}
        >
            <div className="flex items-center justify-between mb-2">
                <div className={cn("flex items-center gap-1.5 font-black text-[9px] uppercase tracking-widest", colorClass)}>
                    <Icon className="h-3 w-3" />
                    {title}
                </div>
                <Badge variant="secondary" className="font-black text-[8px] h-3.5 px-1 rounded-sm opacity-40">
                    {tasks.length}
                </Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar min-h-[50px] pr-1">
                {tasks.map(task => (
                    <DraggableTask key={task.id} task={task} colorClass={colorClass} />
                ))}
                {tasks.length === 0 && (
                    <div className="h-full min-h-[80px] flex flex-col items-center justify-center border border-dashed border-primary/5 rounded-lg opacity-10">
                        <Icon className="h-5 w-5" />
                        <span className="text-[7px] font-black mt-1 uppercase tracking-tighter">Clear</span>
                    </div>
                )}
            </div>

            <div className={cn("mt-2 pt-2 border-t border-primary/5 flex items-center gap-2", colorClass)}>
                <div className="flex-1 h-px bg-current opacity-10" />
                <span className="text-[7px] font-black uppercase tracking-widest whitespace-nowrap opacity-70">
                    {description}
                </span>
                <div className="flex-1 h-px bg-current opacity-10" />
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
            <Quadrant
                title="Crisis"
                tasks={quadrants.q1}
                icon={AlertCircle}
                colorClass="text-red-500"
                bgClass="bg-red-500/[0.03] border border-red-500/5"
                description="Do It Now"
                isUrgent={true}
                isImportant={true}
            />
            <Quadrant
                title="Plan"
                tasks={quadrants.q2}
                icon={Target}
                colorClass="text-blue-500"
                bgClass="bg-blue-500/[0.03] border border-blue-500/5"
                description="Schedule It"
                isUrgent={false}
                isImportant={true}
            />
            <Quadrant
                title="Triage"
                tasks={quadrants.q3}
                icon={Clock}
                colorClass="text-yellow-500"
                bgClass="bg-yellow-500/[0.03] border border-yellow-500/5"
                description="Delegate / Postpone"
                isUrgent={true}
                isImportant={false}
            />
            <Quadrant
                title="Noise"
                tasks={quadrants.q4}
                icon={Coffee}
                colorClass="text-emerald-500"
                bgClass="bg-emerald-500/[0.03] border border-emerald-500/5"
                description="Minimize / Avoid"
                isUrgent={false}
                isImportant={false}
            />
        </div>
    );
}
