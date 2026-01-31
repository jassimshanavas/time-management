'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useStore } from '@/lib/store';
import { Play, Square, Plus, Trash2, Clock, Calendar } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { TimeEntry } from '@/types';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TrendingUp, Sparkles } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProjectSelector } from '@/components/projects/project-selector';
import { ProjectBadge } from '@/components/projects/project-badge';

export default function TimeTrackingPage() {
  const router = useRouter();
  const { tasks, timeEntries, addTimeEntry, updateTimeEntry, deleteTimeEntry, stopTimeEntry, selectedProjectId, projects } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    taskId: '',
    projectId: '' as string | undefined,
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStartTimer = (e: React.FormEvent) => {
    e.preventDefault();

    const newEntry: Omit<TimeEntry, 'id'> = {
      category: formData.category,
      description: formData.description,
      taskId: formData.taskId || undefined,
      projectId: formData.projectId || undefined,
      startTime: new Date(),
      isRunning: true,
    };
    addTimeEntry(newEntry);

    setFormData({ category: '', description: '', taskId: '', projectId: '' });
    setIsDialogOpen(false);
  };

  const handleStopTimer = (id: string) => {
    stopTimeEntry(id);
  };

  const runningEntry = timeEntries.find((e) => e.isRunning);

  const getElapsedTime = (startTime: Date) => {
    const elapsed = Math.floor((currentTime.getTime() - new Date(startTime).getTime()) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const todayEntries = timeEntries.filter((entry) => {
    const entryDate = new Date(entry.startTime);
    const today = new Date();
    return entryDate.toDateString() === today.toDateString();
  });

  const totalTimeToday = todayEntries.reduce((acc, entry) => acc + (entry.duration || 0), 0);

  const categorySummary = timeEntries.reduce((acc, entry) => {
    if (entry.duration) {
      acc[entry.category] = (acc[entry.category] || 0) + entry.duration;
    }
    return acc;
  }, {} as Record<string, number>);

  const findTaskTitle = (taskId?: string) =>
    taskId ? tasks.find((task) => task.id === taskId)?.title : undefined;

  const sortedEntries = useMemo(
    () =>
      [...timeEntries].sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      ),
    [timeEntries]
  );

  const handleNavigateToTask = (taskId: string) => {
    router.push(`/tasks/${taskId}?fromView=time-tracking`);
  };

  // Filter by global project context (Workspace)
  const filteredTimeEntries = timeEntries.filter((entry) => {
    if (selectedProjectId !== null) {
      if (selectedProjectId === 'personal') {
        if (entry.projectId) return false;
      } else {
        if (entry.projectId !== selectedProjectId) return false;
      }
    }
    return true;
  });

  const sortedFilteredEntries = useMemo(
    () =>
      [...filteredTimeEntries].sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      ),
    [filteredTimeEntries]
  );

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
          <div className="space-y-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/20 px-2 py-0 h-4">Chronos System</Badge>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent italic">
                  Temporal Audit
                </h1>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-70">Quantifying your cognitive attention</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {selectedProjectId && (
                  <Badge variant="outline" className="h-10 px-4 flex items-center gap-2 bg-background/40 backdrop-blur-sm border-primary/10 text-[10px] font-black uppercase tracking-widest shadow-sm">
                    <span className="text-muted-foreground opacity-50">Context:</span>
                    {selectedProjectId === 'personal' ? 'Personal' : projects.find(p => p.id === selectedProjectId)?.name}
                  </Badge>
                )}

                <Link href="/time-tracking/calendar">
                  <Button variant="outline" className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-background/40 border-primary/10">
                    <Calendar className="h-4 w-4 mr-2" />
                    Timeline View
                  </Button>
                </Link>
              </div>
            </div>

            {/* Active Timer */}
            <Card className="group relative overflow-hidden border-none bg-background/40 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] transition-all duration-500 hover:shadow-primary/5">
              <div className="absolute top-0 left-0 w-full h-1 bg-muted/20">
                <div className={cn(
                  "h-full bg-gradient-to-r from-primary via-primary/80 to-primary/50 transition-all duration-1000",
                  runningEntry ? "w-full animate-pulse" : "w-0"
                )} />
              </div>

              <CardContent className="p-8 sm:p-12">
                {runningEntry ? (
                  <div className="space-y-10">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2 mb-6">
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20 px-3 py-1 animate-pulse">
                          Active Session Live
                        </Badge>
                      </div>

                      <div className="text-6xl sm:text-8xl font-black font-mono tracking-tighter text-foreground mb-8 text-center tabular-nums">
                        {getElapsedTime(runningEntry.startTime)}
                      </div>

                      <div className="flex flex-col items-center text-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black uppercase tracking-tight italic text-primary">{runningEntry.category}</span>
                          {runningEntry.projectId && <ProjectBadge projectId={runningEntry.projectId} className="h-5" />}
                        </div>

                        {runningEntry.description && (
                          <p className="text-sm font-medium text-muted-foreground/60 italic max-w-md line-clamp-2">
                            {runningEntry.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted/30 border border-primary/5 mt-4">
                          <Clock className="h-3 w-3 text-primary animate-spin-slow" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                            Started {formatDistanceToNow(new Date(runningEntry.startTime), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleStopTimer(runningEntry.id)}
                      className="w-full h-16 rounded-2xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-black text-lg shadow-xl shadow-destructive/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Square className="h-6 w-6 mr-3 fill-current" />
                      Terminate Session
                    </Button>
                  </div>
                ) : (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full h-16 rounded-[1.5rem] font-black text-lg shadow-2xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] group/btn">
                        <Play className="h-6 w-6 mr-3 fill-current group-hover/btn:scale-110 transition-transform" />
                        Initiate Temporal Capture
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl max-h-[90vh] p-0 overflow-hidden rounded-[2rem] border-primary/10 bg-background/95 backdrop-blur-2xl shadow-2xl">
                      <ScrollArea className="max-h-[85vh]">
                        <div className="p-6 sm:p-10">
                          <DialogHeader className="mb-8">
                            <DialogTitle className="text-2xl font-black tracking-tight italic">Start Sequence</DialogTitle>
                            <DialogDescription className="text-xs font-black uppercase tracking-widest opacity-40">
                              Allocate neural capacity to specific operation
                            </DialogDescription>
                          </DialogHeader>

                          <form onSubmit={handleStartTimer} className="space-y-6">
                            <div className="space-y-3">
                              <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Operation Category</Label>
                              <Input
                                id="category"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                placeholder="e.g. CORE.DEVELOPMENT"
                                required
                                className="bg-muted/30 h-12 rounded-2xl border-primary/5 focus:ring-primary/20 transition-all text-base font-bold"
                              />
                            </div>

                            <div className="space-y-3">
                              <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Execution Details</Label>
                              <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Objective parameters..."
                                className="bg-muted/30 h-12 rounded-2xl border-primary/5"
                              />
                            </div>

                            <div className="grid gap-6 sm:grid-cols-2 text-start">
                              <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Task Synapse</Label>
                                <Select
                                  value={formData.taskId || 'none'}
                                  onValueChange={(value) => {
                                    const taskId = value === 'none' ? '' : value;
                                    const selectedTask = tasks.find((t) => t.id === taskId);
                                    setFormData((prev) => ({
                                      ...prev,
                                      taskId,
                                      projectId: selectedTask ? (selectedTask.projectId || '') : prev.projectId,
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="bg-muted/30 h-11 rounded-xl border-primary/5 text-xs font-bold">
                                    <SelectValue placeholder="Select a task" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border-primary/10">
                                    <SelectItem value="none" className="text-xs font-black uppercase tracking-widest">Standalone Session</SelectItem>
                                    {tasks.map((task) => (
                                      <SelectItem key={task.id} value={task.id} className="text-xs font-bold">
                                        {task.title}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-3">
                                <Label htmlFor="projectId" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Strategic Sector</Label>
                                <ProjectSelector
                                  value={formData.projectId}
                                  onChange={(value) => setFormData({ ...formData, projectId: value })}
                                  placeholder="Global Matrix"
                                />
                              </div>
                            </div>

                            <Button type="submit" className="w-full h-16 rounded-2xl font-black text-base shadow-xl shadow-primary/20 tracking-tight transition-all hover:scale-[1.01] active:scale-[0.99] mt-6">
                              <Play className="h-4 w-4 mr-2 fill-current" />
                              Initialize Timer
                            </Button>
                          </form>
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
              <Card className="relative overflow-hidden bg-background/40 backdrop-blur-sm border-primary/5 group hover:border-primary/20 transition-all duration-500 rounded-[1.5rem] p-6">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Clock className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-primary" />
                  Temporal Flow [24H]
                </h3>
                <div className="flex items-baseline gap-1">
                  <div className="text-3xl font-black text-primary tracking-tighter tabular-nums">{formatDuration(totalTimeToday).split(' ')[0]}</div>
                  <span className="text-sm font-black text-primary/40 uppercase tracking-widest">{formatDuration(totalTimeToday).split(' ')[1] || 'm'}</span>
                </div>
                <div className="mt-6 h-1 w-full bg-primary/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary animate-in slide-in-from-left duration-1000" style={{ width: '70%' }} />
                </div>
              </Card>

              <Card className="relative overflow-hidden bg-background/40 backdrop-blur-sm border-primary/5 group hover:border-primary/20 transition-all duration-500 rounded-[1.5rem] p-6">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <TrendingUp className="h-12 w-12 text-emerald-500" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-emerald-500" />
                  Focus Snapshots
                </h3>
                <div className="text-4xl font-black tracking-tighter text-foreground leading-none">{todayEntries.length}</div>
                <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mt-3">Initialized Sessions Today</p>
              </Card>

              <Card className="relative overflow-hidden bg-background/40 backdrop-blur-sm border-primary/5 group hover:border-primary/20 transition-all duration-500 rounded-[1.5rem] p-6">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Sparkles className="h-12 w-12 text-blue-500" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-4 flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-blue-500" />
                  Context Diversity
                </h3>
                <div className="text-4xl font-black tracking-tighter text-foreground leading-none">{Object.keys(categorySummary).length}</div>
                <p className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mt-3">{Object.keys(categorySummary).length === 1 ? 'Focus Context' : 'Unique Contexts'}</p>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3 items-start">
              {Object.keys(categorySummary).length > 0 && (
                <Card className="bg-background/60 backdrop-blur-xl border-primary/5 shadow-2xl overflow-hidden rounded-[2rem]">
                  <CardHeader className="p-6 border-b border-primary/5">
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Context Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {Object.entries(categorySummary)
                        .sort(([, a], [, b]) => b - a)
                        .map(([category, duration]) => (
                          <div key={category} className="group flex items-center justify-between p-4 rounded-2xl bg-muted/10 border border-transparent hover:border-primary/10 transition-all duration-300">
                            <span className="font-black text-[11px] uppercase tracking-tight italic text-foreground/80">{category}</span>
                            <Badge variant="secondary" className="font-black text-[9px] uppercase tracking-widest bg-primary/5 text-primary border-primary/10">{formatDuration(duration)}</Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Entries */}
              <Card className="lg:col-span-2 bg-background/60 backdrop-blur-xl border-primary/5 shadow-2xl overflow-hidden rounded-[2rem]">
                <CardHeader className="p-6 border-b border-primary/5">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Chronological Logs</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {filteredTimeEntries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center opacity-30 grayscale group hover:opacity-100 transition-all duration-500">
                        <div className="h-16 w-16 bg-muted/50 rounded-[1.5rem] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/5 transition-all duration-500">
                          <Clock className="h-8 w-8 text-primary/40 group-hover:text-primary transition-colors" />
                        </div>
                        <p className="font-black text-xs uppercase tracking-[0.2em] mb-1">Temporal Voids</p>
                        <p className="text-[10px] font-medium text-muted-foreground">Zero sessions detected in current timeline scope.</p>
                      </div>
                    ) : (
                      sortedFilteredEntries.slice(0, 10).map((entry) => (
                        <div
                          key={entry.id}
                          className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-[1.5rem] bg-muted/10 border border-transparent hover:border-primary/10 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <span className="font-black text-xs uppercase tracking-tight italic text-primary/80">{entry.category}</span>
                              {entry.projectId && <ProjectBadge projectId={entry.projectId} className="h-4 text-[8px] px-1.5" />}
                              {entry.isRunning && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[8px] font-black uppercase tracking-widest animate-pulse border border-primary/20">
                                  Live Flow
                                </div>
                              )}
                            </div>

                            {entry.description && (
                              <p className="text-[11px] font-medium text-muted-foreground line-clamp-1 mb-2 opacity-70 italic">{entry.description}</p>
                            )}

                            {entry.taskId && (
                              <div className="flex items-center gap-1.5 mb-3">
                                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0 h-4 border-primary/30 text-primary/60 bg-primary/5">Linked Synapse</Badge>
                                <span className="truncate text-[10px] font-black text-muted-foreground/40">{findTaskTitle(entry.taskId)}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em]">
                              {format(new Date(entry.startTime), 'MMM d, h:mm a')}
                              {entry.endTime && ` — ${format(new Date(entry.endTime), 'h:mm a')}`}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            {entry.duration !== undefined && (
                              <div className="px-5 py-2.5 rounded-2xl bg-primary/5 border border-primary/10 text-[13px] font-black text-primary tracking-tighter tabular-nums">
                                {formatDuration(entry.duration)}
                              </div>
                            )}
                            <div className="flex gap-1 ml-auto shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTimeEntry(entry.id);
                                }}
                                className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute>
  );
}
