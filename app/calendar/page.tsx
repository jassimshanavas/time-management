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
import { cn } from '@/lib/utils';
import { Sparkles, Brain, Zap, Workflow, Flame, Plus } from 'lucide-react';
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
                    <div className="space-y-8 pb-12">
                        {/* Header */}
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between px-1">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-500 border-emerald-500/20 px-2 py-0 h-4">Event Matrix</Badge>
                                </div>
                                <h1 className="text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent italic">
                                    Global Event Matrix
                                </h1>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-70">Synthesizing multidimensional operational timelines</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDate(new Date())}
                                    className="h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest bg-background/40 border-primary/10 shadow-sm transition-all hover:scale-105 active:scale-95"
                                >
                                    Jump to Present
                                </Button>
                                <Button size="icon" className="h-10 w-10 rounded-xl bg-primary shadow-lg shadow-primary/20">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Filters */}
                        <Card className="px-1 sm:p-5 bg-background/60 backdrop-blur-2xl border-none shadow-2xl rounded-[2rem] overflow-hidden">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between p-4 sm:p-0">
                                <div className="flex items-center gap-3 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
                                    <div className="flex items-center gap-2 min-w-max">
                                        <div className="h-8 w-8 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center mr-2">
                                            <Filter className="h-4 w-4 text-primary" />
                                        </div>
                                        <Button
                                            variant={showTasks ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setShowTasks(!showTasks)}
                                            className={cn(
                                                "h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                                                !showTasks && "bg-background/40 border-primary/10"
                                            )}
                                        >
                                            <CheckSquare className="h-3.5 w-3.5 mr-2" />
                                            Operations
                                        </Button>
                                        <Button
                                            variant={showGoals ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setShowGoals(!showGoals)}
                                            className={cn(
                                                "h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                                                !showGoals && "bg-background/40 border-primary/10"
                                            )}
                                        >
                                            <Target className="h-3.5 w-3.5 mr-2" />
                                            Targets
                                        </Button>
                                        <Button
                                            variant={showReminders ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setShowReminders(!showReminders)}
                                            className={cn(
                                                "h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                                                !showReminders && "bg-background/40 border-primary/10"
                                            )}
                                        >
                                            <Bell className="h-3.5 w-3.5 mr-2" />
                                            Neural Alerts
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                                    <div className="flex items-center gap-4 min-w-max bg-muted/10 p-2 rounded-2xl border border-primary/5">
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/40 border border-red-500/10">
                                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 italic">Critical</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/40 border border-blue-500/10">
                                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 italic">In Flux</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/40 border border-green-500/10">
                                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60 italic">Secured</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Calendar */}
                        <Card className="p-0 border-none bg-background/60 backdrop-blur-2xl shadow-2xl rounded-[3rem] overflow-hidden">
                            <div className="calendar-container h-[700px] md:h-[850px] overflow-hidden">
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
                        {/* Stats */}
                        <div className="grid gap-6 grid-cols-2 lg:grid-cols-4 px-1">
                            <Card className="relative overflow-hidden border-none bg-background/60 backdrop-blur-2xl shadow-xl rounded-[2rem] p-6 transition-all duration-500 hover:shadow-violet-500/5 group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-2xl bg-violet-500/5 border border-violet-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <Workflow className="h-5 w-5 text-violet-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black italic tabular-nums leading-none mb-1">
                                            {tasks.filter((t) => t.deadline).length}
                                        </p>
                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Deadlines</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="relative overflow-hidden border-none bg-background/60 backdrop-blur-2xl shadow-xl rounded-[2rem] p-6 transition-all duration-500 hover:shadow-emerald-500/5 group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <Zap className="h-5 w-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black italic tabular-nums leading-none mb-1">
                                            {goals.filter((g) => g.targetDate).length}
                                        </p>
                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Targets</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="relative overflow-hidden border-none bg-background/60 backdrop-blur-2xl shadow-xl rounded-[2rem] p-6 transition-all duration-500 hover:shadow-pink-500/5 group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-2xl bg-pink-500/5 border border-pink-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <Bell className="h-5 w-5 text-pink-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black italic tabular-nums leading-none mb-1">{reminders.length}</p>
                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Alerts</p>
                                    </div>
                                </div>
                            </Card>

                            <Card className="relative overflow-hidden border-none bg-background/60 backdrop-blur-2xl shadow-xl rounded-[2rem] p-6 transition-all duration-500 hover:shadow-blue-500/5 group">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                        <Brain className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black italic tabular-nums leading-none mb-1">{events.length}</p>
                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Synapses</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>

                    <style jsx global>{`
            .rbc-calendar {
              font-family: inherit;
              color: hsl(var(--foreground));
              border: none !important;
            }
            .rbc-month-view {
              border: none !important;
            }
            .rbc-header {
              padding: 16px 8px;
              font-weight: 900;
              border-bottom: 1px solid hsl(var(--primary) / 0.05) !important;
              background-color: hsl(var(--muted) / 0.1);
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.2em;
              color: hsl(var(--muted-foreground) / 0.6);
            }
            .rbc-today {
              background-color: hsl(var(--primary) / 0.03) !important;
            }
            .rbc-off-range-bg {
              background-color: transparent !important;
              opacity: 0.3;
            }
            .rbc-event {
              border: none !important;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              border-radius: 10px !important;
              margin: 2px 4px !important;
            }
            .rbc-event:hover {
              transform: scale(1.02) translateY(-1px);
              box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
              z-index: 50;
            }
            .rbc-toolbar {
              padding: 2rem;
              margin-bottom: 0;
              flex-wrap: wrap;
              gap: 1.5rem;
              justify-content: center;
              background-color: hsl(var(--muted) / 0.1);
              border-bottom: 1px solid hsl(var(--primary) / 0.05);
            }
            @media (min-width: 768px) {
              .rbc-toolbar {
                justify-content: space-between;
              }
            }
            .rbc-toolbar-label {
              font-size: 1.25rem;
              font-weight: 900;
              color: hsl(var(--foreground));
              order: -1;
              width: 100%;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              font-style: italic;
            }
            @media (min-width: 768px) {
              .rbc-toolbar-label {
                order: 0;
                width: auto;
              }
            }
            .rbc-btn-group {
              display: flex;
              gap: 4px;
              background-color: hsl(var(--background) / 0.6);
              padding: 4px;
              border-radius: 12px;
              border: 1px solid hsl(var(--primary) / 0.05);
              backdrop-filter: blur(12px);
            }
            .rbc-toolbar button {
              padding: 8px 16px;
              border-radius: 8px;
              font-weight: 900;
              border: none !important;
              background: transparent;
              color: hsl(var(--muted-foreground));
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              transition: all 0.3s;
            }
            .rbc-toolbar button:hover {
              background-color: hsl(var(--primary) / 0.05);
              color: hsl(var(--primary));
            }
            .rbc-toolbar button.rbc-active {
              background-color: hsl(var(--primary));
              color: white;
              box-shadow: 0 4px 12px rgba(var(--primary), 0.3);
            }
            .rbc-month-row {
              border-bottom: 1px solid hsl(var(--primary) / 0.05) !important;
            }
            .rbc-day-bg + .rbc-day-bg {
              border-left: 1px solid hsl(var(--primary) / 0.05) !important;
            }
            .rbc-date-cell {
              padding: 12px;
              font-size: 11px;
              font-weight: 900;
              opacity: 0.4;
            }
            .rbc-date-cell.rbc-now {
              opacity: 1;
              color: hsl(var(--primary));
            }
            .rbc-show-more {
              font-size: 9px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: hsl(var(--primary));
              background: transparent;
              margin-left: 4px;
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
