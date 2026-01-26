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
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Timeline</h1>
                <p className="text-muted-foreground">Your daily activity timeline</p>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/timeline/day">
                  <Button className="bg-primary hover:bg-primary/90">
                    <Layout className="h-4 w-4 mr-2" />
                    Interactive Planner
                  </Button>
                </Link>
                <Link href="/timeline/gantt">
                  <Button variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Gantt View
                  </Button>
                </Link>
              </div>
            </div>

            {Object.keys(groupedEvents).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No activity yet. Start tracking your tasks and time!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedEvents).map(([dateKey, events]) => {
                  const date = new Date(dateKey);
                  return (
                    <div key={dateKey} className="space-y-4">
                      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 z-10">
                        <h2 className="text-xl font-semibold">{getDateLabel(date)}</h2>
                        <p className="text-sm text-muted-foreground">{events.length} activities</p>
                      </div>

                      <div className="space-y-3 relative before:absolute before:left-[21px] before:top-0 before:bottom-0 before:w-px before:bg-border">
                        {events.map((event) => (
                          <div key={event.id} className="relative pl-12">
                            <div className="absolute left-0 top-1 bg-background p-1 rounded-full border-2">
                              {getEventIcon(event.type)}
                            </div>
                            <Card className={`border-l-4 ${getEventColor(event.type)}`}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline" className="capitalize">
                                        {event.type.replace('-', ' ')}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {format(event.timestamp, 'h:mm a')}
                                      </span>
                                    </div>
                                    <h3 className="font-semibold mb-1">{event.title}</h3>

                                    {event.type === 'task' && (
                                      <div className="flex gap-2">
                                        <Badge
                                          variant={
                                            event.metadata.status === 'done'
                                              ? 'default'
                                              : 'secondary'
                                          }
                                        >
                                          {event.metadata.status}
                                        </Badge>
                                        <Badge
                                          variant={
                                            event.metadata.priority === 'high'
                                              ? 'destructive'
                                              : 'secondary'
                                          }
                                        >
                                          {event.metadata.priority}
                                        </Badge>
                                      </div>
                                    )}

                                    {event.type === 'reminder' && event.metadata.completed && (
                                      <Badge variant="default">Completed</Badge>
                                    )}

                                    {event.type === 'habit' && (
                                      <p className="text-sm text-muted-foreground">
                                        🔥 Streak: {event.metadata.streak} days
                                      </p>
                                    )}

                                    {event.type === 'time-entry' && (
                                      <div>
                                        {event.metadata.description && (
                                          <p className="text-sm text-muted-foreground mb-1">
                                            {event.metadata.description}
                                          </p>
                                        )}
                                        {event.metadata.duration && (
                                          <Badge variant="secondary">
                                            {Math.floor(event.metadata.duration / 60)}h{' '}
                                            {event.metadata.duration % 60}m
                                          </Badge>
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
            )}
          </div>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute>
  );
}
