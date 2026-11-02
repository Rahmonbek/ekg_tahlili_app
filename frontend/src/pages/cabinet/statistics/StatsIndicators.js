import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Drawer, Empty, Input, Segmented, Spin, Table, Tag } from 'antd';
import { Bar } from 'react-chartjs-2';

import { get_lab_stats_indicator, get_lab_stats_indicators } from '../../../host/requests/LabStatisticsRequest';
import { AGE_GROUPS, CATEGORY_LABELS, COLORS, Panel, RESULT_KIND_META, baseOptions, num, pct, pick } from './statsCommon';

const nameOf = (r, lang) => r[`name_${lang}`] || r.name_uz || r.column_name;

/** "Ko'rsatkichlar" bo'limi: har bir ko'rsatkich bo'yicha taqsimot va chetlanishlar. */
export default function StatsIndicators({ params, reloadKey, lang }) {
    const { t } = useTranslation();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [rank, setRank] = useState('count');
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        get_lab_stats_indicators(params)
            .then((r) => alive && setRows(r.data || []))
            .catch(() => alive && setRows([]))
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, [params, reloadKey]);

    const enriched = useMemo(() => rows.map((r) => {
        const abnormal = (Number(r.low) || 0) + (Number(r.high) || 0);
        const assessed = abnormal + (Number(r.normal) || 0);
        return { ...r, abnormal, assessed, rate: assessed ? abnormal / assessed : 0 };
    }), [rows]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return enriched;
        return enriched.filter((r) => [r.column_name, r.name_uz, r.name_ru, r.name_en]
            .some((x) => (x || '').toLowerCase().includes(q)));
    }, [enriched, search]);

    const top = useMemo(() => {
        const list = enriched.filter((r) => r.abnormal > 0 && (rank === 'count' || r.assessed >= 3));
        list.sort((a, b) => (rank === 'count' ? b.abnormal - a.abnormal : b.rate - a.rate));
        return list.slice(0, 15);
    }, [enriched, rank]);

    const topData = {
        labels: top.map((r) => nameOf(r, lang)),
        datasets: rank === 'count'
            ? [
                { label: t('stats_high', { defaultValue: 'Yuqori' }), data: top.map((r) => Number(r.high) || 0), backgroundColor: COLORS.high },
                { label: t('stats_low', { defaultValue: 'Past' }), data: top.map((r) => Number(r.low) || 0), backgroundColor: COLORS.low },
            ]
            : [{ label: t('stats_abnormal_rate', { defaultValue: "Chetlanish ulushi, %" }), data: top.map((r) => Math.round(r.rate * 1000) / 10), backgroundColor: COLORS.high }],
    };

    const columns = [
        {
            title: t('stats_indicator', { defaultValue: "Ko'rsatkich" }),
            key: 'name',
            fixed: 'left',
            width: 220,
            render: (_, r) => (
                <button type="button" className="lst-link" onClick={() => setSelected(r)}>
                    {nameOf(r, lang)}
                </button>
            ),
            sorter: (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
        },
        {
            title: t('stats_category', { defaultValue: 'Guruh' }),
            dataIndex: 'category',
            width: 150,
            render: (c) => pick(CATEGORY_LABELS[c], lang) || c,
            filters: Object.keys(CATEGORY_LABELS).filter((c) => rows.some((r) => r.category === c))
                .map((c) => ({ text: pick(CATEGORY_LABELS[c], lang), value: c })),
            onFilter: (v, r) => r.category === v,
        },
        { title: t('stats_n', { defaultValue: 'Natijalar' }), dataIndex: 'n', align: 'right', width: 90, sorter: (a, b) => a.n - b.n },
        { title: t('stats_patients', { defaultValue: 'Bemorlar' }), dataIndex: 'patients', align: 'right', width: 90, sorter: (a, b) => a.patients - b.patients },
        {
            title: t('stats_high', { defaultValue: 'Yuqori' }), dataIndex: 'high', align: 'right', width: 80,
            render: (v) => (v ? <span className="lst-high">↑ {v}</span> : '—'), sorter: (a, b) => a.high - b.high,
        },
        {
            title: t('stats_low', { defaultValue: 'Past' }), dataIndex: 'low', align: 'right', width: 80,
            render: (v) => (v ? <span className="lst-low">↓ {v}</span> : '—'), sorter: (a, b) => a.low - b.low,
        },
        {
            title: t('stats_abnormal_rate', { defaultValue: 'Chetlanish ulushi' }), key: 'rate', align: 'right', width: 120,
            render: (_, r) => (r.assessed ? pct(r.abnormal, r.assessed) : '—'),
            sorter: (a, b) => a.rate - b.rate,
            defaultSortOrder: 'descend',
        },
        {
            title: t('stats_median', { defaultValue: 'Mediana (P10–P90)' }), key: 'median', align: 'right', width: 170,
            render: (_, r) => (r.median == null ? '—' : `${num(r.median)} (${num(r.p10)}–${num(r.p90)})`),
        },
        { title: t('stats_unit', { defaultValue: 'Birlik' }), dataIndex: 'measure', width: 90, render: (m) => m || '—' },
        {
            title: t('stats_unassessed', { defaultValue: 'Baholanmagan' }), dataIndex: 'unassessed', align: 'right', width: 110,
            render: (v, r) => (v ? `${v}${r.unit_mismatch ? ` (${t('stats_unit_mismatch', { defaultValue: 'birlik' })}: ${r.unit_mismatch})` : ''}` : '—'),
        },
    ];

    if (loading && !rows.length) return <div className="lst-loading"><Spin /></div>;
    if (!rows.length) return <Empty description={t('stats_no_data', { defaultValue: "Tanlangan filtr bo'yicha ma'lumot yo'q" })} />;

    return (
        <Spin spinning={loading}>
            <Panel
                title={t('stats_top_abnormal', { defaultValue: "Eng ko'p me'yordan chetlanadigan ko'rsatkichlar" })}
                extra={(
                    <Segmented
                        size="small"
                        value={rank}
                        onChange={setRank}
                        options={[
                            { value: 'count', label: t('stats_by_count', { defaultValue: 'Soni' }) },
                            { value: 'rate', label: t('stats_by_rate', { defaultValue: 'Ulushi' }) },
                        ]}
                    />
                )}
            >
                <div className="lst-chart lst-chart--tall">
                    {top.length ? (
                        <Bar
                            data={topData}
                            options={{
                                ...baseOptions,
                                indexAxis: 'y',
                                onClick: (_, els) => { if (els[0]) setSelected(top[els[0].index]); },
                                scales: { x: { stacked: rank === 'count', beginAtZero: true, ticks: { precision: rank === 'count' ? 0 : undefined } }, y: { stacked: rank === 'count' } },
                            }}
                        />
                    ) : <Empty description={t('stats_no_abnormal', { defaultValue: "Me'yordan chetlanish topilmadi" })} />}
                </div>
            </Panel>

            <Panel
                title={t('stats_all_indicators', { defaultValue: "Barcha ko'rsatkichlar" })}
                extra={(
                    <Input.Search
                        allowClear
                        size="small"
                        placeholder={t('stats_search_indicator', { defaultValue: "Ko'rsatkich nomi" })}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: 220 }}
                    />
                )}
            >
                <Table
                    size="small"
                    rowKey="column_name"
                    columns={columns}
                    dataSource={filtered}
                    pagination={{ pageSize: 25, showSizeChanger: false }}
                    scroll={{ x: 1200 }}
                    onRow={(r) => ({ onDoubleClick: () => setSelected(r) })}
                />
            </Panel>

            <IndicatorDrawer
                row={selected}
                params={params}
                lang={lang}
                onClose={() => setSelected(null)}
            />
        </Spin>
    );
}

/** Bitta ko'rsatkich: gistogramma, oylik trend, jins/yosh, me'yordan tashqari bemorlar. */
function IndicatorDrawer({ row, params, lang, onClose }) {
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
    const sexLabel = (k) => ({
        male: t('male', { defaultValue: 'Erkak' }),
        female: t('female', { defaultValue: 'Ayol' }),
    }[k] || t('stats_unknown', { defaultValue: "Noma'lum" }));

    const histogram = data?.histogram || [];
    // Sifat va kodli ko'rsatkichlar (HBsAg, qon guruhi…) uchun o'rtacha va
    // gistogramma ma'nosiz — holatlar taqsimoti ko'rsatiladi (L-34)
    const categorical = row && row.value_kind && row.value_kind !== 'numeric';
    const kinds = data?.kinds || [];
    const kindLabel = (k) => (row?.value_kind === 'qualitative' ? pick(RESULT_KIND_META[k], lang) || k : k);
    // Chekka ustunlarga p01 dan past / p99 dan baland qiymatlar ham kiradi (L-35)
    const binLabel = (h) => (h.edge === 'low' ? `< ${num(h.to)}`
        : h.edge === 'high' ? `≥ ${num(h.from)}` : `${num(h.from)}–${num(h.to)}`);
    const monthly = data?.monthly || [];
    const byAge = Object.fromEntries((data?.byAge || []).map((r) => [r.key, r]));

    return (
        <Drawer
            open={!!row}
            onClose={onClose}
            width={Math.min(980, window.innerWidth - 24)}
            title={row ? `${nameOf(row, lang)}${unit ? `, ${unit}` : ''}` : ''}
            destroyOnClose
        >
            <Spin spinning={loading}>
                {row && (
                    <div className="lst-kpis lst-kpis--compact">
                        <div className="lst-mini"><span>{t('stats_n', { defaultValue: 'Natijalar' })}</span><b>{row.n}</b></div>
                        <div className="lst-mini"><span>{t('stats_patients', { defaultValue: 'Bemorlar' })}</span><b>{row.patients}</b></div>
                        <div className="lst-mini"><span>{t('stats_high', { defaultValue: 'Yuqori' })}</span><b className="lst-high">{row.high}</b></div>
                        <div className="lst-mini"><span>{t('stats_low', { defaultValue: 'Past' })}</span><b className="lst-low">{row.low}</b></div>
                        {!categorical && (
                            <>
                                <div className="lst-mini"><span>{t('stats_median', { defaultValue: 'Mediana' })}</span><b>{num(row.median)}</b></div>
                                <div className="lst-mini"><span>P10–P90</span><b>{num(row.p10)}–{num(row.p90)}</b></div>
                            </>
                        )}
                    </div>
                )}

                {categorical && (
                    <Panel title={t('stats_kinds', { defaultValue: 'Natijalar taqsimoti' })}>
                        <Table
                            size="small" pagination={false} rowKey="key"
                            dataSource={kinds}
                            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                            columns={[
                                { title: t('stats_result', { defaultValue: 'Natija' }), dataIndex: 'key', render: kindLabel },
                                { title: t('stats_n', { defaultValue: 'Natijalar' }), dataIndex: 'n', align: 'right', render: (v) => `${v} (${pct(v, row?.n)})` },
                                { title: t('stats_patients', { defaultValue: 'Bemorlar' }), dataIndex: 'patients', align: 'right' },
                            ]}
                        />
                    </Panel>
                )}

                {!categorical && (
                <div className="lst-grid lst-grid--2">
                    <Panel title={t('stats_distribution', { defaultValue: 'Qiymatlar taqsimoti' })}>
                        <div className="lst-chart">
                            {histogram.length ? (
                                <Bar
                                    data={{
                                        labels: histogram.map(binLabel),
                                        datasets: [
                                            { label: t('stats_normal', { defaultValue: "Me'yorda" }), data: histogram.map((h) => h.count - h.abnormal), backgroundColor: COLORS.primary },
                                            { label: t('stats_out_of_range', { defaultValue: "Me'yordan tashqari" }), data: histogram.map((h) => h.abnormal), backgroundColor: COLORS.high },
                                        ],
                                    }}
                                    options={{ ...baseOptions, scales: { x: { stacked: true, ticks: { maxRotation: 60, autoSkip: true } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } } }}
                                />
                            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                        </div>
                    </Panel>
                    <Panel title={t('stats_monthly', { defaultValue: "Oylar bo'yicha mediana" })}>
                        <div className="lst-chart">
                            {monthly.length ? (
                                <Bar
                                    data={{
                                        labels: monthly.map((m) => { const [y, mm] = String(m.period).split('-'); return mm ? `${mm}.${y}` : m.period; }),
                                        datasets: [
                                            { type: 'line', label: t('stats_median', { defaultValue: 'Mediana' }), data: monthly.map((m) => m.median), borderColor: COLORS.primary, backgroundColor: COLORS.primary, yAxisID: 'y', tension: 0.3, cubicInterpolationMode: 'monotone', spanGaps: true },
                                            { type: 'bar', label: t('stats_out_of_range', { defaultValue: "Me'yordan tashqari" }), data: monthly.map((m) => m.abnormal), backgroundColor: COLORS.highSoft, borderColor: COLORS.high, borderWidth: 1, yAxisID: 'y1' },
                                        ],
                                    }}
                                    options={{
                                        ...baseOptions,
                                        scales: {
                                            y: { position: 'left', title: { display: !!unit, text: unit } },
                                            y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { precision: 0 } },
                                        },
                                    }}
                                />
                            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                        </div>
                    </Panel>
                </div>
                )}

                <div className="lst-grid lst-grid--2">
                    <Panel title={t('stats_by_sex_short', { defaultValue: "Jinsi bo'yicha" })}>
                        <Table
                            size="small" pagination={false} rowKey="key"
                            dataSource={data?.bySex || []}
                            columns={[
                                { title: t('gender', { defaultValue: 'Jinsi' }), dataIndex: 'key', render: sexLabel },
                                { title: t('stats_n', { defaultValue: 'Natijalar' }), dataIndex: 'n', align: 'right' },
                                { title: t('stats_high', { defaultValue: 'Yuqori' }), dataIndex: 'high', align: 'right', render: (v, r) => `${v} (${pct(v, r.n)})` },
                                { title: t('stats_low', { defaultValue: 'Past' }), dataIndex: 'low', align: 'right', render: (v, r) => `${v} (${pct(v, r.n)})` },
                                { title: t('stats_median', { defaultValue: 'Mediana' }), dataIndex: 'median', align: 'right', render: (v) => num(v) },
                            ]}
                        />
                    </Panel>
                    <Panel title={t('stats_by_age_short', { defaultValue: 'Yosh guruhlari' })}>
                        <Table
                            size="small" pagination={false} rowKey="key"
                            dataSource={AGE_GROUPS.filter((g) => byAge[g]).map((g) => ({ ...byAge[g], key: g }))}
                            columns={[
                                { title: t('stats_age', { defaultValue: 'Yoshi' }), dataIndex: 'key', render: (k) => (k === 'unknown' ? t('stats_unknown', { defaultValue: "Noma'lum" }) : k) },
                                { title: t('stats_n', { defaultValue: 'Natijalar' }), dataIndex: 'n', align: 'right' },
                                { title: t('stats_high', { defaultValue: 'Yuqori' }), dataIndex: 'high', align: 'right', render: (v, r) => `${v} (${pct(v, r.n)})` },
                                { title: t('stats_low', { defaultValue: 'Past' }), dataIndex: 'low', align: 'right', render: (v, r) => `${v} (${pct(v, r.n)})` },
                                { title: t('stats_median', { defaultValue: 'Mediana' }), dataIndex: 'median', align: 'right', render: (v) => num(v) },
                            ]}
                        />
                    </Panel>
                </div>

                <Panel title={t('stats_patients_out', { defaultValue: "Oxirgi natijasi me'yordan tashqari bemorlar" })}>
                    <Table
                        size="small"
                        rowKey={(r) => `${r.patient_id}-${r.lab_analysis_id}`}
                        dataSource={data?.patients || []}
                        pagination={{ pageSize: 10, showSizeChanger: false }}
                        scroll={{ x: 720 }}
                        columns={[
                            {
                                title: t('patient', { defaultValue: 'Bemor' }), key: 'p',
                                render: (_, r) => <Link to={`/patcients/${r.patient_id}`}>{`${r.lastname || ''} ${r.firstname || ''}`.trim()}</Link>,
                            },
                            {
                                title: t('stats_value', { defaultValue: 'Qiymat' }), key: 'v', align: 'right',
                                render: (_, r) => (
                                    <span className={r.flag === 1 ? 'lst-high' : 'lst-low'}>
                                        {r.flag === 1 ? '↑ ' : '↓ '}{r.text || num(r.value)} {r.unit || ''}
                                    </span>
                                ),
                            },
                            {
                                title: t('norm', { defaultValue: 'norma' }), key: 'ref',
                                render: (_, r) => (r.ref_low != null || r.ref_high != null
                                    ? <>{num(r.ref_low)}–{num(r.ref_high)} <Tag>{t('lab_ref_source', { defaultValue: 'laboratoriya' })}</Tag></>
                                    : t('stats_catalog_ref', { defaultValue: 'katalog' })),
                            },
                            { title: t('stats_date', { defaultValue: 'Sana' }), dataIndex: 'measured_at', render: (d) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—') },
                            {
                                title: '', key: 'a',
                                render: (_, r) => <Link to={`/lab-analyses/view/${r.lab_analysis_id}`}>{t('stats_open', { defaultValue: 'Tahlil' })} →</Link>,
                            },
                        ]}
                    />
                </Panel>
            </Spin>
        </Drawer>
    );
}
