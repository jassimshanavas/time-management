'use client';

import { useState } from 'react';
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
import { Plus, Trash2, Edit, Target, CheckCircle2 } from 'lucide-react';
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                  Goals
                </h1>
                <p className="text-muted-foreground">Track your long-term objectives</p>
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
                      className="shadow-lg shadow-primary/20"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Goal
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
                      <DialogDescription>Set a new goal and track your progress</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
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
                        <Label htmlFor="targetDate">Target Date</Label>
                        <Input
                          id="targetDate"
                          type="date"
                          value={formData.targetDate}
                          onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                          className="bg-muted/30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex justify-between">
                          <span>Progress</span>
                          <span className="text-primary font-bold">{formData.progress}%</span>
                        </Label>
                        <Slider
                          value={[formData.progress]}
                          onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
                          max={100}
                          step={5}
                          className="py-4"
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
                      <div className="space-y-2">
                        <Label>Milestones</Label>
                        <div className="flex gap-2">
                          <Input
                            value={formData.newMilestone}
                            onChange={(e) => setFormData({ ...formData, newMilestone: e.target.value })}
                            placeholder="Add a milestone..."
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMilestone())}
                            className="bg-muted/30"
                          />
                          <Button type="button" onClick={addMilestone} variant="secondary">
                            Add
                          </Button>
                        </div>
                        <div className="space-y-2 mt-4">
                          {formData.milestones.map((milestone) => (
                            <div key={milestone.id} className="flex items-center gap-3 p-3 bg-muted/20 border rounded-xl group">
                              <Checkbox
                                checked={milestone.completed}
                                onCheckedChange={() => toggleMilestone(milestone.id)}
                              />
                              <span className={`flex-1 text-sm font-medium ${milestone.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {milestone.title}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeMilestone(milestone.id)}
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button type="submit" className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20">
                        {editingGoal ? 'Update Goal' : 'Create Goal'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
              {filteredGoals.length === 0 ? (
                <Card className="md:col-span-2 bg-background/40 backdrop-blur-sm border-dashed border-2 py-12">
                  <CardContent className="flex flex-col items-center justify-center text-center">
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <Target className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-xl font-semibold mb-2">No goals found</p>
                    <p className="text-muted-foreground max-w-xs mx-auto">
                      {goals.length === 0
                        ? 'Set your first goal to start tracking your progress!'
                        : 'Try adjusting your filters to find what you looking for.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredGoals.map((goal) => (
                  <Card key={goal.id} className="group overflow-hidden bg-background/40 backdrop-blur-xl border-primary/10 hover:border-primary/30 transition-all duration-300 shadow-xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-primary/10" />
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <CardTitle className="text-xl font-bold truncate">{goal.title}</CardTitle>
                            {goal.projectId && <ProjectBadge projectId={goal.projectId} className="h-5 text-[10px]" />}
                          </div>
                          {goal.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{goal.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(goal)} className="h-8 w-8 rounded-full">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteGoal(goal.id)} className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="relative pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Overall Progress</span>
                          <span className="text-sm font-bold text-primary">{goal.progress}%</span>
                        </div>
                        <Progress value={goal.progress} className="h-2 rounded-full bg-primary/10" />
                      </div>

                      <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground flex-wrap">
                        {goal.targetDate && (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-primary/5">
                            <Target className="h-3.5 w-3.5 text-primary" />
                            <span>Target: {format(new Date(goal.targetDate), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-primary/5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{goal.milestones.filter(m => m.completed).length}/{goal.milestones.length} Milestones</span>
                        </div>
                      </div>

                      {goal.milestones.length > 0 && (
                        <div className="space-y-2 mt-4 pt-4 border-t border-primary/5">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Key Milestones</h4>
                          <div className="grid gap-2">
                            {goal.milestones.map((milestone) => (
                              <div key={milestone.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${milestone.completed ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-muted/20 border-transparent hover:border-primary/10'}`}>
                                <Checkbox
                                  checked={milestone.completed}
                                  onCheckedChange={() => toggleGoalMilestone(goal.id, milestone.id)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-medium leading-tight ${milestone.completed ? 'line-through text-muted-foreground opacity-60' : ''}`}>
                                    {milestone.title}
                                  </p>
                                  {milestone.completed && milestone.completedAt && (
                                    <p className="text-[10px] text-emerald-600 font-bold mt-1 uppercase">
                                      Done {format(new Date(milestone.completedAt), 'MMM d')}
                                    </p>
                                  )}
                                </div>
                                {milestone.completed && (
                                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  </div>
                                )}
                              </div>
                            ))}
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
