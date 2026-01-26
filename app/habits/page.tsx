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
import { ProjectSelector } from '@/components/projects/project-selector';
import { ProjectBadge } from '@/components/projects/project-badge';

export default function HabitsPage() {
  const { habits, addHabit, updateHabit, deleteHabit, toggleHabitCompletion, selectedProjectId, projects } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    frequency: 'daily' as 'daily' | 'weekly',
    projectId: '' as string | undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingHabit) {
      updateHabit(editingHabit.id, {
        title: formData.title,
        description: formData.description,
        frequency: formData.frequency,
        projectId: formData.projectId || undefined,
      });
    } else {
      const newHabit: Omit<Habit, 'id'> = {
        title: formData.title,
        description: formData.description,
        frequency: formData.frequency,
        streak: 0,
        longestStreak: 0,
        completedDates: [],
        projectId: formData.projectId || undefined,
        createdAt: new Date(),
      };
      addHabit(newHabit);
    }

    setFormData({ title: '', description: '', frequency: 'daily', projectId: '' });
    setEditingHabit(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setFormData({
      title: habit.title,
      description: habit.description || '',
      frequency: habit.frequency,
      projectId: habit.projectId || '',
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

  // Filter by global project context (Workspace)
  const filteredHabits = habits.filter((habit) => {
    if (selectedProjectId !== null) {
      if (selectedProjectId === 'personal') {
        if (habit.projectId) return false;
      } else {
        if (habit.projectId !== selectedProjectId) return false;
      }
    }
    return true;
  });

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight">Habits</h1>
                <p className="text-muted-foreground">Build and track your daily habits</p>
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
                    <Button
                      onClick={() => {
                        setEditingHabit(null);
                        setFormData({ title: '', description: '', frequency: 'daily', projectId: '' });
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
                      <div className="space-y-2">
                        <Label htmlFor="projectId">Project (Optional)</Label>
                        <ProjectSelector
                          value={formData.projectId}
                          onChange={(value) => setFormData({ ...formData, projectId: value })}
                          placeholder="Select a project"
                        />
                        <p className="text-xs text-muted-foreground">
                          Assign this habit to a project
                        </p>
                      </div>
                      <Button type="submit" className="w-full">
                        {editingHabit ? 'Update Habit' : 'Create Habit'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="space-y-4">
              {filteredHabits.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {habits.length === 0
                        ? 'No habits yet. Create your first habit!'
                        : 'No habits found for this filter'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredHabits.map((habit) => (
                  <Card key={habit.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-xl">{habit.title}</CardTitle>
                            {habit.projectId && <ProjectBadge projectId={habit.projectId} />}
                          </div>
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
                                className={`aspect-square rounded-lg border-2 transition-all ${isCompleted
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
