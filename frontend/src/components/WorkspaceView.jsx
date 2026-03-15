import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Tree, ConfigProvider, theme } from 'antd';
import Editor from '@monaco-editor/react';
import {
    ShieldCheck,
    FolderGit2,
    Zap,
    Target,
    Settings2,
    Puzzle,
    FileCode,
    FileJson,
    FolderTree,
    FolderKanban,
    Database,
    Package,
    TerminalSquare,
    ChevronRight,
    Search,
    MoreVertical,
    Plus,
    Upload,
    Save,
    Play,
    Trash2,
    ChevronLeft,
    Box,
    Globe,
    Clock,
    LayoutDashboard,
    Pencil,
    Trash,
    Cpu,
    Activity,
    Terminal,
    X,
    RefreshCw,
    Monitor
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from '@/hooks/useWorkspace';
import { cn } from '@/lib/utils';
import RunDashboard from './RunDashboard';
import ComputeView from './ComputeView';
import ComponentInfoPanel from './ComponentInfoPanel';

const ICON_MAP = {
    root: <ShieldCheck className="w-4 h-4 text-blue-500" />,
    project: <FolderGit2 className="w-4 h-4 text-orange-500" />,
    category: <FolderTree className="w-3.5 h-3.5 text-slate-400" />,
    dataset: <Database className="w-3.5 h-3.5 text-indigo-500" />,
    runs: <TerminalSquare className="w-3.5 h-3.5 text-emerald-500" />,
    models: <Package className="w-3.5 h-3.5 text-pink-500" />,
    custom: <FolderKanban className="w-3.5 h-3.5 text-teal-400" />,
    activations: <Zap className="w-3.5 h-3.5 text-yellow-500" />,
    losses: <Target className="w-3.5 h-3.5 text-red-500" />,
    optimizers: <Settings2 className="w-3.5 h-3.5 text-purple-500" />,
    custom_components: <Puzzle className="w-3.5 h-3.5 text-teal-500" />,
    json: <FileJson className="w-3.5 h-3.5 text-yellow-600" />,
    file: <FileCode className="w-3.5 h-3.5 text-blue-400" />
};

const CATEGORY_ICONS = {
    activations: Zap,
    losses: Target,
    optimizers: Settings2,
    custom_components: Puzzle
};

export default function WorkspaceView() {
    const {
        treeData,
        addProject,
        addFile,
        renameNode,
        updateFileContent,
        deleteNode,
        getMetadata,
        getPath,
        findNode
    } = useWorkspace();

    const [selectedKey, setSelectedKey] = useState(null);
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [componentModalOpen, setComponentModalOpen] = useState(false);
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newFileName, setNewFileName] = useState('');
    const [editingNode, setEditingNode] = useState(null);
    const [activeComponentType, setActiveComponentType] = useState(null);
    const [initializingRunProject, setInitializingRunProject] = useState(null);

    const [terminalOpen, setTerminalOpen] = useState(false);
    const [terminalLogs, setTerminalLogs] = useState([]);
    const [systemInfo, setSystemInfo] = useState(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const terminalEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const selectedNode = useMemo(() => findNode(selectedKey), [selectedKey, treeData]);
    const metadata = useMemo(() => getMetadata(selectedKey), [selectedKey, treeData]);
    const path = useMemo(() => getPath(selectedKey), [selectedKey, treeData]);

    const currentLang = useMemo(() => {
        if (!selectedNode || selectedNode.type !== 'file') return 'javascript';
        const ext = selectedNode.extension;
        if (ext === 'py') return 'python';
        if (ext === 'js') return 'javascript';
        if (ext === 'json') return 'json';
        if (ext === 'html') return 'html';
        if (ext === 'css') return 'css';
        return 'javascript';
    }, [selectedNode]);

    // Auto-scroll terminal
    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [terminalLogs]);

    useEffect(() => {
        setInitializingRunProject(null);
    }, [selectedKey]);

    // System info polling
    useEffect(() => {
        let interval;
        if (terminalOpen) {
            const fetchInfo = async () => {
                try {
                    const res = await fetch('http://localhost:8000/api/workspace/system-info');
                    if (res.ok) {
                        const data = await res.json();
                        setSystemInfo(data);
                    }
                } catch (e) {
                    console.error("Failed to fetch system info", e);
                }
            };
            fetchInfo();
            interval = setInterval(fetchInfo, 3000);
        }
        return () => clearInterval(interval);
    }, [terminalOpen]);

    const handleCompile = async () => {
        if (!selectedNode || selectedNode.type !== 'file') return;

        const filePath = path.map(p => p.title).join('/');
        let projectName = null;
        if (selectedNode) {
            // Traverse up to find the project root
            const rootPath = path.find(p => p.type === 'project');
            if (rootPath) {
                projectName = rootPath.title;
            }
        }

        if (!projectName) {
            alert("Please select a file inside a project to compile.");
            return;
        }

        setIsExecuting(true);
        setTerminalOpen(true);
        const timestamp = new Date().toLocaleTimeString();
        setTerminalLogs(prev => [...prev, { type: 'system', text: `[${timestamp}] > Executing ${selectedNode.title}...` }]);

        try {
            const response = await fetch('http://localhost:8000/api/workspace/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_path: selectedKey,
                    language: currentLang
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || `Server error: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.stdout) {
                setTerminalLogs(prev => [...prev, { type: 'stdout', text: data.stdout }]);
            }
            if (data.stderr) {
                setTerminalLogs(prev => [...prev, { type: 'stderr', text: data.stderr }]);
            }
            setTerminalLogs(prev => [...prev, { type: 'system', text: `> Process exited with code ${data.exit_code} (${data.execution_time}s)` }]);

        } catch (error) {
            setTerminalLogs(prev => [...prev, { type: 'stderr', text: `Error: ${error.message}` }]);
        } finally {
            setIsExecuting(false);
        }
    };

    const onSelect = (keys) => {
        if (keys[0]) setSelectedKey(keys[0]);
    };

    const handleCreateProject = () => {
        if (newProjectName) {
            const key = addProject(newProjectName);
            setNewProjectName('');
            setProjectModalOpen(false);
            setSelectedKey(key);
        }
    };

    const handleCreateFile = (method) => {
        if (!newFileName || !activeComponentType) return;

        if (method === 'neuro') {
            const ext = 'py';
            const name = newFileName.includes('.') ? newFileName : `${newFileName}.${ext}`;
            const template = '';
            addFile(activeComponentType.key, name, template, true);
        } else {
            fileInputRef.current?.click();
        }

        setNewFileName('');
        setComponentModalOpen(false);
    };

    const handleLanguageChange = (newLang) => {
        if (!selectedNode || !selectedKey) return;
        const langExts = { 'javascript': 'js', 'python': 'py', 'json': 'json', 'html': 'html', 'css': 'css' };
        const newExt = langExts[newLang];
        if (!newExt) return;

        const baseName = selectedNode.title.includes('.') ? selectedNode.title.split('.').slice(0, -1).join('.') : selectedNode.title;
        const newName = `${baseName}.${newExt}`;

        renameNode(selectedKey, newName);
    };

    const handleRename = () => {
        if (editingNode && newFileName) {
            renameNode(editingNode.key, newFileName);
            setNewFileName('');
            setRenameModalOpen(false);
            setEditingNode(null);
            setSelectedKey(editingNode.key);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file && activeComponentType) {
            const reader = new FileReader();
            reader.onload = (event) => {
                addFile(activeComponentType.key, file.name, event.target.result, false);
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Contextual Header / Breadcrumbs */}
            <div className="flex items-center justify-between px-6 py-3 border-b shrink-0 bg-white z-10">
                <div className="flex items-center gap-2 overflow-hidden">
                    <LayoutDashboard className="w-4 h-4 text-slate-400 shrink-0" />
                    <nav className="flex items-center text-[13px] text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">
                        {path.length === 0 ? (
                            <span className="font-semibold text-slate-900">Workspace Root</span>
                        ) : (
                            path.map((p, i) => (
                                <React.Fragment key={p.key}>
                                    <button
                                        className={cn(
                                            "hover:text-orange-600 transition-colors capitalize",
                                            i === path.length - 1 ? "font-semibold text-slate-900" : ""
                                        )}
                                        onClick={() => setSelectedKey(p.key)}
                                    >
                                        {p.title}
                                    </button>
                                    {i < path.length - 1 && <ChevronRight className="w-3 h-3 mx-1 text-slate-300 shrink-0" />}
                                </React.Fragment>
                            ))
                        )}
                    </nav>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {selectedNode?.type === 'root' && (
                        <Button size="sm" className="h-8 bg-orange-600 hover:bg-orange-700 gap-1.5" onClick={() => setProjectModalOpen(true)}>
                            <Plus className="w-3.5 h-3.5" />
                            New Project
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* File Explorer */}
                <div className="w-64 border-r bg-slate-50/30 flex flex-col shrink-0">
                    <div className="p-3 border-b bg-white">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Filter workspace..."
                                className="pl-8 h-8 text-[12px] bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-slate-200"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto p-2 custom-scrollbar">
                        <ConfigProvider
                            theme={{
                                token: {
                                    fontSize: 13,
                                    colorText: '#475569',
                                    colorPrimary: '#f97316',
                                },
                                components: {
                                    Tree: {
                                        directoryNodeSelectedBg: '#ffedd5',
                                        nodeSelectedBg: '#ffedd5',
                                        nodeHoverBg: '#f1f5f9',
                                    }
                                }
                            }}
                        >
                            <Tree
                                blockNode
                                treeData={treeData}
                                onSelect={onSelect}
                                selectedKeys={selectedKey ? [selectedKey] : []}
                                switcherIcon={<ChevronRight className="w-3.5 h-3.5 mt-1" />}
                                titleRender={(node) => (
                                    <div className="flex items-center justify-between group/node w-full py-1">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="shrink-0">
                                                {node.title === 'config.json' ? ICON_MAP['json'] :
                                                    ICON_MAP[node.title.toLowerCase()] ||
                                                    ICON_MAP[node.categoryId] ||
                                                    ICON_MAP[node.type] || <FolderTree className="w-3.5 h-3.5" />}
                                            </span>
                                            <span className="truncate text-[13px]">{node.title}</span>
                                        </div>
                                        {node.key !== 'root' && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        className="p-1 opacity-0 group-hover/node:opacity-100 hover:bg-slate-200 rounded transition-all shrink-0"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MoreVertical className="w-3 h-3 text-slate-500" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-36 py-1">
                                                    {(node.type === 'category' || node.type === 'project') && (
                                                        <>
                                                            <DropdownMenuItem className="text-[12px] py-1" onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveComponentType({ key: node.key, name: node.title });
                                                                setComponentModalOpen(true);
                                                            }}>
                                                                <Plus className="w-3.5 h-3.5 mr-2" /> New File
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="my-1" />
                                                        </>
                                                    )}
                                                    <DropdownMenuItem className="text-[12px] py-1" onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingNode(node);
                                                        setNewFileName(node.title);
                                                        setRenameModalOpen(true);
                                                    }}>
                                                        <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-[12px] py-1 text-red-500"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm(`Delete ${node.title}?`)) {
                                                                deleteNode(node.key);
                                                                if (selectedKey === node.key) setSelectedKey(null);
                                                            }
                                                        }}
                                                    >
                                                        <Trash className="w-3.5 h-3.5 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                )}
                            />
                        </ConfigProvider>
                    </div>
                </div>

                {/* Main View Area */}
                <div className="flex-1 overflow-hidden bg-white">
                    {selectedNode?.type === 'file' ? (
                        <div className="flex flex-col h-full">
                            <div className="px-4 py-2 border-b bg-slate-50 flex items-center justify-between relative z-20">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 pr-4 border-slate-200">
                                        {selectedNode.title.endsWith('.json') ? <FileJson className="w-4 h-4 text-yellow-600" /> : <FileCode className="w-4 h-4 text-blue-500" />}
                                        <span className="text-[13px] font-bold text-slate-700">{selectedNode.title}</span>
                                        {selectedNode.isNeuroCode && (
                                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">NeuroCode</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select
                                        value={currentLang}
                                        onValueChange={handleLanguageChange}
                                        disabled={selectedNode?.readOnly}
                                    >
                                        <SelectTrigger className="h-7 text-[11px] w-[110px] bg-white border-slate-200 shadow-none">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="python" className="text-[11px]">Python</SelectItem>
                                            <SelectItem value="javascript" className="text-[11px]">JavaScript</SelectItem>
                                            <SelectItem value="json" className="text-[11px]">JSON</SelectItem>
                                            <SelectItem value="html" className="text-[11px]">HTML</SelectItem>
                                            <SelectItem value="css" className="text-[11px]">CSS</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1 px-2 border-slate-200" onClick={() => updateFileContent(selectedKey, selectedNode.content)}>
                                        <Save className="w-3 h-3" /> Save
                                    </Button>
                                    <Button
                                        size="sm"
                                        disabled={isExecuting}
                                        className={cn(
                                            "h-7 text-[11px] gap-1 px-2 transition-all duration-300",
                                            "bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-500/20 text-white border-none"
                                        )}
                                        onClick={handleCompile}
                                    >
                                        {isExecuting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                                        {isExecuting ? 'Running...' : 'Compile'}
                                    </Button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden flex bg-white">
                                <div className={cn(
                                    "h-full overflow-hidden transition-all duration-300",
                                    ["activations", "losses", "optimizers"].includes(selectedNode?.categoryId) ? "w-[70%]" : "w-full"
                                )}>
                                    <Editor
                                        height="100%"
                                        language={currentLang}
                                        theme="vs-light"
                                        value={selectedNode.content}
                                        onChange={(val) => updateFileContent(selectedKey, val)}
                                        options={{
                                            readOnly: selectedNode?.readOnly,
                                            fontSize: 13,
                                            minimap: { enabled: true, scale: 1 },
                                            wordWrap: 'on',
                                            bracketPairColorization: { enabled: true },
                                            automaticLayout: true,
                                            scrollBeyondLastLine: false,
                                            lineNumbers: 'on',
                                            renderLineHighlight: 'all',
                                            fontFamily: 'JetBrains Mono, monospace',
                                            cursorBlinking: 'smooth',
                                            smoothScrolling: true,
                                            glyphMargin: true
                                        }}
                                    />
                                </div>
                                {["activations", "losses", "optimizers"].includes(selectedNode?.categoryId) && (
                                    <ComponentInfoPanel
                                        categoryId={selectedNode.categoryId}
                                        onInject={(code) => updateFileContent(selectedKey, code)}
                                    />
                                )}
                            </div>

                            {/* Dashboard / Terminal Panel */}
                            {terminalOpen && (
                                <div className="h-64 border-t bg-[#0f172a] text-slate-300 flex flex-col shrink-0 animate-in slide-in-from-bottom duration-300 relative z-30">
                                    <div className="flex items-center justify-between px-4 py-2 bg-[#1e293b] border-b border-slate-700/50">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0f172a] border border-slate-700">
                                                <TerminalSquare className="w-3.5 h-3.5 text-orange-400" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Debug Terminal</span>
                                            </div>
                                            <div className="h-4 w-px bg-slate-700" />
                                            <div className="flex items-center gap-4 text-[11px]">
                                                <div className="flex items-center gap-1.5">
                                                    <Cpu className="w-3.5 h-3.5 text-blue-400" />
                                                    <span>CPU: <span className="text-white font-mono">{systemInfo?.cpu_percent || 0}%</span></span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Activity className="w-3.5 h-3.5 text-green-400" />
                                                    <span>RAM: <span className="text-white font-mono">{systemInfo?.ram_percent || 0}%</span></span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setTerminalLogs([])}
                                                className="p-1 hover:bg-slate-700 rounded text-slate-400"
                                                title="Clear Terminal"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setTerminalOpen(false)}
                                                className="p-1 hover:bg-slate-700 rounded text-slate-400"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-1 overflow-hidden">
                                        {/* Terminal Output */}
                                        <div className="flex-1 overflow-auto p-4 font-mono text-[12px] custom-scrollbar selection:bg-orange-500/30">
                                            {terminalLogs.length === 0 && (
                                                <div className="text-slate-500 italic">Terminal ready. Click Compile to execute code.</div>
                                            )}
                                            {terminalLogs.map((log, i) => (
                                                <div key={i} className={cn(
                                                    "mb-1 break-all",
                                                    log.type === 'system' ? "text-orange-400 font-bold" :
                                                        log.type === 'stderr' ? "text-red-400" : "text-slate-200"
                                                )}>
                                                    <pre className="whitespace-pre-wrap">{log.text}</pre>
                                                </div>
                                            ))}
                                            <div ref={terminalEndRef} />
                                        </div>

                                        {/* System Configuration Panel */}
                                        <div className="w-64 border-l border-slate-700/50 bg-[#0f172a]/50 p-4 overflow-auto custom-scrollbar">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Monitor className="w-4 h-4 text-orange-400" />
                                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">System Runtime</span>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-[10px] font-bold">
                                                        <span className="text-slate-500">MEMORY USAGE</span>
                                                        <span className="text-white">{systemInfo?.ram_used_gb || 0} / {systemInfo?.ram_total_gb || 0} GB</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-green-500 transition-all duration-500"
                                                            style={{ width: `${systemInfo?.ram_percent || 0}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-[10px] font-bold">
                                                        <span className="text-slate-500">CPU LOAD</span>
                                                        <span className="text-white">{systemInfo?.cpu_percent || 0}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500 transition-all duration-500"
                                                            style={{ width: `${systemInfo?.cpu_percent || 0}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-slate-800 space-y-2">
                                                    <div className="flex items-center gap-2 text-[11px]">
                                                        <Globe className="w-3.5 h-3.5 text-slate-500" />
                                                        <span className="text-slate-400 truncate tracking-tight">{systemInfo?.os_name || 'Detecting...'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px]">
                                                        <div className="w-3.5 h-3.5 rounded-full border border-slate-500 flex items-center justify-center text-[8px] text-slate-500 font-bold">P</div>
                                                        <span className="text-slate-400 truncate tracking-tight">Python {systemInfo?.python_version || '...'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : selectedNode?.categoryId === 'runs' ? (
                        initializingRunProject ? (
                            <ComputeView
                                projectName={initializingRunProject}
                                onCancel={() => setInitializingRunProject(null)}
                            />
                        ) : (
                            <RunDashboard
                                projectName={path.find(p => p.type === 'project')?.title}
                                onInitializeClick={() => {
                                    const projTitle = path.find(p => p.type === 'project')?.title;
                                    if (projTitle) setInitializingRunProject(projTitle);
                                }}
                            />
                        )
                    ) : (
                        <div className="h-full flex flex-col p-8 overflow-auto custom-scrollbar">
                            {metadata && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center shadow-sm">
                                            {selectedNode && React.cloneElement(ICON_MAP[selectedNode.categoryId] || ICON_MAP[selectedNode.type], { className: "w-8 h-8" })}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900">{metadata.name}</h2>
                                            <div className="flex items-center gap-3 mt-1 text-slate-500 text-[13px]">
                                                <span className="flex items-center gap-1.5 uppercase font-bold text-[11px] tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                                                    <Box className="w-3 h-3" /> {metadata.type}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" /> Updated {metadata.lastModified}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow">
                                            <div className="text-[11px] font-bold text-slate-400 uppercase mb-1 tracking-widest">{metadata.label}</div>
                                            <div className="text-3xl font-black text-slate-900">{metadata.count}</div>
                                        </div>
                                        {Object.entries(metadata.subStats).map(([label, val]) => (
                                            <div key={label} className="p-4 rounded-xl border bg-white shadow-sm group">
                                                <div className="text-[11px] font-bold text-slate-400 uppercase mb-1 tracking-widest">{label}</div>
                                                <div className="text-2xl font-bold text-slate-900 group-hover:text-orange-600 transition-colors uppercase">{val}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {selectedNode?.type === 'project' && (
                                        <div className="space-y-4 pt-4 border-t">
                                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Project Structure</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {selectedNode.children.map(cat => {
                                                    const Icon = CATEGORY_ICONS[cat.categoryId] || FolderTree;
                                                    return (
                                                        <div
                                                            key={cat.key}
                                                            className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 group text-left"
                                                        >
                                                            <div className="w-10 h-10 rounded-lg bg-white border flex items-center justify-center shadow-sm">
                                                                <Icon className="w-5 h-5 text-slate-400" />
                                                            </div>
                                                            <div>
                                                                <div className="text-[14px] font-bold text-slate-800">{cat.title}</div>
                                                                <div className="text-[11px] text-slate-500">{cat.children?.length || 0} items</div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {selectedNode?.type === 'category' && (
                                        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-2xl bg-slate-50/50 text-center px-4">
                                            <div className="w-12 h-12 rounded-full bg-white border flex items-center justify-center mb-4 shadow-sm">
                                                <Plus className="w-6 h-6 text-slate-300" />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-900 mb-1 leading-none">Files Organized in {selectedNode.title}</h3>
                                            <p className="text-[12px] text-slate-500 max-w-[240px]">Use the 3-dot action menu on the folder in the sidebar to add new files or import components.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <Dialog open={projectModalOpen} onOpenChange={setProjectModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FolderGit2 className="w-5 h-5 text-orange-500" />
                            Create New Project
                        </DialogTitle>
                        <DialogDescription className="sr-only">Create a new neural network project workspace.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Project Name</label>
                            <Input
                                placeholder="e.g. My Neural Net"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProjectModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateProject} className="bg-orange-600 hover:bg-orange-700">Create Portfolio</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={componentModalOpen} onOpenChange={setComponentModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 capitalize">
                            {activeComponentType && React.createElement(CATEGORY_ICONS[activeComponentType.name.toLowerCase().replace(' ', '_')] || Box, { className: "w-5 h-5 text-orange-500" })}
                            Add {activeComponentType?.name}
                        </DialogTitle>
                        <DialogDescription className="sr-only">Add a new component file.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Component Name</label>
                            <Input
                                placeholder="e.g. custom_relu"
                                value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <button
                                className="flex flex-col items-center justify-center p-6 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/5 transition-all group"
                                onClick={() => handleCreateFile('neuro')}
                            >
                                <div className="w-12 h-12 rounded-full bg-white border flex items-center justify-center mb-3 group-hover:border-orange-100 group-hover:text-orange-500 transition-colors shadow-sm">
                                    <FileCode className="w-6 h-6" />
                                </div>
                                <span className="text-[14px] font-bold text-slate-800 group-hover:text-orange-600">NeuroCode</span>
                                <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">Write In-Browser</span>
                            </button>
                            <button
                                className="flex flex-col items-center justify-center p-6 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/5 transition-all group"
                                onClick={() => handleCreateFile('import')}
                            >
                                <div className="w-12 h-12 rounded-full bg-white border flex items-center justify-center mb-3 group-hover:border-orange-100 group-hover:text-orange-500 transition-colors shadow-sm">
                                    <Upload className="w-6 h-6" />
                                </div>
                                <span className="text-[14px] font-bold text-slate-800 group-hover:text-orange-600">Device Import</span>
                                <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-bold">Upload Local File</span>
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={renameModalOpen} onOpenChange={setRenameModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-bold">
                            <Pencil className="w-5 h-5 text-orange-500" />
                            Rename {editingNode?.type}
                        </DialogTitle>
                        <DialogDescription className="sr-only">Rename an existing file or folder.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">New Name</label>
                            <Input
                                placeholder="Enter name..."
                                value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleRename} className="bg-orange-600 hover:bg-orange-700">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".js,.json,.py,.css,.html"
                onChange={handleFileUpload}
            />
        </div>
    );
}
