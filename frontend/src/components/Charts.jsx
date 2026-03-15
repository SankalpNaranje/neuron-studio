import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, Legend
} from 'recharts';

const chartConfig = [
    {
        key: 'accuracy',
        secondaryKey: 'val_accuracy',
        title: 'Accuracy',
        color: '#f97316', // Orange (Train)
        secondaryColor: '#3b82f6', // Blue (Test)
        domain: [0, 1],
        format: (v) => `${(v * 100).toFixed(1)}%`,
        primaryLabel: 'Train',
        secondaryLabel: 'Test',
    },
    {
        key: 'loss',
        secondaryKey: 'val_loss',
        title: 'Loss',
        color: '#f97316', // Orange (Train)
        secondaryColor: '#3b82f6', // Blue (Test)
        domain: ['auto', 'auto'],
        format: (v) => v.toFixed(4),
        primaryLabel: 'Train',
        secondaryLabel: 'Test',
    },
    {
        key: 'learning_rate',
        secondaryKey: null,
        title: 'Learning Rate',
        color: '#8b5cf6', // Violet
        domain: ['auto', 'auto'],
        format: (v) => v.toExponential(3),
        primaryLabel: 'LR',
    },
];

function MetricChart({ config, data, height = 120 }) {
    const { key, secondaryKey, title, color, secondaryColor, domain, format, primaryLabel, secondaryLabel } = config;

    const hasDualLines = secondaryKey && data.length > 0 && data[0][secondaryKey] !== undefined;

    return (
        <div className="w-full h-full p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</div>
                <div className="text-sm font-black text-slate-900">
                    {data.length > 0 ? format(data[data.length - 1][key]) : '0.000'}
                </div>
            </div>
            <ResponsiveContainer width="100%" height={height}>
                <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                        {hasDualLines && (
                            <linearGradient id={`gradient-${secondaryKey}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.1} />
                                <stop offset="95%" stopColor={secondaryColor} stopOpacity={0} />
                            </linearGradient>
                        )}
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                        dataKey="epoch"
                        hide
                    />
                    <YAxis
                        domain={domain}
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={format}
                        width={60}
                    />
                    <Tooltip
                        contentStyle={{
                            background: '#0f172a',
                            border: 'none',
                            borderRadius: '8px',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                            color: '#f8fafc',
                            fontSize: '11px',
                            padding: '8px 12px',
                        }}
                        itemStyle={{ fontWeight: 'bold' }}
                        formatter={(v, name) => {
                            const label = name === 'Train' || name === 'accuracy' || name === 'loss' ? 'Train' :
                                name === 'Test' || name === 'val_accuracy' || name === 'val_loss' ? 'Test' : name;
                            return [format(v), label];
                        }}
                        labelFormatter={(l) => `Epoch ${l}`}
                        cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                    />
                    {hasDualLines && (
                        <Legend
                            verticalAlign="top"
                            height={20}
                            iconSize={8}
                            wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                        />
                    )}
                    <Area
                        type="monotone"
                        dataKey={key}
                        name={primaryLabel || key}
                        stroke={color}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill={`url(#gradient-${key})`}
                        isAnimationActive={false}
                    />
                    {hasDualLines && (
                        <Area
                            type="monotone"
                            dataKey={secondaryKey}
                            name={secondaryLabel || secondaryKey}
                            stroke={secondaryColor}
                            strokeWidth={2}
                            strokeDasharray="5 3"
                            fillOpacity={1}
                            fill={`url(#gradient-${secondaryKey})`}
                            isAnimationActive={false}
                        />
                    )}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

export default function Charts({ metrics, seriesType }) {
    if (seriesType) {
        const cfg = chartConfig.find(c => c.key === seriesType);
        if (!cfg) return null;
        return <MetricChart config={cfg} data={metrics} height={140} />;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {chartConfig.map((cfg) => (
                <div key={cfg.key} className="bg-white rounded-lg border border-slate-200 shadow-sm">
                    <MetricChart config={cfg} data={metrics} />
                </div>
            ))}
        </div>
    );
}
