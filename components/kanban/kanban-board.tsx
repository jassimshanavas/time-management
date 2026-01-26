'use client';

import { useState, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button } from '@/components/ui/button';
import { Plus, X, GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Task, Column } from '@/types/kanban';

const columns: Column[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
];

const TaskCard = ({ task, onDelete, onEdit }: { task: Task; onDelete: (id: string) => void; onEdit: (id: string, title: string) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [isHovered, setIsHovered] = useState(false);

  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'task',
    item: { id: task.id },
    collect: (monitor: any) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const handleSave = () => {
    if (title.trim()) {
      onEdit(task.id, title);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={preview}
      className={`relative p-3 mb-2 bg-card rounded border ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-2">
        <div ref={drag} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        
        {isEditing ? (
          <div className="flex-1 flex gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
              className="h-8 flex-1"
            />
          </div>
        ) : (
          <div 
            className="flex-1 cursor-text" 
            onClick={() => setIsEditing(true)}
          >
            {task.title}
          </div>
        )}
        
        {(isHovered || isEditing) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-auto"
            onClick={() => onDelete(task.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

const Column = ({
  column,
  tasks,
  onTaskDrop,
  onTaskDelete,
  onTaskEdit,
  onAddTask,
}: {
  column: Column;
  tasks: Task[];
  onTaskDrop: (taskId: string, newStatus: Task['status']) => void;
  onTaskDelete: (id: string) => void;
  onTaskEdit: (id: string, title: string) => void;
  onAddTask: (title: string) => void;
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'task',
    drop: (item: { id: string }) => onTaskDrop(item.id, column.id),
    collect: (monitor: any) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddTask(newTaskTitle);
      setNewTaskTitle('');
      setIsAdding(false);
    }
  };

  return (
    <div
      ref={drop}
      className={`flex-1 flex flex-col h-full min-h-[500px] ${isOver ? 'bg-muted/50' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          {column.title}
          <Badge variant="outline" className="text-xs">
            {tasks.length}
          </Badge>
        </h3>
        {column.id !== 'done' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDelete={onTaskDelete}
            onEdit={onTaskEdit}
          />
        ))}
        
        {isAdding && (
          <div className="p-2 border rounded bg-card">
            <Input
              placeholder="Task title"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onBlur={() => {
                if (!newTaskTitle.trim()) setIsAdding(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTask();
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewTaskTitle('');
                }
              }}
              autoFocus
              className="h-8 mb-2"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setNewTaskTitle('');
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
                Add
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const KanbanBoard = ({
  initialTasks = [],
  onTasksChange,
  className = '',
}: {
  initialTasks?: Task[];
  onTasksChange: (tasks: Task[]) => void;
  className?: string;
}) => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isMounted, setIsMounted] = useState(false);

  // Update local state when initialTasks changes
  useEffect(() => {
    if (isMounted) {
      setTasks(initialTasks);
    } else {
      // Only set initial tasks on first render
      setTasks(initialTasks);
      setIsMounted(true);
    }
  }, [initialTasks, isMounted]);

  const handleTaskDrop = (taskId: string, newStatus: Task['status']) => {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, status: newStatus } : task
    );
    setTasks(updatedTasks);
    onTasksChange(updatedTasks);
  };

  const handleAddTask = (status: Task['status'], title: string) => {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      status,
    };
    const updatedTasks = [...tasks, newTask];
    setTasks(updatedTasks);
    onTasksChange(updatedTasks);
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = tasks.filter((task) => task.id !== taskId);
    setTasks(updatedTasks);
    onTasksChange(updatedTasks);
  };

  const handleEditTask = (taskId: string, newTitle: string) => {
    const updatedTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, title: newTitle } : task
    );
    setTasks(updatedTasks);
    onTasksChange(updatedTasks);
  };

  return (
    <div className={`flex gap-4 h-full ${className}`}>
      {columns.map((column) => (
        <div key={column.id} className="flex-1 flex flex-col">
          <Column
            column={column}
            tasks={tasks.filter((task) => task.status === column.id)}
            onTaskDrop={handleTaskDrop}
            onTaskDelete={handleDeleteTask}
            onTaskEdit={handleEditTask}
            onAddTask={(title) => handleAddTask(column.id, title)}
          />
        </div>
      ))}
    </div>
  );
};

export default KanbanBoard;
