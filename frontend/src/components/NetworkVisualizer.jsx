import React from 'react';
import { cn } from '@/lib/utils';

export default function NetworkVisualizer({ layers, inputSize = 2 }) {
    const MAX_DISPLAY = 6;

    const columns = [
        { label: 'Input', count: Math.min(inputSize, MAX_DISPLAY), actual: inputSize, color: '#94a3b8' },
        ...layers.map((l, i) => ({
            label: `L${i + 1}`,
            count: Math.min(l.neurons, MAX_DISPLAY),
            actual: l.neurons,
            color: '#f97316',
        })),
        { label: 'Out', count: 3, actual: 3, color: '#3b82f6' }
    ];

    const svgH = 140; // More compact height
    const colW = 60;  // More compact width
    const totalW = Math.max(280, columns.length * colW + 40);
    const nodeR = 6;  // Smaller nodes

    const getNodeY = (colCount, nodeIdx) => {
        const spacing = svgH / (colCount + 1);
        return spacing * (nodeIdx + 1);
    };

    return (
        <div className="w-full overflow-hidden flex flex-col items-center">
            <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                <svg width={totalW} height={svgH} className="mx-auto block">
                    <defs>
                        {columns.map((col, ci) => (
                            <filter key={ci} id={`glow-${ci}`}>
                                <feGaussianBlur stdDeviation="2" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        ))}
                    </defs>

                    {/* Connections */}
                    {columns.slice(0, -1).map((col, ci) => {
                        const nextCol = columns[ci + 1];
                        const x1 = ci * colW + 30 + nodeR;
                        const x2 = (ci + 1) * colW + 30 - nodeR;
                        const lines = [];
                        for (let n1 = 0; n1 < col.count; n1++) {
                            for (let n2 = 0; n2 < nextCol.count; n2++) {
                                lines.push(
                                    <line
                                        key={`${ci}-${n1}-${n2}`}
                                        x1={x1} y1={getNodeY(col.count, n1)}
                                        x2={x2} y2={getNodeY(nextCol.count, n2)}
                                        stroke="rgba(148, 163, 184, 0.15)"
                                        strokeWidth="1"
                                    />
                                );
                            }
                        }
                        return lines;
                    })}

                    {/* Nodes */}
                    {columns.map((col, ci) => (
                        <g key={ci}>
                            <text
                                x={ci * colW + 30}
                                y={12}
                                textAnchor="middle"
                                fill="#94a3b8"
                                className="text-[9px] font-bold uppercase tracking-tighter"
                            >
                                {col.label}
                            </text>
                            {Array.from({ length: col.count }).map((_, ni) => (
                                <circle
                                    key={ni}
                                    cx={ci * colW + 30}
                                    cy={getNodeY(col.count, ni)}
                                    r={nodeR}
                                    fill={col.color}
                                    fillOpacity={0.8}
                                    stroke="white"
                                    strokeWidth="1.5"
                                    className="filter-glow transition-all"
                                />
                            ))}
                            <text
                                x={ci * colW + 30}
                                y={svgH - 4}
                                textAnchor="middle"
                                fill="#64748b"
                                className="text-[10px] font-bold"
                            >
                                {col.actual}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
}
