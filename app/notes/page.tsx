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
import { Plus, Trash2, Edit, Search, Pin, FileText } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Note } from '@/types';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import { ProjectSelector } from '@/components/projects/project-selector';
import { ProjectBadge } from '@/components/projects/project-badge';

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
    <Card className="hover:shadow-md transition-shadow group">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-black leading-tight line-clamp-1 group-hover:text-primary transition-colors">{note.title}</CardTitle>
          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => togglePin(note)}
            >
              <Pin className={`h-3.5 w-3.5 ${note.pinned ? 'fill-current text-primary' : ''}`} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => handleEdit(note)}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 hover:text-destructive"
              onClick={() => deleteNote(note.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="prose prose-xs dark:prose-invert max-w-none mb-3 line-clamp-2 text-xs opacity-70">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1 flex-wrap items-center">
            {note.projectId && <ProjectBadge projectId={note.projectId} />}
            {note.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-bold border-transparent bg-muted/50">
                {tag}
              </Badge>
            ))}
          </div>
          <span className="text-[9px] font-black uppercase text-muted-foreground/50 whitespace-nowrap">
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
          <div className="space-y-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 space-y-4">
                <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                  Knowledge Vault
                </h1>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative max-w-md flex-1 group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      placeholder="Search notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 bg-background/50 backdrop-blur-sm border-primary/10 rounded-xl focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                  </div>
                  {selectedProjectId && (
                    <Badge variant="outline" className="h-9 px-3 flex items-center gap-1.5 bg-background/40 backdrop-blur-sm border-primary/10 text-[10px] font-bold">
                      <span className="text-muted-foreground hidden sm:inline">Context:</span>
                      {selectedProjectId === 'personal' ? 'Personal' : projects.find(p => p.id === selectedProjectId)?.name}
                    </Badge>
                  )}
                </div>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingNote(null);
                      setFormData({ title: '', content: '', tags: '', projectId: '' });
                      setPreviewMode(false);
                    }}
                    className="h-9 px-4 rounded-xl shadow-md shadow-primary/10 font-black text-xs"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    New Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingNote ? 'Refine Entry' : 'New Knowledge Entry'}</DialogTitle>
                    <DialogDescription>
                      Capture your thoughts using full Markdown support
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="font-bold">Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        className="bg-muted/30 h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="content" className="font-bold">Content</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewMode(!previewMode)}
                          className="font-bold text-xs uppercase tracking-widest text-primary"
                        >
                          {previewMode ? 'Edit Mode' : 'Preview Mode'}
                        </Button>
                      </div>
                      {previewMode ? (
                        <div className="border bg-background/50 rounded-2xl p-6 min-h-[300px] prose prose-sm dark:prose-invert max-w-none shadow-inner">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {formData.content || '*Capture your brilliance here...*'}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <Textarea
                          id="content"
                          value={formData.content}
                          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                          rows={12}
                          placeholder="Markdown is fully supported..."
                          required
                          className="bg-muted/30 font-mono text-sm leading-relaxed"
                        />
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="projectId" className="font-bold">Project Workspace</Label>
                        <ProjectSelector
                          value={formData.projectId}
                          onChange={(value) => setFormData({ ...formData, projectId: value })}
                          placeholder="Global Vault"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tags" className="font-bold">Tags</Label>
                        <Input
                          id="tags"
                          value={formData.tags}
                          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                          placeholder="ideas, research, draft"
                          className="bg-muted/30"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-12 font-black shadow-lg shadow-primary/20">
                      {editingNote ? 'Save Refinements' : 'Archive Entry'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {pinnedNotes.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                  <Pin className="h-3 w-3 fill-current rotate-45" />
                  Pinned Wisdom
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {pinnedNotes.map((note) => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {pinnedNotes.length > 0 && (
                <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  All Knowledge
                </h2>
              )}
              {unpinnedNotes.length === 0 && pinnedNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-background/40 backdrop-blur-sm border-2 border-dashed rounded-3xl opacity-50">
                  <FileText className="h-12 w-12 mb-4" />
                  <p className="font-bold">Your vault is empty</p>
                  <p className="text-sm">Start capturing ideas, research, and insights.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {unpinnedNotes.map((note) => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute>
  );
}
