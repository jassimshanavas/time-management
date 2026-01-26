'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Layout, Briefcase, User, Layers } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useStore } from '@/lib/store';

export function WorkspaceSwitcher() {
    const [open, setOpen] = React.useState(false);
    const { projects, selectedProjectId, setSelectedProjectId } = useStore();

    const activeProject = projects.find((p) => p.id === selectedProjectId);

    const workspaces = [
        {
            label: 'Global View',
            value: 'all',
            icon: Layers,
        },
        {
            label: 'Personal',
            value: 'personal',
            icon: User,
        },
    ];

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-accent/50 transition-all"
                >
                    <div className="flex items-center gap-2 truncate">
                        {selectedProjectId === null ? (
                            <>
                                <Layers className="h-4 w-4 text-sky-500" />
                                <span>Global View</span>
                            </>
                        ) : selectedProjectId === 'personal' ? (
                            <>
                                <User className="h-4 w-4 text-indigo-500" />
                                <span>Personal</span>
                            </>
                        ) : (
                            <>
                                <div
                                    className="h-2 w-2 rounded-full shrink-0"
                                    style={{ backgroundColor: activeProject?.color || '#ccc' }}
                                />
                                <span className="truncate">{activeProject?.name}</span>
                            </>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0 shadow-xl border-primary/10">
                <Command>
                    <CommandInput placeholder="Search workspace..." />
                    <CommandList>
                        <CommandEmpty>No workspace found.</CommandEmpty>
                        <CommandGroup heading="Contexts">
                            {workspaces.map((workspace) => (
                                <CommandItem
                                    key={workspace.value}
                                    onSelect={() => {
                                        setSelectedProjectId(workspace.value === 'all' ? null : 'personal');
                                        setOpen(false);
                                    }}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <workspace.icon className={cn(
                                        "h-4 w-4",
                                        workspace.value === 'all' ? "text-sky-500" : "text-indigo-500"
                                    )} />
                                    <span className="flex-1">{workspace.label}</span>
                                    {((workspace.value === 'all' && selectedProjectId === null) ||
                                        (workspace.value === 'personal' && selectedProjectId === 'personal')) && (
                                            <Check className="h-4 w-4 text-primary" />
                                        )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="Projects">
                            {projects.length === 0 ? (
                                <div className="px-2 py-4 text-xs text-center text-muted-foreground italic">
                                    No projects integrated yet
                                </div>
                            ) : (
                                projects.map((project) => (
                                    <CommandItem
                                        key={project.id}
                                        onSelect={() => {
                                            setSelectedProjectId(project.id);
                                            setOpen(false);
                                        }}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <div
                                            className="h-2 w-2 rounded-full shrink-0"
                                            style={{ backgroundColor: project.color }}
                                        />
                                        <span className="flex-1 truncate">{project.name}</span>
                                        {selectedProjectId === project.id && (
                                            <Check className="h-4 w-4 text-primary" />
                                        )}
                                    </CommandItem>
                                ))
                            )}
                        </CommandGroup>
                    </CommandList>
                    <div className="p-2 border-t bg-muted/30">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest px-2">
                            Active Context: {selectedProjectId === null ? 'All' : activeProject?.name || 'Personal'}
                        </p>
                    </div>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
