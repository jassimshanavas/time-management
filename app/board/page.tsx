'use client';

import { useCallback, useState, useMemo } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Node,
    Edge,
    Connection,
    BackgroundVariant,
    Panel,
    Handle,
    Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { MainLayout } from '@/components/layout/main-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/lib/store';
import {
    Plus,
    Trash2,
    Download,
    Sparkles,
    Target,
    CheckSquare,
    Circle,
    Zap,
    RefreshCw,
    Hand,
    MousePointer,
} from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import { DataLoader } from '@/components/data-loader';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Toaster } from 'sonner';

// Custom Node Component with Handles
const TaskNode = ({ data, isConnectable }: { data: any; isConnectable: boolean }) => {
    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'done': return 'border-emerald-500/50 bg-emerald-500/5';
            case 'in-progress': return 'border-blue-500/50 bg-blue-500/5';
            default: return 'border-primary/5 bg-background/40';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]';
            case 'medium': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]';
            default: return 'bg-slate-400';
        }
    };

    return (
        <div className={`group backdrop-blur-xl rounded-xl border ${getStatusStyles(data.status)} min-w-[160px] max-w-[240px] shadow-xl transition-all hover:border-primary/30`}>
            {data.coverImage && (
                <div className="w-full h-16 overflow-hidden rounded-t-xl border-b border-primary/5">
                    <img src={data.coverImage} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                </div>
            )}
            <div className="p-2.5">
                <Handle
                    type="target"
                    position={Position.Top}
                    id="top"
                    isConnectable={isConnectable}
                    className="!w-3 !h-3 !bg-blue-500 !border-2 !border-background hover:!scale-125 transition-transform"
                />
                <Handle
                    type="source"
                    position={Position.Right}
                    id="right"
                    isConnectable={isConnectable}
                    className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background hover:!scale-125 transition-transform"
                />
                <Handle
                    type="target"
                    position={Position.Left}
                    id="left"
                    isConnectable={isConnectable}
                    className="!w-3 !h-3 !bg-blue-500 !border-2 !border-background hover:!scale-125 transition-transform"
                />
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="bottom"
                    isConnectable={isConnectable}
                    className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background hover:!scale-125 transition-transform"
                />

                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                        {data.type === 'task' && <CheckSquare className="h-3.5 w-3.5 text-primary" />}
                        {data.type === 'goal' && <Target className="h-3.5 w-3.5 text-emerald-500" />}
                        {data.type === 'idea' && <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
                        <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest bg-primary/5 border-transparent shadow-sm px-1 h-4">{data.type}</Badge>
                    </div>
                    <div className={`h-1.5 w-1.5 rounded-full ${getPriorityColor(data.priority)}`} />
                </div>
                <div className="font-black text-xs tracking-tight mb-1 group-hover:text-primary transition-colors line-clamp-1">{data.label}</div>
                {data.description && (
                    <div className="text-[10px] font-medium text-muted-foreground/70 line-clamp-1 leading-tight">{data.description}</div>
                )}
                {data.status && (
                    <Badge variant="secondary" className="mt-2 text-[8px] h-4 py-0 font-black uppercase tracking-widest bg-background/50">
                        {data.status}
                    </Badge>
                )}
            </div>
        </div>
    );
};

const nodeTypes = {
    taskNode: TaskNode,
};

export default function BoardPage() {
    const { tasks, goals, updateTask, selectedProjectId, projects } = useStore();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [panOnDrag, setPanOnDrag] = useState(true);
    const [newNode, setNewNode] = useState({
        label: '',
        description: '',
        type: 'idea' as 'task' | 'goal' | 'idea',
        priority: 'low' as 'high' | 'medium' | 'low',
        status: 'todo' as 'todo' | 'in-progress' | 'done',
    });

    const loadFromData = useCallback(() => {
        const filterByWorkspace = <T extends { projectId?: string }>(items: T[]) => {
            if (selectedProjectId === null) return items;
            if (selectedProjectId === 'personal') return items.filter((item) => !item.projectId);
            return items.filter((item) => item.projectId === selectedProjectId);
        };

        const filteredTasks = filterByWorkspace(tasks);
        const filteredGoals = filterByWorkspace(goals);

        const taskNodes: Node[] = filteredTasks.slice(0, 15).map((task, index) => ({
            id: `task-${task.id}`,
            type: 'taskNode',
            position: { x: 100 + (index % 3) * 350, y: 100 + Math.floor(index / 3) * 200 },
            data: {
                label: task.title,
                description: task.description,
                type: 'task',
                status: task.status,
                priority: task.priority,
                taskId: task.id,
                coverImage: task.coverImage,
            },
        }));

        const goalNodes: Node[] = filteredGoals.slice(0, 10).map((goal, index) => ({
            id: `goal-${goal.id}`,
            type: 'taskNode',
            position: { x: 600 + (index % 2) * 350, y: 500 + Math.floor(index / 2) * 200 },
            data: {
                label: goal.title,
                description: goal.description,
                type: 'goal',
                status: goal.progress === 100 ? 'done' : 'in-progress',
                priority: 'medium',
                goalId: goal.id,
            },
        }));

        const taskEdges: Edge[] = [];
        filteredTasks.forEach((task) => {
            if (task.dependencyIds && task.dependencyIds.length > 0) {
                task.dependencyIds.forEach((depId) => {
                    if (filteredTasks.some(t => t.id === depId)) {
                        taskEdges.push({
                            id: `e-${depId}-${task.id}`,
                            source: `task-${depId}`,
                            target: `task-${task.id}`,
                            animated: true,
                            style: { stroke: '#8b5cf6', strokeWidth: 3 },
                            type: 'smoothstep',
                        });
                    }
                });
            }
        });

        setNodes([...taskNodes, ...goalNodes]);
        setEdges(taskEdges);
        toast.success(`Infrastructure synchronized`);
    }, [tasks, goals, selectedProjectId, setNodes, setEdges]);

    const onConnect = useCallback(
        (connection: Connection) => {
            const newEdge = {
                ...connection,
                animated: true,
                style: { stroke: '#8b5cf6', strokeWidth: 3 },
                type: 'smoothstep',
            };
            setEdges((eds) => addEdge(newEdge, eds));

            const sourceNode = nodes.find((n) => n.id === connection.source);
            const targetNode = nodes.find((n) => n.id === connection.target);

            if (sourceNode?.data?.taskId && targetNode?.data?.taskId) {
                const sourceTaskId = sourceNode.data.taskId;
                const targetTaskId = targetNode.data.taskId;

                const targetTask = tasks.find((t) => t.id === targetTaskId);
                if (targetTask) {
                    const currentDeps = targetTask.dependencyIds || [];
                    if (!currentDeps.includes(sourceTaskId)) {
                        updateTask(targetTaskId, {
                            dependencyIds: [...currentDeps, sourceTaskId],
                        });
                        toast.success(
                            <div>
                                <div className="font-black uppercase tracking-widest text-[10px]">Neural Link Established</div>
                                <div className="text-xs font-medium opacity-70">{sourceNode.data.label} → {targetNode.data.label}</div>
                            </div>
                        );
                    }
                }
            }
        },
        [setEdges, nodes, tasks, updateTask]
    );

    const addNewNode = useCallback(() => {
        if (!newNode.label.trim()) {
            toast.error('Title required');
            return;
        }
        const newId = `node-${Date.now()}`;
        const newNodeData: Node = {
            id: newId,
            type: 'taskNode',
            position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 },
            data: {
                label: newNode.label,
                description: newNode.description,
                type: newNode.type,
                status: newNode.status,
                priority: newNode.priority,
            },
        };
        setNodes((nds) => [...nds, newNodeData]);
        setNewNode({
            label: '',
            description: '',
            type: 'idea',
            priority: 'low',
            status: 'todo',
        });
        setIsDialogOpen(false);
        toast.success('Card materialized on board');
    }, [newNode, setNodes]);

    const clearBoard = useCallback(() => {
        if (window.confirm('Dissolve the entire board? Historical data remains safe.')) {
            setNodes([]);
            setEdges([]);
            toast.success('Canvas reset');
        }
    }, [setNodes, setEdges]);

    const saveBoard = useCallback(() => {
        const boardData = { nodes, edges, timestamp: new Date().toISOString() };
        const dataStr = JSON.stringify(boardData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `neural-board-${Date.now()}.json`;
        link.click();
        toast.success('Neuro-mapping exported');
    }, [nodes, edges]);

    const dependencyCount = useMemo(() => {
        return tasks.reduce((count, task) => count + (task.dependencyIds?.length || 0), 0);
    }, [tasks]);

    return (
        <ProtectedRoute>
            <DataLoader>
                <MainLayout>
                    <Toaster position="top-right" richColors />
                    <div className="h-full flex flex-col bg-background/50 animate-in fade-in duration-700">
                        <div className="mb-6 p-4 sm:p-0">
                            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                                        <Sparkles className="h-6 w-6 text-primary" />
                                        Visual Architect
                                    </h1>
                                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Map your strategic dependencies and neural flows</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {selectedProjectId && (
                                        <Badge variant="outline" className="h-8 px-3 flex items-center gap-1.5 bg-background/40 backdrop-blur-sm border-primary/10 text-[10px] font-bold">
                                            <span className="text-muted-foreground hidden sm:inline">Context:</span>
                                            {selectedProjectId === 'personal' ? 'Personal' : projects.find(p => p.id === selectedProjectId)?.name}
                                        </Badge>
                                    )}
                                    <div className="flex items-center gap-1 bg-muted/40 backdrop-blur-sm p-1 rounded-xl border border-primary/5 shadow-lg">
                                        <Button
                                            size="sm"
                                            variant={panOnDrag ? 'default' : 'ghost'}
                                            onClick={() => setPanOnDrag(true)}
                                            className="h-8 px-3 rounded-lg font-bold gap-1.5 text-xs"
                                        >
                                            <Hand className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Navigate</span>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={!panOnDrag ? 'default' : 'ghost'}
                                            onClick={() => setPanOnDrag(false)}
                                            className="h-8 px-3 rounded-lg font-bold gap-1.5 text-xs"
                                        >
                                            <MousePointer className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Connect</span>
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-background/50 backdrop-blur-sm shadow-md shrink-0" onClick={loadFromData}>
                                            <RefreshCw className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-background/50 backdrop-blur-sm shadow-md shrink-0" onClick={saveBoard}>
                                            <Download className="h-3.5 w-3.5" />
                                        </Button>
                                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button className="h-8 flex-1 sm:px-4 rounded-lg shadow-md shadow-primary/10 bg-primary font-black text-xs">
                                                    <Plus className="h-4 w-4 mr-1.5" />
                                                    Add
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-[400px] rounded-3xl">
                                                <DialogHeader>
                                                    <DialogTitle className="text-xl font-black tracking-tight">Project Card</DialogTitle>
                                                    <DialogDescription>Infuse new data into the neural board</DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4 pt-4">
                                                    <div className="space-y-2">
                                                        <Label className="font-bold">Title</Label>
                                                        <Input
                                                            value={newNode.label}
                                                            onChange={(e) => setNewNode({ ...newNode, label: e.target.value })}
                                                            placeholder="Core objective..."
                                                            className="h-11 rounded-xl bg-muted/30"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="font-bold">Telemetry</Label>
                                                        <Textarea
                                                            value={newNode.description}
                                                            onChange={(e) => setNewNode({ ...newNode, description: e.target.value })}
                                                            placeholder="Add nuance..."
                                                            className="rounded-xl bg-muted/30 min-h-[100px]"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Type</Label>
                                                            <select
                                                                className="w-full h-10 px-3 border-transparent rounded-xl bg-muted/50 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                                                value={newNode.type}
                                                                onChange={(e) => setNewNode({ ...newNode, type: e.target.value as any })}
                                                            >
                                                                <option value="idea">Idea</option>
                                                                <option value="task">Task</option>
                                                                <option value="goal">Goal</option>
                                                            </select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Priority</Label>
                                                            <select
                                                                className="w-full h-10 px-3 border-transparent rounded-xl bg-muted/50 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                                                                value={newNode.priority}
                                                                onChange={(e) => setNewNode({ ...newNode, priority: e.target.value as any })}
                                                            >
                                                                <option value="low">Standard</option>
                                                                <option value="medium">Medium</option>
                                                                <option value="high">Critical</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <Button onClick={addNewNode} className="w-full h-12 rounded-2xl font-black shadow-lg shadow-primary/20">Instantiate Card</Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-destructive/5 hover:bg-destructive/10 text-destructive border-destructive/10 shrink-0" onClick={clearBoard}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Card className="flex-1 overflow-hidden relative bg-background/40 backdrop-blur-xl border-primary/5 shadow-2xl rounded-3xl border-2">
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                nodeTypes={nodeTypes}
                                panOnDrag={panOnDrag}
                                selectionOnDrag={!panOnDrag}
                                fitView
                                attributionPosition="bottom-left"
                                defaultEdgeOptions={{
                                    type: 'smoothstep',
                                    animated: true,
                                    style: { stroke: 'hsl(var(--primary))', strokeWidth: 3, opacity: 0.6 },
                                }}
                            >
                                <Background variant={BackgroundVariant.Dots} gap={30} size={1} color="hsl(var(--primary)/.1)" />
                                <Controls
                                    showInteractive={false}
                                    className="bg-background/80 backdrop-blur-md border-primary/10 rounded-xl overflow-hidden shadow-2xl !left-auto !right-4 !bottom-4 !flex !flex-row"
                                />
                                <MiniMap
                                    nodeStrokeWidth={3}
                                    zoomable
                                    pannable
                                    className="!bg-background/80 !backdrop-blur-md !border-primary/10 !rounded-2xl !shadow-2xl !right-4 !top-4 !left-auto !w-48 !h-32"
                                />

                                <Panel position="top-left" className="bg-background/80 backdrop-blur-xl p-6 rounded-3xl border border-primary/10 shadow-2xl space-y-4 max-w-[240px] hidden sm:block">
                                    <div className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-primary">
                                        {panOnDrag ? <Zap className="h-4 w-4" /> : <MousePointer className="h-4 w-4" />}
                                        {panOnDrag ? 'Flow Active' : 'Neural Linker'}
                                    </div>
                                    <div className="space-y-3 leading-tight">
                                        {panOnDrag ? (
                                            <div className="text-[10px] font-medium text-muted-foreground/80 space-y-1">
                                                <p>• Transverse the board</p>
                                                <p>• Observe global architectures</p>
                                                <p>• Switch to <span className="text-primary font-bold">Connect</span> to link</p>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-medium text-muted-foreground/80 space-y-1">
                                                <p>• Bridge nodes via handles</p>
                                                <p>• Blue = Synaptic Input</p>
                                                <p>• Purple = Synaptic Output</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="pt-4 space-y-2 border-t border-primary/5">
                                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-tighter">
                                            <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                                            Critical Objectives
                                        </div>
                                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-tighter">
                                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                                            Secondary Phase
                                        </div>
                                    </div>
                                </Panel>

                                <Panel position="bottom-left" className="bg-background/80 backdrop-blur-xl p-4 px-6 rounded-full border border-primary/10 shadow-2xl flex items-center gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Neurons</span>
                                        <span className="text-xl font-black tabular-nums">{nodes.length}</span>
                                    </div>
                                    <div className="h-6 w-px bg-primary/10" />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Synapses</span>
                                        <span className="text-xl font-black tabular-nums">{edges.length}</span>
                                    </div>
                                    <div className="h-6 w-px bg-primary/10" />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/80">Links</span>
                                        <span className="text-xl font-black tabular-nums text-primary">{dependencyCount}</span>
                                    </div>
                                </Panel>
                            </ReactFlow>
                        </Card>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="pl-1.5 pr-2.5 h-7 rounded-full bg-background/50 backdrop-blur-sm border-primary/5 font-black text-[8px] uppercase tracking-widest gap-1.5">
                                <div className="h-1 w-1 rounded-full bg-slate-400" />
                                {nodes.length} Nodes
                            </Badge>
                            <Badge variant="secondary" className="pl-1.5 pr-2.5 h-7 rounded-full bg-background/50 backdrop-blur-sm border-primary/5 font-black text-[8px] uppercase tracking-widest gap-1.5">
                                <div className="h-1 w-1 rounded-full bg-blue-500 animate-pulse" />
                                {edges.length} Synapses
                            </Badge>
                            <Badge className="pl-1.5 pr-2.5 h-7 rounded-full bg-primary/10 text-primary border-primary/5 font-black text-[8px] uppercase tracking-widest gap-1.5">
                                <div className="h-1 w-1 rounded-full bg-primary" />
                                {dependencyCount} Links
                            </Badge>
                        </div>
                    </div>
                </MainLayout>
            </DataLoader>
        </ProtectedRoute>
    );
}
