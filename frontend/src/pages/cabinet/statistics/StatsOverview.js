import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Empty, Segmented, Spin, Table } from 'antd';
import { Bar, Doughnut } from 'react-chartjs-2';

import {
    get_lab_stats_doctors, get_lab_stats_summary, get_lab_stats_timeline,
} from '../../../host/requests/LabStatisticsRequest';
import {
    AGE_GROUPS, CATEGORY_LABELS, COLORS, KpiCard, Panel, baseOptions, num, pct, pick,
} from './statsCommon';

/** "Umumiy" bo'limi: asosiy raqamlar, vaqt bo'yicha, taqsimotlar, shifokorlar. */
/** "2025-04-01" → oy: "04.2025", kun/hafta: "01.04.2025". */
function periodLabel(p, bucket) {
    const [y, m, d] = String(p || '').split('-');
    if (!m) return p;
    return bucket === 'month' ? `${m}.${y}` : `${d}.${m}.${y}`;
}

export default function StatsOverview({ params, reloadKey, lang }) {
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
    const assessed = (Number(v.low) || 0) + (Number(v.high) || 0) + (Number(v.normal) || 0);

    const timelineData = useMemo(() => ({
        labels: timeline.map((r) => periodLabel(r.period, bucket)),
        datasets: [
            {
                type: 'bar', label: t('stats_analyses', { defaultValue: 'Tahlillar' }),
                data: timeline.map((r) => r.analyses), backgroundColor: COLORS.primarySoft,
                borderColor: COLORS.primary, borderWidth: 1, order: 2,
            },
            {
                type: 'line', label: t('stats_abnormal_analyses', { defaultValue: 'Chetlanishli tahlillar' }),
                data: timeline.map((r) => r.abnormal), borderColor: COLORS.high,
                backgroundColor: COLORS.high, tension: 0.3, cubicInterpolationMode: 'monotone', order: 1,
            },
            {
                type: 'line', label: t('stats_patients', { defaultValue: 'Bemorlar' }),
                data: timeline.map((r) => r.patients), borderColor: COLORS.blue,
                backgroundColor: COLORS.blue, borderDash: [4, 4], tension: 0.3, cubicInterpolationMode: 'monotone', order: 0,
            },
        ],
    }), [timeline, bucket, t]);

    const severityData = useMemo(() => ({
        labels: [
            t('stats_sev1', { defaultValue: 'Yengil' }),
            t('stats_sev2', { defaultValue: "O'rtacha" }),
            t('stats_sev3', { defaultValue: 'Og\'ir' }),
        ],
        datasets: [{
            data: [c.severity1 || 0, c.severity2 || 0, c.severity3 || 0],
            backgroundColor: [COLORS.primary, COLORS.low, COLORS.high],
        }],
    }), [c.severity1, c.severity2, c.severity3, t]);

    const sexLabels = {
        male: t('male', { defaultValue: 'Erkak' }),
        female: t('female', { defaultValue: 'Ayol' }),
        unknown: t('stats_unknown', { defaultValue: "Noma'lum" }),
    };
    const sexData = useMemo(() => {
        const rows = summary?.sex || [];
        return {
            labels: rows.map((r) => sexLabels[r.key] || r.key),
            datasets: [{ data: rows.map((r) => r.patients), backgroundColor: [COLORS.blue, '#EC4899', COLORS.gray] }],
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [summary, lang]);

    const ageData = useMemo(() => {
        const map = Object.fromEntries((summary?.ages || []).map((r) => [r.key, r]));
        return {
            labels: AGE_GROUPS.map((g) => (g === 'unknown' ? sexLabels.unknown : g)),
            datasets: [{
                label: t('stats_patients', { defaultValue: 'Bemorlar' }),
                data: AGE_GROUPS.map((g) => map[g]?.patients || 0),
                backgroundColor: COLORS.primary,
                borderRadius: 4,
            }],
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [summary, lang]);

    const categoryData = useMemo(() => {
        const rows = (summary?.categories || []).slice(0, 14);
        return {
            labels: rows.map((r) => pick(CATEGORY_LABELS[r.key], lang) || r.key),
            datasets: [
                {
                    label: t('stats_normal', { defaultValue: "Me'yorda" }),
                    data: rows.map((r) => (r.value_count || 0) - (r.abnormal || 0)),
                    backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary, borderWidth: 1,
                },
                {
                    label: t('stats_out_of_range', { defaultValue: "Me'yordan tashqari" }),
                    data: rows.map((r) => r.abnormal || 0),
                    backgroundColor: COLORS.high,
                },
            ],
        };
    }, [summary, lang, t]);

    const fileRows = summary?.files || [];
    const fileLabels = { pdf: 'PDF', image: t('stats_images', { defaultValue: 'Rasm' }), xlsx: 'Excel', other: t('stats_other', { defaultValue: 'Boshqa' }) };

    if (loading && !summary) return <div className="lst-loading"><Spin /></div>;
    if (!summary || !c.analyses) {
        return <Empty description={t('stats_no_data', { defaultValue: "Tanlangan filtr bo'yicha ma'lumot yo'q" })} />;
    }

    return (
        <Spin spinning={loading}>
            <div className="lst-kpis">
                <KpiCard label={t('stats_analyses', { defaultValue: 'Tahlillar' })} value={c.analyses}
                    hint={[
                        c.processing || c.failed ? `${t('stats_processing', { defaultValue: 'jarayonda' })}: ${c.processing || 0}, ${t('stats_failed', { defaultValue: 'xato' })}: ${c.failed || 0}` : null,
                        // Sanasi fayldan aniqlanmagan — davr filtri va grafikda yuklangan kun bo'yicha
                        c.no_date ? `${t('stats_no_date', { defaultValue: 'sanasi noma\'lum' })}: ${c.no_date}` : null,
                    ].filter(Boolean).join(' · ') || null} />
                <KpiCard label={t('stats_patients', { defaultValue: 'Bemorlar' })} value={c.patients}
                    hint={`${num((c.analyses || 0) / (c.patients || 1), 1)} ${t('stats_per_patient', { defaultValue: 'tahlil / bemor' })}`} accent={COLORS.blue} />
                <KpiCard label={t('stats_abnormal_analyses', { defaultValue: 'Chetlanishli tahlillar' })} value={c.abnormal_analyses}
                    hint={pct(c.abnormal_analyses, c.analyses)} accent={COLORS.high} />
                <KpiCard label={t('stats_severe', { defaultValue: "AI: og'ir holat" })} value={c.severity3 || 0}
                    hint={pct(c.severity3, c.analyses)} accent={COLORS.high} />
                <KpiCard label={t('stats_values', { defaultValue: "Aniqlangan qiymatlar" })} value={v.value_count}
                    hint={`${v.indicators || 0} ${t('stats_indicators_n', { defaultValue: "xil ko'rsatkich" })}`} accent={COLORS.low} />
                <KpiCard label={t('stats_out_of_range', { defaultValue: "Me'yordan tashqari" })}
                    value={(Number(v.low) || 0) + (Number(v.high) || 0)}
                    hint={`↑ ${v.high || 0} · ↓ ${v.low || 0} · ${pct((Number(v.low) || 0) + (Number(v.high) || 0), assessed)}`} accent={COLORS.high} />
                <KpiCard label={t('stats_lab_ref_share', { defaultValue: "Laboratoriya me'yori bilan" })}
                    value={pct(v.by_lab_ref, assessed)}
                    hint={t('stats_lab_ref_hint', { defaultValue: "qolgani — katalog me'yori" })} accent={COLORS.gray} />
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
                <div className="lst-chart lst-chart--tall">
                    {timeline.length ? (
                        <Bar data={timelineData} options={{ ...baseOptions, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} />
                    ) : <Empty />}
                </div>
            </Panel>

            <div className="lst-grid lst-grid--4">
                <Panel title={t('stats_ai_severity', { defaultValue: 'AI jiddiylik darajasi' })}>
                    <div className="lst-chart"><Doughnut data={severityData} options={{ ...baseOptions, cutout: '62%' }} /></div>
                </Panel>
                <Panel title={t('stats_by_sex', { defaultValue: 'Jinsi bo\'yicha (bemorlar)' })}>
                    <div className="lst-chart"><Doughnut data={sexData} options={{ ...baseOptions, cutout: '62%' }} /></div>
                </Panel>
                <Panel title={t('stats_by_age', { defaultValue: "Yosh guruhlari (bemorlar)" })}>
                    <div className="lst-chart">
                        <Bar data={ageData} options={{ ...baseOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} />
                    </div>
                </Panel>
                <Panel title={t('stats_file_types', { defaultValue: 'Yuklangan fayl turlari' })}>
                    <div className="lst-chart">
                        {fileRows.length ? (
                            <Doughnut
                                data={{
                                    labels: fileRows.map((r) => fileLabels[r.key] || r.key),
                                    datasets: [{ data: fileRows.map((r) => r.files), backgroundColor: COLORS.palette }],
                                }}
                                options={{ ...baseOptions, cutout: '62%' }}
                            />
                        ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                    </div>
                </Panel>
            </div>

            <Panel title={t('stats_by_category', { defaultValue: "Tahlil guruhlari: me'yorda va me'yordan tashqari qiymatlar" })}>
                <div className="lst-chart lst-chart--tall">
                    <Bar
                        data={categoryData}
                        options={{
                            ...baseOptions,
                            indexAxis: 'y',
                            scales: { x: { stacked: true, beginAtZero: true, ticks: { precision: 0 } }, y: { stacked: true } },
                        }}
                    />
                </div>
            </Panel>

            <Panel title={t('stats_by_doctor', { defaultValue: 'Xodimlar kesimida' })}>
                <Table
                    size="small"
                    rowKey={(r) => r.doctor_id}
                    dataSource={doctors}
                    pagination={false}
                    scroll={{ x: 640 }}
                    columns={[
                        { title: t('stats_staff', { defaultValue: 'Xodim (yuklagan)' }), dataIndex: 'name', render: (n) => n || '—' },
                        { title: t('stats_analyses', { defaultValue: 'Tahlillar' }), dataIndex: 'analyses', sorter: (a, b) => a.analyses - b.analyses, defaultSortOrder: 'descend', align: 'right' },
                        { title: t('stats_patients', { defaultValue: 'Bemorlar' }), dataIndex: 'patients', align: 'right' },
                        {
                            title: t('stats_abnormal_analyses', { defaultValue: 'Chetlanishli tahlillar' }), dataIndex: 'abnormal', align: 'right',
                            render: (n, r) => `${n} (${pct(n, r.analyses)})`,
                        },
                        { title: t('stats_severe', { defaultValue: "AI: og'ir holat" }), dataIndex: 'severe', align: 'right' },
                        {
                            title: t('stats_last', { defaultValue: 'Oxirgi tahlil' }), dataIndex: 'last_at',
                            render: (d) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—'),
                        },
                    ]}
                />
            </Panel>
        </Spin>
    );
}
