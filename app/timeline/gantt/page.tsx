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
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Link href="/timeline">
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                    Strategic Gantt
                  </h1>
                  <p className="text-muted-foreground font-medium">Long-term vision and project deadlines</p>
                </div>
              </div>
              <Select value={viewMode} onValueChange={(v: 'month' | 'quarter') => setViewMode(v)}>
                <SelectTrigger className="w-full sm:w-40 h-11 rounded-2xl bg-background/50 backdrop-blur-sm border-primary/10 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="month">Monthly Pulse</SelectItem>
                  <SelectItem value="quarter">Quarterly View</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="p-4 sm:p-6 bg-background/40 backdrop-blur-xl border-primary/5 shadow-xl rounded-3xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-2xl">
                    <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 hover:bg-background shadow-sm" onClick={() => setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : subMonths(currentDate, 3))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" className="rounded-xl h-10 px-6 font-bold hover:bg-background shadow-sm" onClick={() => setCurrentDate(new Date())}>
                      Now
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 hover:bg-background shadow-sm" onClick={() => setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : addMonths(currentDate, 3))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-xl font-black tracking-tighter ml-2 truncate">
                    {format(dateRange.start, 'MMM yyyy')}
                    {viewMode === 'quarter' && <span className="text-primary/40 mx-2">—</span>}
                    {viewMode === 'quarter' && format(dateRange.end, 'MMM yyyy')}
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto bg-muted/50 p-1 rounded-2xl">
                  <Filter className="h-4 w-4 text-primary ml-3" />
                  <Select value={selectedProjectId || '__all__'} onValueChange={(v) => setSelectedProjectId(v === '__all__' ? undefined : v)}>
                    <SelectTrigger className="w-full sm:w-64 h-10 rounded-xl bg-background shadow-sm border-transparent font-bold">
                      <SelectValue placeholder="Universal Focus" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="__all__">Universal Focus</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                      ))}
                      <SelectItem value="__none__">Private / Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="bg-background/40 backdrop-blur-xl border-primary/5 shadow-xl rounded-3xl overflow-hidden group">
              <CardContent className="p-6 overflow-x-auto custom-scrollbar">
                <div className="min-w-[1000px]">
                  {/* Legend */}
                  <div className="flex items-center gap-8 mb-8 pb-4 border-b border-primary/5">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 rounded-full bg-slate-400/30" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Planned / To Do</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Focus</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Successfully Completed</span>
                    </div>
                  </div>

                  <div className="flex border-b border-primary/10">
                    <div className="w-56 shrink-0 p-4 font-black uppercase tracking-widest text-[10px] text-muted-foreground sticky left-0 bg-background/90 backdrop-blur-md z-20">Strategic Objectives</div>
                    <div className="flex-1 flex">
                      {days.map((day, index) => {
                        const isDayToday = isSameDay(day, new Date());
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        return (
                          <div
                            key={index}
                            className={`flex-1 min-w-[32px] text-center p-3 text-[10px] font-black border-r border-primary/5 transition-colors ${isDayToday ? 'bg-primary/10 text-primary' : isWeekend ? 'bg-muted/30 text-muted-foreground/40' : 'text-muted-foreground/60'
                              }`}
                          >
                            <div className="mb-1">{format(day, 'EEE')[0]}</div>
                            <div>{format(day, 'd')}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {Object.keys(tasksByProject).length === 0 ? (
                    <div className="p-20 text-center opacity-30">
                      <Calendar className="h-16 w-16 mx-auto mb-4" />
                      <p className="font-black uppercase tracking-widest">Horizon is clear</p>
                    </div>
                  ) : (
                    Object.entries(tasksByProject).map(([projectId, projectTasks]) => {
                      const project = getProject(projectId);
                      return (
                        <div key={projectId} className="border-b border-primary/5">
                          <div className="flex items-center bg-primary/5 hover:bg-primary/10 transition-colors">
                            <div className="w-full p-3 pl-4 font-black text-xs uppercase tracking-widest flex items-center gap-3">
                              {project ? (
                                <>
                                  <div className="h-3 w-3 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: project.color, color: project.color }} />
                                  <span>{project.name}</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">Private Workspace</span>
                              )}
                              <Badge variant="outline" className="text-[9px] font-black ml-auto bg-background/50 border-transparent">{projectTasks.length} Tasks</Badge>
                            </div>
                          </div>
                          {projectTasks.map((task) => {
                            const dayPosition = getTaskPosition(task.deadline!);
                            return (
                              <div key={task.id} className="flex items-center hover:bg-primary/5 group/row transition-all">
                                <div className="w-56 shrink-0 p-3 sticky left-0 bg-background/90 backdrop-blur-md z-20 border-r border-primary/5">
                                  <div className="flex items-center gap-3">
                                    <div className={`shrink-0 h-8 w-8 rounded-xl flex items-center justify-center transition-all ${task.status === 'done' ? 'bg-emerald-500/10 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-muted group-hover/row:bg-primary/10 group-hover/row:text-primary'}`}>
                                      {task.status === 'done' ? (
                                        <CheckCircle2 className="h-5 w-5" />
                                      ) : (
                                        <Circle className="h-5 w-5 opacity-40 group-hover/row:opacity-100" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-xs font-bold truncate block group-hover/row:text-primary transition-colors">{task.title}</span>
                                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">{task.priority} Priority</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-1 flex relative h-14 group">
                                  {days.map((day, index) => (
                                    <div key={index} className={`flex-1 min-w-[32px] border-r border-primary/5 transition-colors ${isSameDay(day, new Date()) ? 'bg-primary/5' : ''}`} />
                                  ))}
                                  {dayPosition >= 0 && dayPosition < days.length && (
                                    <div
                                      className="absolute top-1/2 -translate-y-1/2 transition-transform group-hover:scale-y-110 duration-300"
                                      style={{
                                        left: `${(dayPosition / days.length) * 100}%`,
                                        width: `${(1 / days.length) * 100}%`,
                                      }}
                                    >
                                      <div className={`mx-1 h-8 rounded-xl border-2 shadow-lg transition-shadow group-hover:shadow-primary/30 ${getPriorityColor(task.priority)} ${getStatusColor(task.status)}`} />
                                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/row:opacity-100 transition-opacity bg-background border border-primary/20 px-2 py-0.5 rounded-lg text-[8px] font-black whitespace-nowrap pointer-events-none shadow-2xl z-50">
                                        DEADLINE: {format(new Date(task.deadline!), 'MMM d')}
                                      </div>
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
