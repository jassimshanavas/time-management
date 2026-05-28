'use client';

import { useMemo, useState } from 'react';
import { Task } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, Target, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isToday, isPast } from 'date-fns';

interface EisenhowerMatrixProps {
    tasks: Task[];
    onScheduleTask: (task: Task, dropY?: number) => void;
    onUpdateTask?: (id: string, updates: Partial<Task>) => Promise<void>;
}

interface DraggableTaskProps {
    task: Task;
    colorClass: string;
    onScheduleTask: (task: Task) => void;
}

function DraggableTask({ task, colorClass, onScheduleTask }: DraggableTaskProps) {
    return (
        <div
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData('taskId', task.id);
                e.dataTransfer.setData('application/habit-task-id', task.id);
                e.dataTransfer.setData('text/plain', `task:${task.id}`);
                e.dataTransfer.effectAllowed = 'copyMove';
            }}
            onClick={() => onScheduleTask(task)} // Click to instantly move to bucket
            className="p-2 bg-background/80 backdrop-blur-md rounded-lg border border-primary/10 hover:border-primary/30 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-lg group/task z-50 relative active:scale-[0.98]"
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
        </div>
    );
}

interface QuadrantProps {
    title: string;
    tasks: Task[];
    icon: any;
    colorClass: string;
    bgClass: string;
    description: string;
    isUrgent: boolean;
    isImportant: boolean;
    onScheduleTask: (task: Task) => void;
    onUpdateTask?: (id: string, updates: Partial<Task>) => Promise<void>;
}

function Quadrant({
    title,
    tasks,
    icon: Icon,
    colorClass,
    bgClass,
    description,
    isUrgent,
    isImportant,
    onScheduleTask,
    onUpdateTask
}: QuadrantProps) {
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <div
            className={cn(
                "flex flex-col h-full rounded-xl p-2.5 transition-all duration-350 relative border",
                bgClass,
                isDragOver ? "border-current/40 bg-current/[0.04] scale-[1.01] shadow-lg shadow-current/5 ring-1 ring-current/25" : "border-transparent"
            )}
            style={{ color: isDragOver ? 'currentColor' : undefined }}
            onDragEnter={(e) => {
                e.preventDefault();
                setIsDragOver(true);
            }}
            onDragLeave={(e) => {
                // Prevent flicker when hovering children
                const rect = e.currentTarget.getBoundingClientRect();
                if (
                    e.clientX < rect.left ||
                    e.clientX >= rect.right ||
                    e.clientY < rect.top ||
                    e.clientY >= rect.bottom
                ) {
                    setIsDragOver(false);
                }
            }}
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={async (e) => {
                e.preventDefault();
                setIsDragOver(false);
                const taskId = e.dataTransfer.getData('taskId') || e.dataTransfer.getData('application/habit-task-id');
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
                    <DraggableTask 
                        key={task.id} 
                        task={task} 
                        colorClass={colorClass} 
                        onScheduleTask={onScheduleTask}
                    />
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

    return (
        <div className="grid grid-cols-2 grid-rows-2 gap-2 h-full">
            <Quadrant
                title="Crisis"
                tasks={quadrants.q1}
                icon={AlertCircle}
                colorClass="text-red-500"
                bgClass="bg-red-500/[0.03] border-red-500/5"
                description="Do It Now"
                isUrgent={true}
                isImportant={true}
                onScheduleTask={onScheduleTask}
                onUpdateTask={onUpdateTask}
            />
            <Quadrant
                title="Plan"
                tasks={quadrants.q2}
                icon={Target}
                colorClass="text-blue-500"
                bgClass="bg-blue-500/[0.03] border-blue-500/5"
                description="Schedule It"
                isUrgent={false}
                isImportant={true}
                onScheduleTask={onScheduleTask}
                onUpdateTask={onUpdateTask}
            />
            <Quadrant
                title="Triage"
                tasks={quadrants.q3}
                icon={Clock}
                colorClass="text-yellow-500"
                bgClass="bg-yellow-500/[0.03] border-yellow-500/5"
                description="Delegate / Postpone"
                isUrgent={true}
                isImportant={false}
                onScheduleTask={onScheduleTask}
                onUpdateTask={onUpdateTask}
            />
            <Quadrant
                title="Noise"
                tasks={quadrants.q4}
                icon={Coffee}
                colorClass="text-emerald-500"
                bgClass="bg-emerald-500/[0.03] border-emerald-500/5"
                description="Minimize / Avoid"
                isUrgent={false}
                isImportant={false}
                onScheduleTask={onScheduleTask}
                onUpdateTask={onUpdateTask}
            />
        </div>
    );
}
