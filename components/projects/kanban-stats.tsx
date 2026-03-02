'use client';

import { Task } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    CheckCircle2,
    Timer,
    Zap,
    TrendingUp,
    Target
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { differenceInHours, isToday, subDays } from 'date-fns';

interface KanbanStatsProps {
    tasks: Task[];
}

export function KanbanStats({ tasks }: KanbanStatsProps) {
    const stats = useMemo(() => {
        const doneTasks = tasks.filter(t => t.status === 'done');
        const activeTasks = tasks.filter(t => t.status === 'in-progress');
        const todayDone = doneTasks.filter(t => t.updatedAt && isToday(new Date(t.updatedAt))).length;

        // Calculate Throughput (last 7 days)
        const last7Days = subDays(new Date(), 7);
        const throughput = doneTasks.filter(t => t.updatedAt && new Date(t.updatedAt) > last7Days).length;

        // Calculate Average Cycle Time (mock logic if lastStatusChange is missing)
        const cycleTimes = doneTasks.map(t => {
            const start = t.createdAt ? new Date(t.createdAt) : new Date();
            const end = t.updatedAt ? new Date(t.updatedAt) : new Date();
            return differenceInHours(end, start);
        }).filter(h => h > 0);

        const avgCycle = cycleTimes.length > 0
            ? (cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length).toFixed(1)
            : '0';

        // Focus Score: High Priority vs All Done
        const highPriorityDone = doneTasks.filter(t => t.priority === 'high').length;
        const focusScore = doneTasks.length > 0
            ? Math.round((highPriorityDone / doneTasks.length) * 100)
            : 0;

        return {
            throughput,
            todayDone,
            activeCount: activeTasks.length,
            avgCycle,
            focusScore
        };
    }, [tasks]);

    const statItems = [
        {
            label: 'Velocity',
            value: stats.throughput,
            sub: 'tasks/week',
            icon: Activity,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            label: 'Cycle Time',
            value: `${stats.avgCycle}h`,
            sub: 'avg. completion',
            icon: Timer,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10'
        },
        {
            label: 'Focus Score',
            value: `${stats.focusScore}%`,
            sub: 'high priority skew',
            icon: Target,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        },
        {
            label: 'Output',
            value: stats.todayDone,
            sub: 'completed today',
            icon: CheckCircle2,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10'
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {statItems.map((item, index) => (
                <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <Card className="relative overflow-hidden border-primary/5 bg-background/40 backdrop-blur-xl group hover:border-primary/20 transition-all duration-500">
                        <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform duration-500 ${item.color}`}>
                            <item.icon size={48} />
                        </div>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={`p-1.5 rounded-lg ${item.bg}`}>
                                    <item.icon className={`h-4 w-4 ${item.color}`} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                    {item.label}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-black tracking-tighter">
                                    {item.value}
                                </span>
                                <span className="text-[9px] font-medium text-muted-foreground/60 uppercase">
                                    {item.sub}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
}
