'use client';

import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/store';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays, addMonths, subMonths, isSameDay, isWithinInterval } from 'date-fns';

export default function GanttViewPage() {
  const { tasks, projects } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<'month' | 'quarter'>('month');

  const dateRange = useMemo(() => {
    if (viewMode === 'month') {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      };
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(addMonths(currentDate, 2));
      return { start, end };
    }
  }, [currentDate, viewMode]);

  const days = eachDayOfInterval(dateRange);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!task.deadline) return false;
      if (selectedProjectId && task.projectId !== selectedProjectId) return false;

      const taskDate = new Date(task.deadline);
      return isWithinInterval(taskDate, dateRange);
    });
  }, [tasks, selectedProjectId, dateRange]);

  const tasksByProject = useMemo(() => {
    const grouped: Record<string, typeof tasks> = {};

    filteredTasks.forEach((task) => {
      const projectId = task.projectId || '__none__';
      if (!grouped[projectId]) {
        grouped[projectId] = [];
      }
      grouped[projectId].push(task);
    });

    return grouped;
  }, [filteredTasks]);

  const getProject = (projectId: string) => {
    if (projectId === '__none__') return null;
    return projects.find((p) => p.id === projectId);
  };

  const getTaskPosition = (deadline: Date) => {
    return differenceInDays(new Date(deadline), dateRange.start);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500';
      case 'medium': return 'border-yellow-500';
      default: return 'border-gray-300';
    }
  };

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/timeline">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Gantt Timeline</h1>
                  <p className="text-muted-foreground">Visual project timeline</p>
                </div>
              </div>
              <Select value={viewMode} onValueChange={(v: 'month' | 'quarter') => setViewMode(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : subMonths(currentDate, 3))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                      Today
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : addMonths(currentDate, 3))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-lg font-semibold">
                    {format(dateRange.start, 'MMM yyyy')}
                    {viewMode === 'quarter' && ` - ${format(dateRange.end, 'MMM yyyy')}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedProjectId || '__all__'} onValueChange={(v) => setSelectedProjectId(v === '__all__' ? undefined : v)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Projects</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                      ))}
                      <SelectItem value="__none__">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-6 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4 text-gray-400" />
                  <span className="text-muted-foreground">To Do</span>
                </div>
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">Completed</span>
                </div>
              </div>
            </Card>

            <Card>
              <CardContent className="p-6 overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className="flex border-b">
                    <div className="w-48 shrink-0 p-2 font-semibold sticky left-0 bg-background z-10">Task</div>
                    <div className="flex-1 flex">
                      {days.map((day, index) => {
                        const isToday = isSameDay(day, new Date());
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        return (
                          <div
                            key={index}
                            className={`flex-1 min-w-[40px] text-center p-2 text-xs border-r ${isToday ? 'bg-primary/10 font-bold' : ''
                              } ${isWeekend ? 'bg-muted/50' : ''}`}
                          >
                            <div className={isToday ? 'text-primary' : 'text-muted-foreground'}>
                              {format(day, 'd')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {Object.keys(tasksByProject).length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No tasks in this period</p>
                    </div>
                  ) : (
                    Object.entries(tasksByProject).map(([projectId, projectTasks]) => {
                      const project = getProject(projectId);
                      return (
                        <div key={projectId} className="border-b">
                          <div className="flex items-center bg-muted/30">
                            <div className="w-48 shrink-0 p-3 font-medium flex items-center gap-2">
                              {project ? (
                                <>
                                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                                  <span>{project.name}</span>
                                </>
                              ) : (
                                <span>Personal</span>
                              )}
                            </div>
                          </div>
                          {projectTasks.map((task) => {
                            const dayPosition = getTaskPosition(task.deadline!);
                            return (
                              <div key={task.id} className="flex items-center hover:bg-accent/50">
                                <div className="w-48 shrink-0 p-2">
                                  <div className="flex items-center gap-2">
                                    {task.status === 'done' ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-gray-400" />
                                    )}
                                    <span className="text-sm truncate">{task.title}</span>
                                  </div>
                                </div>
                                <div className="flex-1 flex relative h-12">
                                  {days.map((day, index) => (
                                    <div key={index} className="flex-1 min-w-[40px] border-r" />
                                  ))}
                                  {dayPosition >= 0 && dayPosition < days.length && (
                                    <div
                                      className="absolute top-1/2 -translate-y-1/2"
                                      style={{
                                        left: `${(dayPosition / days.length) * 100}%`,
                                        width: `${(1 / days.length) * 100}%`,
                                      }}
                                    >
                                      <div className={`mx-1 h-6 rounded border-2 ${getPriorityColor(task.priority)} ${getStatusColor(task.status)}`} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute>
  );
}
