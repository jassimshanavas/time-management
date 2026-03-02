'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { TaskCard } from './task-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CreateTaskDialog } from '../tasks/create-task-dialog';
import { Task, TaskStatus } from '@/types';
import { KanbanStats } from './kanban-stats';
import {
    Plus,
    Sparkles,
    Zap,
    BatteryLow,
    BatteryMedium,
    BatteryFull,
    FilterX
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectKanbanProps {
    projectId: string;
    tasks: Task[];
}

const COLUMNS = [
    { id: 'todo' as TaskStatus, title: 'Backlog Alpha', color: 'border-slate-200', text: 'To Do', limit: null },
    { id: 'in-progress' as TaskStatus, title: 'Active Neural Flow', color: 'border-blue-500', text: 'Active', limit: 5 },
    { id: 'done' as TaskStatus, title: 'Materialized Reality', color: 'border-emerald-500', text: 'Done', limit: null },
] as const;

export function ProjectKanban({ projectId, tasks }: ProjectKanbanProps) {
    const { updateTask } = useStore();
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dropZone, setDropZone] = useState<TaskStatus | null>(null);
    const [energyFilter, setEnergyFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

    const filteredTasks = tasks.filter(t =>
        energyFilter === 'all' || t.energyLevel === energyFilter
    );

    const getTasksByStatus = (status: TaskStatus) => {
        return filteredTasks.filter((t) => t.status === status);
    };

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
        setDraggedTaskId(task.id);
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedTaskId(null);
    };

    const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
        e.preventDefault();
        setDropZone(status);
    };

    const handleDragLeave = () => {
        setDropZone(null);
    };

    const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) {
            await updateTask(taskId, {
                status: newStatus,
                lastStatusChange: new Date()
            });
        }
        setDraggedTaskId(null);
        setDropZone(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black italic tracking-tighter uppercase">Board Control</h2>
                    <div className="h-4 w-px bg-primary/10 mx-2" />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 rounded-xl border-primary/10 bg-background/50 backdrop-blur-sm gap-2 text-[10px] font-black uppercase tracking-widest">
                                <Zap className="h-3 w-3" />
                                Energy: {energyFilter === 'all' ? 'Every Level' : energyFilter}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 bg-background/80 backdrop-blur-xl border-primary/5">
                            <DropdownMenuItem onClick={() => setEnergyFilter('all')} className="text-[10px] font-bold uppercase tracking-widest gap-2">
                                <FilterX className="h-3.5 w-3.5" /> All Energy
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEnergyFilter('low')} className="text-[10px] font-bold uppercase tracking-widest gap-2">
                                <BatteryLow className="h-3.5 w-3.5 text-blue-400" /> Low Energy (Quick)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEnergyFilter('medium')} className="text-[10px] font-bold uppercase tracking-widest gap-2">
                                <BatteryMedium className="h-3.5 w-3.5 text-amber-400" /> Medium Energy
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEnergyFilter('high')} className="text-[10px] font-bold uppercase tracking-widest gap-2">
                                <BatteryFull className="h-3.5 w-3.5 text-rose-400" /> High Energy (Deep)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <KanbanStats tasks={tasks} />

            <div className="flex lg:grid lg:grid-cols-3 gap-6 h-full overflow-x-auto no-scrollbar pb-4 min-h-[600px]">
                {COLUMNS.map((column) => {
                    const columnTasks = getTasksByStatus(column.id);
                    const isOverLimit = column.limit && columnTasks.length > column.limit;

                    return (
                        <div
                            key={column.id}
                            className="flex flex-col h-full min-w-[280px] sm:min-w-[320px] flex-shrink-0 lg:flex-shrink space-y-4"
                            onDragOver={(e) => handleDragOver(e, column.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            <div className={cn(
                                "flex items-center justify-between px-1 mb-2 pb-2 border-b-2 transition-all duration-500",
                                isOverLimit ? 'border-rose-500 animate-pulse' :
                                    column.id === 'todo' ? 'border-slate-200/50' :
                                        column.id === 'in-progress' ? 'border-blue-500/50' :
                                            'border-emerald-500/50'
                            )}>
                                <div className="flex items-center gap-2.5">
                                    <h3 className={cn(
                                        "font-black text-[10px] uppercase tracking-widest italic",
                                        isOverLimit ? 'text-rose-500' :
                                            column.id === 'todo' ? 'text-muted-foreground/80' :
                                                column.id === 'in-progress' ? 'text-primary' :
                                                    'text-emerald-500'
                                    )}>
                                        {column.title}
                                    </h3>
                                    <Badge
                                        variant="secondary"
                                        className={cn(
                                            "font-black text-[10px] border-none rounded-lg h-5",
                                            isOverLimit ? 'bg-rose-500 text-white' :
                                                column.id === 'todo' ? 'bg-muted/50 text-muted-foreground' :
                                                    column.id === 'in-progress' ? 'bg-blue-500/10 text-blue-500' :
                                                        'bg-emerald-500/10 text-emerald-500'
                                        )}
                                    >
                                        {columnTasks.length} {column.limit && `/ ${column.limit}`}
                                    </Badge>
                                </div>
                                <CreateTaskDialog projectId={projectId} defaultStatus={column.id}>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary rounded-lg transition-all active:scale-95">
                                        <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                </CreateTaskDialog>
                            </div>

                            <div className={cn(
                                "flex-1 space-y-3 min-h-[400px] rounded-2xl p-3 border border-primary/5 transition-all duration-500 relative",
                                dropZone === column.id ? "bg-primary/5 border-primary/20 scale-[0.99]" : "bg-muted/5",
                                isOverLimit && "bg-rose-500/[0.02] border-rose-500/10"
                            )}>
                                {/* Drop zone pulse effect */}
                                {dropZone === column.id && (
                                    <div className="absolute inset-0 bg-primary/5 animate-pulse rounded-2xl pointer-events-none" />
                                )}

                                {columnTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task)}
                                        onDragEnd={handleDragEnd}
                                        className="cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        style={{ perspective: '1000px' }}
                                    >
                                        <TaskCard task={task} />
                                    </div>
                                ))}

                                {columnTasks.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-40 opacity-10 italic">
                                        <Sparkles className="h-8 w-8 mb-2" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-center">
                                            {column.id === 'todo' ? 'Workspace Void' :
                                                column.id === 'in-progress' ? 'No Active Synapses' :
                                                    'History Silent'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

