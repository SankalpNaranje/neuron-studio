import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Play,
    Square,
    RotateCcw,
    Settings2,
    AlertCircle,
    Activity,
    ChevronDown,
    ArrowLeft,
    Plus,
    Minus,
    Zap,
    Target,
    BarChart2,
    Database,
    PanelLeftClose,
    PanelLeftOpen,
    Table2,
    ChevronRight
} from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import Charts from './Charts';
import { fetchConfig, createTrainingSession, TrainingWebSocket, getDownloadModelUrl, fetchDatasetPreview } from '../services/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';

export default function ComputeView({ projectName, onCancel }) {
    const [config, setConfig] = useState(null);
    const [layers, setLayers] = useState([]);

    // Dataset & Features
    const [selectedDataset, setSelectedDataset] = useState('SPIRAL');
    const [checkedFeatures, setCheckedFeatures] = useState([]);
    const [inputFeatures, setInputFeatures] = useState(2);
    const [outputClasses, setOutputClasses] = useState(3);

    // Training Configuration
    const [selectedLoss, setSelectedLoss] = useState('CATEGORICAL_CROSS_ENTROPY');
    const [selectedOptimizer, setSelectedOptimizer] = useState('ADAM');
    const [optimizerParams, setOptimizerParams] = useState({});
    const [epochs, setEpochs] = useState(10000);
    const [logEvery, setLogEvery] = useState(100);
    const [trainSplit, setTrainSplit] = useState(70);
    const [valSplit, setValSplit] = useState(15);
    const [testSplit, setTestSplit] = useState(15);

    // Execution State
    const [lastRunId, setLastRunId] = useState(null);
    const [isTraining, setIsTraining] = useState(false);
    const [metrics, setMetrics] = useState([]);
    const [wsRef, setWsRef] = useState(null);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('idle');
    const [currentEpoch, setCurrentEpoch] = useState(0);

    // Left pane visibility
    const [showLeftPane, setShowLeftPane] = useState(true);

    // Dataset preview
    const [datasetPreview, setDatasetPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const builderRef = useRef(null);
    const [svgPaths, setSvgPaths] = useState([]);

    useEffect(() => {
        const proj = projectName || 'default';
        fetchConfig(proj)
            .then((cfg) => {
                setConfig(cfg);
                const dsKey = Object.keys(cfg.datasets)[0];
                handleDatasetSelect(dsKey, cfg);

                const optKey = Object.keys(cfg.optimizers)[0];
                handleOptimizerSelect(optKey, cfg);

                if (cfg.loss && Object.keys(cfg.losses || {}).includes(cfg.loss)) {
                    setSelectedLoss(cfg.loss);
                } else if (cfg.losses && Object.keys(cfg.losses).length > 0) {
                    setSelectedLoss(Object.keys(cfg.losses)[0]);
                }

                if (cfg.default_layers && layers.length === 0) {
                    setLayers(cfg.default_layers.map(l => ({
                        ...l,
                        weight_regularizer_l1: l.weight_regularizer_l1 || 0,
                        weight_regularizer_l2: l.weight_regularizer_l2 || 0,
                        bias_regularizer_l1: l.bias_regularizer_l1 || 0,
                        bias_regularizer_l2: l.bias_regularizer_l2 || 0,
                        reg_type: (l.weight_regularizer_l1 > 0 || l.bias_regularizer_l1 > 0)
                            ? (l.weight_regularizer_l2 > 0 || l.bias_regularizer_l2 > 0 ? 'BOTH' : 'L1')
                            : (l.weight_regularizer_l2 > 0 || l.bias_regularizer_l2 > 0 ? 'L2' : 'NONE')
                    })));
                } else if (layers.length === 0) {
                    setLayers([
                        { neurons: 64, activation: 'RELU', weight_regularizer_l1: 0, weight_regularizer_l2: 0, bias_regularizer_l1: 0, bias_regularizer_l2: 0, reg_type: 'NONE' },
                        { neurons: 64, activation: 'RELU', weight_regularizer_l1: 0, weight_regularizer_l2: 0, bias_regularizer_l1: 0, bias_regularizer_l2: 0, reg_type: 'NONE' }
                    ]);
                }
            })
            .catch((e) => {
                console.error(e);
                setError('Cannot connect to backend. Make sure the server is running on port 8000.');
            });
    }, [projectName]);

    const handleDatasetSelect = (key, currentConfig = config) => {
        setSelectedDataset(key);
        setDatasetPreview(null);
        if (currentConfig && currentConfig.datasets[key]) {
            const dsInfo = currentConfig.datasets[key];
            setOutputClasses(Math.max(1, dsInfo.classes || 2));

            // If custom dataset with raw info
            if (dsInfo.raw_dataset) {
                const raw = dsInfo.raw_dataset;
                const available = [...(raw.numerical_features || []), ...(raw.categorical_features || [])]
                    .filter(f => f !== raw.target);

                const toCheck = raw.selected_features && raw.selected_features.length > 0
                    ? raw.selected_features
                    : available;

                setCheckedFeatures(toCheck);
                setInputFeatures(Math.max(1, toCheck.length));

                // Load preview for custom datasets
                loadDatasetPreview(key);
            } else {
                setCheckedFeatures([]);
                setInputFeatures(Math.max(1, dsInfo.default_features || 2));
            }
        }
    };

    const loadDatasetPreview = async (datasetId) => {
        setPreviewLoading(true);
        try {
            // Handle toy datasets which are stored with PREDEFINED_ prefix
            const actualId = ['SPIRAL', 'VERTICAL'].includes(datasetId)
                ? `PREDEFINED_${datasetId}`
                : datasetId;
            const data = await fetchDatasetPreview(projectName || 'default', actualId);
            setDatasetPreview(data);
        } catch (e) {
            console.error("Failed to load preview", e);
        } finally {
            setPreviewLoading(false);
        }
    };

    const toggleFeature = (feat) => {
        let newChecked;
        if (checkedFeatures.includes(feat)) {
            newChecked = checkedFeatures.filter(f => f !== feat);
        } else {
            newChecked = [...checkedFeatures, feat];
        }
        setCheckedFeatures(newChecked);
        setInputFeatures(Math.max(1, newChecked.length));
    };

    const handleOptimizerSelect = (key, currentConfig = config) => {
        setSelectedOptimizer(key);
        if (!currentConfig) return;
        const defaults = {};
        currentConfig.optimizers[key].params.forEach((p) => {
            defaults[p.name] = p.default;
        });
        setOptimizerParams(defaults);
    };

    const handleParamChange = useCallback((name, value) => {
        setOptimizerParams((prev) => ({ ...prev, [name]: value }));
    }, []);

    const handleAddLayer = () => {
        setLayers((prev) => [...prev, {
            neurons: 4,
            activation: 'RELU',
            weight_regularizer_l1: 0,
            weight_regularizer_l2: 0,
            bias_regularizer_l1: 0,
            bias_regularizer_l2: 0,
            reg_type: 'NONE'
        }]);
    };

    const handleRemoveLayer = (idx) => {
        setLayers((prev) => prev.filter((_, i) => i !== idx));
    };

    const updateLayer = (idx, field, value) => {
        setLayers(prev => {
            const copy = [...prev];
            copy[idx][field] = value;
            return copy;
        });
    };

    const drawPaths = useCallback(() => {
        if (!builderRef.current) return;
        const cols = [];
        cols.push(Math.min(inputFeatures, 7));
        layers.forEach(l => cols.push(Math.min(l.neurons, 7)));
        cols.push(Math.min(outputClasses, 7));

        const N = cols.length;
        const paths = [];
        const width = 1000;
        const height = 400;
        const dx = width / N;
        const nodeSize = 40;
        const gap = 12;

        for (let c = 0; c < N - 1; c++) {
            const x1 = (c + 0.5) * dx;
            const x2 = (c + 1.5) * dx;

            const nodes1 = cols[c];
            const nodes2 = cols[c + 1];

            const h1 = nodes1 * nodeSize + (nodes1 - 1) * gap;
            const startY1 = (height - h1) / 2 + nodeSize / 2;

            const h2 = nodes2 * nodeSize + (nodes2 - 1) * gap;
            const startY2 = (height - h2) / 2 + nodeSize / 2;

            for (let i = 0; i < nodes1; i++) {
                const y1 = startY1 + i * (nodeSize + gap);
                for (let j = 0; j < nodes2; j++) {
                    const y2 = startY2 + j * (nodeSize + gap);
                    paths.push(
                        <path
                            key={`p-${c}-${i}-${j}`}
                            d={`M ${x1} ${y1} C ${x1 + dx / 3} ${y1}, ${x2 - dx / 3} ${y2}, ${x2} ${y2}`}
                            stroke="rgba(148, 163, 184, 0.2)"
                            strokeWidth="1.5"
                            fill="none"
                        />
                    );
                }
            }
        }
        setSvgPaths(paths);
    }, [inputFeatures, outputClasses, layers]);

    useEffect(() => {
        drawPaths();
    }, [drawPaths]);

    // Auto-hide left pane when training starts
    useEffect(() => {
        if (isTraining) {
            setShowLeftPane(false);
        }
    }, [isTraining]);

    const handleTrain = async () => {
        if (layers.length === 0) return setError('Please add at least one hidden layer.');
        if (inputFeatures <= 0) return setError('Please select at least one input feature.');

        setError('');
        setMetrics([]);
        setCurrentEpoch(0);
        setIsTraining(true);
        setStatus('training');

        try {
            const trainingConfig = {
                layers,
                dataset: selectedDataset,
                input_features: inputFeatures,
                feature_names: checkedFeatures,
                loss: selectedLoss,
                optimizer: selectedOptimizer,
                optimizer_params: optimizerParams,
                epochs: parseInt(epochs),
                log_every: parseInt(logEvery),
                train_split: (parseFloat(trainSplit) || 0) / 100.0,
                val_split: (parseFloat(valSplit) || 0) / 100.0,
                test_split: (parseFloat(testSplit) || 0) / 100.0,
            };

            const sessionPayload = { project_name: projectName || "default" };
            const session = await createTrainingSession(sessionPayload);

            const wsPayload = {
                project_name: sessionPayload.project_name,
                config: trainingConfig
            };

            const ws = new TrainingWebSocket(
                session.session_id,
                wsPayload,
                (metric) => {
                    if (metric.epoch !== undefined) {
                        setCurrentEpoch(metric.epoch);

                        if (metric.epoch >= parseInt(epochs)) {
                            handleStop();
                            setStatus('done');
                        }

                        setMetrics((prev) => [...prev, {
                            epoch: metric.epoch,
                            accuracy: metric.accuracy,
                            loss: metric.loss,
                            val_accuracy: metric.val_accuracy,
                            val_loss: metric.val_loss,
                            learning_rate: metric.learning_rate,
                        }]);
                    }
                },
                (done) => {
                    if (done.run_id) setLastRunId(done.run_id);
                    setIsTraining(false);
                    setStatus('done');
                },
                (err) => {
                    setError(err.message);
                    setIsTraining(false);
                    setStatus('error');
                }
            );
            setWsRef(ws);
        } catch (e) {
            setError(e.message);
            setIsTraining(false);
            setStatus('error');
        }
    };

    const handleStop = () => {
        if (wsRef) {
            wsRef.close();
            setWsRef(null);
        }
        setIsTraining(false);
        setStatus('idle');
    };

    const handleReset = () => {
        if (wsRef) wsRef.close();
        setLayers([]);
        setMetrics([]);
        setCurrentEpoch(0);
        setIsTraining(false);
        setStatus('idle');
        setError('');
        setShowLeftPane(true);
    };

    const activeDatasetInfo = config?.datasets[selectedDataset] || null;
    const isCustomDataset = !!activeDatasetInfo?.raw_dataset;
    const availableFeatures = isCustomDataset
        ? [...(activeDatasetInfo.raw_dataset.numerical_features || []), ...(activeDatasetInfo.raw_dataset.categorical_features || [])]
            .filter(f => f !== activeDatasetInfo.raw_dataset.target)
        : [];

    const lastMetric = metrics[metrics.length - 1] || { accuracy: 0, loss: 0, learning_rate: optimizerParams.learning_rate || 0 };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc]">
            {/* Top Control Bar */}
            <div className="h-16 bg-white border-b border-slate-200 flex items-center px-6 shadow-sm shrink-0 z-20">
                <div className="flex items-center gap-4 mr-8">
                    <button onClick={handleReset} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors" title="Reset">
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    {!isTraining ? (
                        <button
                            onClick={handleTrain}
                            className="w-10 h-10 bg-[#0f172a] hover:bg-slate-800 rounded-full flex items-center justify-center text-white transition-all shadow-lg active:scale-95"
                        >
                            <Play className="w-5 h-5 fill-current" />
                        </button>
                    ) : (
                        <button
                            onClick={handleStop}
                            className="w-10 h-10 bg-[#0f172a] hover:bg-slate-800 rounded-full flex items-center justify-center text-white transition-all shadow-lg active:scale-95"
                        >
                            <Square className="w-4 h-4 fill-current" />
                        </button>
                    )}
                </div>

                <div className="flex-1 flex items-center gap-6 overflow-x-auto no-scrollbar">
                    {/* Epoch Tracking */}
                    <div className="flex flex-col min-w-[100px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 flex items-center gap-1">
                            Epoch <span className="text-slate-300">/ Limit</span>
                        </span>
                        <div className="flex items-center gap-1 text-lg font-mono font-bold text-slate-700">
                            <span>{currentEpoch.toLocaleString('en-US')}</span>
                            <span className="text-sm font-normal text-slate-300">/</span>
                            <input
                                type="number"
                                className="w-20 text-sm border-b border-slate-300 bg-transparent focus:outline-none focus:border-indigo-500 font-mono"
                                value={epochs}
                                onChange={(e) => setEpochs(e.target.value)}
                                disabled={isTraining}
                            />
                        </div>
                    </div>

                    <div className="h-6 w-px bg-slate-200" />

                    {/* Static Loss Info */}
                    <div className="flex flex-col min-w-[150px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Loss</span>
                        <div className="h-7 flex items-center px-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-bold text-slate-600 shadow-sm">
                            Categorical Cross Entropy
                        </div>
                    </div>

                    <div className="h-6 w-px bg-slate-200" />

                    {/* Optimizer Panel */}
                    <div className="flex flex-col min-w-[150px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Optimizer</span>
                        <Select value={selectedOptimizer} onValueChange={(v) => handleOptimizerSelect(v, config)} disabled={isTraining}>
                            <SelectTrigger className="h-7 border-slate-200 text-[12px] font-semibold text-slate-700 bg-white shadow-sm w-[140px]">
                                <SelectValue placeholder="Optimizer" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(config?.optimizers || {}).map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Dynamic Optimizer Hyperparameters */}
                    <div className="flex items-center gap-3 flex-wrap">
                        {config?.optimizers[selectedOptimizer]?.params.map(p => (
                            <div key={p.name} className="flex flex-col">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{p.label}</span>
                                <input
                                    type="number"
                                    step="any"
                                    disabled={isTraining}
                                    className="h-7 w-20 text-[12px] border border-slate-200 rounded-md px-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-sm"
                                    value={optimizerParams[p.name] !== undefined ? optimizerParams[p.name] : p.default}
                                    onChange={(e) => handleParamChange(p.name, parseFloat(e.target.value))}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    {/* Download .pt functionality removed at user request */}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Configuration sidebars */}
                <aside className={cn(
                    "bg-white border-r border-slate-200 overflow-y-auto px-5 py-5 space-y-6 shrink-0 flex flex-col transition-all duration-300",
                    showLeftPane ? "w-[260px]" : "w-0 px-0 overflow-hidden opacity-0"
                )}>
                    {/* Toggle button at top */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Configuration</h3>
                        <button
                            onClick={() => setShowLeftPane(false)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400"
                            title="Hide panel"
                        >
                            <PanelLeftClose className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Dataset Dropdown */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Dataset</h3>
                        <Select value={selectedDataset} onValueChange={(v) => handleDatasetSelect(v, config)} disabled={isTraining}>
                            <SelectTrigger className="w-full h-9 text-[12px] font-semibold bg-white border-slate-200 shadow-sm">
                                <SelectValue placeholder="Select dataset..." />
                            </SelectTrigger>
                            <SelectContent>
                                {config && Object.entries(config.datasets).map(([key, info]) => (
                                    <SelectItem key={key} value={key}>
                                        <div className="flex items-center gap-2">
                                            <Database className="w-3 h-3 text-slate-400" />
                                            <span>{info.label}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>



                        {/* Dataset Preview Table */}
                        {isCustomDataset && datasetPreview && (
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex items-center gap-1.5">
                                    <Table2 className="w-3 h-3 text-indigo-500" />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Preview</span>
                                </div>
                                <div className="overflow-x-auto max-h-[150px] overflow-y-auto">
                                    <table className="w-full text-[9px]">
                                        <thead className="bg-slate-50 text-slate-400 sticky top-0">
                                            <tr>
                                                {datasetPreview.columns.slice(0, 5).map(col => (
                                                    <th key={col} className="px-2 py-1 font-bold text-left whitespace-nowrap">{col.length > 8 ? col.substring(0, 7) + '..' : col}</th>
                                                ))}
                                                {datasetPreview.columns.length > 5 && (
                                                    <th className="px-2 py-1 font-bold text-left text-slate-300">+{datasetPreview.columns.length - 5}</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {datasetPreview.rows.map((row, i) => (
                                                <tr key={i} className="border-t border-slate-100">
                                                    {datasetPreview.columns.slice(0, 5).map(col => (
                                                        <td key={col} className="px-2 py-1 font-mono text-slate-600 whitespace-nowrap">
                                                            {row[col] !== null && row[col] !== undefined ? String(row[col]).substring(0, 8) : '-'}
                                                        </td>
                                                    ))}
                                                    {datasetPreview.columns.length > 5 && (
                                                        <td className="px-2 py-1 text-slate-300">...</td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        {previewLoading && (
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 p-2">
                                <Activity className="w-3 h-3 animate-spin" /> Loading preview...
                            </div>
                        )}
                    </div>

                    {/* Features Section */}
                    <div className="space-y-3 flex-1">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Target & Features</h3>
                            {isCustomDataset && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">Custom</span>
                            )}
                        </div>

                        {isCustomDataset && activeDatasetInfo?.raw_dataset?.target && (
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                                <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Target Variable</span>
                                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Target className="w-3.5 h-3.5 text-orange-500" />
                                    {activeDatasetInfo.raw_dataset.target}
                                </span>
                            </div>
                        )}

                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                            {isCustomDataset ? (
                                availableFeatures.map((feat) => (
                                    <div key={feat} className="flex items-center space-x-2 p-2 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                                        <Checkbox
                                            id={`feat-${feat}`}
                                            checked={checkedFeatures.includes(feat)}
                                            onCheckedChange={() => toggleFeature(feat)}
                                            disabled={isTraining}
                                            className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                        />
                                        <label htmlFor={`feat-${feat}`} className="text-[11px] font-semibold text-slate-700 cursor-pointer flex-1 truncate">
                                            {feat}
                                        </label>
                                    </div>
                                ))
                            ) : (
                                Array.from({ length: inputFeatures }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-100 rounded-lg">
                                        <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-300 to-purple-400 shadow-sm flex items-center justify-center text-white text-[9px] font-bold">In</div>
                                        <span className="text-[11px] font-bold text-slate-600">Feature X{i + 1}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        {isCustomDataset && (
                            <div className="text-[10px] font-medium text-slate-500 text-right">
                                {checkedFeatures.length} selected
                            </div>
                        )}
                    </div>
                </aside>

                {/* Expand toggle when left pane is hidden */}
                {!showLeftPane && (
                    <button
                        onClick={() => setShowLeftPane(true)}
                        className="w-8 bg-white border-r border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors shrink-0"
                        title="Show configuration panel"
                    >
                        <PanelLeftOpen className="w-4 h-4" />
                    </button>
                )}

                {/* Center: Architecture */}
                <main className="flex-1 overflow-hidden bg-slate-50 flex flex-col relative min-w-0">
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                        <div className="flex-1 flex flex-col p-8 relative bg-white border-b border-slate-200">
                            <div className="flex items-center justify-center gap-4 mb-6 relative z-10">
                                <button
                                    onClick={() => handleRemoveLayer(layers.length - 1)}
                                    disabled={isTraining || layers.length === 0}
                                    className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
                                >
                                    <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-sm font-black text-slate-700 uppercase tracking-widest">{layers.length} Hidden Layers</span>
                                <button
                                    onClick={handleAddLayer}
                                    disabled={isTraining || layers.length >= 8}
                                    className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="flex-1 flex justify-around items-center relative" ref={builderRef}>
                                {/* SVG Connections overlay */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 1000 400" preserveAspectRatio="none">
                                    {svgPaths}
                                </svg>

                                {/* Input Layer */}
                                <div className="flex flex-col items-center gap-3 z-10 w-20">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Inputs</span>
                                    <div className="flex flex-col gap-2 items-center">
                                        {Array.from({ length: Math.min(inputFeatures, 7) }).map((_, i) => (
                                            <div key={i} className="w-9 h-9 rounded border-2 border-indigo-200 bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 text-[8px] shadow-sm shadow-indigo-100 overflow-hidden transition-all hover:bg-white hover:border-indigo-400">
                                                {isCustomDataset && checkedFeatures[i]
                                                    ? (checkedFeatures[i].length > 4 ? checkedFeatures[i].substring(0, 3) + '.' : checkedFeatures[i])
                                                    : `X${i + 1}`}
                                            </div>
                                        ))}
                                        {inputFeatures > 7 && (
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="text-slate-400 font-black text-lg leading-none">...</div>
                                                <div className="bg-slate-100 px-2 py-0.5 rounded text-[9px] font-bold text-slate-500">{inputFeatures}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Hidden Layers */}
                                {layers.map((l, li) => (
                                    <div key={li} className="flex flex-col items-center gap-3 z-10 w-32 animate-in zoom-in-95 duration-200">
                                        <div className="flex flex-col items-center gap-1.5 w-full">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight">Neurons</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => updateLayer(li, 'neurons', Math.max(1, parseInt(l.neurons) - 1))}
                                                    disabled={isTraining}
                                                    className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-slate-400 hover:bg-slate-100"
                                                ><Minus className="w-3 h-3" /></button>
                                                <Input
                                                    type="number"
                                                    className="h-6 w-12 text-[10px] font-bold text-center px-1 border-slate-200"
                                                    value={l.neurons}
                                                    min={1}
                                                    max={1024}
                                                    disabled={isTraining}
                                                    onChange={(e) => updateLayer(li, 'neurons', Math.max(1, parseInt(e.target.value) || 1))}
                                                />
                                                <button
                                                    onClick={() => updateLayer(li, 'neurons', Math.min(1024, parseInt(l.neurons) + 1))}
                                                    disabled={isTraining}
                                                    className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-slate-400 hover:bg-slate-100"
                                                ><Plus className="w-3 h-3" /></button>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 items-center">
                                            {Array.from({ length: Math.min(l.neurons, 7) }).map((_, ni) => (
                                                <div key={ni} className="w-9 h-9 rounded-lg border border-slate-300 bg-white shadow-sm flex items-center justify-center">
                                                    <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200" />
                                                </div>
                                            ))}
                                            {l.neurons > 7 && (
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="text-slate-400 font-black text-lg leading-none">...</div>
                                                    <div className="bg-slate-100 px-2 py-0.5 rounded text-[9px] font-bold text-slate-500">{l.neurons}</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Layer-wise Options */}
                                        <div className="w-full space-y-1.5 px-1 bg-slate-50/50 p-1.5 rounded-lg border border-slate-100 mt-1">
                                            <div className="space-y-0.5">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight">Activation</span>
                                                <Select value={l.activation} onValueChange={(v) => updateLayer(li, 'activation', v)} disabled={isTraining}>
                                                    <SelectTrigger className="h-6 w-full text-[9px] font-bold bg-white border-slate-200 shadow-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.keys(config?.activations || {}).map(act => (
                                                            <SelectItem key={act} value={act} className="text-[10px] font-bold">{act}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-0.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-tight">Reg.</span>
                                                    <Select
                                                        value={l.reg_type || 'NONE'}
                                                        onValueChange={(v) => updateLayer(li, 'reg_type', v)}
                                                    >
                                                        <SelectTrigger className="h-5 w-12 text-[8px] px-1 border-slate-100 bg-white">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="NONE">None</SelectItem>
                                                            <SelectItem value="L1">L1</SelectItem>
                                                            <SelectItem value="L2">L2</SelectItem>
                                                            <SelectItem value="BOTH">Both</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="flex flex-col gap-1 mt-0.5">
                                                    <div className="mt-1 flex flex-col gap-1 w-full">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">L1 Weights</span>
                                                            <Input
                                                                type="number" step="0.001" placeholder="Val"
                                                                className="h-5 w-16 text-[8px] px-1"
                                                                value={l.weight_regularizer_l1}
                                                                onChange={(e) => updateLayer(li, 'weight_regularizer_l1', parseFloat(e.target.value) || 0)}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">L1 Biases</span>
                                                            <Input
                                                                type="number" step="0.001" placeholder="Val"
                                                                className="h-5 w-16 text-[8px] px-1"
                                                                value={l.bias_regularizer_l1}
                                                                onChange={(e) => updateLayer(li, 'bias_regularizer_l1', parseFloat(e.target.value) || 0)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="mt-1 flex flex-col gap-1 w-full border-t border-slate-100 pt-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">L2 Weights</span>
                                                            <Input
                                                                type="number" step="0.001" placeholder="Val"
                                                                className="h-5 w-16 text-[8px] px-1"
                                                                value={l.weight_regularizer_l2}
                                                                onChange={(e) => updateLayer(li, 'weight_regularizer_l2', parseFloat(e.target.value) || 0)}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">L2 Biases</span>
                                                            <Input
                                                                type="number" step="0.001" placeholder="Val"
                                                                className="h-5 w-16 text-[8px] px-1"
                                                                value={l.bias_regularizer_l2}
                                                                onChange={(e) => updateLayer(li, 'bias_regularizer_l2', parseFloat(e.target.value) || 0)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Output Layer */}
                                <div className="flex flex-col items-center gap-3 z-10 w-20">
                                    <span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest text-center">Outputs</span>
                                    <div className="flex flex-col gap-2 items-center">
                                        {Array.from({ length: Math.min(outputClasses, 7) }).map((_, i) => {
                                            let label = `Y${i + 1}`;
                                            if (selectedDataset === 'SPIRAL' || selectedDataset === 'VERTICAL') {
                                                label = ['Red', 'Blue', 'Green'][i] || label;
                                            } else if (isCustomDataset && activeDatasetInfo.raw_dataset?.label_mappings) {
                                                const targetCol = activeDatasetInfo.raw_dataset.target;
                                                const mapping = activeDatasetInfo.raw_dataset.label_mappings[targetCol];
                                                if (mapping && mapping.labels) {
                                                    label = mapping.labels[i] || label;
                                                }
                                            }
                                            return (
                                                <div key={i} className="w-10 h-10 rounded-full border-2 border-orange-200 bg-orange-50 shadow-sm shadow-orange-100 flex items-center justify-center font-black text-orange-600 text-[9px] text-center px-1 overflow-hidden leading-tight">{label}</div>
                                            );
                                        })}
                                        {outputClasses > 7 && (
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="text-slate-400 font-black text-lg leading-none">...</div>
                                                <div className="bg-slate-100 px-2 py-0.5 rounded text-[9px] font-bold text-slate-500">{outputClasses}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Right Panel: Graphs */}
                <aside className="w-[360px] bg-[#f1f5f9] border-l border-slate-200 overflow-y-auto shrink-0 p-4 space-y-4">
                    <Card className="border-slate-200 shadow-sm bg-white">
                        <CardHeader className="py-2 px-4 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                                Accuracy
                            </CardTitle>
                            <span className="text-sm font-mono font-bold text-slate-800">
                                {lastMetric.accuracy !== undefined ? (lastMetric.accuracy * 100).toFixed(1) + '%' : '-'}
                            </span>
                        </CardHeader>
                        <CardContent className="p-3 h-[200px]">
                            <Charts metrics={metrics} seriesType="accuracy" />
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm bg-white">
                        <CardHeader className="py-2 px-4 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Target className="w-3.5 h-3.5 text-orange-500" />
                                Loss Curve
                            </CardTitle>
                            <span className="text-sm font-mono font-bold text-slate-800">
                                {lastMetric.loss !== undefined ? lastMetric.loss.toFixed(4) : '-'}
                            </span>
                        </CardHeader>
                        <CardContent className="p-3 h-[200px]">
                            <Charts metrics={metrics} seriesType="loss" />
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm bg-white">
                        <CardHeader className="py-2 px-4 border-b flex flex-row items-center justify-between">
                            <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
                                Learning Rate
                            </CardTitle>
                            <span className="text-sm font-mono font-bold text-slate-800">
                                {lastMetric.learning_rate !== undefined ? lastMetric.learning_rate.toExponential(2) : '-'}
                            </span>
                        </CardHeader>
                        <CardContent className="p-3 h-[200px]">
                            <Charts metrics={metrics} seriesType="learning_rate" />
                        </CardContent>
                    </Card>
                </aside>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-full text-sm font-bold shadow-xl z-50 animate-in slide-in-from-bottom-5">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}
        </div>
    );
}
