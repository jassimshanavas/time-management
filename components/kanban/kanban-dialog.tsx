'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { KanbanBoard } from './kanban-board';
import type { Task } from '@/types/kanban';

type KanbanDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialTasks?: Task[];
  onSave: (tasks: Task[]) => void;
  goalTitle: string;
};

export const KanbanDialog = ({
  isOpen,
  onOpenChange,
  initialTasks = [],
  onSave,
  goalTitle,
}: KanbanDialogProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize tasks when dialog opens or initialTasks changes
  useEffect(() => {
    if (isOpen) {
      setTasks(initialTasks);
      setHasChanges(false);
    }
  }, [isOpen, initialTasks]);

  const handleTasksChange = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(tasks);
    setHasChanges(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {goalTitle} - Kanban Board
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0">
          <KanbanBoard 
            initialTasks={tasks} 
            onTasksChange={handleTasksChange}
            className="h-full"
          />
        </div>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!hasChanges}
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KanbanDialog;
