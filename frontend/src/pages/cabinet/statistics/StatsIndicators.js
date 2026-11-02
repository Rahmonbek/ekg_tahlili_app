import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Spin, Table } from 'antd';

import { get_lab_stats_indicators } from '../../../host/requests/LabStatisticsRequest';
import { CATEGORY_LABELS, COLORS, num, pct, pick } from './statsCommon';
import { Card, PctBar, RankList } from './statsUi';
import IndicatorDrawer, { nameOf } from './IndicatorDrawer';

/**
 * Ko'rsatkichlar — statistika JADVALI: har bir ko'rsatkich bitta qator, har
 * bir ustun bitta statistika (natijalar, bemorlar, me'yorda, ↑, ↓, chetlanish
 * ulushi, o'rtacha, mediana, min, max, P10–P90, baholanmagan). Saralash —
 * ustun sarlavhasi; qator → batafsil oyna.
 */
export default function StatsIndicators({ params, reloadKey, lang, periodText }) {
    const { t } = useTranslation();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
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
        return { ...r, abnormal, assessed, rate: assessed ? abnormal / assessed : 0, numeric: !r.value_kind || r.value_kind === 'numeric' };
    }), [rows]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q
            ? enriched.filter((r) => [r.column_name, r.name_uz, r.name_ru, r.name_en].some((x) => (x || '').toLowerCase().includes(q)))
            : enriched;
    }, [enriched, search]);

    const top = useMemo(() => enriched.filter((r) => r.abnormal > 0)
        .sort((a, b) => (b.abnormal - a.abnormal) || (b.rate - a.rate)).slice(0, 8), [enriched]);

    const L = {
        n: t('stats_n', { defaultValue: 'Natijalar' }),
        patients: t('stats_patients', { defaultValue: 'Bemorlar' }),
        normal: t('stats_normal', { defaultValue: "Me'yorda" }),
        high: t('stats_high', { defaultValue: 'Yuqori' }),
        low: t('stats_low', { defaultValue: 'Past' }),
        rate: t('stats_abnormal_rate', { defaultValue: 'Chetlanish ulushi' }),
        mean: t('stats_mean', { defaultValue: "O'rtacha" }),
        median: t('stats_median', { defaultValue: 'Mediana' }).replace(/\s*\(.*\)\s*$/, ''),
        unit: t('stats_unit', { defaultValue: 'Birlik' }),
        unassessed: t('stats_unassessed', { defaultValue: 'Baholanmagan' }),
        empty: t('stats_no_data', { defaultValue: "Tanlangan filtr bo'yicha ma'lumot yo'q" }),
    };

    const topRows = top.map((r) => ({
        key: r.column_name,
        label: nameOf(r, lang),
        sub: pick(CATEGORY_LABELS[r.category], lang) || r.category,
        value: r.abnormal,
        color: COLORS.high,
        right: (
            <>
                {Number(r.high) ? <span className="ls3-high">↑{r.high}</span> : null}
                {Number(r.high) && Number(r.low) ? ' ' : null}
                {Number(r.low) ? <span className="ls3-low">↓{r.low}</span> : null}
                <span className="ls3-muted"> · {pct(r.abnormal, r.assessed)} ({r.abnormal}/{r.assessed})</span>
            </>
        ),
        row: r,
    }));

    const numCol = (title, key, extra = {}) => ({
        title, dataIndex: key, align: 'right', className: 'ls3-num', width: 90,
        sorter: (a, b) => (Number(a[key]) || 0) - (Number(b[key]) || 0),
        render: (x, r) => (r.numeric && x != null ? num(x) : <span className="ls3-muted">—</span>),
        ...extra,
    });
    const cnt = (x) => (Number(x) ? x : <span className="ls3-muted">0</span>);

    const columns = [
        {
            title: t('stats_indicator', { defaultValue: "Ko'rsatkich" }), key: 'name', fixed: 'left', width: 230,
            sorter: (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
            render: (_, r) => (
                <div>
                    <div className="ls3-cell-name">{nameOf(r, lang)}</div>
                    <div className="ls3-cell-sub">{pick(CATEGORY_LABELS[r.category], lang) || r.category}</div>
                </div>
            ),
        },
        { title: L.unit, dataIndex: 'measure', width: 90, render: (m, r) => (r.numeric ? (m || '—') : <span className="ls3-muted">{t('stats_qualitative', { defaultValue: 'Sifat natijasi' })}</span>) },
        numCol(L.n, 'n', { render: cnt }),
        numCol(L.patients, 'patients', { render: cnt }),
        numCol(L.normal, 'normal', { render: cnt }),
        numCol(`↑ ${L.high}`, 'high', { render: (x) => (Number(x) ? <span className="ls3-high">{x}</span> : <span className="ls3-muted">0</span>) }),
        numCol(`↓ ${L.low}`, 'low', { render: (x) => (Number(x) ? <span className="ls3-low">{x}</span> : <span className="ls3-muted">0</span>) }),
        {
            title: L.rate, key: 'rate', width: 160, defaultSortOrder: 'descend',
            sorter: (a, b) => (a.abnormal - b.abnormal) || (a.rate - b.rate),
            render: (_, r) => <PctBar part={r.abnormal} total={r.assessed} />,
        },
        numCol(L.mean, 'mean'),
        numCol(L.median, 'median'),
        numCol('Min', 'min'),
        numCol('Max', 'max'),
        {
            title: 'P10–P90', key: 'p', align: 'right', className: 'ls3-num', width: 130,
            render: (_, r) => (r.numeric && r.p10 != null ? `${num(r.p10)}–${num(r.p90)}` : <span className="ls3-muted">—</span>),
        },
        numCol(L.unassessed, 'unassessed', {
            width: 120,
            render: (x, r) => (Number(x) ? <span>{x}{Number(r.unit_mismatch) ? <span className="ls3-muted"> ({t('stats_unit_mismatch', { defaultValue: 'birlik' })}: {r.unit_mismatch})</span> : null}</span> : <span className="ls3-muted">0</span>),
        }),
    ];

    if (loading && !rows.length) return <div className="ls3-loading"><Spin /></div>;

    return (
        <Spin spinning={loading}>
            <div className="ls3-crumb">
                <h2>{t('stats_tab_indicators', { defaultValue: "Ko'rsatkichlar" })}</h2>
                <span>{periodText} · {rows.length} {t('stats_indicators_n', { defaultValue: "xil ko'rsatkich" })}</span>
            </div>

            {!rows.length ? <div className="ls3-empty">{L.empty}</div> : (
                <>
                    <Card title={t('stats_top_abnormal', { defaultValue: "Eng ko'p me'yordan chetlanadigan ko'rsatkichlar" })}
                        extra={<span className="ls3-muted">{t('stats_top_hint', { defaultValue: "Polosa — me'yordan tashqari natijalar soni; ↑ yuqori, ↓ past" })}</span>}
                    >
                        <RankList rows={topRows} empty={t('stats_no_abnormal', { defaultValue: "Me'yordan chetlanish topilmadi" })} onClick={(r) => setSelected(r.row)} />
                    </Card>

                    <Card
                        title={`${t('stats_all_indicators', { defaultValue: "Barcha ko'rsatkichlar" })} (${visible.length})`}
                        extra={(
                            <div className="ls3-table-tools">
                                <Input.Search allowClear placeholder={t('stats_search_indicator', { defaultValue: "Ko'rsatkich nomi" })} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                        )}
                    >
                        <Table
                            size="small"
                            rowKey="column_name"
                            columns={columns}
                            dataSource={visible}
                            pagination={{ pageSize: 25, showSizeChanger: false, size: 'small' }}
                            scroll={{ x: 1500 }}
                            rowClassName="ls3-row-click"
                            onRow={(r) => ({ onClick: () => setSelected(r) })}
                        />
                    </Card>
                </>
            )}

            <IndicatorDrawer row={selected} params={params} lang={lang} onClose={() => setSelected(null)} />
        </Spin>
    );
}
