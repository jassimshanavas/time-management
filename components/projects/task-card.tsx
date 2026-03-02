import { useRouter } from 'next/navigation';
import { Task } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Zap, BatteryLow, BatteryMedium, BatteryFull, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useStore } from '@/lib/store';
import { motion } from 'framer-motion';

interface TaskCardProps {
    task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
    const router = useRouter();
    const { updateTask } = useStore();

    // Aging logic
    const ageInDays = task.lastStatusChange ? differenceInDays(new Date(), new Date(task.lastStatusChange)) : 0;
    const isOld = ageInDays > 3 && task.status !== 'done';
    const isAncient = ageInDays > 7 && task.status !== 'done';

    const getEnergyIcon = () => {
        switch (task.energyLevel) {
            case 'low': return <BatteryLow className="h-3 w-3 text-blue-400" />;
            case 'medium': return <BatteryMedium className="h-3 w-3 text-amber-400" />;
            case 'high': return <BatteryFull className="h-3 w-3 text-rose-400" />;
            default: return <Zap className="h-3 w-3 opacity-30" />;
        }
    };

    return (
        <motion.div
            layout
            whileHover={{ y: -4, scale: 1.01 }}
            className={cn(
                "group relative flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-500 cursor-pointer overflow-hidden",
                "bg-background/40 backdrop-blur-xl hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]",
                task.status === 'done' ? "opacity-60 grayscale-[0.5]" : "opacity-100",
                isOld && "border-amber-500/20 bg-amber-500/[0.02]",
                isAncient && "border-rose-500/20 bg-rose-500/[0.02] grayscale"
            )}
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if (!target.closest('button') && !target.closest('.check-box')) {
                    router.push(`/tasks/${task.id}?fromView=kanban&fromProject=${task.projectId}&fromTab=tasks`);
                }
            }}
        >
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            {/* Aging Indicator */}
            {(isOld || isAncient) && (
                <div className="absolute top-0 right-0 p-2 flex items-center gap-1">
                    <AlertTriangle className={cn("h-3 w-3", isAncient ? "text-rose-500" : "text-amber-500")} />
                    <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">
                        {ageInDays}d Unchanged
                    </span>
                </div>
            )}

            {/* Priority indicator bar */}
            <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1",
                task.priority === 'high' ? 'bg-gradient-to-b from-rose-500 to-rose-600' :
                    task.priority === 'medium' ? 'bg-gradient-to-b from-amber-500 to-amber-600' :
                        'bg-gradient-to-b from-blue-500 to-blue-600'
            )} />

            <div className="flex items-start justify-between gap-3 relative z-10">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[7px] px-1.5 py-0 h-4 uppercase tracking-[0.1em] font-black border-none",
                                task.priority === 'high' ? "bg-rose-500 text-white" :
                                    task.priority === 'medium' ? "bg-amber-500 text-black" :
                                        "bg-blue-500 text-white"
                            )}
                        >
                            {task.priority}
                        </Badge>
                        <div className="flex items-center gap-1 px-1.5 py-0 h-4 rounded-full bg-white/5 border border-white/10">
                            {getEnergyIcon()}
                            <span className="text-[7px] font-black uppercase tracking-widest opacity-60">
                                {task.energyLevel || 'Energy'}
                            </span>
                        </div>
                    </div>
                    <h3 className={cn(
                        "font-black text-sm leading-snug group-hover:text-primary transition-all line-clamp-2 tracking-tight uppercase",
                        task.status === 'done' && "line-through opacity-40"
                    )}>
                        {task.title}
                    </h3>
                </div>

                <div className="flex items-center shrink-0 pt-0.5">
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            const nextStatus = task.status === 'done' ? 'todo' : 'done';
                            updateTask(task.id, {
                                status: nextStatus as any,
                                lastStatusChange: new Date()
                            });
                        }}
                        className={cn(
                            "check-box w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all duration-500 relative",
                            task.status === 'done'
                                ? 'bg-emerald-500 border-emerald-400 rotate-0 scale-110 shadow-[0_0_20px_rgba(16,185,129,0.6)]'
                                : task.status === 'in-progress'
                                    ? 'bg-blue-500 border-blue-400 animate-pulse'
                                    : 'border-white/10 hover:border-primary/50 bg-white/5 hover:scale-110'
                        )}
                    >
                        {task.status === 'done' && (
                            <motion.svg
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-3.5 h-3.5 text-black font-black"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="4"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path d="M5 13l4 4L19 7"></path>
                            </motion.svg>
                        )}
                    </div>
                </div>
            </div>

            {task.coverImage && (
                <div className="w-full h-28 overflow-hidden rounded-xl border border-white/5 my-1 relative group/img">
                    <img
                        src={task.coverImage}
                        alt={task.title}
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
                </div>
            )}

            <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5 relative z-10">
                <div className="flex items-center gap-3">
                    {task.deadline && (
                        <div className={cn(
                            "flex items-center text-[8px] font-black uppercase tracking-widest",
                            differenceInDays(new Date(task.deadline), new Date()) < 2 ? "text-rose-400" : "text-muted-foreground/40"
                        )}>
                            <Clock className="h-3 w-3 mr-1 opacity-50" />
                            {format(new Date(task.deadline), 'MMM d')}
                        </div>
                    )}
                    {task.updatedAt && (
                        <div className="flex items-center text-[8px] font-black uppercase tracking-widest text-muted-foreground/20">
                            <Zap className="h-3 w-3 mr-1" />
                            Active
                        </div>
                    )}
                </div>

                <div className="flex -space-x-1.5">
                    {task.assignedTo?.map((userId, i) => (
                        <Avatar key={userId} className="h-5 w-5 ring-2 ring-[#0a0a0a] border-none shadow-xl transition-transform hover:scale-125 hover:z-50">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`} />
                            <AvatarFallback className="text-[6px] bg-primary text-primary-foreground font-black">U</AvatarFallback>
                        </Avatar>
                    ))}
                    {(!task.assignedTo || task.assignedTo.length === 0) && (
                        <div className="h-5 w-5 rounded-full bg-white/5 border border-dashed border-white/10 flex items-center justify-center">
                            <Users className="h-2.5 w-2.5 text-white/20" />
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

