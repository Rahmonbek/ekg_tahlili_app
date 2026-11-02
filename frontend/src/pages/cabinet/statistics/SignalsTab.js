import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button, Input, Pagination, Select, Spin, Tooltip, message } from 'antd';
import {
    CheckCircleFilled, CheckOutlined, CloseOutlined, DownOutlined, InfoCircleOutlined, RedoOutlined, SyncOutlined, UpOutlined,
} from '@ant-design/icons';

import {
    get_lab_signals, get_lab_signals_summary, recompute_lab_signals, review_lab_signal,
} from '../../../host/requests/LabStatisticsRequest';
import { REVIEW_META, RULE_LABELS, SEVERITY_META, STATUS_META, pick, ruleLabel } from './statsCommon';
import { Panel, fmtDate } from './statsUi';
import { SignalDetails, SignalReviewModal } from './signalParts';
import './LabStatistics.css'; // `SignalDetails` ichidagi `lst-*` uslublar

const STATUS_ORDER = ['CRITICAL', 'CRITERIA_MET', 'SUSPECTED', 'MONITOR', 'INSUFFICIENT_DATA'];
// Yuqoridagi kartochkalar: ish navbati (ko'rib chiqilmagan) + uchta asosiy holat
const CARD_STATUSES = ['CRITICAL', 'CRITERIA_MET', 'SUSPECTED'];
const PAGE_SIZE = 20;

function ageOf(birthdate) {
    if (!birthdate) return null;
    const b = new Date(birthdate);
    const now = new Date();
    let a = now.getFullYear() - b.getFullYear();
    if (now < new Date(now.getFullYear(), b.getMonth(), b.getDate())) a -= 1;
    return a;
}

/**
 * "Xavf signallari" — sodda ro'yxat: har signalda holat, nom, izoh, bemor
 * va shifokor qarori tugmalari; dalillar "Batafsil" ostida. `onChanged` —
 * qaror saqlangach bo'lim sarlavhasidagi "ko'rib chiqilmagan" soni yangilansin.
 */
export default function SignalsTab({ reloadKey, lang, onChanged }) {
    const { t } = useTranslation();
    const [summary, setSummary] = useState(null);
    const [list, setList] = useState({ total: 0, items: [] });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: null, rule: null, review: null, search: '' });
    const [page, setPage] = useState(1);
    const [refresh, setRefresh] = useState(0);
    const [reviewing, setReviewing] = useState(null); // { row, decision }
    const [open, setOpen] = useState({}); // id → tafsilot ochiq

    useEffect(() => {
        get_lab_signals_summary().then((r) => setSummary(r.data)).catch(() => setSummary(null));
    }, [reloadKey, refresh]);

    const load = useCallback(() => {
        setLoading(true);
        const params = { page, pageSize: PAGE_SIZE };
        Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
        get_lab_signals(params)
            .then((r) => setList(r.data || { total: 0, items: [] }))
            .catch(() => setList({ total: 0, items: [] }))
            .finally(() => setLoading(false));
    }, [filters, page]);

    useEffect(() => { load(); }, [load, reloadKey, refresh]);

    const setFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
    const toggle = (key, value) => setFilter({ [key]: filters[key] === value ? null : value });

    const statusCounts = useMemo(() => Object.fromEntries((summary?.byStatus || []).map((r) => [r.key, Number(r.n) || 0])), [summary]);
    const pending = (summary?.byReview || []).find((r) => r.key === 'pending')?.n || 0;
    const state = summary?.state || {};

    const submitReview = async (row, decision, note) => {
        try {
            await review_lab_signal(row.id, decision, note);
            message.success(t('stats_review_saved', { defaultValue: 'Qaror saqlandi' }));
            setReviewing(null);
            setRefresh((x) => x + 1);
            onChanged?.();
        } catch {
            message.error(t('stats_review_failed', { defaultValue: "Saqlab bo'lmadi" }));
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
            message.error(t('stats_review_failed', { defaultValue: "Saqlab bo'lmadi" }));
        }
    };

    const noSignals = t('stats_no_signals', { defaultValue: "Hozircha signal yo'q" });

    return (
        <div>
            <div className="lsx-kpis">
                <button
                    type="button"
                    className={`lsx-kpi lsx-kpi--btn lsx-kpi--gray${filters.review === 'pending' ? ' lsx-kpi--active' : ''}`}
                    onClick={() => toggle('review', 'pending')}
                >
                    <div className="lsx-kpi-label">{t('stats_pending_review', { defaultValue: "Ko'rib chiqilmagan" })}</div>
                    <div className="lsx-kpi-value">{pending}</div>
                </button>
                {CARD_STATUSES.map((s) => (
                    <button
                        key={s}
                        type="button"
                        className={`lsx-kpi lsx-kpi--btn${filters.status === s ? ' lsx-kpi--active' : ''}`}
                        style={{ borderLeftColor: STATUS_META[s].color }}
                        onClick={() => toggle('status', s)}
                    >
                        <div className="lsx-kpi-label">{pick(STATUS_META[s], lang)}</div>
                        <div className="lsx-kpi-value">{statusCounts[s] || 0}</div>
                    </button>
                ))}
            </div>

            <Panel
                title={(
                    <>
                        {t('stats_signals_list', { defaultValue: 'Signallar' })} ({Number(list.total) || 0})
                        <Tooltip title={t('stats_signal_note', { defaultValue: "Signal — tashxis emas: shifokor dalillarni ko'rib tasdiqlaydi yoki rad etadi." })}>
                            <InfoCircleOutlined style={{ marginLeft: 6, color: '#94a3b8', fontSize: 13 }} />
                        </Tooltip>
                    </>
                )}
                extra={(
                    <span className="lsx-muted">
                        {state.last_evaluated_at ? `${t('stats_last_eval', { defaultValue: 'Oxirgi hisob' })}: ${new Date(state.last_evaluated_at).toLocaleString('ru-RU')}  ` : ''}
                        <Button size="small" icon={<SyncOutlined />} onClick={recompute}>
                            {t('stats_recompute', { defaultValue: 'Qayta hisoblash' })}
                        </Button>
                    </span>
                )}
            >
                <div className="lsx-filters">
                    <Input.Search
                        allowClear
                        placeholder={t('search_by_patient', { defaultValue: 'Bemor ismi' })}
                        onSearch={(v) => setFilter({ search: v })}
                        style={{ width: 200 }}
                    />
                    <Select
                        allowClear
                        placeholder={`${t('stats_status', { defaultValue: 'Holat' })}: ${t('stats_all', { defaultValue: 'Barchasi' }).toLowerCase()}`}
                        value={filters.status}
                        onChange={(v) => setFilter({ status: v ?? null })}
                        options={STATUS_ORDER.map((s) => ({ value: s, label: `${pick(STATUS_META[s], lang)} (${statusCounts[s] || 0})` }))}
                        style={{ width: 230 }}
                    />
                    <Select
                        allowClear
                        placeholder={`${t('stats_review', { defaultValue: 'Shifokor qarori' })}: ${t('stats_all', { defaultValue: 'Barchasi' }).toLowerCase()}`}
                        value={filters.review}
                        onChange={(v) => setFilter({ review: v ?? null })}
                        options={Object.keys(REVIEW_META).map((k) => ({ value: k, label: pick(REVIEW_META[k], lang) }))}
                        style={{ width: 230 }}
                    />
                    <Select
                        className="ant-select--wide"
                        allowClear showSearch optionFilterProp="label"
                        placeholder={`${t('stats_rule', { defaultValue: 'Qoida' })}: ${t('stats_all', { defaultValue: 'Barchasi' }).toLowerCase()}`}
                        value={filters.rule}
                        onChange={(v) => setFilter({ rule: v ?? null })}
                        options={Object.keys(RULE_LABELS).map((k) => ({ value: k, label: `${k} — ${ruleLabel(k, lang)}` }))}
                    />
                </div>

                <Spin spinning={loading}>
                    {list.items.length === 0 && !loading && <div className="lsx-empty">{noSignals}</div>}
                    <div className="lsx-sigs">
                        {list.items.map((r) => {
                            const age = ageOf(r.birthdate);
                            const sex = r.gender === true ? t('male', { defaultValue: 'Erkak' }) : r.gender === false ? t('female', { defaultValue: 'Ayol' }) : null;
                            const who = [sex, age != null ? `${age} ${t('stats_years', { defaultValue: 'yosh' })}` : null].filter(Boolean).join(', ');
                            const isOpen = !!open[r.id];
                            const status = STATUS_META[r.status];
                            const reviewed = r.reviewer_status && r.reviewer_status !== 'pending';
                            return (
                                <article key={r.id} className="lsx-sig">
                                    <div className="lsx-sig-bar" style={{ background: SEVERITY_META[r.severity]?.color }} />
                                    <div className="lsx-sig-body">
                                        <div className="lsx-sig-top">
                                            <span className="lsx-sig-status" style={{ color: status?.color }}>
                                                {pick(status, lang)} · {pick(SEVERITY_META[r.severity], lang)}
                                            </span>
                                            <span className="lsx-sig-date">{fmtDate(r.observed_at)}</span>
                                        </div>
                                        <div className="lsx-sig-title">{r.title_uz}</div>
                                        <div className="lsx-sig-msg">{r.message_uz}</div>
                                        <div className="lsx-sig-foot">
                                            <div className="lsx-sig-patient">
                                                <Link to={`/patcients/${r.patient_id}`}>{`${r.lastname || ''} ${r.firstname || ''}`.trim()}</Link>
                                                {who ? <span>{who}</span> : null}
                                                <Tooltip title={ruleLabel(r.rule_id, lang)}><span className="lsx-sig-rule">{r.rule_id}</span></Tooltip>
                                            </div>
                                            <div className="lsx-sig-actions">
                                                {reviewed && (
                                                    <span className={`lsx-sig-review lsx-sig-review--${r.reviewer_status}`}>
                                                        {r.reviewer_status === 'confirmed' ? <CheckCircleFilled /> : <CloseOutlined />}
                                                        {' '}{pick(REVIEW_META[r.reviewer_status], lang)}{r.reviewer_name ? ` · ${r.reviewer_name}` : ''}
                                                    </span>
                                                )}
                                                {r.reviewer_status !== 'confirmed' && (
                                                    <Button size="small" type="primary" ghost icon={<CheckOutlined />} onClick={() => setReviewing({ row: r, decision: 'confirmed' })}>
                                                        {t('stats_confirm', { defaultValue: 'Tasdiqlash' })}
                                                    </Button>
                                                )}
                                                {r.reviewer_status !== 'rejected' && (
                                                    <Button size="small" icon={<CloseOutlined />} onClick={() => setReviewing({ row: r, decision: 'rejected' })}>
                                                        {t('stats_reject', { defaultValue: 'Rad etish' })}
                                                    </Button>
                                                )}
                                                {reviewed && (
                                                    <Tooltip title={t('stats_reset_review', { defaultValue: 'Qaror bekor qilinsin' })}>
                                                        <Button size="small" icon={<RedoOutlined />} onClick={() => setReviewing({ row: r, decision: 'pending' })} />
                                                    </Tooltip>
                                                )}
                                                <Button size="small" type="text" onClick={() => setOpen((o) => ({ ...o, [r.id]: !isOpen }))}
                                                    icon={isOpen ? <UpOutlined /> : <DownOutlined />}>
                                                    {t('stats_details_short', { defaultValue: 'Batafsil' })}
                                                </Button>
                                            </div>
                                        </div>
                                        {isOpen && <div className="lsx-sig-details"><SignalDetails row={r} /></div>}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                    {Number(list.total) > PAGE_SIZE && (
                        <div className="lsx-pager">
                            <Pagination size="small" current={page} pageSize={PAGE_SIZE} total={Number(list.total) || 0} onChange={setPage} showSizeChanger={false} />
                        </div>
                    )}
                </Spin>
            </Panel>

            <SignalReviewModal reviewing={reviewing} lang={lang} onCancel={() => setReviewing(null)} onSubmit={submitReview} />
        </div>
    );
}
