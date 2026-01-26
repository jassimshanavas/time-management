'use client';

import { useState } from 'react';
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
import { useStore } from '@/lib/store';
import { Plus, Trash2, Edit, TrendingUp, Flame, Calendar as CalendarIcon } from 'lucide-react';
import { format, subDays, startOfWeek, addDays } from 'date-fns';
import type { Habit } from '@/types';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';

export default function HabitsPage() {
  const { habits, addHabit, updateHabit, deleteHabit, toggleHabitCompletion } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    frequency: 'daily' as 'daily' | 'weekly',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingHabit) {
      updateHabit(editingHabit.id, {
        title: formData.title,
        description: formData.description,
        frequency: formData.frequency,
      });
    } else {
      const newHabit: Habit = {
        id: Date.now().toString(),
        title: formData.title,
        description: formData.description,
        frequency: formData.frequency,
        streak: 0,
        longestStreak: 0,
        completedDates: [],
        createdAt: new Date(),
      };
      addHabit(newHabit);
    }

    setFormData({ title: '', description: '', frequency: 'daily' });
    setEditingHabit(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setFormData({
      title: habit.title,
      description: habit.description || '',
      frequency: habit.frequency,
    });
    setIsDialogOpen(true);
  };

  const isCompletedOnDate = (habit: Habit, date: Date) => {
    return habit.completedDates.some(
      (d) => new Date(d).toDateString() === date.toDateString()
    );
  };

  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      days.push(subDays(new Date(), i));
    }
    return days;
  };

  const last7Days = getLast7Days();

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Habits</h1>
            <p className="text-muted-foreground">Build and track your daily habits</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingHabit(null);
                  setFormData({ title: '', description: '', frequency: 'daily' });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Habit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingHabit ? 'Edit Habit' : 'Create New Habit'}</DialogTitle>
                <DialogDescription>
                  {editingHabit ? 'Update habit details' : 'Add a new habit to track'}
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
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value: 'daily' | 'weekly') =>
                      setFormData({ ...formData, frequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  {editingHabit ? 'Update Habit' : 'Create Habit'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {habits.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No habits yet. Create your first habit!</p>
              </CardContent>
            </Card>
          ) : (
            habits.map((habit) => (
              <Card key={habit.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{habit.title}</CardTitle>
                      {habit.description && (
                        <p className="text-sm text-muted-foreground mb-3">{habit.description}</p>
                      )}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Flame className="h-5 w-5 text-orange-500" />
                          <div>
                            <p className="text-2xl font-bold">{habit.streak}</p>
                            <p className="text-xs text-muted-foreground">Current Streak</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="text-2xl font-bold">{habit.longestStreak}</p>
                            <p className="text-xs text-muted-foreground">Best Streak</p>
                          </div>
                        </div>
                        <Badge variant="outline">{habit.frequency}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(habit)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteHabit(habit.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Last 7 Days</h4>
                    <div className="grid grid-cols-7 gap-2">
                      {last7Days.map((date) => {
                        const isCompleted = isCompletedOnDate(habit, date);
                        const isToday = date.toDateString() === new Date().toDateString();
                        return (
                          <button
                            key={date.toISOString()}
                            onClick={() => toggleHabitCompletion(habit.id, date)}
                            className={`aspect-square rounded-lg border-2 transition-all ${
                              isCompleted
                                ? 'bg-green-500 border-green-600 text-white'
                                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
                            } ${isToday ? 'ring-2 ring-primary' : ''}`}
                          >
                            <div className="text-xs font-medium">
                              {format(date, 'EEE')}
                            </div>
                            <div className="text-xs">{format(date, 'd')}</div>
                          </button>
                        );
                      })}
                    </div>
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
