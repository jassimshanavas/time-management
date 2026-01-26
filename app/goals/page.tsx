'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
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
import { Plus, Trash2, Edit, Target, CheckCircle2, Clock, Sparkles, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import type { Goal, Milestone } from '@/types';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import { ProjectSelector } from '@/components/projects/project-selector';
import { ProjectBadge } from '@/components/projects/project-badge';

export default function GoalsPage() {
  const { goals, addGoal, updateGoal, deleteGoal, selectedProjectId, projects } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetDate: '',
    progress: 0,
    milestones: [] as Milestone[],
    newMilestone: '',
    projectId: '' as string | undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingGoal) {
      updateGoal(editingGoal.id, {
        title: formData.title,
        description: formData.description,
        targetDate: formData.targetDate ? new Date(formData.targetDate) : undefined,
        progress: formData.progress,
        milestones: formData.milestones,
        projectId: formData.projectId || undefined,
      });
    } else {
      const newGoal: Omit<Goal, 'id'> = {
        title: formData.title,
        description: formData.description,
        targetDate: formData.targetDate ? new Date(formData.targetDate) : undefined,
        progress: formData.progress,
        milestones: formData.milestones,
        projectId: formData.projectId || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      addGoal(newGoal);
    }

    setFormData({
      title: '',
      description: '',
      targetDate: '',
      progress: 0,
      milestones: [],
      newMilestone: '',
      projectId: '',
    });
    setEditingGoal(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      targetDate: goal.targetDate ? format(new Date(goal.targetDate), 'yyyy-MM-dd') : '',
      progress: goal.progress,
      milestones: goal.milestones,
      newMilestone: '',
      projectId: goal.projectId || '',
    });
    setIsDialogOpen(true);
  };

  const addMilestone = () => {
    if (formData.newMilestone.trim()) {
      setFormData({
        ...formData,
        milestones: [
          ...formData.milestones,
          {
            id: Date.now().toString(),
            title: formData.newMilestone,
            completed: false,
          },
        ],
        newMilestone: '',
      });
    }
  };

  const toggleMilestone = (milestoneId: string) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.map((m) =>
        m.id === milestoneId
          ? { ...m, completed: !m.completed, completedAt: !m.completed ? new Date() : undefined }
          : m
      ),
    });
  };

  const removeMilestone = (milestoneId: string) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.filter((m) => m.id !== milestoneId),
    });
  };

  const toggleGoalMilestone = (goalId: string, milestoneId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const updatedMilestones = goal.milestones.map((m) =>
      m.id === milestoneId
        ? { ...m, completed: !m.completed, completedAt: !m.completed ? new Date() : undefined }
        : m
    );

    const completedCount = updatedMilestones.filter((m) => m.completed).length;
    const progress = Math.round((completedCount / updatedMilestones.length) * 100);

    updateGoal(goalId, { milestones: updatedMilestones, progress });
  };

  // Filter by global project context (Workspace)
  const filteredGoals = goals.filter((goal) => {
    if (selectedProjectId !== null) {
      if (selectedProjectId === 'personal') {
        if (goal.projectId) return false;
      } else {
        if (goal.projectId !== selectedProjectId) return false;
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
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-500 border-emerald-500/20 px-2 py-0 h-4">Growth Nexus</Badge>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent italic">
                  Strategic Objectives
                </h1>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-70">Quantifying your long-term evolution</p>
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
                        setEditingGoal(null);
                        setFormData({
                          title: '',
                          description: '',
                          targetDate: '',
                          progress: 0,
                          milestones: [],
                          newMilestone: '',
                          projectId: '',
                        });
                      }}
                      className="h-10 px-6 rounded-2xl font-black text-xs shadow-lg shadow-primary/20 flex-1 sm:flex-initial"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Initiate Objective
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden rounded-[2rem] border-primary/10 bg-background/95 backdrop-blur-2xl shadow-2xl">
                    <ScrollArea className="max-h-[85vh]">
                      <div className="p-6 sm:p-10">
                        <DialogHeader className="mb-8">
                          <DialogTitle className="text-2xl font-black tracking-tight italic">
                            {editingGoal ? 'Optimize Objective' : 'New Strategic Goal'}
                          </DialogTitle>
                          <DialogDescription className="text-xs font-black uppercase tracking-widest opacity-40">
                            Architecture for your future expansion
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6">
                          <div className="space-y-3">
                            <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Objective Identifier</Label>
                            <Input
                              id="title"
                              value={formData.title}
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                              required
                              className="bg-muted/30 h-12 rounded-2xl border-primary/5 focus:ring-primary/20 transition-all text-base font-bold"
                              placeholder="e.g. Master Neural Computing"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Strategic Context</Label>
                            <Textarea
                              id="description"
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              className="bg-muted/30 rounded-2xl border-primary/5 focus:ring-primary/20 transition-all text-sm leading-relaxed"
                              placeholder="Why this matters..."
                            />
                          </div>
                          <div className="grid gap-6 sm:grid-cols-2">
                            <div className="space-y-3">
                              <Label htmlFor="targetDate" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Materialization Date</Label>
                              <Input
                                id="targetDate"
                                type="date"
                                value={formData.targetDate}
                                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                                className="bg-muted/30 rounded-xl h-11 border-primary/5 font-bold"
                              />
                            </div>
                            <div className="space-y-3">
                              <Label htmlFor="projectId" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Project Workspace</Label>
                              <ProjectSelector
                                value={formData.projectId}
                                onChange={(value) => setFormData({ ...formData, projectId: value })}
                                placeholder="Personal Growth"
                              />
                            </div>
                          </div>

                          <div className="space-y-4 pt-4 border-t border-primary/5">
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Execution Progress</Label>
                              <span className="text-xs font-black text-primary">{formData.progress}%</span>
                            </div>
                            <Slider
                              value={[formData.progress]}
                              onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
                              max={100}
                              step={5}
                              className="py-2"
                            />
                          </div>

                          <div className="space-y-4 pt-4 border-t border-primary/5">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Key Milestones</Label>
                            <div className="flex gap-2">
                              <input
                                value={formData.newMilestone}
                                onChange={(e) => setFormData({ ...formData, newMilestone: e.target.value })}
                                placeholder="Define next step..."
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMilestone())}
                                className="flex-1 bg-muted/30 h-10 px-4 rounded-xl border border-primary/5 focus:outline-none focus:ring-1 focus:ring-primary/20 text-xs font-bold"
                              />
                              <Button type="button" onClick={addMilestone} variant="secondary" className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest">
                                Push
                              </Button>
                            </div>
                            <div className="space-y-2 mt-4">
                              {formData.milestones.map((milestone) => (
                                <div key={milestone.id} className="flex items-center gap-3 p-3 bg-muted/20 border border-primary/5 rounded-[1.25rem] group animate-in slide-in-from-left-2 duration-300">
                                  <Checkbox
                                    checked={milestone.completed}
                                    onCheckedChange={() => toggleMilestone(milestone.id)}
                                    className="h-5 w-5 rounded-md"
                                  />
                                  <span className={`flex-1 text-xs font-bold tracking-tight transition-all ${milestone.completed ? 'line-through text-muted-foreground opacity-50' : ''}`}>
                                    {milestone.title}
                                  </span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeMilestone(milestone.id)}
                                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <Button type="submit" className="w-full h-14 rounded-2xl font-black text-base shadow-xl shadow-primary/20 tracking-tight transition-all hover:scale-[1.01] active:scale-[0.99] mt-6">
                            {editingGoal ? 'Commit Refinements' : 'Initialize Objective'}
                          </Button>
                        </form>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {filteredGoals.length === 0 ? (
                <Card className="md:col-span-2 bg-muted/5 backdrop-blur-sm border-dashed border-2 border-primary/5 py-24 rounded-[3rem] opacity-30 grayscale group hover:opacity-100 transition-all duration-500">
                  <CardContent className="flex flex-col items-center justify-center text-center">
                    <div className="h-20 w-20 bg-muted/50 rounded-[2.5rem] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/5 transition-all duration-500">
                      <Target className="h-10 w-10 text-primary/40 group-hover:text-primary" />
                    </div>
                    <p className="font-black text-sm uppercase tracking-[0.2em] mb-1">Growth Voids Detected</p>
                    <p className="text-[10px] text-muted-foreground font-medium max-w-xs mx-auto">
                      Strategic objectives missing. Initialize your long-term evolution stream.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredGoals.map((goal) => (
                  <Card key={goal.id} className="group relative overflow-hidden bg-background/60 backdrop-blur-md border-primary/5 hover:border-primary/20 hover:shadow-2xl transition-all duration-500 rounded-[2rem]">
                    {/* Visual energy bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-muted/20">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-primary to-emerald-400 transition-all duration-1000 ease-out"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>

                    <CardHeader className="p-6 pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest bg-primary/5 border-transparent h-4 px-1">{goal.milestones.length} Milestones</Badge>
                            {goal.projectId && (
                              <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest h-4 px-1" style={{ borderColor: `${projects.find(p => p.id === goal.projectId)?.color}30`, color: projects.find(p => p.id === goal.projectId)?.color }}>
                                {projects.find(p => p.id === goal.projectId)?.name}
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-xl lg:text-2xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors italic">{goal.title}</CardTitle>
                          {goal.description && (
                            <p className="text-[11px] font-medium text-muted-foreground mt-2 line-clamp-2 leading-relaxed opacity-60 italic">{goal.description}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1 sm:opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(goal)} className="h-8 w-8 rounded-lg hover:bg-primary/10">
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteGoal(goal.id)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6 pt-4 space-y-6">
                      <div className="relative pt-2">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                            Status Velocity
                          </div>
                          <span className="text-sm font-black text-primary tracking-tighter">{goal.progress}%</span>
                        </div>
                        <Progress value={goal.progress} className="h-1.5 rounded-full bg-primary/5" />
                      </div>

                      <div className="flex items-center gap-3 text-[9px] font-black text-muted-foreground/50 flex-wrap uppercase tracking-widest">
                        {goal.targetDate && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/30 border border-primary/5">
                            <Clock className="h-3 w-3 text-primary" />
                            <span>Materialize: {format(new Date(goal.targetDate), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/30 border border-primary/5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          <span>{goal.milestones.filter(m => m.completed).length}/{goal.milestones.length} Synapses</span>
                        </div>
                      </div>

                      {goal.milestones.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-primary/5">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                            <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">Next Critical Synapses</h4>
                          </div>
                          <div className="grid gap-2">
                            {goal.milestones.slice(0, 3).map((milestone) => (
                              <div
                                key={milestone.id}
                                className={cn(
                                  "group/item flex items-start gap-3 p-3 rounded-2xl border transition-all duration-300",
                                  milestone.completed ? "bg-emerald-500/5 border-emerald-500/10" : "bg-muted/10 border-transparent hover:border-primary/10 hover:bg-muted/20"
                                )}
                              >
                                <Checkbox
                                  checked={milestone.completed}
                                  onCheckedChange={() => toggleGoalMilestone(goal.id, milestone.id)}
                                  className="mt-0.5 h-4 w-4 rounded-md"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-[11px] font-black tracking-tight leading-tight transition-all",
                                    milestone.completed ? "line-through text-muted-foreground/40" : "text-foreground group-hover/item:text-primary"
                                  )}>
                                    {milestone.title}
                                  </p>
                                  {milestone.completed && milestone.completedAt && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                                      <p className="text-[8px] text-emerald-600/60 font-black uppercase tracking-widest">
                                        Achieved {format(new Date(milestone.completedAt), 'MMM d')}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {goal.milestones.length > 3 && (
                              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/30 text-center py-1">
                                + {goal.milestones.length - 3} Additional Milestones Locked
                              </p>
                            )}
                          </div>
                        </div>
                      )}
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
