'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/store';
import { format, isToday, isPast, isBefore } from 'date-fns';
import { Calendar, AlertTriangle, CheckCircle2, Flame, Bell } from 'lucide-react';
import { ProjectBadge } from '@/components/projects/project-badge';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';

export default function TodayPage() {
    const { tasks, habits, reminders, updateTask, toggleHabitCompletion } = useStore();

    const today = new Date();
    const todayStr = today.toDateString();

    // Filter overdue tasks
    const overdueTasks = tasks.filter(
        (task) =>
            task.status !== 'done' &&
            task.deadline &&
            isBefore(new Date(task.deadline), today) &&
            !isToday(new Date(task.deadline))
    );

    // Filter today's tasks
    const todayTasks = tasks.filter(
        (task) =>
            task.status !== 'done' &&
            task.deadline &&
            isToday(new Date(task.deadline))
    );

    // Filter today's habits (not yet completed)
    const todayHabits = habits.filter((habit) => {
        const isCompletedToday = habit.completedDates.some(
            (date) => new Date(date).toDateString() === todayStr
        );
        return !isCompletedToday;
    });

    // Filter today's reminders
    const todayReminders = reminders.filter(
        (reminder) =>
            !reminder.completed &&
            reminder.dueDate &&
            isToday(new Date(reminder.dueDate))
    );

    // Calculate progress
    const totalTasks = todayTasks.length + overdueTasks.length;
    const completedToday = tasks.filter(
        (task) =>
            task.status === 'done' &&
            task.updatedAt &&
            isToday(new Date(task.updatedAt))
    ).length;

    const completionPercentage = totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0;

    return (
        <ProtectedRoute>
            <DataLoader>
                <MainLayout>
                    <div className="space-y-6 max-w-5xl mx-auto p-6">
                        {/* Header */}
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Today</h1>
                            <p className="text-muted-foreground">{format(today, 'EEEE, MMMM d, yyyy')}</p>
                        </div>

                        {/* Progress Overview */}
                        {totalTasks > 0 && (
                            <Card className="border-2 border-primary/20 shadow-lg">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h2 className="text-2xl font-bold">Daily Progress</h2>
                                            <p className="text-sm text-muted-foreground">
                                                {completedToday} of {totalTasks} tasks completed
                                            </p>
                                        </div>
                                        <div className="text-4xl font-bold text-primary">{completionPercentage}%</div>
                                    </div>
                                    <Progress value={completionPercentage} className="h-3" />
                                </CardContent>
                            </Card>
                        )}

                        {/* Overdue Tasks */}
                        {overdueTasks.length > 0 && (
                            <Card className="border-red-200 dark:border-red-900">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                        <AlertTriangle className="h-5 w-5" />
                                        Overdue Tasks ({overdueTasks.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {overdueTasks.map((task) => (
                                        <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                                            <Checkbox
                                                checked={false}
                                                onCheckedChange={() => updateTask(task.id, { status: 'done' })}
                                            />
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-medium">{task.title}</p>
                                                    {task.projectId && <ProjectBadge projectId={task.projectId} />}
                                                    <Badge variant="destructive" className="text-xs">{task.priority}</Badge>
                                                </div>
                                                {task.deadline && (
                                                    <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        Due {format(new Date(task.deadline), 'MMM d')} (
                                                        {Math.abs(Math.ceil((new Date(task.deadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))} days ago)
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Today's Tasks */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    Today's Tasks ({todayTasks.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {todayTasks.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No tasks due today. Great job staying on top of things! 🎉
                                    </p>
                                ) : (
                                    todayTasks.map((task) => (
                                        <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                                            <Checkbox
                                                checked={task.status === 'done'}
                                                onCheckedChange={() =>
                                                    updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })
                                                }
                                            />
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-medium">{task.title}</p>
                                                    {task.projectId && <ProjectBadge projectId={task.projectId} />}
                                                    <Badge className="text-xs">{task.priority}</Badge>
                                                </div>
                                                {task.description && (
                                                    <p className="text-sm text-muted-foreground">{task.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Today's Habits */}
                        {todayHabits.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Flame className="h-5 w-5 text-orange-500" />
                                        Daily Habits ({todayHabits.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {todayHabits.map((habit) => (
                                        <div key={habit.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                                            <Checkbox
                                                checked={false}
                                                onCheckedChange={() => toggleHabitCompletion(habit.id, today)}
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium">{habit.title}</p>
                                                    {habit.projectId && <ProjectBadge projectId={habit.projectId} />}
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    🔥 {habit.streak} day streak
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Today's Reminders */}
                        {todayReminders.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Bell className="h-5 w-5 text-blue-500" />
                                        Reminders ({todayReminders.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {todayReminders.map((reminder) => (
                                        <div key={reminder.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium">{reminder.title}</p>
                                                    {reminder.projectId && <ProjectBadge projectId={reminder.projectId} />}
                                                </div>
                                                {reminder.description && (
                                                    <p className="text-sm text-muted-foreground">{reminder.description}</p>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {format(new Date(reminder.dueDate), 'h:mm a')}
                                            </p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Empty State */}
                        {totalTasks === 0 && todayHabits.length === 0 && todayReminders.length === 0 && (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
                                    <h3 className="text-xl font-bold mb-2">All Clear!</h3>
                                    <p className="text-muted-foreground">
                                        You have nothing scheduled for today. Enjoy your free time! ✨
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </MainLayout>
            </DataLoader>
        </ProtectedRoute>
    );
}
