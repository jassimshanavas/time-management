'use client';

import { useRouter } from 'next/navigation';
import { Task } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useStore } from '@/lib/store';

interface TaskCardProps {
    task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
    const router = useRouter();
    const { updateTask } = useStore();

    return (
        <div
            className="group relative flex flex-col gap-3 p-4 rounded-xl border bg-background/40 backdrop-blur-md hover:border-primary/20 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if (!target.closest('button')) {
                    router.push(`/tasks/${task.id}?fromView=kanban&fromProject=${task.projectId}&fromTab=tasks`);
                }
            }}
        >
            {/* Priority indicator bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${task.priority === 'high' ? 'bg-rose-500' :
                task.priority === 'medium' ? 'bg-amber-500' :
                    'bg-blue-500'
                }`} />

            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[8px] px-1 py-0 h-3.5 uppercase tracking-widest font-black border-transparent",
                                task.priority === 'high' ? "bg-rose-500/10 text-rose-500" :
                                    task.priority === 'medium' ? "bg-amber-500/10 text-amber-500" :
                                        "bg-blue-500/10 text-blue-500"
                            )}
                        >
                            {task.priority}
                        </Badge>
                        {task.tags?.map(tag => (
                            <Badge key={tag} variant="outline" className="text-[8px] px-1 py-0 h-3.5 uppercase tracking-widest font-black bg-muted/50 border-transparent">
                                {tag}
                            </Badge>
                        ))}
                    </div>
                    <h3 className={cn(
                        "font-bold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2 tracking-tight",
                        task.status === 'done' && "line-through text-muted-foreground/60"
                    )}>
                        {task.title}
                    </h3>
                </div>

                <div className="flex items-center shrink-0 pt-0.5">
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            const nextStatus = task.status === 'done' ? 'todo' : 'done';
                            updateTask(task.id, { status: nextStatus as any });
                        }}
                        className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                            task.status === 'done'
                                ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                : task.status === 'in-progress'
                                    ? 'bg-blue-500 border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                                    : 'border-muted-foreground/30 hover:border-primary/50'
                        )}
                    >
                        {task.status === 'done' && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M5 13l4 4L19 7"></path>
                            </svg>
                        )}
                        {task.status === 'in-progress' && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        )}
                    </div>
                </div>
            </div>

            {task.coverImage && (
                <div className="w-full h-24 overflow-hidden rounded-lg border border-primary/5 my-1">
                    <img
                        src={task.coverImage}
                        alt={task.title}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500"
                    />
                </div>
            )}

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-primary/5">
                <div className="flex items-center gap-3">
                    {task.deadline && (
                        <div className="flex items-center text-[9px] font-black uppercase tracking-tighter text-muted-foreground/60">
                            <Clock className="h-3 w-3 mr-1 opacity-50" />
                            {format(new Date(task.deadline), 'MMM d')}
                        </div>
                    )}
                    {task.estimatedDuration && (
                        <div className="flex items-center text-[9px] font-black uppercase tracking-tighter text-muted-foreground/60">
                            <Clock className="h-3 w-3 mr-1 opacity-50" />
                            {task.estimatedDuration}m
                        </div>
                    )}
                </div>

                <div className="flex -space-x-2">
                    {task.assignedTo?.map((userId, i) => (
                        <Avatar key={userId} className="h-6 w-6 ring-2 ring-background border-none shadow-sm">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`} />
                            <AvatarFallback className="text-[6px]">U</AvatarFallback>
                        </Avatar>
                    ))}
                    {(!task.assignedTo || task.assignedTo.length === 0) && (
                        <div className="h-6 w-6 rounded-full bg-muted/50 border border-dashed border-muted-foreground/20 flex items-center justify-center">
                            <Users className="h-3 w-3 text-muted-foreground/40" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
