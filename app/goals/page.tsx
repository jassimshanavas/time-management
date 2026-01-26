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
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight">Goals</h1>
                <p className="text-muted-foreground">Track your long-term objectives</p>
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
                        <Label htmlFor="targetDate">Target Date</Label>
                        <Input
                          id="targetDate"
                          type="date"
                          value={formData.targetDate}
                          onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Progress: {formData.progress}%</Label>
                        <Slider
                          value={[formData.progress]}
                          onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
                          max={100}
                          step={5}
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
                          Assign this goal to a project
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Milestones</Label>
                        <div className="flex gap-2">
                          <Input
                            value={formData.newMilestone}
                            onChange={(e) => setFormData({ ...formData, newMilestone: e.target.value })}
                            placeholder="Add a milestone..."
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addMilestone())}
                          />
                          <Button type="button" onClick={addMilestone}>
                            Add
                          </Button>
                        </div>
                        <div className="space-y-2 mt-2">
                          {formData.milestones.map((milestone) => (
                            <div key={milestone.id} className="flex items-center gap-2 p-2 border rounded">
                              <Checkbox
                                checked={milestone.completed}
                                onCheckedChange={() => toggleMilestone(milestone.id)}
                              />
                              <span className={milestone.completed ? 'line-through flex-1' : 'flex-1'}>
                                {milestone.title}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removeMilestone(milestone.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button type="submit" className="w-full">
                        {editingGoal ? 'Update Goal' : 'Create Goal'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {filteredGoals.length === 0 ? (
                <Card className="md:col-span-2">
                  <CardContent className="p-8 text-center">
                    <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {goals.length === 0
                        ? 'No goals yet. Create your first goal!'
                        : 'No goals found for this filter'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredGoals.map((goal) => (
                  <Card key={goal.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-xl">{goal.title}</CardTitle>
                            {goal.projectId && <ProjectBadge projectId={goal.projectId} />}
                          </div>
                          {goal.description && (
                            <p className="text-sm text-muted-foreground">{goal.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(goal)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteGoal(goal.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Progress</span>
                          <span className="text-sm text-muted-foreground">{goal.progress}%</span>
                        </div>
                        <Progress value={goal.progress} />
                      </div>

                      {goal.targetDate && (
                        <div className="text-sm text-muted-foreground">
                          Target: {format(new Date(goal.targetDate), 'MMM d, yyyy')}
                        </div>
                      )}

                      {goal.milestones.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Milestones</h4>
                          {goal.milestones.map((milestone) => (
                            <div key={milestone.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={milestone.completed}
                                onCheckedChange={() => toggleGoalMilestone(goal.id, milestone.id)}
                              />
                              <span
                                className={`text-sm ${milestone.completed ? 'line-through text-muted-foreground' : ''
                                  }`}
                              >
                                {milestone.title}
                              </span>
                              {milestone.completed && (
                                <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                              )}
                            </div>
                          ))}
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
