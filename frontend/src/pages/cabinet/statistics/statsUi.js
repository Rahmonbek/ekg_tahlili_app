import React from 'react';
import { Chart as ChartJS } from 'chart.js';

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

/**
 * Tartiblangan ro'yxat: № · nom · polosa · qiymat. `segments` berilsa polosa
 * bo'laklarga bo'linadi; polosa uzunligi eng katta qatorga nisbatan.
 */
export function RankList({ rows, empty, onClick, showIndex = true }) {
    if (!rows?.length) return <div className="ls3-empty">{empty}</div>;
    const max = Math.max(...rows.map((r) => r.value || 0), 1);
    const Row = onClick ? 'button' : 'div';
    return (
        <div className="ls3-rank">
            {rows.map((r, i) => {
                const segments = r.segments || [{ value: r.value, color: r.color || '#0f766e' }];
                const segSum = segments.reduce((s, x) => s + (Number(x.value) || 0), 0) || 1;
                return (
                    <Row
                        key={r.key}
                        type={onClick ? 'button' : undefined}
                        className={`ls3-rank-row${onClick ? ' ls3-rank-row--click' : ''}`}
                        style={onClick ? { border: 0, background: 'none', padding: 0, font: 'inherit', color: 'inherit', textAlign: 'left' } : undefined}
                        onClick={onClick ? () => onClick(r) : undefined}
                        title={r.title || r.label}
                    >
                        <span className="ls3-rank-idx">{showIndex ? i + 1 : ''}</span>
                        <span className="ls3-rank-label">{r.label}{r.sub ? <small>{r.sub}</small> : null}</span>
                        <span className="ls3-rank-track" style={{ width: `${Math.round(((r.value || 0) / max) * 100)}%` }}>
                            {segments.map((s, j) => <span key={j} style={{ width: `${((Number(s.value) || 0) / segSum) * 100}%`, background: s.color }} />)}
                        </span>
                        <span className="ls3-rank-val">{r.right ?? <b>{num(r.value)}</b>}</span>
                    </Row>
                );
            })}
        </div>
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

/** Kichik jadval: nom · son · ulush. Tarkib (jinsi, yosh, fayl turi) uchun. */
export function MiniTable({ title, rows, valueLabel, color = '#0f766e', empty }) {
    const total = rows.reduce((s, r) => s + (Number(r.value) || 0), 0);
    const shown = rows.filter((r) => r.value > 0);
    return (
        <div className="ls3-mini">
            <div className="ls3-mini-title">{title}</div>
            {shown.length ? (
                <table className="ls3-mini-table">
                    <thead><tr><th /><th>{valueLabel}</th><th>%</th></tr></thead>
                    <tbody>
                        {shown.map((r) => (
                            <tr key={r.key}>
                                <td>{r.label}</td>
                                <td className="ls3-num"><b>{r.value}</b></td>
                                <td><PctBar part={r.value} total={total} color={r.color || color} /></td>
                            </tr>
                        ))}
                        <tr className="ls3-mini-total"><td>Σ</td><td className="ls3-num"><b>{total}</b></td><td /></tr>
                    </tbody>
                </table>
            ) : <div className="ls3-muted">{empty}</div>}
        </div>
    );
}

/** Tarkib polosasi: sarlavha, bo'lingan polosa, legenda (nom · son · %). */
export function Strip({ title, parts, empty }) {
    const total = parts.reduce((s, p) => s + (Number(p.value) || 0), 0);
    return (
        <div className="ls3-strip">
            <div className="ls3-strip-head">{title}<span>{total || ''}</span></div>
            {total ? (
                <>
                    <div className="ls3-strip-bar">
                        {parts.filter((p) => p.value > 0).map((p) => (
                            <span key={p.key} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${p.value}`} />
                        ))}
                    </div>
                    <div className="ls3-strip-legend">
                        {parts.filter((p) => p.value > 0).map((p) => (
                            <span key={p.key}><i style={{ background: p.color }} />{p.label}<b>{p.value}</b> · {pct(p.value, total)}</span>
                        ))}
                    </div>
                </>
            ) : <div className="ls3-muted">{empty}</div>}
        </div>
    );
}
