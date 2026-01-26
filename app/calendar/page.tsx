'use client';

import { useState, useMemo, useCallback } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/store';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    CheckSquare,
    Target,
    Bell,
    Filter,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import { ProjectBadge } from '@/components/projects/project-badge';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    type: 'task' | 'goal' | 'reminder';
    status?: string;
    projectId?: string;
    priority?: string;
    resource?: any;
}

export default function CalendarPage() {
    const { tasks, goals, reminders, projects, selectedProjectId } = useStore();
    const [view, setView] = useState<View>('month');
    const [date, setDate] = useState(new Date());
    const [showTasks, setShowTasks] = useState(true);
    const [showGoals, setShowGoals] = useState(true);
    const [showReminders, setShowReminders] = useState(true);

    // Convert data to calendar events
    const events = useMemo<CalendarEvent[]>(() => {
        const calendarEvents: CalendarEvent[] = [];

        // Filter by global project context (Workspace)
        const filterByWorkspace = <T extends { projectId?: string }>(items: T[]) => {
            if (selectedProjectId === null) return items;
            if (selectedProjectId === 'personal') return items.filter((item) => !item.projectId);
            return items.filter((item) => item.projectId === selectedProjectId);
        };

        const filteredTasks = filterByWorkspace(tasks);
        const filteredGoals = filterByWorkspace(goals);
        const filteredReminders = filterByWorkspace(reminders);

        // Add tasks with deadlines
        if (showTasks) {
            filteredTasks.forEach((task) => {
                if (task.deadline) {
                    const deadline = new Date(task.deadline);
                    calendarEvents.push({
                        id: `task-${task.id}`,
                        title: task.title,
                        start: deadline,
                        end: deadline,
                        type: 'task',
                        status: task.status,
                        projectId: task.projectId,
                        priority: task.priority,
                        resource: task,
                    });
                }
            });
        }

        // Add goals with target dates
        if (showGoals) {
            filteredGoals.forEach((goal) => {
                if (goal.targetDate) {
                    const targetDate = new Date(goal.targetDate);
                    calendarEvents.push({
                        id: `goal-${goal.id}`,
                        title: `🎯 ${goal.title}`,
                        start: targetDate,
                        end: targetDate,
                        type: 'goal',
                        projectId: goal.projectId,
                        resource: goal,
                    });
                }
            });
        }

        // Add reminders
        if (showReminders) {
            filteredReminders.forEach((reminder) => {
                if (reminder.dueDate) {
                    const dueDate = new Date(reminder.dueDate);
                    calendarEvents.push({
                        id: `reminder-${reminder.id}`,
                        title: `🔔 ${reminder.title}`,
                        start: dueDate,
                        end: dueDate,
                        type: 'reminder',
                        projectId: reminder.projectId,
                        resource: reminder,
                    });
                }
            });
        }

        return calendarEvents;
    }, [tasks, goals, reminders, showTasks, showGoals, showReminders, selectedProjectId]);

    // Custom event styling
    const eventStyleGetter = useCallback((event: CalendarEvent) => {
        let backgroundColor = '#6366f1'; // Default indigo
        let borderColor = '#4f46e5';

        if (event.type === 'task') {
            if (event.status === 'done') {
                backgroundColor = '#10b981'; // Green
                borderColor = '#059669';
            } else if (event.status === 'in-progress') {
                backgroundColor = '#3b82f6'; // Blue
                borderColor = '#2563eb';
            } else if (event.priority === 'high') {
                backgroundColor = '#ef4444'; // Red
                borderColor = '#dc2626';
            }
        } else if (event.type === 'goal') {
            backgroundColor = '#10b981'; // Green
            borderColor = '#059669';
        } else if (event.type === 'reminder') {
            backgroundColor = '#ec4899'; // Pink
            borderColor = '#db2777';
        }

        return {
            style: {
                backgroundColor,
                borderColor,
                borderLeft: `4px solid ${borderColor}`,
                borderRadius: '4px',
                color: 'white',
                fontSize: '0.875rem',
                padding: '2px 6px',
            },
        };
    }, []);

    // Custom event component
    const EventComponent = ({ event }: { event: CalendarEvent }) => (
        <div className="flex items-center gap-1 text-xs">
            <span className="truncate">{event.title}</span>
            {event.projectId && (
                <div className="ml-auto shrink-0">
                    <ProjectBadge projectId={event.projectId} size="sm" />
                </div>
            )}
        </div>
    );

    const handleNavigate = useCallback((newDate: Date) => {
        setDate(newDate);
    }, []);

    const handleViewChange = useCallback((newView: View) => {
        setView(newView);
    }, []);

    return (
        <ProtectedRoute>
            <DataLoader>
                <MainLayout>
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
                                <p className="text-muted-foreground">Visualize your tasks, goals, and reminders</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDate(new Date())}
                                >
                                    Today
                                </Button>
                            </div>
                        </div>

                        {/* Filters */}
                        <Card className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Show:</span>
                                    <Button
                                        variant={showTasks ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setShowTasks(!showTasks)}
                                        className="gap-2"
                                    >
                                        <CheckSquare className="h-4 w-4" />
                                        Tasks
                                    </Button>
                                    <Button
                                        variant={showGoals ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setShowGoals(!showGoals)}
                                        className="gap-2"
                                    >
                                        <Target className="h-4 w-4" />
                                        Goals
                                    </Button>
                                    <Button
                                        variant={showReminders ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setShowReminders(!showReminders)}
                                        className="gap-2"
                                    >
                                        <Bell className="h-4 w-4" />
                                        Reminders
                                    </Button>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded bg-red-500" />
                                            <span className="text-muted-foreground">High Priority</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded bg-blue-500" />
                                            <span className="text-muted-foreground">In Progress</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded bg-green-500" />
                                            <span className="text-muted-foreground">Completed/Goals</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 rounded bg-pink-500" />
                                            <span className="text-muted-foreground">Reminders</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Calendar */}
                        <Card className="p-6">
                            <div className="calendar-container" style={{ height: '700px' }}>
                                <BigCalendar
                                    localizer={localizer}
                                    events={events}
                                    startAccessor="start"
                                    endAccessor="end"
                                    view={view}
                                    onView={handleViewChange}
                                    date={date}
                                    onNavigate={handleNavigate}
                                    eventPropGetter={eventStyleGetter}
                                    components={{
                                        event: EventComponent,
                                    }}
                                    popup
                                    toolbar
                                    views={['month', 'week', 'day', 'agenda']}
                                />
                            </div>
                        </Card>

                        {/* Stats */}
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/20">
                                        <CheckSquare className="h-5 w-5 text-violet-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {tasks.filter((t) => t.deadline).length}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Tasks with Deadlines</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/20">
                                        <Target className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {goals.filter((g) => g.targetDate).length}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Goals with Targets</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/20">
                                        <Bell className="h-5 w-5 text-pink-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{reminders.length}</p>
                                        <p className="text-xs text-muted-foreground">Total Reminders</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                                        <CalendarIcon className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{events.length}</p>
                                        <p className="text-xs text-muted-foreground">Total Events</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>

                    <style jsx global>{`
            .rbc-calendar {
              font-family: inherit;
            }
            .rbc-header {
              padding: 12px 8px;
              font-weight: 600;
              border-bottom: 2px solid hsl(var(--border));
            }
            .rbc-today {
              background-color: hsl(var(--primary) / 0.05);
            }
            .rbc-off-range-bg {
              background-color: hsl(var(--muted) / 0.3);
            }
            .rbc-event {
              border: none !important;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }
            .rbc-event:hover {
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            .rbc-toolbar {
              padding: 16px 0;
              font-size: 1rem;
            }
            .rbc-toolbar button {
              padding: 8px 16px;
              border-radius: 6px;
              font-weight: 500;
            }
            .rbc-toolbar button:hover {
              background-color: hsl(var(--accent));
            }
            .rbc-toolbar button.rbc-active {
              background-color: hsl(var(--primary));
              color: white;
            }
            .rbc-month-view {
              border: 1px solid hsl(var(--border));
              border-radius: 8px;
              overflow: hidden;
            }
            .rbc-day-bg {
              border-color: hsl(var(--border));
            }
            .rbc-date-cell {
              padding: 8px;
            }
          `}</style>
                </MainLayout>
            </DataLoader>
        </ProtectedRoute>
    );
}
