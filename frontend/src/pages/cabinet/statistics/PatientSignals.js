import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Space, Tag, Tooltip, message } from 'antd';
import { AlertOutlined, CheckOutlined, CloseOutlined, DownOutlined, RedoOutlined, RightOutlined } from '@ant-design/icons';

import { get_patient_lab_signals, review_patient_lab_signal } from '../../../host/requests/LabStatisticsRequest';
import { REVIEW_META, SEVERITY_META, STATUS_META, langCode, pick, ruleLabel } from './statsCommon';
import { SignalDetails, SignalReviewModal } from './signalParts';
import './PatientSignals.css';

/**
 * Bemor kartasidagi "Laboratoriya xavf signallari" bloki (L-26).
 *
 * Shifokor (rol 4) bemorlar ro'yxatida ko'radigan bemorining signallarini
 * shu yerda ko'radi va tasdiqlaydi / rad etadi; admin va direktor — o'z
 * klinikasining bemorlarini. Huquqni backend hal qiladi (`canView`);
 * ruxsat bo'lmasa yoki signal bo'lmasa blok umuman chiqmaydi.
 * Signal — yakuniy tashxis emas.
 */
export default function PatientSignals({ patientId }) {
    const { t } = useTranslation();
    const lang = langCode(t);
    const [data, setData] = useState({ canView: false, items: [] });
    const [open, setOpen] = useState({});
    const [reviewing, setReviewing] = useState(null); // { row, decision }

    const load = useCallback(async () => {
        if (!patientId) return;
        try {
            const res = await get_patient_lab_signals(patientId);
            setData({
                canView: !!res?.data?.canView,
                items: Array.isArray(res?.data?.items) ? res.data.items : [],
            });
        } catch (err) {
            // Qo'shimcha blok: yuklanmasa ham bemor kartasi ochiladi
            setData({ canView: false, items: [] });
        }
    }, [patientId]);

    useEffect(() => { load(); }, [load]);

    const submitReview = async (row, decision, note) => {
        try {
            await review_patient_lab_signal(row.id, decision, note);
            message.success(t('stats_review_saved', { defaultValue: 'Qaror saqlandi' }));
            setReviewing(null);
            load();
        } catch (err) {
            message.error(t('stats_review_failed', { defaultValue: "Saqlab bo'lmadi" }));
        }
    };

    if (!data.canView || data.items.length === 0) return null;

    const pending = data.items.filter((r) => r.reviewer_status === 'pending').length;
    const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));
    const date = (d) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');

    return (
        <section className="ptc-panel psg" data-tour="card-signals">
            <header className="ptc-panel-head">
                <h2 className="ptc-panel-title">
                    <AlertOutlined /> {t('signals_patient_title', { defaultValue: 'Laboratoriya xavf signallari' })}
                    <span className="ptc-count">{data.items.length}</span>
                </h2>
                {pending > 0 && (
                    <Tag color="orange">
                        {t('signals_pending_count', { count: pending, defaultValue: "Ko'rib chiqilmagan: {{count}}" })}
                    </Tag>
                )}
            </header>
            <p className="psg-note">
                {t('signals_patient_hint', {
                    defaultValue: "Bemorning laboratoriya tahlillari vaqt bo'yicha solishtirilib, klinik mezonlar asosida berilgan signallar. " +
                        'Signal yakuniy tashxis emas — ko\'rib chiqing va tasdiqlang yoki rad eting.',
                })}
            </p>

            <ul className="psg-list">
                {data.items.map((r) => {
                    const sev = SEVERITY_META[r.severity];
                    const expanded = !!open[r.id];
                    return (
                        <li key={r.id} className="psg-item" style={{ borderLeftColor: sev?.color }}>
                            <div className="psg-head">
                                <Space size={6} wrap>
                                    <span className="lst-sev" style={{ background: sev?.color }}>{pick(sev, lang)}</span>
                                    <Tag color={STATUS_META[r.status]?.tag}>{pick(STATUS_META[r.status], lang)}</Tag>
                                    <Tooltip title={ruleLabel(r.rule_id, lang)}><Tag>{r.rule_id}</Tag></Tooltip>
                                    <span className="psg-rule">{ruleLabel(r.rule_id, lang)}</span>
                                </Space>
                                <span className="lst-muted">{date(r.observed_at)}</span>
                            </div>
                            <div className="lst-signal-title">{r.title_uz}</div>
                            <div className="lst-signal-msg">{r.message_uz}</div>

                            <div className="psg-foot">
                                <div className="psg-review">
                                    <Tag color={REVIEW_META[r.reviewer_status]?.tag}>{pick(REVIEW_META[r.reviewer_status], lang)}</Tag>
                                    {r.reviewer_name && (
                                        <span className="lst-muted">{r.reviewer_name}{r.reviewed_at ? `, ${date(r.reviewed_at)}` : ''}</span>
                                    )}
                                </div>
                                <Space size={4} wrap>
                                    <Button
                                        size="small"
                                        type="text"
                                        icon={expanded ? <DownOutlined /> : <RightOutlined />}
                                        onClick={() => toggle(r.id)}
                                    >
                                        {t('signals_details', { defaultValue: 'Dalillar' })}
                                    </Button>
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
                                        <Tooltip title={t('stats_reset_review', { defaultValue: 'Qaror bekor qilinsin' })}>
                                            <Button size="small" icon={<RedoOutlined />} onClick={() => setReviewing({ row: r, decision: 'pending' })} />
                                        </Tooltip>
                                    )}
                                </Space>
                            </div>

                            {expanded && <SignalDetails row={r} />}
                        </li>
                    );
                })}
            </ul>

            <SignalReviewModal
                reviewing={reviewing}
                lang={lang}
                onCancel={() => setReviewing(null)}
                onSubmit={submitReview}
            />
        </section>
    );
}
