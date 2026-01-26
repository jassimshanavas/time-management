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
import { Plus, Trash2, Edit, Search, Pin } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Note } from '@/types';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';

export default function NotesPage() {
  const { notes, addNote, updateNote, deleteNote } = useStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
  });
  const [previewMode, setPreviewMode] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingNote) {
      updateNote(editingNote.id, {
        title: formData.title,
        content: formData.content,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
    } else {
      const newNote: Note = {
        id: Date.now().toString(),
        title: formData.title,
        content: formData.content,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      addNote(newNote);
    }

    setFormData({ title: '', content: '', tags: '' });
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
    });
    setIsDialogOpen(true);
  };

  const togglePin = (note: Note) => {
    updateNote(note.id, { pinned: !note.pinned });
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.pinned);

  const NoteCard = ({ note }: { note: Note }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{note.title}</CardTitle>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => togglePin(note)}
            >
              <Pin className={`h-4 w-4 ${note.pinned ? 'fill-current' : ''}`} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleEdit(note)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteNote(note.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none mb-3 line-clamp-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {note.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(note.updatedAt), 'MMM d, yyyy')}
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
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Notes</h1>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setEditingNote(null);
                  setFormData({ title: '', content: '', tags: '' });
                  setPreviewMode(false);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingNote ? 'Edit Note' : 'Create New Note'}</DialogTitle>
                <DialogDescription>
                  Write your notes in Markdown format
                </DialogDescription>
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="content">Content</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewMode(!previewMode)}
                    >
                      {previewMode ? 'Edit' : 'Preview'}
                    </Button>
                  </div>
                  {previewMode ? (
                    <div className="border rounded-md p-4 min-h-[200px] prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {formData.content || '*No content yet*'}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={10}
                      placeholder="Write your note in Markdown..."
                      required
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="work, personal, ideas"
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingNote ? 'Update Note' : 'Create Note'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {pinnedNotes.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Pin className="h-5 w-5" />
              Pinned Notes
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pinnedNotes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {pinnedNotes.length > 0 && <h2 className="text-xl font-semibold">All Notes</h2>}
          {unpinnedNotes.length === 0 && pinnedNotes.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No notes yet. Create your first note!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
