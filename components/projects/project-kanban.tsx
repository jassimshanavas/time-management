'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { TaskCard } from './task-card';
import { Badge } from '@/components/ui/badge';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CreateTaskDialog } from '../tasks/create-task-dialog';
import { Task, TaskStatus } from '@/types';

interface ProjectKanbanProps {
    projectId: string;
    tasks: Task[];
}

const COLUMNS = [
    { id: 'todo' as TaskStatus, title: 'To Do Pulse', color: 'border-slate-200', text: 'To Do Pulse' },
    { id: 'in-progress' as TaskStatus, title: 'Active Flow', color: 'border-blue-500', text: 'Active Flow' },
    { id: 'done' as TaskStatus, title: 'Materialized', color: 'border-green-500', text: 'Materialized' },
] as const;

export function ProjectKanban({ projectId, tasks }: ProjectKanbanProps) {
    const { updateTask } = useStore();
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dropZone, setDropZone] = useState<TaskStatus | null>(null);

    const getTasksByStatus = (status: TaskStatus) => {
        return tasks.filter((t) => t.status === status);
    };

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
        setDraggedTaskId(task.id);
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedTaskId(null);
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }
    };

    const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropZone(status);
    };

    const handleDragLeave = () => {
        setDropZone(null);
    };

    const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
        e.preventDefault();
        e.stopPropagation();

        const taskId = e.dataTransfer.getData('text/plain');
        if (taskId) {
            await updateTask(taskId, { status: newStatus });
        }

        setDraggedTaskId(null);
        setDropZone(null);
    };

    return (
        <div className="flex lg:grid lg:grid-cols-3 gap-6 h-full overflow-x-auto no-scrollbar pb-4 min-h-[600px]">
            {COLUMNS.map((column) => {
                const columnTasks = getTasksByStatus(column.id);

                return (
                    <div
                        key={column.id}
                        className="flex flex-col h-full min-w-[280px] sm:min-w-[320px] flex-shrink-0 lg:flex-shrink space-y-4"
                        onDragOver={(e) => handleDragOver(e, column.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, column.id)}
                    >
                        <div className={cn(
                            "flex items-center justify-between px-1 mb-2 pb-2 border-b-2 transition-colors duration-300",
                            column.id === 'todo' ? 'border-slate-200/50' :
                                column.id === 'in-progress' ? 'border-blue-500/50' :
                                    'border-emerald-500/50'
                        )}>
                            <div className="flex items-center gap-2.5">
                                <h3 className={cn(
                                    "font-black text-[10px] uppercase tracking-widest italic",
                                    column.id === 'todo' ? 'text-muted-foreground/80' :
                                        column.id === 'in-progress' ? 'text-primary' :
                                            'text-emerald-500'
                                )}>
                                    {column.title}
                                </h3>
                                <Badge variant="secondary" className={cn(
                                    "font-black text-[10px] border-none rounded-lg h-5",
                                    column.id === 'todo' ? 'bg-muted/50 text-muted-foreground' :
                                        column.id === 'in-progress' ? 'bg-blue-500/10 text-blue-500' :
                                            'bg-emerald-500/10 text-emerald-500'
                                )}>
                                    {columnTasks.length}
                                </Badge>
                            </div>
                            <CreateTaskDialog projectId={projectId} defaultStatus={column.id}>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary rounded-lg transition-all active:scale-95">
                                    <Plus className="h-3.5 w-3.5" />
                                </Button>
                            </CreateTaskDialog>
                        </div>

                        <div className={cn(
                            "flex-1 space-y-3 min-h-[400px] rounded-2xl p-3 border border-primary/5 backdrop-blur-sm transition-all duration-300",
                            dropZone === column.id ? "bg-primary/10 border-primary border-dashed" : "bg-muted/10"
                        )}>
                            {columnTasks.map((task) => (
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, task)}
                                    onDragEnd={handleDragEnd}
                                    className="cursor-grab active:cursor-grabbing transition-all active:scale-[0.98]"
                                >
                                    <TaskCard task={task} />
                                </div>
                            ))}

                            {columnTasks.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-40 opacity-20 italic">
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
    );
}
