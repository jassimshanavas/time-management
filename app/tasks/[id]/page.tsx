'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useStore } from '@/lib/store';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Edit,
  Trash2,
  Target,
  Flag,
  CheckCircle2,
  Circle,
  PlayCircle,
  Tag,
  MessageSquare,
  Send,
  X,
  ListTodo,
  Link2,
  BookOpen,
  Play,
  Square,
  Plus,
  RotateCcw
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { Task, TaskComment, TaskSubtask, TaskJournalEntry, TimeEntry } from '@/types';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';

function TaskDetailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const taskId = params.id as string;
  const {
    tasks,
    goals,
    updateTask,
    deleteTask,
    timeEntries,
    addTimeEntry,
    stopTimeEntry,
    deleteTimeEntry,
  } = useStore();
  const [task, setTask] = useState<Task | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newJournalEntry, setNewJournalEntry] = useState('');
  const [isAddingJournal, setIsAddingJournal] = useState(false);
  const [timerForm, setTimerForm] = useState({ category: '', description: '' });
  const [manualEntry, setManualEntry] = useState({
    category: '',
    description: '',
    hours: '0',
    minutes: '30',
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  const runningEntry = timeEntries.find((entry) => entry.isRunning);
  const taskRunningEntry =
    runningEntry && task && runningEntry.taskId === task?.id ? runningEntry : null;
  const otherTaskRunning =
    runningEntry && task && runningEntry.taskId && runningEntry.taskId !== task.id
      ? runningEntry
      : null;

  const formatDuration = (minutes: number) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  const getElapsedTime = (startTime: Date) => {
    const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getEntryDuration = (entry: TimeEntry) => {
    const start = toDate(entry.startTime);
    if (!start) return 0;
    if (entry.duration) return entry.duration;
    if (entry.isRunning) {
      return Math.max(
        0,
        Math.floor((currentTime.getTime() - start.getTime()) / 60000)
      );
    }
    const end = entry.endTime ? toDate(entry.endTime) : null;
    const effectiveEnd = end || currentTime;
    return Math.max(
      0,
      Math.floor((effectiveEnd.getTime() - start.getTime()) / 60000)
    );
  };

  const isSameDay = (dateA: Date, dateB: Date) =>
    dateA.toDateString() === dateB.toDateString();

  const todayDate = new Date();

  const handleStartTaskTimer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !timerForm.category.trim()) return;
    if (otherTaskRunning) {
      alert('Another timer is currently running. Please stop it before starting a new one.');
      return;
    }
    await addTimeEntry({
      category: timerForm.category.trim(),
      description: timerForm.description.trim() || undefined,
      taskId: task.id,
      startTime: new Date(),
      isRunning: true,
    });
    setTimerForm((prev) => ({ ...prev, description: '' }));
  };

  const handleLogManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    const hours = parseInt(manualEntry.hours, 10) || 0;
    const minutes = parseInt(manualEntry.minutes, 10) || 0;
    const totalMinutes = hours * 60 + minutes;
    if (totalMinutes <= 0) return;
    const now = new Date();
    const startTime = new Date(now.getTime() - totalMinutes * 60000);
    await addTimeEntry({
      category: manualEntry.category.trim() || task.title,
      description: manualEntry.description.trim() || undefined,
      taskId: task.id,
      startTime,
      endTime: now,
      duration: totalMinutes,
      isRunning: false,
    });
    setManualEntry((prev) => ({
      ...prev,
      description: '',
      hours: '0',
      minutes: '30',
    }));
  };

  const handleResumeEntry = async (entry: TimeEntry) => {
    if (!task || runningEntry) return;
    await addTimeEntry({
      category: entry.category,
      description: entry.description,
      taskId: task.id,
      startTime: new Date(),
      isRunning: true,
    });
  };

  const handleDeleteTimeEntry = async (entryId: string) => {
    if (confirm('Delete this time entry?')) {
      await deleteTimeEntry(entryId);
    }
  };

  // Helper function to safely convert dates
  const toDate = (date: any): Date | null => {
    if (!date) return null;
    try {
      // Handle Firestore Timestamp
      if (date?.toDate && typeof date.toDate === 'function') {
        return date.toDate();
      }
      // Handle Date object
      if (date instanceof Date) {
        return isNaN(date.getTime()) ? null : date;
      }
      // Handle string or number
      const converted = new Date(date);
      return isNaN(converted.getTime()) ? null : converted;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const foundTask = tasks.find(t => t.id === taskId);
    if (foundTask) {
      setTask(foundTask);
    }
  }, [taskId, tasks]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!task) return;
    setTimerForm((prev) =>
      prev.category ? prev : { ...prev, category: task.title }
    );
    setManualEntry((prev) =>
      prev.category ? prev : { ...prev, category: task.title }
    );
  }, [task]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return;

    const comment: TaskComment = {
      id: `comment-${Date.now()}`,
      text: newComment.trim(),
      createdAt: new Date(),
    };

    const updatedComments = [...(task.comments || []), comment];
    await updateTask(task.id, { comments: updatedComments });
    setNewComment('');
    setIsAddingComment(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task) return;

    const updatedComments = (task.comments || []).filter(c => c.id !== commentId);
    await updateTask(task.id, { comments: updatedComments });
  };

  const handleAddSubtask = async () => {
    if (!task || !newSubtaskTitle.trim()) return;

    const subtask: TaskSubtask = {
      id: `subtask-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      done: false,
    };

    const updatedSubtasks = [...(task.subtasks || []), subtask];
    await updateTask(task.id, { subtasks: updatedSubtasks });
    setNewSubtaskTitle('');
    setIsAddingSubtask(false);
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!task || !task.subtasks) return;

    const updatedSubtasks = task.subtasks.map((subtask) =>
      subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask
    );
    await updateTask(task.id, { subtasks: updatedSubtasks });
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!task || !task.subtasks) return;

    const updatedSubtasks = task.subtasks.filter((subtask) => subtask.id !== subtaskId);
    await updateTask(task.id, { subtasks: updatedSubtasks });
  };

  const handleToggleDependency = async (dependencyId: string) => {
    if (!task) return;
    if (dependencyId === task.id) return;

    const currentDependencies = task.dependencyIds || [];
    const updatedDependencies = currentDependencies.includes(dependencyId)
      ? currentDependencies.filter((id) => id !== dependencyId)
      : [...currentDependencies, dependencyId];

    await updateTask(task.id, { dependencyIds: updatedDependencies });
  };

  const handleAddJournalEntry = async () => {
    if (!task || !newJournalEntry.trim()) return;

    const entry: TaskJournalEntry = {
      id: `journal-${Date.now()}`,
      text: newJournalEntry.trim(),
      createdAt: new Date(),
    };

    const updatedJournal = [...(task.journal || []), entry];
    await updateTask(task.id, { journal: updatedJournal });
    setNewJournalEntry('');
    setIsAddingJournal(false);
  };

  const handleDeleteJournalEntry = async (entryId: string) => {
    if (!task || !task.journal) return;

    const updatedJournal = task.journal.filter((entry) => entry.id !== entryId);
    await updateTask(task.id, { journal: updatedJournal });
  };

  const taskEntries = useMemo(() => {
    if (!task) return [];
    return timeEntries.filter((entry) => entry.taskId === task.id);
  }, [timeEntries, task?.id]);

  const totalTrackedMinutes = taskEntries.reduce(
    (acc, entry) => acc + getEntryDuration(entry),
    0
  );

  const todayTrackedMinutes = taskEntries.reduce((acc, entry) => {
    const start = toDate(entry.startTime);
    if (!start) return acc;
    return isSameDay(start, todayDate) ? acc + getEntryDuration(entry) : acc;
  }, 0);

  const averageSessionMinutes = taskEntries.length
    ? Math.round(totalTrackedMinutes / taskEntries.length)
    : 0;

  const progressToEstimate = task?.estimatedDuration
    ? Math.min(100, Math.round((totalTrackedMinutes / task.estimatedDuration) * 100))
    : null;

  const recentEntries = useMemo(
    () =>
      [...taskEntries]
        .sort(
          (a, b) =>
            (toDate(b.startTime)?.getTime() || 0) - (toDate(a.startTime)?.getTime() || 0)
        )
        .slice(0, 5),
    [taskEntries]
  );

  if (!task) {
    return (
      <ProtectedRoute>
        <DataLoader>
          <MainLayout>
            <div className="flex items-center justify-center min-h-[60vh]">
              <Card className="w-full max-w-md">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Task not found</p>
                  <Button
                    onClick={() => router.push('/tasks')}
                    className="mt-4"
                    variant="outline"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Tasks
                  </Button>
                </CardContent>
              </Card>
            </div>
          </MainLayout>
        </DataLoader>
      </ProtectedRoute>
    );
  }

  const linkedGoal = task.goalId ? goals.find(g => g.id === task.goalId) : null;
  const linkedMilestone = linkedGoal && task.milestoneId
    ? linkedGoal.milestones.find(m => m.id === task.milestoneId)
    : null;
  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter((s) => s.done).length || 0;
  const otherTasks = tasks.filter((t) => t.id !== task.id);

  const handleStatusChange = async (newStatus: Task['status']) => {
    await updateTask(task.id, { status: newStatus });
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(task.id);
      router.push('/tasks');
    }
  };

  const getStatusIcon = () => {
    switch (task.status) {
      case 'done':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'in-progress':
        return <PlayCircle className="h-6 w-6 text-yellow-500" />;
      default:
        return <Circle className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => {
                  const fromView = searchParams.get('fromView');
                  if (fromView === 'kanban' || fromView === 'timeline' || fromView === 'list') {
                    if (fromView === 'list') {
                      router.push('/tasks');
                    } else {
                      router.push(`/tasks?view=${fromView}`);
                    }
                  } else if (fromView === 'time-tracking-gantt') {
                    router.push('/timeline/gantt');
                  } else if (fromView === 'time-tracking') {
                    router.push('/time-tracking');
                  } else {
                    router.back();
                  }
                }}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/tasks?edit=${task.id}`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Cover Image */}
            {task.coverImage && (
              <div className="w-full h-64 md:h-80 overflow-hidden rounded-2xl shadow-lg border border-border/50">
                <img
                  src={task.coverImage}
                  alt={task.title}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
            )}

            {/* Main Task Card */}
            <Card className={`border-l-4 ${getPriorityColor()}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {getStatusIcon()}
                    <div className="flex-1">
                      <CardTitle className="text-3xl mb-2">{task.title}</CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            task.priority === 'high'
                              ? 'destructive'
                              : task.priority === 'medium'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          <Flag className="h-3 w-3 mr-1" />
                          {task.priority} priority
                        </Badge>
                        <Badge
                          variant={
                            task.status === 'done'
                              ? 'default'
                              : task.status === 'in-progress'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {task.status === 'done' ? 'Completed' : task.status === 'in-progress' ? 'In Progress' : 'To Do'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Description */}
                {task.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Description</h3>
                    <p className="text-base leading-relaxed">{task.description}</p>
                  </div>
                )}

                <Separator />

                {/* Quick Actions */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Status</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={task.status === 'todo' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('todo')}
                    >
                      <Circle className="h-4 w-4 mr-2" />
                      To Do
                    </Button>
                    <Button
                      size="sm"
                      variant={task.status === 'in-progress' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('in-progress')}
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      In Progress
                    </Button>
                    <Button
                      size="sm"
                      variant={task.status === 'done' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('done')}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Done
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Task Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Deadline */}
                  {task.deadline && toDate(task.deadline) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        Deadline
                      </div>
                      <p className="text-lg font-medium">
                        {format(toDate(task.deadline)!, 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(toDate(task.deadline)!, 'h:mm a')}
                      </p>
                    </div>
                  )}

                  {/* Scheduled Time */}
                  {task.scheduledStart && toDate(task.scheduledStart) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Scheduled Time
                      </div>
                      <p className="text-lg font-medium">
                        {format(toDate(task.scheduledStart)!, 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(toDate(task.scheduledStart)!, 'h:mm a')}
                        {task.scheduledEnd && toDate(task.scheduledEnd) && ` - ${format(toDate(task.scheduledEnd)!, 'h:mm a')}`}
                      </p>
                    </div>
                  )}

                  {/* Duration */}
                  {task.estimatedDuration && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Estimated Duration
                      </div>
                      <p className="text-lg font-medium">
                        {Math.floor(task.estimatedDuration / 60)}h {task.estimatedDuration % 60}m
                      </p>
                    </div>
                  )}

                  {/* Created Date */}
                  {toDate(task.createdAt) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        Created
                      </div>
                      <p className="text-lg font-medium">
                        {format(toDate(task.createdAt)!, 'MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(toDate(task.createdAt)!, 'h:mm a')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Linked Goal & Milestone */}
                {linkedGoal && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <Target className="h-4 w-4" />
                        Linked Goal
                      </div>
                      <Card className="bg-muted/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold mb-1">{linkedGoal.title}</h4>
                              {linkedGoal.description && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {linkedGoal.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-background rounded-full h-2 overflow-hidden">
                                  <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${linkedGoal.progress}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium">{linkedGoal.progress}%</span>
                              </div>
                            </div>
                          </div>
                          {linkedMilestone && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">
                                  {linkedMilestone.completed ? '✓' : '○'} {linkedMilestone.title}
                                </Badge>
                                {linkedMilestone.completedAt && toDate(linkedMilestone.completedAt) && (
                                  <span className="text-xs text-muted-foreground">
                                    Completed {format(toDate(linkedMilestone.completedAt)!, 'MMM d, yyyy')}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <Tag className="h-4 w-4" />
                        Tags
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {task.tags.map((tag, index) => (
                          <Badge key={index} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-5 w-5" />
                    <CardTitle className="text-lg">
                      Subtasks
                      {totalSubtasks > 0 && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({completedSubtasks}/{totalSubtasks} completed)
                        </span>
                      )}
                    </CardTitle>
                  </div>
                  {!isAddingSubtask && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAddingSubtask(true)}
                    >
                      Add Subtask
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAddingSubtask && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Subtask title"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsAddingSubtask(false);
                          setNewSubtaskTitle('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddSubtask}
                        disabled={!newSubtaskTitle.trim()}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}

                {task.subtasks && task.subtasks.length > 0 ? (
                  <div className="space-y-2">
                    {task.subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex items-center justify-between gap-3 p-2 border rounded-md bg-card"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={subtask.done}
                            onCheckedChange={() => handleToggleSubtask(subtask.id)}
                          />
                          <span
                            className={`text-sm ${subtask.done ? 'line-through text-muted-foreground' : ''}`}
                          >
                            {subtask.title}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSubtask(subtask.id)}
                          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : !isAddingSubtask && (
                  <p className="text-sm text-muted-foreground">
                    No subtasks yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  <CardTitle className="text-lg">
                    Dependencies
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {otherTasks.length > 0 ? (
                  <div className="space-y-2">
                    {otherTasks.map((other) => (
                      <div
                        key={other.id}
                        className="flex items-center justify-between gap-3 p-2 border rounded-md bg-card"
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={task.dependencyIds?.includes(other.id) || false}
                            onCheckedChange={() => handleToggleDependency(other.id)}
                          />
                          <div>
                            <p className="text-sm font-medium">{other.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {other.status}
                              <span className="mx-1">•</span>
                              {other.priority}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No other tasks available to set as dependencies.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    <CardTitle className="text-lg">
                      Comments {task.comments && task.comments.length > 0 && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({task.comments.length})
                        </span>
                      )}
                    </CardTitle>
                  </div>
                  {!isAddingComment && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAddingComment(true)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Add Comment
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Comment Form */}
                {isAddingComment && (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                    <Textarea
                      placeholder="Write your comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[100px] resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsAddingComment(false);
                          setNewComment('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Post Comment
                      </Button>
                    </div>
                  </div>
                )}

                {/* Comments List */}
                {task.comments && task.comments.length > 0 ? (
                  <div className="space-y-4">
                    {[...task.comments].reverse().map((comment) => (
                      <div
                        key={comment.id}
                        className="group relative p-4 border rounded-lg bg-card hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {comment.text}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {toDate(comment.createdAt) && format(toDate(comment.createdAt)!, 'MMMM d, yyyy \'at\' h:mm a')}
                              {comment.updatedAt && (
                                <span className="ml-2">(edited)</span>
                              )}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !isAddingComment && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No comments yet</p>
                    <p className="text-xs mt-1">Be the first to add a comment</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    <CardTitle className="text-lg">
                      Journal
                      {task.journal && task.journal.length > 0 && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({task.journal.length})
                        </span>
                      )}
                    </CardTitle>
                  </div>
                  {!isAddingJournal && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAddingJournal(true)}
                    >
                      Add Entry
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAddingJournal && (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                    <Textarea
                      placeholder="Write a quick reflection or notes..."
                      value={newJournalEntry}
                      onChange={(e) => setNewJournalEntry(e.target.value)}
                      className="min-h-[100px] resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsAddingJournal(false);
                          setNewJournalEntry('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddJournalEntry}
                        disabled={!newJournalEntry.trim()}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Save Entry
                      </Button>
                    </div>
                  </div>
                )}

                {task.journal && task.journal.length > 0 ? (
                  <div className="space-y-4">
                    {[...task.journal]
                      .sort(
                        (a, b) =>
                          (toDate(a.createdAt)?.getTime() || 0) -
                          (toDate(b.createdAt)?.getTime() || 0)
                      )
                      .reverse()
                      .map((entry) => (
                        <div
                          key={entry.id}
                          className="group relative p-4 border rounded-lg bg-card hover:bg-accent/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-2">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {entry.text}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {toDate(entry.createdAt) &&
                                  format(
                                    toDate(entry.createdAt)!,
                                    'MMMM d, yyyy \'at\' h:mm a'
                                  )}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteJournalEntry(entry.id)}
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : !isAddingJournal && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No journal entries yet</p>
                    <p className="text-xs mt-1">Capture reflections or progress notes here</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div className="w-0.5 h-full bg-border" />
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium">Task created</p>
                      <p className="text-xs text-muted-foreground">
                        {toDate(task.createdAt) && format(toDate(task.createdAt)!, 'MMMM d, yyyy \'at\' h:mm a')}
                      </p>
                    </div>
                  </div>
                  {task.updatedAt && toDate(task.updatedAt) && toDate(task.createdAt) &&
                    toDate(task.updatedAt)!.getTime() !== toDate(task.createdAt)!.getTime() && (
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">Task updated</p>
                          <p className="text-xs text-muted-foreground">
                            {format(toDate(task.updatedAt)!, 'MMMM d, yyyy \'at\' h:mm a')}
                          </p>
                        </div>
                      </div>
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

export default function TaskDetailPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground animate-pulse">Syncing task details...</p>
        </div>
      </MainLayout>
    }>
      <TaskDetailPageContent />
    </Suspense>
  );
}
