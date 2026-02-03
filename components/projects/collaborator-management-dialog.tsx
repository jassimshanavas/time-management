'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Mail, Shield, Check, Loader2 } from 'lucide-react';
import { User, Project } from '@/types';
import { toast } from 'sonner';

interface CollaboratorManagementDialogProps {
    project: Project;
    children: React.ReactNode;
}

export function CollaboratorManagementDialog({ project, children }: CollaboratorManagementDialogProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isInviting, setIsInviting] = useState(null as string | null);

    const { searchUsers, inviteToProject, userCache } = useStore();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const results = await searchUsers(searchQuery);
            setSearchResults(results);
            if (results.length === 0) {
                toast.info('No user found with this email.');
            }
        } catch (error) {
            toast.error('Search failed. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleInvite = async (user: User) => {
        setIsInviting(user.id);
        try {
            await inviteToProject(project.id, user);
            toast.success(`${user.name} has been added to the project!`);
            // Update local UI
            setSearchResults(prev => prev.filter(u => u.id !== user.id));
        } catch (error) {
            toast.error('Failed to add collaborator.');
        } finally {
            setIsInviting(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] border-primary/10 bg-background/95 backdrop-blur-2xl shadow-2xl">
                <div className="p-8">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-black tracking-tight italic flex items-center gap-3">
                            <UserPlus className="h-6 w-6 text-primary" />
                            Manage Collaborators
                        </DialogTitle>
                        <DialogDescription className="text-xs font-black uppercase tracking-widest opacity-40">
                            Build your strategic cell for "{project.name}"
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Search Input */}
                        <form onSubmit={handleSearch} className="relative group">
                            <Input
                                placeholder="Search by exact email address..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-12 pl-12 pr-4 bg-muted/20 border-primary/5 rounded-2xl text-sm font-medium focus:ring-primary/20 transition-all"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isSearching}
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 rounded-xl font-bold text-[10px] uppercase tracking-widest"
                            >
                                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                            </Button>
                        </form>

                        <div className="space-y-4">
                            {/* Existing Members Section */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3">Project Staff</p>
                                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                    {project.members?.map((member) => {
                                        const u = userCache[member.userId];
                                        return (
                                            <div key={member.userId} className="flex items-center justify-between p-3 rounded-2xl bg-muted/10 border border-primary/5">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8 ring-2 ring-background border-none shadow-sm">
                                                        <AvatarImage src={u?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.userId}`} title={u?.name || member.userId} />
                                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-black uppercase">
                                                            {(u?.name || member.userId).slice(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-xs font-bold truncate max-w-[120px]">
                                                            {u?.name || (member.userId === project.userId ? 'Project Owner' : 'Collaborator')}
                                                        </p>
                                                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter px-1.5 py-0 h-3 border-primary/10">
                                                            {member.role}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                {member.role === 'owner' && <Shield className="h-3.5 w-3.5 text-primary opacity-40" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-primary/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-3">Neural Matches</p>
                                    <div className="space-y-2">
                                        {searchResults.map((user) => (
                                            <div key={user.id} className="flex items-center justify-between p-3 rounded-2xl bg-primary/5 border border-primary/10 animate-in slide-in-from-top-2 duration-300">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} />
                                                        <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-xs font-bold">{user.name}</p>
                                                        <p className="text-[10px] text-muted-foreground/60 font-medium">{user.email}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={isInviting === user.id}
                                                    onClick={() => handleInvite(user)}
                                                    className="h-8 w-8 p-0 rounded-xl hover:bg-primary/20 hover:text-primary transition-colors"
                                                >
                                                    {isInviting === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <Button onClick={() => setOpen(false)} variant="outline" className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] border-primary/10">
                            Close Mission Briefing
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
