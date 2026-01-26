'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, Trash2, Bell, Check } from 'lucide-react';
import { format } from 'date-fns';
import type { Reminder } from '@/types';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import { ProjectSelector } from '@/components/projects/project-selector';
import { ProjectBadge } from '@/components/projects/project-badge';

export default function RemindersPage() {
  const { reminders, addReminder, updateReminder, deleteReminder, selectedProjectId, projects } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    projectId: '' as string | undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newReminder: Omit<Reminder, 'id'> = {
      title: formData.title,
      description: formData.description,
      dueDate: new Date(formData.dueDate),
      completed: false,
      projectId: formData.projectId || undefined,
      createdAt: new Date(),
    };
    addReminder(newReminder);

    setFormData({ title: '', description: '', dueDate: '', projectId: '' });
    setIsDialogOpen(false);
  };

  const toggleComplete = (id: string, completed: boolean) => {
    updateReminder(id, { completed: !completed });
  };

  // Filter by global project context (Workspace)
  const filteredReminders = reminders.filter((reminder) => {
    if (selectedProjectId !== null) {
      if (selectedProjectId === 'personal') {
        if (reminder.projectId) return false;
      } else {
        if (reminder.projectId !== selectedProjectId) return false;
      }
    }
    return true;
  });

  const sortedReminders = [...filteredReminders].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
                <p className="text-muted-foreground">Never miss important events</p>
              </div>
              <div className="flex items-center gap-3">
                {selectedProjectId && (
                  <Badge variant="outline" className="h-10 px-4 hidden md:flex items-center gap-2">
                    <span className="text-muted-foreground mr-1">Filtered by:</span>
                    {selectedProjectId === 'personal' ? 'Personal' : projects.find(p => p.id === selectedProjectId)?.name}
                  </Badge>
                )}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Reminder
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Reminder</DialogTitle>
                      <DialogDescription>Set up a reminder for important events</DialogDescription>
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
                      <div className="space-y-2">
                        <Label htmlFor="dueDate">Due Date & Time</Label>
                        <Input
                          id="dueDate"
                          type="datetime-local"
                          value={formData.dueDate}
                          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="projectId">Project (Optional)</Label>
                        <ProjectSelector
                          value={formData.projectId}
                          onChange={(value) => setFormData({ ...formData, projectId: value })}
                          placeholder="Select a project"
                        />
                        <p className="text-xs text-muted-foreground">
                          Assign this reminder to a project
                        </p>
                      </div>
                      <Button type="submit" className="w-full">
                        Create Reminder
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="space-y-4">
              {sortedReminders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {reminders.length === 0
                        ? 'No reminders yet. Create your first reminder!'
                        : 'No reminders found for this filter'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                sortedReminders.map((reminder) => (
                  <Card
                    key={reminder.id}
                    className={reminder.completed ? 'opacity-60' : 'hover:shadow-md transition-shadow'}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={reminder.completed}
                          onCheckedChange={() => toggleComplete(reminder.id, reminder.completed)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <h3 className={`font-semibold mb-1 ${reminder.completed ? 'line-through' : ''}`}>
                            {reminder.title}
                          </h3>
                          {reminder.description && (
                            <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap text-sm">
                            <Bell className="h-4 w-4 text-pink-500" />
                            <span className="text-muted-foreground">
                              {format(new Date(reminder.dueDate), 'MMM d, yyyy h:mm a')}
                            </span>
                            {reminder.projectId && <ProjectBadge projectId={reminder.projectId} />}
                            {reminder.completed && (
                              <span className="flex items-center text-green-600">
                                <Check className="h-4 w-4 mr-1" />
                                Completed
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteReminder(reminder.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute>
  );
}
