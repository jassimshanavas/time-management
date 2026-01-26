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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                  Habits
                </h1>
                <p className="text-muted-foreground">Build and track your daily habits</p>
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
                    <Button
                      onClick={() => {
                        setEditingHabit(null);
                        setFormData({ title: '', description: '', frequency: 'daily', projectId: '' });
                      }}
                      className="shadow-lg shadow-primary/20"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Habit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingHabit ? 'Edit Habit' : 'Create New Habit'}</DialogTitle>
                      <DialogDescription>
                        {editingHabit ? 'Update habit details' : 'Add a new habit to track'}
                      </DialogDescription>
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
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="bg-muted/30"
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
                          <SelectTrigger className="bg-muted/30">
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
                      </div>
                      <Button type="submit" className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20">
                        {editingHabit ? 'Update Habit' : 'Create Habit'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid gap-4">
              {filteredHabits.length === 0 ? (
                <Card className="bg-background/40 backdrop-blur-sm border-dashed border-2 py-12">
                  <CardContent className="flex flex-col items-center justify-center text-center">
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <TrendingUp className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-xl font-semibold mb-2">No habits found</p>
                    <p className="text-muted-foreground max-w-xs mx-auto">
                      {habits.length === 0
                        ? 'Build lasting habits with streak tracking and daily reminders.'
                        : 'Try adjusting your filters to find what you looking for.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredHabits.map((habit) => (
                  <Card key={habit.id} className="group overflow-hidden bg-background/40 backdrop-blur-xl border-primary/10 hover:border-primary/30 transition-all duration-300 shadow-xl">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 to-orange-300" />
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <CardTitle className="text-xl font-bold truncate">{habit.title}</CardTitle>
                            {habit.projectId && <ProjectBadge projectId={habit.projectId} className="h-5 text-[10px]" />}
                          </div>
                          {habit.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 max-w-2xl">{habit.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(habit)} className="h-8 w-8 rounded-full">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteHabit(habit.id)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-6 mt-4">
                        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-orange-500/10 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                          <div className="relative">
                            <Flame className="h-6 w-6 text-orange-500 animate-pulse" />
                            <div className="absolute -inset-1 bg-orange-500 rounded-full opacity-20 blur-sm" />
                          </div>
                          <div>
                            <p className="text-2xl font-black text-orange-600 dark:text-orange-400 leading-none">{habit.streak}</p>
                            <p className="text-[10px] font-bold uppercase tracking-tighter text-orange-600/70 dark:text-orange-400/70">Day Streak</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                          <TrendingUp className="h-6 w-6 text-emerald-500" />
                          <div>
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{habit.longestStreak}</p>
                            <p className="text-[10px] font-bold uppercase tracking-tighter text-emerald-600/70 dark:text-emerald-400/70">Best Streak</p>
                          </div>
                        </div>

                        <Badge variant="outline" className="h-6 text-[10px] font-bold uppercase tracking-wider bg-muted/50">
                          {habit.frequency}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-2 border-t border-primary/5 bg-muted/5">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <CalendarIcon className="h-3 w-3" />
                            Last 7 Days Activity
                          </h4>
                          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Tap to mark complete</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
                          {last7Days.map((date) => {
                            const isCompleted = isCompletedOnDate(habit, date);
                            const isToday = date.toDateString() === new Date().toDateString();
                            return (
                              <button
                                key={date.toISOString()}
                                onClick={() => toggleHabitCompletion(habit.id, date)}
                                className={`group/day relative flex flex-col items-center justify-center py-2 sm:py-3 rounded-xl border-2 transition-all duration-300 ${isCompleted
                                  ? 'bg-emerald-500 border-emerald-500 shadow-[0_5px_15px_rgba(16,185,129,0.3)] text-white scale-105 z-10'
                                  : 'bg-background/50 border-primary/5 hover:border-primary/20 text-muted-foreground'
                                  } ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                              >
                                <span className={`text-[8px] sm:text-[10px] font-black uppercase mb-1 ${isCompleted ? 'text-emerald-50/80' : 'text-muted-foreground/60'}`}>
                                  {format(date, 'EEE')}
                                </span>
                                <span className="text-xs sm:text-base font-black">
                                  {format(date, 'd')}
                                </span>

                                {isToday && !isCompleted && (
                                  <div className="absolute -bottom-1 h-1 w-1/3 bg-primary rounded-full" />
                                )}

                                <div className={`absolute -top-1 -right-1 h-3 w-3 rounded-full bg-white flex items-center justify-center transition-transform duration-300 ${isCompleted ? 'scale-100' : 'scale-0'}`}>
                                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                </div>
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
