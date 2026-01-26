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
import { cn } from '@/lib/utils';
import { Sparkles, Brain, Zap, Workflow, Flame } from 'lucide-react';

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
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between px-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/20 px-2 py-0 h-4">Strategic Nexus</Badge>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent italic">
                  Command Center
                </h1>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-70">Synchronizing your multi-vector productivity stream</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end mr-2">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">System Time</p>
                  <p className="text-sm font-black italic opacity-40">CHRONOS_v2.0</p>
                </div>
                <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-background/60 backdrop-blur-2xl border border-primary/10 shadow-2xl shadow-primary/5">
                  <Calendar className="h-4 w-4 text-primary animate-pulse" />
                  <div className="flex flex-col">
                    <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none mb-1">{format(new Date(), 'EEEE')}</p>
                    <p className="text-sm font-black italic tracking-tight leading-none">{format(new Date(), 'MMMM d, yyyy')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 px-1">
              <Card className="relative overflow-hidden border-none bg-background/60 backdrop-blur-2xl shadow-xl rounded-[2.5rem] p-7 transition-all duration-500 hover:shadow-violet-500/5 group">
                <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Workflow className="h-12 w-12 text-violet-500" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-5 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-violet-500" />
                  Operation Velocity
                </h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <div className="text-4xl font-black text-violet-500 tracking-tighter tabular-nums">{taskCompletionRate}</div>
                  <span className="text-sm font-black text-violet-500/40 uppercase tracking-widest">%</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-1">
                    <span>{completedTasks} / {totalTasks} LOGGED</span>
                    <span className="text-violet-500/60">ACTIVE</span>
                  </div>
                  <Progress value={taskCompletionRate} className="h-2 rounded-full bg-violet-500/10" />
                </div>
              </Card>

              <Card className="relative overflow-hidden border-none bg-background/60 backdrop-blur-2xl shadow-xl rounded-[2.5rem] p-7 transition-all duration-500 hover:shadow-emerald-500/5 group">
                <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Zap className="h-12 w-12 text-emerald-500" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-5 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-emerald-500" />
                  Objective Density
                </h3>
                <div className="text-4xl font-black tracking-tighter text-emerald-500 leading-none mb-4 tabular-nums">{filteredGoals.length}</div>
                <div className="flex gap-1.5 px-1">
                  {activeGoals.map((g, i) => (
                    <div key={i} className="h-1.5 flex-1 rounded-full bg-emerald-500/10 border border-emerald-500/5 overflow-hidden">
                      <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${g.progress}%` }} />
                    </div>
                  ))}
                  {filteredGoals.length === 0 && <div className="h-1.5 w-full rounded-full bg-emerald-500/5" />}
                </div>
                <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mt-3">DEPLOYED STRATEGIC VECTORS</p>
              </Card>

              <Card className="relative overflow-hidden border-none bg-background/60 backdrop-blur-2xl shadow-xl rounded-[2.5rem] p-7 transition-all duration-500 hover:shadow-amber-500/5 group">
                <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Flame className="h-12 w-12 text-amber-500" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-5 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-amber-500" />
                  Neural Consistency
                </h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <div className="text-4xl font-black text-amber-500 tracking-tighter tabular-nums">
                    {filteredHabits.length > 0 ? Math.max(...filteredHabits.map((h) => h.streak), 0) : 0}
                  </div>
                  <span className="text-[10px] font-black text-amber-500/40 uppercase tracking-[0.2em] italic">DAYS</span>
                </div>
                <div className="flex items-center gap-2 px-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((_, i) => (
                    <div key={i} className={cn(
                      "h-1 px-1 flex-1 rounded-full transition-all duration-700",
                      i < 4 ? "bg-amber-500" : "bg-amber-500/10 shadow-inner"
                    )} />
                  ))}
                </div>
                <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mt-3">PEAK HABIT VELOCITY</p>
              </Card>

              <Card className="relative overflow-hidden border-none bg-background/60 backdrop-blur-2xl shadow-xl rounded-[2.5rem] p-7 transition-all duration-500 hover:shadow-blue-500/5 group">
                <div className="absolute top-0 right-0 p-5 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Clock className="h-12 w-12 text-blue-500" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-5 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-blue-500" />
                  Temporal Audit
                </h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <div className="text-4xl font-black text-blue-500 tracking-tighter tabular-nums">{Math.floor(totalTimeToday / 60)}</div>
                  <span className="text-sm font-black text-blue-500/40 uppercase tracking-widest">H</span>
                  <div className="text-2xl font-black text-blue-500 tracking-tighter ml-1 tabular-nums">{totalTimeToday % 60}</div>
                  <span className="text-xs font-black text-blue-500/40 uppercase tracking-widest">M</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-blue-500/10 border border-blue-500/5 overflow-hidden">
                  <div className="h-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: '65%' }} />
                </div>
                <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mt-3">ACTIVE COGNITIVE INVESTMENT</p>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-8 lg:grid-cols-2 px-1">
              {/* Today's Tasks */}
              <Card className="bg-background/60 backdrop-blur-3xl border-primary/5 shadow-2xl overflow-hidden rounded-[2.5rem] group transition-all duration-500 hover:shadow-primary/5">
                <CardHeader className="flex flex-row items-center justify-between p-7 border-b border-primary/5 bg-muted/20">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Execution Logic</h3>
                    <CardTitle className="text-xl font-black italic tracking-tight">Daily Prime Targets</CardTitle>
                  </div>
                  <Link href="/tasks">
                    <Button size="sm" variant="ghost" className="h-10 px-4 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10 font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
                      <Plus className="h-4 w-4 mr-2" />
                      Engage
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-7 space-y-4">
                  {todayTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-30 grayscale group hover:opacity-100 transition-all duration-500">
                      <div className="h-16 w-16 bg-muted/50 rounded-[1.5rem] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/5 transition-all duration-500">
                        <CheckSquare className="h-8 w-8 text-primary/40 group-hover:text-primary transition-colors" />
                      </div>
                      <p className="font-black text-xs uppercase tracking-[0.2em] mb-1">Queue Purified</p>
                      <p className="text-[10px] font-medium text-muted-foreground">All operational targets verified and secured.</p>
                    </div>
                  ) : (
                    todayTasks.map((task) => (
                      <div key={task.id} className="group/item flex items-center gap-4 p-5 rounded-[1.5rem] bg-muted/10 border border-transparent hover:border-primary/10 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500">
                        <div className="h-10 w-10 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0 group-hover/item:scale-110 transition-transform">
                          <CheckSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm truncate italic mb-1.5">{task.title}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn(
                              "text-[8px] font-black uppercase tracking-widest px-1.5 h-4 border-transparent",
                              task.priority === 'high' ? "bg-destructive/10 text-destructive" : "bg-primary/5 text-primary/60"
                            )}>
                              {task.priority} VELOCITY
                            </Badge>
                            {task.deadline && (
                              <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">
                                <Clock className="h-3 w-3" />
                                {format(new Date(task.deadline), 'MMM d')}
                              </div>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/20 group-hover/item:text-primary group-hover/item:translate-x-1 transition-all" />
                      </div>
                    ))
                  )}
                  <Link href="/tasks" className="block pt-2">
                    <Button variant="ghost" className="w-full h-11 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 hover:text-primary hover:bg-primary/5 border border-dashed border-primary/5">
                      Access Complete Directive <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Upcoming Reminders */}
              <Card className="bg-background/60 backdrop-blur-3xl border-primary/5 shadow-2xl overflow-hidden rounded-[2.5rem] group transition-all duration-500 hover:shadow-pink-500/5">
                <CardHeader className="flex flex-row items-center justify-between p-7 border-b border-primary/5 bg-muted/20">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Temporal Relay</h3>
                    <CardTitle className="text-xl font-black italic tracking-tight">Priority Neural Alerts</CardTitle>
                  </div>
                  <Link href="/reminders">
                    <Button size="sm" variant="ghost" className="h-10 px-4 rounded-xl bg-pink-500/5 hover:bg-pink-500/10 text-pink-500 border border-pink-500/10 font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
                      <Plus className="h-4 w-4 mr-2" />
                      Anchor
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-7 space-y-4">
                  {upcomingReminders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-30 grayscale group hover:opacity-100 transition-all duration-500">
                      <div className="h-16 w-16 bg-muted/50 rounded-[1.5rem] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-pink-500/5 transition-all duration-500">
                        <Bell className="h-8 w-8 text-pink-500/40 group-hover:text-pink-500" />
                      </div>
                      <p className="font-black text-xs uppercase tracking-[0.2em] mb-1">Silence in Stream</p>
                      <p className="text-[10px] font-medium text-muted-foreground">No temporal alerts currently propagating.</p>
                    </div>
                  ) : (
                    upcomingReminders.map((reminder) => (
                      <div key={reminder.id} className="group/item flex items-center gap-4 p-5 rounded-[1.5rem] bg-muted/10 border border-transparent hover:border-pink-500/10 hover:shadow-xl hover:shadow-pink-500/5 transition-all duration-500">
                        <div className="h-10 w-10 rounded-2xl bg-pink-500/5 border border-pink-500/10 flex items-center justify-center shrink-0 group-hover/item:scale-110 transition-transform">
                          <Bell className="h-5 w-5 text-pink-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm truncate italic mb-1.5">{reminder.title}</p>
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-pink-500/5 border border-pink-500/5 w-fit">
                            <Clock className="h-3 w-3 text-pink-500/60" />
                            <span className="text-[9px] font-black text-pink-600/60 uppercase tracking-widest tabular-nums">
                              {format(new Date(reminder.dueDate), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <Link href="/reminders" className="block pt-2">
                    <Button variant="ghost" className="w-full h-11 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 hover:text-pink-500 hover:bg-pink-500/5 border border-dashed border-pink-500/5">
                      Sync All Neural Alerts <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Active Goals */}
              <Card className="bg-background/60 backdrop-blur-3xl border-primary/5 shadow-2xl overflow-hidden rounded-[2.5rem] group transition-all duration-500 hover:shadow-emerald-500/5">
                <CardHeader className="flex flex-row items-center justify-between p-7 border-b border-primary/5 bg-muted/20">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Strategic Vectors</h3>
                    <CardTitle className="text-xl font-black italic tracking-tight">Active Objective Streams</CardTitle>
                  </div>
                  <Link href="/goals">
                    <Button size="sm" variant="ghost" className="h-10 px-4 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
                      <Plus className="h-4 w-4 mr-2" />
                      Deploy
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-7 space-y-6">
                  {activeGoals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-30 grayscale group hover:opacity-100 transition-all duration-500">
                      <div className="h-16 w-16 bg-muted/50 rounded-[1.5rem] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-500/5 transition-all duration-500">
                        <Target className="h-8 w-8 text-emerald-500/40 group-hover:text-emerald-500" />
                      </div>
                      <p className="font-black text-xs uppercase tracking-[0.2em] mb-1">Vector Void</p>
                      <p className="text-[10px] font-medium text-muted-foreground">No active strategic objectives detected.</p>
                    </div>
                  ) : (
                    activeGoals.map((goal) => (
                      <div key={goal.id} className="space-y-4 p-5 rounded-[1.5rem] bg-muted/10 border border-transparent hover:border-emerald-500/10 transition-all duration-500">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-black text-sm italic tracking-tight">{goal.title}</p>
                          <Badge variant="outline" className="h-5 text-[9px] font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-600 border-emerald-500/20 tabular-nums">
                            {goal.progress}% LOADED
                          </Badge>
                        </div>
                        <div className="h-2 w-full rounded-full bg-emerald-500/5 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]" style={{ width: `${goal.progress}%` }} />
                        </div>
                      </div>
                    ))
                  )}
                  <Link href="/goals" className="block pt-2">
                    <Button variant="ghost" className="w-full h-11 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 hover:text-emerald-500 hover:bg-emerald-500/5 border border-dashed border-emerald-500/5">
                      Audit Strategic Matrix <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Habits */}
              <Card className="bg-background/60 backdrop-blur-3xl border-primary/5 shadow-2xl overflow-hidden rounded-[2.5rem] group transition-all duration-500 hover:shadow-amber-500/5">
                <CardHeader className="flex flex-row items-center justify-between p-7 border-b border-primary/5 bg-muted/20">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Neural Rewiring</h3>
                    <CardTitle className="text-xl font-black italic tracking-tight">Active Habit Protocols</CardTitle>
                  </div>
                  <Link href="/habits">
                    <Button size="sm" variant="ghost" className="h-10 px-4 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 text-amber-500 border border-amber-500/10 font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
                      <Plus className="h-4 w-4 mr-2" />
                      Hardcode
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-7 space-y-4">
                  {todayHabits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-30 grayscale group hover:opacity-100 transition-all duration-500">
                      <div className="h-16 w-16 bg-muted/50 rounded-[1.5rem] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-500/5 transition-all duration-500">
                        <TrendingUp className="h-8 w-8 text-amber-500/40 group-hover:text-amber-500" />
                      </div>
                      <p className="font-black text-xs uppercase tracking-[0.2em] mb-1">Protocol Flatline</p>
                      <p className="text-[10px] font-medium text-muted-foreground">Zero behavior modification protocols active.</p>
                    </div>
                  ) : (
                    todayHabits.map((habit) => (
                      <div key={habit.id} className="group/item flex items-center justify-between p-5 rounded-[1.5rem] bg-muted/10 border border-transparent hover:border-amber-500/10 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-500">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="h-10 w-10 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-center shrink-0 group-hover/item:scale-110 transition-transform">
                            <Flame className="h-5 w-5 text-amber-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-sm truncate italic mb-1">{habit.title}</p>
                            <div className="flex items-center gap-1.5">
                              <div className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
                              <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
                                {habit.streak} DAY PULSE
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl bg-amber-500/5 hover:bg-amber-500 text-amber-600 hover:text-white border border-amber-500/10 font-black text-[10px] uppercase tracking-widest transition-all">Check</Button>
                      </div>
                    ))
                  )}
                  <Link href="/habits" className="block pt-2">
                    <Button variant="ghost" className="w-full h-11 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 hover:text-amber-500 hover:bg-amber-500/5 border border-dashed border-amber-500/5">
                      Sync Habit Matrix <ArrowRight className="ml-2 h-3 w-3" />
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
