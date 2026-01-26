'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/types';
import { format, startOfDay, addHours, isSameDay, parseISO } from 'date-fns';
import { Clock, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface TaskTimelineProps {
  tasks: Task[];
  selectedDate: Date;
}

export function TaskTimeline({ tasks, selectedDate }: TaskTimelineProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  
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
  
  // Filter tasks for selected date and sort by time
  const dayTasks = tasks
    .filter(task => {
      // Use scheduledStart if available, otherwise deadline
      const taskDate = task.scheduledStart || task.deadline;
      if (!taskDate) return false;
      const date = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
      return isSameDay(date, selectedDate);
    })
    .sort((a, b) => {
      const dateA = a.scheduledStart || a.deadline;
      const dateB = b.scheduledStart || b.deadline;
      if (!dateA || !dateB) return 0;
      const timeA = typeof dateA === 'string' ? parseISO(dateA) : dateA;
      const timeB = typeof dateB === 'string' ? parseISO(dateB) : dateB;
      return timeA.getTime() - timeB.getTime();
    });
  
  // Get task position and height based on time
  const getTaskStyle = (task: Task) => {
    const taskDate = task.scheduledStart || task.deadline;
    if (!taskDate) return { top: 0, height: 60 };
    
    const date = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    // Each hour slot is 80px, calculate position
    const top = (hours * 80) + (minutes / 60 * 80);
    
    // Calculate height based on duration if available
    let height = 60; // Default task height
    if (task.estimatedDuration) {
      height = Math.max(60, (task.estimatedDuration / 60) * 80);
    } else if (task.scheduledEnd) {
      const endDate = typeof task.scheduledEnd === 'string' ? parseISO(task.scheduledEnd) : task.scheduledEnd;
      const durationMinutes = (endDate.getTime() - date.getTime()) / 60000;
      height = Math.max(60, (durationMinutes / 60) * 80);
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
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'border-green-500 bg-green-500/10';
      case 'in-progress':
        return 'border-blue-500 bg-blue-500/10';
      default:
        return 'border-slate-600 bg-slate-800/50';
    }
  };
  
  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
  };
  
  return (
    <Card className="overflow-hidden bg-slate-900 border-slate-800">
      <CardContent className="p-0">
        <div className="flex h-[600px]">
          {/* Time labels */}
          <div className="w-20 bg-slate-950 border-r border-slate-800 flex-shrink-0">
            {timeSlots.map((slot) => (
              <div
                key={slot.hour}
                className="h-20 border-b border-slate-800 flex items-start justify-end pr-3 pt-1"
              >
                <span className="text-xs text-slate-500 font-medium">{slot.label}</span>
              </div>
            ))}
          </div>
          
          {/* Timeline grid */}
          <div className="flex-1 relative overflow-y-auto bg-slate-900">
            {/* Hour grid lines */}
            {timeSlots.map((slot) => (
              <div
                key={slot.hour}
                className="h-20 border-b border-slate-800/50"
              />
            ))}
            
            {/* Current time indicator */}
            {currentTimePosition !== null && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: `${currentTimePosition}px` }}
              >
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 -ml-1.5" />
                  <div className="flex-1 h-0.5 bg-blue-500" />
                </div>
              </div>
            )}
            
            {/* Tasks */}
            <div className="absolute inset-0 px-4">
              {dayTasks.map((task, index) => {
                const style = getTaskStyle(task);
                return (
                  <div
                    key={task.id}
                    className={`absolute left-4 right-4 rounded-lg border-l-4 p-3 transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer ${getStatusColor(task.status)}`}
                    style={{
                      top: `${style.top}px`,
                      minHeight: `${style.height}px`,
                      zIndex: 10
                    }}
                    onClick={() => router.push(`/tasks/${task.id}?fromView=timeline`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {task.status === 'done' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          ) : task.status === 'in-progress' ? (
                            <Circle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          )}
                          <h4 className="text-sm font-semibold text-white truncate">
                            {task.title}
                          </h4>
                        </div>
                        
                        {task.description && (
                          <p className="text-xs text-slate-400 line-clamp-2 ml-6">
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2 ml-6">
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            {(() => {
                              const taskDate = task.scheduledStart || task.deadline;
                              if (!taskDate) return 'No time';
                              const date = typeof taskDate === 'string' ? parseISO(taskDate) : taskDate;
                              return format(date, 'HH:mm');
                            })()}
                          </div>
                          
                          {task.priority && (
                            <Badge variant="outline" className={`text-xs px-1.5 py-0 ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* No tasks message */}
              {dayTasks.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                    <p className="text-slate-500 text-sm">No tasks scheduled for this day</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
