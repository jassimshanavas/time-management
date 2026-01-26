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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                  Reminders
                </h1>
                <p className="text-muted-foreground">Never miss important events</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedProjectId && (
                  <Badge variant="outline" className="h-9 px-4 flex items-center gap-2 bg-background/50 backdrop-blur-sm border-primary/10">
                    <span className="text-muted-foreground mr-1 hidden sm:inline">Filtered by:</span>
                    {selectedProjectId === 'personal' ? 'Personal' : projects.find(p => p.id === selectedProjectId)?.name}
                  </Badge>
                )}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="shadow-lg shadow-primary/20">
                      <Plus className="h-4 w-4 mr-2" />
                      New Reminder
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Reminder</DialogTitle>
                      <DialogDescription>Set up a reminder for important events</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                          className="bg-muted/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="bg-muted/30"
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
                          className="bg-muted/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="projectId">Project (Optional)</Label>
                        <ProjectSelector
                          value={formData.projectId}
                          onChange={(value) => setFormData({ ...formData, projectId: value })}
                          placeholder="Select a project"
                        />
                      </div>
                      <Button type="submit" className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20">
                        Create Reminder
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid gap-4">
              {sortedReminders.length === 0 ? (
                <Card className="bg-background/40 backdrop-blur-sm border-dashed border-2 py-12">
                  <CardContent className="flex flex-col items-center justify-center text-center">
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <Bell className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-xl font-semibold mb-2">No reminders yet</p>
                    <p className="text-muted-foreground max-w-xs mx-auto">
                      {reminders.length === 0
                        ? 'Set up your first reminder to never miss an important event again.'
                        : 'Try adjusting your filters to find what you looking for.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                sortedReminders.map((reminder) => (
                  <Card
                    key={reminder.id}
                    className={`group relative overflow-hidden transition-all duration-300 shadow-lg ${reminder.completed ? 'opacity-60 bg-muted/20 border-transparent' : 'bg-background/40 backdrop-blur-xl border-primary/10 hover:border-primary/30 hover:shadow-xl'}`}
                  >
                    {!reminder.completed && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-pink-500 to-violet-500" />
                    )}
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-4">
                        <div className="pt-1">
                          <Checkbox
                            checked={reminder.completed}
                            onCheckedChange={() => toggleComplete(reminder.id, reminder.completed)}
                            className={`h-5 w-5 rounded-full border-2 transition-all duration-300 ${reminder.completed ? 'bg-green-500 border-green-500' : 'border-primary/30'}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className={`text-base sm:text-lg font-bold truncate transition-all duration-300 ${reminder.completed ? 'line-through text-muted-foreground opacity-60' : ''}`}>
                              {reminder.title}
                            </h3>
                            {reminder.projectId && <ProjectBadge projectId={reminder.projectId} className="h-5 text-[10px]" />}
                          </div>
                          {reminder.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3 max-w-2xl">{reminder.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${reminder.completed ? 'bg-muted border-transparent' : 'bg-pink-500/10 border-pink-500/20 text-pink-600'}`}>
                              <Bell className="h-3.5 w-3.5" />
                              <span>{format(new Date(reminder.dueDate), 'MMM d, h:mm a')}</span>
                            </div>

                            {reminder.completed && (
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                                <Check className="h-3.5 w-3.5" />
                                <span>Completed</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteReminder(reminder.id)}
                          className="h-9 w-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
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
