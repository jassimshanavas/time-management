'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, Clock, Plus } from 'lucide-react';
import { format } from 'date-fns';
import type { Task, TaskStatus, TaskPriority } from '@/types';

interface CreateTaskDialogProps {
    children?: React.ReactNode;
    projectId?: string;
    defaultStatus?: TaskStatus;
}

export function CreateTaskDialog({ children, projectId, defaultStatus = 'todo' }: CreateTaskDialogProps) {
    const [open, setOpen] = useState(false);
    const { addTask, goals, projects } = useStore();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        status: defaultStatus as TaskStatus,
        priority: 'medium' as TaskPriority,
        deadline: '',
        scheduledStart: '',
        estimatedDuration: 60,
        goalId: '',
        projectId: projectId || '',
        milestoneId: '',
        tags: [] as string[],
    });

    useEffect(() => {
        if (open) {
            setFormData(prev => ({ ...prev, status: defaultStatus }));
        }
    }, [open, defaultStatus]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) return;

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
            projectId: projectId || undefined,
            milestoneId: formData.milestoneId || undefined,
            tags: formData.tags,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        addTask(newTask);

        setFormData({
            title: '',
            description: '',
            status: defaultStatus,
            priority: 'medium',
            deadline: '',
            scheduledStart: '',
            estimatedDuration: 60,
            goalId: '',
            projectId: projectId || '',
            milestoneId: '',
            tags: [],
        });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Task
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>
                        Add a new task to your {projectId ? 'project' : 'list'}.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            placeholder="What needs to be done?"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Add some details..."
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="projectId">Project (Optional)</Label>
                            <Select
                                value={formData.projectId || 'none'}
                                onValueChange={(value) => setFormData({ ...formData, projectId: value === 'none' ? '' : value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Project</SelectItem>
                                    {projects.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="goalId">Goal (Optional)</Label>
                            <Select
                                value={formData.goalId || 'none'}
                                onValueChange={(value) => setFormData({ ...formData, goalId: value === 'none' ? '' : value, milestoneId: '' })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select goal" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Goal</SelectItem>
                                    {goals.map((g) => (
                                        <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="deadline">Deadline</Label>
                            <Input
                                id="deadline"
                                type="date"
                                value={formData.deadline}
                                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tags">Category / Tag</Label>
                            <Select
                                onValueChange={(value) => setFormData({ ...formData, tags: [value] })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select tag" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Planning">Planning</SelectItem>
                                    <SelectItem value="UX Design">UX Design</SelectItem>
                                    <SelectItem value="UX Research">UX Research</SelectItem>
                                    <SelectItem value="Development">Development</SelectItem>
                                    <SelectItem value="Testing">Testing</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="border-t pt-4 space-y-4">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-sm font-medium">Schedule Time (Optional)</Label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="scheduledStart" className="text-sm">Start Time</Label>
                                <Input
                                    id="scheduledStart"
                                    type="datetime-local"
                                    value={formData.scheduledStart}
                                    onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="estimatedDuration" className="text-sm">Duration (min)</Label>
                                <Input
                                    id="estimatedDuration"
                                    type="number"
                                    min="15"
                                    step="15"
                                    value={formData.estimatedDuration}
                                    onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) || 60 })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="submit" className="w-full">Create Task</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
