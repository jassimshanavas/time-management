'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserStats } from '@/types/gamification';
import { CheckSquare, TrendingUp, Target, Clock } from 'lucide-react';

interface StatsCardProps {
    stats: UserStats;
}

export function StatsCard({ stats }: StatsCardProps) {
    const statItems = [
        {
            icon: CheckSquare,
            label: 'Tasks Completed',
            value: stats.totalTasksCompleted,
            color: 'text-violet-500',
        },
        {
            icon: TrendingUp,
            label: 'Habits Tracked',
            value: stats.totalHabitsCompleted,
            color: 'text-green-500',
        },
        {
            icon: Target,
            label: 'Goals Achieved',
            value: stats.totalGoalsCompleted,
            color: 'text-emerald-500',
        },
        {
            icon: Clock,
            label: 'Hours Tracked',
            value: Math.floor(stats.totalTimeTracked / 60),
            color: 'text-blue-500',
        },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Your Statistics</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    {statItems.map((item) => (
                        <div key={item.label} className="space-y-2">
                            <div className="flex items-center gap-2">
                                <item.icon className={`h-5 w-5 ${item.color}`} />
                                <span className="text-sm text-muted-foreground">{item.label}</span>
                            </div>
                            <p className="text-2xl font-bold">{item.value.toLocaleString()}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-6 border-t space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Streak</span>
                        <span className="font-semibold">🔥 {stats.currentStreak} days</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Longest Streak</span>
                        <span className="font-semibold">⭐ {stats.longestStreak} days</span>
                    </div>
                    {stats.earlyBirdTasks > 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Early Bird Tasks</span>
                            <span className="font-semibold">🌅 {stats.earlyBirdTasks}</span>
                        </div>
                    )}
                    {stats.nightOwlTasks > 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Night Owl Tasks</span>
                            <span className="font-semibold">🦉 {stats.nightOwlTasks}</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
