import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button, Pagination, Spin, Tooltip, message } from 'antd';
import { CheckCircleFilled, CheckOutlined, CloseOutlined, RedoOutlined, SyncOutlined } from '@ant-design/icons';

import { get_lab_signals, recompute_lab_signals, review_lab_signal } from '../../../../host/requests/LabStatisticsRequest';
import { REVIEW_META, SEVERITY_META, STATUS_META, pick, ruleLabel } from '../statsCommon';
import { fmtDate } from './v3Ui';
import { SignalDetails, SignalReviewModal } from '../signalParts';
import '../LabStatistics.css'; // `SignalDetails` ichidagi `lst-*` uslublar

const STATUS_ORDER = ['CRITICAL', 'CRITERIA_MET', 'SUSPECTED', 'MONITOR', 'INSUFFICIENT_DATA'];
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
 * Xavf signallari — BEMOR bo'yicha guruhlangan: bitta bemorning barcha
 * signallari bitta kartada. Filtrlar chap ustunda (`LabStatsV3`), bu yerda
 * holat tugmalari va ro'yxat.
 */
export default function V3Signals({ filters, setFilters, summary, reloadKey, lang, onChanged }) {
    const { t } = useTranslation();
    const [list, setList] = useState({ total: 0, items: [] });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [refresh, setRefresh] = useState(0);
    const [reviewing, setReviewing] = useState(null);
    const [open, setOpen] = useState({});

    useEffect(() => { setPage(1); }, [filters]);

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

    const toggle = (key, value) => setFilters((f) => ({ ...f, [key]: f[key] === value ? null : value }));

    const counts = useMemo(() => Object.fromEntries((summary?.byStatus || []).map((r) => [r.key, Number(r.n) || 0])), [summary]);
    const pending = (summary?.byReview || []).find((r) => r.key === 'pending')?.n || 0;
    const state = summary?.state || {};

    // Sahifadagi signallar bemor bo'yicha (birinchi uchrash tartibida)
    const groups = useMemo(() => {
        const map = new Map();
        list.items.forEach((r) => {
            if (!map.has(r.patient_id)) map.set(r.patient_id, { patient: r, items: [] });
            map.get(r.patient_id).items.push(r);
        });
        return Array.from(map.values());
    }, [list.items]);

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
            message.info(t('stats_recompute_queued', { count: r.data?.queued ?? 0, defaultValue: '{{count}} ta bemor qayta baholashga yuborildi — bir necha daqiqada yangilanadi' }));
        } catch {
            message.error(t('stats_review_failed', { defaultValue: "Saqlab bo'lmadi" }));
        }
    };

    const who = (r) => {
        const age = ageOf(r.birthdate);
        const sex = r.gender === true ? t('male', { defaultValue: 'Erkak' }) : r.gender === false ? t('female', { defaultValue: 'Ayol' }) : null;
        return [sex, age != null ? `${age} ${t('stats_years', { defaultValue: 'yosh' })}` : null].filter(Boolean).join(', ');
    };

    return (
        <div>
            <div className="ls3-crumb">
                <h2>{t('stats_tab_signals', { defaultValue: 'Xavf signallari' })}</h2>
                <span>{Number(list.total) || 0} {t('stats_signals_list', { defaultValue: 'Signallar' }).toLowerCase()}</span>
                <div className="ls3-crumb-right">
                    {state.last_evaluated_at && <span className="ls3-muted">{t('stats_last_eval', { defaultValue: 'Oxirgi hisob' })}: {new Date(state.last_evaluated_at).toLocaleString('ru-RU')}</span>}
                    <Button size="small" icon={<SyncOutlined />} onClick={recompute}>{t('stats_recompute', { defaultValue: 'Qayta hisoblash' })}</Button>
                </div>
            </div>

            <div className="ls3-pills">
                <button type="button" className={`ls3-pill${filters.review === 'pending' ? ' ls3-pill--active' : ''}`} onClick={() => toggle('review', 'pending')}>
                    <i style={{ background: '#94a3b8' }} />{t('stats_pending_review', { defaultValue: "Ko'rib chiqilmagan" })}<b>{pending}</b>
                </button>
                {STATUS_ORDER.filter((s) => counts[s]).map((s) => (
                    <button key={s} type="button" className={`ls3-pill${filters.status === s ? ' ls3-pill--active' : ''}`} onClick={() => toggle('status', s)}>
                        <i style={{ background: STATUS_META[s].color }} />{pick(STATUS_META[s], lang)}<b>{counts[s]}</b>
                    </button>
                ))}
            </div>

            <Spin spinning={loading}>
                {!groups.length && !loading && <div className="ls3-empty">{t('stats_no_signals', { defaultValue: "Hozircha signal yo'q" })}</div>}
                {groups.map((g) => (
                    <section key={g.patient.patient_id} className="ls3-group">
                        <header className="ls3-group-head">
                            <Link to={`/patcients/${g.patient.patient_id}`}>{`${g.patient.lastname || ''} ${g.patient.firstname || ''}`.trim()}</Link>
                            <span>{who(g.patient)}</span>
                            <span className="ls3-group-n">{t('stats_signals_n', { count: g.items.length, defaultValue: '{{count}} ta signal' })}</span>
                        </header>
                        {g.items.map((r) => {
                            const isOpen = !!open[r.id];
                            const reviewed = r.reviewer_status && r.reviewer_status !== 'pending';
                            return (
                                <div key={r.id} className="ls3-sig">
                                    <span className="ls3-sig-dot" style={{ background: SEVERITY_META[r.severity]?.color }} />
                                    <div className="ls3-sig-main">
                                        <div className="ls3-sig-meta">
                                            <b style={{ color: STATUS_META[r.status]?.color }}>{pick(STATUS_META[r.status], lang)}</b>
                                            <span>{pick(SEVERITY_META[r.severity], lang)}</span>
                                            <Tooltip title={ruleLabel(r.rule_id, lang)}><span className="ls3-sig-rule">{r.rule_id}</span></Tooltip>
                                            <span>{fmtDate(r.observed_at)}</span>
                                        </div>
                                        <div className="ls3-sig-title">{r.title_uz}</div>
                                        <div className="ls3-sig-msg">{r.message_uz}</div>
                                        <button type="button" className="ls3-sig-toggle" onClick={() => setOpen((o) => ({ ...o, [r.id]: !isOpen }))}>
                                            {isOpen ? `▴ ${t('stats_hide_short', { defaultValue: 'Yashirish' })}` : `▾ ${t('stats_evidence', { defaultValue: 'Dalillar va tavsiya' })}`}
                                        </button>
                                        {isOpen && <div className="ls3-sig-details"><SignalDetails row={r} /></div>}
                                    </div>
                                    <div className="ls3-sig-side">
                                        {reviewed && (
                                            <span className={`ls3-sig-review ls3-sig-review--${r.reviewer_status}`}>
                                                {r.reviewer_status === 'confirmed' ? <CheckCircleFilled /> : <CloseOutlined />}{' '}
                                                {pick(REVIEW_META[r.reviewer_status], lang)}{r.reviewer_name ? ` · ${r.reviewer_name}` : ''}
                                            </span>
                                        )}
                                        {r.reviewer_status !== 'confirmed' && (
                                            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => setReviewing({ row: r, decision: 'confirmed' })}>
                                                {t('stats_confirm', { defaultValue: 'Tasdiqlash' })}
                                            </Button>
                                        )}
                                        {r.reviewer_status !== 'rejected' && (
                                            <Button size="small" icon={<CloseOutlined />} onClick={() => setReviewing({ row: r, decision: 'rejected' })}>
                                                {t('stats_reject', { defaultValue: 'Rad etish' })}
                                            </Button>
                                        )}
                                        {reviewed && (
                                            <Button size="small" type="text" icon={<RedoOutlined />} onClick={() => setReviewing({ row: r, decision: 'pending' })}>
                                                {t('stats_reset_review', { defaultValue: 'Qaror bekor qilinsin' })}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                ))}
                {Number(list.total) > PAGE_SIZE && (
                    <div className="ls3-pager">
                        <Pagination size="small" current={page} pageSize={PAGE_SIZE} total={Number(list.total) || 0} onChange={setPage} showSizeChanger={false} />
                    </div>
                )}
            </Spin>

            <SignalReviewModal reviewing={reviewing} lang={lang} onCancel={() => setReviewing(null)} onSubmit={submitReview} />
        </div>
    );
}
