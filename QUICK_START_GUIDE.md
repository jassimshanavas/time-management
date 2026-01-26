# 🚀 Quick Start: Add Project Integration
## Step-by-step guide with exact code

---

## 🎯 Goal
Transform TimeFlow from module-based to **project-centric** in 1-2 weeks.

**Before**: Projects feel separate  
**After**: Everything can belong to a project

---

## Step 1: Update Type Definitions (30 min)

### File: `types/index.ts`

Add `projectId` to all relevant interfaces:

```typescript
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: Date;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  estimatedDuration?: number;
  goalId?: string;
  projectId?: string;          // ✨ ADD THIS
  milestoneId?: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  comments?: TaskComment[];
  subtasks?: TaskSubtask[];
  dependencyIds?: string[];
  journal?: TaskJournalEntry[];
  userId: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  projectId?: string;            // ✨ ADD THIS
  createdAt: Date;
  updatedAt: Date;
  pinned?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetDate?: Date;
  progress: number;
  milestones: Milestone[];
  kanbanTasks?: KanbanTypes.Task[];
  projectId?: string;            // ✨ ADD THIS
  createdAt: Date;
  updatedAt: Date;
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  longestStreak: number;
  completedDates: Date[];
  projectId?: string;            // ✨ ADD THIS
  createdAt: Date;
}

export interface TimeEntry {
  id: string;
  category: string;
  description?: string;
  taskId?: string;
  projectId?: string;            // ✨ ADD THIS
  startTime: Date;
  endTime?: Date;
  duration?: number;
  isRunning: boolean;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  completed: boolean;
  projectId?: string;            // ✨ ADD THIS
  createdAt: Date;
  notified?: boolean;
}
```

**Note**: All fields are optional (`?:`) so existing data won't break.

---

## Step 2: Create Project Selector Component (1-2 hours)

### File: `components/projects/project-selector.tsx`

```typescript
'use client';

import { useStore } from '@/lib/store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProjectSelectorProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  allowNone?: boolean;
}

export function ProjectSelector({
  value,
  onChange,
  placeholder = 'Select project',
  allowNone = true,
}: ProjectSelectorProps) {
  const projects = useStore((state) => state.projects);

  const handleValueChange = (newValue: string) => {
    // If "none" is selected, pass undefined
    if (newValue === '__none__') {
      onChange(undefined);
    } else {
      onChange(newValue);
    }
  };

  return (
    <Select 
      value={value || '__none__'} 
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && (
          <SelectItem value="__none__">
            <div className="flex items-center gap-2">
              <span>📝</span>
              <span>Personal (No Project)</span>
            </div>
          </SelectItem>
        )}
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <span>{project.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

---

## Step 3: Create Project Badge Component (1 hour)

### File: `components/projects/project-badge.tsx`

```typescript
'use client';

import { useStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';

interface ProjectBadgeProps {
  projectId?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProjectBadge({ 
  projectId, 
  showIcon = true,
  size = 'sm' 
}: ProjectBadgeProps) {
  const project = useStore((state) =>
    state.projects.find((p) => p.id === projectId)
  );

  if (!projectId || !project) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <Badge
      variant="outline"
      className={`${sizeClasses[size]} inline-flex items-center gap-1.5`}
      style={{
        borderColor: project.color,
        color: project.color,
        backgroundColor: `${project.color}10`,
      }}
    >
      {showIcon && (
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: project.color }}
        />
      )}
      <span className="font-medium">{project.name}</span>
    </Badge>
  );
}
```

---

## Step 4: Update Task Form (1 hour)

### File: `app/tasks/page.tsx`

Find the task creation dialog and add project selector:

```typescript
'use client';

import { useState } from 'react';
import { ProjectSelector } from '@/components/projects/project-selector';
// ... other imports

export default function TasksPage() {
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    deadline: undefined as Date | undefined,
    projectId: undefined as string | undefined, // ✨ ADD THIS
    tags: [] as string[],
  });

  // ... existing code

  return (
    <div>
      {/* ... existing UI */}
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Existing fields... */}
            
            <Input
              placeholder="Task title"
              value={newTask.title}
              onChange={(e) =>
                setNewTask({ ...newTask, title: e.target.value })
              }
            />
            
            {/* ✨ ADD PROJECT SELECTOR */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <ProjectSelector
                value={newTask.projectId}
                onChange={(projectId) =>
                  setNewTask({ ...newTask, projectId })
                }
                placeholder="Select a project (optional)"
              />
            </div>
            
            {/* Rest of the form... */}
            
            <Textarea
              placeholder="Description (optional)"
              value={newTask.description || ''}
              onChange={(e) =>
                setNewTask({ ...newTask, description: e.target.value })
              }
            />
            
            {/* ... priority, deadline, etc. */}
          </div>
          
          <DialogFooter>
            <Button onClick={handleCreateTask}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## Step 5: Add Project Badge to Task Cards (30 min)

### File: `app/tasks/page.tsx`

Update the task card rendering:

```typescript
import { ProjectBadge } from '@/components/projects/project-badge';

// In the task list rendering:
{tasks.map((task) => (
  <Card key={task.id} className="p-4">
    <div className="space-y-2">
      {/* Title and badges row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-semibold">{task.title}</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {/* ✨ ADD PROJECT BADGE */}
          <ProjectBadge projectId={task.projectId} />
          
          {/* Existing priority badge */}
          <Badge variant={getPriorityVariant(task.priority)}>
            {task.priority}
          </Badge>
        </div>
      </div>
      
      {/* Rest of task card... */}
      {task.description && (
        <p className="text-sm text-muted-foreground">
          {task.description}
        </p>
      )}
      
      {/* ... deadline, tags, actions */}
    </div>
  </Card>
))}
```

---

## Step 6: Add Project Filter (2-3 hours)

### File: `app/tasks/page.tsx`

Add a filter dropdown at the top:

```typescript
'use client';

import { useState } from 'react';
import { ProjectSelector } from '@/components/projects/project-selector';

export default function TasksPage() {
  const tasks = useStore((state) => state.tasks);
  const [activeTab, setActiveTab] = useState<TaskStatus>('todo');
  const [filterProjectId, setFilterProjectId] = useState<string | undefined>(); // ✨ ADD THIS

  // ✨ Filter tasks by project
  const filteredTasks = tasks
    .filter((task) => task.status === activeTab)
    .filter((task) => {
      // If no filter selected, show all
      if (filterProjectId === undefined) return true;
      
      // If filter is "__personal__", show only tasks without project
      if (filterProjectId === '__personal__') return !task.projectId;
      
      // Otherwise, show tasks matching the project
      return task.projectId === filterProjectId;
    });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your tasks and projects
          </p>
        </div>
        
        {/* ✨ ADD PROJECT FILTER */}
        <div className="flex items-center gap-4">
          <div className="w-64">
            <ProjectSelector
              value={filterProjectId}
              onChange={setFilterProjectId}
              placeholder="Filter by project"
              allowNone={true}
            />
          </div>
          
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TaskStatus)}>
        <TabsList>
          <TabsTrigger value="todo">
            To Do ({filteredTasks.length})
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            In Progress
          </TabsTrigger>
          <TabsTrigger value="done">
            Done
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredTasks.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                No tasks found
                {filterProjectId && ' in this project'}
              </p>
            </Card>
          ) : (
            filteredTasks.map((task) => (
              // ... task card
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## Step 7: Repeat for Other Modules (2-4 hours each)

Apply the same pattern to:

1. **Notes** (`app/notes/page.tsx`)
2. **Goals** (`app/goals/page.tsx`)
3. **Habits** (`app/habits/page.tsx`)
4. **Time Tracking** (`app/time-tracking/page.tsx`)
5. **Reminders** (`app/reminders/page.tsx`)

**For each module**:
- Add ProjectSelector to creation form
- Add ProjectBadge to item cards
- Add project filter dropdown

---

## Step 8: Enhanced Sidebar (3-4 hours)

### File: `components/layout/sidebar.tsx`

Make the sidebar project-aware:

```typescript
'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Home,
  Calendar,
  FolderKanban,
  User,
  CheckSquare,
  StickyNote,
  Target,
  Dumbbell,
  Clock,
  Timeline,
  BarChart3,
  Trophy,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
} from 'lucide-react';

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const projects = useStore((state) => state.projects);
  
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [personalExpanded, setPersonalExpanded] = useState(true);

  const NavItem = ({ 
    icon: Icon, 
    label, 
    href, 
    badge 
  }: { 
    icon: any; 
    label: string; 
    href: string; 
    badge?: number;
  }) => {
    const isActive = pathname === href;
    
    return (
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className="w-full justify-start"
        onClick={() => router.push(href)}
      >
        <Icon className="w-4 h-4 mr-3" />
        <span className="flex-1 text-left">{label}</span>
        {badge && (
          <span className="ml-auto bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
            {badge}
          </span>
        )}
      </Button>
    );
  };

  return (
    <aside className="w-64 border-r bg-card h-screen overflow-y-auto p-4 space-y-6">
      {/* Logo / Title */}
      <div className="px-3">
        <h1 className="text-xl font-bold">TimeFlow</h1>
      </div>

      {/* Main Navigation */}
      <div className="space-y-1">
        <NavItem icon={Home} label="Home" href="/dashboard" />
        <NavItem icon={Calendar} label="Today" href="/today" />
      </div>

      <Separator />

      {/* Projects Section */}
      <div className="space-y-1">
        <button
          onClick={() => setProjectsExpanded(!projectsExpanded)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {projectsExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <FolderKanban className="w-4 h-4" />
          <span className="flex-1 text-left">PROJECTS</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              router.push('/projects/new');
            }}
          >
            <Plus className="w-3 h-3" />
          </Button>
        </button>

        {projectsExpanded && (
          <div className="ml-2 space-y-1">
            {projects.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No projects yet
              </p>
            ) : (
              projects.map((project) => (
                <Button
                  key={project.id}
                  variant="ghost"
                  className="w-full justify-start pl-6"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="flex-1 text-left truncate">
                    {project.name}
                  </span>
                </Button>
              ))
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* Personal Section */}
      <div className="space-y-1">
        <button
          onClick={() => setPersonalExpanded(!personalExpanded)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {personalExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <User className="w-4 h-4" />
          <span className="flex-1 text-left">PERSONAL</span>
        </button>

        {personalExpanded && (
          <div className="ml-2 space-y-1">
            <NavItem icon={CheckSquare} label="Tasks" href="/tasks" />
            <NavItem icon={StickyNote} label="Notes" href="/notes" />
            <NavItem icon={Target} label="Goals" href="/goals" />
            <NavItem icon={Dumbbell} label="Habits" href="/habits" />
            <NavItem icon={Clock} label="Time Tracking" href="/time-tracking" />
          </div>
        )}
      </div>

      <Separator />

      {/* Footer Navigation */}
      <div className="space-y-1">
        <NavItem icon={BarChart3} label="Analytics" href="/analytics" />
        <NavItem icon={Trophy} label="Achievements" href="/achievements" />
        <NavItem icon={Settings} label="Settings" href="/settings" />
      </div>
    </aside>
  );
}
```

---

## Step 9: Create "Today" View (4-6 hours)

### File: `app/today/page.tsx`

```typescript
'use client';

import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ProjectBadge } from '@/components/projects/project-badge';
import { Badge } from '@/components/ui/badge';
import { format, isToday, isPast, isFuture } from 'date-fns';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function TodayPage() {
  const tasks = useStore((state) => state.tasks);
  const habits = useStore((state) => state.habits);
  const reminders = useStore((state) => state.reminders);
  const updateTask = useStore((state) => state.updateTask);
  const toggleHabitCompletion = useStore((state) => state.toggleHabitCompletion);

  // Filter tasks
  const today = new Date();
  
  const overdueTasks = tasks.filter(
    (task) =>
      task.status !== 'done' &&
      task.deadline &&
      isPast(new Date(task.deadline)) &&
      !isToday(new Date(task.deadline))
  );

  const todayTasks = tasks.filter(
    (task) =>
      task.status !== 'done' &&
      task.deadline &&
      isToday(new Date(task.deadline))
  );

  const totalTasks = todayTasks.length + overdueTasks.length;
  const completedTasks = tasks.filter(
    (task) =>
      task.status === 'done' &&
      task.updatedAt &&
      isToday(new Date(task.updatedAt))
  ).length;

  const completionPercentage = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;

  // Filter today's habits
  const todayHabits = habits.filter((habit) => {
    const todayStr = today.toDateString();
    const isCompletedToday = habit.completedDates.some(
      (date) => new Date(date).toDateString() === todayStr
    );
    return !isCompletedToday || habit.frequency === 'daily';
  });

  // Upcoming reminders (next 24 hours)
  const upcomingReminders = reminders
    .filter((reminder) => !reminder.completed)
    .filter((reminder) => {
      const dueDate = new Date(reminder.dueDate);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return dueDate >= today && dueDate <= tomorrow;
    })
    .sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Today</h1>
        <p className="text-muted-foreground">
          {format(today, 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Progress Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Today's Progress</h2>
            <p className="text-sm text-muted-foreground">
              {completedTasks} of {totalTasks} tasks complete
            </p>
          </div>
          <div className="text-3xl font-bold">{completionPercentage}%</div>
        </div>
        <Progress value={completionPercentage} className="h-3" />
      </Card>

      {/* Overdue Tasks */}
      {overdueTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-semibold text-red-500">
              Overdue ({overdueTasks.length})
            </h2>
          </div>
          
          {overdueTasks.map((task) => (
            <Card key={task.id} className="p-4 border-red-200 bg-red-50 dark:bg-red-950/20">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={task.status === 'done'}
                  onCheckedChange={() =>
                    updateTask(task.id, {
                      status: task.status === 'done' ? 'todo' : 'done',
                    })
                  }
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{task.title}</h3>
                    <ProjectBadge projectId={task.projectId} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>
                      Due {format(new Date(task.deadline!), 'MMM d')}
                    </span>
                    <Badge variant="destructive">{task.priority}</Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Today's Tasks */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Today's Tasks ({todayTasks.length})
        </h2>
        
        {todayTasks.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No tasks scheduled for today
            </p>
          </Card>
        ) : (
          todayTasks.map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={task.status === 'done'}
                  onCheckedChange={() =>
                    updateTask(task.id, {
                      status: task.status === 'done' ? 'todo' : 'done',
                    })
                  }
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{task.title}</h3>
                    <ProjectBadge projectId={task.projectId} />
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge>{task.priority}</Badge>
                    <Badge variant="outline">{task.status}</Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Today's Habits */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Habits ({todayHabits.length})</h2>
        
        {todayHabits.map((habit) => {
          const todayStr = today.toDateString();
          const isCompletedToday = habit.completedDates.some(
            (date) => new Date(date).toDateString() === todayStr
          );

          return (
            <Card key={habit.id} className="p-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={isCompletedToday}
                  onCheckedChange={() => toggleHabitCompletion(habit.id, today)}
                />
                <div className="flex-1">
                  <h3 className="font-semibold">{habit.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    🔥 {habit.streak} day streak
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Upcoming Reminders */}
      {upcomingReminders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">
            Upcoming Reminders ({upcomingReminders.length})
          </h2>
          
          {upcomingReminders.map((reminder) => (
            <Card key={reminder.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{reminder.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(reminder.dueDate), 'h:mm a')}
                  </p>
                </div>
                <ProjectBadge projectId={reminder.projectId} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Step 10: Create Basic Project Dashboard (4-6 hours)

### File: `app/projects/[projectId]/page.tsx`

```typescript
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  CheckSquare,
  Clock,
  Target,
  TrendingUp,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const project = useStore((state) =>
    state.projects.find((p) => p.id === projectId)
  );
  const tasks = useStore((state) =>
    state.tasks.filter((t) => t.projectId === projectId)
  );
  const goals = useStore((state) =>
    state.goals.filter((g) => g.projectId === projectId)
  );
  const notes = useStore((state) =>
    state.notes.filter((n) => n.projectId === projectId)
  );
  const timeEntries = useStore((state) =>
    state.timeEntries.filter((te) => te.projectId === projectId)
  );

  if (!project) {
    return (
      <div className="container mx-auto p-6">
        <p>Project not found</p>
      </div>
    );
  }

  // Calculate metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
  const overdueTasks = tasks.filter(
    (t) =>
      t.status !== 'done' &&
      t.deadline &&
      new Date(t.deadline) < new Date()
  ).length;

  const completionRate = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;

  const totalTimeMinutes = timeEntries.reduce(
    (sum, entry) => sum + (entry.duration || 0),
    0
  );
  const totalTimeHours = Math.round(totalTimeMinutes / 60);

  const averageGoalProgress =
    goals.length > 0
      ? Math.round(
          goals.reduce((sum, g) => sum + g.progress, 0) / goals.length
        )
      : 0;

  // Health score (simple calculation)
  const healthScore = Math.round(
    (completionRate * 0.4 + 
     averageGoalProgress * 0.3 + 
     (overdueTasks === 0 ? 100 : Math.max(0, 100 - overdueTasks * 10)) * 0.3)
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-8 h-8 rounded-lg"
                style={{ backgroundColor: project.color }}
              />
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <Badge>{project.status}</Badge>
            </div>
            {project.description && (
              <p className="text-muted-foreground">{project.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tasks</p>
              <p className="text-2xl font-bold">{totalTasks}</p>
              <p className="text-xs text-muted-foreground">
                {completedTasks} completed
              </p>
            </div>
            <CheckSquare className="w-8 h-8 text-violet-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-2xl font-bold">{completionRate}%</p>
              <Progress value={completionRate} className="mt-2" />
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Time Logged</p>
              <p className="text-2xl font-bold">{totalTimeHours}h</p>
              <p className="text-xs text-muted-foreground">
                across {timeEntries.length} sessions
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Health Score</p>
              <p className="text-2xl font-bold">{healthScore}/100</p>
              {overdueTasks > 0 && (
                <p className="text-xs text-red-500">
                  ⚠️ {overdueTasks} overdue
                </p>
              )}
            </div>
            <Target className="w-8 h-8 text-emerald-500" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({totalTasks})</TabsTrigger>
          <TabsTrigger value="goals">Goals ({goals.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Recent Tasks */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Tasks</h3>
            
            {tasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div>
                  <p className="font-medium">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {task.status}
                    </Badge>
                    <Badge className="text-xs">{task.priority}</Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/tasks')}
                >
                  View
                </Button>
              </div>
            ))}
          </Card>

          {/* Goals Progress */}
          {goals.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Goals</h3>
              
              {goals.map((goal) => (
                <div key={goal.id} className="mb-4 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{goal.title}</p>
                    <span className="text-sm font-semibold">
                      {goal.progress}%
                    </span>
                  </div>
                  <Progress value={goal.progress} />
                </div>
              ))}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tasks">
          <Card className="p-6">
            <p className="text-muted-foreground">
              Task list view coming soon... For now, use the main Tasks page
              with the project filter.
            </p>
            <Button
              className="mt-4"
              onClick={() => router.push('/tasks')}
            >
              Go to Tasks
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <Card className="p-6">
            <p className="text-muted-foreground">
              Goals view coming soon...
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card className="p-6">
            <p className="text-muted-foreground">
              Notes view coming soon...
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 📝 Testing Checklist

After implementing, test these scenarios:

- [ ] Create a new project
- [ ] Create a task and assign it to the project
- [ ] Create a task without a project (personal)
- [ ] Filter tasks by project
- [ ] See project badge on task cards
- [ ] Navigate to project dashboard
- [ ] See project stats (tasks, progress, etc.)
- [ ] View "Today" page with mixed project/personal items
- [ ] Create note/goal/habit with project
- [ ] See projects in sidebar
- [ ] Click project in sidebar to navigate

---

## 🚀 What's Next?

After completing these steps, you'll have:
✅ Projects deeply integrated with all modules  
✅ Easy filtering by project  
✅ Visual project indicators everywhere  
✅ Project-aware navigation  
✅ Basic project dashboard  
✅ "Today" focus view

**Then you can add**:
- Kanban board (Step 11)
- Calendar view (Step 12)
- Timeline/Gantt (Step 13)
- Advanced analytics (Step 14)
- Team features (Step 15+)

---

**Start with Step 1 and work sequentially! Each step builds on the previous one.** 🎉
