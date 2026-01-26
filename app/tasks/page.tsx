'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStore } from '@/lib/store';
import { Plus, Trash2, Edit, Calendar as CalendarIcon, LayoutGrid, List, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { Task, TaskStatus, TaskPriority } from '@/types';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import { TaskTimeline } from '@/components/task-timeline';
import { TaskGanttTimeline } from '@/components/task-gantt-timeline';
import { ProjectSelector } from '@/components/projects/project-selector';
import { ProjectBadge } from '@/components/projects/project-badge';

export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tasks, addTask, updateTask, deleteTask, userId: currentUserId, goals, projects, selectedProjectId } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const viewParam = searchParams.get('view');
  const viewMode: 'list' | 'kanban' | 'timeline' =
    viewParam === 'kanban' || viewParam === 'timeline' ? (viewParam as 'kanban' | 'timeline') : 'list';

  const setViewMode = (mode: 'list' | 'kanban' | 'timeline') => {
    const params = new URLSearchParams(searchParams.toString());
    if (mode === 'list') {
      params.delete('view');
    } else {
      params.set('view', mode);
    }
    const query = params.toString();
    router.push(query ? `/tasks?${query}` : '/tasks');
  };
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    deadline: '',
    scheduledStart: '',
    estimatedDuration: 60,
    goalId: '',
    milestoneId: '',
    projectId: '' as string | undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTask) {
      const scheduledStart = formData.scheduledStart ? new Date(formData.scheduledStart) : undefined;
      const scheduledEnd = scheduledStart && formData.estimatedDuration ?
        new Date(scheduledStart.getTime() + formData.estimatedDuration * 60000) : undefined;

      updateTask(editingTask.id, {
        ...formData,
        deadline: formData.deadline ? new Date(formData.deadline) : undefined,
        scheduledStart,
        scheduledEnd,
        estimatedDuration: formData.estimatedDuration || undefined,
        goalId: formData.goalId || undefined,
        milestoneId: formData.milestoneId || undefined,
        projectId: formData.projectId || undefined,
      });
    } else {
      const scheduledStart = formData.scheduledStart ? new Date(formData.scheduledStart) : undefined;
      const scheduledEnd = scheduledStart && formData.estimatedDuration ?
        new Date(scheduledStart.getTime() + formData.estimatedDuration * 60000) : undefined;

      const newTask: Omit<Task, 'id' | 'userId'> = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        deadline: formData.deadline ? new Date(formData.deadline) : undefined,
        scheduledStart,
        scheduledEnd,
        estimatedDuration: formData.estimatedDuration || undefined,
        goalId: formData.goalId || undefined,
        milestoneId: formData.milestoneId || undefined,
        projectId: formData.projectId || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      addTask(newTask);
    }

    setFormData({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      deadline: '',
      scheduledStart: '',
      estimatedDuration: 60,
      goalId: '',
      milestoneId: '',
      projectId: '',
    });
    setEditingTask(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      deadline: task.deadline ? format(new Date(task.deadline), 'yyyy-MM-dd') : '',
      scheduledStart: task.scheduledStart ? format(new Date(task.scheduledStart), "yyyy-MM-dd'T'HH:mm") : '',
      estimatedDuration: task.estimatedDuration || 60,
      goalId: task.goalId || '',
      milestoneId: task.milestoneId || '',
      projectId: task.projectId || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      // Debug: Check task data before deleting
      const task = tasks.find(t => t.id === id);
      console.log('Delete Debug Info:', {
        taskId: id,
        taskUserId: task?.userId,
        currentUserId: currentUserId,
        userIdMatch: task?.userId === currentUserId,
        task: task
      });

      try {
        await deleteTask(id);
        console.log('Task deleted successfully:', id);
      } catch (error) {
        console.error('Failed to delete task:', error);
        console.error('Error details:', {
          taskUserId: task?.userId,
          currentUserId: currentUserId,
          match: task?.userId === currentUserId
        });
        alert(`Failed to delete task. Check console for details.\n\nTask userId: ${task?.userId}\nCurrent userId: ${currentUserId}\nMatch: ${task?.userId === currentUserId}`);
      }
    }
  };

  const filterTasksByStatus = (status?: TaskStatus) => {
    let filtered = tasks;

    // Filter by global project context (Workspace)
    if (selectedProjectId !== null) {
      if (selectedProjectId === 'personal') {
        filtered = filtered.filter((task) => !task.projectId);
      } else {
        filtered = filtered.filter((task) => task.projectId === selectedProjectId);
      }
    }

    // Filter by status if provided
    if (status) {
      filtered = filtered.filter((task) => task.status === status);
    }

    return filtered;
  };

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<TaskStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    setDraggedTaskId(task.id);
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedTaskId(null);
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropZone(status);
  };

  const handleDragLeave = () => {
    setDropZone(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    e.stopPropagation();

    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find(t => t.id === taskId);

    if (task && task.status !== newStatus) {
      try {
        await updateTask(taskId, { status: newStatus });
      } catch (error: any) {
        // Error is already handled in the store
        // Non-existent tasks are automatically removed
        if (!error?.message?.includes('does not exist')) {
          console.error('Failed to update task status:', error);
          alert('Failed to update task. Please try again.');
        }
      }
    }

    setDraggedTaskId(null);
    setDropZone(null);
  };

  const TaskCard = ({ task, compact = false, originView = 'list' }: { task: Task; compact?: boolean; originView?: 'list' | 'kanban' }) => {
    const linkedGoal = task.goalId ? goals.find(g => g.id === task.goalId) : null;
    const linkedMilestone = linkedGoal && task.milestoneId
      ? linkedGoal.milestones.find(m => m.id === task.milestoneId)
      : null;
    const linkedProject = task.projectId ? projects.find(p => p.id === task.projectId) : null;

    // Compact list view design
    if (compact) {
      return (
        <div
          className="group relative flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 hover:shadow-md transition-all duration-200 cursor-pointer"
          onClick={(e) => {
            // Don't navigate if clicking on action buttons
            if (!(e.target as HTMLElement).closest('button')) {
              router.push(`/tasks/${task.id}?fromView=${originView}`);
            }
          }}
        >
          {/* Priority indicator bar */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${task.priority === 'high' ? 'bg-red-500' :
            task.priority === 'medium' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`} />

          {/* Status checkbox */}
          <div className="flex items-center">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'done'
              ? 'bg-green-500 border-green-500'
              : task.status === 'in-progress'
                ? 'bg-yellow-500 border-yellow-500'
                : 'border-muted-foreground/30 hover:border-muted-foreground'
              }`}>
              {task.status === 'done' && (
                <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
              )}
              {task.status === 'in-progress' && (
                <div className="w-2 h-2 bg-white rounded-full" />
              )}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-semibold text-sm truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                {task.title}
              </h3>
              <Badge
                variant={
                  task.priority === 'high'
                    ? 'destructive'
                    : task.priority === 'medium'
                      ? 'default'
                      : 'secondary'
                }
                className="text-xs px-2 py-0 h-5"
              >
                {task.priority}
              </Badge>
            </div>

            {task.description && (
              <p className="text-xs text-muted-foreground truncate mb-2">{task.description}</p>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              {linkedGoal && (
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                    🎯 {linkedGoal.title}
                  </Badge>
                  {linkedMilestone && (
                    <Badge variant="secondary" className="text-xs px-2 py-0 h-5">
                      {linkedMilestone.completed ? '✓' : '○'} {linkedMilestone.title}
                    </Badge>
                  )}
                </div>
              )}
              {linkedProject && (
                <Badge
                  variant="outline"
                  className="text-xs px-2 py-0 h-5"
                  style={{ borderColor: `${linkedProject.color}40`, color: linkedProject.color }}
                >
                  📁 {linkedProject.name}
                </Badge>
              )}
              {task.deadline && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <CalendarIcon className="h-3 w-3 mr-1" />
                  {format(new Date(task.deadline), 'MMM d, yyyy')}
                </div>
              )}
              {task.estimatedDuration && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {Math.floor(task.estimatedDuration / 60)}h {task.estimatedDuration % 60}m
                </div>
              )}
              {task.dependencyIds && task.dependencyIds.length > 0 && (
                <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                  <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {task.dependencyIds.length} {task.dependencyIds.length === 1 ? 'dependency' : 'dependencies'}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(task);
              }}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(task.id);
              }}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Original card view for kanban
    return (
      <Card
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('button')) {
            router.push(`/tasks/${task.id}?fromView=${originView}`);
          }
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{task.title}</h3>
              {task.description && (
                <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
              )}
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
                  {task.priority}
                </Badge>
                {linkedGoal && (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      🎯 {linkedGoal.title}
                    </Badge>
                    {linkedMilestone && (
                      <Badge variant="secondary" className="text-xs">
                        {linkedMilestone.completed ? '✓' : '○'} {linkedMilestone.title}
                      </Badge>
                    )}
                  </div>
                )}
                {task.deadline && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {format(new Date(task.deadline), 'MMM d, yyyy')}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(task);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(task.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
                <p className="text-muted-foreground">Manage your tasks and to-dos</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Information about active filter */}
                {selectedProjectId && (
                  <Badge variant="outline" className="h-9 px-4 hidden md:flex items-center gap-2">
                    <span className="text-muted-foreground mr-1">Filtered by:</span>
                    {selectedProjectId === 'personal' ? 'Personal' : projects.find(p => p.id === selectedProjectId)?.name}
                  </Badge>
                )}

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                  <Button
                    size="sm"
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4 mr-1" />
                    List
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('kanban')}
                  >
                    <LayoutGrid className="h-4 w-4 mr-1" />
                    Kanban
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('timeline')}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Timeline
                  </Button>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingTask(null);
                      setFormData({
                        title: '',
                        description: '',
                        status: 'todo',
                        priority: 'medium',
                        deadline: '',
                        scheduledStart: '',
                        estimatedDuration: 60,
                        goalId: '',
                        milestoneId: '',
                        projectId: '',
                      });
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Task
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
                      <DialogDescription>
                        {editingTask ? 'Update task details' : 'Add a new task to your list'}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value: TaskStatus) =>
                              setFormData({ ...formData, status: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="todo">To Do</SelectItem>
                              <SelectItem value="in-progress">In Progress</SelectItem>
                              <SelectItem value="done">Done</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="priority">Priority</Label>
                          <Select
                            value={formData.priority}
                            onValueChange={(value: TaskPriority) =>
                              setFormData({ ...formData, priority: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="projectId">Project (Optional)</Label>
                        <ProjectSelector
                          value={formData.projectId}
                          onChange={(value) => setFormData({ ...formData, projectId: value })}
                          placeholder="Select a project"
                        />
                        <p className="text-xs text-muted-foreground">
                          Assign this task to a project for better organization
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="goalId">Link to Goal (Optional)</Label>
                        <Select
                          value={formData.goalId || 'none'}
                          onValueChange={(value) => {
                            const newGoalId = value === 'none' ? '' : value;
                            setFormData({ ...formData, goalId: newGoalId, milestoneId: '' });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a goal" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Goal</SelectItem>
                            {goals.map((goal) => (
                              <SelectItem key={goal.id} value={goal.id}>
                                {goal.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Link this task to a goal to track progress
                        </p>
                      </div>

                      {/* Milestone Selector - Only shown when a goal is selected */}
                      {formData.goalId && (() => {
                        const selectedGoal = goals.find(g => g.id === formData.goalId);
                        const hasMilestones = selectedGoal && selectedGoal.milestones && selectedGoal.milestones.length > 0;

                        if (!hasMilestones) return null;

                        return (
                          <div className="space-y-2">
                            <Label htmlFor="milestoneId">Link to Milestone (Optional)</Label>
                            <Select
                              value={formData.milestoneId || 'none'}
                              onValueChange={(value) => setFormData({ ...formData, milestoneId: value === 'none' ? '' : value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a milestone" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Milestone</SelectItem>
                                {selectedGoal.milestones.map((milestone) => (
                                  <SelectItem key={milestone.id} value={milestone.id}>
                                    {milestone.completed ? '✓ ' : '○ '}{milestone.title}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Assign this task to a specific milestone within {selectedGoal.title}
                            </p>
                          </div>
                        );
                      })()}

                      <div className="space-y-2">
                        <Label htmlFor="deadline">Deadline</Label>
                        <Input
                          id="deadline"
                          type="date"
                          value={formData.deadline}
                          onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        />
                      </div>

                      {/* Optional Time Scheduling */}
                      <div className="border-t pt-4 space-y-4">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm font-medium">Schedule Time (Optional)</Label>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="scheduledStart" className="text-sm">Scheduled Start Time</Label>
                          <Input
                            id="scheduledStart"
                            type="datetime-local"
                            value={formData.scheduledStart}
                            onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                            placeholder="When to start this task"
                          />
                          <p className="text-xs text-muted-foreground">
                            Set a specific time to work on this task
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="estimatedDuration" className="text-sm">Estimated Duration (minutes)</Label>
                          <Input
                            id="estimatedDuration"
                            type="number"
                            min="15"
                            step="15"
                            value={formData.estimatedDuration}
                            onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) || 60 })}
                            placeholder="60"
                          />
                          <p className="text-xs text-muted-foreground">
                            How long will this task take? ({Math.floor(formData.estimatedDuration / 60)}h {formData.estimatedDuration % 60}m)
                          </p>
                        </div>
                      </div>

                      <Button type="submit" className="w-full">
                        {editingTask ? 'Update Task' : 'Create Task'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {viewMode === 'timeline' ? (
              <div className="space-y-4">
                {/* Date selector */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
                  >
                    Previous Day
                  </Button>
                  <div className="flex-1 text-center">
                    <Input
                      type="date"
                      value={format(selectedDate, 'yyyy-MM-dd')}
                      onChange={(e) => setSelectedDate(new Date(e.target.value))}
                      className="max-w-xs mx-auto"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
                  >
                    Next Day
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setSelectedDate(new Date())}
                  >
                    Today
                  </Button>
                </div>
                <TaskGanttTimeline tasks={tasks} goals={goals} selectedDate={selectedDate} />
              </div>
            ) : viewMode === 'list' ? (
              <Tabs defaultValue="all" className="w-full">
                <TabsList>
                  <TabsTrigger value="all">All ({tasks.length})</TabsTrigger>
                  <TabsTrigger value="todo">To Do ({filterTasksByStatus('todo').length})</TabsTrigger>
                  <TabsTrigger value="in-progress">
                    In Progress ({filterTasksByStatus('in-progress').length})
                  </TabsTrigger>
                  <TabsTrigger value="done">Done ({filterTasksByStatus('done').length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-3 mt-6">
                  {tasks.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">No tasks yet. Create your first task!</p>
                      </CardContent>
                    </Card>
                  ) : (
                    tasks.map((task) => <TaskCard key={task.id} task={task} compact originView="list" />)
                  )}
                </TabsContent>

                <TabsContent value="todo" className="space-y-3 mt-6">
                  {filterTasksByStatus('todo').length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">No tasks in this category</p>
                      </CardContent>
                    </Card>
                  ) : (
                    filterTasksByStatus('todo').map((task) => (
                      <TaskCard key={task.id} task={task} compact originView="list" />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="in-progress" className="space-y-3 mt-6">
                  {filterTasksByStatus('in-progress').length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">No tasks in this category</p>
                      </CardContent>
                    </Card>
                  ) : (
                    filterTasksByStatus('in-progress').map((task) => (
                      <TaskCard key={task.id} task={task} compact originView="list" />
                    ))
                  )}
                </TabsContent>

                <TabsContent value="done" className="space-y-3 mt-6">
                  {filterTasksByStatus('done').length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">No tasks in this category</p>
                      </CardContent>
                    </Card>
                  ) : (
                    filterTasksByStatus('done').map((task) => (
                      <TaskCard key={task.id} task={task} compact originView="list" />
                    ))
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {/* To Do Column */}
                <div
                  className="space-y-2"
                  onDragOver={(e) => handleDragOver(e, 'todo')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'todo')}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">To Do</h3>
                    <Badge variant="secondary">{filterTasksByStatus('todo').length}</Badge>
                  </div>
                  <div className={`space-y-3 min-h-[200px] rounded-lg p-3 transition-colors ${dropZone === 'todo' ? 'bg-primary/10 border-2 border-primary border-dashed' : 'bg-muted/20'
                    }`}>
                    {filterTasksByStatus('todo').map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        className="cursor-move transition-opacity"
                      >
                        <TaskCard task={task} originView="kanban" />
                      </div>
                    ))}
                    {filterTasksByStatus('todo').length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Drop tasks here
                      </p>
                    )}
                  </div>
                </div>

                {/* In Progress Column */}
                <div
                  className="space-y-2"
                  onDragOver={(e) => handleDragOver(e, 'in-progress')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'in-progress')}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">In Progress</h3>
                    <Badge variant="secondary">{filterTasksByStatus('in-progress').length}</Badge>
                  </div>
                  <div className={`space-y-3 min-h-[200px] rounded-lg p-3 transition-colors ${dropZone === 'in-progress' ? 'bg-primary/10 border-2 border-primary border-dashed' : 'bg-muted/20'
                    }`}>
                    {filterTasksByStatus('in-progress').map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        className="cursor-move transition-opacity"
                      >
                        <TaskCard task={task} originView="kanban" />
                      </div>
                    ))}
                    {filterTasksByStatus('in-progress').length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Drop tasks here
                      </p>
                    )}
                  </div>
                </div>

                {/* Done Column */}
                <div
                  className="space-y-2"
                  onDragOver={(e) => handleDragOver(e, 'done')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'done')}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">Done</h3>
                    <Badge variant="secondary">{filterTasksByStatus('done').length}</Badge>
                  </div>
                  <div className={`space-y-3 min-h-[200px] rounded-lg p-3 transition-colors ${dropZone === 'done' ? 'bg-primary/10 border-2 border-primary border-dashed' : 'bg-muted/20'
                    }`}>
                    {filterTasksByStatus('done').map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        className="cursor-move transition-opacity"
                      >
                        <TaskCard task={task} originView="kanban" />
                      </div>
                    ))}
                    {filterTasksByStatus('done').length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Drop tasks here
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute>
  );
}
