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
import { Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProjectSelector } from '@/components/projects/project-selector';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CreateNoteDialogProps {
    children?: React.ReactNode;
    projectId?: string;
}

export function CreateNoteDialog({ children, projectId }: CreateNoteDialogProps) {
    const { addNote } = useStore();
    const [open, setOpen] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        tags: '',
        projectId: projectId as string | undefined,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        addNote({
            title: formData.title,
            content: formData.content,
            tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
            projectId: formData.projectId || undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        setFormData({ title: '', content: '', tags: '', projectId });
        setOpen(false);
        setPreviewMode(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        New Note
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden rounded-3xl border-primary/10 bg-background/95 backdrop-blur-2xl shadow-2xl">
                <ScrollArea className="max-h-[85vh]">
                    <div className="p-6 sm:p-10">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-2xl font-black tracking-tight italic">
                                New Neural Capture
                            </DialogTitle>
                            <DialogDescription className="text-xs uppercase tracking-widest font-black opacity-40">
                                Full Markdown Support Powered by remarkable-intelligence
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-3">
                                <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Objective Title</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    className="bg-muted/30 h-12 rounded-2xl border-primary/5 focus:ring-primary/20 transition-all text-base font-bold"
                                    placeholder="The core concept..."
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="content" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Insight Content</Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setPreviewMode(!previewMode)}
                                        className="h-7 px-3 rounded-lg font-black text-[9px] uppercase tracking-widest text-primary hover:bg-primary/5"
                                    >
                                        {previewMode ? 'Edit Mode' : 'View Markdown'}
                                    </Button>
                                </div>
                                {previewMode ? (
                                    <div className="border border-primary/5 bg-background/50 rounded-2xl p-6 min-h-[300px] prose prose-sm dark:prose-invert max-w-none shadow-inner overflow-hidden animate-in fade-in zoom-in duration-300">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {formData.content || '*Internalizing neural flows...*'}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <Textarea
                                        id="content"
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        rows={12}
                                        placeholder="Markdown enabled capture system..."
                                        required
                                        className="bg-muted/30 font-mono text-sm leading-relaxed rounded-2xl border-primary/5 p-4 min-h-[300px] focus:ring-primary/20 transition-all"
                                    />
                                )}
                            </div>
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-3">
                                    <Label htmlFor="projectId" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Project Nexus</Label>
                                    <ProjectSelector
                                        value={formData.projectId}
                                        onChange={(value) => setFormData({ ...formData, projectId: value })}
                                        placeholder="Global Network"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label htmlFor="tags" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Indexing Tags</Label>
                                    <Input
                                        id="tags"
                                        value={formData.tags}
                                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                        placeholder="ideas, logic, flow"
                                        className="bg-muted/30 rounded-xl h-10 border-primary/5 text-xs"
                                    />
                                </div>
                            </div>
                            <Button type="submit" className="w-full h-14 font-black shadow-xl shadow-primary/20 rounded-2xl text-base tracking-tight hover:scale-[1.01] active:scale-[0.99] transition-all">
                                Seal Archive
                            </Button>
                        </form>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
