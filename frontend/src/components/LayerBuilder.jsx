import React from 'react';
import {
    Layers,
    Trash2,
    Plus,
    Hash,
    ArrowRight,
    Sparkles,
    CircuitBoard
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

export default function LayerBuilder({ layers, onAddLayer, onRemoveLayer, activationOptions, targetClasses }) {
    const [showForm, setShowForm] = React.useState(false);
    const [neurons, setNeurons] = React.useState('');
    const [selectedActivation, setSelectedActivation] = React.useState('RELU');
    const [l1w, setL1w] = React.useState('0');
    const [l2w, setL2w] = React.useState('0');
    const [l1b, setL1b] = React.useState('0');
    const [l2b, setL2b] = React.useState('0');
    const [error, setError] = React.useState('');

    const handleAdd = () => {
        const neu = parseInt(neurons);
        if (!neu || neu < 1) return setError('Neurons must be ≥ 1');
        setError('');
        onAddLayer({
            neurons: neu,
            activation: selectedActivation,
            weight_regularizer_l1: parseFloat(l1w) || 0,
            weight_regularizer_l2: parseFloat(l2w) || 0,
            bias_regularizer_l1: parseFloat(l1b) || 0,
            bias_regularizer_l2: parseFloat(l2b) || 0,
        });
        setNeurons('');
        setL1w('0');
        setL2w('0');
        setL1b('0');
        setL2b('0');
        setShowForm(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between text-slate-400">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <h3 className="text-[11px] font-bold uppercase tracking-wider">Hidden Layers</h3>
                </div>
                {!showForm && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] uppercase font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        onClick={() => setShowForm(true)}
                    >
                        <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                )}
            </div>

            <div className="space-y-2 relative">
                {/* Visual Connector Line */}
                {layers.length > 0 && (
                    <div className="absolute left-[13px] top-6 bottom-6 w-0.5 bg-slate-100 -z-10" />
                )}

                {layers.length === 0 && !showForm && (
                    <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-lg text-[11px] text-slate-400 italic">
                        No hidden layers. Network will map Input directly to Output.
                    </div>
                )}

                {layers.map((layer, idx) => {
                    const isLast = idx === layers.length - 1;

                    return (
                        <div key={idx} className="flex items-center group relative gap-3">
                            <div className="w-7 h-7 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center shrink-0 shadow-sm transition-colors group-hover:border-orange-200">
                                <CircuitBoard className="w-3.5 h-3.5 text-slate-300 group-hover:text-orange-400" />
                            </div>

                            <div className={cn(
                                "flex-1 flex items-center justify-between p-2 rounded-lg border transition-all",
                                isLast ? "bg-orange-50/20 border-orange-100 shadow-sm" : "bg-white border-slate-100 hover:border-slate-200"
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className="space-y-0.5">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Layer {idx + 1}</div>
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center gap-1 text-[12px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                                <Hash className="w-3 h-3" /> {layer.neurons}
                                            </span>
                                            <ArrowRight className="w-3 h-3 text-slate-300" />
                                            <span className="text-[11px] font-bold text-orange-600/80 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                                                {layer.activation}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50"
                                    onClick={() => onRemoveLayer(idx)}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showForm && (
                <div className="bg-white rounded-lg border border-orange-200 p-3 shadow-lg shadow-orange-500/5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Neurons</label>
                            <Input
                                type="number"
                                min="1"
                                value={neurons}
                                onChange={(e) => setNeurons(e.target.value)}
                                placeholder="e.g. 64"
                                className="h-8 text-[12px] bg-slate-50/50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Activation</label>
                            <Select value={selectedActivation} onValueChange={setSelectedActivation}>
                                <SelectTrigger className="h-8 text-[12px] bg-slate-50/50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel className="text-[10px] text-slate-400 uppercase">Built-in</SelectLabel>
                                        {Object.entries(activationOptions).filter(([k]) => !k.startsWith('custom:')).map(([key, info]) => (
                                            <SelectItem key={key} value={key} className="text-[12px]">{info.label}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                    {Object.entries(activationOptions).some(([k]) => k.startsWith('custom:')) && (
                                        <SelectGroup>
                                            <SelectLabel className="text-[10px] text-emerald-500 uppercase mt-1">Project Custom</SelectLabel>
                                            {Object.entries(activationOptions).filter(([k]) => k.startsWith('custom:')).map(([key, info]) => (
                                                <SelectItem key={key} value={key} className="text-[12px] text-emerald-700">{info.label}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">L1 Weight</label>
                            <Input type="number" step="0.001" min="0" value={l1w} onChange={(e) => setL1w(e.target.value)} className="h-7 text-[11px] bg-slate-50/50" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">L2 Weight</label>
                            <Input type="number" step="0.001" min="0" value={l2w} onChange={(e) => setL2w(e.target.value)} className="h-7 text-[11px] bg-slate-50/50" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">L1 Bias</label>
                            <Input type="number" step="0.001" min="0" value={l1b} onChange={(e) => setL1b(e.target.value)} className="h-7 text-[11px] bg-slate-50/50" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">L2 Bias</label>
                            <Input type="number" step="0.001" min="0" value={l2b} onChange={(e) => setL2b(e.target.value)} className="h-7 text-[11px] bg-slate-50/50" />
                        </div>
                    </div>
                    {error && <div className="text-[10px] text-red-500 mb-2 ml-1 italic">⚠ {error}</div>}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-[12px] border-slate-200"
                            onClick={() => { setShowForm(false); setError(''); }}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="flex-1 h-8 text-[12px] bg-orange-600 hover:bg-orange-700"
                            onClick={handleAdd}
                        >
                            Add Layer
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-sm border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-slate-300" />
                </div>
                <div className="flex-1 p-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/30">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Output Goal</div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-semibold text-slate-500">{targetClasses} Classes</span>
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        <span className="text-[11px] font-bold text-blue-600/70 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            SOFTMAX
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
