'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Users } from 'lucide-react';
import { Project } from '@/types';

const COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#10b981', // emerald
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#d946ef', // fuchsia
];

interface EditProjectDialogProps {
    project: Project;
    children?: React.ReactNode;
}

export function EditProjectDialog({ project, children }: EditProjectDialogProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description || '');
    const [color, setColor] = useState(project.color);
    const [visibility, setVisibility] = useState<'private' | 'collaborative'>(project.visibility);
    const { updateProject } = useStore();

    useEffect(() => {
        if (open) {
            setName(project.name);
            setDescription(project.description || '');
            setColor(project.color);
            setVisibility(project.visibility);
        }
    }, [open, project]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        await updateProject(project.id, {
            name,
            description,
            color,
            visibility,
        });

        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Project Name</Label>
                        <Input
                            id="name"
                            placeholder="e.g. Mobile App Redesign"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            placeholder="What is this project about?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Project Color</Label>
                        <div className="flex flex-wrap gap-2 pt-1">
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    className={`h-6 w-6 rounded-full transition-all ${color === c ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''
                                        }`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setColor(c)}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Visibility</Label>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setVisibility('private')}
                                className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all ${visibility === 'private' ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/10 border-transparent text-muted-foreground opacity-60'}`}
                            >
                                <Shield className="h-4 w-4" />
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none">Private</p>
                                    <p className="text-[8px] opacity-60 mt-0.5">Only you can see</p>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setVisibility('collaborative')}
                                className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-all ${visibility === 'collaborative' ? 'bg-primary/10 border-primary text-primary' : 'bg-muted/10 border-transparent text-muted-foreground opacity-60'}`}
                            >
                                <Users className="h-4 w-4" />
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none">Collab</p>
                                    <p className="text-[8px] opacity-60 mt-0.5">Invite others later</p>
                                </div>
                            </button>
                        </div>
                    </div>
                    <DialogFooter className="pt-4">
                        <Button type="submit" className="w-full">Update Project</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
