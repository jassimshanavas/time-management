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
                    <div className="flex flex-col h-full bg-background/50 animate-in fade-in duration-700">
                        {/* Project Header */}
                        <header className="p-4 sm:p-8 space-y-6">
                            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-4 min-w-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => router.back()}
                                        className="shrink-0 rounded-full hover:bg-background/80"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary uppercase text-[10px] font-black tracking-widest">Workspace</Badge>
                                        </div>
                                        <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-3 truncate bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                                            {project.emoji && <span className="drop-shadow-sm">{project.emoji}</span>}
                                            {project.name}
                                        </h1>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="relative group flex-1 sm:flex-initial">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                        <input
                                            type="text"
                                            placeholder="Find anything..."
                                            className="pl-10 pr-4 py-2 bg-background/50 backdrop-blur-sm border-primary/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-64 transition-all"
                                        />
                                    </div>
                                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 bg-background/50" onClick={() => { }}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 bg-background/50 hover:bg-destructive/10 hover:text-destructive group-hover:border-destructive/30" onClick={handleDeleteProject}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <Tabs defaultValue="overview" className="w-full">
                                <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 pt-4">
                                    <TabsList className="bg-muted/50 p-1 rounded-2xl backdrop-blur-sm border border-primary/5 self-start sm:self-auto">
                                        <TabsTrigger value="overview" className="rounded-xl px-6 font-bold tracking-tight data-[state=active]:bg-background data-[state=active]:shadow-lg">Overview</TabsTrigger>
                                        <TabsTrigger value="tasks" className="rounded-xl px-6 font-bold tracking-tight data-[state=active]:bg-background data-[state=active]:shadow-lg">Tasks</TabsTrigger>
                                        <TabsTrigger value="notes" className="rounded-xl px-6 font-bold tracking-tight data-[state=active]:bg-background data-[state=active]:shadow-lg">Notes</TabsTrigger>
                                        <TabsTrigger value="goals" className="rounded-xl px-6 font-bold tracking-tight data-[state=active]:bg-background data-[state=active]:shadow-lg">Goals</TabsTrigger>
                                    </TabsList>

                                    <div className="flex items-center gap-4 self-end sm:self-auto">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map((i) => (
                                                <Avatar key={i} className="h-10 w-10 ring-4 ring-background shadow-lg">
                                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=User${i}`} />
                                                    <AvatarFallback>U{i}</AvatarFallback>
                                                </Avatar>
                                            ))}
                                        </div>
                                        <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-dashed hover:border-primary hover:text-primary transition-colors">
                                            <Plus className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Overview Tab */}
                                <TabsContent value="overview" className="mt-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                                    {/* Quick Stats */}
                                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                                        <Card className="bg-background/40 backdrop-blur-xl border-primary/5 shadow-xl group hover:border-primary/20 transition-all duration-300">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    Tasks Pulse
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-3xl font-black text-foreground leading-none mb-2">{totalTasks}</div>
                                                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                                                    {completedTasks} Done • {inProgressTasks} Active
                                                </p>
                                                <Progress value={completionRate} className="mt-4 h-1.5 rounded-full bg-primary/10" />
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-background/40 backdrop-blur-xl border-primary/5 shadow-xl group hover:border-primary/20 transition-all duration-300">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                                                    <Clock className="h-4 w-4 text-blue-500" />
                                                    Time Invested
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-3xl font-black text-foreground leading-none mb-2">
                                                    {totalTimeHours}<span className="text-lg">h</span> {totalTimeMinutes}<span className="text-lg">m</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                                                    Across {projectTimeEntries.length} sessions
                                                </p>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-background/40 backdrop-blur-xl border-primary/5 shadow-xl group hover:border-primary/20 transition-all duration-300">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                                                    <Target className="h-4 w-4 text-emerald-500" />
                                                    Milestones
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-3xl font-black text-foreground leading-none mb-2">{projectGoals.length}</div>
                                                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                                                    {activeGoals.length} Active • {completedGoals.length} Hit
                                                </p>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-background/40 backdrop-blur-xl border-primary/5 shadow-xl group hover:border-primary/20 transition-all duration-300">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                                                    <FileText className="h-4 w-4 text-orange-500" />
                                                    Knowledge Base
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-3xl font-black text-foreground leading-none mb-2">{projectNotes.length + projectHabits.length}</div>
                                                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase">
                                                    {projectNotes.length} Notes • {projectHabits.length} Habits
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Charts Section */}
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <Card className="bg-background/40 backdrop-blur-xl border-primary/5 shadow-xl overflow-hidden">
                                            <CardHeader className="bg-muted/30 border-b border-primary/5">
                                                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                                    <BarChart3 className="h-5 w-5 text-primary" />
                                                    Velocity Status
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-6 space-y-4">
                                                <div className="flex items-center justify-between group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                                                        <span className="text-sm font-bold">Successfully Completed</span>
                                                    </div>
                                                    <Badge variant="secondary" className="font-black">{completedTasks}</Badge>
                                                </div>
                                                <div className="flex items-center justify-between group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-4 w-4 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]" />
                                                        <span className="text-sm font-bold">In Active Focus</span>
                                                    </div>
                                                    <Badge variant="secondary" className="font-black">{inProgressTasks}</Badge>
                                                </div>
                                                <div className="flex items-center justify-between group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-4 w-4 rounded-full bg-slate-400/50" />
                                                        <span className="text-sm font-bold">Backlog / To Do</span>
                                                    </div>
                                                    <Badge variant="secondary" className="font-black">{todoTasks}</Badge>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-background/40 backdrop-blur-xl border-primary/5 shadow-xl overflow-hidden">
                                            <CardHeader className="bg-muted/30 border-b border-primary/5">
                                                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                                                    Overall Health
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-6 space-y-6">
                                                <div>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Project Completion</span>
                                                        <span className="text-3xl font-black text-emerald-500">{completionRate}%</span>
                                                    </div>
                                                    <Progress value={completionRate} className="h-4 rounded-full bg-emerald-500/10 shadow-inner" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 pt-2">
                                                    <div className="p-3 rounded-2xl bg-muted/30 border border-primary/5">
                                                        <p className="text-[10px] font-black uppercase text-muted-foreground/60 mb-1">Total Tasks</p>
                                                        <p className="text-xl font-black">{totalTasks}</p>
                                                    </div>
                                                    <div className="p-3 rounded-2xl bg-muted/30 border border-primary/5">
                                                        <p className="text-[10px] font-black uppercase text-muted-foreground/60 mb-1">Time Invested</p>
                                                        <p className="text-xl font-black">{totalTimeHours}h</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Recent Activity */}
                                    <Card className="bg-background/40 backdrop-blur-xl border-primary/5 shadow-xl overflow-hidden">
                                        <CardHeader className="bg-muted/30 border-b border-primary/5">
                                            <CardTitle className="text-sm font-bold uppercase tracking-wider">Historical Activity</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            {recentTasks.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                                                    <Clock className="h-8 w-8 mb-2" />
                                                    <p className="text-sm font-bold">No activity yet</p>
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-primary/5">
                                                    {recentTasks.map((task) => (
                                                        <Link
                                                            key={task.id}
                                                            href="/tasks"
                                                            className="flex items-center justify-between p-4 hover:bg-primary/5 transition-all group"
                                                        >
                                                            <div className="flex items-center gap-4 flex-1">
                                                                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-colors ${task.status === 'done' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                                                    <CheckCircle2 className="h-6 w-6" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-bold truncate group-hover:text-primary transition-colors">{task.title}</p>
                                                                    <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/60 mt-0.5">
                                                                        Last sync {format(new Date(task.updatedAt), 'MMM d, h:mm a')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Badge variant="outline" className="font-black uppercase text-[10px] bg-background/50">{task.status}</Badge>
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="tasks" className="mt-8">
                                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
                                        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-2xl backdrop-blur-sm border border-primary/5 w-full sm:w-auto">
                                            <Button variant="ghost" size="sm" className="flex-1 sm:flex-initial h-9 px-6 rounded-xl font-bold tracking-tight bg-background shadow-md">
                                                <LayoutGrid className="h-4 w-4 mr-2" />
                                                Kanban
                                            </Button>
                                            <Button variant="ghost" size="sm" className="flex-1 sm:flex-initial h-9 px-6 rounded-xl font-bold tracking-tight hover:bg-background/50">
                                                <TableIcon className="h-4 w-4 mr-2" />
                                                Table
                                            </Button>
                                            <Button variant="ghost" size="sm" className="flex-1 sm:flex-initial h-9 px-6 rounded-xl font-bold tracking-tight hover:bg-background/50">
                                                <List className="h-4 w-4 mr-2" />
                                                List
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            <CreateTaskDialog projectId={projectId}>
                                                <Button size="sm" className="flex-1 sm:flex-initial h-10 px-6 rounded-2xl font-bold shadow-lg shadow-primary/20">
                                                    <PlusCircle className="h-4 w-4 mr-2" />
                                                    Add a task
                                                </Button>
                                            </CreateTaskDialog>
                                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl shrink-0">
                                                <Filter className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-3xl bg-muted/20 border border-primary/5 backdrop-blur-sm">
                                        <ProjectKanban projectId={projectId} tasks={projectTasks} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="notes" className="mt-8 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-black uppercase tracking-tighter">Project Archives</h3>
                                        <Link href="/notes">
                                            <Button variant="outline" size="sm" className="rounded-xl px-6 font-bold">View Vault</Button>
                                        </Link>
                                    </div>
                                    {projectNotes.length === 0 ? (
                                        <Card className="bg-background/40 backdrop-blur-sm border-dashed border-2 py-12">
                                            <CardContent className="flex flex-col items-center justify-center text-center opacity-50">
                                                <FileText className="h-12 w-12 mb-4" />
                                                <p className="text-sm font-bold">No notes archived in this project</p>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <div className="grid gap-6 md:grid-cols-2">
                                            {projectNotes.map((note) => (
                                                <Card key={note.id} className="group relative overflow-hidden bg-background/40 backdrop-blur-xl border-primary/10 hover:border-primary/30 transition-all duration-300 shadow-xl">
                                                    <CardHeader className="pb-3">
                                                        <CardTitle className="text-xl font-black group-hover:text-primary transition-colors">{note.title}</CardTitle>
                                                    </CardHeader>
                                                    <CardContent>
                                                        <p className="text-sm font-medium text-muted-foreground line-clamp-3 mb-6">{note.content}</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {note.tags.map((tag) => (
                                                                <Badge key={tag} variant="secondary" className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/5">{tag}</Badge>
                                                            ))}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="goals" className="mt-8 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-black uppercase tracking-tighter">North Stars</h3>
                                        <Link href="/goals">
                                            <Button variant="outline" size="sm" className="rounded-xl px-6 font-bold">Manage Goals</Button>
                                        </Link>
                                    </div>
                                    {projectGoals.length === 0 ? (
                                        <Card className="bg-background/40 backdrop-blur-sm border-dashed border-2 py-12">
                                            <CardContent className="flex flex-col items-center justify-center text-center opacity-50">
                                                <Target className="h-12 w-12 mb-4" />
                                                <p className="text-sm font-bold">No goals defined for this workspace</p>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <div className="grid gap-6 md:grid-cols-2">
                                            {projectGoals.map((goal) => (
                                                <Card key={goal.id} className="group overflow-hidden bg-background/40 backdrop-blur-xl border-primary/10 hover:border-primary/30 transition-all duration-300 shadow-xl">
                                                    <CardContent className="p-6">
                                                        <div className="space-y-6">
                                                            <div className="flex items-start justify-between">
                                                                <div className="min-w-0">
                                                                    <h4 className="font-black text-xl group-hover:text-primary transition-colors truncate">{goal.title}</h4>
                                                                    {goal.description && (
                                                                        <p className="text-sm font-medium text-muted-foreground line-clamp-2 mt-1">{goal.description}</p>
                                                                    )}
                                                                </div>
                                                                <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                                                                    <Target className="h-6 w-6" />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Strategic Progress</span>
                                                                    <span className="text-sm font-black text-primary">{goal.progress}%</span>
                                                                </div>
                                                                <Progress value={goal.progress} className="h-3 rounded-full bg-primary/10 shadow-inner" />
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
