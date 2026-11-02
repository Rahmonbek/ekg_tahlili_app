import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Spin, Table } from 'antd';

import { get_lab_stats_indicators } from '../../../host/requests/LabStatisticsRequest';
import { CATEGORY_LABELS, num, pct, pick } from './statsCommon';
import { Card, PctBar, RING_OTHER, RING_PALETTE, Ring } from './statsUi';
import IndicatorDrawer, { nameOf } from './IndicatorDrawer';

/**
 * Ko'rsatkichlar — statistika JADVALI: har bir ko'rsatkich bitta qator, har
 * bir ustun bitta statistika (natijalar, bemorlar, me'yorda, ↑, ↓, patologiya
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

    // Halqada 10 ta ko'rsatkich, qolganlari bitta «Boshqalar» bo'lagi
    const TOP_N = 10;
    const withPathology = useMemo(() => enriched.filter((r) => r.abnormal > 0)
        .sort((a, b) => (b.abnormal - a.abnormal) || (b.rate - a.rate)), [enriched]);
    const top = withPathology.slice(0, TOP_N);
    const rest = withPathology.slice(TOP_N);

    const L = {
        n: t('stats_n', { defaultValue: 'Natijalar' }),
        patients: t('stats_patients', { defaultValue: 'Bemorlar' }),
        normal: t('stats_normal', { defaultValue: "Me'yorda" }),
        high: t('stats_high', { defaultValue: 'Yuqori' }),
        low: t('stats_low', { defaultValue: 'Past' }),
        rate: t('stats_abnormal_rate', { defaultValue: 'Patologiya ulushi' }),
        mean: t('stats_mean', { defaultValue: "O'rtacha" }),
        median: t('stats_median', { defaultValue: 'Mediana' }).replace(/\s*\(.*\)\s*$/, ''),
        unit: t('stats_unit', { defaultValue: 'Birlik' }),
        unassessed: t('stats_unassessed', { defaultValue: 'Baholanmagan' }),
        empty: t('stats_no_data', { defaultValue: "Tanlangan filtr bo'yicha ma'lumot yo'q" }),
    };

    const arrows = (r) => (
        <>
            {Number(r.high) ? <span className="ls3-high">↑{r.high}</span> : null}
            {Number(r.high) && Number(r.low) ? ' ' : null}
            {Number(r.low) ? <span className="ls3-low">↓{r.low}</span> : null}
        </>
    );
    const ringRows = [
        ...top.map((r, i) => ({
            key: r.column_name,
            label: nameOf(r, lang),
            sub: `${pick(CATEGORY_LABELS[r.category], lang) || r.category} · ${L.rate.replace(/,\s*%$/, '').toLowerCase()} ${pct(r.abnormal, r.assessed)}`,
            value: r.abnormal,
            color: RING_PALETTE[i % RING_PALETTE.length],
            extra: <>{arrows(r)} <b>{r.abnormal}</b></>,
            row: r,
        })),
        ...(rest.length ? [{
            key: '__rest',
            label: `${t('stats_other_indicators', { defaultValue: "Boshqa ko'rsatkichlar" })} (${rest.length})`,
            value: rest.reduce((s, r) => s + r.abnormal, 0),
            color: RING_OTHER,
        }] : []),
    ];

    // Sarlavhalar bir qatorda; ustun kengligi mazmunga qarab (`max-content`)
    // Keng jadval: nom ustuni chapda qotadi, sarlavhalar qisqa va BIR qatorda,
    // to'liq nomi — sichqoncha ustiga borganda (title). Kengliklar aniq —
    // ilgari sarlavhalar so'z o'rtasidan bo'linardi («Резул ьтаты»)
    const head = (short, full) => <span title={full}>{short}</span>;
    const numCol = (title, key, width, extra = {}) => ({
        title, dataIndex: key, align: 'right', className: 'ls3-num', width,
        render: (x, r) => (r.numeric && x != null ? num(x) : <span className="ls3-muted">—</span>),
        ...extra,
    });
    const sortBy = (key) => (a, b) => (Number(a[key]) || 0) - (Number(b[key]) || 0);
    const cnt = (x) => (Number(x) ? x : <span className="ls3-muted">0</span>);

    const columns = [
        {
            title: t('stats_indicator', { defaultValue: "Ko'rsatkich" }), key: 'name', fixed: 'left', width: 210,
            sorter: (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
            render: (_, r) => (
                <div>
                    <div className="ls3-cell-name">{nameOf(r, lang)}</div>
                    <div className="ls3-cell-sub">{pick(CATEGORY_LABELS[r.category], lang) || r.category}</div>
                </div>
            ),
        },
        {
            title: L.unit, dataIndex: 'measure', width: 84,
            render: (m, r) => (r.numeric ? (m || '—') : <span className="ls3-muted">{t('stats_qualitative_short', { defaultValue: 'sifat' })}</span>),
        },
        numCol(head(t('stats_h_n', { defaultValue: 'Natija' }), L.n), 'n', 82, { render: cnt, sorter: sortBy('n') }),
        numCol(head(t('stats_h_patients', { defaultValue: 'Bemor' }), L.patients), 'patients', 82, { render: cnt, sorter: sortBy('patients') }),
        numCol(head(t('stats_h_normal', { defaultValue: "Me'yorda" }), L.normal), 'normal', 90, { render: cnt, sorter: sortBy('normal') }),
        numCol(head('↑', L.high), 'high', 56, { sorter: sortBy('high'), render: (x) => (Number(x) ? <span className="ls3-high">{x}</span> : <span className="ls3-muted">0</span>) }),
        numCol(head('↓', L.low), 'low', 56, { sorter: sortBy('low'), render: (x) => (Number(x) ? <span className="ls3-low">{x}</span> : <span className="ls3-muted">0</span>) }),
        {
            title: head(t('stats_h_rate', { defaultValue: 'Patologiya' }), L.rate), key: 'rate', width: 150, defaultSortOrder: 'descend',
            sorter: (a, b) => (a.abnormal - b.abnormal) || (a.rate - b.rate),
            render: (_, r) => <PctBar part={r.abnormal} total={r.assessed} />,
        },
        numCol(head(t('stats_h_mean', { defaultValue: "O'rtacha" }), L.mean), 'mean', 84),
        numCol(head(t('stats_h_median', { defaultValue: 'Mediana' }), L.median), 'median', 86, { render: (x, r) => (r.numeric && x != null ? <b>{num(x)}</b> : <span className="ls3-muted">—</span>) }),
        numCol('Min', 'min', 70),
        numCol('Max', 'max', 70),
        {
            title: 'P10–P90', key: 'p', align: 'right', className: 'ls3-num', width: 130,
            render: (_, r) => (r.numeric && r.p10 != null ? `${num(r.p10)}–${num(r.p90)}` : <span className="ls3-muted">—</span>),
        },
        numCol(head(t('stats_h_unassessed', { defaultValue: 'Bahosiz' }), L.unassessed), 'unassessed', 86, {
            render: (x, r) => (Number(x)
                ? <span title={Number(r.unit_mismatch) ? `${t('stats_unit_mismatch', { defaultValue: 'birlik' })}: ${r.unit_mismatch}` : undefined}>{x}</span>
                : <span className="ls3-muted">0</span>),
        }),
    ];
    const tableWidth = columns.reduce((sum, c) => sum + (c.width || 0), 0);

    if (loading && !rows.length) return <div className="ls3-loading"><Spin /></div>;

    return (
        <Spin spinning={loading}>
            <div className="ls3-crumb">
                <h2>{t('stats_tab_indicators', { defaultValue: "Ko'rsatkichlar" })}</h2>
                <span>{periodText} · {rows.length} {t('stats_indicators_n', { defaultValue: "xil ko'rsatkich" })}</span>
            </div>

            {!rows.length ? <div className="ls3-empty">{L.empty}</div> : (
                <>
                    <Card title={t('stats_top_abnormal', { defaultValue: "Eng ko'p patologiya aniqlangan ko'rsatkichlar" })}
                        extra={<span className="ls3-muted">{t('stats_top_hint', { defaultValue: "Son — me'yordan tashqari natijalar; ↑ yuqori, ↓ past" })}</span>}
                    >
                        <Ring
                            layout="split"
                            size={250}
                            rows={ringRows}
                            totalLabel={t('stats_pathologies', { defaultValue: 'patologik natija' })}
                            empty={t('stats_no_abnormal', { defaultValue: "Patologiya topilmadi" })}
                            onPick={(r) => r.row && setSelected(r.row)}
                        />
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
                            className="ls3-wide"
                            scroll={{ x: tableWidth }}
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
