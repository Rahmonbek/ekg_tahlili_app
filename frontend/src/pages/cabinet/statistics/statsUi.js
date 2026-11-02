import React from 'react';
import { Chart as ChartJS } from 'chart.js';

import { num, pct } from './statsCommon';

// Grafiklar sahifa shriftida — standart 12px Helvetica juda mayda ko'rinardi
ChartJS.defaults.font.family = "'Open Sans', sans-serif";
ChartJS.defaults.font.size = 12.5;
ChartJS.defaults.color = '#64748b';

/** Chart.js umumiy sozlamalari (ixcham legenda pastda). */
export const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 14 } },
    },
};

/** Butun sonli o'q. */
export const intAxis = { beginAtZero: true, ticks: { precision: 0 } };

/**
 * Asosiy raqam kartochkasi. `tone` chap chiziq rangi: primary (standart) |
 * high | low | blue | gray. `unit` — raqam yonidagi kichik belgi ("%").
 */
export function Kpi({ label, value, unit, sub, tone }) {
    return (
        <div className={`lsx-kpi${tone ? ` lsx-kpi--${tone}` : ''}`}>
            <div className="lsx-kpi-label">{label}</div>
            <div className="lsx-kpi-value">{value}{unit ? <small>{unit}</small> : null}</div>
            {sub ? <div className="lsx-kpi-sub">{sub}</div> : null}
        </div>
    );
}

export function Panel({ title, extra, children, className = '' }) {
    return (
        <section className={`lsx-panel ${className}`}>
            {(title || extra) && (
                <header className="lsx-panel-head">
                    <h3>{title}</h3>
                    {extra}
                </header>
            )}
            {children}
        </section>
    );
}

/**
 * Gorizontal chiziqli ro'yxat — doira diagrammasidan o'qilishi oson:
 * nom, polosa va raqam bir qatorda. `rows[i].segments` berilsa polosa
 * bo'laklarga bo'linadi (me'yorda / me'yordan tashqari), aks holda
 * `value` va `color` bilan bitta bo'lak. Polosa uzunligi — eng katta
 * qatorga nisbatan.
 */
export function BarList({ rows, onClick, activeKey, empty, showPct = true, total, labelWidth }) {
    if (!rows?.length) return <div className="lsx-empty">{empty}</div>;
    const style = labelWidth ? { gridTemplateColumns: `${labelWidth}px minmax(0, 1fr) auto` } : undefined;
    const max = Math.max(...rows.map((r) => r.value || 0), 1);
    const sum = total ?? rows.reduce((s, r) => s + (Number(r.value) || 0), 0);
    return (
        <div className="lsx-bars">
            {rows.map((r) => {
                const width = `${Math.round(((r.value || 0) / max) * 100)}%`;
                const segments = r.segments || [{ value: r.value, color: r.color || '#00b39a' }];
                const segSum = segments.reduce((s, x) => s + (Number(x.value) || 0), 0) || 1;
                const Row = onClick ? 'button' : 'div';
                return (
                    <Row
                        key={r.key}
                        type={onClick ? 'button' : undefined}
                        className={`lsx-bar-row${onClick ? ' lsx-bar-row--click' : ''}${activeKey === r.key ? ' lsx-bar-row--active' : ''}`}
                        onClick={onClick ? () => onClick(r) : undefined}
                        style={style}
                        title={r.title || r.label}
                    >
                        <span className="lsx-bar-label">{r.label}{r.sub ? <small>{r.sub}</small> : null}</span>
                        <span className="lsx-bar-track" style={{ width }}>
                            {segments.map((s, i) => (
                                <span key={i} className="lsx-bar-seg" style={{ width: `${((Number(s.value) || 0) / segSum) * 100}%`, background: s.color }} />
                            ))}
                        </span>
                        <span className="lsx-bar-val">
                            {r.right ?? <><b>{num(r.value)}</b>{showPct && sum ? ` · ${pct(r.value, sum)}` : ''}</>}
                        </span>
                    </Row>
                );
            })}
        </div>
    );
}

/** Bitta bo'lingan polosa + legenda (AI jiddiylik darajasi kabi 2–4 qism). */
export function StackBar({ parts, empty }) {
    const total = parts.reduce((s, p) => s + (Number(p.value) || 0), 0);
    if (!total) return <div className="lsx-empty">{empty}</div>;
    return (
        <>
            <div className="lsx-stack">
                {parts.map((p) => (
                    <span key={p.key} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${p.value}`} />
                ))}
            </div>
            <div className="lsx-legend">
                {parts.map((p) => (
                    <div key={p.key} className="lsx-legend-row">
                        <i style={{ background: p.color }} />
                        <span>{p.label}</span>
                        <b>{p.value}</b>
                        <small>{pct(p.value, total)}</small>
                    </div>
                ))}
            </div>
        </>
    );
}

/** "Me'yordan tashqari" katagi: ↑ ↓ sonlar va ulush polosasi. */
export function RateCell({ high, low, assessed }) {
    const h = Number(high) || 0;
    const l = Number(low) || 0;
    const a = Number(assessed) || 0;
    if (!a) return <span className="lsx-muted">—</span>;
    const rate = (h + l) / a;
    return (
        <div className="lsx-rate">
            <span className="lsx-nowrap">
                {h ? <span className="lsx-high">↑{h}</span> : null}
                {h && l ? ' ' : null}
                {l ? <span className="lsx-low">↓{l}</span> : null}
                {!h && !l ? <span className="lsx-muted">0</span> : null}
            </span>
            <span className="lsx-rate-track"><span className="lsx-rate-fill" style={{ width: `${Math.round(rate * 100)}%` }} /></span>
            <span className="lsx-rate-text">{pct(h + l, a)}</span>
        </div>
    );
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');
