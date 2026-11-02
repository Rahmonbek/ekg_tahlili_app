import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Segmented, Spin, Table } from 'antd';
import { Bar } from 'react-chartjs-2';

import {
    get_lab_stats_doctors, get_lab_stats_summary, get_lab_stats_timeline,
} from '../../../host/requests/LabStatisticsRequest';
import { AGE_GROUPS, CATEGORY_LABELS, COLORS, num, pct, pick } from './statsCommon';
import { Card, MiniTable, PctBar, Stat, chartOptions, fmtDate, intAxis } from './statsUi';

function periodLabel(p, bucket) {
    const [y, m, d] = String(p || '').split('-');
    if (!m) return p;
    return bucket === 'month' ? `${m}.${y}` : `${d}.${m}.${y}`;
}

/**
 * Umumiy: asosiy raqamlar, vaqt bo'yicha (ustunli grafik + davr jadvali),
 * tahlil guruhlari jadvali, bemorlar/tahlillar tarkibi jadvallari, xodimlar.
 * Grafik faqat bitta: tahlillar soni, ichida chetlanishlisi qizil.
 */
export default function StatsOverview({ params, reloadKey, lang, periodText }) {
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
        noAbnormal: t('stats_normal_analyses', { defaultValue: 'Chetlanishsiz tahlillar' }),
        normal: t('stats_normal', { defaultValue: "Me'yorda" }),
        out: t('stats_out_of_range', { defaultValue: "Me'yordan tashqari" }),
        high: t('stats_high', { defaultValue: 'Yuqori' }),
        low: t('stats_low', { defaultValue: 'Past' }),
        rate: t('stats_abnormal_rate', { defaultValue: 'Chetlanish ulushi' }),
        share: t('stats_by_rate', { defaultValue: 'Ulushi' }),
        values: t('stats_values', { defaultValue: 'Aniqlangan qiymatlar' }),
        severe: t('stats_sev3', { defaultValue: "Og'ir" }),
        unknown: t('stats_unknown', { defaultValue: "Noma'lum" }),
        empty: t('stats_no_data', { defaultValue: "Tanlangan filtr bo'yicha ma'lumot yo'q" }),
    };

    const timelineData = useMemo(() => ({
        labels: timeline.map((r) => periodLabel(r.period, bucket)),
        datasets: [
            { label: L.noAbnormal, data: timeline.map((r) => (Number(r.analyses) || 0) - (Number(r.abnormal) || 0)), backgroundColor: '#5eead4', borderRadius: 3 },
            { label: L.abnormal, data: timeline.map((r) => Number(r.abnormal) || 0), backgroundColor: COLORS.high, borderRadius: 3 },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [timeline, bucket, lang]);

    const sexLabels = { male: t('male', { defaultValue: 'Erkak' }), female: t('female', { defaultValue: 'Ayol' }), unknown: L.unknown };
    const sexRows = (summary?.sex || []).map((r) => ({ key: r.key, label: sexLabels[r.key] || r.key, value: Number(r.patients) || 0 }));
    const ageMap = Object.fromEntries((summary?.ages || []).map((r) => [r.key, r]));
    const ageRows = AGE_GROUPS.map((g) => ({ key: g, label: g === 'unknown' ? L.unknown : g, value: Number(ageMap[g]?.patients) || 0 }));
    const fileLabels = { pdf: 'PDF', image: t('stats_images', { defaultValue: 'Rasm' }), xlsx: 'Excel', other: t('stats_other', { defaultValue: 'Boshqa' }) };
    const fileRows = (summary?.files || []).map((r) => ({ key: r.key, label: fileLabels[r.key] || r.key, value: Number(r.files) || 0 }));
    const sevRows = [
        { key: 1, label: t('stats_sev1', { defaultValue: 'Yengil' }), value: Number(c.severity1) || 0, color: '#0f766e' },
        { key: 2, label: t('stats_sev2', { defaultValue: "O'rtacha" }), value: Number(c.severity2) || 0, color: COLORS.low },
        { key: 3, label: L.severe, value: Number(c.severity3) || 0, color: COLORS.high },
    ];

    const categories = (summary?.categories || []).map((r) => ({ ...r, key: r.key, name: pick(CATEGORY_LABELS[r.key], lang) || r.key }));

    if (loading && !summary) return <div className="ls3-loading"><Spin /></div>;

    const crumb = (
        <div className="ls3-crumb">
            <h2>{t('stats_tab_overview', { defaultValue: 'Umumiy' })}</h2>
            <span>{periodText}</span>
            {c.no_date ? <span>· {t('stats_no_date', { defaultValue: "sanasi noma'lum" })}: {c.no_date}</span> : null}
            {c.processing || c.failed ? <span>· {t('stats_processing', { defaultValue: 'jarayonda' })}: {c.processing || 0}, {t('stats_failed', { defaultValue: 'xato' })}: {c.failed || 0}</span> : null}
        </div>
    );

    if (!summary || !c.analyses) return <>{crumb}<div className="ls3-empty">{L.empty}</div></>;

    const numCol = (title, key, extra = {}) => ({
        title, dataIndex: key, align: 'right', className: 'ls3-num', width: 100,
        sorter: (a, b) => (Number(a[key]) || 0) - (Number(b[key]) || 0),
        render: (x) => (Number(x) ? x : <span className="ls3-muted">0</span>),
        ...extra,
    });

    return (
        <Spin spinning={loading}>
            {crumb}
            <div className="ls3-hero">
                <Stat label={L.analyses} value={c.analyses} sub={`${num((c.analyses || 0) / (c.patients || 1), 1)} ${t('stats_per_patient', { defaultValue: 'tahlil / bemor' })}`} />
                <Stat label={L.patients} value={c.patients} sub={`${v.value_count || 0} ${L.values.toLowerCase()}`} />
                <Stat label={L.out} value={high + low} unit={`/ ${assessed}`} tone="high" sub={`↑ ${high} · ↓ ${low} · ${pct(high + low, assessed)}`} />
                <Stat label={L.abnormal} value={c.abnormal_analyses} tone="low" sub={`${pct(c.abnormal_analyses, c.analyses)} ${t('stats_of_analyses', { defaultValue: 'tahlillardan' })}`} />
                <Stat label={t('stats_severe', { defaultValue: "AI: og'ir holat" })} value={c.severity3 || 0} tone={c.severity3 ? 'high' : undefined} sub={`${pct(c.severity3, c.analyses)} ${t('stats_of_analyses', { defaultValue: 'tahlillardan' })}`} />
            </div>

            <Card
                title={t('stats_dynamics', { defaultValue: "Vaqt bo'yicha" })}
                extra={(
                    <Segmented size="small" value={bucket} onChange={setBucket} options={[
                        { value: 'day', label: t('stats_day', { defaultValue: 'Kun' }) },
                        { value: 'week', label: t('stats_week', { defaultValue: 'Hafta' }) },
                        { value: 'month', label: t('stats_month', { defaultValue: 'Oy' }) },
                    ]} />
                )}
            >
                <div className="ls3-chart" style={{ height: 220 }}>
                    {timeline.length
                        ? <Bar data={timelineData} options={{ ...chartOptions, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ...intAxis } } }} />
                        : <div className="ls3-empty">{L.empty}</div>}
                </div>
                <Table
                    className="ls3-period-table"
                    size="small"
                    rowKey="period"
                    dataSource={timeline.slice().reverse()}
                    pagination={timeline.length > 12 ? { pageSize: 12, size: 'small', showSizeChanger: false } : false}
                    columns={[
                        { title: t('stats_period_short', { defaultValue: 'Davr' }), dataIndex: 'period', width: 130, render: (p) => <b>{periodLabel(p, bucket)}</b> },
                        numCol(L.analyses, 'analyses'),
                        numCol(L.patients, 'patients'),
                        numCol(L.abnormal, 'abnormal', { width: 170 }),
                        { title: L.rate, key: 'rate', width: 170, render: (_, r) => <PctBar part={r.abnormal} total={r.analyses} /> },
                        numCol(t('stats_severe', { defaultValue: "AI: og'ir holat" }), 'severe', { width: 150, render: (x) => (Number(x) ? <span className="ls3-high">{x}</span> : <span className="ls3-muted">0</span>) }),
                    ]}
                />
            </Card>

            <Card title={t('stats_by_category_table', { defaultValue: "Tahlil guruhlari bo'yicha" })}>
                <Table
                    size="small"
                    rowKey="key"
                    dataSource={categories}
                    pagination={false}
                    scroll={{ x: 760 }}
                    columns={[
                        { title: t('stats_category', { defaultValue: 'Tahlil guruhi' }), dataIndex: 'name', render: (n) => <b>{n}</b> },
                        numCol(t('stats_values_short', { defaultValue: 'Qiymatlar' }), 'value_count', { width: 110, defaultSortOrder: 'descend' }),
                        numCol(L.analyses, 'analyses'),
                        numCol(L.patients, 'patients'),
                        numCol(L.normal, 'normal'),
                        numCol(`↑ ${L.high}`, 'high', { render: (x) => (Number(x) ? <span className="ls3-high">{x}</span> : <span className="ls3-muted">0</span>) }),
                        numCol(`↓ ${L.low}`, 'low', { render: (x) => (Number(x) ? <span className="ls3-low">{x}</span> : <span className="ls3-muted">0</span>) }),
                        { title: L.rate, key: 'rate', width: 170, render: (_, r) => <PctBar part={r.abnormal} total={(Number(r.normal) || 0) + (Number(r.abnormal) || 0)} />, sorter: (a, b) => (a.abnormal / (a.value_count || 1)) - (b.abnormal / (b.value_count || 1)) },
                    ]}
                />
            </Card>

            <div className="ls3-cols ls3-cols--2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <Card title={t('stats_patients_breakdown', { defaultValue: 'Bemorlar tarkibi' })}>
                    <div className="ls3-minis">
                        <MiniTable title={t('gender', { defaultValue: 'Jinsi' })} rows={sexRows} valueLabel={L.patients} color={COLORS.blue} empty={L.empty} />
                        <MiniTable title={t('stats_by_age_short', { defaultValue: 'Yosh guruhlari' })} rows={ageRows} valueLabel={L.patients} color={COLORS.blue} empty={L.empty} />
                    </div>
                </Card>
                <Card title={t('stats_analyses_breakdown', { defaultValue: 'Tahlillar tarkibi' })}>
                    <div className="ls3-minis">
                        <MiniTable title={t('stats_ai_severity', { defaultValue: 'AI jiddiylik darajasi' })} rows={sevRows} valueLabel={L.analyses} empty={L.empty} />
                        <MiniTable title={t('stats_file_types', { defaultValue: 'Yuklangan fayl turlari' })} rows={fileRows} valueLabel={t('stats_files', { defaultValue: 'Fayllar' })} color="#8b5cf6" empty={L.empty} />
                    </div>
                </Card>
            </div>

            <Card title={t('stats_by_doctor', { defaultValue: 'Xodimlar kesimida' })}>
                <Table
                    size="small"
                    rowKey={(r) => r.doctor_id}
                    dataSource={doctors}
                    pagination={false}
                    scroll={{ x: 640 }}
                    columns={[
                        { title: t('stats_staff', { defaultValue: 'Xodim (yuklagan)' }), dataIndex: 'name', render: (n) => <b>{n || '—'}</b> },
                        numCol(L.analyses, 'analyses', { defaultSortOrder: 'descend' }),
                        numCol(L.patients, 'patients'),
                        numCol(L.abnormal, 'abnormal', { width: 170 }),
                        { title: L.rate, key: 'rate', width: 170, render: (_, r) => <PctBar part={r.abnormal} total={r.analyses} /> },
                        numCol(L.severe, 'severe', { width: 90, render: (x) => (Number(x) ? <span className="ls3-high">{x}</span> : <span className="ls3-muted">0</span>) }),
                        { title: t('stats_last', { defaultValue: 'Oxirgi tahlil' }), dataIndex: 'last_at', width: 120, render: fmtDate },
                    ]}
                />
            </Card>
        </Spin>
    );
}
