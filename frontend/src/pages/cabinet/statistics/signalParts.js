import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Input, Modal, Table } from 'antd';

import { num, ruleLabel } from './statsCommon';

/**
 * Xavf signalining umumiy qismlari — klinika statistikasi sahifasi
 * (`StatsSignals`) va bemor kartasidagi blok (`PatientSignals`) uchun
 * bir xil: dalillar jadvali, vaqt bo'yicha o'zgarish, yetishmayotgan
 * ma'lumot va shifokor qarori oynasi.
 */

export function parseJson(text, fallback) {
    if (!text) return fallback;
    if (typeof text !== 'string') return text;
    try { return JSON.parse(text); } catch { return fallback; }
}

/** Signal tafsiloti: tavsiya, dalillar, vaqt bo'yicha o'zgarish, izoh. */
export function SignalDetails({ row: r }) {
    const { t } = useTranslation();
    const evidence = parseJson(r.evidence, []);
    const temporal = parseJson(r.temporal, null);
    const missing = parseJson(r.missing_data, []);
    const sourceLabel = {
        lab: `(${t('lab_ref_source', { defaultValue: 'laboratoriya' })})`,
        catalog: `(${t('stats_catalog_ref', { defaultValue: 'katalog' })})`,
        criterion: `(${t('stats_criterion', { defaultValue: 'mezon' })})`,
    };
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
                scroll={{ x: 560 }}
                columns={[
                    { title: t('stats_indicator', { defaultValue: "Ko'rsatkich" }), dataIndex: 'name' },
                    { title: t('stats_value', { defaultValue: 'Qiymat' }), key: 'v', render: (_, e) => `${e.text || num(e.value)} ${e.unit || ''}` },
                    {
                        title: t('stats_threshold', { defaultValue: 'Chegara' }), key: 't',
                        render: (_, e) => (e.threshold != null ? `${e.comparator || ''} ${num(e.threshold)} ${sourceLabel[e.thresholdSource] || ''}` : '—'),
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
}

/**
 * Shifokor qarori oynasi. `reviewing` = { row, decision } | null;
 * `onSubmit(row, decision, note)` — Promise (xato bo'lsa oyna ochiq qoladi).
 */
export function SignalReviewModal({ reviewing, lang, onCancel, onSubmit }) {
    const { t } = useTranslation();
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    // Oyna ochilganda mavjud izoh ko'rsatiladi (qarorni o'zgartirishda yo'qolmasin)
    useEffect(() => {
        setNote(reviewing && reviewing.decision !== 'pending' ? (reviewing.row.review_note || '') : '');
    }, [reviewing]);

    const submit = async () => {
        if (!reviewing) return;
        setSaving(true);
        try {
            await onSubmit(reviewing.row, reviewing.decision, note);
        } finally {
            setSaving(false);
        }
    };

    const actionLabel = reviewing ? ({
        confirmed: t('stats_confirm', { defaultValue: 'Tasdiqlash' }),
        rejected: t('stats_reject', { defaultValue: 'Rad etish' }),
        pending: t('stats_reset_review', { defaultValue: 'Qaror bekor qilinsin' }),
    })[reviewing.decision] : '';

    return (
        <Modal
            open={!!reviewing}
            onCancel={onCancel}
            onOk={submit}
            confirmLoading={saving}
            okText={t('save', { defaultValue: 'Saqlash' })}
            cancelText={t('cancel', { defaultValue: 'Bekor qilish' })}
            title={reviewing ? `${reviewing.row.rule_id}: ${actionLabel}` : ''}
        >
            {reviewing && (
                <>
                    <p className="lst-signal-title">{reviewing.row.title_uz}</p>
                    <p className="lst-muted">
                        {[ruleLabel(reviewing.row.rule_id, lang), `${reviewing.row.lastname || ''} ${reviewing.row.firstname || ''}`.trim()]
                            .filter(Boolean).join(' · ')}
                    </p>
                    {reviewing.decision !== 'pending' && (
                        <Input.TextArea
                            rows={3}
                            maxLength={1000}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder={t('stats_review_note_ph', { defaultValue: "Izoh (ixtiyoriy): klinik asos, keyingi qadam…" })}
                        />
                    )}
                </>
            )}
        </Modal>
    );
}
