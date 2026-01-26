'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStore } from '@/lib/store';
import { ChevronLeft, ChevronRight, Play, Square, Plus, MoreVertical, ArrowLeft } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { CircularTimer } from '@/components/ui/circular-timer';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TrendingUp, Sparkles, Clock, Target } from 'lucide-react';

export default function CalendarTimeTrackingPage() {
  const { timeEntries, tasks, addTimeEntry, stopTimeEntry, updateTimeEntry, updateTask } = useStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [draggingEntry, setDraggingEntry] = useState<string | null>(null);
  const [resizingEntry, setResizingEntry] = useState<string | null>(null);
  const [draggingTask, setDraggingTask] = useState<string | null>(null);
  const [resizingTask, setResizingTask] = useState<string | null>(null);
  const [dragStartY, setDragStartY] = useState(0);
  const [originalTop, setOriginalTop] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [tempPosition, setTempPosition] = useState<{ [key: string]: number }>({});
  const [tempDuration, setTempDuration] = useState<{ [key: string]: number }>({});
  const [tempTaskPosition, setTempTaskPosition] = useState<{ [key: string]: number }>({});
  const [tempTaskDuration, setTempTaskDuration] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Clear temp states when store updates with new values
  useEffect(() => {
    // Check if store has caught up with temp positions
    Object.keys(tempPosition).forEach(entryId => {
      const entry = timeEntries.find(e => e.id === entryId);
      if (entry && !draggingEntry && !resizingEntry) {
        const startHour = new Date(entry.startTime).getHours();
        const startMinute = new Date(entry.startTime).getMinutes();
        const currentStoreTop = (startHour - 9) * 80 + (startMinute / 60) * 80;
        const tempTop = tempPosition[entryId];

        // If store position matches temp position (within tolerance), clear temp
        if (Math.abs(currentStoreTop - tempTop) < 10) {
          setTempPosition(prev => {
            const { [entryId]: _, ...rest } = prev;
            return rest;
          });
        }
      }
    });

    Object.keys(tempDuration).forEach(entryId => {
      const entry = timeEntries.find(e => e.id === entryId);
      if (entry && !draggingEntry && !resizingEntry) {
        const currentStoreDuration = entry.duration || 0;
        const tempDur = tempDuration[entryId];

        if (Math.abs(currentStoreDuration - tempDur) < 5) {
          setTempDuration(prev => {
            const { [entryId]: _, ...rest } = prev;
            return rest;
          });
        }
      }
    });

    Object.keys(tempTaskPosition).forEach(taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.scheduledStart && !draggingTask && !resizingTask) {
        const taskStart = new Date(task.scheduledStart);
        const taskHour = taskStart.getHours();
        const taskMinute = taskStart.getMinutes();
        const currentStoreTop = (taskHour - 9) * 80 + (taskMinute / 60) * 80;
        const tempTop = tempTaskPosition[taskId];

        if (Math.abs(currentStoreTop - tempTop) < 10) {
          setTempTaskPosition(prev => {
            const { [taskId]: _, ...rest } = prev;
            return rest;
          });
        }
      }
    });

    Object.keys(tempTaskDuration).forEach(taskId => {
      const task = tasks.find(t => t.id === taskId);
      if (task && !draggingTask && !resizingTask) {
        const currentStoreDuration = task.estimatedDuration || 0;
        const tempDur = tempTaskDuration[taskId];

        if (Math.abs(currentStoreDuration - tempDur) < 5) {
          setTempTaskDuration(prev => {
            const { [taskId]: _, ...rest } = prev;
            return rest;
          });
        }
      }
    });
  }, [timeEntries, tasks, tempPosition, tempDuration, tempTaskPosition, tempTaskDuration, draggingEntry, resizingEntry, draggingTask, resizingTask]);

  // Handle drag and resize mouse events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();

      if (draggingEntry) {
        const deltaY = e.clientY - dragStartY;
        const newTop = Math.max(0, Math.min(originalTop + deltaY, 880)); // Limit to calendar bounds
        setTempPosition(prev => ({ ...prev, [draggingEntry]: newTop }));
      } else if (resizingEntry) {
        const deltaY = e.clientY - dragStartY;
        const newHeight = Math.max(20, originalHeight + deltaY);
        const newDuration = Math.round((newHeight / 80) * 60);
        setTempDuration(prev => ({ ...prev, [resizingEntry]: newDuration }));
      } else if (draggingTask) {
        const deltaY = e.clientY - dragStartY;
        const newTop = Math.max(0, Math.min(originalTop + deltaY, 880)); // Limit to calendar bounds
        setTempTaskPosition(prev => ({ ...prev, [draggingTask]: newTop }));
      } else if (resizingTask) {
        const deltaY = e.clientY - dragStartY;
        const newHeight = Math.max(20, originalHeight + deltaY);
        const newDuration = Math.round((newHeight / 80) * 60);
        setTempTaskDuration(prev => ({ ...prev, [resizingTask]: newDuration }));
      }
    };

    const handleMouseUp = () => {
      // Save changes when drag/resize is complete
      if (draggingEntry) {
        const entryId = draggingEntry;
        const newTop = tempPosition[entryId];

        if (newTop !== undefined) {
          const newHour = Math.floor(newTop / 80) + 9;
          const newMinute = Math.floor(((newTop % 80) / 80) * 60);

          const entry = timeEntries.find(e => e.id === entryId);
          if (entry) {
            const newStartTime = new Date(entry.startTime);
            newStartTime.setHours(newHour, newMinute, 0, 0);

            // Update immediately - don't wait
            updateTimeEntry(entryId, { startTime: newStartTime }).catch(err => {
              console.error('Failed to update entry:', err);
              // On error, clear temp state to revert to original
              setTempPosition(prev => {
                const { [entryId]: _, ...rest } = prev;
                return rest;
              });
            });
          }
        }

        setDraggingEntry(null);
        // Keep temp state - it will be used until store updates
      }

      if (resizingEntry) {
        const entryId = resizingEntry;
        const newDuration = tempDuration[entryId];

        if (newDuration !== undefined) {
          updateTimeEntry(entryId, { duration: newDuration }).catch(err => {
            console.error('Failed to update entry:', err);
            setTempDuration(prev => {
              const { [entryId]: _, ...rest } = prev;
              return rest;
            });
          });
        }

        setResizingEntry(null);
      }

      if (draggingTask) {
        const taskId = draggingTask;
        const newTop = tempTaskPosition[taskId];

        if (newTop !== undefined) {
          const newHour = Math.floor(newTop / 80) + 9;
          const newMinute = Math.floor(((newTop % 80) / 80) * 60);

          const task = tasks.find(t => t.id === taskId);
          if (task) {
            const baseDate = task.scheduledStart || task.deadline || new Date();
            const newScheduledStart = new Date(baseDate);
            newScheduledStart.setHours(newHour, newMinute, 0, 0);

            let updates: any = { scheduledStart: newScheduledStart };
            if (task.estimatedDuration) {
              const newScheduledEnd = new Date(newScheduledStart);
              newScheduledEnd.setMinutes(newScheduledEnd.getMinutes() + task.estimatedDuration);
              updates.scheduledEnd = newScheduledEnd;
            }

            updateTask(taskId, updates).catch(err => {
              console.error('Failed to update task:', err);
              setTempTaskPosition(prev => {
                const { [taskId]: _, ...rest } = prev;
                return rest;
              });
            });
          }
        }

        setDraggingTask(null);
      }

      if (resizingTask) {
        const taskId = resizingTask;
        const newDuration = tempTaskDuration[taskId];

        if (newDuration !== undefined) {
          const task = tasks.find(t => t.id === taskId);

          if (task && task.scheduledStart) {
            const newScheduledEnd = new Date(task.scheduledStart);
            newScheduledEnd.setMinutes(newScheduledEnd.getMinutes() + newDuration);
            updateTask(taskId, {
              estimatedDuration: newDuration,
              scheduledEnd: newScheduledEnd
            }).catch(err => {
              console.error('Failed to update task:', err);
              setTempTaskDuration(prev => {
                const { [taskId]: _, ...rest } = prev;
                return rest;
              });
            });
          }
        }

        setResizingTask(null);
      }
    };

    if (draggingEntry || resizingEntry || draggingTask || resizingTask) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingEntry, resizingEntry, draggingTask, resizingTask, dragStartY, originalTop, originalHeight, timeEntries, tasks, updateTimeEntry, updateTask, tempPosition, tempDuration, tempTaskPosition, tempTaskDuration]);

  const runningEntry = timeEntries.find((e) => e.isRunning);

  const getElapsedTime = (startTime: Date) => {
    const elapsed = Math.floor((currentTime.getTime() - new Date(startTime).getTime()) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return { hours, minutes, seconds };
  };

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getTasksForDay = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.deadline) return false;
      return isSameDay(new Date(task.deadline), date);
    });
  };

  const getTimeEntriesForDay = (date: Date) => {
    return timeEntries.filter((entry) => {
      return isSameDay(new Date(entry.startTime), date);
    });
  };

  const elapsed = runningEntry ? getElapsedTime(runningEntry.startTime) : null;

  const timeSlots = Array.from({ length: 12 }, (_, i) => i + 9); // 9 AM to 8 PM

  return (
    <ProtectedRoute>
      <DataLoader>
        <MainLayout>
          <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between px-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/5 text-emerald-500 border-emerald-500/20 px-2 py-0 h-4">Chronos Matrix</Badge>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent italic">
                  Temporal Matrix
                </h1>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1 opacity-70">Visualizing your cognitive allocation cycles</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link href="/time-tracking">
                  <Button variant="outline" className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-background/40 border-primary/10">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Audit Logs
                  </Button>
                </Link>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-background/40 border-primary/10">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Main Grid: Mobile Stacking, Laptop Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-1">
              {/* Left Column: Timer & Today's Preview */}
              <div className="lg:col-span-4 space-y-6">
                {/* Timer Card */}
                <Card className="relative overflow-hidden border-none bg-background/60 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] p-8 group hover:shadow-primary/5 transition-all duration-500">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp className="h-16 w-16 text-primary" />
                  </div>

                  <div className="space-y-8">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      Weekly Aggregate
                    </h3>

                    <div className="flex items-center justify-center py-4">
                      <CircularTimer
                        hours={elapsed?.hours || 0}
                        minutes={elapsed?.minutes || 0}
                        seconds={elapsed?.seconds || 0}
                        totalMinutes={elapsed ? elapsed.hours * 60 + elapsed.minutes : 0}
                        maxMinutes={10080}
                        size={200}
                      />
                    </div>

                    <div className="space-y-4">
                      {runningEntry && (
                        <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-primary/5 border border-primary/10 animate-pulse">
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">{runningEntry.category}</span>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button variant="secondary" className="flex-1 h-11 rounded-xl font-black text-[10px] uppercase tracking-widest border border-primary/5">
                          Filters
                        </Button>
                        <Button variant="secondary" className="h-11 w-11 rounded-xl border border-primary/5">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Tasks Briefing */}
                <Card className="relative overflow-hidden border-none bg-background/60 backdrop-blur-2xl shadow-xl rounded-[2.5rem] p-8 transition-all duration-500 hover:shadow-primary/5">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Strategic Briefing</h3>
                      <p className="text-xl font-black italic">Today&apos;s Targets</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary">
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {getTasksForDay(new Date()).slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="group flex items-center justify-between p-4 rounded-2xl bg-muted/10 border border-transparent hover:border-primary/10 transition-all duration-300"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black truncate mb-1 italic">{task.title}</p>
                          <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest h-4 px-1.5 opacity-50">{task.priority}</Badge>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {getTasksForDay(new Date()).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 opacity-20 grayscale">
                        <Target className="h-8 w-8 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Zero Targets Found</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Right Column: Temporal Calendar */}
              <div className="lg:col-span-8">
                <Card className="relative overflow-hidden border-none bg-background/60 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] h-full transition-all duration-500 hover:shadow-primary/5">
                  <div className="p-4 sm:p-8 space-y-8">
                    {/* Calendar Navigation */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-1">
                      <div className="flex items-center gap-4 bg-muted/10 p-1.5 rounded-2xl border border-primary/5">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-background/40" onClick={() => setSelectedDate(addDays(selectedDate, -7))}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-[11px] font-black uppercase tracking-widest min-w-[140px] text-center italic">
                          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
                        </div>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-background/40" onClick={() => setSelectedDate(addDays(selectedDate, 7))}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full sm:w-auto">
                        <TabsList className="grid grid-cols-3 h-11 bg-muted/10 border border-primary/5 p-1 rounded-2xl">
                          <TabsTrigger value="day" className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">Day</TabsTrigger>
                          <TabsTrigger value="week" className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">Week</TabsTrigger>
                          <TabsTrigger value="month" className="rounded-xl text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm">Month</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    {/* Week View Grid - Mobile Scrollable */}
                    <div className="relative overflow-x-auto pb-4 scrollbar-hide">
                      <div className="min-w-[800px] lg:min-w-0 grid grid-cols-8 gap-px bg-primary/10 rounded-3xl overflow-hidden border border-primary/5 shadow-inner">
                        {/* Time Column */}
                        <div className="bg-background/80">
                          <div className="h-20 border-b border-primary/5" />
                          {timeSlots.map((hour) => (
                            <div key={hour} className="h-24 border-b border-primary/5 flex items-start justify-end pr-4 pt-4">
                              <span className="text-[10px] font-black text-muted-foreground/30 uppercase tabular-nums tracking-widest">{hour}:00</span>
                            </div>
                          ))}
                        </div>

                        {/* Day Columns */}
                        {weekDays.map((day, dayIndex) => {
                          const isToday = isSameDay(day, new Date());
                          const dayTasks = getTasksForDay(day);
                          const dayEntries = getTimeEntriesForDay(day);

                          return (
                            <div key={dayIndex} className={cn(
                              "bg-background/80 transition-colors relative group/col",
                              isToday && "bg-primary/[0.02]"
                            )}>
                              {/* Day Header */}
                              <div className={cn(
                                "h-20 border-b border-primary/5 flex flex-col items-center justify-center transition-all",
                                isToday ? "bg-primary/5" : "group-hover/col:bg-primary/[0.01]"
                              )}>
                                <div className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.2em] mb-1">
                                  {format(day, 'EEE')}
                                </div>
                                <div className={cn(
                                  "text-xl font-black tracking-tighter italic",
                                  isToday ? "text-primary scale-110" : "text-foreground"
                                )}>
                                  {format(day, 'd')}
                                </div>
                              </div>

                              {/* Time Slots Area */}
                              <div className="relative bg-striped h-[1152px]"> {/* 12 slots * 96px (24 * 4) */}
                                {timeSlots.map((hour) => (
                                  <div key={hour} className="h-24 border-b border-primary/[0.02] hover:bg-primary/[0.03] transition-colors" />
                                ))}

                                {/* Task & Entry Canvas */}
                                <div className="absolute inset-0 p-1">
                                  {dayTasks.map((task) => {
                                    if (task.scheduledStart) {
                                      const taskStart = new Date(task.scheduledStart);
                                      const taskHour = taskStart.getHours();
                                      const taskMinute = taskStart.getMinutes();
                                      const baseTaskTop = (taskHour - 9) * 96 + (taskMinute / 60) * 96;
                                      const baseDuration = task.estimatedDuration || 60;

                                      const taskTop = tempTaskPosition[task.id] !== undefined ? tempTaskPosition[task.id] : baseTaskTop;
                                      const duration = tempTaskDuration[task.id] !== undefined ? tempTaskDuration[task.id] : baseDuration;
                                      const height = Math.min((duration / 60) * 96, 400);

                                      return (
                                        <div
                                          key={task.id}
                                          className={cn(
                                            "absolute left-1 right-1 rounded-2xl p-2.5 text-white shadow-lg cursor-move transition-all duration-300 border border-white/10 group/item overflow-hidden",
                                            "bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600",
                                            draggingTask === task.id && "z-50 scale-[1.02] opacity-90 shadow-2xl ring-2 ring-white/20"
                                          )}
                                          style={{
                                            top: `${taskTop}px`,
                                            height: `${height}px`,
                                          }}
                                        >
                                          <div className="font-black text-[10px] uppercase tracking-tight truncate leading-tight italic">{task.title}</div>
                                          <div className="flex items-center gap-1 mt-1.5">
                                            <Badge className="bg-white/10 text-[7px] font-black uppercase tracking-widest border-none h-3 px-1">{task.priority}</Badge>
                                            <span className="text-[8px] font-black opacity-60 tabular-nums">{Math.floor(duration / 60)}H {duration % 60}M</span>
                                          </div>
                                          {/* Resize Handle */}
                                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/20 rounded-full cursor-ns-resize opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}

                                  {dayEntries.map((entry) => {
                                    const startHour = new Date(entry.startTime).getHours();
                                    const startMinute = new Date(entry.startTime).getMinutes();
                                    const baseTopPosition = (startHour - 9) * 96 + (startMinute / 60) * 96;
                                    const baseDuration = entry.duration || 0;

                                    const topPosition = tempPosition[entry.id] !== undefined ? tempPosition[entry.id] : baseTopPosition;
                                    const duration = tempDuration[entry.id] !== undefined ? tempDuration[entry.id] : baseDuration;
                                    const height = duration ? Math.min((duration / 60) * 96, 400) : 48;

                                    return (
                                      <div
                                        key={entry.id}
                                        className={cn(
                                          "absolute left-1.5 right-1.5 rounded-2xl p-2.5 text-white shadow-lg cursor-move transition-all duration-300 border border-white/10 group/item overflow-hidden",
                                          "bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600",
                                          draggingEntry === entry.id && "z-50 scale-[1.02] opacity-90 shadow-2xl ring-2 ring-white/20"
                                        )}
                                        style={{
                                          top: `${topPosition}px`,
                                          height: `${height}px`,
                                        }}
                                      >
                                        <div className="font-black text-[10px] uppercase tracking-tight truncate leading-tight italic">{entry.category}</div>
                                        {duration > 0 && (
                                          <div className="flex items-center gap-1.5 mt-1.5">
                                            <div className="h-1 w-1 rounded-full bg-white/40 animate-pulse" />
                                            <span className="text-[8px] font-black opacity-60 tabular-nums">{Math.floor(duration / 60)}H {duration % 60}M AUDITED</span>
                                          </div>
                                        )}
                                        {/* Resize Handle */}
                                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/20 rounded-full cursor-ns-resize opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute>
  );
}