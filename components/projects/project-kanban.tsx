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
        <div className="h-[calc(100vh-320px)] min-h-[500px]">
            <div className="flex lg:grid lg:grid-cols-4 gap-4 lg:gap-6 h-full overflow-x-auto lg:overflow-x-visible pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {COLUMNS.map((column) => {
                    const columnTasks = getTasksByStatus(column.id);

                    return (
                        <div key={column.id} className="flex flex-col h-full min-w-[280px] sm:min-w-[300px] flex-shrink-0 lg:flex-shrink">
                            <div className={cn(
                                "flex items-center justify-between mb-4 pb-2 border-b-2 transition-colors duration-300",
                                column.color
                            )}>
                                <div className="flex items-center gap-2.5">
                                    <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground/80">
                                        {column.title}
                                    </h3>
                                    <Badge variant="secondary" className="bg-muted/50 text-muted-foreground font-black text-[10px] h-5 min-w-5 flex items-center justify-center border-none">
                                        {columnTasks.length}
                                    </Badge>
                                </div>
                                <CreateTaskDialog projectId={projectId} defaultStatus={column.id === 'in-review' ? 'in-progress' : column.id as TaskStatus}>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary rounded-lg transition-all active:scale-95">
                                        <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                </CreateTaskDialog>
                            </div>

                            <ScrollArea className="flex-1 pr-1 -mr-1">
                                <div className="space-y-3 pb-4">
                                    {columnTasks.map((task) => (
                                        <div key={task.id} className="transform transition-all active:scale-[0.98]">
                                            <TaskCard task={task} />
                                        </div>
                                    ))}

                                    {columnTasks.length === 0 && (
                                        <div className="border-2 border-dashed border-primary/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center opacity-30 group hover:opacity-50 transition-opacity">
                                            <div className="h-9 w-9 bg-muted/50 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                <Plus className="h-4 w-4" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Input</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
