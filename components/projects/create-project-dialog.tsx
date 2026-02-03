'use client';

import { useState } from 'react';
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
import { Plus, Shield, Users } from 'lucide-react';

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

export function CreateProjectDialog({ children }: { children?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState(COLORS[5]); // Default blue
    const [visibility, setVisibility] = useState<'private' | 'collaborative'>('private');
    const { addProject } = useStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        await addProject({
            name,
            description,
            color,
            status: 'active',
            visibility,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        setName('');
        setDescription('');
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        New Project
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
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
                        <Button type="submit" className="w-full">Create Project</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
