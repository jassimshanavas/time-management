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
import { CollaboratorManagementDialog } from '@/components/projects/collaborator-management-dialog';
import { format } from 'date-fns';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/main-layout';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';

export default function ProjectPage() {
    const router = useRouter();
    const { projectId } = useParams() as { projectId: string };
    const { projects, tasks, notes, goals, habits, timeEntries, deleteProject, userCache } = useStore();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
        return (
            <ProtectedRoute>
                <DataLoader>
                    <MainLayout>
                        <div className="flex h-full items-center justify-center p-6">
                            <div className="text-center space-y-6 max-w-sm">
                                <div className="h-20 w-20 bg-muted rounded-3xl mx-auto flex items-center justify-center">
                                    <Target className="h-10 w-10 text-muted-foreground" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black tracking-tight">Project Dissolved</h2>
                                    <p className="text-muted-foreground text-sm font-medium leading-relaxed">The strategic workspace you seek has been archived or does not exist in the current neural network.</p>
                                </div>
                                <Button onClick={() => router.push('/dashboard')} className="w-full h-11 rounded-2xl font-bold">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Return to Nexus
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
        if (window.confirm(`Dissolve "${project.name}"? All synaptic links will be severed.`)) {
            deleteProject(projectId);
            router.push('/dashboard');
        }
    };

    return (
        <ProtectedRoute>
            <DataLoader>
                <MainLayout>
                    <div className="flex flex-col h-full bg-background/50 animate-in fade-in duration-700">
                        {/* Compact Project Header */}
                        <header className="p-4 sm:p-6 lg:p-8 space-y-6">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex items-center gap-4 min-w-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => router.back()}
                                        className="shrink-0 rounded-xl hover:bg-background/80 shadow-sm border border-primary/5"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary uppercase text-[9px] font-black tracking-widest px-2 py-0 h-4">Strategic Nexus</Badge>
                                        </div>
                                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black flex items-center gap-3 truncate bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent tracking-tight">
                                            {project.emoji && <span className="drop-shadow-md shrink-0">{project.emoji}</span>}
                                            <span className="truncate">{project.name}</span>
                                        </h1>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full lg:w-auto">
                                    <div className="relative group flex-1 lg:flex-initial">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                        <input
                                            type="text"
                                            placeholder="Audit this workspace..."
                                            className="h-10 pl-10 pr-4 bg-background/50 backdrop-blur-sm border-primary/10 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 w-full lg:w-64 transition-all"
                                        />
                                    </div>
                                    <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 bg-background/50 shrink-0 shadow-sm border-primary/5" onClick={() => { }}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" className="rounded-xl h-10 w-10 bg-background/50 hover:bg-destructive/10 hover:text-destructive shrink-0 shadow-sm border-primary/5" onClick={handleDeleteProject}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <Tabs defaultValue="overview" className="w-full">
                                <div className="flex flex-col md:flex-row items-center justify-between w-full gap-6 pt-2">
                                    <TabsList className="bg-muted/30 p-1 rounded-2xl backdrop-blur-md border border-primary/5 self-stretch md:self-auto overflow-x-auto overflow-y-hidden no-scrollbar justify-start">
                                        <TabsTrigger value="overview" className="rounded-xl px-4 lg:px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg active:scale-95 transition-all">Overview</TabsTrigger>
                                        <TabsTrigger value="tasks" className="rounded-xl px-4 lg:px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg active:scale-95 transition-all">Tasks</TabsTrigger>
                                        <TabsTrigger value="notes" className="rounded-xl px-4 lg:px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg active:scale-95 transition-all">Notes</TabsTrigger>
                                        <TabsTrigger value="goals" className="rounded-xl px-4 lg:px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-lg active:scale-95 transition-all">Goals</TabsTrigger>
                                    </TabsList>

                                    <div className="flex items-center gap-4 self-center md:self-auto shrink-0">
                                        <div className="flex -space-x-3">
                                            {project.members?.map((member) => {
                                                const u = userCache[member.userId];
                                                return (
                                                    <Avatar key={member.userId} className="h-8 w-8 ring-2 ring-background shadow-md border-none">
                                                        <AvatarImage src={u?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.userId}`} title={u?.name || member.userId} />
                                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-black">
                                                            {(u?.name || member.userId).slice(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                );
                                            })}
                                            {(project.members?.length || 0) === 0 && (
                                                <Avatar className="h-8 w-8 ring-2 ring-background shadow-md border-none bg-primary/10">
                                                    <AvatarFallback className="text-primary text-[10px] font-black">{project.userId.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>
                                        <div className="h-6 w-px bg-primary/10" />
                                        <CollaboratorManagementDialog project={project}>
                                            <Button variant="outline" size="icon" className="rounded-xl h-8 w-8 border-dashed hover:border-primary hover:text-primary transition-colors bg-background/40">
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </CollaboratorManagementDialog>
                                    </div>
                                </div>

                                {/* Overview Tab */}
                                <TabsContent value="overview" className="mt-8 space-y-6 lg:space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                                    {/* Responsive Stats Grid */}
                                    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                                        <Card className="bg-background/40 backdrop-blur-xl border-primary/5 shadow-lg group hover:border-primary/20 transition-all duration-300 rounded-2xl overflow-hidden">
                                            <CardHeader className="p-3 sm:p-4 pb-1">
                                                <CardTitle className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 text-muted-foreground">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                    Tasks
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-3 sm:p-4 pt-1">
                                                <div className="text-2xl sm:text-3xl font-black text-foreground leading-none mb-1.5">{totalTasks}</div>
                                                <p className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-tighter truncate">
                                                    {completedTasks} Done • {inProgressTasks} Active
                                                </p>
                                                <Progress value={completionRate} className="mt-4 h-1 rounded-full bg-primary/10" />
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-background/40 backdrop-blur-xl border-primary/5 shadow-lg group hover:border-primary/20 transition-all duration-300 rounded-2xl overflow-hidden">
                                            <CardHeader className="p-3 sm:p-4 pb-1">
                                                <CardTitle className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 text-muted-foreground">
                                                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                                                    Velocity
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-3 sm:p-4 pt-1">
                                                <div className="text-2xl sm:text-3xl font-black text-foreground leading-none mb-1.5">
                                                    {totalTimeHours}<span className="text-xs font-bold text-muted-foreground ml-0.5">h</span> {totalTimeMinutes}<span className="text-xs font-bold text-muted-foreground ml-0.5">m</span>
                                                </div>
                                                <p className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-tighter truncate">
                                                    Over {projectTimeEntries.length} sessions
                                                </p>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-background/40 backdrop-blur-xl border-primary/5 shadow-lg group hover:border-primary/20 transition-all duration-300 rounded-2xl overflow-hidden">
                                            <CardHeader className="p-3 sm:p-4 pb-1">
                                                <CardTitle className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 text-muted-foreground">
                                                    <Target className="h-3.5 w-3.5 text-rose-500" />
                                                    Milestones
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-3 sm:p-4 pt-1">
                                                <div className="text-2xl sm:text-3xl font-black text-foreground leading-none mb-1.5">{projectGoals.length}</div>
                                                <p className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-tighter truncate">
                                                    {activeGoals.length} Active • {completedGoals.length} Hit
                                                </p>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-background/40 backdrop-blur-xl border-primary/5 shadow-lg group hover:border-primary/20 transition-all duration-300 rounded-2xl overflow-hidden">
                                            <CardHeader className="p-3 sm:p-4 pb-1">
                                                <CardTitle className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 text-muted-foreground">
                                                    <FileText className="h-3.5 w-3.5 text-amber-500" />
                                                    Knowledge
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-3 sm:p-4 pt-1">
                                                <div className="text-2xl sm:text-3xl font-black text-foreground leading-none mb-1.5">{projectNotes.length + projectHabits.length}</div>
                                                <p className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-tighter truncate">
                                                    {projectNotes.length} Items • {projectHabits.length} Patterns
                                                </p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Data Visualization Grid */}
                                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                        <Card className="bg-background/40 backdrop-blur-xl border-primary/5 shadow-xl overflow-hidden rounded-3xl lg:col-span-1">
                                            <CardHeader className="bg-muted/20 border-b border-primary/5 py-3">
                                                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                    <BarChart3 className="h-4 w-4 text-primary" />
                                                    Network Status
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex items-center justify-between group p-2 rounded-xl hover:bg-emerald-500/5 transition-colors">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                        <span className="text-[11px] font-bold">Completed</span>
                                                    </div>
                                                    <Badge variant="secondary" className="font-black h-5 text-[10px] px-2">{completedTasks}</Badge>
                                                </div>
                                                <div className="flex items-center justify-between group p-2 rounded-xl hover:bg-blue-500/5 transition-colors">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                        <span className="text-[11px] font-bold">In Progress</span>
                                                    </div>
                                                    <Badge variant="secondary" className="font-black h-5 text-[10px] px-2">{inProgressTasks}</Badge>
                                                </div>
                                                <div className="flex items-center justify-between group p-2 rounded-xl hover:bg-slate-400/5 transition-colors">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="h-2 w-2 rounded-full bg-slate-400/50" />
                                                        <span className="text-[11px] font-bold">Planned</span>
                                                    </div>
                                                    <Badge variant="secondary" className="font-black h-5 text-[10px] px-2">{todoTasks}</Badge>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-background/40 backdrop-blur-xl border-primary/5 shadow-xl overflow-hidden rounded-3xl md:col-span-2 lg:col-span-2">
                                            <CardHeader className="bg-muted/20 border-b border-primary/5 py-3">
                                                <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                                                        Strategic Growth
                                                    </div>
                                                    <span className="text-primary">{completionRate}% Neural Sync</span>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-6">
                                                <div className="grid md:grid-cols-2 gap-8 items-center">
                                                    <div className="space-y-6">
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                                                                <span>Completion Pulse</span>
                                                                <span>{completionRate}%</span>
                                                            </div>
                                                            <Progress value={completionRate} className="h-3 rounded-full bg-emerald-500/10 shadow-inner" />
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <div className="flex-1 p-3 rounded-2xl bg-muted/20 border border-primary/5">
                                                                <p className="text-[8px] font-black uppercase text-muted-foreground/50 mb-1">Items</p>
                                                                <p className="text-lg font-black">{totalTasks}</p>
                                                            </div>
                                                            <div className="flex-1 p-3 rounded-2xl bg-muted/20 border border-primary/5">
                                                                <p className="text-[8px] font-black uppercase text-muted-foreground/50 mb-1">Time</p>
                                                                <p className="text-lg font-black">{totalTimeHours}h</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="hidden md:flex items-center justify-center">
                                                        <div className="relative h-24 w-24">
                                                            <svg className="h-full w-full" viewBox="0 0 36 36">
                                                                <path className="text-primary/10" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                                                <path className="text-primary" strokeDasharray={`${completionRate}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                                                <text x="18" y="20.5" className="text-[8px] font-black" fill="currentColor" textAnchor="middle">{completionRate}%</text>
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* History Section */}
                                    <Card className="bg-background/40 backdrop-blur-xl border-primary/5 shadow-xl overflow-hidden rounded-3xl">
                                        <CardHeader className="bg-muted/20 border-b border-primary/5 py-3 px-6">
                                            <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center justify-between">
                                                Recent Synapse Activity
                                                <Badge variant="outline" className="h-5 px-2 text-[8px] border-primary/10">Real-time update</Badge>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            {recentTasks.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-16 text-center opacity-30 grayscale">
                                                    <Clock className="h-10 w-10 mb-3" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">No synaptic activity recorded</p>
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-primary/5">
                                                    {recentTasks.map((task) => (
                                                        <Link
                                                            key={task.id}
                                                            href="/tasks"
                                                            className="flex items-center justify-between p-4 px-6 hover:bg-primary/5 transition-all group lg:last:border-none"
                                                        >
                                                            <div className="flex items-center gap-4 flex-1">
                                                                <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${task.status === 'done' ? 'bg-emerald-500/10 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-muted/40 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-110'}`}>
                                                                    <CheckCircle2 className="h-5 w-5" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-bold truncate group-hover:text-primary transition-colors tracking-tight">{task.title}</p>
                                                                    <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/40 mt-0.5">
                                                                        Sync {format(new Date(task.updatedAt), 'MMM d, h:mm a')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Badge variant="outline" className="font-black uppercase text-[8px] bg-muted/30 tracking-widest border-transparent">{task.status}</Badge>
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="tasks" className="mt-6 lg:mt-8">
                                    <div className="flex flex-col sm:flex-row gap-4 lg:items-center justify-between mb-6">
                                        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl backdrop-blur-md border border-primary/5 w-full sm:w-auto overflow-x-auto no-scrollbar">
                                            <Button variant="ghost" size="sm" className="flex-1 sm:flex-initial h-8 px-4 rounded-lg font-black text-[9px] uppercase tracking-widest bg-background shadow-md">
                                                <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                                                Kanban
                                            </Button>
                                            <Button variant="ghost" size="sm" className="flex-1 sm:flex-initial h-8 px-4 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-background/50 opacity-60">
                                                <TableIcon className="h-3.5 w-3.5 mr-1.5" />
                                                Table
                                            </Button>
                                            <Button variant="ghost" size="sm" className="flex-1 sm:flex-initial h-8 px-4 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-background/50 opacity-60">
                                                <List className="h-3.5 w-3.5 mr-1.5" />
                                                List
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <CreateTaskDialog projectId={projectId}>
                                                <Button size="sm" className="flex-1 sm:flex-initial h-9 px-5 rounded-xl font-black text-xs shadow-lg shadow-primary/20 tracking-tight">
                                                    <PlusCircle className="h-4 w-4 mr-2" />
                                                    Initiate Task
                                                </Button>
                                            </CreateTaskDialog>
                                            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl shrink-0 bg-background/50 border-primary/5 shadow-sm">
                                                <Filter className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="p-3 sm:p-5 rounded-3xl bg-muted/20 border border-primary/5 backdrop-blur-sm overflow-hidden min-h-[500px]">
                                        <ProjectKanban projectId={projectId} tasks={projectTasks} />
                                    </div>
                                </TabsContent>

                                <TabsContent value="notes" className="mt-8 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm lg:text-base font-black uppercase tracking-widest text-primary">Neural Archives</h3>
                                        <Link href="/notes">
                                            <Button variant="outline" size="sm" className="rounded-xl px-4 font-black text-[10px] uppercase tracking-widest h-8 bg-background/50 border-primary/5 shadow-sm">View vault</Button>
                                        </Link>
                                    </div>
                                    {projectNotes.length === 0 ? (
                                        <Card className="bg-background/40 backdrop-blur-sm border-dashed border-2 py-16 rounded-3xl opacity-20 grayscale">
                                            <CardContent className="flex flex-col items-center justify-center text-center">
                                                <FileText className="h-12 w-12 mb-4" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">No archives linked to this nexus</p>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            {projectNotes.map((note) => (
                                                <Card key={note.id} className="group relative overflow-hidden bg-background/40 backdrop-blur-xl border-primary/5 hover:border-primary/20 transition-all duration-300 shadow-lg rounded-2xl">
                                                    <CardHeader className="p-4 pb-2">
                                                        <CardTitle className="text-base font-black group-hover:text-primary transition-colors tracking-tight line-clamp-1">{note.title}</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4 pt-1">
                                                        <p className="text-[11px] font-medium text-muted-foreground/80 line-clamp-3 mb-6 leading-relaxed">{note.content}</p>
                                                        <div className="flex flex-wrap gap-1.5 pt-4 border-t border-primary/5">
                                                            {note.tags.slice(0, 3).map((tag) => (
                                                                <Badge key={tag} variant="secondary" className="px-2 py-0 h-4 rounded-md text-[8px] font-black uppercase tracking-widest bg-muted/50 border-transparent">{tag}</Badge>
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
                                        <h3 className="text-sm lg:text-base font-black uppercase tracking-widest text-primary">Strategic North Stars</h3>
                                        <Link href="/goals">
                                            <Button variant="outline" size="sm" className="rounded-xl px-4 font-black text-[10px] uppercase tracking-widest h-8 bg-background/50 border-primary/5 shadow-sm">Modify goals</Button>
                                        </Link>
                                    </div>
                                    {projectGoals.length === 0 ? (
                                        <Card className="bg-background/40 backdrop-blur-sm border-dashed border-2 py-16 rounded-3xl opacity-20 grayscale">
                                            <CardContent className="flex flex-col items-center justify-center text-center">
                                                <Target className="h-12 w-12 mb-4" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">Strategic objectives undefined</p>
                                            </CardContent>
                                        </Card>
                                    ) : (
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {projectGoals.map((goal) => (
                                                <Card key={goal.id} className="group overflow-hidden bg-background/40 backdrop-blur-xl border-primary/5 hover:border-primary/20 transition-all duration-300 shadow-lg rounded-3xl">
                                                    <CardContent className="p-5">
                                                        <div className="space-y-5">
                                                            <div className="flex items-start justify-between">
                                                                <div className="min-w-0 pr-4">
                                                                    <Badge variant="outline" className="mb-2 text-[8px] font-black uppercase tracking-tighter h-4 px-1.5 bg-emerald-500/5 text-emerald-600 border-emerald-500/20">Objective Active</Badge>
                                                                    <h4 className="font-black text-lg group-hover:text-primary transition-colors truncate tracking-tight">{goal.title}</h4>
                                                                    {goal.description && (
                                                                        <p className="text-[11px] font-medium text-muted-foreground/70 line-clamp-2 mt-1 leading-normal">{goal.description}</p>
                                                                    )}
                                                                </div>
                                                                <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                                                    <Target className="h-5 w-5" />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2.5">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Neural Progress</span>
                                                                    <span className="text-[10px] font-black text-primary">{goal.progress}%</span>
                                                                </div>
                                                                <Progress value={goal.progress} className="h-2 rounded-full bg-primary/10 shadow-inner" />
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
