import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Drawer, Spin, Table } from 'antd';
import { Bar } from 'react-chartjs-2';

import { get_lab_stats_indicator } from '../../../host/requests/LabStatisticsRequest';
import { AGE_GROUPS, COLORS, RESULT_KIND_META, num, pct, pick } from './statsCommon';
import { BarList, Kpi, Panel, chartOptions, fmtDate, intAxis } from './statsUi';

export const nameOf = (r, lang) => r[`name_${lang}`] || r.name_uz || r.column_name;

/** Bitta ko'rsatkich: taqsimot, oylik mediana, jins/yosh, me'yordan tashqari bemorlar. */
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
        high: t('stats_high', { defaultValue: 'Yuqori' }),
        low: t('stats_low', { defaultValue: 'Past' }),
        median: t('stats_median', { defaultValue: 'Mediana' }),
        normal: t('stats_normal', { defaultValue: "Me'yorda" }),
        out: t('stats_out_of_range', { defaultValue: "Me'yordan tashqari" }),
        unknown: t('stats_unknown', { defaultValue: "Noma'lum" }),
    };
    const sexLabel = (k) => ({ male: t('male', { defaultValue: 'Erkak' }), female: t('female', { defaultValue: 'Ayol' }) }[k] || L.unknown);
    const empty = t('stats_no_data', { defaultValue: "Tanlangan filtr bo'yicha ma'lumot yo'q" });

    // Sifat va kodli ko'rsatkichlar (HBsAg, qon guruhi…) uchun mediana va
    // gistogramma ma'nosiz — holatlar taqsimoti ko'rsatiladi
    const categorical = row && row.value_kind && row.value_kind !== 'numeric';
    const kindLabel = (k) => (row?.value_kind === 'qualitative' ? pick(RESULT_KIND_META[k], lang) || k : k);
    const kindColor = { NEGATIVE: COLORS.primary, POSITIVE: COLORS.high, EQUIVOCAL: COLORS.low, INVALID: COLORS.gray, UNKNOWN: COLORS.gray };
    const kindRows = (data?.kinds || []).map((k, i) => ({
        key: k.key, label: kindLabel(k.key), value: k.n, color: kindColor[k.key] || COLORS.palette[i % COLORS.palette.length],
        sub: `${k.patients} ${t('stats_patients_short', { defaultValue: 'bemor' })}`,
    }));

    const histogram = data?.histogram || [];
    // Chekka ustunlarga p01 dan past / p99 dan baland qiymatlar ham kiradi
    const binLabel = (h) => (h.edge === 'low' ? `< ${num(h.to)}` : h.edge === 'high' ? `≥ ${num(h.from)}` : `${num(h.from)}–${num(h.to)}`);
    const monthly = data?.monthly || [];
    const byAge = Object.fromEntries((data?.byAge || []).map((r) => [r.key, r]));

    const groupColumns = (firstTitle, firstRender) => [
        { title: firstTitle, dataIndex: 'key', render: firstRender },
        { title: L.n, dataIndex: 'n', align: 'right', width: 90 },
        { title: L.high, dataIndex: 'high', align: 'right', width: 110, render: (v, r) => (v ? <span className="lsx-high">↑{v} <span className="lsx-muted">({pct(v, r.n)})</span></span> : '—') },
        { title: L.low, dataIndex: 'low', align: 'right', width: 110, render: (v, r) => (v ? <span className="lsx-low">↓{v} <span className="lsx-muted">({pct(v, r.n)})</span></span> : '—') },
        ...(categorical ? [] : [{ title: L.median, dataIndex: 'median', align: 'right', width: 100, render: (v) => num(v) }]),
    ];

    return (
        <Drawer
            className="lsx-drawer"
            open={!!row}
            onClose={onClose}
            width={Math.min(960, window.innerWidth - 24)}
            title={row ? `${nameOf(row, lang)}${unit ? `, ${unit}` : ''}` : ''}
            destroyOnClose
        >
            <Spin spinning={loading}>
                {row && (
                    <div className="lsx-kpis">
                        <Kpi label={L.n} value={row.n} sub={`${row.patients} ${t('stats_patients_short', { defaultValue: 'bemor' })}`} />
                        <Kpi label={L.high} value={row.high || 0} tone="high" />
                        <Kpi label={L.low} value={row.low || 0} tone="low" />
                        {!categorical && <Kpi label={L.median} value={num(row.median)} unit={unit} tone="blue" />}
                        {!categorical && <Kpi label="P10–P90" value={`${num(row.p10)}–${num(row.p90)}`} tone="gray" />}
                    </div>
                )}

                {categorical && (
                    <Panel title={t('stats_kinds', { defaultValue: 'Natijalar taqsimoti' })}>
                        <BarList rows={kindRows} empty={empty} />
                    </Panel>
                )}

                {!categorical && (
                    <div className="lsx-grid lsx-grid--2">
                        <Panel title={t('stats_distribution', { defaultValue: 'Qiymatlar taqsimoti' })}>
                            <div className="lsx-chart">
                                {histogram.length ? (
                                    <Bar
                                        data={{
                                            labels: histogram.map(binLabel),
                                            datasets: [
                                                { label: L.normal, data: histogram.map((h) => h.count - h.abnormal), backgroundColor: COLORS.primary, borderRadius: 2 },
                                                { label: L.out, data: histogram.map((h) => h.abnormal), backgroundColor: COLORS.high, borderRadius: 2 },
                                            ],
                                        }}
                                        options={{ ...chartOptions, scales: { x: { stacked: true, ticks: { maxRotation: 50, autoSkip: true } }, y: { stacked: true, ...intAxis } } }}
                                    />
                                ) : <div className="lsx-empty">{empty}</div>}
                            </div>
                        </Panel>
                        <Panel title={t('stats_monthly', { defaultValue: "Oylar bo'yicha mediana" })}>
                            <div className="lsx-chart">
                                {monthly.length ? (
                                    <Bar
                                        data={{
                                            labels: monthly.map((m) => { const [y, mm] = String(m.period).split('-'); return mm ? `${mm}.${y}` : m.period; }),
                                            datasets: [
                                                { type: 'line', label: `${L.median}${unit ? `, ${unit}` : ''}`, data: monthly.map((m) => m.median), borderColor: COLORS.primary, backgroundColor: COLORS.primary, yAxisID: 'y', tension: 0.3, cubicInterpolationMode: 'monotone', spanGaps: true },
                                                { type: 'bar', label: L.out, data: monthly.map((m) => m.abnormal), backgroundColor: COLORS.highSoft, borderColor: COLORS.high, borderWidth: 1, borderRadius: 2, yAxisID: 'y1' },
                                            ],
                                        }}
                                        options={{
                                            ...chartOptions,
                                            scales: {
                                                y: { position: 'left' },
                                                y1: { position: 'right', grid: { drawOnChartArea: false }, ...intAxis },
                                            },
                                        }}
                                    />
                                ) : <div className="lsx-empty">{empty}</div>}
                            </div>
                        </Panel>
                    </div>
                )}

                <div className="lsx-grid lsx-grid--2">
                    <Panel title={t('stats_by_sex_short', { defaultValue: "Jinsi bo'yicha" })}>
                        <Table size="small" pagination={false} rowKey="key" dataSource={data?.bySex || []}
                            columns={groupColumns(t('gender', { defaultValue: 'Jinsi' }), sexLabel)} />
                    </Panel>
                    <Panel title={t('stats_by_age_short', { defaultValue: 'Yosh guruhlari' })}>
                        <Table size="small" pagination={false} rowKey="key"
                            dataSource={AGE_GROUPS.filter((g) => byAge[g]).map((g) => ({ ...byAge[g], key: g }))}
                            columns={groupColumns(t('stats_age', { defaultValue: 'Yoshi' }), (k) => (k === 'unknown' ? L.unknown : k))} />
                    </Panel>
                </div>

                <Panel title={t('stats_patients_out', { defaultValue: "Oxirgi natijasi me'yordan tashqari bemorlar" })}>
                    <Table
                        size="small"
                        rowKey={(r) => `${r.patient_id}-${r.lab_analysis_id}`}
                        dataSource={data?.patients || []}
                        pagination={{ pageSize: 10, showSizeChanger: false, size: 'small' }}
                        scroll={{ x: 640 }}
                        columns={[
                            {
                                title: t('patient', { defaultValue: 'Bemor' }), key: 'p',
                                render: (_, r) => <Link to={`/patcients/${r.patient_id}`} className="lsx-cell-name">{`${r.lastname || ''} ${r.firstname || ''}`.trim()}</Link>,
                            },
                            {
                                title: t('stats_value', { defaultValue: 'Qiymat' }), key: 'v', align: 'right', width: 150,
                                render: (_, r) => (
                                    <span className={`lsx-nowrap ${r.flag === 1 ? 'lsx-high' : 'lsx-low'}`}>
                                        {r.flag === 1 ? '↑ ' : '↓ '}{r.text || num(r.value)} {r.unit || ''}
                                    </span>
                                ),
                            },
                            {
                                title: t('norm', { defaultValue: 'norma' }), key: 'ref', width: 190,
                                render: (_, r) => (r.ref_low != null || r.ref_high != null
                                    ? <span className="lsx-nowrap">{num(r.ref_low)}–{num(r.ref_high)} <span className="lsx-muted">({t('lab_ref_source', { defaultValue: 'laboratoriya' })})</span></span>
                                    : <span className="lsx-muted">{t('stats_catalog_ref', { defaultValue: 'katalog' })}</span>),
                            },
                            { title: t('stats_date', { defaultValue: 'Sana' }), dataIndex: 'measured_at', width: 110, render: fmtDate },
                            { title: '', key: 'a', width: 90, render: (_, r) => <Link to={`/lab-analyses/view/${r.lab_analysis_id}`}>{t('stats_open', { defaultValue: 'Tahlil' })} →</Link> },
                        ]}
                    />
                </Panel>
            </Spin>
        </Drawer>
    );
}
