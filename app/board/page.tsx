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
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'done': return 'border-green-500 bg-green-50 dark:bg-green-950/20';
            case 'in-progress': return 'border-blue-500 bg-blue-50 dark:bg-blue-950/20';
            default: return 'border-gray-300 bg-white dark:bg-gray-950';
        }
    };

    const getPriorityDot = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-500';
            case 'medium': return 'bg-yellow-500';
            default: return 'bg-gray-400';
        }
    };

    return (
        <div className={`group px-4 py-3 shadow-lg rounded-lg border-2 ${getStatusColor(data.status)} min-w-[200px] max-w-[300px] relative`}>
            {/* Connection Handles - These create the connection points */}
            <Handle
                type="target"
                position={Position.Top}
                id="top"
                isConnectable={isConnectable}
                className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white hover:!w-4 hover:!h-4 transition-all"
            />
            <Handle
                type="source"
                position={Position.Right}
                id="right"
                isConnectable={isConnectable}
                className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white hover:!w-4 hover:!h-4 transition-all"
            />
            <Handle
                type="target"
                position={Position.Left}
                id="left"
                isConnectable={isConnectable}
                className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white hover:!w-4 hover:!h-4 transition-all"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="bottom"
                isConnectable={isConnectable}
                className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white hover:!w-4 hover:!h-4 transition-all"
            />

            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                    {data.type === 'task' && <CheckSquare className="h-4 w-4" />}
                    {data.type === 'goal' && <Target className="h-4 w-4" />}
                    {data.type === 'idea' && <Sparkles className="h-4 w-4" />}
                    <Badge variant="outline" className="text-xs">{data.type}</Badge>
                </div>
                <div className={`h-2 w-2 rounded-full ${getPriorityDot(data.priority)}`} />
            </div>
            <div className="font-semibold text-sm mb-1">{data.label}</div>
            {data.description && (
                <div className="text-xs text-muted-foreground line-clamp-2">{data.description}</div>
            )}
            {data.status && (
                <Badge variant="secondary" className="mt-2 text-xs">
                    {data.status}
                </Badge>
            )}
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
    const [panOnDrag, setPanOnDrag] = useState(true); // Toggle for interaction mode
    const [newNode, setNewNode] = useState({
        label: '',
        description: '',
        type: 'idea' as 'task' | 'goal' | 'idea',
        priority: 'low' as 'high' | 'medium' | 'low',
        status: 'todo' as 'todo' | 'in-progress' | 'done',
    });

    // Initialize with existing tasks and goals
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

        // Create edges from existing dependencies
        const taskEdges: Edge[] = [];
        filteredTasks.forEach((task) => {
            if (task.dependencyIds && task.dependencyIds.length > 0) {
                task.dependencyIds.forEach((depId) => {
                    // Only add edge if source node also exists in filtered tasks
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
        toast.success(`Loaded ${taskNodes.length} tasks and ${goalNodes.length} goals from current workspace`);
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
                                <div className="font-semibold">Dependency Created!</div>
                                <div className="text-xs">{sourceNode.data.label} → {targetNode.data.label}</div>
                            </div>,
                            { duration: 3000 }
                        );
                    }
                }
            }
        },
        [setEdges, nodes, tasks, updateTask]
    );

    const addNewNode = useCallback(() => {
        if (!newNode.label.trim()) {
            toast.error('Please enter a title');
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
        toast.success('Node added to board!');
    }, [newNode, setNodes]);

    const clearBoard = useCallback(() => {
        if (window.confirm('Clear the entire board? Your tasks won\'t be deleted.')) {
            setNodes([]);
            setEdges([]);
            toast.success('Board cleared');
        }
    }, [setNodes, setEdges]);

    const saveBoard = useCallback(() => {
        const boardData = { nodes, edges, timestamp: new Date().toISOString() };
        const dataStr = JSON.stringify(boardData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `timeflow-board-${Date.now()}.json`;
        link.click();
        toast.success('Board exported!');
    }, [nodes, edges]);

    const dependencyCount = useMemo(() => {
        return tasks.reduce((count, task) => count + (task.dependencyIds?.length || 0), 0);
    }, [tasks]);

    return (
        <ProtectedRoute>
            <DataLoader>
                <MainLayout>
                    <Toaster position="top-right" richColors />
                    <div className="h-[calc(100vh-120px)] flex flex-col">
                        <div className="mb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                                        <Sparkles className="h-8 w-8 text-purple-500" />
                                        Visual Board
                                    </h1>
                                    <p className="text-muted-foreground">Drag nodes and create connections</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedProjectId && (
                                        <Badge variant="outline" className="h-9 px-4 hidden md:flex items-center gap-2 mr-2">
                                            <span className="text-muted-foreground mr-1">Workspace:</span>
                                            {selectedProjectId === 'personal' ? 'Personal' : projects.find(p => p.id === selectedProjectId)?.name}
                                        </Badge>
                                    )}
                                    {/* Mode Toggle */}
                                    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                                        <Button
                                            size="sm"
                                            variant={panOnDrag ? 'default' : 'ghost'}
                                            onClick={() => setPanOnDrag(true)}
                                            className="gap-2"
                                        >
                                            <Hand className="h-4 w-4" />
                                            Pan
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={!panOnDrag ? 'default' : 'ghost'}
                                            onClick={() => setPanOnDrag(false)}
                                            className="gap-2"
                                        >
                                            <MousePointer className="h-4 w-4" />
                                            Select
                                        </Button>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={loadFromData}>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Load
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={saveBoard}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Export
                                    </Button>
                                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button size="sm">
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Add New Node</DialogTitle>
                                                <DialogDescription>Create a card on your board</DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label>Title</Label>
                                                    <Input
                                                        value={newNode.label}
                                                        onChange={(e) => setNewNode({ ...newNode, label: e.target.value })}
                                                        placeholder="What's this about?"
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Description</Label>
                                                    <Textarea
                                                        value={newNode.description}
                                                        onChange={(e) => setNewNode({ ...newNode, description: e.target.value })}
                                                        placeholder="Add details..."
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label>Type</Label>
                                                        <select
                                                            className="w-full p-2 border rounded-md"
                                                            value={newNode.type}
                                                            onChange={(e) => setNewNode({ ...newNode, type: e.target.value as any })}
                                                        >
                                                            <option value="idea">Idea</option>
                                                            <option value="task">Task</option>
                                                            <option value="goal">Goal</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <Label>Priority</Label>
                                                        <select
                                                            className="w-full p-2 border rounded-md"
                                                            value={newNode.priority}
                                                            onChange={(e) => setNewNode({ ...newNode, priority: e.target.value as any })}
                                                        >
                                                            <option value="low">Low</option>
                                                            <option value="medium">Medium</option>
                                                            <option value="high">High</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <Button onClick={addNewNode} className="w-full">Create</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                    <Button variant="destructive" size="sm" onClick={clearBoard}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Clear
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <Card className="flex-1 overflow-hidden">
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
                                    style: { stroke: '#8b5cf6', strokeWidth: 3 },
                                }}
                            >
                                <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                                <Controls showInteractive={false} />
                                <MiniMap nodeStrokeWidth={3} zoomable pannable className="bg-background border rounded-lg" />

                                <Panel position="top-left" className="bg-background/95 backdrop-blur-sm p-4 rounded-lg border space-y-2">
                                    <div className="text-sm font-semibold flex items-center gap-2">
                                        {panOnDrag ? <Hand className="h-4 w-4" /> : <MousePointer className="h-4 w-4" />}
                                        {panOnDrag ? 'Pan Mode' : 'Select Mode'}
                                    </div>
                                    <div className="text-xs space-y-1 text-muted-foreground">
                                        {panOnDrag ? (
                                            <>
                                                <div>• Drag background to pan</div>
                                                <div>• Click "Select" mode to connect</div>
                                            </>
                                        ) : (
                                            <>
                                                <div>• Drag nodes to move</div>
                                                <div>• Drag from colored dots to connect</div>
                                                <div>• Blue dots = receive connections</div>
                                                <div>• Purple dots = send connections</div>
                                            </>
                                        )}
                                    </div>
                                    <div className="pt-2 space-y-1 border-t">
                                        <div className="flex items-center gap-2 text-xs">
                                            <div className="h-2 w-2 rounded-full bg-red-500" />
                                            High Priority
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                            Medium
                                        </div>
                                    </div>
                                </Panel>

                                <Panel position="bottom-right" className="bg-primary/10 backdrop-blur-sm p-3 rounded-lg border">
                                    <div className="text-xs font-semibold text-primary">Dependencies</div>
                                    <div className="text-2xl font-bold text-primary">{dependencyCount}</div>
                                    <div className="text-xs text-muted-foreground">saved</div>
                                </Panel>
                            </ReactFlow>
                        </Card>

                        <div className="mt-4 flex items-center gap-4">
                            <Badge variant="secondary">
                                <Circle className="h-3 w-3 mr-1" />
                                {nodes.length} Nodes
                            </Badge>
                            <Badge variant="secondary">
                                <Zap className="h-3 w-3 mr-1" />
                                {edges.length} Connections
                            </Badge>
                            <Badge variant="default">
                                <CheckSquare className="h-3 w-3 mr-1" />
                                {dependencyCount} Dependencies
                            </Badge>
                        </div>
                    </div>
                </MainLayout>
            </DataLoader>
        </ProtectedRoute>
    );
}
