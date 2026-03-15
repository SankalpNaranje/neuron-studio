import React, { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Terminal({ logs, isTraining }) {
    const terminalRef = useRef(null);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="flex flex-col h-full bg-[#0d1117] border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative group">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 shrink-0 backdrop-blur-sm">
                <div className="flex items-center gap-1.5">
                    <div className="flex gap-1.5 mr-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                    </div>
                    <TerminalIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Console Output</span>
                </div>
                {isTraining && (
                    <div className="flex items-center gap-2 px-2 py-0.5 bg-green-500/10 rounded border border-green-500/20 animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-tight">Streaming Live</span>
                    </div>
                )}
            </div>

            <div
                className="flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed custom-terminal-scrollbar"
                ref={terminalRef}
            >
                {logs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600 italic gap-2 text-center opacity-50">
                        <div className="w-10 h-10 rounded-full border border-dashed border-slate-700 flex items-center justify-center mb-2">
                            <span className="text-slate-500 text-lg">$</span>
                        </div>
                        <p>Waiting for neural network initialization...</p>
                        <p className="text-[10px] mt-1">Configure training parameters and click "Train Network" to begin.</p>
                    </div>
                )}
                {logs.map((log, idx) => (
                    <div key={idx} className={cn(
                        "flex gap-3 py-0.5 animate-in fade-in slide-in-from-left-1 duration-200",
                        log.type === 'error' ? "text-red-400" : log.type === 'done' ? "text-green-400" : "text-slate-300"
                    )}>
                        <span className="text-slate-600 shrink-0 select-none">[{idx + 1}]</span>
                        <div className="flex-1 break-all">
                            {log.type === 'done' ? (
                                <span className="font-bold">✔ {log.message}</span>
                            ) : log.type === 'error' ? (
                                <span className="font-bold underline decoration-red-500/30">✘ {log.message}</span>
                            ) : (
                                <div className="flex gap-2">
                                    <span className="text-orange-500/70 select-none">›</span>
                                    <span>{log.log_line}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Subtle bottom glow when training */}
            {isTraining && (
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent shadow-[0_0_15px_rgba(249,115,22,0.3)]" />
            )}
        </div>
    );
}
