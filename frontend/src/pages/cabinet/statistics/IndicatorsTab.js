import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Empty, Input, Segmented, Spin, Table } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { Bar } from 'react-chartjs-2';

import { get_lab_stats_indicators } from '../../../host/requests/LabStatisticsRequest';
import { CATEGORY_LABELS, COLORS, num, pick } from './statsCommon';
import { Panel, RateCell, chartOptions, intAxis } from './statsUi';
import IndicatorDrawer, { nameOf } from './IndicatorDrawer';

/** "Ko'rsatkichlar": eng ko'p chetlanadiganlar va to'liq jadval; qator → oyna. */
export default function IndicatorsTab({ params, reloadKey, lang }) {
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

    // Ulush bo'yicha — kamida 3 ta baholangan natija (1 tadan 100% chalg'itadi)
    const top = useMemo(() => {
        const list = enriched.filter((r) => r.abnormal > 0 && (rank === 'count' || r.assessed >= 3));
        list.sort((a, b) => (rank === 'count' ? b.abnormal - a.abnormal : b.rate - a.rate));
        return list.slice(0, 12);
    }, [enriched, rank]);

    const topData = {
        labels: top.map((r) => nameOf(r, lang)),
        datasets: rank === 'count'
            ? [
                { label: t('stats_high', { defaultValue: 'Yuqori' }), data: top.map((r) => Number(r.high) || 0), backgroundColor: COLORS.high, borderRadius: 2 },
                { label: t('stats_low', { defaultValue: 'Past' }), data: top.map((r) => Number(r.low) || 0), backgroundColor: COLORS.low, borderRadius: 2 },
            ]
            : [{ label: t('stats_abnormal_rate', { defaultValue: 'Chetlanish ulushi' }) + ', %', data: top.map((r) => Math.round(r.rate * 1000) / 10), backgroundColor: COLORS.high, borderRadius: 2 }],
    };

    const columns = [
        {
            title: t('stats_indicator', { defaultValue: "Ko'rsatkich" }),
            key: 'name',
            sorter: (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
            render: (_, r) => (
                <div>
                    <div className="lsx-cell-name">{nameOf(r, lang)}</div>
                    <div className="lsx-cell-sub">
                        {pick(CATEGORY_LABELS[r.category], lang) || r.category}
                        {r.unassessed ? ` · ${t('stats_unassessed', { defaultValue: 'Baholanmagan' }).toLowerCase()}: ${r.unassessed}` : ''}
                    </div>
                </div>
            ),
        },
        { title: t('stats_n', { defaultValue: 'Natijalar' }), dataIndex: 'n', align: 'right', width: 100, sorter: (a, b) => a.n - b.n },
        { title: t('stats_patients', { defaultValue: 'Bemorlar' }), dataIndex: 'patients', align: 'right', width: 100, sorter: (a, b) => a.patients - b.patients },
        {
            title: t('stats_out_of_range', { defaultValue: "Me'yordan tashqari" }), key: 'rate', width: 230,
            render: (_, r) => <RateCell high={r.high} low={r.low} assessed={r.assessed} />,
            sorter: (a, b) => a.abnormal - b.abnormal || a.rate - b.rate,
            defaultSortOrder: 'descend',
        },
        {
            title: t('stats_median', { defaultValue: 'Mediana (P10–P90)' }), key: 'median', align: 'right', width: 220,
            render: (_, r) => (r.median == null ? <span className="lsx-muted">—</span>
                : <span className="lsx-nowrap"><b>{num(r.median)}</b> <span className="lsx-muted">({num(r.p10)}–{num(r.p90)}) {r.measure || ''}</span></span>),
        },
        { title: '', key: 'go', width: 32, render: () => <RightOutlined style={{ color: '#94a3b8', fontSize: 12 }} /> },
    ];

    const empty = t('stats_no_data', { defaultValue: "Tanlangan filtr bo'yicha ma'lumot yo'q" });
    if (loading && !rows.length) return <div className="lsx-loading"><Spin /></div>;
    if (!rows.length) return <Empty description={empty} />;

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
                <div className="lsx-chart" style={{ height: Math.max(160, 26 * top.length + 60) }}>
                    {top.length ? (
                        <Bar
                            data={topData}
                            options={{
                                ...chartOptions,
                                indexAxis: 'y',
                                onClick: (_, els) => { if (els[0]) setSelected(top[els[0].index]); },
                                onHover: (e, els) => { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; },
                                scales: {
                                    x: { stacked: rank === 'count', ...(rank === 'count' ? intAxis : { beginAtZero: true, max: 100 }) },
                                    y: { stacked: rank === 'count', grid: { display: false } },
                                },
                            }}
                        />
                    ) : <div className="lsx-empty">{t('stats_no_abnormal', { defaultValue: "Me'yordan chetlanish topilmadi" })}</div>}
                </div>
            </Panel>

            <Panel
                title={`${t('stats_all_indicators', { defaultValue: "Barcha ko'rsatkichlar" })} (${filtered.length})`}
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
                    pagination={{ pageSize: 20, showSizeChanger: false, size: 'small' }}
                    scroll={{ x: 820 }}
                    rowClassName="lsx-row-click"
                    onRow={(r) => ({ onClick: () => setSelected(r) })}
                />
            </Panel>

            <IndicatorDrawer row={selected} params={params} lang={lang} onClose={() => setSelected(null)} />
        </Spin>
    );
}
