'use client';

import { Task } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Calendar, MessageSquare, Paperclip, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TaskCardProps {
    task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
    return (
        <div className="group bg-background p-4 rounded-2xl border border-transparent hover:border-primary/20 hover:shadow-xl transition-all duration-300 cursor-grab active:cursor-grabbing mb-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-3">
                <Badge
                    variant="secondary"
                    className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                        task.tags?.[0]?.toLowerCase() === 'planning' && "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                        task.tags?.[0]?.toLowerCase() === 'ux design' && "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
                        task.tags?.[0]?.toLowerCase() === 'ux research' && "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
                    )}
                >
                    {task.tags?.[0] || 'General'}
                </Badge>
                <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    {task.deadline && (
                        <div className="flex items-center gap-1 text-[10px] font-medium">
                            <Calendar className="h-3 w-3" />
                            {task.status === 'done' ? 'Done' : format(new Date(task.deadline), 'MMM d')}
                        </div>
                    )}
                </div>
            </div>

            <h3 className="font-semibold text-sm leading-relaxed mb-4 group-hover:text-primary transition-colors line-clamp-2">
                {task.title}
            </h3>

            {/* Optional image placeholder or realistic asset if needed */}
            {task.title.includes('UX Process') && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/5 overflow-hidden">
                        <div className="w-full h-full bg-slate-200 animate-pulse" />
                    </div>
                    <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-sky-100 to-sky-50 border border-sky-100 overflow-hidden">
                        <div className="w-full h-full bg-slate-100 animate-pulse" />
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex items-center gap-1 hex-sm font-medium hover:text-foreground transition-colors">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="text-[10px]">8</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-medium hover:text-foreground transition-colors">
                        <Paperclip className="h-3.5 w-3.5" />
                        <span className="text-[10px]">4</span>
                    </div>
                </div>

                <div className="flex -space-x-2">
                    {[1, 2].map((i) => (
                        <Avatar key={i} className="h-6 w-6 ring-2 ring-background border-none">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Assignee${i + (parseInt(task.id.slice(-1)) || 0)}`} />
                            <AvatarFallback>A</AvatarFallback>
                        </Avatar>
                    ))}
                </div>
            </div>
        </div>
    );
}
