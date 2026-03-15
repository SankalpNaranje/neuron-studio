import React, { useState, useEffect, useRef } from 'react';
import {
    Upload, Database, Table2, BarChart3, AlertCircle, PlaySquare,
    CheckSquare, Target, Activity, FileJson, ArrowRight, Save, LayoutDashboard, FileDown, Settings2,
    FileText, Plus, Grid3X3, TrendingUp, RefreshCw, BookOpen, ExternalLink, Trash2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from 'date-fns';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
    fetchDatasetPreview, fetchDatasetDistributions, refreshDatasetEda,
    fetchNotebooks, createNotebook, getNotebookUrl, startJupyter, getJupyterStatus,
    renameDataset, assignDatasetToProject
} from '../services/api';
import { Edit2 } from 'lucide-react';

export default function DataView() {
    const [datasets, setDatasets] = useState([]);
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const fileInputRef = useRef(null);

    // Top-level tabs: 'analysis' | 'notebooks'
    const [topTab, setTopTab] = useState('analysis');
    // Analysis sub-tabs: 'overview' | 'features' | 'stats' | 'correlation' | 'distributions'
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedFeatures, setSelectedFeatures] = useState([]);
    const [targetFeature, setTargetFeature] = useState('');
    const [projectContext, setProjectContext] = useState("default");

    // Preview data
    const [previewData, setPreviewData] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Distributions
    const [distributions, setDistributions] = useState(null);
    const [distLoading, setDistLoading] = useState(false);

    // Notebooks
    const [notebooks, setNotebooks] = useState([]);
    const [notebookLoading, setNotebookLoading] = useState(false);
    const [createNotebookOpen, setCreateNotebookOpen] = useState(false);
    const [newNotebookName, setNewNotebookName] = useState('');
    const [activeNotebookUrl, setActiveNotebookUrl] = useState(null);
    const [jupyterStatus, setJupyterStatus] = useState(null);
    const [jupyterStarting, setJupyterStarting] = useState(false);

    // EDA refresh
    const [refreshingEda, setRefreshingEda] = useState(false);

    // Rename
    const [renameModalOpen, setRenameModalOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [isRenaming, setIsRenaming] = useState(false);

    // Project assignment
    const [projects, setProjects] = useState([]);
    const [targetProject, setTargetProject] = useState('No Project');
    const [isAssigning, setIsAssigning] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

    // Fetch datasets
    const fetchDatasets = async () => {
        try {
            const res = await fetch(`http://localhost:8000/api/datasets/all`);
            if (res.ok) {
                const data = await res.json();
                setDatasets(data);
                if (data.length > 0 && !selectedDataset) {
                    setSelectedDataset(data[0]);
                    initializeSelection(data[0]);
                }
            }
        } catch (e) {
            console.error("Failed to fetch datasets", e);
        }
    };

    useEffect(() => {
        fetchDatasets();
    }, [projectContext]);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/workspace/tree`);
                if (res.ok) {
                    const tree = await res.json();
                    // The tree is an array of roots. We assume index 0 is the main root.
                    const rootNode = Array.isArray(tree) ? tree[0] : tree;
                    // Projects are children of the root node where type is 'project'
                    if (rootNode && rootNode.children) {
                        const projList = rootNode.children
                            .filter(node => node.type === 'project' && node.title !== 'dataset' && node.title !== 'default')
                            .map(node => node.title);
                        setProjects(projList);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch projects", e);
            }
        };
        fetchProjects();
    }, []);

    // Sync targetProject when dataset changes
    useEffect(() => {
        if (selectedDataset) {
            setTargetProject(
                selectedDataset.assigned_project && selectedDataset.assigned_project !== 'default'
                    ? selectedDataset.assigned_project
                    : 'No Project'
            );
        }
    }, [selectedDataset?.id, selectedDataset?.assigned_project]);

    // Load preview when dataset changes
    useEffect(() => {
        if (selectedDataset?.id) {
            loadPreview();
        }
    }, [selectedDataset?.id]);

    const loadPreview = async () => {
        if (!selectedDataset) return;
        setPreviewLoading(true);
        try {
            const data = await fetchDatasetPreview(projectContext, selectedDataset.id);
            setPreviewData(data);
        } catch (e) {
            console.error("Failed to load preview", e);
        } finally {
            setPreviewLoading(false);
        }
    };

    const loadDistributions = async () => {
        if (!selectedDataset) return;
        setDistLoading(true);
        try {
            const data = await fetchDatasetDistributions(projectContext, selectedDataset.id);
            setDistributions(data);
        } catch (e) {
            console.error("Failed to load distributions", e);
        } finally {
            setDistLoading(false);
        }
    };

    const loadNotebooks = async () => {
        if (!selectedDataset) return;
        setNotebookLoading(true);
        try {
            const data = await fetchNotebooks(projectContext, selectedDataset.id);
            setNotebooks(data);
        } catch (e) {
            console.error("Failed to load notebooks", e);
        } finally {
            setNotebookLoading(false);
        }
    };

    // Load distributions when tab changes
    useEffect(() => {
        if (activeTab === 'distributions' && selectedDataset && !distributions) {
            loadDistributions();
        }
    }, [activeTab, selectedDataset?.id]);

    // Load notebooks when tab changes  
    useEffect(() => {
        if (topTab === 'notebooks' && selectedDataset) {
            loadNotebooks();
            checkJupyter();
        }
        if (topTab === 'analysis' && selectedDataset) {
            handleRefreshEda();
        }
    }, [topTab, selectedDataset?.id]);

    const checkJupyter = async () => {
        try {
            const status = await getJupyterStatus();
            setJupyterStatus(status);
        } catch (e) {
            setJupyterStatus({ running: false });
        }
    };

    const handleStartJupyter = async () => {
        setJupyterStarting(true);
        try {
            const status = await startJupyter();
            setJupyterStatus(status);
        } catch (e) {
            console.error("Failed to start Jupyter", e);
        } finally {
            setJupyterStarting(false);
        }
    };

    const handleRefreshEda = async () => {
        if (!selectedDataset) return;
        setRefreshingEda(true);
        try {
            const updated = await refreshDatasetEda(projectContext, selectedDataset.id);
            setSelectedDataset(updated);
            await fetchDatasets();
            // Reload preview and distributions
            loadPreview();
            if (distributions) loadDistributions();
        } catch (e) {
            console.error("Failed to refresh EDA", e);
        } finally {
            setRefreshingEda(false);
        }
    };

    const handleRename = async () => {
        if (!newName.trim() || !selectedDataset) return;
        setIsRenaming(true);
        try {
            await renameDataset(projectContext, selectedDataset.id, newName.trim());
            await fetchDatasets();
            // Update selected dataset name locally
            setSelectedDataset(prev => ({ ...prev, name: newName.trim() }));
            setRenameModalOpen(false);
        } catch (e) {
            alert(e.message);
        } finally {
            setIsRenaming(false);
        }
    };

    const handleAssignToProject = async () => {
        if (!selectedDataset) return;
        setIsAssigning(true);
        try {
            // Map "No Project" back to "default" for the backend
            const backendTarget = targetProject === 'No Project' ? 'default' : targetProject;
            const updatedDataset = await assignDatasetToProject(projectContext, selectedDataset.id, backendTarget);

            // Re-fetch datasets and update selected dataset to reflect changes
            await fetchDatasets();
            setSelectedDataset(updatedDataset);

            // Show success modal instead of alert
            setIsSuccessModalOpen(true);
        } catch (e) {
            alert(e.message);
        } finally {
            setIsAssigning(false);
        }
    };

    const initializeSelection = (ds) => {
        setSelectedFeatures(ds.selected_features || ds.numerical_features || []);
        setTargetFeature(ds.target || '');
    };

    const handleDatasetSelect = (ds) => {
        setSelectedDataset(ds);
        initializeSelection(ds);
        setActiveNotebookUrl(null);
        setTargetProject(
            ds.assigned_project && ds.assigned_project !== 'default'
                ? ds.assigned_project
                : 'No Project'
        );
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`http://localhost:8000/api/datasets/upload/${projectContext}`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Upload failed');
            }

            const newDs = await res.json();
            await fetchDatasets();
            setSelectedDataset(newDs);
            initializeSelection(newDs);
            setUploadModalOpen(false);
        } catch (e) {
            alert(e.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSaveConfig = async () => {
        if (!selectedDataset) return;
        try {
            const res = await fetch(`http://localhost:8000/api/datasets/${projectContext}/${selectedDataset.id}/config`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    feature_cols: selectedFeatures,
                    target_col: targetFeature
                })
            });
            if (res.ok) {
                const updated = await res.json();
                setSelectedDataset(updated);
                alert("Configuration saved successfully. You can now use this dataset in Compute Tab.");
            } else {
                alert("Failed to save config");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const toggleFeature = (feat) => {
        if (selectedFeatures.includes(feat)) {
            setSelectedFeatures(selectedFeatures.filter(f => f !== feat));
        } else {
            setSelectedFeatures([...selectedFeatures, feat]);
        }
    };

    const handleCreateNotebook = async () => {
        if (!newNotebookName.trim()) return;
        try {
            await createNotebook(projectContext, selectedDataset.id, newNotebookName.trim());
            setNewNotebookName('');
            setCreateNotebookOpen(false);
            loadNotebooks();
        } catch (e) {
            alert(e.message);
        }
    };

    const handleOpenNotebook = async (filename) => {
        try {
            // Ensure Jupyter is running
            if (!jupyterStatus?.running) {
                await handleStartJupyter();
            }
            const data = await getNotebookUrl(projectContext, selectedDataset.id, filename);
            setActiveNotebookUrl(data.url);
        } catch (e) {
            alert("Failed to open notebook: " + e.message);
        }
    };

    // Render helpers for EDA
    const renderOverview = () => {
        if (!selectedDataset) return null;
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="shadow-none border-slate-200">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Rows</CardTitle>
                            <Table2 className="w-4 h-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-slate-800">{selectedDataset.rows.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none border-slate-200">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Columns</CardTitle>
                            <Activity className="w-4 h-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-slate-800">{selectedDataset.columns}</div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none border-slate-200">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Missing Values</CardTitle>
                            <AlertCircle className="w-4 h-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-slate-800">{selectedDataset.missing_values.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card className="shadow-none border-slate-200">
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Duplicates</CardTitle>
                            <FileDown className="w-4 h-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black text-slate-800">{selectedDataset.duplicates.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sample Data Preview */}
                <Card className="shadow-none border-slate-200 overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-200 pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-[13px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <Table2 className="w-4 h-4 text-indigo-500" />
                            Sample Data (Top 5 Rows)
                        </CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        {previewLoading ? (
                            <div className="flex items-center justify-center p-8 text-slate-400">
                                <Activity className="w-5 h-5 animate-spin mr-2" /> Loading preview...
                            </div>
                        ) : previewData ? (
                            <table className="w-full text-[12px] text-left">
                                <thead className="bg-slate-50/50 text-slate-500 border-b">
                                    <tr>
                                        {previewData.columns.map(col => (
                                            <th key={col} className="px-4 py-3 font-semibold whitespace-nowrap">{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.rows.map((row, i) => (
                                        <tr key={i} className={cn("border-b border-slate-100", i % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                                            {previewData.columns.map(col => (
                                                <td key={col} className="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                                                    {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-slate-300 italic">null</span>}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-slate-400 text-sm">No preview available</div>
                        )}
                    </div>
                </Card>
            </div>
        );
    };

    const renderDataSelection = () => {
        if (!selectedDataset) return null;

        const allColumns = [...(selectedDataset.numerical_features || []), ...(selectedDataset.categorical_features || [])];
        const isClassification = selectedDataset.problem_type === 'classification';

        return (
            <Card className="shadow-none border-slate-200 mt-6 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Feature & Target Selection</h3>
                        <p className="text-[12px] text-slate-500 mt-1">Select the input features for your neural network and the target variable predicting.</p>
                    </div>
                    <Button
                        onClick={handleSaveConfig}
                        className="bg-orange-600 hover:bg-orange-700 h-8 text-[12px] px-4 gap-1.5"
                    >
                        <Save className="w-3.5 h-3.5" /> Save Selection
                    </Button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Target Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5 text-orange-500" />
                                Target Variable (y)
                            </label>
                            <span className={cn(
                                "text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-wide",
                                isClassification ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                            )}>
                                {selectedDataset.problem_type || 'Unknown'}
                            </span>
                        </div>
                        <Select value={targetFeature || ""} onValueChange={setTargetFeature}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select target variable..." />
                            </SelectTrigger>
                            <SelectContent>
                                {allColumns.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {targetFeature && selectedDataset.eda?.target_distribution && isClassification && (
                            <div className="mt-4 pt-4 border-t">
                                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Class Distribution</h4>
                                <div className="space-y-2">
                                    {Object.entries(selectedDataset.eda.target_distribution).map(([cls, count]) => {
                                        const pct = (count / selectedDataset.rows) * 100;
                                        return (
                                            <div key={cls} className="space-y-1">
                                                <div className="flex justify-between text-[11px] font-medium text-slate-700">
                                                    <span>Class {cls}</span>
                                                    <span>{count} ({pct.toFixed(1)}%)</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Features Selection */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-blue-500" />
                            Input Features (X)
                        </label>
                        <div className="border rounded-md max-h-[250px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {allColumns.map(c => {
                                if (c === targetFeature) return null;
                                return (
                                    <div key={c} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded select-none">
                                        <Checkbox
                                            id={`feat-${c}`}
                                            checked={selectedFeatures.includes(c)}
                                            onCheckedChange={() => toggleFeature(c)}
                                        />
                                        <div className="flex flex-col">
                                            <label htmlFor={`feat-${c}`} className="text-[13px] font-medium text-slate-800 leading-none cursor-pointer">
                                                {c}
                                            </label>
                                            <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">{selectedDataset.eda?.feature_types?.[c] || 'unknown'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                            Selected {selectedFeatures.length} / {allColumns.length - (targetFeature ? 1 : 0)} features
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    const renderStatistics = () => {
        if (!selectedDataset?.eda?.stats) return null;

        const stats = selectedDataset.eda.stats;
        const features = Object.keys(stats);

        return (
            <div className="mt-6 animate-in fade-in slide-in-from-bottom-2">
                <Card className="shadow-none border-slate-200">
                    <CardHeader className="bg-slate-50 border-b border-slate-200 pb-3">
                        <CardTitle className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Statistical Summary</CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                        <table className="w-full text-[12px] text-left">
                            <thead className="bg-slate-50/50 text-slate-500 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Feature</th>
                                    <th className="px-4 py-3 font-semibold text-right">Mean</th>
                                    <th className="px-4 py-3 font-semibold text-right">Std Dev</th>
                                    <th className="px-4 py-3 font-semibold text-right">Min</th>
                                    <th className="px-4 py-3 font-semibold text-right">Max</th>
                                </tr>
                            </thead>
                            <tbody>
                                {features.map((f, i) => (
                                    <tr key={f} className={cn("border-b border-slate-100", i % 2 === 0 ? "bg-white" : "bg-slate-50/30")}>
                                        <td className="px-4 py-2.5 font-medium text-slate-800">{f}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-slate-600">{stats[f].mean?.toFixed(4)}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-slate-600">{stats[f].std?.toFixed(4)}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-slate-600">{stats[f].min?.toFixed(4)}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-slate-600">{stats[f].max?.toFixed(4)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    }

    const renderCorrelation = () => {
        if (!selectedDataset?.eda?.correlation) return null;
        const corr = selectedDataset.eda.correlation;
        const features = Object.keys(corr);
        if (features.length === 0) return (
            <div className="flex items-center justify-center p-12 text-slate-400">
                <span className="text-sm">No numerical features for correlation analysis</span>
            </div>
        );

        const getColor = (val) => {
            if (val >= 0.8) return 'bg-red-500 text-white';
            if (val >= 0.6) return 'bg-orange-400 text-white';
            if (val >= 0.4) return 'bg-yellow-300 text-slate-800';
            if (val >= 0.2) return 'bg-yellow-100 text-slate-700';
            if (val >= -0.2) return 'bg-slate-50 text-slate-600';
            if (val >= -0.4) return 'bg-blue-100 text-slate-700';
            if (val >= -0.6) return 'bg-blue-300 text-white';
            if (val >= -0.8) return 'bg-blue-500 text-white';
            return 'bg-blue-700 text-white';
        };

        return (
            <div className="animate-in fade-in slide-in-from-bottom-2">
                <Card className="shadow-none border-slate-200 overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-200 pb-3">
                        <CardTitle className="text-[13px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                            <Grid3X3 className="w-4 h-4 text-indigo-500" />
                            Correlation Matrix
                        </CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto p-4">
                        <table className="text-[10px]">
                            <thead>
                                <tr>
                                    <th className="px-2 py-1 font-bold text-slate-500 text-left"></th>
                                    {features.map(f => (
                                        <th key={f} className="px-2 py-1 font-bold text-slate-500 text-center whitespace-nowrap" style={{ writingMode: 'vertical-rl', maxWidth: '30px' }}>
                                            {f.length > 12 ? f.substring(0, 10) + '..' : f}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {features.map(f1 => (
                                    <tr key={f1}>
                                        <td className="px-2 py-1 font-bold text-slate-600 whitespace-nowrap text-right pr-3">
                                            {f1.length > 15 ? f1.substring(0, 13) + '..' : f1}
                                        </td>
                                        {features.map(f2 => {
                                            const val = corr[f1]?.[f2] || 0;
                                            return (
                                                <td key={f2} className={cn("px-1 py-1 text-center font-mono font-bold rounded-sm", getColor(val))}
                                                    style={{ minWidth: '42px', fontSize: '9px' }}
                                                    title={`${f1} × ${f2}: ${val.toFixed(3)}`}
                                                >
                                                    {val.toFixed(2)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {/* Legend */}
                        <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-500">
                            <span className="font-bold">Scale:</span>
                            <div className="flex gap-0.5">
                                {[
                                    { color: 'bg-blue-700', label: '-1' },
                                    { color: 'bg-blue-300', label: '' },
                                    { color: 'bg-slate-50', label: '0' },
                                    { color: 'bg-yellow-300', label: '' },
                                    { color: 'bg-red-500', label: '+1' },
                                ].map((s, i) => (
                                    <div key={i} className="flex flex-col items-center">
                                        <div className={cn("w-6 h-3 rounded-sm", s.color)} />
                                        {s.label && <span className="text-[8px] mt-0.5">{s.label}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        );
    };

    const renderDistributions = () => {
        if (distLoading) return (
            <div className="flex items-center justify-center p-12 text-slate-400">
                <Activity className="w-5 h-5 animate-spin mr-2" /> Loading distributions...
            </div>
        );

        if (!distributions || Object.keys(distributions).length === 0) return (
            <div className="flex items-center justify-center p-12 text-slate-400">
                <span className="text-sm">No numerical features for distribution analysis</span>
            </div>
        );

        return (
            <div className="animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(distributions).map(([feature, data]) => {
                        const chartData = data.counts.map((count, i) => ({
                            bin: `${data.bin_edges[i].toFixed(2)}`,
                            count
                        }));

                        return (
                            <Card key={feature} className="shadow-none border-slate-200 overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b border-slate-200 pb-2">
                                    <CardTitle className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                                        <span>{feature}</span>
                                        <span className="text-[9px] text-slate-400 font-normal normal-case">
                                            μ={data.mean.toFixed(3)} σ={data.std.toFixed(3)}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 h-[180px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
                                            <XAxis dataKey="bin" tick={{ fontSize: 8, fill: '#94a3b8' }} interval="preserveStartEnd" />
                                            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                            <RechartsTooltip
                                                contentStyle={{
                                                    background: '#0f172a', border: 'none', borderRadius: '8px',
                                                    color: '#f8fafc', fontSize: '11px', padding: '6px 10px'
                                                }}
                                                itemStyle={{ color: '#fff' }}
                                                formatter={(v) => [v, 'Count']}
                                            />
                                            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                                                {chartData.map((_, i) => (
                                                    <Cell key={i} fill={`hsl(${220 + (i * 5) % 40}, 70%, ${55 + (i * 2) % 20}%)`} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderNotebooks = () => {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                {/* Active Notebook (iframe) */}
                {activeNotebookUrl ? (
                    <Card className="shadow-none border-slate-200 overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-200 py-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-[12px] font-bold text-slate-700 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-orange-500" />
                                Jupyter Notebook
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[11px] text-slate-500 gap-1"
                                    onClick={() => window.open(activeNotebookUrl, '_blank')}
                                >
                                    <ExternalLink className="w-3 h-3" /> Open in New Tab
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-[11px] text-slate-500"
                                    onClick={() => setActiveNotebookUrl(null)}
                                >
                                    Close
                                </Button>
                            </div>
                        </CardHeader>
                        <div className="w-full" style={{ height: '70vh' }}>
                            <iframe
                                src={activeNotebookUrl}
                                className="w-full h-full border-0"
                                title="Jupyter Notebook"
                                allow="clipboard-write"
                            />
                        </div>
                    </Card>
                ) : (
                    <>
                        {/* Data persistence instruction banner */}
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3 shadow-sm">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <Activity className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-blue-800">Persistence Instructions</h4>
                                <p className="text-[12px] text-blue-600 mb-2">
                                    To ensure your changes are persistent in the database, run the following code at the end of your notebook:
                                </p>
                                <div className="p-2 bg-slate-900 rounded font-mono text-[11px] text-white select-all border border-slate-700">
                                    df.to_csv("datasets/processed/iris_clean.csv", index=False)
                                </div>
                                <p className="text-[10px] text-blue-500 mt-2 font-medium">
                                    * Note: Replace "iris_clean.csv" with your actual dataset name if working with a different file.
                                </p>
                            </div>
                        </div>

                        {/* Jupyter Status Banner */}
                        {!jupyterStatus?.running && (
                            <Card className="shadow-none border-amber-200 bg-amber-50/50">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                                            <AlertCircle className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-amber-800">Jupyter Server Not Running</p>
                                            <p className="text-[11px] text-amber-600">Start the Jupyter server to create and run notebooks.</p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleStartJupyter}
                                        disabled={jupyterStarting}
                                        className="bg-amber-600 hover:bg-amber-700 h-8 text-[12px] gap-1.5"
                                    >
                                        {jupyterStarting ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <PlaySquare className="w-3.5 h-3.5" />}
                                        {jupyterStarting ? 'Starting...' : 'Start Jupyter'}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Notebooks List */}
                        {notebookLoading ? (
                            <div className="flex items-center justify-center p-12 text-slate-400">
                                <Activity className="w-5 h-5 animate-spin mr-2" /> Loading notebooks...
                            </div>
                        ) : notebooks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-16 text-slate-400">
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-4">
                                    <BookOpen className="w-8 h-8 text-slate-200" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-600 mb-1">No Notebooks Yet</h3>
                                <p className="text-[12px] text-slate-500 mb-4">Create a notebook to start exploring your data with Python.</p>
                                <Button
                                    onClick={() => setCreateNotebookOpen(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 h-8 text-[12px] gap-1.5"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Create Notebook
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {notebooks.map(nb => (
                                    <Card
                                        key={nb.filename}
                                        className="shadow-none border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer group"
                                        onClick={() => handleOpenNotebook(nb.filename)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shrink-0">
                                                    <FileText className="w-5 h-5 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                                        {nb.filename.replace('.ipynb', '')}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-400 mt-1">
                                                        Modified {formatDistanceToNow(new Date(nb.modified_at))} ago
                                                    </p>
                                                </div>
                                                <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0 mt-1" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="flex h-full w-full bg-slate-50/50 overflow-hidden">
            {/* Sidebar List */}
            <div className="w-72 bg-white border-r flex flex-col shrink-0 z-10">
                <div className="p-4 border-b flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-indigo-500" />
                        <h2 className="text-sm font-bold text-slate-800 tracking-tight">NeuroData</h2>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-orange-600 hover:bg-orange-50" onClick={() => setUploadModalOpen(true)}>
                        <Upload className="w-4 h-4" />
                    </Button>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar p-3 space-y-2">
                    {datasets.length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                            <Database className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            <p className="text-[12px]">No datasets uploaded yet.</p>
                            <Button variant="link" onClick={() => setUploadModalOpen(true)} className="text-[12px] text-orange-600 h-6 p-0 mt-1">Upload CSV or JSON</Button>
                        </div>
                    )}
                    {datasets.map(ds => (
                        <button
                            key={ds.id}
                            onClick={() => handleDatasetSelect(ds)}
                            className={cn(
                                "w-full text-left p-3 rounded-lg border transition-all duration-200",
                                selectedDataset?.id === ds.id
                                    ? "bg-indigo-50/50 border-indigo-200 shadow-sm"
                                    : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                            )}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className={cn(
                                    "text-[13px] font-semibold truncate pr-2",
                                    selectedDataset?.id === ds.id ? "text-indigo-900" : "text-slate-700"
                                )}>
                                    {ds.name || ds.id}
                                </span>
                                {ds.target && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" title="Configured" />
                                )}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                                <span className="flex items-center gap-1"><Table2 className="w-3 h-3" /> {ds.rows} </span>
                                <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {ds.columns}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Decorative Background */}
                <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '24px 24px' }}
                />

                {selectedDataset ? (
                    <div className="flex-1 overflow-auto custom-scrollbar p-6 lg:p-10 z-10">
                        <div className="max-w-5xl mx-auto">
                            <div className="flex items-start justify-between mb-8 border-b border-slate-100 pb-6">
                                <div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 group">
                                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{selectedDataset.name}</h1>
                                            <button
                                                onClick={() => {
                                                    setNewName(selectedDataset.name);
                                                    setRenameModalOpen(true);
                                                }}
                                                className="px-2 py-1 flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 rounded-md text-[10px] font-bold text-slate-400 hover:text-indigo-600 border border-slate-200 transition-all shadow-sm"
                                                title="Rename dataset"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                                RENAME
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-lg">
                                                <Select value={targetProject} onValueChange={setTargetProject}>
                                                    <SelectTrigger className="h-6 text-[10px] w-40 border-0 bg-transparent shadow-none focus:ring-0">
                                                        <div className="flex items-center gap-1.5 text-slate-500">
                                                            <LayoutDashboard className="w-3 h-3" />
                                                            <SelectValue placeholder="Assign to Project" />
                                                        </div>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="No Project" className="text-[11px]">No Project</SelectItem>
                                                        {projects.map(p => (
                                                            <SelectItem key={p} value={p} className="text-[11px] font-medium">{p}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    onClick={handleAssignToProject}
                                                    disabled={isAssigning || (selectedDataset.assigned_project === (targetProject === 'default' ? null : targetProject))}
                                                    className="h-6 text-[10px] px-2 bg-indigo-600 hover:bg-indigo-700"
                                                >
                                                    {isAssigning ? '...' : 'SAVE'}
                                                </Button>
                                            </div>
                                            <span className="w-1 h-1 rounded-full bg-slate-300 mx-1" />
                                            <span className="text-[12px] text-slate-500 font-medium flex items-center gap-1">
                                                ID: <span className="font-mono text-slate-400">{selectedDataset.id}</span>
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                            {/* <span className="text-[12px] text-slate-500 font-medium">
                                                Uploaded {formatDistanceToNow(new Date(selectedDataset.uploaded_at))} ago
                                            </span> */}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={handleRefreshEda}
                                        disabled={refreshingEda}
                                        className="h-8 text-[12px] gap-1.5"
                                    >
                                        <RefreshCw className={cn("w-3.5 h-3.5", refreshingEda && "animate-spin")} />
                                        {refreshingEda ? 'Refreshing...' : 'Refresh EDA'}
                                    </Button>
                                    {topTab === 'notebooks' && (
                                        <Button
                                            onClick={() => setCreateNotebookOpen(true)}
                                            className="bg-orange-600 hover:bg-orange-700 h-8 text-[12px] gap-1.5"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Create Notebook
                                        </Button>
                                    )}
                                    <Button
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-[12px] gap-1.5 shadow-md shadow-indigo-500/20"
                                        onClick={() => {
                                            setTopTab('analysis');
                                            setActiveTab('features');
                                        }}
                                    >
                                        Configure Neural Net
                                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                    </Button>
                                </div>
                            </div>

                            {/* Top-Level Tabs: Analysis | Notebooks */}
                            <div className="flex items-center gap-1 mb-6">
                                {[
                                    { id: 'analysis', label: 'Analysis', icon: BarChart3 },
                                    { id: 'notebooks', label: 'Notebooks', icon: BookOpen },
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setTopTab(tab.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-5 py-2.5 text-[13px] font-bold rounded-lg transition-all",
                                            topTab === tab.id
                                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                        )}
                                    >
                                        <tab.icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Analysis Tab Content */}
                            {topTab === 'analysis' && (
                                <>
                                    {/* Analysis Sub-Tab Navigation */}
                                    <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
                                        {[
                                            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                                            { id: 'features', label: 'Feature Tuning', icon: Settings2 },
                                            { id: 'stats', label: 'Statistics', icon: BarChart3 },
                                            { id: 'correlation', label: 'Correlation Matrices', icon: Grid3X3 },
                                            { id: 'distributions', label: 'Feature Distributions', icon: TrendingUp },
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={cn(
                                                    "flex items-center gap-2 px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider transition-colors relative",
                                                    activeTab === tab.id
                                                        ? "text-indigo-600"
                                                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 rounded-t-lg"
                                                )}
                                            >
                                                <tab.icon className="w-4 h-4" />
                                                {tab.label}
                                                {activeTab === tab.id && (
                                                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-indigo-600 rounded-t-full" />
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Analysis Sub-Tab Content */}
                                    <div className="pb-16">
                                        {activeTab === 'overview' && renderOverview()}
                                        {activeTab === 'features' && renderDataSelection()}
                                        {activeTab === 'stats' && renderStatistics()}
                                        {activeTab === 'correlation' && renderCorrelation()}
                                        {activeTab === 'distributions' && renderDistributions()}
                                    </div>
                                </>
                            )}

                            {/* Notebooks Tab Content */}
                            {topTab === 'notebooks' && (
                                <div className="pb-16">
                                    {renderNotebooks()}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 z-10">
                        <div className="w-20 h-20 bg-white shadow-sm border rounded-2xl flex items-center justify-center mb-6">
                            <Database className="w-8 h-8 text-indigo-200" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-700 mb-2 tracking-tight">Select a Dataset</h2>
                        <p className="text-[13px] text-slate-500 max-w-sm text-center">
                            Choose a dataset from the sidebar to view Exploratory Data Analysis (EDA) and configure features for training.
                        </p>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            < Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="w-5 h-5 text-indigo-500" />
                            Upload NeuroData
                        </DialogTitle>
                        <DialogDescription>
                            Upload a CSV or JSON file containing your dataset.
                            The backend will automatically generate EDA metrics.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={handleUploadClick}>
                        <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-indigo-500">
                            {isUploading ? <Activity className="w-6 h-6 animate-pulse" /> : <Database className="w-6 h-6" />}
                        </div>
                        <div className="text-sm font-bold text-slate-700">{isUploading ? 'Uploading & Analyzing...' : 'Click to Browse Files'}</div>
                        <div className="text-[11px] text-slate-500 mt-1">Supports .csv, .json</div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".csv,.json"
                            onChange={handleFileChange}
                        />
                    </div>
                </DialogContent>
            </Dialog >

            {/* Create Notebook Modal */}
            < Dialog open={createNotebookOpen} onOpenChange={setCreateNotebookOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-orange-500" />
                            Create New Notebook
                        </DialogTitle>
                        <DialogDescription>
                            Create a Jupyter notebook for exploring and transforming your dataset.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">Notebook Name</label>
                            <Input
                                placeholder="e.g. eda_analysis"
                                value={newNotebookName}
                                onChange={(e) => setNewNotebookName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateNotebook()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateNotebookOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateNotebook} className="bg-orange-600 hover:bg-orange-700">
                            <Plus className="w-4 h-4 mr-1" /> Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
            {/* Rename Dataset Modal */}
            < Dialog open={renameModalOpen} onOpenChange={setRenameModalOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit2 className="w-5 h-5 text-indigo-500" />
                            Rename Dataset
                        </DialogTitle>
                        <DialogDescription>
                            Change the display name and physical filename of the dataset.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 block">New Name</label>
                            <Input
                                placeholder="e.g. iris_clean"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleRename} disabled={isRenaming} className="bg-indigo-600 hover:bg-indigo-700">
                            {isRenaming ? <Activity className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                            Rename
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
            {/* Success Confirmation Modal */}
            <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Save className="w-5 h-5 text-emerald-500" />
                            Saving completed
                        </DialogTitle>
                        <DialogDescription>
                            The dataset project assignment has been successfully saved.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center justify-center py-6">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                            <CheckSquare className="w-8 h-8 text-emerald-600" />
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button
                            type="button"
                            className="bg-emerald-600 hover:bg-emerald-700 font-bold px-8"
                            onClick={() => setIsSuccessModalOpen(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
