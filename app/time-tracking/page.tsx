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

export default function TimeTrackingPage() {
  const router = useRouter();
  const { tasks, timeEntries, addTimeEntry, updateTimeEntry, deleteTimeEntry, stopTimeEntry } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    taskId: '',
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStartTimer = (e: React.FormEvent) => {
    e.preventDefault();

    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      category: formData.category,
      description: formData.description,
      taskId: formData.taskId || undefined,
      startTime: new Date(),
      isRunning: true,
    };
    addTimeEntry(newEntry);

    setFormData({ category: '', description: '', taskId: '' });
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

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Time Tracking</h1>
            <p className="text-muted-foreground">Track your time and productivity</p>
          </div>
          <Link href="/time-tracking/calendar">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar View
            </Button>
          </Link>
        </div>

        {/* Active Timer */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {runningEntry ? 'Active Timer' : 'No Active Timer'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {runningEntry ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-bold font-mono mb-2">
                    {getElapsedTime(runningEntry.startTime)}
                  </div>
                  <p className="text-lg font-semibold">{runningEntry.category}</p>
                  {runningEntry.description && (
                    <p className="text-sm text-muted-foreground">{runningEntry.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Started {formatDistanceToNow(new Date(runningEntry.startTime), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  onClick={() => handleStopTimer(runningEntry.id)}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  <Square className="h-5 w-5 mr-2" />
                  Stop Timer
                </Button>
              </div>
            ) : (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="lg">
                    <Play className="h-5 w-5 mr-2" />
                    Start New Timer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start Time Tracking</DialogTitle>
                    <DialogDescription>What are you working on?</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleStartTimer} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g., Development, Meeting, Learning"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (optional)</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief description of the task"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Link to Task (optional)</Label>
                      <Select
                        value={formData.taskId || 'none'}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            taskId: value === 'none' ? '' : value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a task" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No task link</SelectItem>
                          {tasks.map((task) => (
                            <SelectItem key={task.id} value={task.id}>
                              {task.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Link this time entry to a task so you can jump to its details later.
                      </p>
                    </div>
                    <Button type="submit" className="w-full">
                      <Play className="h-4 w-4 mr-2" />
                      Start Timer
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(totalTimeToday)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sessions Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayEntries.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(categorySummary).length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Category Summary */}
        {Object.keys(categorySummary).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Time by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(categorySummary)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, duration]) => (
                    <div key={category} className="flex items-center justify-between p-2 border rounded">
                      <span className="font-medium">{category}</span>
                      <Badge variant="secondary">{formatDuration(duration)}</Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Time Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timeEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No time entries yet. Start tracking your time!
                </p>
              ) : (
                sortedEntries.slice(0, 10).map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-3 border rounded hover:shadow-sm transition-shadow ${
                        entry.taskId ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => entry.taskId && handleNavigateToTask(entry.taskId)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{entry.category}</span>
                          {entry.isRunning && (
                            <Badge variant="default" className="animate-pulse">
                              Running
                            </Badge>
                          )}
                          {entry.taskId && (
                            <Badge variant="outline">
                              Linked Task
                            </Badge>
                          )}
                        </div>
                        {entry.description && (
                          <p className="text-sm text-muted-foreground">{entry.description}</p>
                        )}
                        {entry.taskId && (
                          <p className="text-xs text-muted-foreground">
                            Task: {findTaskTitle(entry.taskId) || 'Unknown task'}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(entry.startTime), 'MMM d, h:mm a')}
                          {entry.endTime && ` - ${format(new Date(entry.endTime), 'h:mm a')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.taskId && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigateToTask(entry.taskId!);
                            }}
                          >
                            View Task
                          </Button>
                        )}
                        {entry.duration !== undefined && (
                          <Badge variant="outline">{formatDuration(entry.duration)}</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTimeEntry(entry.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute>
  );
}
