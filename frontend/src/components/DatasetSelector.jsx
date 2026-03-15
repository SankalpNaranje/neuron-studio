import React from 'react';
import { Database, Info } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { cn } from '@/lib/utils';

export default function DatasetSelector({ datasets, selectedDataset, onSelect, inputFeatures, onFeatureChange }) {
    const currentDataset = datasets[selectedDataset];

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400">
                <Database className="w-4 h-4" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider">Dataset Selection</h3>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {Object.entries(datasets).map(([key, info]) => (
                    <button
                        key={key}
                        className={cn(
                            "flex flex-col items-start p-3 rounded-lg border text-left transition-all group",
                            selectedDataset === key
                                ? "bg-orange-50/50 border-orange-200 ring-1 ring-orange-200"
                                : "bg-white border-slate-200 hover:border-orange-200 hover:bg-orange-50/20"
                        )}
                        onClick={() => onSelect(key)}
                    >
                        <div className={cn(
                            "text-[13px] font-semibold mb-0.5 transition-colors",
                            selectedDataset === key ? "text-orange-700" : "text-slate-700"
                        )}>
                            {info.label}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 group-hover:line-clamp-none transition-all">
                            {info.description}
                        </div>
                    </button>
                ))}
            </div>

            {currentDataset && (
                <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-100 space-y-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                        <Info className="w-3.5 h-3.5" />
                        Input Configuration
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <label className="text-[12px] font-medium text-slate-600">Input Features (X)</label>
                        <Input
                            type="number"
                            min="1"
                            className="h-7 w-20 text-[12px] bg-white border-slate-200"
                            value={inputFeatures}
                            onChange={(e) => onFeatureChange(parseInt(e.target.value))}
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 italic bg-white/50 p-1.5 rounded border border-slate-100">
                        Feature count must match the first hidden layer's input dimension.
                    </p>
                </div>
            )}
        </div>
    );
}
