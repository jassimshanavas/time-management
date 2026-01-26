'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/lib/store';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Target, CheckSquare, Clock } from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';

export default function AnalyticsPage() {
  const { tasks, goals, habits, timeEntries } = useStore();

  // Task Analytics
  const tasksByStatus = {
    todo: tasks.filter((t) => t.status === 'todo').length,
    'in-progress': tasks.filter((t) => t.status === 'in-progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };

  const taskStatusData = [
    { name: 'To Do', value: tasksByStatus.todo, color: '#6366f1' },
    { name: 'In Progress', value: tasksByStatus['in-progress'], color: '#f59e0b' },
    { name: 'Done', value: tasksByStatus.done, color: '#10b981' },
  ];

  const tasksByPriority = {
    low: tasks.filter((t) => t.priority === 'low').length,
    medium: tasks.filter((t) => t.priority === 'medium').length,
    high: tasks.filter((t) => t.priority === 'high').length,
  };

  const taskPriorityData = [
    { name: 'Low', value: tasksByPriority.low },
    { name: 'Medium', value: tasksByPriority.medium },
    { name: 'High', value: tasksByPriority.high },
  ];

  // Goal Progress
  const goalProgressData = goals.map((goal) => ({
    name: goal.title.length > 20 ? goal.title.substring(0, 20) + '...' : goal.title,
    progress: goal.progress,
  }));

  // Habit Streaks
  const habitStreakData = habits.map((habit) => ({
    name: habit.title.length > 15 ? habit.title.substring(0, 15) + '...' : habit.title,
    current: habit.streak,
    longest: habit.longestStreak,
  }));

  // Time Tracking by Category
  const timeByCategoryData = Object.entries(
    timeEntries.reduce((acc, entry) => {
      if (entry.duration) {
        acc[entry.category] = (acc[entry.category] || 0) + entry.duration;
      }
      return acc;
    }, {} as Record<string, number>)
  ).map(([category, duration]) => ({
    name: category,
    hours: Math.round((duration / 60) * 10) / 10,
  }));

  // Completion Rate
  const completionRate = tasks.length > 0
    ? Math.round((tasksByStatus.done / tasks.length) * 100)
    : 0;

  const avgGoalProgress = goals.length > 0
    ? Math.round(goals.reduce((acc, g) => acc + g.progress, 0) / goals.length)
    : 0;

  const totalHabitStreak = habits.reduce((acc, h) => acc + h.streak, 0);

  const totalTimeTracked = timeEntries.reduce((acc, e) => acc + (e.duration || 0), 0);

  const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4'];

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                Analytics
              </h1>
              <p className="text-muted-foreground">Insights into your productivity and growth</p>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Card className="bg-background/40 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all duration-300 shadow-lg group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">Task Completion</CardTitle>
                  <CheckSquare className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-black text-primary leading-none">{completionRate}%</div>
                  <p className="text-[10px] sm:text-xs font-bold text-muted-foreground/60 uppercase mt-2">
                    {tasksByStatus.done} of {tasks.length} tasks
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background/40 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all duration-300 shadow-lg group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">Avg Goal Progress</CardTitle>
                  <Target className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{avgGoalProgress}%</div>
                  <p className="text-[10px] sm:text-xs font-bold text-muted-foreground/60 uppercase mt-2">
                    {goals.length} active goals
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background/40 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all duration-300 shadow-lg group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">Total Habit Streak</CardTitle>
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400 leading-none">{totalHabitStreak}</div>
                  <p className="text-[10px] sm:text-xs font-bold text-muted-foreground/60 uppercase mt-2">
                    Across {habits.length} habits
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-background/40 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all duration-300 shadow-lg group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">Time Tracked</CardTitle>
                  <Clock className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 leading-none">
                    {Math.floor(totalTimeTracked / 60)}<span className="text-lg">h</span> {totalTimeTracked % 60}<span className="text-lg">m</span>
                  </div>
                  <p className="text-[10px] sm:text-xs font-bold text-muted-foreground/60 uppercase mt-2">
                    {timeEntries.length} sessions
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Task Status Distribution */}
              <Card className="bg-background/40 backdrop-blur-xl border-primary/10 shadow-xl overflow-hidden group">
                <CardHeader className="bg-muted/30 border-b border-primary/5">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">Task Status Distribution</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={taskStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {taskStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Task Priority */}
              <Card className="bg-background/40 backdrop-blur-xl border-primary/10 shadow-xl overflow-hidden group">
                <CardHeader className="bg-muted/30 border-b border-primary/5">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">Tasks by Priority</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={taskPriorityData}>
                      <XAxis dataKey="name" fontSize={12} fontStyle="bold" />
                      <YAxis fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Goal Progress */}
              {goalProgressData.length > 0 && (
                <Card className="bg-background/40 backdrop-blur-xl border-primary/10 shadow-xl overflow-hidden group">
                  <CardHeader className="bg-muted/30 border-b border-primary/5">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider">Goal Progress (%)</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={goalProgressData} layout="vertical" margin={{ left: 20 }}>
                        <XAxis type="number" domain={[0, 100]} fontSize={10} />
                        <YAxis dataKey="name" type="category" width={100} fontSize={10} fontStyle="bold" />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar dataKey="progress" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Habit Streaks */}
              {habitStreakData.length > 0 && (
                <Card className="bg-background/40 backdrop-blur-xl border-primary/10 shadow-xl overflow-hidden group">
                  <CardHeader className="bg-muted/30 border-b border-primary/5">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider">Habit Consistency</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={habitStreakData} margin={{ bottom: 20 }}>
                        <XAxis dataKey="name" fontSize={10} angle={-45} textAnchor="end" height={60} fontStyle="bold" />
                        <YAxis fontSize={10} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                        />
                        <Legend verticalAlign="top" />
                        <Bar dataKey="current" fill="#f59e0b" name="Current Streak" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="longest" fill="#10b981" name="Longest Streak" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Time by Category */}
              {timeByCategoryData.length > 0 && (
                <Card className="md:col-span-2 bg-background/40 backdrop-blur-xl border-primary/10 shadow-xl overflow-hidden group">
                  <CardHeader className="bg-muted/30 border-b border-primary/5">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider">Time Investment by Category (Hours)</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={timeByCategoryData}>
                        <XAxis dataKey="name" fontSize={12} fontStyle="bold" />
                        <YAxis fontSize={12} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar dataKey="hours" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute>
  );
}
