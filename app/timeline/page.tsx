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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                  Life History
                </h1>
                <p className="text-xs text-muted-foreground">Every step recorded in your productivity journey</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/timeline/day" className="flex-1 sm:flex-initial">
                  <Button className="w-full h-9 px-4 rounded-xl shadow-md shadow-primary/10 bg-primary font-black text-xs">
                    <Layout className="h-4 w-4 mr-1.5" />
                    Interactive Planner
                  </Button>
                </Link>
                <Link href="/timeline/gantt" className="flex-1 sm:flex-initial">
                  <Button variant="outline" className="w-full h-9 px-4 rounded-xl bg-background/50 backdrop-blur-sm border-primary/10 font-bold text-xs">
                    <BarChart3 className="h-4 w-4 mr-1.5" />
                    Gantt View
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
              <div className="relative">
                {/* The main vertical life-line */}
                <div className="absolute left-[19px] sm:left-[27px] top-6 bottom-0 w-1 bg-gradient-to-b from-primary/30 via-primary/10 to-transparent rounded-full" />

                <div className="space-y-6">
                  {Object.entries(groupedEvents).map(([dateKey, events]) => {
                    const date = new Date(dateKey);
                    return (
                      <div key={dateKey} className="space-y-4 relative">
                        <div className="sticky top-0 sm:static sm:top-auto py-1 z-20 sm:z-0">
                          <div className="inline-flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 px-3 py-1 bg-background/80 backdrop-blur-xl sm:bg-transparent rounded-xl border border-primary/5 sm:border-0 shadow-md sm:shadow-none">
                            <h2 className="text-xl font-black tracking-tighter sm:text-2xl">{getDateLabel(date)}</h2>
                            <Badge variant="outline" className="w-fit text-[9px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/10 px-2.5 py-0 rounded-full">
                              {events.length} Events
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {events.map((event) => (
                            <div key={event.id} className="relative pl-8 sm:pl-12 group">
                              <div className="absolute left-0 sm:left-1 top-0 h-8 w-8 sm:h-9 sm:w-9 bg-background flex items-center justify-center rounded-xl border-2 border-primary/10 shadow-lg z-10 transition-transform group-hover:scale-110 duration-300">
                                {getEventIcon(event.type)}
                              </div>

                              <Card className={`overflow-hidden bg-background/40 backdrop-blur-xl border-primary/5 group-hover:border-primary/20 transition-all duration-300 shadow-xl rounded-2xl`}>
                                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${event.type === 'task' ? 'from-violet-500 to-violet-300' :
                                  event.type === 'reminder' ? 'from-pink-500 to-pink-300' :
                                    event.type === 'habit' ? 'from-emerald-500 to-emerald-300' :
                                      'from-blue-500 to-blue-300'
                                  }`} />

                                <CardContent className="p-3 sm:p-4">
                                  <div className="flex flex-col gap-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-muted/50 border-transparent shadow-sm px-1.5 h-4">
                                          {event.type.replace('-', ' ')}
                                        </Badge>
                                        <div className="h-0.5 w-0.5 rounded-full bg-muted-foreground/30" />
                                        <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-tighter">
                                          {format(event.timestamp, 'h:mm a')}
                                        </span>
                                      </div>

                                      {event.type === 'task' && (
                                        <div className="flex gap-1.5">
                                          <Badge
                                            variant={event.metadata.status === 'done' ? 'default' : 'secondary'}
                                            className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0 h-4"
                                          >
                                            {event.metadata.status}
                                          </Badge>
                                          {event.metadata.priority === 'high' && (
                                            <Badge variant="destructive" className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0 h-4">Critical</Badge>
                                          )}
                                        </div>
                                      )}

                                      {event.type === 'reminder' && event.metadata.completed && (
                                        <Badge variant="default" className="bg-emerald-500 text-white border-0 text-[8px] font-black uppercase tracking-widest px-2 py-0 h-4">Done</Badge>
                                      )}
                                    </div>

                                    <div>
                                      <h3 className="text-base font-black tracking-tight mb-1 group-hover:text-primary transition-colors">{event.title}</h3>

                                      {event.type === 'habit' && (
                                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-orange-500/10 rounded-full border border-orange-500/20 text-orange-600 dark:text-orange-400">
                                          <TrendingUp className="h-3 w-3" />
                                          <span className="text-[10px] font-black uppercase tracking-tight">🔥 {event.metadata.streak} days</span>
                                        </div>
                                      )}

                                      {event.type === 'time-entry' && (
                                        <div className="space-y-2">
                                          {event.metadata.description && (
                                            <p className="text-xs font-medium text-muted-foreground/70 leading-normal line-clamp-1">
                                              {event.metadata.description}
                                            </p>
                                          )}
                                          {event.metadata.duration && (
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20 text-blue-600 dark:text-blue-400">
                                              <Clock className="h-3 w-3" />
                                              <span className="text-[10px] font-black uppercase tracking-tight">
                                                {Math.floor(event.metadata.duration / 60)}h{' '}
                                                {event.metadata.duration % 60}m
                                              </span>
                                            </div>
                                          )}
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
