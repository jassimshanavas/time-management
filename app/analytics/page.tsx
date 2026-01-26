'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/lib/store';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Target, CheckSquare, Clock } from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Sparkles, Brain, Zap, Workflow } from 'lucide-react';

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
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between px-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/20 px-2 py-0 h-4">Intelligence Nexus</Badge>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent italic">
                  Operational Analytics
                </h1>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-70">Quantifying the evolution of your strategic output</p>
              </div>
            </div>

            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 px-1">
              <Card className="relative overflow-hidden border-none bg-background/40 backdrop-blur-2xl shadow-xl rounded-[2rem] p-6 transition-all duration-500 hover:shadow-primary/5 group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Target className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  Completion Velocity
                </h3>
                <div className="flex items-baseline gap-1">
                  <div className="text-3xl font-black text-primary tracking-tighter tabular-nums">{completionRate}</div>
                  <span className="text-sm font-black text-primary/40 uppercase tracking-widest">%</span>
                </div>
                <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mt-3">{tasksByStatus.done} OF {tasks.length} OPERATIONS</p>
              </Card>

              <Card className="relative overflow-hidden bg-background/40 backdrop-blur-sm border-primary/5 group hover:border-emerald-500/20 transition-all duration-500 rounded-[2rem] p-6">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Zap className="h-12 w-12 text-emerald-500" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-emerald-500" />
                  Strategic Progress
                </h3>
                <div className="flex items-baseline gap-1">
                  <div className="text-3xl font-black text-emerald-500 tracking-tighter tabular-nums">{avgGoalProgress}</div>
                  <span className="text-sm font-black text-emerald-500/40 uppercase tracking-widest">%</span>
                </div>
                <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mt-3">AVERAGE ACROSS {goals.length} OBJECTIVES</p>
              </Card>

              <Card className="relative overflow-hidden bg-background/40 backdrop-blur-sm border-primary/5 group hover:border-orange-500/20 transition-all duration-500 rounded-[2rem] p-6">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <TrendingUp className="h-12 w-12 text-orange-500" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-orange-500" />
                  Habit Pulse
                </h3>
                <div className="text-3xl font-black tracking-tighter text-orange-500 leading-none">{totalHabitStreak}</div>
                <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mt-3">CUMULATIVE STREAK DENSITY</p>
              </Card>

              <Card className="relative overflow-hidden bg-background/40 backdrop-blur-sm border-primary/5 group hover:border-blue-500/20 transition-all duration-500 rounded-[2rem] p-6">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Clock className="h-12 w-12 text-blue-500" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-blue-500" />
                  Temporal Investment
                </h3>
                <div className="flex items-baseline gap-1">
                  <div className="text-3xl font-black text-blue-500 tracking-tighter tabular-nums">{Math.floor(totalTimeTracked / 60)}</div>
                  <span className="text-sm font-black text-blue-500/40 uppercase tracking-widest">H</span>
                  <div className="text-xl font-black text-blue-500 tracking-tighter ml-1 tabular-nums">{totalTimeTracked % 60}</div>
                  <span className="text-xs font-black text-blue-500/40 uppercase tracking-widest">M</span>
                </div>
                <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mt-3">{timeEntries.length} DISCRETE SESSIONS</p>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 px-1">
              {/* Task Status Distribution */}
              <Card className="bg-background/60 backdrop-blur-xl border-primary/5 shadow-2xl overflow-hidden rounded-[2.5rem] group transition-all duration-500 hover:shadow-primary/5">
                <CardHeader className="p-6 border-b border-primary/5">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Operation Status Distribution</CardTitle>
                </CardHeader>
                <CardContent className="pt-8 pb-4">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
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
                          contentStyle={{ backgroundColor: 'hsl(var(--background)/0.8)', backdropFilter: 'blur(12px)', borderRadius: '16px', border: '1px solid hsl(var(--primary)/0.1)', fontWeight: 'bold' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontStyle: 'black', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Task Priority */}
              <Card className="bg-background/60 backdrop-blur-xl border-primary/5 shadow-2xl overflow-hidden rounded-[2.5rem] group transition-all duration-500 hover:shadow-primary/5">
                <CardHeader className="p-6 border-b border-primary/5">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Operational Priority Mix</CardTitle>
                </CardHeader>
                <CardContent className="pt-8 pb-4">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={taskPriorityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary)/0.05)" vertical={false} />
                        <XAxis dataKey="name" fontSize={10} fontStyle="bold" axisLine={false} tickLine={false} />
                        <YAxis fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: 'hsl(var(--primary)/0.05)' }}
                          contentStyle={{ backgroundColor: 'hsl(var(--background)/0.8)', backdropFilter: 'blur(12px)', borderRadius: '16px', border: '1px solid hsl(var(--primary)/0.1)', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[12, 12, 12, 12]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Goal Progress */}
              {goalProgressData.length > 0 && (
                <Card className="bg-background/60 backdrop-blur-xl border-primary/5 shadow-2xl overflow-hidden rounded-[2.5rem] group transition-all duration-500 hover:shadow-emerald-500/5">
                  <CardHeader className="p-6 border-b border-primary/5">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Objective Completion Vectors (%)</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-8 pb-4">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={goalProgressData} layout="vertical" margin={{ left: 20 }}>
                          <XAxis type="number" domain={[0, 100]} fontSize={10} axisLine={false} tickLine={false} />
                          <YAxis dataKey="name" type="category" width={100} fontSize={10} fontStyle="bold" axisLine={false} tickLine={false} />
                          <Tooltip
                            cursor={{ fill: 'hsl(var(--primary)/0.05)' }}
                            contentStyle={{ backgroundColor: 'hsl(var(--background)/0.8)', backdropFilter: 'blur(12px)', borderRadius: '16px', border: '1px solid hsl(var(--primary)/0.1)' }}
                          />
                          <Bar dataKey="progress" fill="#10b981" radius={[0, 12, 12, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Habit Streaks */}
              {habitStreakData.length > 0 && (
                <Card className="bg-background/60 backdrop-blur-xl border-primary/5 shadow-2xl overflow-hidden rounded-[2.5rem] group transition-all duration-500 hover:shadow-orange-500/5">
                  <CardHeader className="p-6 border-b border-primary/5">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Neural Consistency Density</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-8 pb-4">
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={habitStreakData} margin={{ bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary)/0.05)" vertical={false} />
                          <XAxis dataKey="name" fontSize={8} angle={-45} textAnchor="end" height={60} fontStyle="bold" axisLine={false} tickLine={false} />
                          <YAxis fontSize={10} axisLine={false} tickLine={false} />
                          <Tooltip
                            cursor={{ fill: 'hsl(var(--primary)/0.05)' }}
                            contentStyle={{ backgroundColor: 'hsl(var(--background)/0.8)', backdropFilter: 'blur(12px)', borderRadius: '16px', border: '1px solid hsl(var(--primary)/0.1)' }}
                          />
                          <Legend verticalAlign="top" wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: '20px' }} />
                          <Bar dataKey="current" fill="#f59e0b" name="Current Streak" radius={[8, 8, 8, 8]} barSize={15} />
                          <Bar dataKey="longest" fill="#10b981" name="Peak Velocity" radius={[8, 8, 8, 8]} barSize={15} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Time by Category */}
              {timeByCategoryData.length > 0 && (
                <Card className="md:col-span-2 bg-background/60 backdrop-blur-xl border-primary/5 shadow-2xl overflow-hidden rounded-[2.5rem] group transition-all duration-500 hover:shadow-blue-500/5">
                  <CardHeader className="p-6 border-b border-primary/5">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Temporal Allocation by Sector (Hours)</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-8 pb-4">
                    <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={timeByCategoryData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary)/0.05)" vertical={false} />
                          <XAxis dataKey="name" fontSize={10} fontStyle="bold" axisLine={false} tickLine={false} />
                          <YAxis fontSize={10} axisLine={false} tickLine={false} />
                          <Tooltip
                            cursor={{ fill: 'hsl(var(--primary)/0.05)' }}
                            contentStyle={{ backgroundColor: 'hsl(var(--background)/0.8)', backdropFilter: 'blur(12px)', borderRadius: '16px', border: '1px solid hsl(var(--primary)/0.1)' }}
                          />
                          <Bar dataKey="hours" fill="#06b6d4" radius={[12, 12, 12, 12]} barSize={60} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
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
