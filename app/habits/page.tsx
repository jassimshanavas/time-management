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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-orange-500/5 text-orange-500 border-orange-500/20 px-2 py-0 h-4">Neural Rewiring</Badge>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent italic">
                  Habit Protocol
                </h1>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-70">Hardcode your daily execution loop</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {selectedProjectId && (
                  <Badge variant="outline" className="h-10 px-4 flex items-center gap-2 bg-background/40 backdrop-blur-sm border-primary/10 text-[10px] font-black uppercase tracking-widest shadow-sm">
                    <span className="text-muted-foreground opacity-50">Context:</span>
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
                      className="h-10 px-6 rounded-2xl font-black text-xs shadow-lg shadow-primary/20 flex-1 sm:flex-initial"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Protocol
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl max-h-[90vh] p-0 overflow-hidden rounded-[2rem] border-primary/10 bg-background/95 backdrop-blur-2xl shadow-2xl">
                    <ScrollArea className="max-h-[85vh]">
                      <div className="p-6 sm:p-10">
                        <DialogHeader className="mb-8">
                          <DialogTitle className="text-2xl font-black tracking-tight italic">
                            {editingHabit ? 'Refine Protocol' : 'Initialize Habit'}
                          </DialogTitle>
                          <DialogDescription className="text-xs font-black uppercase tracking-widest opacity-40">
                            Programmable behavior for systemic success
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6">
                          <div className="space-y-3">
                            <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Habit Identifier</Label>
                            <Input
                              id="title"
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              required
                              className="bg-muted/30 h-12 rounded-2xl border-primary/5 focus:ring-primary/20 transition-all text-base font-bold"
                              placeholder="e.g. Protocol: Hydrate"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Execution Logic</Label>
                            <Textarea
                              id="description"
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className="bg-muted/30 rounded-2xl border-primary/5 focus:ring-primary/20 transition-all text-sm leading-relaxed"
                              placeholder="Operational parameters..."
                            />
                          </div>
                          <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-3">
                              <Label htmlFor="frequency" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Pulse Rate</Label>
                              <Select
                                value={formData.frequency}
                                onValueChange={(value: 'daily' | 'weekly') =>
                                  setFormData({ ...formData, frequency: value })
                                }
                              >
                                <SelectTrigger className="bg-muted/30 h-11 rounded-xl border-primary/5 text-xs font-bold uppercase tracking-widest">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-primary/10">
                                  <SelectItem value="daily" className="text-xs font-black uppercase tracking-widest">Daily Cycle</SelectItem>
                                  <SelectItem value="weekly" className="text-xs font-black uppercase tracking-widest">Weekly Cycle</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-3">
                              <Label htmlFor="projectId" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Sector Assignment</Label>
                              <ProjectSelector
                                value={formData.projectId}
                                onChange={(value) => setFormData({ ...formData, projectId: value })}
                                placeholder="Global Matrix"
                              />
                            </div>
                          </div>
                          <Button type="submit" className="w-full h-14 rounded-2xl font-black text-base shadow-xl shadow-orange-500/20 tracking-tight transition-all hover:scale-[1.01] active:scale-[0.99] mt-6 bg-orange-600 hover:bg-orange-700 text-white border-none">
                            {editingHabit ? 'Commit Changes' : 'Initialize Protocol'}
                          </Button>
                        </form>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid gap-6">
              {filteredHabits.length === 0 ? (
                <Card className="bg-muted/5 backdrop-blur-sm border-dashed border-2 border-primary/5 py-24 rounded-[3rem] opacity-30 grayscale group hover:opacity-100 transition-all duration-500">
                  <CardContent className="flex flex-col items-center justify-center text-center">
                    <div className="h-20 w-20 bg-muted/50 rounded-[2.5rem] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-orange-500/5 transition-all duration-500">
                      <Flame className="h-10 w-10 text-orange-500/40 group-hover:text-orange-500" />
                    </div>
                    <p className="font-black text-sm uppercase tracking-[0.2em] mb-1">Cold Neural Circuits</p>
                    <p className="text-[10px] text-muted-foreground font-medium max-w-xs mx-auto">
                      No habits initialized. Program your daily loop to trigger evolution.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredHabits.map((habit) => (
                  <Card key={habit.id} className="group relative overflow-hidden bg-background/60 backdrop-blur-md border-primary/5 hover:border-primary/20 hover:shadow-2xl transition-all duration-500 rounded-[2rem]">
                    {/* Visual energy strip */}
                    <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-orange-500 via-orange-400 to-transparent" />

                    <CardHeader className="p-6 pb-2">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest bg-orange-500/5 border-transparent h-4 px-1">{habit.frequency}</Badge>
                            {habit.projectId && (
                              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest h-4 px-1" style={{ borderColor: `${projects.find(p => p.id === habit.projectId)?.color}30`, color: projects.find(p => p.id === habit.projectId)?.color }}>
                                {projects.find(p => p.id === habit.projectId)?.name}
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-xl lg:text-2xl font-black tracking-tight leading-tight group-hover:text-orange-500 transition-colors italic">{habit.title}</CardTitle>
                          {habit.description && (
                            <p className="text-[11px] font-medium text-muted-foreground mt-2 line-clamp-2 leading-relaxed opacity-60 italic">{habit.description}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 bg-muted/20 p-1 rounded-xl">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(habit)} className="h-8 w-8 rounded-lg hover:bg-primary/10 transition-all">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteHabit(habit.id)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-6">
                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-orange-500/5 border border-orange-500/10 shadow-lg shadow-orange-500/5 group/streak hover:bg-orange-500/10 transition-all duration-500">
                          <div className="relative">
                            <Flame className="h-6 w-6 text-orange-500 animate-pulse group-hover/streak:scale-110 transition-transform" />
                            <div className="absolute -inset-1 bg-orange-500 rounded-full opacity-0 blur-md group-hover/streak:opacity-20 transition-opacity" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-2xl font-black tracking-tighter text-orange-500 leading-none">{habit.streak}</span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-orange-500/40">Current Pulse</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-all duration-500">
                          <TrendingUp className="h-6 w-6 text-emerald-500" />
                          <div className="flex flex-col">
                            <span className="text-2xl font-black tracking-tighter text-emerald-500 leading-none">{habit.longestStreak}</span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500/40">Peak Velocity</span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6 pt-4 border-t border-primary/5 bg-muted/5 backdrop-blur-sm">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 flex items-center gap-2">
                            <CalendarIcon className="h-3 w-3" />
                            Temporal Audit [7D Cycle]
                          </h4>
                          <div className="px-2 py-0.5 rounded-full bg-primary/5 border border-primary/10">
                            <span className="text-[8px] font-black uppercase tracking-widest text-primary/60">Tap to Synapse</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                          {last7Days.map((date) => {
                            const isCompleted = isCompletedOnDate(habit, date);
                            const isToday = date.toDateString() === new Date().toDateString();
                            return (
                              <button
                                key={date.toISOString()}
                                onClick={() => toggleHabitCompletion(habit.id, date)}
                                className={cn(
                                  "group/day relative flex flex-col items-center justify-center py-2.5 rounded-2xl border transition-all duration-500 active:scale-95",
                                  isCompleted
                                    ? "bg-emerald-500 border-emerald-400 text-white shadow-xl shadow-emerald-500/20 z-10 scale-[1.05]"
                                    : "bg-background/20 border-primary/5 hover:border-primary/20 text-muted-foreground/60",
                                  isToday && !isCompleted && "ring-1 ring-orange-500/50"
                                )}
                              >
                                <span className={cn(
                                  "text-[8px] font-black uppercase mb-1 tracking-tighter transition-colors",
                                  isCompleted ? "text-emerald-100/60" : "text-muted-foreground/40"
                                )}>
                                  {format(date, 'EEE')}
                                </span>
                                <span className="text-[13px] font-black tracking-tighter">
                                  {format(date, 'd')}
                                </span>

                                {isToday && !isCompleted && (
                                  <div className="absolute bottom-1 h-1 w-2 bg-orange-500 rounded-full animate-pulse" />
                                )}

                                <div className={cn(
                                  "absolute -top-1 -right-1 h-3 w-3 rounded-full bg-white flex items-center justify-center transition-all duration-500 shadow-sm",
                                  isCompleted ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-45 opacity-0"
                                )}>
                                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
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
