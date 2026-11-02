import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Empty, Segmented, Spin, Table } from 'antd';
import { Bar } from 'react-chartjs-2';

import {
    get_lab_stats_doctors, get_lab_stats_summary, get_lab_stats_timeline,
} from '../../../host/requests/LabStatisticsRequest';
import { AGE_GROUPS, CATEGORY_LABELS, COLORS, num, pct, pick } from './statsCommon';
import { BarList, Kpi, Panel, StackBar, chartOptions, fmtDate, intAxis } from './statsUi';

/** "2025-04-01" → oy: "04.2025", kun/hafta: "01.04.2025". */
function periodLabel(p, bucket) {
    const [y, m, d] = String(p || '').split('-');
    if (!m) return p;
    return bucket === 'month' ? `${m}.${y}` : `${d}.${m}.${y}`;
}

/** "Umumiy": asosiy raqamlar, vaqt bo'yicha, guruhlar, taqsimotlar, xodimlar. */
export default function OverviewTab({ params, reloadKey, lang }) {
    const { t } = useTranslation();
    const [summary, setSummary] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [bucket, setBucket] = useState('month');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        Promise.all([get_lab_stats_summary(params), get_lab_stats_doctors(params)])
            .then(([s, d]) => { if (alive) { setSummary(s.data); setDoctors(d.data || []); } })
            .catch(() => { if (alive) { setSummary(null); setDoctors([]); } })
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [params, reloadKey]);

    useEffect(() => {
        let alive = true;
        get_lab_stats_timeline(params, bucket)
            .then((r) => alive && setTimeline(r.data?.rows || []))
            .catch(() => alive && setTimeline([]));
        return () => { alive = false; };
    }, [params, bucket, reloadKey]);

    const c = summary?.counts || {};
    const v = summary?.values || {};
    const high = Number(v.high) || 0;
    const low = Number(v.low) || 0;
    const assessed = high + low + (Number(v.normal) || 0);

    const L = {
        analyses: t('stats_analyses', { defaultValue: 'Tahlillar' }),
        patients: t('stats_patients', { defaultValue: 'Bemorlar' }),
        abnormal: t('stats_abnormal_analyses', { defaultValue: 'Chetlanishli tahlillar' }),
        normal: t('stats_normal', { defaultValue: "Me'yorda" }),
        out: t('stats_out_of_range', { defaultValue: "Me'yordan tashqari" }),
        unknown: t('stats_unknown', { defaultValue: "Noma'lum" }),
    };

    const timelineData = useMemo(() => ({
        labels: timeline.map((r) => periodLabel(r.period, bucket)),
        datasets: [
            {
                type: 'bar', label: L.analyses, data: timeline.map((r) => r.analyses),
                backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary, borderWidth: 1, borderRadius: 3, order: 2,
            },
            {
                type: 'line', label: L.abnormal, data: timeline.map((r) => r.abnormal),
                borderColor: COLORS.high, backgroundColor: COLORS.high, tension: 0.3, cubicInterpolationMode: 'monotone', order: 1,
            },
            {
                type: 'line', label: L.patients, data: timeline.map((r) => r.patients),
                borderColor: COLORS.blue, backgroundColor: COLORS.blue, borderDash: [4, 4], tension: 0.3, cubicInterpolationMode: 'monotone', order: 0,
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [timeline, bucket, lang]);

    const severityParts = [
        { key: 1, label: t('stats_sev1', { defaultValue: 'Yengil' }), value: c.severity1 || 0, color: COLORS.primary },
        { key: 2, label: t('stats_sev2', { defaultValue: "O'rtacha" }), value: c.severity2 || 0, color: COLORS.low },
        { key: 3, label: t('stats_sev3', { defaultValue: "Og'ir" }), value: c.severity3 || 0, color: COLORS.high },
    ];

    const sexLabels = { male: t('male', { defaultValue: 'Erkak' }), female: t('female', { defaultValue: 'Ayol' }), unknown: L.unknown };
    const sexColors = { male: COLORS.blue, female: '#EC4899', unknown: COLORS.gray };
    const sexRows = (summary?.sex || []).map((r) => ({ key: r.key, label: sexLabels[r.key] || r.key, value: r.patients, color: sexColors[r.key] || COLORS.gray }));

    const ageMap = Object.fromEntries((summary?.ages || []).map((r) => [r.key, r]));
    const ageRows = AGE_GROUPS.filter((g) => ageMap[g]?.patients).map((g) => ({
        key: g, label: g === 'unknown' ? L.unknown : g, value: ageMap[g].patients, color: COLORS.primary,
    }));

    const fileLabels = { pdf: 'PDF', image: t('stats_images', { defaultValue: 'Rasm' }), xlsx: 'Excel', other: t('stats_other', { defaultValue: 'Boshqa' }) };
    const fileRows = (summary?.files || []).map((r, i) => ({ key: r.key, label: fileLabels[r.key] || r.key, value: r.files, color: COLORS.palette[i % COLORS.palette.length] }));

    const categoryRows = (summary?.categories || []).map((r) => {
        const abnormal = Number(r.abnormal) || 0;
        const total = Number(r.value_count) || 0;
        return {
            key: r.key,
            label: pick(CATEGORY_LABELS[r.key], lang) || r.key,
            value: total,
            segments: [{ value: total - abnormal, color: COLORS.primarySoft }, { value: abnormal, color: COLORS.high }],
            right: <><b>{total}</b>{abnormal ? <> · <span className="lsx-high">{abnormal}</span></> : null}</>,
            title: `${L.normal}: ${total - abnormal} · ${L.out}: ${abnormal}`,
        };
    });

    const empty = t('stats_no_data', { defaultValue: "Tanlangan filtr bo'yicha ma'lumot yo'q" });
    if (loading && !summary) return <div className="lsx-loading"><Spin /></div>;
    if (!summary || !c.analyses) return <Empty description={empty} />;

    const meta = [
        [t('stats_values', { defaultValue: 'Aniqlangan qiymatlar' }), `${v.value_count || 0} · ${v.indicators || 0} ${t('stats_indicators_n', { defaultValue: "xil ko'rsatkich" })}`],
        [t('stats_lab_ref_share', { defaultValue: "Laboratoriya me'yori bilan" }), pct(v.by_lab_ref, assessed)],
        c.processing ? [t('stats_processing', { defaultValue: 'jarayonda' }), c.processing] : null,
        c.failed ? [t('stats_failed', { defaultValue: 'xato' }), c.failed] : null,
        c.no_date ? [t('stats_no_date', { defaultValue: "sanasi noma'lum" }), c.no_date] : null,
    ].filter(Boolean);

    return (
        <Spin spinning={loading}>
            <div className="lsx-kpis">
                <Kpi label={L.analyses} value={c.analyses}
                    sub={`${c.patients} ${t('stats_patients_short', { defaultValue: 'bemor' })} · ${num((c.analyses || 0) / (c.patients || 1), 1)} ${t('stats_per_patient', { defaultValue: 'tahlil / bemor' })}`} />
                <Kpi label={L.out} value={high + low} tone="high"
                    sub={`↑ ${high} · ↓ ${low} · ${pct(high + low, assessed)} ${t('stats_of_assessed', { defaultValue: 'baholangan qiymatdan' })}`} />
                <Kpi label={L.abnormal} value={c.abnormal_analyses} tone="low"
                    sub={`${pct(c.abnormal_analyses, c.analyses)} ${t('stats_of_analyses', { defaultValue: 'tahlillardan' })}`} />
                <Kpi label={t('stats_severe', { defaultValue: "AI: og'ir holat" })} value={c.severity3 || 0} tone={c.severity3 ? 'high' : 'gray'}
                    sub={`${pct(c.severity3, c.analyses)} ${t('stats_of_analyses', { defaultValue: 'tahlillardan' })}`} />
            </div>
            <div className="lsx-meta">
                {meta.map(([k, val]) => <span key={k}>{k}: <b>{val}</b></span>)}
            </div>

            <Panel
                title={t('stats_dynamics', { defaultValue: "Vaqt bo'yicha" })}
                extra={(
                    <Segmented
                        size="small"
                        value={bucket}
                        onChange={setBucket}
                        options={[
                            { value: 'day', label: t('stats_day', { defaultValue: 'Kun' }) },
                            { value: 'week', label: t('stats_week', { defaultValue: 'Hafta' }) },
                            { value: 'month', label: t('stats_month', { defaultValue: 'Oy' }) },
                        ]}
                    />
                )}
            >
                <div className="lsx-chart">
                    {timeline.length
                        ? <Bar data={timelineData} options={{ ...chartOptions, scales: { y: intAxis } }} />
                        : <div className="lsx-empty">{empty}</div>}
                </div>
            </Panel>

            <div className="lsx-grid lsx-grid--main">
                <Panel title={t('stats_by_category_short', { defaultValue: "Tahlil guruhlari: qiymatlar soni, shundan me'yordan tashqari" })}>
                    <BarList rows={categoryRows} empty={empty} />
                </Panel>
                <Panel title={t('stats_ai_severity', { defaultValue: 'AI jiddiylik darajasi' })}>
                    <StackBar parts={severityParts} empty={empty} />
                </Panel>
            </div>

            <div className="lsx-grid lsx-grid--3">
                <Panel title={t('stats_by_sex', { defaultValue: "Jinsi bo'yicha (bemorlar)" })}>
                    <BarList rows={sexRows} empty={empty} />
                </Panel>
                <Panel title={t('stats_by_age', { defaultValue: 'Yosh guruhlari (bemorlar)' })}>
                    <BarList rows={ageRows} empty={empty} />
                </Panel>
                <Panel title={t('stats_file_types', { defaultValue: 'Yuklangan fayl turlari' })}>
                    <BarList rows={fileRows} empty={empty} />
                </Panel>
            </div>

            <Panel title={t('stats_by_doctor', { defaultValue: 'Xodimlar kesimida' })}>
                <Table
                    size="small"
                    rowKey={(r) => r.doctor_id}
                    dataSource={doctors}
                    pagination={false}
                    scroll={{ x: 620 }}
                    columns={[
                        { title: t('stats_staff', { defaultValue: 'Xodim (yuklagan)' }), dataIndex: 'name', render: (n) => <span className="lsx-cell-name">{n || '—'}</span> },
                        { title: L.analyses, dataIndex: 'analyses', sorter: (a, b) => a.analyses - b.analyses, defaultSortOrder: 'descend', align: 'right', width: 110 },
                        { title: L.patients, dataIndex: 'patients', align: 'right', width: 110 },
                        { title: L.abnormal, dataIndex: 'abnormal', align: 'right', width: 190, render: (n, r) => (n ? <>{n} <span className="lsx-muted">({pct(n, r.analyses)})</span></> : '—') },
                        { title: t('stats_severe', { defaultValue: "AI: og'ir holat" }), dataIndex: 'severe', align: 'right', width: 140, render: (n) => (n ? <span className="lsx-high">{n}</span> : '—') },
                        { title: t('stats_last', { defaultValue: 'Oxirgi tahlil' }), dataIndex: 'last_at', width: 130, render: fmtDate },
                    ]}
                />
            </Panel>
        </Spin>
    );
}
