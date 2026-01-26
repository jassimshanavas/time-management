'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/store';
import { CheckSquare, Bell, Target, TrendingUp, Clock, Calendar, Plus } from 'lucide-react';
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">Welcome back! Here&apos;s your productivity overview.</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-lg font-semibold">{format(new Date(), 'EEEE, MMMM d')}</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{filteredTasks.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {completedTasks} completed
                  </p>
                  <Progress value={taskCompletionRate} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{filteredGoals.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {filteredGoals.filter((g) => g.progress >= 50).length} on track
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Habit Streak</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredHabits.length > 0 ? Math.max(...filteredHabits.map((h) => h.streak), 0) : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">days longest streak</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Time Today</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.floor(totalTimeToday / 60)}h {totalTimeToday % 60}m
                  </div>
                  <p className="text-xs text-muted-foreground">tracked time</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Today's Tasks */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Today&apos;s Tasks</CardTitle>
                  <Link href="/tasks">
                    <Button size="sm" variant="ghost">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  {todayTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tasks for today</p>
                  ) : (
                    todayTasks.map((task) => (
                      <div key={task.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                        <div className="flex-1">
                          <p className="font-medium">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                              {task.priority}
                            </Badge>
                            {task.deadline && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(task.deadline), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <Link href="/tasks">
                    <Button variant="outline" className="w-full">View All Tasks</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Upcoming Reminders */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Upcoming Reminders</CardTitle>
                  <Link href="/reminders">
                    <Button size="sm" variant="ghost">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upcomingReminders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upcoming reminders</p>
                  ) : (
                    upcomingReminders.map((reminder) => (
                      <div key={reminder.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                        <Bell className="h-5 w-5 text-pink-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">{reminder.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(reminder.dueDate), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <Link href="/reminders">
                    <Button variant="outline" className="w-full">View All Reminders</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Active Goals */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Active Goals</CardTitle>
                  <Link href="/goals">
                    <Button size="sm" variant="ghost">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active goals</p>
                  ) : (
                    activeGoals.map((goal) => (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{goal.title}</p>
                          <span className="text-sm text-muted-foreground">{goal.progress}%</span>
                        </div>
                        <Progress value={goal.progress} />
                      </div>
                    ))
                  )}
                  <Link href="/goals">
                    <Button variant="outline" className="w-full">View All Goals</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Habits */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Today&apos;s Habits</CardTitle>
                  <Link href="/habits">
                    <Button size="sm" variant="ghost">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  {todayHabits.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No habits tracked</p>
                  ) : (
                    todayHabits.map((habit) => (
                      <div key={habit.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{habit.title}</p>
                          <p className="text-xs text-muted-foreground">
                            🔥 {habit.streak} day streak
                          </p>
                        </div>
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      </div>
                    ))
                  )}
                  <Link href="/habits">
                    <Button variant="outline" className="w-full">View All Habits</Button>
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
