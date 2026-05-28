import React, { useState } from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeEntry } from '@/types';

const THREAD_PALETTE: { color: string; hsl: string; bg: string; border: string; text: string }[] = [
  { color: 'violet', hsl: 'hsl(263,70%,58%)',  bg: 'bg-violet-500/10',  border: 'border-violet-500/25',  text: 'text-violet-400' },
  { color: 'cyan',   hsl: 'hsl(187,85%,43%)',  bg: 'bg-cyan-500/10',    border: 'border-cyan-500/25',    text: 'text-cyan-400' },
  { color: 'emerald',hsl: 'hsl(152,60%,45%)',  bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400' },
  { color: 'amber',  hsl: 'hsl(38,92%,50%)',   bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   text: 'text-amber-400' },
  { color: 'rose',   hsl: 'hsl(346,84%,61%)',  bg: 'bg-rose-500/10',    border: 'border-rose-500/25',    text: 'text-rose-400' },
  { color: 'indigo', hsl: 'hsl(234,89%,63%)',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/25',  text: 'text-indigo-400' },
];

const getThreadPalette = (color: string) =>
  THREAD_PALETTE.find((p) => p.color === color) ?? THREAD_PALETTE[0];

export const CompletedOutliner = ({ entry }: { entry: TimeEntry }) => {
  const updates = entry.liveUpdates || [];
  if (updates.length === 0) return null;

  const entryThreads = entry.threads || [];
  const [currentView, setCurrentView] = useState<string | 'all'>('all');

  return (
    <div className="mt-4 space-y-3">
      {/* Thread Filter Pills */}
      {entryThreads.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-muted/20 border border-primary/5">
          <button
            type="button"
            onClick={() => setCurrentView('all')}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border",
              currentView === 'all'
                ? "bg-primary/10 border-primary/20 text-primary"
                : "border-transparent text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30"
            )}
          >
            All
            <span className="ml-1 opacity-60">{updates.length}</span>
          </button>

          {entryThreads.map((thread) => {
            const pal = getThreadPalette(thread.color);
            const isViewing = currentView === thread.id;
            const nodeCount = updates.filter((n) => n.threadId === thread.id).length;
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => setCurrentView(thread.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all",
                  isViewing
                    ? `${pal.bg} ${pal.border} ${pal.text}`
                    : "border-transparent text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: pal.hsl }} />
                {thread.name}
                <span className="opacity-50">{nodeCount}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Indented Log Tree */}
      <div className="relative border-l border-primary/10 ml-3 pl-4 py-1 space-y-3">
        {updates
          .filter((node) => {
            if (currentView === 'all') return true;
            return node.threadId === currentView;
          })
          .map((node) => {
            const isTodo = node.type === 'todo';
            const isDone = node.completed === true;
            const nodeThread = entryThreads.find((t) => t.id === node.threadId);
            const nodePal = nodeThread ? getThreadPalette(nodeThread.color) : null;
            const blockerNode = node.blockedBy ? updates.find((n) => n.id === node.blockedBy) : null;
            const isCurrentlyBlocked = !!blockerNode && !blockerNode.completed;
            
            return (
              <div
                key={node.id}
                style={{
                  paddingLeft: `${(node.indent || 0) * 1.25}rem`,
                }}
                className="group relative flex items-start justify-between gap-2 py-0.5 transition-all"
              >
                {/* Thread color accent bar on left edge */}
                {nodePal && (
                  <div
                    className="absolute -left-4 top-1.5 bottom-1.5 w-0.5 rounded-full opacity-60"
                    style={{ backgroundColor: nodePal.hsl }}
                  />
                )}
                {/* Visual Hierarchy Connector Line */}
                {(node.indent || 0) > 0 && (
                  <div 
                    style={{ left: `${((node.indent || 0) - 1) * 1.25}rem` }}
                    className="absolute -top-2.5 bottom-1/2 w-4 border-l border-b border-primary/15 rounded-bl-lg" 
                  />
                )}

                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {isCurrentlyBlocked ? (
                    <div 
                      className="mt-0.5 h-4 w-4 flex items-center justify-center text-amber-500 shrink-0 cursor-not-allowed"
                      title={`Blocked by: ${blockerNode?.text}`}
                    >
                      <Lock className="h-3.5 w-3.5 stroke-[2.5]" />
                    </div>
                  ) : isTodo ? (
                    <div
                      className={cn(
                        "mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 text-primary-foreground",
                        isDone
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-primary/30 bg-background"
                      )}
                    >
                      {isDone && <CheckCircle2 className="h-3 w-3 stroke-[3]" />}
                    </div>
                  ) : (
                    <div className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/45 shrink-0" />
                  )}

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-xs font-semibold leading-relaxed break-words text-foreground/85",
                        isDone && "line-through text-muted-foreground/50 italic",
                        isCurrentlyBlocked && "text-muted-foreground/40 italic cursor-not-allowed"
                      )}
                    >
                      {node.text}
                    </p>

                    {isCurrentlyBlocked && blockerNode && (
                      <div className="mt-1 flex items-center gap-1 text-[9px] font-semibold text-amber-500/70">
                        <Lock className="h-2.5 w-2.5 shrink-0" />
                        <span>Waiting for: {blockerNode.text}</span>
                      </div>
                    )}

                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-wider text-muted-foreground/35">
                      <span className="tabular-nums">{node.elapsedTime}</span>
                      {node.phase && (
                        <span className="text-primary/45 font-black italic">{node.phase}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
