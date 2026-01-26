export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Column {
  id: TaskStatus;
  title: string;
}

export interface KanbanData {
  tasks: Task[];
  // Add any additional kanban-specific data here
}

// Helper function to initialize default tasks for a new goal
export const getDefaultKanbanTasks = (): Task[] => [
  {
    id: `task-${Date.now()}-1`,
    title: 'Plan your first task',
    status: 'todo',
    createdAt: new Date(),
  },
  {
    id: `task-${Date.now()}-2`,
    title: 'Start working on it',
    status: 'in-progress',
    createdAt: new Date(),
  },
  {
    id: `task-${Date.now()}-3`,
    title: 'Complete your first task',
    status: 'done',
    createdAt: new Date(),
  },
];
