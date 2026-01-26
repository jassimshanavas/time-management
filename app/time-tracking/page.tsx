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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                  Time Tracking
                </h1>
                <p className="text-muted-foreground">Track your time and productivity</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedProjectId && (
                  <Badge variant="outline" className="h-9 px-4 flex items-center gap-2 bg-background/50 backdrop-blur-sm border-primary/10">
                    <span className="text-muted-foreground mr-1 hidden sm:inline">Filtered by:</span>
                    {selectedProjectId === 'personal' ? 'Personal' : projects.find(p => p.id === selectedProjectId)?.name}
                  </Badge>
                )}
                <Link href="/time-tracking/calendar">
                  <Button variant="outline" className="bg-background/50">
                    <Calendar className="h-4 w-4 mr-2" />
                    Calendar View
                  </Button>
                </Link>
              </div>
            </div>

            {/* Active Timer */}
            <Card className="relative overflow-hidden border-2 border-primary/20 bg-background/40 backdrop-blur-xl shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary/30" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Clock className={`h-5 w-5 ${runningEntry ? 'animate-spin-slow' : ''}`} />
                  {runningEntry ? 'Active Session' : 'No Active Session'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {runningEntry ? (
                  <div className="space-y-6 py-4">
                    <div className="text-center">
                      <div className="text-6xl sm:text-7xl font-black font-mono tracking-tighter bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent mb-4">
                        {getElapsedTime(runningEntry.startTime)}
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <Badge variant="outline" className="text-sm px-4 py-1 bg-primary/5 border-primary/20 uppercase tracking-widest font-bold">
                          {runningEntry.category}
                        </Badge>
                        {runningEntry.description && (
                          <p className="text-base font-medium text-muted-foreground">{runningEntry.description}</p>
                        )}
                        <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider mt-2 px-3 py-1 rounded-full bg-muted">
                          Started {formatDistanceToNow(new Date(runningEntry.startTime), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleStopTimer(runningEntry.id)}
                      variant="destructive"
                      className="w-full h-14 text-lg font-bold shadow-lg shadow-destructive/20 rounded-2xl"
                      size="lg"
                    >
                      <Square className="h-6 w-6 mr-3 fill-current" />
                      Finish Session
                    </Button>
                  </div>
                ) : (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 rounded-2xl" size="lg">
                        <Play className="h-6 w-6 mr-3 fill-current" />
                        Start New Timer
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Start Tracking Time</DialogTitle>
                        <DialogDescription>What are you focusing on right now?</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleStartTimer} className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Input
                            id="category"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            placeholder="e.g., Development, Meeting, Creative"
                            required
                            className="bg-muted/30"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Task Details (Optional)</Label>
                          <Input
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="What specifically are you doing?"
                            className="bg-muted/30"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Link to Existing Task</Label>
                          <Select
                            value={formData.taskId || 'none'}
                            onValueChange={(value) =>
                              setFormData((prev) => ({
                                ...prev,
                                taskId: value === 'none' ? '' : value,
                              }))
                            }
                          >
                            <SelectTrigger className="bg-muted/30">
                              <SelectValue placeholder="Select a task" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Standalone Entry</SelectItem>
                              {tasks.map((task) => (
                                <SelectItem key={task.id} value={task.id}>
                                  {task.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="projectId">Project Scope</Label>
                          <ProjectSelector
                            value={formData.projectId}
                            onChange={(value) => setFormData({ ...formData, projectId: value })}
                            placeholder="General Session"
                          />
                        </div>
                        <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 mt-4">
                          <Play className="h-4 w-4 mr-2 fill-current" />
                          Start Focusing
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
              <Card className="bg-background/40 backdrop-blur-sm border-primary/10 group hover:border-primary/30 transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">Today&apos;s Focus Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-primary leading-none">{formatDuration(totalTimeToday)}</div>
                  <div className="mt-4 h-1 w-full bg-primary/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '70%' }} />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-background/40 backdrop-blur-sm border-primary/10 group hover:border-primary/30 transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">Total Sessions Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black leading-none">{todayEntries.length}</div>
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase mt-2">Productivity sessions</p>
                </CardContent>
              </Card>
              <Card className="bg-background/40 backdrop-blur-sm border-primary/10 group hover:border-primary/30 transition-all duration-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground">Active Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black leading-none">{Object.keys(categorySummary).length}</div>
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase mt-2">Unique contexts</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3 items-start">
              {/* Category Summary */}
              {Object.keys(categorySummary).length > 0 && (
                <Card className="bg-background/40 backdrop-blur-xl border-primary/10 shadow-xl overflow-hidden">
                  <CardHeader className="bg-muted/30 border-b border-primary/5">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider">Focus by Category</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {Object.entries(categorySummary)
                        .sort(([, a], [, b]) => b - a)
                        .map(([category, duration]) => (
                          <div key={category} className="group flex items-center justify-between p-3 rounded-xl bg-background/50 border border-primary/5 hover:border-primary/20 transition-all">
                            <span className="font-bold text-sm">{category}</span>
                            <Badge variant="secondary" className="font-bold text-[10px]">{formatDuration(duration)}</Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Entries */}
              <Card className="lg:col-span-2 bg-background/40 backdrop-blur-xl border-primary/10 shadow-xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-primary/5">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">Recent Sessions</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {filteredTimeEntries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20 rounded-2xl border border-dashed">
                        <Clock className="h-10 w-10 text-muted-foreground/30 mb-4" />
                        <p className="text-sm font-bold text-muted-foreground">No time entries recorded</p>
                      </div>
                    ) : (
                      sortedFilteredEntries.slice(0, 10).map((entry) => (
                        <div
                          key={entry.id}
                          className="group relative flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 p-4 rounded-xl bg-background/40 border border-transparent hover:border-primary/20 hover:shadow-lg transition-all duration-300"
                          onClick={() => entry.taskId && handleNavigateToTask(entry.taskId)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="font-black text-sm uppercase tracking-tight">{entry.category}</span>
                              {entry.projectId && <ProjectBadge projectId={entry.projectId} className="h-5 text-[10px]" />}
                              {entry.isRunning && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black animate-pulse uppercase">
                                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                  Now
                                </div>
                              )}
                              {entry.taskId && (
                                <Badge variant="outline" className="text-[9px] font-black px-1.5 py-0 h-4 border-muted-foreground/30 uppercase">Linked</Badge>
                              )}
                            </div>
                            {entry.description && (
                              <p className="text-sm font-medium text-muted-foreground line-clamp-1">{entry.description}</p>
                            )}
                            {entry.taskId && (
                              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-primary/70">
                                <Plus className="h-3 w-3" />
                                <span className="truncate">{findTaskTitle(entry.taskId)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground/60 uppercase mt-2">
                              {format(new Date(entry.startTime), 'MMM d, h:mm a')}
                              {entry.endTime && ` — ${format(new Date(entry.endTime), 'h:mm a')}`}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
                            {entry.duration !== undefined && (
                              <div className="px-4 py-2 rounded-xl bg-muted/50 border border-primary/5 text-sm font-black text-primary">
                                {formatDuration(entry.duration)}
                              </div>
                            )}
                            <div className="flex flex-col sm:flex-row gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-300">
                              {entry.taskId && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNavigateToTask(entry.taskId!);
                                  }}
                                  className="h-8 w-8 rounded-full hover:bg-primary/10 text-primary"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTimeEntry(entry.id);
                                }}
                                className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
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
