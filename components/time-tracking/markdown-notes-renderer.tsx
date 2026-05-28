import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const PHASE_COLORS: Record<string, string> = {
  'Deep Work': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'Planning': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  'Coding': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  'Debugging': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  'Break': 'bg-amber-500/10 text-amber-500 border-amber-500/20'
};

export const MarkdownNotesRenderer = ({ notes }: { notes: string }) => {
  if (!notes) return null;

  const hasMarkdown = notes.includes('###') || notes.includes('**') || notes.includes('- ') || notes.includes('- [');
  if (!hasMarkdown) {
    return (
      <p className="whitespace-pre-wrap text-[11px] font-medium italic leading-relaxed text-foreground/80">
        {notes}
      </p>
    );
  }

  const lines = notes.split('\n');

  return (
    <div className="space-y-2 text-start select-text cursor-text">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-1" />;

        const leadingSpaces = line.match(/^\s*/)?.[0].length || 0;
        const indentLevel = Math.floor(leadingSpaces / 2);
        const paddingLeft = indentLevel > 0 ? `${indentLevel * 1.25}rem` : '0px';

        if (trimmed.startsWith('###')) {
          const text = trimmed.replace(/^###\s*/, '');
          return (
            <h4
              key={index}
              style={{ paddingLeft }}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-4 mb-2 flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
              {text}
            </h4>
          );
        }

        if (trimmed.startsWith('**') && trimmed.endsWith('**:')) {
          const text = trimmed.replace(/^\*\*\s*/, '').replace(/\s*\*\*:\s*$/, '');
          const badgeStyle = PHASE_COLORS[text] || 'bg-muted/30 text-muted-foreground/80';

          return (
            <div key={index} style={{ paddingLeft }} className="mt-3 block">
              <Badge variant="outline" className={cn("h-5 text-[8px] font-black uppercase tracking-widest px-2.5 border-current bg-background/50", badgeStyle)}>
                {text}
              </Badge>
            </div>
          );
        }

        const todoMatch = trimmed.match(/^-\s*\[\s*([ xX])\s*\]\s*(.*)/);
        if (todoMatch) {
          const isDone = todoMatch[1].toLowerCase() === 'x';
          const rest = todoMatch[2].trim();

          const timeBadgeMatch = rest.match(/^`\[([\d:]+)\]`\s*(.*)/) || rest.match(/^\[([\d:]+)\]\s*(.*)/);
          const timeBadge = timeBadgeMatch ? timeBadgeMatch[1] : null;
          let content = timeBadgeMatch ? timeBadgeMatch[2] : rest;

          // Parse thread badge
          const threadMatch = content.match(/^`\[thread:(.*?):(.*?)\]`\s*(.*)/);
          let threadBadge: { name: string; color: string } | null = null;
          if (threadMatch) {
            threadBadge = { name: threadMatch[1], color: threadMatch[2] };
            content = threadMatch[3];
          }

          // Parse phase badge
          const phaseMatch = content.match(/^`\[phase:(.*?)\]`\s*(.*)/);
          let phaseBadge: string | null = null;
          if (phaseMatch) {
            phaseBadge = phaseMatch[1];
            content = phaseMatch[2];
          }

          const THREAD_PALETTE_MAP: Record<string, { hsl: string; bg: string; border: string; text: string }> = {
            violet:  { hsl: 'hsl(263,70%,58%)',  bg: 'bg-violet-500/10',  border: 'border-violet-500/25',  text: 'text-violet-400' },
            cyan:    { hsl: 'hsl(187,85%,43%)',  bg: 'bg-cyan-500/10',    border: 'border-cyan-500/25',    text: 'text-cyan-400' },
            emerald: { hsl: 'hsl(152,60%,45%)',  bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400' },
            amber:   { hsl: 'hsl(38,92%,50%)',   bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   text: 'text-amber-400' },
            rose:    { hsl: 'hsl(346,84%,61%)',  bg: 'bg-rose-500/10',    border: 'border-rose-500/25',    text: 'text-rose-400' },
            indigo:  { hsl: 'hsl(234,89%,63%)',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/25',  text: 'text-indigo-400' },
          };

          return (
            <div
              key={index}
              style={{ paddingLeft: `calc(${paddingLeft} + 0.5rem)` }}
              className={cn(
                "flex items-start gap-2.5 py-0.5 text-[11px] font-semibold leading-relaxed text-foreground/85",
                isDone && "line-through text-muted-foreground/50 italic"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 h-3.5 w-3.5 rounded border transition-colors flex items-center justify-center shrink-0",
                  isDone
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-primary/30 bg-background"
                )}
              >
                {isDone && <CheckCircle2 className="h-2.5 w-2.5 stroke-[3]" />}
              </div>
              <div className="min-w-0">
                {timeBadge && (
                  <Badge variant="outline" className="h-4 border-primary/10 bg-muted/20 text-[8px] font-black text-primary/65 mr-1.5 px-1.5 py-0 tabular-nums">
                    {timeBadge}
                  </Badge>
                )}
                {threadBadge && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 text-[7px] font-black uppercase tracking-widest px-1.5 py-0 border-current bg-background/50 inline-flex items-center gap-1 mr-1.5",
                      THREAD_PALETTE_MAP[threadBadge.color]?.bg || 'bg-muted/10',
                      THREAD_PALETTE_MAP[threadBadge.color]?.border || 'border-muted/20',
                      THREAD_PALETTE_MAP[threadBadge.color]?.text || 'text-muted-foreground'
                    )}
                  >
                    <span className="h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: THREAD_PALETTE_MAP[threadBadge.color]?.hsl }} />
                    {threadBadge.name}
                  </Badge>
                )}
                {phaseBadge && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 text-[7px] font-black uppercase tracking-widest px-1.5 py-0 border-current bg-background/50 inline-flex items-center mr-1.5",
                      PHASE_COLORS[phaseBadge] || 'bg-muted/30 text-muted-foreground/80'
                    )}
                  >
                    {phaseBadge}
                  </Badge>
                )}
                {content}
              </div>
            </div>
          );
        }

        if (trimmed.startsWith('-')) {
          const rest = trimmed.replace(/^-\s*/, '').trim();

          const timeBadgeMatch = rest.match(/^`\[([\d:]+)\]`\s*(.*)/) || rest.match(/^\[([\d:]+)\]\s*(.*)/);
          const timeBadge = timeBadgeMatch ? timeBadgeMatch[1] : null;
          let content = timeBadgeMatch ? timeBadgeMatch[2] : rest;

          // Parse thread badge
          const threadMatch = content.match(/^`\[thread:(.*?):(.*?)\]`\s*(.*)/);
          let threadBadge: { name: string; color: string } | null = null;
          if (threadMatch) {
            threadBadge = { name: threadMatch[1], color: threadMatch[2] };
            content = threadMatch[3];
          }

          // Parse phase badge
          const phaseMatch = content.match(/^`\[phase:(.*?)\]`\s*(.*)/);
          let phaseBadge: string | null = null;
          if (phaseMatch) {
            phaseBadge = phaseMatch[1];
            content = phaseMatch[2];
          }

          const THREAD_PALETTE_MAP: Record<string, { hsl: string; bg: string; border: string; text: string }> = {
            violet:  { hsl: 'hsl(263,70%,58%)',  bg: 'bg-violet-500/10',  border: 'border-violet-500/25',  text: 'text-violet-400' },
            cyan:    { hsl: 'hsl(187,85%,43%)',  bg: 'bg-cyan-500/10',    border: 'border-cyan-500/25',    text: 'text-cyan-400' },
            emerald: { hsl: 'hsl(152,60%,45%)',  bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400' },
            amber:   { hsl: 'hsl(38,92%,50%)',   bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   text: 'text-amber-400' },
            rose:    { hsl: 'hsl(346,84%,61%)',  bg: 'bg-rose-500/10',    border: 'border-rose-500/25',    text: 'text-rose-400' },
            indigo:  { hsl: 'hsl(234,89%,63%)',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/25',  text: 'text-indigo-400' },
          };

          return (
            <div
              key={index}
              style={{ paddingLeft: `calc(${paddingLeft} + 0.5rem)` }}
              className="flex items-start gap-2.5 py-0.5 text-[11px] font-semibold leading-relaxed text-foreground/85"
            >
              <div className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/45 shrink-0" />
              <div className="min-w-0">
                {timeBadge && (
                  <Badge variant="outline" className="h-4 border-primary/10 bg-muted/20 text-[8px] font-black text-primary/65 mr-1.5 px-1.5 py-0 tabular-nums">
                    {timeBadge}
                  </Badge>
                )}
                {threadBadge && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 text-[7px] font-black uppercase tracking-widest px-1.5 py-0 border-current bg-background/50 inline-flex items-center gap-1 mr-1.5",
                      THREAD_PALETTE_MAP[threadBadge.color]?.bg || 'bg-muted/10',
                      THREAD_PALETTE_MAP[threadBadge.color]?.border || 'border-muted/20',
                      THREAD_PALETTE_MAP[threadBadge.color]?.text || 'text-muted-foreground'
                    )}
                  >
                    <span className="h-1 w-1 rounded-full shrink-0" style={{ backgroundColor: THREAD_PALETTE_MAP[threadBadge.color]?.hsl }} />
                    {threadBadge.name}
                  </Badge>
                )}
                {phaseBadge && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 text-[7px] font-black uppercase tracking-widest px-1.5 py-0 border-current bg-background/50 inline-flex items-center mr-1.5",
                      PHASE_COLORS[phaseBadge] || 'bg-muted/30 text-muted-foreground/80'
                    )}
                  >
                    {phaseBadge}
                  </Badge>
                )}
                {content}
              </div>
            </div>
          );
        }

        return (
          <p
            key={index}
            style={{ paddingLeft }}
            className="text-[11px] font-semibold leading-relaxed text-foreground/75"
          >
            {line}
          </p>
        );
      })}
    </div>
  );
};
