import React from 'react';
import { Settings, SlidersHorizontal, Info } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { cn } from '@/lib/utils';

export default function OptimizerSelector({ optimizerOptions, selectedOptimizer, onSelect, params, onParamChange }) {
    const currentOptimizer = optimizerOptions[selectedOptimizer];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400">
                <Settings className="w-4 h-4" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider">Optimizer</h3>
            </div>

            <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                    <div className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Built-in</div>
                    {Object.entries(optimizerOptions).filter(([k]) => !k.startsWith('custom:')).map(([key, info]) => (
                        <button
                            key={key}
                            className={cn(
                                "px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all",
                                selectedOptimizer === key
                                    ? "bg-orange-600 border-orange-600 text-white shadow-sm"
                                    : "bg-white border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600"
                            )}
                            onClick={() => onSelect(key)}
                            title={info.description}
                        >
                            {info.label}
                        </button>
                    ))}
                </div>

                {Object.entries(optimizerOptions).some(([k]) => k.startsWith('custom:')) && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                        <div className="w-full text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Project Custom</div>
                        {Object.entries(optimizerOptions).filter(([k]) => k.startsWith('custom:')).map(([key, info]) => (
                            <button
                                key={key}
                                className={cn(
                                    "px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all",
                                    selectedOptimizer === key
                                        ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                        : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300"
                                )}
                                onClick={() => onSelect(key)}
                                title={info.description}
                            >
                                {info.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {currentOptimizer && (
                <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-100 space-y-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Hyperparameters
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {currentOptimizer.params.map((param) => (
                            <div key={param.name} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-1.5">
                                    <label className="text-[12px] font-medium text-slate-600 whitespace-nowrap">{param.label}</label>
                                    <div className="group relative">
                                        <Info className="w-3 h-3 text-slate-300 cursor-help" />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity w-32 text-center z-20">
                                            Default: {param.default}
                                        </div>
                                    </div>
                                </div>
                                <Input
                                    type="number"
                                    step="any"
                                    className="h-7 w-20 text-[12px] bg-white border-slate-200"
                                    value={params[param.name] ?? param.default}
                                    onChange={(e) => onParamChange(param.name, parseFloat(e.target.value))}
                                    placeholder={String(param.default)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
