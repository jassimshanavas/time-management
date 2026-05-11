'use client';

import { useMemo } from 'react';
import { Check, ChevronDown, FolderKanban } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProjectMultiSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

export function ProjectMultiSelector({
  value,
  onChange,
  placeholder = 'Link projects',
}: ProjectMultiSelectorProps) {
  const { projects } = useStore();

  const selectedProjects = useMemo(
    () => projects.filter((project) => value.includes(project.id)),
    [projects, value]
  );

  const toggleProject = (projectId: string) => {
    onChange(
      value.includes(projectId)
        ? value.filter((id) => id !== projectId)
        : [...value, projectId]
    );
  };

  const previewLabel =
    selectedProjects.length === 0
      ? placeholder
      : selectedProjects.length === 1
        ? selectedProjects[0].name
        : `${selectedProjects[0].name} +${selectedProjects.length - 1} more`;

  return (
    <div className="space-y-2.5">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full justify-between rounded-xl border-primary/5 bg-muted/30 px-4 font-medium hover:bg-muted/40"
          >
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-bold">{previewLabel}</p>
              <p className="truncate text-[10px] text-muted-foreground/65">
                {selectedProjects.length > 0
                  ? `${selectedProjects.length} linked workspace${selectedProjects.length > 1 ? 's' : ''}`
                  : 'Personal or cross-workspace goal'}
              </p>
            </div>
            <ChevronDown className="ml-3 h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={16}
          className="w-[min(420px,calc(100vw-2rem),var(--radix-popover-trigger-width))] min-w-[var(--radix-popover-trigger-width)] max-h-[min(320px,var(--radix-popover-content-available-height))] overflow-hidden rounded-2xl border-primary/10 bg-background/95 p-2 shadow-2xl backdrop-blur-xl"
        >
          <div className="px-2 pb-2 pt-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/60">
              Linked Projects
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/70">
              Attach this goal to one or more active workspaces.
            </p>
          </div>

          <ScrollArea
            className="custom-scrollbar h-[min(240px,calc(var(--radix-popover-content-available-height)-3.5rem))] pr-1"
            onWheel={(e) => {
              e.stopPropagation();
              const target = e.currentTarget.querySelector('[data-radix-scroll-area-viewport]');
              if (target instanceof HTMLElement) {
                target.scrollTop += e.deltaY;
              }
            }}
          >
            <div className="space-y-1.5">
              {projects.map((project) => {
                const checked = value.includes(project.id);

                return (
                  <div
                    key={project.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleProject(project.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleProject(project.id);
                      }
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-primary/10 hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <Checkbox
                      checked={checked}
                      className="pointer-events-none h-4 w-4 rounded-md"
                    />
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: project.color || 'hsl(var(--primary))' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{project.name}</p>
                      {project.description && (
                        <p className="truncate text-[10px] text-muted-foreground">
                          {project.description}
                        </p>
                      )}
                    </div>
                    {checked && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </div>
                );
              })}

              {projects.length === 0 && (
                <div className="rounded-xl border border-dashed border-primary/10 bg-muted/20 px-4 py-5 text-center">
                  <FolderKanban className="mx-auto h-4 w-4 text-muted-foreground/50" />
                  <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                    No projects yet
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {selectedProjects.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedProjects.slice(0, 2).map((project) => (
            <Badge
              key={project.id}
              variant="outline"
              className="h-6 rounded-full border-primary/10 bg-background/60 px-2.5 text-[9px] font-black uppercase tracking-widest"
              style={{
                borderColor: `${project.color}30`,
                color: project.color,
              }}
            >
              {project.name}
            </Badge>
          ))}
          {selectedProjects.length > 2 && (
            <Badge
              variant="outline"
              className="h-6 rounded-full border-primary/10 bg-background/40 px-2.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground"
            >
              +{selectedProjects.length - 2} more
            </Badge>
          )}
        </div>
      ) : (
        <p className="text-[10px] leading-relaxed text-muted-foreground/60">
          Leave this empty if the goal is personal or spans your workspace more generally.
        </p>
      )}
    </div>
  );
}
