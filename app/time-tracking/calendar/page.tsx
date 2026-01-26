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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendar View</h1>
            <p className="text-muted-foreground">Manage your time with calendar view</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/time-tracking">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to List
              </Button>
            </Link>
            <Button variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Timer Card */}
          <Card className="lg:col-span-1 bg-gradient-to-br from-gray-400 to-gray-500 dark:from-gray-700 dark:to-gray-800 text-white border-0">
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold opacity-90">Total week</h3>
                <div className="flex items-center justify-center">
                  <CircularTimer
                    hours={elapsed?.hours || 0}
                    minutes={elapsed?.minutes || 0}
                    seconds={elapsed?.seconds || 0}
                    totalMinutes={elapsed ? elapsed.hours * 60 + elapsed.minutes : 0}
                    maxMinutes={10080}
                    size={192}
                  />
                </div>
                {runningEntry && (
                  <div className="text-center text-sm opacity-90">
                    {runningEntry.category}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1">
                    Filters
                  </Button>
                  <Button variant="secondary" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks for Today */}
          <Card className="lg:col-span-2 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Tasks for today</h3>
                <Button size="icon" variant="ghost">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <div className="space-y-3">
                {getTasksForDay(new Date()).slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-lg p-3 flex items-center justify-between"
                  >
                    <span className="font-medium">{task.title}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{task.status}</Badge>
                      <Button size="icon" variant="ghost">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {getTasksForDay(new Date()).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tasks scheduled for today
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar View */}
        <Card>
          <CardContent className="p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, -7))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="font-semibold">
                  {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 7))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <TabsList>
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="month">Month</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Week View */}
            <div className="grid grid-cols-8 gap-px bg-border rounded-lg overflow-hidden">
              {/* Time Column */}
              <div className="bg-background">
                <div className="h-16 border-b" />
                {timeSlots.map((hour) => (
                  <div key={hour} className="h-20 border-b flex items-start justify-end pr-2 pt-1">
                    <span className="text-xs text-muted-foreground">{hour}:00</span>
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {weekDays.map((day, dayIndex) => {
                const isToday = isSameDay(day, new Date());
                const dayTasks = getTasksForDay(day);
                const dayEntries = getTimeEntriesForDay(day);

                return (
                  <div key={dayIndex} className="bg-background">
                    {/* Day Header */}
                    <div className={`h-16 border-b flex flex-col items-center justify-center ${isToday ? 'bg-primary/10' : ''}`}>
                      <div className="text-xs text-muted-foreground uppercase">
                        {format(day, 'EEE')}
                      </div>
                      <div className={`text-2xl font-semibold ${isToday ? 'text-primary' : ''}`}>
                        {format(day, 'd')}
                      </div>
                    </div>

                    {/* Time Slots */}
                    <div className="relative">
                      {timeSlots.map((hour) => (
                        <div key={hour} className="h-20 border-b hover:bg-accent/50 transition-colors" />
                      ))}

                      {/* Task Cards */}
                      <div className="absolute inset-0 p-1">
                        {dayTasks.map((task, idx) => {
                          // Check if task has scheduled time
                          const hasScheduledTime = !!task.scheduledStart;
                          
                          if (hasScheduledTime) {
                            // Scheduled task - position by time and make draggable/resizable
                            const taskStart = new Date(task.scheduledStart!);
                            const taskHour = taskStart.getHours();
                            const taskMinute = taskStart.getMinutes();
                            const baseTaskTop = (taskHour - 9) * 80 + (taskMinute / 60) * 80;
                            
                            const baseDuration = task.estimatedDuration || 60;
                            const baseHeight = Math.min((baseDuration / 60) * 80, 400);
                            
                            // Use temporary position/duration while dragging/resizing OR if temp state exists
                            const taskTop = tempTaskPosition[task.id] !== undefined ? tempTaskPosition[task.id] : baseTaskTop;
                            const duration = tempTaskDuration[task.id] !== undefined ? tempTaskDuration[task.id] : baseDuration;
                            const height = Math.min((duration / 60) * 80, 400);
                            
                            const handleTaskMouseDown = (e: React.MouseEvent) => {
                              if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
                              e.preventDefault();
                              e.stopPropagation();
                              setDraggingTask(task.id);
                              setDragStartY(e.clientY);
                              setOriginalTop(taskTop); // Use current position, not base
                              // Initialize temp position
                              setTempTaskPosition(prev => ({ ...prev, [task.id]: taskTop }));
                            };
                            
                            const handleTaskResizeStart = (e: React.MouseEvent) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setResizingTask(task.id);
                              setDragStartY(e.clientY);
                              setOriginalHeight(height); // Use current height, not base
                              // Initialize temp duration
                              setTempTaskDuration(prev => ({ ...prev, [task.id]: duration }));
                            };
                            
                            return (
                              <div
                                key={task.id}
                                className={`bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded p-2 text-xs shadow-sm cursor-move transition-shadow hover:shadow-lg select-none ${
                                  draggingTask === task.id || resizingTask === task.id ? 'opacity-75 shadow-xl' : ''
                                }`}
                                style={{
                                  top: `${taskTop}px`,
                                  height: `${height}px`,
                                  position: 'absolute',
                                  left: '4px',
                                  right: '4px',
                                  zIndex: draggingTask === task.id || resizingTask === task.id ? 50 : 5,
                                }}
                                onMouseDown={handleTaskMouseDown}
                              >
                                <div className="font-semibold truncate">{task.title}</div>
                                <div className="flex items-center gap-1 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {task.priority}
                                  </Badge>
                                </div>
                                {duration > 0 && (
                                  <div className="text-xs mt-1 opacity-90">
                                    {Math.floor(duration / 60)}h {duration % 60}m
                                  </div>
                                )}
                                {/* Resize Handle */}
                                <div
                                  className="resize-handle absolute bottom-0 left-0 right-0 h-2 bg-white/20 cursor-ns-resize hover:bg-white/40 rounded-b"
                                  onMouseDown={handleTaskResizeStart}
                                />
                              </div>
                            );
                          } else {
                            // Unscheduled task - show at top
                            return (
                              <div
                                key={task.id}
                                className="bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded p-2 text-xs shadow-sm mb-1"
                                style={{
                                  position: 'relative',
                                }}
                              >
                                <div className="font-semibold truncate">{task.title}</div>
                                <div className="flex items-center gap-1 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {task.priority}
                                  </Badge>
                                </div>
                              </div>
                            );
                          }
                        })}

                        {/* Time Entries */}
                        {dayEntries.map((entry, idx) => {
                          const startHour = new Date(entry.startTime).getHours();
                          const startMinute = new Date(entry.startTime).getMinutes();
                          const baseTopPosition = (startHour - 9) * 80 + (startMinute / 60) * 80;
                          const baseDuration = entry.duration || 0;
                          const baseHeight = baseDuration ? Math.min((baseDuration / 60) * 80, 400) : 40;
                          
                          // Use temporary position/duration while dragging/resizing OR if temp state exists
                          const topPosition = tempPosition[entry.id] !== undefined ? tempPosition[entry.id] : baseTopPosition;
                          const duration = tempDuration[entry.id] !== undefined ? tempDuration[entry.id] : baseDuration;
                          const height = duration ? Math.min((duration / 60) * 80, 400) : baseHeight;

                          const handleMouseDown = (e: React.MouseEvent) => {
                            if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
                            e.preventDefault();
                            e.stopPropagation();
                            setDraggingEntry(entry.id);
                            setDragStartY(e.clientY);
                            setOriginalTop(topPosition); // Use current position, not base
                            // Initialize temp position
                            setTempPosition(prev => ({ ...prev, [entry.id]: topPosition }));
                          };

                          const handleResizeStart = (e: React.MouseEvent) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setResizingEntry(entry.id);
                            setDragStartY(e.clientY);
                            setOriginalHeight(height); // Use current height, not base
                            // Initialize temp duration
                            setTempDuration(prev => ({ ...prev, [entry.id]: duration }));
                          };

                          return (
                            <div
                              key={entry.id}
                              className={`bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded p-2 text-xs shadow-sm cursor-move transition-shadow hover:shadow-lg select-none ${
                                draggingEntry === entry.id || resizingEntry === entry.id ? 'opacity-75 shadow-xl' : ''
                              }`}
                              style={{
                                top: `${topPosition}px`,
                                height: `${height}px`,
                                position: 'absolute',
                                left: '4px',
                                right: '4px',
                                zIndex: draggingEntry === entry.id || resizingEntry === entry.id ? 50 : 10,
                              }}
                              onMouseDown={handleMouseDown}
                            >
                              <div className="font-semibold truncate">{entry.category}</div>
                              {entry.description && (
                                <div className="text-xs opacity-90 truncate">{entry.description}</div>
                              )}
                              {duration > 0 && (
                                <div className="text-xs mt-1">
                                  {Math.floor(duration / 60)}h {duration % 60}m
                                </div>
                              )}
                              {/* Resize Handle */}
                              <div
                                className="resize-handle absolute bottom-0 left-0 right-0 h-2 bg-white/20 cursor-ns-resize hover:bg-white/40 rounded-b"
                                onMouseDown={handleResizeStart}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
        </MainLayout>
      </DataLoader>
    </ProtectedRoute>
  );
}