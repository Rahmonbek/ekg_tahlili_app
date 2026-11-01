import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, DatePicker, InputNumber, Select, Switch, Tabs } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { useStore } from '../../../store/Store';
import useDocumentTitle from '../../../tools/useDocumentTitle';
import { get_lab_stats_doctor_options } from '../../../host/requests/LabStatisticsRequest';
import { CATEGORY_LABELS, cleanParams, langCode, pick } from './statsCommon';
import StatsOverview from './StatsOverview';
import StatsIndicators from './StatsIndicators';
import StatsSignals from './StatsSignals';
import './LabStatistics.css';

const EMPTY = {
    range: [null, null],
    doctorId: null,
    gender: null,
    ageFrom: null,
    ageTo: null,
    category: null,
    indicator: null,
    onlyAbnormal: false,
};

/**
 * Klinika laboratoriya statistikasi (admin/direktor).
 *
 * Ma'lumot manbai — `lab_analysis_values` (har bir ko'rsatkich alohida qator):
 * tahlillar soni va dinamikasi, ko'rsatkichlar bo'yicha taqsimot, me'yordan
 * chetlanishlar, shifokorlar kesimi va bemorlarning vaqt bo'yicha
 * o'zgarishlariga asoslangan "xavf signallari" (klinik qoidalar).
 * Barcha raqamlar faqat shu klinika ma'lumotidan.
 */
export default function LabStatistics() {
    const { t } = useTranslation();
    const lang = langCode(t);
    useDocumentTitle(t('lab_statistics', { defaultValue: 'Laboratoriya statistikasi' }));
    const { lab_values } = useStore();

    const [draft, setDraft] = useState(EMPTY);
    const [applied, setApplied] = useState(EMPTY);
    const [doctors, setDoctors] = useState([]);
    const [tab, setTab] = useState('overview');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        get_lab_stats_doctor_options().then((r) => setDoctors(r.data || [])).catch(() => setDoctors([]));
    }, []);

    const params = useMemo(() => cleanParams({
        from: applied.range?.[0] ? applied.range[0].format('YYYY-MM-DD') : null,
        to: applied.range?.[1] ? applied.range[1].format('YYYY-MM-DD') : null,
        doctorId: applied.doctorId,
        gender: applied.gender,
        ageFrom: applied.ageFrom,
        ageTo: applied.ageTo,
        category: applied.category,
        indicator: applied.indicator,
        onlyAbnormal: applied.onlyAbnormal ? true : null,
    }), [applied]);

    const categories = useMemo(() => {
        const set = new Set((lab_values ?? []).map((v) => v.category).filter(Boolean));
        return Array.from(set).map((c) => ({ value: c, label: pick(CATEGORY_LABELS[c], lang) || c }));
    }, [lab_values, lang]);

    const indicatorOptions = useMemo(() => (lab_values ?? [])
        .filter((v) => !draft.category || v.category === draft.category)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((v) => ({ value: v.columnName, label: v[`name${t('data_lang')}`] || v.columnName })),
    [lab_values, draft.category, t]);

    const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
    const apply = () => setApplied(draft);
    const reset = () => { setDraft(EMPTY); setApplied(EMPTY); };
    const activeCount = Object.keys(params).length;

    const presets = [
        { label: t('stats_last_30', { defaultValue: 'Oxirgi 30 kun' }), value: [dayjs().subtract(30, 'day'), dayjs()] },
        { label: t('stats_last_90', { defaultValue: 'Oxirgi 3 oy' }), value: [dayjs().subtract(3, 'month'), dayjs()] },
        { label: t('stats_this_year', { defaultValue: 'Shu yil' }), value: [dayjs().startOf('year'), dayjs()] },
        { label: t('stats_last_year', { defaultValue: "O'tgan yil" }), value: [dayjs().subtract(1, 'year').startOf('year'), dayjs().subtract(1, 'year').endOf('year')] },
    ];

    const filterBar = (
        <div className="lst-filters">
            <div className="lst-filter lst-filter--wide">
                <label>{t('stats_period', { defaultValue: 'Davr (tahlil sanasi)' })}</label>
                <DatePicker.RangePicker
                    value={draft.range}
                    onChange={(v) => set({ range: v || [null, null] })}
                    format="DD.MM.YYYY"
                    presets={presets}
                    allowEmpty={[true, true]}
                    style={{ width: '100%' }}
                />
            </div>
            <div className="lst-filter">
                <label>{t('doctor', { defaultValue: 'Shifokor' })}</label>
                <Select
                    allowClear showSearch optionFilterProp="label"
                    value={draft.doctorId}
                    onChange={(v) => set({ doctorId: v ?? null })}
                    options={doctors.map((d) => ({ value: d.id, label: d.name }))}
                    placeholder={t('stats_all', { defaultValue: 'Barchasi' })}
                />
            </div>
            <div className="lst-filter">
                <label>{t('gender', { defaultValue: 'Jinsi' })}</label>
                <Select
                    allowClear
                    value={draft.gender}
                    onChange={(v) => set({ gender: v ?? null })}
                    options={[
                        { value: 'male', label: t('male', { defaultValue: 'Erkak' }) },
                        { value: 'female', label: t('female', { defaultValue: 'Ayol' }) },
                        { value: 'unknown', label: t('stats_unknown', { defaultValue: "Noma'lum" }) },
                    ]}
                    placeholder={t('stats_all', { defaultValue: 'Barchasi' })}
                />
            </div>
            <div className="lst-filter lst-filter--age">
                <label>{t('stats_age', { defaultValue: 'Yoshi' })}</label>
                <div className="lst-age">
                    <InputNumber min={0} max={120} value={draft.ageFrom} onChange={(v) => set({ ageFrom: v })} placeholder={t('stats_from', { defaultValue: 'dan' })} />
                    <span>—</span>
                    <InputNumber min={0} max={120} value={draft.ageTo} onChange={(v) => set({ ageTo: v })} placeholder={t('stats_to', { defaultValue: 'gacha' })} />
                </div>
            </div>
            <div className="lst-filter">
                <label>{t('stats_category', { defaultValue: "Tahlil guruhi" })}</label>
                <Select
                    allowClear
                    value={draft.category}
                    onChange={(v) => set({ category: v ?? null, indicator: null })}
                    options={categories}
                    placeholder={t('stats_all', { defaultValue: 'Barchasi' })}
                />
            </div>
            <div className="lst-filter lst-filter--wide">
                <label>{t('stats_indicator', { defaultValue: "Ko'rsatkich" })}</label>
                <Select
                    allowClear showSearch optionFilterProp="label"
                    value={draft.indicator}
                    onChange={(v) => set({ indicator: v ?? null })}
                    options={indicatorOptions}
                    placeholder={t('stats_all', { defaultValue: 'Barchasi' })}
                />
            </div>
            <div className="lst-filter lst-filter--switch">
                <label>{t('stats_only_abnormal', { defaultValue: "Faqat me'yordan tashqari" })}</label>
                <Switch checked={draft.onlyAbnormal} onChange={(v) => set({ onlyAbnormal: v })} />
            </div>
            <div className="lst-filter-actions">
                <Button type="primary" onClick={apply}>{t('stats_apply', { defaultValue: "Qo'llash" })}</Button>
                <Button onClick={reset} disabled={activeCount === 0 && JSON.stringify(draft) === JSON.stringify(EMPTY)}>
                    {t('stats_reset', { defaultValue: 'Tozalash' })}{activeCount ? ` (${activeCount})` : ''}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="lst">
            <div className="main_card">
                <h1>
                    <span>{t('lab_statistics', { defaultValue: 'Laboratoriya statistikasi' })}</span>
                    <Button icon={<ReloadOutlined />} onClick={() => setReloadKey((k) => k + 1)}>
                        {t('stats_refresh', { defaultValue: 'Yangilash' })}
                    </Button>
                </h1>
                <div className="main_card_content big_card_content">
                    <p className="lst-lead">
                        {t('stats_lead', {
                            defaultValue: "Klinikangizda yuklangan laboratoriya tahlillari bo'yicha statistika: har bir ko'rsatkich " +
                                "qiymatlari, me'yordan chetlanishlar va bemorlar tahlillaridagi o'zgarishlarga asoslangan xavf signallari.",
                        })}
                    </p>
                    {tab !== 'signals' && filterBar}
                    <Tabs
                        activeKey={tab}
                        onChange={setTab}
                        items={[
                            {
                                key: 'overview',
                                label: t('stats_tab_overview', { defaultValue: 'Umumiy' }),
                                children: <StatsOverview params={params} reloadKey={reloadKey} lang={lang} />,
                            },
                            {
                                key: 'indicators',
                                label: t('stats_tab_indicators', { defaultValue: "Ko'rsatkichlar" }),
                                children: <StatsIndicators params={params} reloadKey={reloadKey} lang={lang} />,
                            },
                            {
                                key: 'signals',
                                label: t('stats_tab_signals', { defaultValue: 'Xavf signallari' }),
                                children: <StatsSignals reloadKey={reloadKey} lang={lang} />,
                            },
                        ]}
                    />
                </div>
            </div>
        </div>
    );
}
