'use client';

import { Suspense, useState } from 'react';
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
import { Plus, Trash2, Edit, Calendar as CalendarIcon, LayoutGrid, List, Clock, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus, TaskPriority } from '@/types';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import { TaskTimeline } from '@/components/task-timeline';
import { TaskGanttTimeline } from '@/components/task-gantt-timeline';
import { ProjectSelector } from '@/components/projects/project-selector';
import { ProjectBadge } from '@/components/projects/project-badge';

function TasksPageContent() {
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
    coverImage: '',
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
        coverImage: formData.coverImage || undefined,
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
        coverImage: formData.coverImage || undefined,
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
      coverImage: '',
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
      coverImage: task.coverImage || '',
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
          className="group relative flex items-center gap-2.5 sm:gap-4 p-2.5 sm:p-4 rounded-xl border bg-background/40 backdrop-blur-md hover:border-primary/20 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest('button')) {
              router.push(`/tasks/${task.id}?fromView=${originView}`);
            }
          }}
        >
          {/* Priority indicator bar */}
          <div className={`absolute left-0 top-0 bottom-0 w-0.5 sm:w-1 rounded-l-lg ${task.priority === 'high' ? 'bg-rose-500' :
            task.priority === 'medium' ? 'bg-amber-500' :
              'bg-blue-500'
            }`} />

          {/* Status checkbox */}
          <div className="flex items-center shrink-0">
            <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${task.status === 'done'
              ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
              : task.status === 'in-progress'
                ? 'bg-blue-500 border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                : 'border-muted-foreground/30 hover:border-primary/50'
              }`}>
              {task.status === 'done' && (
                <svg className="w-2.5 h-2.5 text-white animate-in zoom-in duration-300" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
              )}
              {task.status === 'in-progress' && (
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              )}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className={`font-bold text-xs sm:text-base truncate transition-all duration-300 tracking-tight ${task.status === 'done' ? 'line-through text-muted-foreground/60 opacity-60' : ''}`}>
                {task.title}
              </h3>
              <Badge
                variant="outline"
                className={cn(
                  "text-[8px] px-1 py-0 h-3.5 uppercase tracking-widest font-black border-transparent",
                  task.priority === 'high' ? "bg-rose-500/10 text-rose-500" :
                    task.priority === 'medium' ? "bg-amber-500/10 text-amber-500" :
                      "bg-blue-500/10 text-blue-500"
                )}
              >
                {task.priority}
              </Badge>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {linkedProject && (
                <div className="flex items-center gap-1 px-1.5 py-0 rounded-md border text-[8px] font-black uppercase tracking-widest"
                  style={{ borderColor: `${linkedProject.color}20`, color: linkedProject.color, backgroundColor: `${linkedProject.color}08` }}>
                  {linkedProject.name}
                </div>
              )}
              {task.deadline && (
                <div className="flex items-center text-[8px] font-black uppercase tracking-tighter text-muted-foreground/60">
                  <Clock className="h-2.5 w-2.5 mr-0.5 opacity-50" />
                  {format(new Date(task.deadline), 'MMM d')}
                </div>
              )}
            </div>
          </div>

          {/* Actions - Desktop only for less clutter on mobile */}
          <div className="hidden sm:flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); handleEdit(task); }}
              className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary rounded-lg"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive rounded-lg"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      );
    }

    // Original card view for kanban
    return (
      <Card
        className="group relative overflow-hidden bg-background/60 backdrop-blur-md border-primary/5 hover:border-primary/20 hover:shadow-xl transition-all duration-300 cursor-pointer rounded-2xl"
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('button')) {
            router.push(`/tasks/${task.id}?fromView=${originView}`);
          }
        }}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${task.priority === 'high' ? 'bg-rose-500' :
          task.priority === 'medium' ? 'bg-amber-500' :
            'bg-blue-500'
          }`} />

        {task.coverImage && (
          <div className="w-full h-24 overflow-hidden rounded-t-xl border-b border-primary/5">
            <img
              src={task.coverImage}
              alt={task.title}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500"
            />
          </div>
        )}
        <CardContent className={cn("p-3 sm:p-4", task.coverImage && "pt-3")}>
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-xs sm:text-sm leading-tight line-clamp-2 tracking-tight group-hover:text-primary transition-colors">
                {task.title}
              </h3>
              <div className="flex shrink-0 gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-6 w-6 rounded-lg" onClick={(e) => { e.stopPropagation(); handleEdit(task); }}>
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-1">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest bg-muted/50 border-transparent h-4 px-1">{task.priority}</Badge>
                {linkedProject && (
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest h-4 px-1" style={{ borderColor: `${linkedProject.color}30`, color: linkedProject.color }}>{linkedProject.name}</Badge>
                )}
              </div>
              {task.deadline && (
                <div className="flex items-center text-[9px] font-black uppercase tracking-tighter text-muted-foreground/60 whitespace-nowrap">
                  <Clock className="h-2.5 w-2.5 mr-0.5" />
                  {format(new Date(task.deadline), 'MMM d')}
                </div>
              )}
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
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/20 px-2 py-0 h-4">Strategic Nexus</Badge>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent italic">
                  Life Objectives
                </h1>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-70">Orchestrate your daily execution</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl backdrop-blur-md border border-primary/5 shadow-sm">
                  <Button
                    size="sm"
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('list')}
                    className="h-8 px-2.5 sm:px-4 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all data-[state=active]:shadow-md"
                  >
                    <List className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">List</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('kanban')}
                    className="h-8 px-2.5 sm:px-4 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all data-[state=active]:shadow-md"
                  >
                    <LayoutGrid className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Kanban</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('timeline')}
                    className="h-8 px-2.5 sm:px-4 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all data-[state=active]:shadow-md"
                  >
                    <Clock className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Timeline</span>
                  </Button>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="h-10 px-6 rounded-2xl font-black text-xs shadow-lg shadow-primary/20 flex-1 sm:flex-initial"
                      onClick={() => {
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
                          coverImage: '',
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Initiate
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

                      <div className="space-y-2">
                        <Label htmlFor="coverImage">Cover Image (URL)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="coverImage"
                            value={formData.coverImage}
                            onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                            placeholder="https://images.unsplash.com/..."
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const abstractImages = [
                                'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
                                'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?w=800&q=80',
                                'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=800&q=80',
                                'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80',
                                'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80',
                              ];
                              const randomImg = abstractImages[Math.floor(Math.random() * abstractImages.length)];
                              setFormData({ ...formData, coverImage: randomImg });
                            }}
                          >
                            <Sparkles className="h-4 w-4 mr-1 text-purple-500" />
                            Random
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Provide a URL or click "Random" for an abstract image
                        </p>
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
              // ... (timeline part remains similar but I should check if it needs responsive improvements)
              // For now keeping it since the user focused on list/kanban
              <div className="space-y-4">
                {/* Date selector */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg"
                    onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
                  >
                    Prev
                  </Button>
                  <div className="flex-1 text-center font-black text-xs uppercase tracking-widest">
                    {format(selectedDate, 'MMMM d, yyyy')}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg"
                    onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
                  >
                    Next
                  </Button>
                </div>
                <TaskGanttTimeline tasks={tasks} goals={goals} selectedDate={selectedDate} />
              </div>
            ) : viewMode === 'list' ? (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide bg-muted/30 border border-primary/5 p-1 rounded-xl no-scrollbar">
                  <TabsTrigger value="all" className="rounded-lg font-black text-[10px] uppercase tracking-widest">All {tasks.length}</TabsTrigger>
                  <TabsTrigger value="todo" className="rounded-lg px-4 font-black text-[10px] uppercase tracking-widest">Todo</TabsTrigger>
                  <TabsTrigger value="in-progress" className="rounded-lg px-4 font-black text-[10px] uppercase tracking-widest">Active</TabsTrigger>
                  <TabsTrigger value="done" className="rounded-lg px-4 font-black text-[10px] uppercase tracking-widest">Done</TabsTrigger>
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
              <div className="flex lg:grid lg:grid-cols-3 gap-4 h-full overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                {/* To Do Column */}
                <div
                  className="flex flex-col h-full min-w-[280px] sm:min-w-[320px] flex-shrink-0 lg:flex-shrink space-y-3"
                  onDragOver={(e) => handleDragOver(e, 'todo')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'todo')}
                >
                  <div className="flex items-center justify-between px-1">
                    <h3 className="font-black text-[10px] uppercase tracking-widest text-muted-foreground/80 italic">To Do Pulse</h3>
                    <Badge variant="secondary" className="font-black text-[10px] bg-muted/50 border-none rounded-lg h-5">{filterTasksByStatus('todo').length}</Badge>
                  </div>
                  <div className={`flex-1 space-y-3 min-h-[400px] rounded-2xl p-3 border border-primary/5 backdrop-blur-sm transition-all duration-300 ${dropZone === 'todo' ? 'bg-primary/10 border-primary border-dashed' : 'bg-muted/10 font-medium'
                    }`}>
                    {filterTasksByStatus('todo').map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        className="cursor-grab active:cursor-grabbing transition-opacity"
                      >
                        <TaskCard task={task} originView="kanban" />
                      </div>
                    ))}
                    {filterTasksByStatus('todo').length === 0 && (
                      <div className="flex flex-col items-center justify-center h-40 opacity-20 italic">
                        <Sparkles className="h-8 w-8 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Workspace Void</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* In Progress Column */}
                <div
                  className="flex flex-col h-full min-w-[280px] sm:min-w-[320px] flex-shrink-0 lg:flex-shrink space-y-3"
                  onDragOver={(e) => handleDragOver(e, 'in-progress')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'in-progress')}
                >
                  <div className="flex items-center justify-between px-1">
                    <h3 className="font-black text-[10px] uppercase tracking-widest text-primary italic">Active Flow</h3>
                    <Badge variant="secondary" className="font-black text-[10px] bg-blue-500/10 text-blue-500 border-none rounded-lg h-5">{filterTasksByStatus('in-progress').length}</Badge>
                  </div>
                  <div className={`flex-1 space-y-3 min-h-[400px] rounded-2xl p-3 border border-primary/5 backdrop-blur-sm transition-all duration-300 ${dropZone === 'in-progress' ? 'bg-primary/10 border-primary border-dashed' : 'bg-muted/10 font-medium'
                    }`}>
                    {filterTasksByStatus('in-progress').map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        className="cursor-grab active:cursor-grabbing transition-opacity"
                      >
                        <TaskCard task={task} originView="kanban" />
                      </div>
                    ))}
                    {filterTasksByStatus('in-progress').length === 0 && (
                      <div className="flex flex-col items-center justify-center h-40 opacity-20 italic">
                        <Sparkles className="h-8 w-8 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No Active Synapses</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Done Column */}
                <div
                  className="flex flex-col h-full min-w-[280px] sm:min-w-[320px] flex-shrink-0 lg:flex-shrink space-y-3"
                  onDragOver={(e) => handleDragOver(e, 'done')}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, 'done')}
                >
                  <div className="flex items-center justify-between px-1">
                    <h3 className="font-black text-[10px] uppercase tracking-widest text-emerald-500 italic">Materialized</h3>
                    <Badge variant="secondary" className="font-black text-[10px] bg-emerald-500/10 text-emerald-500 border-none rounded-lg h-5">{filterTasksByStatus('done').length}</Badge>
                  </div>
                  <div className={`flex-1 space-y-3 min-h-[400px] rounded-2xl p-3 border border-primary/5 backdrop-blur-sm transition-all duration-300 ${dropZone === 'done' ? 'bg-primary/10 border-primary border-dashed' : 'bg-muted/10 font-medium'
                    }`}>
                    {filterTasksByStatus('done').map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        className="cursor-grab active:cursor-grabbing transition-opacity"
                      >
                        <TaskCard task={task} originView="kanban" />
                      </div>
                    ))}
                    {filterTasksByStatus('done').length === 0 && (
                      <div className="flex flex-col items-center justify-center h-40 opacity-20 italic">
                        <Sparkles className="h-8 w-8 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">History Silent</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute >
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground animate-pulse">Initializing workspace...</p>
        </div>
      </MainLayout>
    }>
      <TasksPageContent />
    </Suspense>
  );
}
