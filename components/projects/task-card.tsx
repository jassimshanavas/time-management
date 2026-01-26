'use client';

import { Task } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Clock, MessageSquare, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TaskCardProps {
    task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
    return (
        <div className="group bg-background/60 backdrop-blur-md p-3 rounded-xl border border-primary/5 hover:border-primary/20 hover:shadow-lg transition-all duration-300 cursor-grab active:cursor-grabbing mb-3 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-2">
                <Badge
                    variant="outline"
                    className={cn(
                        "text-[8px] font-black px-1.5 py-0 h-4 rounded-md uppercase tracking-widest border-transparent bg-muted/50",
                        task.tags?.[0]?.toLowerCase() === 'planning' && "bg-blue-500/10 text-blue-500",
                        task.tags?.[0]?.toLowerCase() === 'ux design' && "bg-orange-500/10 text-orange-500",
                        task.tags?.[0]?.toLowerCase() === 'ux research' && "bg-purple-500/10 text-purple-500",
                    )}
                >
                    {task.tags?.[0] || 'Uncategorized'}
                </Badge>
                <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    {task.deadline && (
                        <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-tighter">
                            <Clock className="h-2.5 w-2.5" />
                            {task.status === 'done' ? 'Done' : format(new Date(task.deadline), 'MMM d')}
                        </div>
                    )}
                </div>
            </div>

            <h3 className="font-bold text-xs leading-tight mb-3 group-hover:text-primary transition-colors line-clamp-2 tracking-tight">
                {task.title}
            </h3>

            {/* Optional visualization for UX tasks */}
            {task.title.toLowerCase().includes('ux') && (
                <div className="grid grid-cols-2 gap-1.5 mb-3 opacity-80 group-hover:opacity-100 transition-opacity">
                    <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/5 flex items-center justify-center">
                        <div className="w-1/2 h-0.5 bg-primary/20 rounded-full" />
                    </div>
                    <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-sky-500/10 to-transparent border border-sky-500/10 flex items-center justify-center">
                        <div className="w-1/3 h-0.5 bg-sky-500/30 rounded-full" />
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-primary/5">
                <div className="flex items-center gap-2 text-muted-foreground/50">
                    <div className="flex items-center gap-1 hover:text-primary transition-colors">
                        <MessageSquare className="h-3 w-3" />
                        <span className="text-[8px] font-black">2</span>
                    </div>
                </div>

                <div className="flex -space-x-1.5">
                    {[1, 2].map((i) => (
                        <Avatar key={i} className="h-5 w-5 ring-2 ring-background border-none shadow-sm">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Assignee${i + (parseInt(task.id.slice(-1)) || 0)}`} />
                            <AvatarFallback className="text-[6px]">A</AvatarFallback>
                        </Avatar>
                    ))}
                </div>
            </div>
        </div>
    );
}
