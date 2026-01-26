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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStore } from '@/lib/store';
import { Plus, Trash2, Edit, Search, Pin, FileText, Clock } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Note } from '@/types';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import { ProjectSelector } from '@/components/projects/project-selector';
import { ProjectBadge } from '@/components/projects/project-badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function NotesPage() {
  const { notes, addNote, updateNote, deleteNote, selectedProjectId, projects } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    projectId: '' as string | undefined,
  });
  const [previewMode, setPreviewMode] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingNote) {
      updateNote(editingNote.id, {
        title: formData.title,
        content: formData.content,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        projectId: formData.projectId || undefined,
      });
    } else {
      const newNote: Omit<Note, 'id'> = {
        title: formData.title,
        content: formData.content,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        projectId: formData.projectId || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      addNote(newNote);
    }

    setFormData({ title: '', content: '', tags: '', projectId: '' });
    setEditingNote(null);
    setIsDialogOpen(false);
    setPreviewMode(false);
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      tags: note.tags.join(', '),
      projectId: note.projectId || '',
    });
    setIsDialogOpen(true);
  };

  const togglePin = (note: Note) => {
    updateNote(note.id, { pinned: !note.pinned });
  };

  const filteredNotes = notes.filter(
    (note) => {
      // Filter by search query
      const matchesSearch =
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      // Filter by global project context (Workspace)
      if (selectedProjectId !== null) {
        if (selectedProjectId === 'personal') {
          if (note.projectId) return false;
        } else {
          if (note.projectId !== selectedProjectId) return false;
        }
      }

      return matchesSearch;
    }
  );

  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.pinned);

  const NoteCard = ({ note }: { note: Note }) => (
    <Card className="group relative overflow-hidden bg-background/60 backdrop-blur-md border-primary/5 hover:border-primary/20 hover:shadow-xl transition-all duration-500 rounded-2xl cursor-pointer" onClick={() => handleEdit(note)}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm sm:text-base font-black leading-tight tracking-tight group-hover:text-primary transition-colors line-clamp-2">{note.title}</CardTitle>
          <div className="flex gap-1 shrink-0 sm:opacity-0 group-hover:opacity-100 transition-all duration-300">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary"
              onClick={(e) => { e.stopPropagation(); togglePin(note); }}
            >
              <Pin className={`h-3.5 w-3.5 ${note.pinned ? 'fill-current text-primary' : 'opacity-40'}`} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
            >
              <Trash2 className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="prose prose-xs dark:prose-invert max-w-none mb-4 line-clamp-3 text-[11px] leading-relaxed opacity-60 font-medium">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
        </div>
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-primary/5">
          <div className="flex gap-1.5 flex-wrap items-center">
            {note.projectId && (
              <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 font-black uppercase tracking-widest bg-primary/5 border-primary/10 text-primary">
                {projects.find(p => p.id === note.projectId)?.name || 'Project'}
              </Badge>
            )}
            {note.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[8px] px-1.5 py-0 h-4 font-black uppercase tracking-widest border-transparent bg-muted/40">
                {tag}
              </Badge>
            ))}
          </div>
          <span className="text-[9px] font-black uppercase text-muted-foreground/30 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {format(new Date(note.updatedAt), 'MMM d')}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
          <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1 space-y-5">
                <div>
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/20 px-2 py-0 h-4 mb-2">Knowledge Pulse</Badge>
                  <h1 className="text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent italic">
                    Knowledge Vault
                  </h1>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-70">Externalize your neural network</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative max-w-md flex-1 group">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input
                      type="text"
                      placeholder="Audit your brain..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 h-11 bg-background/50 backdrop-blur-md border border-primary/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                    />
                  </div>
                  {selectedProjectId && (
                    <Badge variant="outline" className="h-11 px-4 flex items-center gap-2 bg-background/40 backdrop-blur-sm border-primary/10 text-[10px] font-black uppercase tracking-widest shrink-0">
                      <span className="text-muted-foreground opacity-50">Context:</span>
                      {selectedProjectId === 'personal' ? 'Personal' : projects.find(p => p.id === selectedProjectId)?.name}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setEditingNote(null);
                        setFormData({ title: '', content: '', tags: '', projectId: '' });
                        setPreviewMode(false);
                      }}
                      className="h-11 px-6 rounded-2xl shadow-lg shadow-primary/20 font-black text-xs flex-1 sm:flex-initial"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Manifest Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden rounded-3xl border-primary/10 bg-background/95 backdrop-blur-2xl shadow-2xl">
                    <ScrollArea className="max-h-[85vh]">
                      <div className="p-6 sm:p-10">
                        <DialogHeader className="mb-6">
                          <DialogTitle className="text-2xl font-black tracking-tight italic">
                            {editingNote ? 'Synthesize Knowledge' : 'New Neural Capture'}
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
                            {editingNote ? 'Update Knowledge' : 'Seal Archive'}
                          </Button>
                        </form>
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Content Sections */}
            <div className="space-y-10 pb-10">
              {pinnedNotes.length > 0 && (
                <div className="space-y-5">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-2.5 text-primary">
                    <Pin className="h-3 w-3 fill-current rotate-45" />
                    Pinned Wisdom
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {pinnedNotes.map((note) => (
                      <NoteCard key={note.id} note={note} />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-5">
                {pinnedNotes.length > 0 && (
                  <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/40 flex items-center gap-2.5">
                    Neural Network
                  </h2>
                )}
                {unpinnedNotes.length === 0 && pinnedNotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 bg-muted/10 backdrop-blur-sm border-2 border-dashed border-primary/5 rounded-[3rem] opacity-30 grayscale group hover:opacity-100 transition-all duration-500">
                    <div className="h-20 w-20 bg-muted/50 rounded-[2rem] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary/5 transition-all duration-500">
                      <FileText className="h-10 w-10 text-primary/40 group-hover:text-primary transition-colors" />
                    </div>
                    <p className="font-black text-xs uppercase tracking-[0.2em] mb-1">Vault Offline</p>
                    <p className="text-[10px] text-muted-foreground font-medium">Neural captures awaited. Initialize your knowledge stream.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {unpinnedNotes.map((note) => (
                      <NoteCard key={note.id} note={note} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute>
  );
}
