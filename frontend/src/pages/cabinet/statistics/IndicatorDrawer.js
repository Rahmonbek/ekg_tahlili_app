import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Drawer, Spin, Table } from 'antd';
import { Bar } from 'react-chartjs-2';

import { get_lab_stats_indicator } from '../../../host/requests/LabStatisticsRequest';
import { AGE_GROUPS, COLORS, RESULT_KIND_META, num, pct, pick } from './statsCommon';
import { Card, RankList, Stat, chartOptions, fmtDate, intAxis } from './statsUi';

export const nameOf = (r, lang) => r[`name_${lang}`] || r.name_uz || r.column_name;

/**
 * Bitta ko'rsatkich: asosiy raqamlar, qiymatlar taqsimoti, oylik mediana,
 * jins/yosh kesimi va oxirgi natijasi me'yordan tashqari bemorlar.
 * Oyna `body` ga chiziladi — `ls3` o'zgaruvchilari `rootClassName` orqali.
 */
export default function IndicatorDrawer({ row, params, lang, onClose }) {
    const { t } = useTranslation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!row) return undefined;
        let alive = true;
        setLoading(true);
        setData(null);
        get_lab_stats_indicator(row.column_name, params)
            .then((r) => alive && setData(r.data))
            .catch(() => alive && setData(null))
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [row, params]);

    const unit = row?.measure || '';
    const L = {
        n: t('stats_n', { defaultValue: 'Natijalar' }),
        patients: t('stats_patients_short', { defaultValue: 'bemor' }),
        high: t('stats_high', { defaultValue: 'Yuqori' }),
        low: t('stats_low', { defaultValue: 'Past' }),
        median: t('stats_median', { defaultValue: 'Mediana' }).replace(/\s*\(.*\)\s*$/, ''),
        normal: t('stats_normal', { defaultValue: "Me'yorda" }),
        out: t('stats_out_of_range', { defaultValue: "Me'yordan tashqari" }),
        unknown: t('stats_unknown', { defaultValue: "Noma'lum" }),
        empty: t('stats_no_data', { defaultValue: "Tanlangan filtr bo'yicha ma'lumot yo'q" }),
    };
    const sexLabel = (k) => ({ male: t('male', { defaultValue: 'Erkak' }), female: t('female', { defaultValue: 'Ayol' }) }[k] || L.unknown);

    // Sifat va kodli ko'rsatkichlar (HBsAg, qon guruhi…) uchun mediana va
    // gistogramma ma'nosiz — holatlar taqsimoti ko'rsatiladi
    const categorical = row && row.value_kind && row.value_kind !== 'numeric';
    const kindLabel = (k) => (row?.value_kind === 'qualitative' ? pick(RESULT_KIND_META[k], lang) || k : k);
    const kindColor = { NEGATIVE: COLORS.primary, POSITIVE: COLORS.high, EQUIVOCAL: COLORS.low, INVALID: COLORS.gray, UNKNOWN: COLORS.gray };
    const kindRows = (data?.kinds || []).map((k, i) => ({
        key: k.key,
        label: kindLabel(k.key),
        value: Number(k.n) || 0,
        color: kindColor[k.key] || COLORS.palette[i % COLORS.palette.length],
        right: <><b>{k.n}</b> <span className="ls3-muted">· {pct(k.n, row?.n)} · {k.patients} {L.patients}</span></>,
    }));

    const histogram = data?.histogram || [];
    // Chekka ustunlarga p01 dan past / p99 dan baland qiymatlar ham kiradi
    const binLabel = (h) => (h.edge === 'low' ? `< ${num(h.to)}` : h.edge === 'high' ? `≥ ${num(h.from)}` : `${num(h.from)}–${num(h.to)}`);
    const monthly = data?.monthly || [];
    const byAge = Object.fromEntries((data?.byAge || []).map((r) => [r.key, r]));

    const cnt = (v, r, cls, arrow) => (Number(v) ? <span className={cls}>{arrow}{v} <span className="ls3-muted">({pct(v, r.n)})</span></span> : <span className="ls3-muted">0</span>);
    const groupColumns = (firstTitle, firstRender) => [
        { title: firstTitle, dataIndex: 'key', render: firstRender },
        // Tor kartada sig'sin: ↑/↓ sarlavhalari belgi bilan, to'liq nomi maslahatda
        { title: L.n, dataIndex: 'n', align: 'right', className: 'ls3-num' },
        { title: <span title={L.high}>↑</span>, dataIndex: 'high', align: 'right', className: 'ls3-num', render: (v, r) => cnt(v, r, 'ls3-high', '') },
        { title: <span title={L.low}>↓</span>, dataIndex: 'low', align: 'right', className: 'ls3-num', render: (v, r) => cnt(v, r, 'ls3-low', '') },
        ...(categorical ? [] : [{ title: L.median, dataIndex: 'median', align: 'right', className: 'ls3-num', render: (v) => num(v) }]),
    ];

    return (
        <Drawer
            rootClassName="ls3 ls3-drawer"
            open={!!row}
            onClose={onClose}
            width={Math.min(960, window.innerWidth - 24)}
            title={row ? `${nameOf(row, lang)}${unit ? `, ${unit}` : ''}` : ''}
            destroyOnClose
        >
            <Spin spinning={loading}>
                {row && (
                    <div className="ls3-hero">
                        <Stat label={L.n} value={row.n} sub={`${row.patients} ${L.patients}`} />
                        <Stat label={`↑ ${L.high}`} value={row.high || 0} tone={Number(row.high) ? 'high' : undefined} />
                        <Stat label={`↓ ${L.low}`} value={row.low || 0} tone={Number(row.low) ? 'low' : undefined} />
                        {!categorical && <Stat label={L.median} value={num(row.median)} unit={unit} />}
                        {!categorical && <Stat label="P10–P90" value={`${num(row.p10)}–${num(row.p90)}`} />}
                    </div>
                )}

                {categorical && (
                    <Card title={t('stats_kinds', { defaultValue: 'Natijalar taqsimoti' })}>
                        <RankList rows={kindRows} empty={L.empty} showIndex={false} />
                    </Card>
                )}

                {!categorical && (
                    <div className="ls3-cols ls3-cols--half">
                        <Card title={t('stats_distribution', { defaultValue: 'Qiymatlar taqsimoti' })}>
                            <div className="ls3-chart" style={{ height: 230 }}>
                                {histogram.length ? (
                                    <Bar
                                        data={{
                                            labels: histogram.map(binLabel),
                                            datasets: [
                                                { label: L.normal, data: histogram.map((h) => h.count - h.abnormal), backgroundColor: '#5eead4', borderRadius: 2 },
                                                { label: L.out, data: histogram.map((h) => h.abnormal), backgroundColor: COLORS.high, borderRadius: 2 },
                                            ],
                                        }}
                                        options={{ ...chartOptions, scales: { x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 50, autoSkip: true } }, y: { stacked: true, ...intAxis } } }}
                                    />
                                ) : <div className="ls3-empty">{L.empty}</div>}
                            </div>
                        </Card>
                        <Card title={t('stats_monthly', { defaultValue: "Oylar bo'yicha mediana" })}>
                            <div className="ls3-chart" style={{ height: 230 }}>
                                {monthly.length ? (
                                    <Bar
                                        data={{
                                            labels: monthly.map((m) => { const [y, mm] = String(m.period).split('-'); return mm ? `${mm}.${y}` : m.period; }),
                                            datasets: [
                                                { type: 'line', label: `${L.median}${unit ? `, ${unit}` : ''}`, data: monthly.map((m) => m.median), borderColor: '#0f766e', backgroundColor: '#0f766e', yAxisID: 'y', tension: 0.3, spanGaps: true },
                                                { type: 'bar', label: L.out, data: monthly.map((m) => m.abnormal), backgroundColor: COLORS.highSoft, borderColor: COLORS.high, borderWidth: 1, borderRadius: 2, yAxisID: 'y1' },
                                            ],
                                        }}
                                        options={{
                                            ...chartOptions,
                                            scales: {
                                                x: { grid: { display: false } },
                                                y: { position: 'left', grid: { color: '#eef2f7' } },
                                                y1: { position: 'right', grid: { drawOnChartArea: false }, ...intAxis },
                                            },
                                        }}
                                    />
                                ) : <div className="ls3-empty">{L.empty}</div>}
                            </div>
                        </Card>
                    </div>
                )}

                <div className="ls3-cols ls3-cols--half">
                    <Card title={t('stats_by_sex_short', { defaultValue: "Jinsi bo'yicha" })}>
                        <Table size="small" pagination={false} rowKey="key" dataSource={data?.bySex || []}
                            columns={groupColumns(t('gender', { defaultValue: 'Jinsi' }), sexLabel)} />
                    </Card>
                    <Card title={t('stats_by_age_short', { defaultValue: 'Yosh guruhlari' })}>
                        <Table size="small" pagination={false} rowKey="key"
                            dataSource={AGE_GROUPS.filter((g) => byAge[g]).map((g) => ({ ...byAge[g], key: g }))}
                            columns={groupColumns(t('stats_age', { defaultValue: 'Yoshi' }), (k) => (k === 'unknown' ? L.unknown : k))} />
                    </Card>
                </div>

                <Card title={t('stats_patients_out', { defaultValue: "Oxirgi natijasi me'yordan tashqari bemorlar" })}>
                    <Table
                        size="small"
                        rowKey={(r) => `${r.patient_id}-${r.lab_analysis_id}`}
                        dataSource={data?.patients || []}
                        pagination={{ pageSize: 10, showSizeChanger: false, size: 'small' }}
                        scroll={{ x: 640 }}
                        locale={{ emptyText: L.empty }}
                        columns={[
                            {
                                title: t('patient', { defaultValue: 'Bemor' }), key: 'p',
                                render: (_, r) => <Link to={`/patcients/${r.patient_id}`} className="ls3-cell-name">{`${r.lastname || ''} ${r.firstname || ''}`.trim()}</Link>,
                            },
                            {
                                title: t('stats_value', { defaultValue: 'Qiymat' }), key: 'v', align: 'right', width: 150,
                                render: (_, r) => (
                                    <span className={r.flag === 1 ? 'ls3-high' : 'ls3-low'} style={{ whiteSpace: 'nowrap' }}>
                                        {r.flag === 1 ? '↑ ' : '↓ '}{r.text || num(r.value)} {r.unit || ''}
                                    </span>
                                ),
                            },
                            {
                                title: t('norm', { defaultValue: 'norma' }), key: 'ref', width: 190,
                                render: (_, r) => (r.ref_low != null || r.ref_high != null
                                    ? <span style={{ whiteSpace: 'nowrap' }}>{num(r.ref_low)}–{num(r.ref_high)} <span className="ls3-muted">({t('lab_ref_source', { defaultValue: 'laboratoriya' })})</span></span>
                                    : <span className="ls3-muted">{t('stats_catalog_ref', { defaultValue: 'katalog' })}</span>),
                            },
                            { title: t('stats_date', { defaultValue: 'Sana' }), dataIndex: 'measured_at', width: 110, render: fmtDate },
                            { title: '', key: 'a', width: 90, render: (_, r) => <Link to={`/lab-analyses/view/${r.lab_analysis_id}`}>{t('stats_open', { defaultValue: 'Tahlil' })} →</Link> },
                        ]}
                    />
                </Card>
            </Spin>
        </Drawer>
    );
}
