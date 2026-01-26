'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStore } from '@/lib/store';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Calendar,
  ArrowLeft,
  CheckSquare,
  Target,
  Clock
} from 'lucide-react';
import { 
  format, 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  isSameDay,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths
} from 'date-fns';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';

export default function GanttTimelinePage() {
  const router = useRouter();
  const { tasks, goals, timeEntries } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'quarter'>('week');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Calculate date range based on view mode
  const getDateRange = () => {
    switch (viewMode) {
      case 'day':
        return {
          start: currentDate,
          end: currentDate,
        };
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
      case 'month':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
      case 'quarter':
        const quarterStart = new Date(currentDate.getFullYear(), Math.floor(currentDate.getMonth() / 3) * 3, 1);
        const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
        return { start: quarterStart, end: quarterEnd };
      default:
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
    }
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  
  // For day view, create hourly columns (24 hours)
  const hours = viewMode === 'day' ? Array.from({ length: 24 }, (_, i) => i) : [];

  // Prepare timeline items
  const timelineItems = [
    ...tasks
      .filter((task) => task.deadline)
      .map((task) => ({
        id: task.id,
        type: 'task' as const,
        title: task.title,
        startDate: task.createdAt,
        endDate: task.deadline!,
        status: task.status,
        priority: task.priority,
        color: task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-orange-500' : 'bg-blue-500',
      })),
    ...goals.map((goal) => ({
      id: goal.id,
      type: 'goal' as const,
      title: goal.title,
      startDate: goal.createdAt,
      endDate: goal.targetDate || new Date(goal.createdAt.getTime() + 90 * 24 * 60 * 60 * 1000),
      progress: goal.progress,
      color: 'bg-emerald-500',
    })),
  ];

  // Calculate bar position and width
  const getBarStyle = (startDate: Date, endDate: Date) => {
    const totalDays = days.length;
    const startDay = differenceInDays(new Date(startDate), rangeStart);
    const duration = differenceInDays(new Date(endDate), new Date(startDate)) + 1;
    
    const left = Math.max(0, (startDay / totalDays) * 100);
    const width = Math.min(100 - left, (duration / totalDays) * 100);
    
    return {
      left: `${left}%`,
      width: `${width}%`,
    };
  };

  const navigatePrevious = () => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, -1));
    } else if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 3));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 3));
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
      case 'goal':
        return <Target className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Timeline - Gantt View</h1>
            <p className="text-muted-foreground">Visualize your tasks and goals over time</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/timeline">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Activity View
              </Button>
            </Link>
          </div>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={navigatePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={navigateNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="ml-4 font-semibold">
                  {viewMode === 'day' && format(currentDate, 'EEEE, MMMM d, yyyy')}
                  {viewMode === 'week' && `${format(rangeStart, 'MMM d')} - ${format(rangeEnd, 'MMM d, yyyy')}`}
                  {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
                  {viewMode === 'quarter' && `Q${Math.floor(currentDate.getMonth() / 3) + 1} ${currentDate.getFullYear()}`}
                </div>
              </div>

              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <TabsList>
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="quarter">Quarter</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Gantt Chart */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header Row */}
                <div className="grid grid-cols-[250px_1fr] border-b bg-muted/50">
                  <div className="p-3 font-semibold border-r">Item</div>
                  {viewMode === 'day' ? (
                    <div className="grid" style={{ gridTemplateColumns: `repeat(${hours.length}, 1fr)` }}>
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className="p-2 text-center text-xs border-r"
                        >
                          <div className="font-medium">
                            {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                      {days.map((day, idx) => {
                        const isToday = isSameDay(day, new Date());
                        return (
                          <div
                            key={idx}
                            className={`p-2 text-center text-xs border-r ${
                              isToday ? 'bg-primary/10 font-semibold' : ''
                            }`}
                          >
                            <div>{format(day, 'EEE')}</div>
                            <div className={isToday ? 'text-primary' : 'text-muted-foreground'}>
                              {format(day, 'd')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Timeline Items */}
                <div className="divide-y">
                  {timelineItems.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      No items with deadlines to display in timeline
                    </div>
                  ) : (
                    timelineItems.map((item) => (
                      <div
                        key={item.id}
                        className={`grid grid-cols-[250px_1fr] hover:bg-accent/50 transition-colors ${
                          selectedItem === item.id ? 'bg-accent' : ''
                        }`}
                        onClick={() => {
                          setSelectedItem(item.id);
                          if (item.type === 'task') {
                            router.push(`/tasks/${item.id}?fromView=time-tracking-gantt`);
                          }
                        }}
                      >
                        {/* Item Info */}
                        <div className="p-3 border-r flex items-center gap-2">
                          <div className={`p-1 rounded ${item.color} text-white`}>
                            {getTypeIcon(item.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{item.title}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs capitalize">
                                {item.type}
                              </Badge>
                              {item.type === 'task' && (
                                <Badge
                                  variant={item.status === 'done' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {item.status}
                                </Badge>
                              )}
                              {item.type === 'goal' && (
                                <span className="text-xs text-muted-foreground">
                                  {item.progress}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Timeline Bar */}
                        <div className="relative h-16 border-r">
                          {/* Grid lines */}
                          {viewMode === 'day' ? (
                            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${hours.length}, 1fr)` }}>
                              {hours.map((hour) => (
                                <div key={hour} className="border-r" />
                              ))}
                            </div>
                          ) : (
                            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
                              {days.map((_, idx) => (
                                <div key={idx} className="border-r" />
                              ))}
                            </div>
                          )}

                          {/* Current hour indicator (for day view) */}
                          {viewMode === 'day' && isSameDay(currentDate, new Date()) && (
                            <div
                              className="absolute top-0 bottom-0 w-px bg-primary z-10"
                              style={{ left: `${(new Date().getHours() / 24) * 100}%` }}
                            />
                          )}

                          {/* Today indicator (for other views) */}
                          {viewMode !== 'day' && days.map((day, idx) => {
                            if (isSameDay(day, new Date())) {
                              return (
                                <div
                                  key={idx}
                                  className="absolute top-0 bottom-0 w-px bg-primary z-10"
                                  style={{ left: `${(idx / days.length) * 100}%` }}
                                />
                              );
                            }
                            return null;
                          })}

                          {/* Progress Bar */}
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 h-8 ${item.color} rounded-md shadow-sm cursor-pointer hover:shadow-md transition-shadow flex items-center px-2`}
                            style={getBarStyle(item.startDate, item.endDate)}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.type === 'task') {
                                router.push(`/tasks/${item.id}?fromView=time-tracking-gantt`);
                              }
                            }}
                          >
                            <div className="text-white text-xs font-medium truncate">
                              {item.title}
                            </div>
                            {item.type === 'goal' && (
                              <div
                                className="absolute inset-0 bg-white/30 rounded-md"
                                style={{ width: `${item.progress}%` }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-6 text-sm">
              <div className="font-semibold">Legend:</div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded" />
                <span>High Priority Task</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded" />
                <span>Medium Priority Task</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded" />
                <span>Low Priority Task</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500 rounded" />
                <span>Goal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-px h-4 bg-primary" />
                <span>Today</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute>
  );
}
