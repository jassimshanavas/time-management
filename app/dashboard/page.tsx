'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/store';
import { CheckSquare, Bell, Target, TrendingUp, Clock, Calendar, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';

export default function DashboardPage() {
  const { tasks, reminders, goals, habits, timeEntries, projects, selectedProjectId } = useStore();

  const filterByWorkspace = <T extends { projectId?: string }>(items: T[]) => {
    if (selectedProjectId === null) return items;
    if (selectedProjectId === 'personal') return items.filter((item) => !item.projectId);
    return items.filter((item) => item.projectId === selectedProjectId);
  };

  const filteredTasks = filterByWorkspace(tasks);
  const filteredReminders = filterByWorkspace(reminders);
  const filteredGoals = filterByWorkspace(goals);
  const filteredHabits = filterByWorkspace(habits);
  const filteredTimeEntries = filterByWorkspace(timeEntries);

  const todayTasks = filteredTasks.filter((t) => t.status !== 'done').slice(0, 3);
  const upcomingReminders = filteredReminders.filter((r) => !r.completed).slice(0, 3);
  const activeGoals = filteredGoals.slice(0, 2);
  const todayHabits = filteredHabits.slice(0, 3);

  const completedTasks = filteredTasks.filter((t) => t.status === 'done').length;
  const totalTasks = filteredTasks.length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalTimeToday = filteredTimeEntries
    .filter((entry) => {
      const entryDate = new Date(entry.startTime);
      const today = new Date();
      return entryDate.toDateString() === today.toDateString();
    })
    .reduce((acc, entry) => acc + (entry.duration || 0), 0);

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-muted-foreground">Welcome back! Here&apos;s your productivity overview.</p>
              </div>
              <div className="flex flex-col sm:items-end">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Today</p>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/40 backdrop-blur-md border border-primary/10 shadow-lg">
                  <Calendar className="h-4 w-4 text-primary" />
                  <p className="text-sm font-bold">{format(new Date(), 'EEEE, MMMM d')}</p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Card className="bg-background/40 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all duration-300 group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Tasks</CardTitle>
                  <CheckSquare className="h-4 w-4 text-violet-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{filteredTasks.length}</div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-muted-foreground sm:text-xs">
                      {completedTasks} completed
                    </p>
                    <span className="text-[10px] font-bold text-violet-500">{taskCompletionRate}%</span>
                  </div>
                  <Progress value={taskCompletionRate} className="mt-3 h-1.5" />
                </CardContent>
              </Card>

              <Card className="bg-background/40 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all duration-300 group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Goals</CardTitle>
                  <Target className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{filteredGoals.length}</div>
                  <p className="text-[10px] text-muted-foreground sm:text-xs mt-1">
                    {filteredGoals.filter((g) => g.progress >= 50).length} on track
                  </p>
                  <div className="mt-3 flex gap-1">
                    {activeGoals.map((g, i) => (
                      <div key={i} className="h-1.5 flex-1 rounded-full bg-emerald-500/20 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${g.progress}%` }} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background/40 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all duration-300 group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Habit Streak</CardTitle>
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {filteredHabits.length > 0 ? Math.max(...filteredHabits.map((h) => h.streak), 0) : 0}
                  </div>
                  <p className="text-[10px] text-muted-foreground sm:text-xs mt-1">days longest streak</p>
                  <div className="mt-3 flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((_, i) => (
                      <div key={i} className={`h-1.5 w-1.5 rounded-full ${i < 3 ? 'bg-amber-500' : 'bg-amber-500/20'}`} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-background/40 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all duration-300 group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time Today</CardTitle>
                  <Clock className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {Math.floor(totalTimeToday / 60)}<span className="text-lg font-medium text-muted-foreground mx-0.5">h</span>{' '}
                    {totalTimeToday % 60}<span className="text-lg font-medium text-muted-foreground mx-0.5">m</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground sm:text-xs mt-1">tracked productivity</p>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-blue-500/20 overflow-hidden">
                    <div className="h-full bg-blue-500 animate-pulse" style={{ width: '65%' }} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Today's Tasks */}
              <Card className="bg-background/40 backdrop-blur-sm border-primary/10 shadow-xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-primary/5 bg-muted/50">
                  <div>
                    <CardTitle className="text-lg">Today&apos;s Tasks</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Focus on these items</p>
                  </div>
                  <Link href="/tasks">
                    <Button size="sm" variant="outline" className="h-8 bg-background/50">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Task
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {todayTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-xl border border-dashed">
                      <CheckSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">All caught up!</p>
                    </div>
                  ) : (
                    todayTasks.map((task) => (
                      <div key={task.id} className="group flex items-center gap-3 p-3 rounded-xl border bg-background/50 hover:border-primary/30 transition-all">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <CheckSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0 h-4">
                              {task.priority}
                            </Badge>
                            {task.deadline && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                <Clock className="h-3 w-3" />
                                {format(new Date(task.deadline), 'MMM d')}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                  <Link href="/tasks">
                    <Button variant="ghost" className="w-full text-xs hover:bg-muted/50 mt-2">
                      View All Tasks <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Upcoming Reminders */}
              <Card className="bg-background/40 backdrop-blur-sm border-primary/10 shadow-xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-primary/5 bg-muted/50">
                  <div>
                    <CardTitle className="text-lg">Upcoming Reminders</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Don&apos;t miss these</p>
                  </div>
                  <Link href="/reminders">
                    <Button size="sm" variant="outline" className="h-8 bg-background/50">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Reminder
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {upcomingReminders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-xl border border-dashed">
                      <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No reminders pending</p>
                    </div>
                  ) : (
                    upcomingReminders.map((reminder) => (
                      <div key={reminder.id} className="group flex items-center gap-3 p-3 rounded-xl border bg-background/50 hover:border-pink-500/30 transition-all">
                        <div className="h-8 w-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center shrink-0">
                          <Bell className="h-4 w-4 text-pink-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{reminder.title}</p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                            {format(new Date(reminder.dueDate), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <Link href="/reminders">
                    <Button variant="ghost" className="w-full text-xs hover:bg-muted/50 mt-2">
                      View All Reminders <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Active Goals */}
              <Card className="bg-background/40 backdrop-blur-sm border-primary/10 shadow-xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-primary/5 bg-muted/50">
                  <div>
                    <CardTitle className="text-lg">Active Goals</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Long-term vision</p>
                  </div>
                  <Link href="/goals">
                    <Button size="sm" variant="outline" className="h-8 bg-background/50">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Goal
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {activeGoals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-xl border border-dashed">
                      <Target className="h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">Set your first goal</p>
                    </div>
                  ) : (
                    activeGoals.map((goal) => (
                      <div key={goal.id} className="space-y-2 p-3 rounded-xl bg-background/30 border border-primary/5">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm">{goal.title}</p>
                          <Badge variant="outline" className="h-5 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            {goal.progress}%
                          </Badge>
                        </div>
                        <Progress value={goal.progress} className="h-2 rounded-full" />
                      </div>
                    ))
                  )}
                  <Link href="/goals">
                    <Button variant="ghost" className="w-full text-xs hover:bg-muted/50">
                      View All Goals <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Habits */}
              <Card className="bg-background/40 backdrop-blur-sm border-primary/10 shadow-xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-primary/5 bg-muted/50">
                  <div>
                    <CardTitle className="text-lg">Today&apos;s Habits</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Consistency is key</p>
                  </div>
                  <Link href="/habits">
                    <Button size="sm" variant="outline" className="h-8 bg-background/50">
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      New Habit
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {todayHabits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-xl border border-dashed">
                      <TrendingUp className="h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">Start a habit today</p>
                    </div>
                  ) : (
                    todayHabits.map((habit) => (
                      <div key={habit.id} className="flex items-center justify-between p-3 rounded-xl border bg-background/50 hover:border-amber-500/30 transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                            <TrendingUp className="h-4 w-4 text-amber-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{habit.title}</p>
                            <p className="text-[10px] text-muted-foreground font-medium">
                              🔥 {habit.streak} day streak
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold">Check</Button>
                      </div>
                    ))
                  )}
                  <Link href="/habits">
                    <Button variant="ghost" className="w-full text-xs hover:bg-muted/50 mt-2">
                      View All Habits <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute>
  );
}
