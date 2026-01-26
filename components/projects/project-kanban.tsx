'use client';

import { Task } from '@/types';
import { TaskCard } from './task-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CreateTaskDialog } from '../tasks/create-task-dialog';
import { TaskStatus } from '@/types';

interface ProjectKanbanProps {
    projectId: string;
    tasks: Task[];
}

const COLUMNS = [
    { id: 'todo', title: 'To Do', color: 'border-slate-200' },
    { id: 'in-progress', title: 'In Progress', color: 'border-blue-500' },
    { id: 'in-review', title: 'In Review', color: 'border-orange-500' },
    { id: 'done', title: 'Completed', color: 'border-green-500' },
] as const;

export function ProjectKanban({ projectId, tasks }: ProjectKanbanProps) {
    const getTasksByStatus = (status: string) => {
        // Mapping our simple TaskStatus to the 4 columns
        // We treat 'in-review' as empty for now until we add status
        if (status === 'in-review') return [];
        return tasks.filter((t) => t.status === status);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[calc(100vh-320px)] min-h-[500px]">
            {COLUMNS.map((column) => {
                const columnTasks = getTasksByStatus(column.id);

                return (
                    <div key={column.id} className="flex flex-col h-full min-w-[300px]">
                        <div className={cn(
                            "flex items-center justify-between mb-4 pb-2 border-b-2",
                            column.color
                        )}>
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    {column.title}
                                </h3>
                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 rounded-lg h-6 min-w-6 flex items-center justify-center border-none">
                                    {columnTasks.length}
                                </Badge>
                            </div>
                            <CreateTaskDialog projectId={projectId} defaultStatus={column.id === 'in-review' ? 'in-progress' : column.id as TaskStatus}>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </CreateTaskDialog>
                        </div>

                        <ScrollArea className="flex-1 pr-4 -mr-4">
                            <div className="space-y-4 pb-4">
                                {columnTasks.map((task) => (
                                    <TaskCard key={task.id} task={task} />
                                ))}

                                {columnTasks.length === 0 && (
                                    <div className="border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center opacity-40">
                                        <div className="h-10 w-10 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center mb-3">
                                            <Plus className="h-5 w-5" />
                                        </div>
                                        <p className="text-xs font-medium">No tasks yet</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                );
            })}
        </div>
    );
}
