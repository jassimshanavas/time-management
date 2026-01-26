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
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                                    Calendar
                                </h1>
                                <p className="text-muted-foreground">Visualize your tasks, goals, and reminders</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDate(new Date())}
                                    className="bg-background/50 backdrop-blur-sm border-primary/20 hover:border-primary/50 transition-all duration-300"
                                >
                                    Today
                                </Button>
                            </div>
                        </div>

                        {/* Filters */}
                        <Card className="p-4 bg-background/40 backdrop-blur-xl border-primary/10">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                                    <div className="flex items-center gap-2 min-w-max">
                                        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="text-sm font-medium shrink-0">Show:</span>
                                        <Button
                                            variant={showTasks ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setShowTasks(!showTasks)}
                                            className="gap-2 h-8"
                                        >
                                            <CheckSquare className="h-3.5 w-3.5" />
                                            Tasks
                                        </Button>
                                        <Button
                                            variant={showGoals ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setShowGoals(!showGoals)}
                                            className="gap-2 h-8"
                                        >
                                            <Target className="h-3.5 w-3.5" />
                                            Goals
                                        </Button>
                                        <Button
                                            variant={showReminders ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setShowReminders(!showReminders)}
                                            className="gap-2 h-8"
                                        >
                                            <Bell className="h-3.5 w-3.5" />
                                            Reminders
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                                    <div className="flex items-center gap-4 text-[10px] sm:text-xs min-w-max">
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                            <span className="text-muted-foreground font-medium">High Priority</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                            <span className="text-muted-foreground font-medium">In Progress</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <span className="text-muted-foreground font-medium">Completed</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-pink-500/10 border border-pink-500/20">
                                            <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
                                            <span className="text-muted-foreground font-medium">Reminders</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Calendar */}
                        <Card className="p-0 sm:p-6 overflow-hidden bg-background/40 backdrop-blur-xl border-primary/10 shadow-2xl">
                            <div className="calendar-container h-[600px] md:h-[750px]">
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
                        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                            <Card className="p-4 bg-background/40 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all duration-300 group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/20 group-hover:scale-110 transition-transform duration-300">
                                        <CheckSquare className="h-5 w-5 text-violet-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {tasks.filter((t) => t.deadline).length}
                                        </p>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">Deadlines</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-4 bg-background/40 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all duration-300 group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 group-hover:scale-110 transition-transform duration-300">
                                        <Target className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {goals.filter((g) => g.targetDate).length}
                                        </p>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">Goal Targets</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-4 bg-background/40 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all duration-300 group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-pink-100 dark:bg-pink-900/20 group-hover:scale-110 transition-transform duration-300">
                                        <Bell className="h-5 w-5 text-pink-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{reminders.length}</p>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">Reminders</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="p-4 bg-background/40 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all duration-300 group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/20 group-hover:scale-110 transition-transform duration-300">
                                        <CalendarIcon className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{events.length}</p>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Events</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>

                    <style jsx global>{`
            .rbc-calendar {
              font-family: inherit;
              color: hsl(var(--foreground));
            }
            .rbc-header {
              padding: 12px 8px;
              font-weight: 600;
              border-bottom: 1px solid hsl(var(--border));
              background-color: hsl(var(--muted) / 0.2);
              font-size: 0.75rem;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .rbc-today {
              background-color: hsl(var(--primary) / 0.08);
            }
            .rbc-off-range-bg {
              background-color: hsl(var(--muted) / 0.1);
            }
            .rbc-event {
              border: none !important;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              transition: all 0.2s ease;
            }
            .rbc-event:hover {
              transform: translateY(-1px);
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            }
            .rbc-toolbar {
              padding: 1.5rem;
              margin-bottom: 0;
              flex-wrap: wrap;
              gap: 1rem;
              justify-content: center;
              background-color: hsl(var(--muted) / 0.1);
              border-bottom: 1px solid hsl(var(--border));
            }
            @media (min-width: 768px) {
              .rbc-toolbar {
                justify-content: space-between;
              }
            }
            .rbc-toolbar-label {
              font-size: 1.25rem;
              font-weight: 700;
              color: hsl(var(--foreground));
              order: -1;
              width: 100%;
              text-align: center;
            }
            @media (min-width: 768px) {
              .rbc-toolbar-label {
                order: 0;
                width: auto;
              }
            }
            .rbc-btn-group {
              display: flex;
              gap: 2px;
              background-color: hsl(var(--background));
              padding: 2px;
              border-radius: 8px;
              border: 1px solid hsl(var(--border));
            }
            .rbc-toolbar button {
              padding: 6px 12px;
              border-radius: 6px;
              font-weight: 500;
              border: none !important;
              background: transparent;
              color: hsl(var(--muted-foreground));
              font-size: 0.875rem;
              transition: all 0.2s;
            }
            .rbc-toolbar button:hover {
              background-color: hsl(var(--accent));
              color: hsl(var(--accent-foreground));
            }
            .rbc-toolbar button.rbc-active {
              background-color: hsl(var(--primary));
              color: hsl(var(--primary-foreground));
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .rbc-month-view {
              border: none;
              background: transparent;
            }
            .rbc-day-bg + .rbc-day-bg {
              border-left: 1px solid hsl(var(--border) / 0.5);
            }
            .rbc-month-row + .rbc-month-row {
              border-top: 1px solid hsl(var(--border) / 0.5);
            }
            .rbc-date-cell {
              padding: 6px;
              font-size: 0.8125rem;
              font-weight: 500;
            }
            .rbc-show-more {
              font-size: 0.75rem;
              font-weight: 600;
              color: hsl(var(--primary));
              background: transparent;
            }
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
                </MainLayout>
            </DataLoader>
        </ProtectedRoute>
    );
}
