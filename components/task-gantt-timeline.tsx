'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Task, Goal } from '@/types';
import { format, startOfDay, addHours, isSameDay, parseISO, differenceInMinutes } from 'date-fns';
import { Clock, CheckCircle2, Circle, AlertCircle, ChevronDown, ChevronRight, Filter, Target, TrendingUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface TaskGanttTimelineProps {
  tasks: Task[];
  goals: Goal[];
  selectedDate: Date;
}

interface GroupedTasks {
  goalId: string | null;
  goalTitle: string;
  goalColor: string;
  tasks: Task[];
  totalDuration: number;
  completedDuration: number;
  progress: number;
}

export function TaskGanttTimeline({ tasks, goals, selectedDate }: TaskGanttTimelineProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set(['ungrouped', ...goals.map(g => g.id)]));
  const [filters, setFilters] = useState({
    goalId: 'all',
    status: 'all',
    priority: 'all',
    showStats: true,
  });
  
  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  
  // Generate time slots (24 hours)
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const time = addHours(startOfDay(selectedDate), i);
    return {
      hour: i,
      time,
      label: format(time, 'HH:mm')
    };
  });
  
  // Filter tasks for selected date
  const dayTasks = tasks
    .filter(task => {
      const taskDate = task.scheduledStart || task.deadline;
      if (!taskDate) return false;
      const date = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
      if (!isSameDay(date, selectedDate)) return false;
      
      // Apply filters
      if (filters.goalId !== 'all' && task.goalId !== filters.goalId) return false;
      if (filters.status !== 'all' && task.status !== filters.status) return false;
      if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
      
      return true;
    })
    .sort((a, b) => {
      const dateA = a.scheduledStart || a.deadline;
      const dateB = b.scheduledStart || b.deadline;
      if (!dateA || !dateB) return 0;
      const timeA = typeof dateA === 'string' ? parseISO(dateA) : dateA;
      const timeB = typeof dateB === 'string' ? parseISO(dateB) : dateB;
      return timeA.getTime() - timeB.getTime();
    });
  
  // Group tasks by goal
  const groupedTasks: GroupedTasks[] = [];
  
  // Add ungrouped tasks
  const ungroupedTasks = dayTasks.filter(t => !t.goalId);
  if (ungroupedTasks.length > 0) {
    const totalDuration = ungroupedTasks.reduce((sum, t) => sum + (t.estimatedDuration || 60), 0);
    const completedDuration = ungroupedTasks
      .filter(t => t.status === 'done')
      .reduce((sum, t) => sum + (t.estimatedDuration || 60), 0);
    
    groupedTasks.push({
      goalId: null,
      goalTitle: 'Ungrouped Tasks',
      goalColor: '#64748b',
      tasks: ungroupedTasks,
      totalDuration,
      completedDuration,
      progress: totalDuration > 0 ? (completedDuration / totalDuration) * 100 : 0,
    });
  }
  
  // Add tasks grouped by goal
  goals.forEach(goal => {
    const goalTasks = dayTasks.filter(t => t.goalId === goal.id);
    if (goalTasks.length > 0) {
      const totalDuration = goalTasks.reduce((sum, t) => sum + (t.estimatedDuration || 60), 0);
      const completedDuration = goalTasks
        .filter(t => t.status === 'done')
        .reduce((sum, t) => sum + (t.estimatedDuration || 60), 0);
      
      groupedTasks.push({
        goalId: goal.id,
        goalTitle: goal.title,
        goalColor: getGoalColor(goal.id),
        tasks: goalTasks,
        totalDuration,
        completedDuration,
        progress: totalDuration > 0 ? (completedDuration / totalDuration) * 100 : 0,
      });
    }
  });
  
  // Get task position and height based on time
  const getTaskStyle = (task: Task) => {
    const taskDate = task.scheduledStart || task.deadline;
    if (!taskDate) return { top: 0, height: 60, left: 0, width: 100 };
    
    const date = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    // Each hour slot is 80px, calculate position
    const top = (hours * 80) + (minutes / 60 * 80);
    
    // Calculate width based on duration
    let height = 60;
    if (task.estimatedDuration) {
      height = Math.max(40, (task.estimatedDuration / 60) * 80);
    } else if (task.scheduledEnd) {
      const endDate = typeof task.scheduledEnd === 'string' ? parseISO(task.scheduledEnd) : task.scheduledEnd;
      const durationMinutes = (endDate.getTime() - date.getTime()) / 60000;
      height = Math.max(40, (durationMinutes / 60) * 80);
    }
    
    return { top, height };
  };
  
  // Get current time indicator position
  const getCurrentTimePosition = () => {
    if (!isSameDay(currentTime, selectedDate)) return null;
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return (hours * 80) + (minutes / 60 * 80);
  };
  
  const currentTimePosition = getCurrentTimePosition();
  
  // Toggle goal expansion
  const toggleGoal = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };
  
  // Get goal color
  function getGoalColor(goalId: string): string {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
    const index = goals.findIndex(g => g.id === goalId);
    return colors[index % colors.length];
  }
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'border-green-500 bg-green-500/10 dark:bg-green-500/20';
      case 'in-progress':
        return 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/20';
      default:
        return 'border-border bg-muted/50';
    }
  };
  
  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50';
    }
  };
  
  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-lg">Filters & Options</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="showStats"
                checked={filters.showStats}
                onCheckedChange={(checked) => setFilters({ ...filters, showStats: !!checked })}
              />
              <label htmlFor="showStats" className="text-sm text-muted-foreground cursor-pointer">
                Show Statistics
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Goal</label>
              <Select value={filters.goalId} onValueChange={(value) => setFilters({ ...filters, goalId: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Goals</SelectItem>
                  {goals.map(goal => (
                    <SelectItem key={goal.id} value={goal.id}>{goal.title}</SelectItem>
                  ))}
                  <SelectItem value="ungrouped">Ungrouped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Priority</label>
              <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Gantt Timeline */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex">
            {/* Left sidebar - Goal hierarchy */}
            <div className="w-80 bg-muted/30 border-r border-border flex-shrink-0 overflow-y-auto scrollbar-thin" style={{ maxHeight: '600px' }}>
              {groupedTasks.map((group) => {
                const isExpanded = expandedGoals.has(group.goalId || 'ungrouped');
                const groupId = group.goalId || 'ungrouped';
                
                return (
                  <div key={groupId} className="border-b border-border">
                    {/* Goal Header */}
                    <div
                      className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => toggleGoal(groupId)}
                    >
                      <div className="flex items-start gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-accent"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: group.goalColor }}
                            />
                            <h3 className="text-sm font-semibold truncate">
                              {group.goalTitle}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {group.tasks.length}
                            </Badge>
                          </div>
                          
                          {filters.showStats && (
                            <div className="space-y-2 text-xs text-muted-foreground">
                              <div className="flex items-center justify-between">
                                <span>Total Time:</span>
                                <span className="font-medium">
                                  {formatDuration(group.totalDuration)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Completed:</span>
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                  {formatDuration(group.completedDuration)}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span>Progress:</span>
                                  <span className="font-medium">
                                    {Math.round(group.progress)}%
                                  </span>
                                </div>
                                <div className="w-full bg-secondary rounded-full h-1.5">
                                  <div
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full transition-all"
                                    style={{ width: `${group.progress}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Tasks under goal */}
                    {isExpanded && (
                      <div className="bg-muted/20">
                        {group.tasks.map((task, index) => (
                          <div
                            key={task.id}
                            className="px-4 py-3 border-t border-border/50 hover:bg-accent/30 transition-colors cursor-pointer"
                            onClick={() => router.push(`/tasks/${task.id}?fromView=timeline`)}
                          >
                            <div className="flex items-start gap-2 ml-9">
                              {task.status === 'done' ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                              ) : task.status === 'in-progress' ? (
                                <Circle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                              ) : (
                                <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{task.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    {(() => {
                                      const taskDate = task.scheduledStart || task.deadline;
                                      if (!taskDate) return 'No time';
                                      const date = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
                                      return format(date, 'HH:mm');
                                    })()}
                                  </span>
                                  {task.estimatedDuration && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                                      {formatDuration(task.estimatedDuration)}
                                    </Badge>
                                  )}
                                  {task.priority && (
                                    <Badge variant="outline" className={`text-xs px-1.5 py-0 ${getPriorityColor(task.priority)}`}>
                                      {task.priority}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {groupedTasks.length === 0 && (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">No tasks for this day</p>
                </div>
              )}
            </div>
            
            {/* Right side - Timeline grid */}
            <div className="flex-1 relative" style={{ minHeight: '600px', maxHeight: '600px' }}>
              {/* Time labels header */}
              <div className="sticky top-0 z-10 bg-background border-b border-border flex">
                {timeSlots.map((slot) => (
                  <div
                    key={slot.hour}
                    className="flex-1 min-w-[60px] border-r border-border/50 p-2 text-center"
                  >
                    <span className="text-xs text-muted-foreground font-medium">{slot.label}</span>
                  </div>
                ))}
              </div>
              
              {/* Timeline content */}
              <div className="relative overflow-y-auto scrollbar-thin" style={{ height: 'calc(600px - 40px)' }}>
                {/* Hour grid */}
                <div className="flex">
                  {timeSlots.map((slot) => (
                    <div
                      key={slot.hour}
                      className="flex-1 min-w-[60px] border-r border-border/30"
                      style={{ height: '80px' }}
                    />
                  ))}
                </div>
                
                {/* Current time indicator */}
                {currentTimePosition !== null && (
                  <div
                    className="absolute top-0 bottom-0 z-20 pointer-events-none"
                    style={{ left: `${(currentTimePosition / (24 * 80)) * 100}%` }}
                  >
                    <div className="h-full w-0.5 bg-blue-500 relative">
                      <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-blue-500" />
                    </div>
                  </div>
                )}
                
                {/* Task bars grouped by goal */}
                {groupedTasks.map((group, groupIndex) => {
                  const isExpanded = expandedGoals.has(group.goalId || 'ungrouped');
                  if (!isExpanded) return null;
                  
                  return (
                    <div key={group.goalId || 'ungrouped'} className="relative" style={{ height: `${group.tasks.length * 60}px` }}>
                      {group.tasks.map((task, taskIndex) => {
                        const style = getTaskStyle(task);
                        const taskDate = task.scheduledStart || task.deadline;
                        if (!taskDate) return null;
                        
                        const date = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
                        const hours = date.getHours();
                        const minutes = date.getMinutes();
                        const leftPercent = ((hours + minutes / 60) / 24) * 100;
                        const widthPercent = ((style.height / 80) / 24) * 100;
                        
                        return (
                          <div
                            key={task.id}
                            className={`absolute rounded-lg border-l-4 p-2 transition-all hover:shadow-lg hover:z-30 cursor-pointer backdrop-blur-sm ${getStatusColor(task.status)}`}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                              top: `${taskIndex * 60 + 10}px`,
                              height: '40px',
                              borderLeftColor: group.goalColor,
                            }}
                            title={task.title}
                            onClick={() => router.push(`/tasks/${task.id}?fromView=timeline`)}
                          >
                            <div className="flex items-center gap-2 h-full">
                              <span className="text-xs font-medium truncate flex-1">
                                {task.title}
                              </span>
                              {task.status === 'done' && (
                                <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
