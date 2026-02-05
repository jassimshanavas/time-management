'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProjectSelector } from '@/components/projects/project-selector';
import { Milestone } from '@/types';

interface CreateGoalDialogProps {
    children?: React.ReactNode;
    projectId?: string;
}

export function CreateGoalDialog({ children, projectId }: CreateGoalDialogProps) {
    const { addGoal } = useStore();
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        targetDate: '',
        progress: 0,
        milestones: [] as Milestone[],
        newMilestone: '',
        projectId: projectId as string | undefined,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        addGoal({
            title: formData.title,
            description: formData.description,
            targetDate: formData.targetDate ? new Date(formData.targetDate) : undefined,
            progress: formData.progress,
            milestones: formData.milestones,
            projectId: formData.projectId || undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        setFormData({
            title: '',
            description: '',
            targetDate: '',
            progress: 0,
            milestones: [],
            newMilestone: '',
            projectId,
        });
        setOpen(false);
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        New Goal
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden rounded-[2rem] border-primary/10 bg-background/95 backdrop-blur-2xl shadow-2xl">
                <ScrollArea className="max-h-[85vh]">
                    <div className="p-6 sm:p-10">
                        <DialogHeader className="mb-8">
                            <DialogTitle className="text-2xl font-black tracking-tight italic">
                                New Strategic Goal
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
                                Initialize Objective
                            </Button>
                        </form>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
