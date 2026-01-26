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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TrendingUp, Sparkles, Clock, Target } from 'lucide-react';

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
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-pink-500/5 text-pink-500 border-pink-500/20 px-2 py-0 h-4">Neural Relay</Badge>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent italic">
                  Temporal Alerts
                </h1>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-70">Synchronizing your cognitive priority stream</p>
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
                      onClick={() => setFormData({ title: '', description: '', dueDate: '', projectId: '' })}
                      className="h-10 px-6 rounded-2xl font-black text-xs shadow-lg shadow-primary/20 flex-1 sm:flex-initial"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Alert
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl max-h-[90vh] p-0 overflow-hidden rounded-[2rem] border-primary/10 bg-background/95 backdrop-blur-2xl shadow-2xl">
                    <ScrollArea className="max-h-[85vh]">
                      <div className="p-6 sm:p-10">
                        <DialogHeader className="mb-8">
                          <DialogTitle className="text-2xl font-black tracking-tight italic">
                            Initialize Alert
                          </DialogTitle>
                          <DialogDescription className="text-xs font-black uppercase tracking-widest opacity-40">
                            Temporal anchors for critical execution
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6">
                          <div className="space-y-3">
                            <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Alert Identifier</Label>
                            <Input
                              id="title"
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              required
                              className="bg-muted/30 h-12 rounded-2xl border-primary/5 focus:ring-primary/20 transition-all text-base font-bold"
                              placeholder="e.g. CORE: Review Matrix"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Operational Context</Label>
                            <Textarea
                              id="description"
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className="bg-muted/30 rounded-2xl border-primary/5 focus:ring-primary/20 transition-all text-sm leading-relaxed"
                              placeholder="Logic parameters..."
                            />
                          </div>
                          <div className="grid gap-6 sm:grid-cols-2 text-start">
                            <div className="space-y-3">
                              <Label htmlFor="dueDate" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Execution Window</Label>
                              <Input
                                id="dueDate"
                                type="datetime-local"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                required
                                className="bg-muted/30 rounded-xl h-11 border-primary/5 font-bold"
                              />
                            </div>
                            <div className="space-y-3">
                              <Label htmlFor="projectId" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Strategic Sector</Label>
                              <ProjectSelector
                                value={formData.projectId}
                                onChange={(value) => setFormData({ ...formData, projectId: value })}
                                placeholder="Global Matrix"
                              />
                            </div>
                          </div>
                          <Button type="submit" className="w-full h-14 rounded-2xl font-black text-base shadow-xl shadow-pink-500/20 tracking-tight transition-all hover:scale-[1.01] active:scale-[0.99] mt-6 bg-pink-600 hover:bg-pink-700 text-white border-none">
                            Commence Alert
                          </Button>
                        </form>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid gap-6">
              {sortedReminders.length === 0 ? (
                <Card className="bg-muted/5 backdrop-blur-sm border-dashed border-2 border-primary/5 py-24 rounded-[3rem] opacity-30 grayscale group hover:opacity-100 transition-all duration-500">
                  <CardContent className="flex flex-col items-center justify-center text-center">
                    <div className="h-20 w-20 bg-muted/50 rounded-[2.5rem] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-pink-500/5 transition-all duration-500">
                      <Bell className="h-10 w-10 text-pink-500/40 group-hover:text-pink-500" />
                    </div>
                    <p className="font-black text-sm uppercase tracking-[0.2em] mb-1">Silence in the Stream</p>
                    <p className="text-[10px] font-medium text-muted-foreground max-w-xs mx-auto">
                      Zero temporal alerts initialized. Set anchors to maintain chronological synchronization.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                sortedReminders.map((reminder) => (
                  <Card
                    key={reminder.id}
                    className={cn(
                      "group relative overflow-hidden transition-all duration-500 rounded-[2rem] border-primary/5",
                      reminder.completed
                        ? "opacity-60 bg-muted/10 grayscale-[0.5]"
                        : "bg-background/60 backdrop-blur-md hover:border-primary/20 hover:shadow-2xl"
                    )}
                  >
                    {!reminder.completed && (
                      <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-pink-500 via-violet-500 to-transparent" />
                    )}

                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row items-start gap-5">
                        <div className="pt-1 flex-shrink-0">
                          <Checkbox
                            checked={reminder.completed}
                            onCheckedChange={() => toggleComplete(reminder.id, reminder.completed)}
                            className={cn(
                              "h-7 w-7 rounded-full border-2 transition-all duration-500 shadow-lg active:scale-90",
                              reminder.completed
                                ? "bg-emerald-500 border-emerald-400 shadow-emerald-500/20"
                                : "border-pink-500/30 ring-offset-background focus-visible:ring-pink-500"
                            )}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            {reminder.projectId && (
                              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest h-4 px-1.5" style={{ borderColor: `${projects.find(p => p.id === reminder.projectId)?.color}30`, color: projects.find(p => p.id === reminder.projectId)?.color }}>
                                {projects.find(p => p.id === reminder.projectId)?.name}
                              </Badge>
                            )}
                            {!reminder.completed && (
                              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest bg-pink-500/5 text-pink-500 border-transparent h-4">Priority Relay</Badge>
                            )}
                          </div>

                          <h3 className={cn(
                            "text-xl font-black tracking-tight leading-tight transition-all duration-500 italic mb-2",
                            reminder.completed ? "line-through text-muted-foreground opacity-50" : "text-foreground group-hover:text-pink-500"
                          )}>
                            {reminder.title}
                          </h3>

                          {reminder.description && (
                            <p className="text-[11px] font-medium text-muted-foreground mb-4 line-clamp-2 leading-relaxed opacity-60 italic">{reminder.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-3">
                            <div className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-500",
                              reminder.completed
                                ? "bg-muted/40 border-transparent"
                                : "bg-pink-500/5 border-pink-500/10 hover:bg-pink-500/10"
                            )}>
                              <Clock className={cn("h-3.5 w-3.5", reminder.completed ? "text-muted-foreground/40" : "text-pink-500 animate-pulse")} />
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest tabular-nums",
                                reminder.completed ? "text-muted-foreground/40" : "text-pink-600/80"
                              )}>
                                {format(new Date(reminder.dueDate), 'MMM d, h:mm a')}
                              </span>
                            </div>

                            {reminder.completed && (
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 transition-all duration-500 animate-in fade-in duration-700">
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/80">Archived</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 ml-auto sm:self-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteReminder(reminder.id)}
                            className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
