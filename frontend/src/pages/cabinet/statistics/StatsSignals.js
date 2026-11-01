import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert, Button, Empty, Input, Modal, Select, Space, Spin, Table, Tag, Tooltip, message } from 'antd';
import { CheckOutlined, CloseOutlined, RedoOutlined, SyncOutlined } from '@ant-design/icons';
import { Bar } from 'react-chartjs-2';

import {
    get_lab_signals, get_lab_signals_summary, recompute_lab_signals, review_lab_signal,
} from '../../../host/requests/LabStatisticsRequest';
import {
    COLORS, KpiCard, Panel, REVIEW_META, RULE_LABELS, SEVERITY_META, STATUS_META, baseOptions, num, pick,
} from './statsCommon';

const STATUS_ORDER = ['CRITICAL', 'CRITERIA_MET', 'SUSPECTED', 'MONITOR', 'INSUFFICIENT_DATA'];

function parseJson(text, fallback) {
    if (!text) return fallback;
    try { return JSON.parse(text); } catch { return fallback; }
}

function ageOf(birthdate) {
    if (!birthdate) return null;
    const b = new Date(birthdate);
    const now = new Date();
    let a = now.getFullYear() - b.getFullYear();
    if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) a -= 1;
    return a;
}

/**
 * "Xavf signallari": bemorlarning laboratoriya tarixidagi o'zgarishlarga
 * asoslangan klinik qoidalar natijasi ("NMED laboratoriya klinik qoidalari"
 * v1.0). Signal — yakuniy tashxis emas; shifokor tasdiqlaydi yoki rad etadi.
 */
export default function StatsSignals({ reloadKey, lang }) {
    const { t } = useTranslation();
    const [summary, setSummary] = useState(null);
    const [list, setList] = useState({ total: 0, items: [] });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: null, rule: null, severity: null, review: null, search: '' });
    const [page, setPage] = useState(1);
    const [refresh, setRefresh] = useState(0);
    const [reviewing, setReviewing] = useState(null); // { row, decision }
    const [note, setNote] = useState('');

    useEffect(() => {
        get_lab_signals_summary().then((r) => setSummary(r.data)).catch(() => setSummary(null));
    }, [reloadKey, refresh]);

    const load = useCallback(() => {
        setLoading(true);
        const params = { page, pageSize: 20 };
        Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
        get_lab_signals(params)
            .then((r) => setList(r.data || { total: 0, items: [] }))
            .catch(() => setList({ total: 0, items: [] }))
            .finally(() => setLoading(false));
    }, [filters, page]);

    useEffect(() => { load(); }, [load, reloadKey, refresh]);

    const setFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };

    const statusCounts = useMemo(
        () => Object.fromEntries((summary?.byStatus || []).map((r) => [r.key, r])),
        [summary],
    );
    const pending = (summary?.byReview || []).find((r) => r.key === 'pending')?.n || 0;
    const byRule = summary?.byRule || [];

    const ruleData = {
        labels: byRule.map((r) => r.key),
        datasets: [
            { label: pick(STATUS_META.CRITICAL, lang), data: byRule.map((r) => r.critical), backgroundColor: STATUS_META.CRITICAL.color },
            { label: pick(STATUS_META.CRITERIA_MET, lang), data: byRule.map((r) => r.criteria_met), backgroundColor: STATUS_META.CRITERIA_MET.color },
            { label: pick(STATUS_META.SUSPECTED, lang), data: byRule.map((r) => r.suspected), backgroundColor: STATUS_META.SUSPECTED.color },
            { label: pick(STATUS_META.MONITOR, lang), data: byRule.map((r) => r.monitor), backgroundColor: STATUS_META.MONITOR.color },
            { label: pick(STATUS_META.INSUFFICIENT_DATA, lang), data: byRule.map((r) => r.insufficient), backgroundColor: STATUS_META.INSUFFICIENT_DATA.color },
        ],
    };

    const submitReview = async () => {
        if (!reviewing) return;
        try {
            await review_lab_signal(reviewing.row.id, reviewing.decision, note);
            message.success(t('stats_review_saved', { defaultValue: 'Qaror saqlandi' }));
            setReviewing(null);
            setNote('');
            setRefresh((x) => x + 1);
        } catch {
            message.error(t('stats_review_failed', { defaultValue: 'Saqlab bo\'lmadi' }));
        }
    };

    const recompute = async () => {
        try {
            const r = await recompute_lab_signals();
            message.info(t('stats_recompute_queued', {
                count: r.data?.queued ?? 0,
                defaultValue: '{{count}} ta bemor qayta baholashga yuborildi — bir necha daqiqada yangilanadi',
            }));
        } catch {
            message.error(t('stats_review_failed', { defaultValue: 'Saqlab bo\'lmadi' }));
        }
    };

    const columns = [
        {
            title: t('stats_severity', { defaultValue: 'Daraja' }), dataIndex: 'severity', width: 110,
            render: (s) => <span className="lst-sev" style={{ background: SEVERITY_META[s]?.color }}>{pick(SEVERITY_META[s], lang)}</span>,
        },
        {
            title: t('patient', { defaultValue: 'Bemor' }), key: 'patient', width: 200,
            render: (_, r) => {
                const age = ageOf(r.birthdate);
                const sex = r.gender === true ? t('male', { defaultValue: 'Erkak' }) : r.gender === false ? t('female', { defaultValue: 'Ayol' }) : null;
                return (
                    <div>
                        <Link to={`/patcients/${r.patient_id}`}><b>{`${r.lastname || ''} ${r.firstname || ''}`.trim()}</b></Link>
                        <div className="lst-muted">{[sex, age != null ? `${age} ${t('stats_years', { defaultValue: 'yosh' })}` : null].filter(Boolean).join(', ') || '—'}</div>
                    </div>
                );
            },
        },
        {
            title: t('stats_signal', { defaultValue: 'Signal' }), key: 'signal',
            render: (_, r) => (
                <div>
                    <Space size={6} wrap>
                        <Tag color={STATUS_META[r.status]?.tag}>{pick(STATUS_META[r.status], lang)}</Tag>
                        <Tooltip title={RULE_LABELS[r.rule_id]}><Tag>{r.rule_id}</Tag></Tooltip>
                    </Space>
                    <div className="lst-signal-title">{r.title_uz}</div>
                    <div className="lst-signal-msg">{r.message_uz}</div>
                </div>
            ),
        },
        {
            title: t('stats_date', { defaultValue: 'Sana' }), dataIndex: 'observed_at', width: 110,
            render: (d) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—'),
        },
        {
            title: t('stats_review', { defaultValue: 'Shifokor qarori' }), key: 'review', width: 220,
            render: (_, r) => (
                <div>
                    <Tag color={REVIEW_META[r.reviewer_status]?.tag}>{pick(REVIEW_META[r.reviewer_status], lang)}</Tag>
                    {r.reviewer_name ? <div className="lst-muted">{r.reviewer_name}</div> : null}
                    <Space size={4} style={{ marginTop: 6 }}>
                        {r.reviewer_status !== 'confirmed' && (
                            <Button size="small" icon={<CheckOutlined />} onClick={() => setReviewing({ row: r, decision: 'confirmed' })}>
                                {t('stats_confirm', { defaultValue: 'Tasdiqlash' })}
                            </Button>
                        )}
                        {r.reviewer_status !== 'rejected' && (
                            <Button size="small" icon={<CloseOutlined />} onClick={() => setReviewing({ row: r, decision: 'rejected' })}>
                                {t('stats_reject', { defaultValue: 'Rad etish' })}
                            </Button>
                        )}
                        {r.reviewer_status !== 'pending' && (
                            <Tooltip title={t('stats_reset_review', { defaultValue: "Qaror bekor qilinsin" })}>
                                <Button size="small" icon={<RedoOutlined />} onClick={() => setReviewing({ row: r, decision: 'pending' })} />
                            </Tooltip>
                        )}
                    </Space>
                </div>
            ),
        },
    ];

    const expanded = (r) => {
        const evidence = parseJson(r.evidence, []);
        const temporal = parseJson(r.temporal, null);
        const missing = parseJson(r.missing_data, []);
        return (
            <div className="lst-expand">
                {r.recommendation_uz && (
                    <div className="lst-rec"><b>{t('stats_recommendation', { defaultValue: 'Tavsiya etilgan keyingi qadam' })}:</b> {r.recommendation_uz}</div>
                )}
                <Table
                    size="small"
                    pagination={false}
                    rowKey={(e) => `${e.indicator}-${e.analysisId}-${e.date}`}
                    dataSource={evidence}
                    columns={[
                        { title: t('stats_indicator', { defaultValue: "Ko'rsatkich" }), dataIndex: 'name' },
                        { title: t('stats_value', { defaultValue: 'Qiymat' }), key: 'v', render: (_, e) => `${e.text || num(e.value)} ${e.unit || ''}` },
                        {
                            title: t('stats_threshold', { defaultValue: 'Chegara' }), key: 't',
                            render: (_, e) => (e.threshold != null ? `${e.comparator || ''} ${num(e.threshold)} ${({ lab: `(${t('lab_ref_source', { defaultValue: 'laboratoriya' })})`, catalog: `(${t('stats_catalog_ref', { defaultValue: 'katalog' })})`, criterion: `(${t('stats_criterion', { defaultValue: 'mezon' })})` })[e.thresholdSource] || ''}` : '—'),
                        },
                        { title: t('stats_date', { defaultValue: 'Sana' }), dataIndex: 'date', render: (d) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—') },
                        { title: '', key: 'a', render: (_, e) => <Link to={`/lab-analyses/view/${e.analysisId}`}>{t('stats_open', { defaultValue: 'Tahlil' })} →</Link> },
                    ]}
                />
                {temporal && (
                    <div className="lst-temporal">
                        <b>{t('stats_temporal', { defaultValue: "Vaqt bo'yicha o'zgarish" })}:</b>{' '}
                        {Object.entries(temporal).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${typeof v === 'number' ? num(v) : String(v).slice(0, 10)}`).join(' · ')}
                    </div>
                )}
                {missing.length > 0 && (
                    <div className="lst-missing">
                        <b>{t('stats_missing', { defaultValue: "Yetishmayotgan ma'lumot" })}:</b> {missing.join('; ')}
                    </div>
                )}
                {r.review_note && <div className="lst-muted">{t('stats_review_note', { defaultValue: 'Izoh' })}: {r.review_note}</div>}
                <div className="lst-muted">{t('stats_rules_version', { defaultValue: 'Qoidalar versiyasi' })}: {r.source_version}</div>
            </div>
        );
    };

    return (
        <div>
            <Alert
                type="info"
                showIcon
                className="lst-disclaimer"
                message={t('stats_signals_title', { defaultValue: "Xavf signallari — yakuniy tashxis emas" })}
                description={t('stats_signals_desc', {
                    defaultValue: "Har bir bemorning shu klinikadagi barcha laboratoriya tahlillari vaqt bo'yicha solishtiriladi va xalqaro " +
                        "klinik mezonlar (KDIGO, ADA 2026, WHO 2024, NICE, ESC, AASLD va boshqalar) asosida signal beriladi. Foizdagi " +
                        "ehtimol berilmaydi — har bir signal dalil (qiymatlar, sanalar, chegara) va keyingi qadam bilan. Signalni " +
                        "shifokor ko'rib chiqib tasdiqlaydi yoki rad etadi. Tibbiy ekspert tasdig'idan oldin bu bo'lim sinov (pilot) rejimida.",
                })}
            />

            <div className="lst-kpis">
                {STATUS_ORDER.map((s) => (
                    <KpiCard
                        key={s}
                        label={pick(STATUS_META[s], lang)}
                        value={statusCounts[s]?.n || 0}
                        hint={`${statusCounts[s]?.patients || 0} ${t('stats_patients_short', { defaultValue: 'bemor' })}`}
                        accent={STATUS_META[s].color}
                        active={filters.status === s}
                        onClick={() => setFilter({ status: filters.status === s ? null : s })}
                    />
                ))}
                <KpiCard
                    label={t('stats_pending_review', { defaultValue: "Ko'rib chiqilmagan" })}
                    value={pending}
                    accent={COLORS.gray}
                    active={filters.review === 'pending'}
                    onClick={() => setFilter({ review: filters.review === 'pending' ? null : 'pending' })}
                />
            </div>

            <Panel
                title={t('stats_by_rule', { defaultValue: 'Qoidalar bo\'yicha signallar' })}
                extra={(
                    <Space>
                        {summary?.state?.last_evaluated_at && (
                            <span className="lst-muted">
                                {t('stats_last_eval', { defaultValue: 'Oxirgi hisob' })}: {new Date(summary.state.last_evaluated_at).toLocaleString('ru-RU')}
                            </span>
                        )}
                        <Button size="small" icon={<SyncOutlined />} onClick={recompute}>
                            {t('stats_recompute', { defaultValue: 'Qayta hisoblash' })}
                        </Button>
                    </Space>
                )}
            >
                <div className="lst-chart">
                    {byRule.length ? (
                        <Bar
                            data={ruleData}
                            options={{
                                ...baseOptions,
                                onClick: (_, els) => { if (els[0]) setFilter({ rule: byRule[els[0].index].key }); },
                                plugins: {
                                    ...baseOptions.plugins,
                                    tooltip: { callbacks: { title: (items) => `${items[0].label} — ${RULE_LABELS[items[0].label] || ''}` } },
                                },
                                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
                            }}
                        />
                    ) : <Empty description={t('stats_no_signals', { defaultValue: "Hozircha signal yo'q" })} />}
                </div>
            </Panel>

            <Panel title={t('stats_signals_list', { defaultValue: 'Signallar' })}>
                <div className="lst-filters lst-filters--inline">
                    <Input.Search
                        allowClear
                        placeholder={t('search_by_patient', { defaultValue: 'Bemor ismi' })}
                        onSearch={(v) => setFilter({ search: v })}
                        style={{ width: 220 }}
                    />
                    <Select
                        allowClear showSearch optionFilterProp="label"
                        placeholder={t('stats_rule', { defaultValue: 'Qoida' })}
                        value={filters.rule}
                        onChange={(v) => setFilter({ rule: v ?? null })}
                        options={Object.keys(RULE_LABELS).map((k) => ({ value: k, label: `${k} — ${RULE_LABELS[k]}` }))}
                        style={{ width: 280 }}
                    />
                    <Select
                        allowClear
                        placeholder={t('stats_status', { defaultValue: 'Holat' })}
                        value={filters.status}
                        onChange={(v) => setFilter({ status: v ?? null })}
                        options={STATUS_ORDER.map((s) => ({ value: s, label: pick(STATUS_META[s], lang) }))}
                        style={{ width: 190 }}
                    />
                    <Select
                        allowClear
                        placeholder={t('stats_severity', { defaultValue: 'Daraja' })}
                        value={filters.severity}
                        onChange={(v) => setFilter({ severity: v ?? null })}
                        options={[3, 2, 1].map((s) => ({ value: s, label: pick(SEVERITY_META[s], lang) }))}
                        style={{ width: 150 }}
                    />
                    <Select
                        allowClear
                        placeholder={t('stats_review', { defaultValue: 'Shifokor qarori' })}
                        value={filters.review}
                        onChange={(v) => setFilter({ review: v ?? null })}
                        options={Object.keys(REVIEW_META).map((k) => ({ value: k, label: pick(REVIEW_META[k], lang) }))}
                        style={{ width: 190 }}
                    />
                </div>
                <Spin spinning={loading}>
                    <Table
                        size="small"
                        rowKey="id"
                        columns={columns}
                        dataSource={list.items}
                        expandable={{ expandedRowRender: expanded }}
                        scroll={{ x: 980 }}
                        locale={{ emptyText: <Empty description={t('stats_no_signals', { defaultValue: "Hozircha signal yo'q" })} /> }}
                        pagination={{
                            current: page,
                            pageSize: 20,
                            total: Number(list.total) || 0,
                            onChange: setPage,
                            showSizeChanger: false,
                        }}
                    />
                </Spin>
            </Panel>

            <Modal
                open={!!reviewing}
                onCancel={() => { setReviewing(null); setNote(''); }}
                onOk={submitReview}
                okText={t('save', { defaultValue: 'Saqlash' })}
                title={reviewing ? `${reviewing.row.rule_id}: ${({
                    confirmed: t('stats_confirm', { defaultValue: 'Tasdiqlash' }),
                    rejected: t('stats_reject', { defaultValue: 'Rad etish' }),
                    pending: t('stats_reset_review', { defaultValue: 'Qaror bekor qilinsin' }),
                })[reviewing.decision]}` : ''}
            >
                {reviewing && (
                    <>
                        <p className="lst-signal-title">{reviewing.row.title_uz}</p>
                        <p className="lst-muted">{`${reviewing.row.lastname || ''} ${reviewing.row.firstname || ''}`}</p>
                        <Input.TextArea
                            rows={3}
                            maxLength={1000}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={t('stats_review_note_ph', { defaultValue: "Izoh (ixtiyoriy): klinik asos, keyingi qadam…" })}
                        />
                    </>
                )}
            </Modal>
        </div>
    );
}
