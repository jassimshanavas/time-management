'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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

export default function RemindersPage() {
  const { reminders, addReminder, updateReminder, deleteReminder } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newReminder: Reminder = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description,
      dueDate: new Date(formData.dueDate),
      completed: false,
      createdAt: new Date(),
    };
    addReminder(newReminder);

    setFormData({ title: '', description: '', dueDate: '' });
    setIsDialogOpen(false);
  };

  const toggleComplete = (id: string, completed: boolean) => {
    updateReminder(id, { completed: !completed });
  };

  const sortedReminders = [...reminders].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
            <p className="text-muted-foreground">Never miss important events</p>
          </div>
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
                <Button type="submit" className="w-full">
                  Create Reminder
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {sortedReminders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No reminders yet. Create your first reminder!</p>
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
                      <div className="flex items-center gap-2 text-sm">
                        <Bell className="h-4 w-4 text-pink-500" />
                        <span className="text-muted-foreground">
                          {format(new Date(reminder.dueDate), 'MMM d, yyyy h:mm a')}
                        </span>
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
