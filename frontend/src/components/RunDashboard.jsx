import React, { useState, useEffect } from 'react';
import {
    TerminalSquare, Calendar, Zap, LayoutDashboard, ChevronRight,
    Activity, ArrowLeft, Settings2, Target, BarChart2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import Charts from './Charts';
import { saveRun } from '../services/api';

export default function RunDashboard({ projectName, onInitializeClick }) {
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRun, setSelectedRun] = useState(null);

    useEffect(() => {
        const fetchRuns = async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/workspace/projects/${projectName}/runs`);
                if (res.ok) {
                    const data = await res.json();
                    setRuns(data);
                }
            } catch (e) {
                console.error("Failed to fetch runs:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchRuns();
    }, [projectName]);

    const formatTime = (ts) => {
        try {
            // ts is YYYYMMDD_HHMMSS
            const year = ts.substring(0, 4);
            const month = ts.substring(4, 6);
            const day = ts.substring(6, 8);
            const hour = ts.substring(9, 11);
            const min = ts.substring(11, 13);
            return `${year}-${month}-${day} ${hour}:${min}`;
        } catch {
            return ts;
        }
    };

    if (selectedRun) {
        // Run Details View
        const metrics = selectedRun.metrics || [];
        const finalMetric = metrics[metrics.length - 1] || {};
        const config = selectedRun.config || {};

        return (
            <div className="h-full flex flex-col bg-slate-50 relative animate-in slide-in-from-right-8 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSelectedRun(null)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <TerminalSquare className="w-4 h-4 text-emerald-500" />
                                <h2 className="text-lg font-bold text-slate-800">Run Details: {selectedRun.id}</h2>
                            </div>
                            <div className="text-xs text-slate-500 font-medium">{formatTime(selectedRun.timestamp)}</div>
                        </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-3">
                        {selectedRun.metadata?.is_saved ? (
                            <div className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full flex items-center gap-1">
                                <Zap className="w-4 h-4" /> Model Saved
                            </div>
                        ) : (
                            <Button
                                size="sm"
                                className="h-8 bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                                onClick={async () => {
                                    try {
                                        await saveRun(projectName, selectedRun.id);
                                        setSelectedRun(prev => ({
                                            ...prev,
                                            metadata: { ...prev.metadata, is_saved: true }
                                        }));
                                        setRuns(prev => prev.map(r => r.id === selectedRun.id ? { ...r, metadata: { ...r.metadata, is_saved: true } } : r));
                                    } catch (e) {
                                        alert(e.message);
                                    }
                                }}
                            >
                                <Target className="w-3.5 h-3.5" />
                                Save Run
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Pane: Metadata */}
                    <div className="w-80 border-r bg-white p-6 overflow-auto custom-scrollbar shrink-0">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Configuration</h3>

                        <div className="space-y-4">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <Target className="w-3 h-3" /> Dataset
                                </div>
                                <div className="text-sm font-semibold text-slate-700">{config.dataset || 'Unknown'}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Epochs</div>
                                    <div className="text-sm font-semibold text-slate-700">{config.epochs || 0}</div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Batch Size</div>
                                    <div className="text-sm font-semibold text-slate-700">{config.batch_size || 'Full'}</div>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <Settings2 className="w-3 h-3" /> Optimizer
                                </div>
                                <div className="text-sm font-semibold text-slate-700 break-all">{config.optimizer || 'Unknown'}</div>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    <Zap className="w-3 h-3" /> Loss Function
                                </div>
                                <div className="text-sm font-semibold text-slate-700 break-all">{config.loss_function || 'Unknown'}</div>
                            </div>
                        </div>

                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-8 mb-4">Final Results</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 relative overflow-hidden group">
                                <div className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-wider mb-1">Accuracy</div>
                                <div className="text-xl font-bold text-emerald-700 group-hover:scale-105 transition-transform origin-left">
                                    {finalMetric.accuracy ? (finalMetric.accuracy * 100).toFixed(2) + '%' : '-'}
                                </div>
                            </div>
                            <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 relative overflow-hidden group">
                                <div className="text-[10px] font-bold text-rose-600/70 uppercase tracking-wider mb-1">Loss</div>
                                <div className="text-xl font-bold text-rose-700 group-hover:scale-105 transition-transform origin-left">
                                    {finalMetric.loss ? finalMetric.loss.toFixed(4) : '-'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Pane: Visualization */}
                    <div className="flex-1 p-8 overflow-auto custom-scrollbar flex flex-col bg-slate-50/50">
                        <div className="w-full max-w-4xl mx-auto space-y-8">
                            <div>
                                <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2 mb-4">
                                    <BarChart2 className="w-5 h-5 text-emerald-500" />
                                    Training Curves
                                </h3>
                                <Charts metrics={metrics} />
                            </div>

                            {metrics.length > 0 && (
                                <div className="mt-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                        <h3 className="text-[13px] font-bold text-slate-700 uppercase tracking-widest">Sample Data Points</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="bg-white border-b border-slate-100">
                                                    <th className="px-4 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Epoch</th>
                                                    <th className="px-4 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Accuracy</th>
                                                    <th className="px-4 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Loss</th>
                                                    <th className="px-4 py-3 font-bold text-slate-400 uppercase text-[10px] tracking-wider">Learning Rate</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {metrics.filter((_, i) => i === 0 || i === metrics.length - 1 || i % Math.ceil(metrics.length / 5) === 0).map((m, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-mono text-slate-600">{m.epoch}</td>
                                                        <td className="px-4 py-3 font-semibold text-emerald-600">{(m.accuracy * 100).toFixed(2)}%</td>
                                                        <td className="px-4 py-3 font-semibold text-rose-600">{m.loss.toFixed(4)}</td>
                                                        <td className="px-4 py-3 text-slate-500">{m.learning_rate.toExponential(4)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div >
        );
    }

    // Dashboard View
    return (
        <div className="h-full flex flex-col bg-white">
            <div className="flex items-center justify-between px-8 py-6 border-b shrink-0 bg-slate-50/50">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <LayoutDashboard className="w-6 h-6 text-emerald-500" />
                        Run Dashboard
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Experiment tracking and model history for {projectName}</p>
                </div>
                <Button
                    onClick={onInitializeClick}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/20"
                >
                    <Zap className="w-4 h-4 fill-current" /> Initialize Run
                </Button>
            </div>

            <div className="flex-1 p-8 overflow-auto custom-scrollbar">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-slate-400">Loading runs...</div>
                ) : runs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
                        <TerminalSquare className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700">No Runs Found</h3>
                        <p className="text-slate-500 mt-1">Click "Initialize Run" to start your first training experiment.</p>
                    </div>
                ) : (
                    <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Run ID</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Date</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Optimizer</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Loss Func</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Layers</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Status</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Final Acc</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]">Final Loss</th>
                                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[11px]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {runs.map((run) => {
                                    const c = run.config || {};
                                    const meta = run.metadata || {};
                                    const finalAcc = meta.final_accuracy !== null ? meta.final_accuracy : '-';
                                    const finalLoss = meta.final_loss !== null ? meta.final_loss : '-';

                                    return (
                                        <tr
                                            key={run.id}
                                            className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                            onClick={() => setSelectedRun(run)}
                                        >
                                            <td className="px-6 py-4 font-mono text-emerald-600 font-semibold">{run.id}</td>
                                            <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    {formatTime(run.timestamp)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                <span className="bg-slate-100 px-2 py-1 rounded text-xs font-semibold">{meta.optimizer || c.optimizer || '-'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 truncate max-w-[150px]" title={meta.loss || c.loss_function}>{meta.loss || c.loss_function || '-'}</td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">{c.layers ? c.layers.length : '-'}</td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">
                                                {meta.is_saved ? <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Saved</span> : <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">Unsaved</span>}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-emerald-600">
                                                {finalAcc !== '-' ? (finalAcc * 100).toFixed(1) + '%' : '-'}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-rose-600">
                                                {finalLoss !== '-' ? finalLoss.toFixed(4) : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
