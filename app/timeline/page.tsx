'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { CheckSquare, Bell, TrendingUp, Clock, Calendar, BarChart3, Layout } from 'lucide-react';
import { format, isToday, isYesterday, startOfDay } from 'date-fns';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import { cn } from '@/lib/utils';
import { Sparkles, Brain, Zap, Workflow, Flame, Plus, History, Activity } from 'lucide-react';

export default function TimelinePage() {
  const { tasks, reminders, habits, timeEntries } = useStore();

  // Combine all events into timeline
  const timelineEvents = [
    ...tasks.map((task) => ({
      id: task.id,
      type: 'task' as const,
      title: task.title,
      timestamp: new Date(task.updatedAt),
      metadata: { status: task.status, priority: task.priority },
    })),
    ...reminders.map((reminder) => ({
      id: reminder.id,
      type: 'reminder' as const,
      title: reminder.title,
      timestamp: new Date(reminder.dueDate),
      metadata: { completed: reminder.completed },
    })),
    ...habits.flatMap((habit) =>
      habit.completedDates.map((date) => ({
        id: `${habit.id}-${date}`,
        type: 'habit' as const,
        title: habit.title,
        timestamp: new Date(date),
        metadata: { streak: habit.streak },
      }))
    ),
    ...timeEntries.map((entry) => ({
      id: entry.id,
      type: 'time-entry' as const,
      title: entry.category,
      timestamp: new Date(entry.startTime),
      metadata: { duration: entry.duration, description: entry.description },
    })),
  ];

  // Sort by timestamp descending
  const sortedEvents = timelineEvents.sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );

  // Group by date
  const groupedEvents = sortedEvents.reduce((acc, event) => {
    const dateKey = startOfDay(event.timestamp).toISOString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, typeof sortedEvents>);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckSquare className="h-5 w-5 text-violet-500" />;
      case 'reminder':
        return <Bell className="h-5 w-5 text-pink-500" />;
      case 'habit':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'time-entry':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Calendar className="h-5 w-5" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'border-l-violet-500';
      case 'reminder':
        return 'border-l-pink-500';
      case 'habit':
        return 'border-l-green-500';
      case 'time-entry':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
          <div className="space-y-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between px-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-violet-500/5 text-violet-500 border-violet-500/20 px-2 py-0 h-4">Chronological Stream</Badge>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent italic">
                  Operational History
                </h1>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-70">A immutable transcript of your strategic evolution</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/timeline/day" className="flex-1 sm:flex-initial">
                  <Button className="w-full h-11 px-6 rounded-xl shadow-lg shadow-primary/10 bg-primary font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
                    <Layout className="h-4 w-4 mr-2" />
                    Interactive Planner
                  </Button>
                </Link>
                <Link href="/timeline/gantt" className="flex-1 sm:flex-initial">
                  <Button variant="outline" className="w-full h-11 px-6 rounded-xl bg-background/40 backdrop-blur-sm border-primary/10 font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Gantt Matrix
                  </Button>
                </Link>
              </div>
            </div>

            {Object.keys(groupedEvents).length === 0 ? (
              <Card className="bg-background/40 backdrop-blur-sm border-dashed border-2 py-20 rounded-3xl">
                <CardContent className="flex flex-col items-center justify-center text-center opacity-50">
                  <Calendar className="h-16 w-16 mb-6 text-muted-foreground" />
                  <p className="text-xl font-bold mb-2">The timeline is silent</p>
                  <p className="text-sm max-w-xs mx-auto">Start completing tasks, tracking time, and building habits to see your history appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="relative px-1">
                {/* The main vertical life-line */}
                <div className="absolute left-[19px] sm:left-[27px] top-6 bottom-0 w-[2px] bg-gradient-to-b from-primary via-primary/20 to-transparent rounded-full shadow-[0_0_8px_rgba(var(--primary),0.2)]" />

                <div className="space-y-12">
                  {Object.entries(groupedEvents).map(([dateKey, events]) => {
                    const date = new Date(dateKey);
                    return (
                      <div key={dateKey} className="space-y-6 relative">
                        <div className="sticky top-0 sm:static sm:top-auto py-2 z-20 sm:z-0 -mx-4 px-4 sm:mx-0 sm:px-0">
                          <div className="inline-flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-2.5 bg-background/60 backdrop-blur-3xl rounded-2xl border border-primary/10 shadow-2xl shadow-primary/5">
                            <h2 className="text-xl font-black tracking-tighter sm:text-2xl italic leading-none">{getDateLabel(date)}</h2>
                            <div className="hidden sm:block h-1 w-1 rounded-full bg-primary" />
                            <Badge variant="outline" className="w-fit text-[9px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/20 px-3 py-0.5 rounded-full">
                              {events.length} Operational Records
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-6">
                          {events.map((event) => (
                            <div key={event.id} className="relative pl-10 sm:pl-16 group transition-all duration-500">
                              <div className="absolute left-0 sm:left-1 top-0 h-10 w-10 sm:h-11 sm:w-11 bg-background/80 backdrop-blur-xl flex items-center justify-center rounded-2xl border border-primary/10 shadow-xl z-10 transition-all group-hover:scale-110 group-hover:border-primary/40 group-hover:shadow-primary/10 duration-500">
                                {getEventIcon(event.type)}
                              </div>

                              <Card className="relative overflow-hidden bg-background/60 backdrop-blur-2xl border border-primary/5 group-hover:border-primary/20 transition-all duration-500 shadow-2xl rounded-[2rem] group-hover:shadow-primary/5">
                                <div className={cn(
                                  "absolute top-0 left-0 w-1.5 h-full opacity-60",
                                  event.type === 'task' ? 'bg-gradient-to-b from-violet-600 to-violet-400' :
                                    event.type === 'reminder' ? 'bg-gradient-to-b from-pink-600 to-pink-400' :
                                      event.type === 'habit' ? 'bg-gradient-to-b from-emerald-600 to-emerald-400' :
                                        'bg-gradient-to-b from-blue-600 to-blue-400'
                                )} />

                                <CardContent className="p-6">
                                  <div className="flex flex-col gap-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.2em] bg-muted/20 border-transparent shadow-sm px-2 h-5">
                                          {event.type.replace('-', ' ')}
                                        </Badge>
                                        <div className="h-1 w-1 rounded-full bg-muted-foreground/20" />
                                        <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest tabular-nums italic">
                                          {format(event.timestamp, 'h:mm a')}
                                        </span>
                                      </div>

                                      {event.type === 'task' && (
                                        <div className="flex gap-2">
                                          <Badge
                                            variant={event.metadata.status === 'done' ? 'default' : 'secondary'}
                                            className={cn(
                                              "text-[9px] font-black uppercase tracking-widest px-2.5 h-5",
                                              event.metadata.status === 'done' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-primary/5 text-primary/60 border border-primary/10"
                                            )}
                                          >
                                            {event.metadata.status}
                                          </Badge>
                                          {event.metadata.priority === 'high' && (
                                            <Badge variant="destructive" className="text-[9px] font-black uppercase tracking-widest px-2.5 h-5 bg-destructive/10 text-destructive border-transparent">Priority Max</Badge>
                                          )}
                                        </div>
                                      )}

                                      {event.type === 'reminder' && event.metadata.completed && (
                                        <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest px-3 h-5">Secured</Badge>
                                      )}
                                    </div>

                                    <div>
                                      <h3 className="text-lg font-black tracking-tight mb-2 group-hover:text-primary transition-colors italic leading-tight">{event.title}</h3>

                                      {event.type === 'habit' && (
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20 text-orange-500">
                                          <Flame className="h-3.5 w-3.5 animate-pulse" />
                                          <span className="text-[10px] font-black uppercase tracking-widest italic">{event.metadata.streak} DAY PULSE</span>
                                        </div>
                                      )}

                                      {event.type === 'time-entry' && (
                                        <div className="space-y-4">
                                          {event.metadata.description && (
                                            <p className="text-xs font-medium text-muted-foreground/60 leading-relaxed max-w-2xl">
                                              {event.metadata.description}
                                            </p>
                                          )}
                                          <div className="flex items-center gap-3">
                                            {event.metadata.duration !== undefined && (
                                              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 text-blue-600 dark:text-blue-400">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-widest tabular-nums">
                                                  {Math.floor(event.metadata.duration / 60)}H{' '}
                                                  {event.metadata.duration % 60}M AUDIT
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute>
  );
}
