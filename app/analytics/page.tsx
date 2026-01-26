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
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Insights into your productivity</p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {tasksByStatus.done} of {tasks.length} tasks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Goal Progress</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgGoalProgress}%</div>
              <p className="text-xs text-muted-foreground">
                {goals.length} active goals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Habit Streak</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHabitStreak}</div>
              <p className="text-xs text-muted-foreground">
                {habits.length} active habits
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Tracked</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.floor(totalTimeTracked / 60)}h {totalTimeTracked % 60}m
              </div>
              <p className="text-xs text-muted-foreground">
                {timeEntries.length} sessions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Task Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Task Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Task Priority */}
          <Card>
            <CardHeader>
              <CardTitle>Tasks by Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={taskPriorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Goal Progress */}
          {goalProgressData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Goal Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={goalProgressData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="progress" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Habit Streaks */}
          {habitStreakData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Habit Streaks</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={habitStreakData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="current" fill="#f59e0b" name="Current Streak" />
                    <Bar dataKey="longest" fill="#10b981" name="Longest Streak" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Time by Category */}
          {timeByCategoryData.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Time Spent by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeByCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" fill="#06b6d4" name="Hours" />
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
