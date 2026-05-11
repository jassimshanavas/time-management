'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, MonitorUp, Square, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

type MiniWindowWithMeta = Window & {
  __timeflowFallback?: boolean;
};

const formatElapsedTime = (startTime: Date, currentTime: Date) => {
  const elapsed = Math.max(
    0,
    Math.floor((currentTime.getTime() - new Date(startTime).getTime()) / 1000)
  );
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export function GlobalTimerDock() {
  const { timeEntries, stopTimeEntry } = useStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const miniWindowRef = useRef<MiniWindowWithMeta | null>(null);

  const runningEntries = useMemo(
    () =>
      [...timeEntries]
        .filter((entry) => entry.isRunning)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [timeEntries]
  );

  useEffect(() => {
    if (runningEntries.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [runningEntries.length]);

  const renderMiniWindow = useCallback(() => {
    const miniWindow = miniWindowRef.current;
    if (!miniWindow || miniWindow.closed) {
      miniWindowRef.current = null;
      return;
    }

    const doc = miniWindow.document;
    const cards = runningEntries
      .map((entry) => {
        const category = escapeHtml(entry.category);
        const description = entry.description
          ? `<div class="description">${escapeHtml(entry.description)}</div>`
          : '';

        return `
          <section class="card">
            <div class="row">
              <div>
                <div class="category">${category}</div>
                ${description}
              </div>
              <button class="stop" data-entry-id="${entry.id}">Stop</button>
            </div>
            <div class="time">${formatElapsedTime(entry.startTime, currentTime)}</div>
          </section>
        `;
      })
      .join('');

    doc.body.innerHTML = `
      <div class="shell">
        <div class="stack">
          ${cards || '<div class="empty">No active timers.</div>'}
        </div>
      </div>
    `;

    doc.querySelectorAll<HTMLButtonElement>('[data-entry-id]').forEach((button) => {
      button.onclick = () => {
        const entryId = button.dataset.entryId;
        if (entryId) {
          void stopTimeEntry(entryId);
        }
      };
    });

    if (miniWindow.__timeflowFallback && typeof miniWindow.resizeTo === 'function') {
      const desiredHeight = Math.min(
        Math.max(doc.documentElement.scrollHeight + 20, 180),
        360
      );
      miniWindow.resizeTo(320, desiredHeight);
    }
  }, [currentTime, runningEntries, stopTimeEntry]);

  useEffect(() => {
    renderMiniWindow();
  }, [renderMiniWindow]);

  useEffect(() => {
    return () => {
      if (miniWindowRef.current && !miniWindowRef.current.closed) {
        miniWindowRef.current.close();
      }
    };
  }, []);

  const openMiniWindow = async () => {
    if (typeof window === 'undefined') return;

    if (miniWindowRef.current && !miniWindowRef.current.closed) {
      miniWindowRef.current.focus();
      renderMiniWindow();
      return;
    }

    let miniWindow: MiniWindowWithMeta | null = null;

    try {
      const pictureInPictureApi = (
        window as Window & {
          documentPictureInPicture?: { requestWindow: (options?: { width?: number; height?: number }) => Promise<Window> };
        }
      ).documentPictureInPicture;

      if (pictureInPictureApi?.requestWindow) {
        miniWindow = (await pictureInPictureApi.requestWindow({
          width: 320,
          height: Math.min(36 + runningEntries.length * 118, 300),
        })) as MiniWindowWithMeta;
      }
    } catch (error) {
      console.error('Unable to open Picture-in-Picture timer window:', error);
    }

    if (!miniWindow) {
      miniWindow = window.open('', 'TimeFlowTimerDock', 'width=320,height=260') as MiniWindowWithMeta | null;
      if (miniWindow) {
        miniWindow.__timeflowFallback = true;
      }
    }

    if (!miniWindow) {
      return;
    }

    miniWindowRef.current = miniWindow;
    miniWindow.document.title = 'TimeFlow Timers';

    const style = miniWindow.document.createElement('style');
    style.textContent = `
      :root {
        color-scheme: dark;
        --bg-top: rgba(16, 22, 38, 0.98);
        --bg-bottom: rgba(10, 14, 26, 0.98);
        --card: rgba(255, 255, 255, 0.045);
        --card-border: rgba(255, 255, 255, 0.08);
        --text: rgba(245, 247, 255, 0.96);
        --muted: rgba(201, 209, 232, 0.62);
        --accent: rgba(120, 169, 255, 0.95);
        --accent-soft: rgba(120, 169, 255, 0.12);
        --danger: rgba(255, 126, 126, 0.92);
        --danger-soft: rgba(255, 126, 126, 0.12);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, Arial, sans-serif;
        background:
          radial-gradient(circle at top, rgba(120, 169, 255, 0.16), transparent 38%),
          linear-gradient(180deg, var(--bg-top) 0%, var(--bg-bottom) 100%);
        color: var(--text);
      }
      .shell { padding: 8px; }
      .stack {
        display: grid;
        gap: 6px;
      }
      .card {
        border: 1px solid var(--card-border);
        background: var(--card);
        border-radius: 14px;
        padding: 9px 10px 10px;
        backdrop-filter: blur(14px);
        box-shadow: 0 10px 24px rgba(0,0,0,0.2);
      }
      .row {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
      }
      .category {
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .description {
        margin-top: 3px;
        color: var(--muted);
        font-size: 10px;
        line-height: 1.35;
        max-width: 180px;
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .time {
        margin-top: 8px;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.04em;
        font-variant-numeric: tabular-nums;
      }
      .stop {
        border: 0;
        border-radius: 999px;
        padding: 6px 9px;
        background: var(--danger-soft);
        color: var(--danger);
        cursor: pointer;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }
      .empty {
        border-radius: 16px;
        border: 1px dashed var(--card-border);
        color: var(--muted);
        padding: 18px;
        text-align: center;
        font-size: 12px;
      }
    `;

    miniWindow.document.head.innerHTML = '';
    miniWindow.document.head.appendChild(style);
    renderMiniWindow();

    miniWindow.addEventListener('pagehide', () => {
      if (miniWindowRef.current === miniWindow) {
        miniWindowRef.current = null;
      }
    });
  };

  if (runningEntries.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(420px,calc(100vw-2rem))]">
      <div className="rounded-[1.75rem] border border-primary/15 bg-background/90 p-4 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                <Timer className="mr-1 h-3 w-3" />
                {runningEntries.length} live
              </Badge>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Quick Access
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your timers stay one click away anywhere in the app.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => void openMiniWindow()}
            >
              <MonitorUp className="mr-2 h-4 w-4" />
              Mini Window
            </Button>
            <Link href="/time-tracking">
              <Button size="sm" className="rounded-full">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {runningEntries.slice(0, 3).map((entry) => (
            <div
              key={entry.id}
              className={cn(
                'flex min-w-[120px] flex-1 items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-primary/5 px-3 py-2'
              )}
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-bold uppercase tracking-wider text-foreground">
                  {entry.category}
                </div>
                <div className="text-sm font-mono font-semibold tabular-nums text-primary">
                  {formatElapsedTime(entry.startTime, currentTime)}
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => void stopTimeEntry(entry.id)}
                aria-label={`Stop ${entry.category} timer`}
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            </div>
          ))}

          {runningEntries.length > 3 && (
            <Link
              href="/time-tracking"
              className="flex rounded-2xl border border-dashed border-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <span>
                +{runningEntries.length - 3} more
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
