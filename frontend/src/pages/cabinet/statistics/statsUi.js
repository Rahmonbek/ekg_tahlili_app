import React from 'react';
import { Chart as ChartJS } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

import { num, pct } from './statsCommon';

ChartJS.defaults.font.family = "'Open Sans', sans-serif";
ChartJS.defaults.font.size = 12.5;
ChartJS.defaults.color = '#64748b';

export const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { position: 'top', align: 'end', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 14 } },
    },
};

export const intAxis = { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#eef2f7' } };

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');

/** Asosiy raqam (hero qatoridagi bitta katak). */
export function Stat({ label, value, unit, sub, tone }) {
    return (
        <div className={`ls3-stat${tone ? ` ls3-stat--${tone}` : ''}`}>
            <div className="ls3-stat-label">{label}</div>
            <div className="ls3-stat-value">{value}{unit ? <small>{unit}</small> : null}</div>
            {sub ? <div className="ls3-stat-sub">{sub}</div> : null}
        </div>
    );
}

export function Card({ title, extra, children, className = '' }) {
    return (
        <section className={`ls3-card ${className}`}>
            {(title || extra) && (
                <header className="ls3-card-head">
                    <h3>{title}</h3>
                    {extra}
                </header>
            )}
            {children}
        </section>
    );
}

/** Ulush katagi: foiz raqami va kichik polosa (jadval ustunida). */
export function PctBar({ part, total, color = '#dc2626' }) {
    const p = Number(part) || 0;
    const tt = Number(total) || 0;
    if (!tt) return <span className="ls3-muted">—</span>;
    return (
        <span className="ls3-pct">
            <span className="ls3-pct-track"><span style={{ width: `${Math.round((p / tt) * 100)}%`, background: color }} /></span>
            <span className="ls3-pct-text">{pct(p, tt)}</span>
        </span>
    );
}

/** Halqa diagramma ranglari: ketma-ket bo'laklar bir-biridan aniq farqlansin. */
export const RING_PALETTE = ['#dc2626', '#f97316', '#f59e0b', '#84cc16', '#14b8a6', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#78716c'];
export const RING_OTHER = '#cbd5e1';

/**
 * Halqa diagramma + legenda (rang · nom · son · ulush). Markazda jami.
 *
 * `layout="stack"` — halqa tepada, legenda ostida (kichik kartochkalar);
 * `layout="split"` — legenda chapda, katta halqa o'ngda.
 * `rows[i]` = { key, label, sub?, value, color, extra? }; `onPick(row)` —
 * legenda qatori bosilganda.
 */
export function Ring({ rows, totalLabel, empty, layout = 'stack', size = 150, onPick }) {
    const shown = rows.filter((r) => Number(r.value) > 0);
    const total = shown.reduce((s, r) => s + Number(r.value), 0);
    if (!total) return <div className="ls3-empty">{empty}</div>;
    const Item = onPick ? 'button' : 'li';
    return (
        <div className={`ls3-ring ls3-ring--${layout}`}>
            <div className="ls3-ring-chart" style={{ width: size, height: size }}>
                <Doughnut
                    data={{
                        labels: shown.map((r) => r.label),
                        datasets: [{
                            data: shown.map((r) => r.value),
                            backgroundColor: shown.map((r) => r.color),
                            borderColor: '#fff',
                            borderWidth: 2,
                            hoverOffset: 6,
                        }],
                    }}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '66%',
                        layout: { padding: 4 },
                        plugins: {
                            legend: { display: false },
                            tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} (${pct(ctx.raw, total)})` } },
                        },
                    }}
                />
                <div className="ls3-ring-center">
                    <b>{num(total)}</b>
                    {totalLabel ? <span>{totalLabel}</span> : null}
                </div>
            </div>
            <ul className="ls3-ring-legend">
                {shown.map((r) => (
                    <Item
                        key={r.key}
                        type={onPick ? 'button' : undefined}
                        className={`ls3-ring-item${onPick ? ' ls3-ring-item--click' : ''}`}
                        onClick={onPick ? () => onPick(r) : undefined}
                        title={r.title || r.label}
                    >
                        <i style={{ background: r.color }} />
                        <span className="ls3-ring-name">{r.label}{r.sub ? <small>{r.sub}</small> : null}</span>
                        <span className="ls3-ring-val">{r.extra ?? <b>{num(r.value)}</b>}</span>
                        <span className="ls3-ring-pct">{pct(r.value, total)}</span>
                    </Item>
                ))}
            </ul>
        </div>
    );
}
