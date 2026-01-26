'use client';

import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import {
    Plus,
    Search,
    LayoutGrid,
    Table as TableIcon,
    List,
    Filter,
    Star,
    MoreHorizontal,
    PlusCircle,
    CheckCircle2,
    Clock,
    Target,
    TrendingUp,
    FileText,
    BarChart3,
    ArrowLeft,
    Edit,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProjectKanban } from '@/components/projects/project-kanban';
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog';
import { format } from 'date-fns';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';

export default function ProjectPage() {
    const router = useRouter();
    const { projectId } = useParams() as { projectId: string };
    const { projects, tasks, notes, goals, habits, timeEntries, deleteProject } = useStore();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
        return (
            <ProtectedRoute>
                <DataLoader>
                    <MainLayout>
                        <div className="flex h-full items-center justify-center">
                            <div className="text-center space-y-4">
                                <h2 className="text-2xl font-bold">Project not found</h2>
                                <p className="text-muted-foreground">The project you are looking for does not exist or has been deleted.</p>
                                <Button onClick={() => router.push('/dashboard')}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back to Dashboard
                                </Button>
                            </div>
                        </div>
                    </MainLayout>
                </DataLoader>
            </ProtectedRoute>
        );
    }

    // Filter items by project
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const projectNotes = notes.filter(n => n.projectId === projectId);
    const projectGoals = goals.filter(g => g.projectId === projectId);
    const projectHabits = habits.filter(h => h.projectId === projectId);
    const projectTimeEntries = timeEntries.filter(e => e.projectId === projectId);

    // Calculate statistics
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter((t) => t.status === 'done').length;
    const inProgressTasks = projectTasks.filter((t) => t.status === 'in-progress').length;
    const todoTasks = projectTasks.filter((t) => t.status === 'todo').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalTimeSpent = projectTimeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const totalTimeHours = Math.floor(totalTimeSpent / 60);
    const totalTimeMinutes = totalTimeSpent % 60;

    const activeGoals = projectGoals.filter((g) => g.progress < 100);
    const completedGoals = projectGoals.filter((g) => g.progress === 100);

    const recentTasks = [...projectTasks]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

    const handleDeleteProject = async () => {
        if (window.confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
            deleteProject(projectId);
            router.push('/dashboard');
        }
    };

    return (
        <ProtectedRoute>
            <DataLoader>
                <MainLayout>
                    <div className="flex flex-col h-full bg-background overflow-hidden animate-in fade-in duration-500">
                        {/* Project Header */}
                        <header className="p-6 border-b space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => router.back()}
                                        className="shrink-0"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                    <h1 className="text-3xl font-bold flex items-center gap-3">
                                        {project.emoji && <span>{project.emoji}</span>}
                                        {project.name}
                                    </h1>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            className="pl-10 pr-4 py-2 bg-secondary/50 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
                                        />
                                    </div>
                                    <Button variant="outline" size="sm">
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleDeleteProject}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </Button>
                                </div>
                            </div>

                            <Tabs defaultValue="overview" className="w-full">
                                <div className="flex items-center justify-between w-full">
                                    <TabsList className="bg-transparent border-b-0 gap-8 h-auto p-0">
                                        <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-base">Overview</TabsTrigger>
                                        <TabsTrigger value="tasks" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-base">Tasks</TabsTrigger
                                        >
                                        <TabsTrigger value="notes" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-base">Notes</TabsTrigger>
                                        <TabsTrigger value="goals" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-2 text-base">Goals</TabsTrigger>
                                    </TabsList>

                                    <div className="flex items-center gap-4">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map((i) => (
                                                <Avatar key={i} className="h-8 w-8 ring-2 ring-background">
                                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=User${i}`} />
                                                    <AvatarFallback>U{i}</AvatarFallback>
                                                </Avatar>
                                            ))}
                                        </div>
                                        <Button variant="outline" size="icon" className="rounded-full h-8 w-8 border-dashed">
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Overview Tab */}
                                <TabsContent value="overview" className="mt-6 space-y-6">
                                    {/* Quick Stats */}
                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                    Tasks
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{totalTasks}</div>
                                                <p className="text-xs text-muted-foreground">
                                                    {completedTasks} completed • {inProgressTasks} in progress
                                                </p>
                                                <Progress value={completionRate} className="mt-2 h-2" />
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-blue-600" />
                                                    Time Tracked
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">
                                                    {totalTimeHours}h {totalTimeMinutes}m
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {projectTimeEntries.length} sessions
                                                </p>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                    <Target className="h-4 w-4 text-emerald-600" />
                                                    Goals
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{projectGoals.length}</div>
                                                <p className="text-xs text-muted-foreground">
                                                    {activeGoals.length} active • {completedGoals.length} completed
                                                </p>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-orange-600" />
                                                    Resources
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{projectNotes.length + projectHabits.length}</div>
                                                <p className="text-xs text-muted-foreground">
                                                    {projectNotes.length} notes • {projectHabits.length} habits
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Project Health & Task Breakdown */}
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <BarChart3 className="h-5 w-5" />
                                                    Task Breakdown
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-3 w-3 rounded-full bg-green-500" />
                                                        <span className="text-sm">Completed</span>
                                                    </div>
                                                    <Badge variant="secondary">{completedTasks}</Badge>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-3 w-3 rounded-full bg-blue-500" />
                                                        <span className="text-sm">In Progress</span>
                                                    </div>
                                                    <Badge variant="secondary">{inProgressTasks}</Badge>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-3 w-3 rounded-full bg-gray-400" />
                                                        <span className="text-sm">To Do</span>
                                                    </div>
                                                    <Badge variant="secondary">{todoTasks}</Badge>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <TrendingUp className="h-5 w-5" />
                                                    Project Health
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium">Completion Rate</span>
                                                        <span className="text-2xl font-bold">{completionRate}%</span>
                                                    </div>
                                                    <Progress value={completionRate} className="h-3" />
                                                </div>
                                                <div className="pt-2 space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Total Tasks</span>
                                                        <span className="font-medium">{totalTasks}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Total Time</span>
                                                        <span className="font-medium">{totalTimeHours}h {totalTimeMinutes}m</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Recent Activity */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Recent Activity</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {recentTasks.length === 0 ? (
                                                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {recentTasks.map((task) => (
                                                        <Link
                                                            key={task.id}
                                                            href="/tasks"
                                                            className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3 flex-1">
                                                                <CheckCircle2 className={`h-5 w-5 ${task.status === 'done' ? 'text-green-600' : 'text-gray-400'}`} />
                                                                <div className="flex-1">
                                                                    <p className="font-medium">{task.title}</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Updated {format(new Date(task.updatedAt), 'MMM d, h:mm a')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Badge>{task.status}</Badge>
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* Tasks Tab (Kanban) */}
                                <TabsContent value="tasks" className="mt-6">
                                    <div className="flex items-center justify-between mb-4 bg-secondary/30 p-1 rounded-xl border">
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="sm" className="h-8 gap-2 bg-background shadow-sm border">
                                                <LayoutGrid className="h-4 w-4" />
                                                Kanban
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8 gap-2">
                                                <TableIcon className="h-4 w-4" />
                                                Table
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8 gap-2">
                                                <List className="h-4 w-4" />
                                                List
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CreateTaskDialog projectId={projectId}>
                                                <Button size="sm" className="h-8 gap-2">
                                                    <PlusCircle className="h-4 w-4" />
                                                    Add a task
                                                </Button>
                                            </CreateTaskDialog>
                                            <Button variant="ghost" size="sm" className="h-8 gap-2">
                                                <Filter className="h-4 w-4" />
                                                Filter
                                            </Button>
                                        </div>
                                    </div>
                                    <ProjectKanban projectId={projectId} tasks={projectTasks} />
                                </TabsContent>

                                {/* Notes Tab */}
                                <TabsContent value="notes" className="mt-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold">Project Notes</h3>
                                        <Link href="/notes">
                                            <Button variant="outline" size="sm">View All Notes</Button>
                                        </Link>
                                    </div>
                                    {projectNotes.length === 0 ? (
                                        <Card>
                                            <CardContent className="p-8 text-center">
                                                <p className="text-muted-foreground">No notes in this project yet.</p>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {projectNotes.map((note) => (
                                                <Card key={note.id} className="hover:shadow-sm transition-shadow">
                                                    <CardHeader className="pb-3">
                                                        <CardTitle className="text-lg">{note.title}</CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-sm text-muted-foreground line-clamp-3">{note.content}</p>
                                                        <div className="flex gap-1 mt-3">
                                                            {note.tags.map((tag) => (
                                                                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                                            ))}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                {/* Goals Tab */}
                                <TabsContent value="goals" className="mt-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold">Project Goals</h3>
                                        <Link href="/goals">
                                            <Button variant="outline" size="sm">View All Goals</Button>
                                        </Link>
                                    </div>
                                    {projectGoals.length === 0 ? (
                                        <Card>
                                            <CardContent className="p-8 text-center">
                                                <p className="text-muted-foreground">No goals in this project yet.</p>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <div className="space-y-4">
                                            {projectGoals.map((goal) => (
                                                <Card key={goal.id}>
                                                    <CardContent className="p-4">
                                                        <div className="space-y-3">
                                                            <div>
                                                                <h4 className="font-semibold text-lg">{goal.title}</h4>
                                                                {goal.description && (
                                                                    <p className="text-sm text-muted-foreground">{goal.description}</p>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-sm font-medium">Progress</span>
                                                                    <span className="text-sm text-muted-foreground">{goal.progress}%</span>
                                                                </div>
                                                                <Progress value={goal.progress} className="h-2" />
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </header>
                    </div>
                </MainLayout>
            </DataLoader>
        </ProtectedRoute>
    );
}
