import React from 'react';
import { Target, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LossSelector({ lossOptions, selectedLoss, onSelect }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-400">
                <Target className="w-4 h-4" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider">Objective Function</h3>
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ms-1">Built-in</div>
                    {Object.entries(lossOptions).filter(([k]) => !k.startsWith('custom:')).map(([key, info]) => (
                        <button
                            key={key}
                            className={cn(
                                "flex flex-col items-start p-3 rounded-lg border text-left transition-all group",
                                selectedLoss === key
                                    ? "bg-orange-50/50 border-orange-200 ring-1 ring-orange-200"
                                    : "bg-white border-slate-200 hover:border-orange-200 hover:bg-orange-50/20"
                            )}
                            onClick={() => onSelect(key)}
                        >
                            <div className={cn(
                                "text-[13px] font-semibold mb-0.5 transition-colors",
                                selectedLoss === key ? "text-orange-700" : "text-slate-700"
                            )}>
                                {info.label}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1 group-hover:line-clamp-none transition-all">
                                {info.description}
                            </div>
                        </button>
                    ))}
                </div>

                {Object.entries(lossOptions).some(([k]) => k.startsWith('custom:')) && (
                    <div className="grid grid-cols-1 gap-2 pt-2 border-t border-slate-100">
                        <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest ms-1">Project Custom</div>
                        {Object.entries(lossOptions).filter(([k]) => k.startsWith('custom:')).map(([key, info]) => (
                            <button
                                key={key}
                                className={cn(
                                    "flex flex-col items-start p-3 rounded-lg border text-left transition-all group",
                                    selectedLoss === key
                                        ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-300"
                                        : "bg-emerald-50/20 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/40"
                                )}
                                onClick={() => onSelect(key)}
                            >
                                <div className={cn(
                                    "text-[13px] font-semibold mb-0.5 transition-colors",
                                    selectedLoss === key ? "text-emerald-700" : "text-slate-700"
                                )}>
                                    {info.label}
                                </div>
                                <div className="text-[11px] text-slate-500 line-clamp-1 group-hover:line-clamp-none transition-all">
                                    {info.description}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
