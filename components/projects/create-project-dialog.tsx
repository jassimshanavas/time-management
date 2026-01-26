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
import { Plus } from 'lucide-react';

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
    const { addProject } = useStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        await addProject({
            name,
            description,
            color,
            status: 'active',
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
                    <DialogFooter className="pt-4">
                        <Button type="submit" className="w-full">Create Project</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
