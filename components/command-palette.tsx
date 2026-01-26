'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { useStore } from '@/lib/store';
import {
    Search,
    CheckSquare,
    FileText,
    Target,
    TrendingUp,
    Clock,
    Bell,
    FolderKanban,
    Plus,
    Home,
    Calendar,
    Settings,
    BarChart3,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const router = useRouter();
    const { tasks, projects, notes, goals, habits, reminders } = useStore();

    // Toggle command palette with Cmd+K or Ctrl+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const handleSelect = useCallback((callback: () => void) => {
        setOpen(false);
        callback();
    }, []);

    // Filter items based on search
    const filteredTasks = tasks.filter((task) =>
        task.title.toLowerCase().includes(search.toLowerCase())
    );

    const filteredProjects = projects.filter((project) =>
        project.name.toLowerCase().includes(search.toLowerCase())
    );

    const filteredNotes = notes.filter((note) =>
        note.title.toLowerCase().includes(search.toLowerCase())
    );

    const filteredGoals = goals.filter((goal) =>
        goal.title.toLowerCase().includes(search.toLowerCase())
    );

    const filteredHabits = habits.filter((habit) =>
        habit.title.toLowerCase().includes(search.toLowerCase())
    );

    const filteredReminders = reminders.filter((reminder) =>
        reminder.title.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="p-0 max-w-2xl">
                <Command className="rounded-lg border shadow-md">
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Command.Input
                            placeholder="Type a command or search..."
                            value={search}
                            onValueChange={setSearch}
                            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <Command.List className="max-h-[400px] overflow-y-auto p-2">
                        <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                            No results found.
                        </Command.Empty>

                        {/* Quick Actions */}
                        {!search && (
                            <Command.Group heading="Quick Actions" className="px-2 py-2">
                                <Command.Item
                                    onSelect={() => handleSelect(() => router.push('/today'))}
                                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                >
                                    <Calendar className="h-4 w-4" />
                                    <span>Today's Focus</span>
                                    <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                                        T
                                    </kbd>
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => handleSelect(() => router.push('/tasks'))}
                                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>New Task</span>
                                    <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                                        N
                                    </kbd>
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => handleSelect(() => router.push('/notes'))}
                                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                >
                                    <FileText className="h-4 w-4" />
                                    <span>New Note</span>
                                </Command.Item>
                            </Command.Group>
                        )}

                        {/* Navigation */}
                        {!search && (
                            <Command.Group heading="Navigation" className="px-2 py-2">
                                <Command.Item
                                    onSelect={() => handleSelect(() => router.push('/dashboard'))}
                                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                >
                                    <Home className="h-4 w-4" />
                                    <span>Dashboard</span>
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => handleSelect(() => router.push('/tasks'))}
                                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                >
                                    <CheckSquare className="h-4 w-4 text-violet-500" />
                                    <span>Tasks</span>
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => handleSelect(() => router.push('/notes'))}
                                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                >
                                    <FileText className="h-4 w-4 text-orange-500" />
                                    <span>Notes</span>
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => handleSelect(() => router.push('/goals'))}
                                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                >
                                    <Target className="h-4 w-4 text-emerald-500" />
                                    <span>Goals</span>
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => handleSelect(() => router.push('/habits'))}
                                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                >
                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                    <span>Habits</span>
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => handleSelect(() => router.push('/time-tracking'))}
                                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                >
                                    <Clock className="h-4 w-4 text-blue-500" />
                                    <span>Time Tracking</span>
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => handleSelect(() => router.push('/reminders'))}
                                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                >
                                    <Bell className="h-4 w-4 text-pink-500" />
                                    <span>Reminders</span>
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => handleSelect(() => router.push('/analytics'))}
                                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                >
                                    <BarChart3 className="h-4 w-4 text-purple-500" />
                                    <span>Analytics</span>
                                </Command.Item>
                                <Command.Item
                                    onSelect={() => handleSelect(() => router.push('/settings'))}
                                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                >
                                    <Settings className="h-4 w-4" />
                                    <span>Settings</span>
                                </Command.Item>
                            </Command.Group>
                        )}

                        {/* Projects */}
                        {filteredProjects.length > 0 && (
                            <Command.Group heading="Projects" className="px-2 py-2">
                                {filteredProjects.slice(0, 5).map((project) => (
                                    <Command.Item
                                        key={project.id}
                                        onSelect={() => handleSelect(() => router.push(`/projects/${project.id}`))}
                                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                    >
                                        <FolderKanban className="h-4 w-4" style={{ color: project.color }} />
                                        <span>{project.name}</span>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {/* Tasks */}
                        {filteredTasks.length > 0 && (
                            <Command.Group heading="Tasks" className="px-2 py-2">
                                {filteredTasks.slice(0, 5).map((task) => (
                                    <Command.Item
                                        key={task.id}
                                        onSelect={() => handleSelect(() => router.push('/tasks'))}
                                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                    >
                                        <CheckSquare className="h-4 w-4 text-violet-500" />
                                        <div className="flex-1">
                                            <div className="font-medium">{task.title}</div>
                                            {task.description && (
                                                <div className="text-xs text-muted-foreground line-clamp-1">
                                                    {task.description}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{task.status}</span>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {/* Notes */}
                        {filteredNotes.length > 0 && (
                            <Command.Group heading="Notes" className="px-2 py-2">
                                {filteredNotes.slice(0, 5).map((note) => (
                                    <Command.Item
                                        key={note.id}
                                        onSelect={() => handleSelect(() => router.push('/notes'))}
                                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                    >
                                        <FileText className="h-4 w-4 text-orange-500" />
                                        <div className="flex-1">
                                            <div className="font-medium">{note.title}</div>
                                            <div className="text-xs text-muted-foreground line-clamp-1">
                                                {note.content}
                                            </div>
                                        </div>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {/* Goals */}
                        {filteredGoals.length > 0 && (
                            <Command.Group heading="Goals" className="px-2 py-2">
                                {filteredGoals.slice(0, 5).map((goal) => (
                                    <Command.Item
                                        key={goal.id}
                                        onSelect={() => handleSelect(() => router.push('/goals'))}
                                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                    >
                                        <Target className="h-4 w-4 text-emerald-500" />
                                        <div className="flex-1">
                                            <div className="font-medium">{goal.title}</div>
                                        </div>
                                        <span className="text-xs text-muted-foreground">{goal.progress}%</span>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {/* Habits */}
                        {filteredHabits.length > 0 && (
                            <Command.Group heading="Habits" className="px-2 py-2">
                                {filteredHabits.slice(0, 5).map((habit) => (
                                    <Command.Item
                                        key={habit.id}
                                        onSelect={() => handleSelect(() => router.push('/habits'))}
                                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                    >
                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                        <div className="flex-1">
                                            <div className="font-medium">{habit.title}</div>
                                        </div>
                                        <span className="text-xs text-muted-foreground">🔥 {habit.streak}</span>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {/* Reminders */}
                        {filteredReminders.length > 0 && (
                            <Command.Group heading="Reminders" className="px-2 py-2">
                                {filteredReminders.slice(0, 5).map((reminder) => (
                                    <Command.Item
                                        key={reminder.id}
                                        onSelect={() => handleSelect(() => router.push('/reminders'))}
                                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent aria-selected:bg-accent"
                                    >
                                        <Bell className="h-4 w-4 text-pink-500" />
                                        <div className="flex-1">
                                            <div className="font-medium">{reminder.title}</div>
                                        </div>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}
                    </Command.List>

                    <div className="border-t px-4 py-2 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                            <span>Press <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">⌘K</kbd> or <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">Ctrl+K</kbd> to toggle</span>
                            <span>Use <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">↑↓</kbd> to navigate</span>
                        </div>
                    </div>
                </Command>
            </DialogContent>
        </Dialog>
    );
}
