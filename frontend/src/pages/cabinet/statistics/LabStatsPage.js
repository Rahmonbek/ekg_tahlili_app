import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, DatePicker, InputNumber, Segmented, Select } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { useStore } from '../../../store/Store';
import useDocumentTitle from '../../../tools/useDocumentTitle';
import { get_lab_signals_summary, get_lab_stats_doctor_options } from '../../../host/requests/LabStatisticsRequest';
import { CATEGORY_LABELS, cleanParams, langCode, pick } from './statsCommon';
import OverviewTab from './OverviewTab';
import IndicatorsTab from './IndicatorsTab';
import SignalsTab from './SignalsTab';
import './LabStats.css';

const NO_FILTERS = { doctorId: null, gender: null, ageFrom: null, ageTo: null, category: null, indicator: null, onlyAbnormal: false };

/** Davr tugmalari → sana oralig'i (null — butun davr). */
const PRESET_RANGE = {
    '30d': () => [dayjs().subtract(30, 'day'), dayjs()],
    '90d': () => [dayjs().subtract(3, 'month'), dayjs()],
    year: () => [dayjs().startOf('year'), dayjs()],
    all: () => null,
};

/**
 * Klinika laboratoriya statistikasi (admin/direktor) — ixcham ko'rinish.
 *
 * Uch bo'lim: umumiy, ko'rsatkichlar, xavf signallari. Filtrlar alohida
 * "Qo'llash" tugmasisiz darhol qo'llanadi; yosh maydonlari yozib
 * bo'lingach (400 ms) yuboriladi. Xavf signallari davr/filtrga bog'liq emas
 * — ular bemorning butun tarixidan hisoblanadi.
 */
export default function LabStatsPage() {
    const { t } = useTranslation();
    const lang = langCode(t);
    useDocumentTitle(t('lab_statistics', { defaultValue: 'Laboratoriya statistikasi' }));
    const { lab_values } = useStore();

    const [tab, setTab] = useState('overview');
    const [preset, setPreset] = useState('all');
    const [range, setRange] = useState(null);
    const [filters, setFilters] = useState(NO_FILTERS);
    const [age, setAge] = useState({ ageFrom: null, ageTo: null });
    const [doctors, setDoctors] = useState([]);
    const [pendingSignals, setPendingSignals] = useState(0);
    const [signalsKey, setSignalsKey] = useState(0); // qaror saqlangach sarlavhadagi son yangilansin
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        get_lab_stats_doctor_options().then((r) => setDoctors(r.data || [])).catch(() => setDoctors([]));
    }, []);

    useEffect(() => {
        get_lab_signals_summary()
            .then((r) => setPendingSignals((r.data?.byReview || []).find((x) => x.key === 'pending')?.n || 0))
            .catch(() => setPendingSignals(0));
    }, [reloadKey, signalsKey]);

    // Yosh — har bir raqamda so'rov ketmasin
    useEffect(() => {
        const id = setTimeout(() => setFilters((f) => ({ ...f, ...age })), 400);
        return () => clearTimeout(id);
    }, [age]);

    const params = useMemo(() => cleanParams({
        from: range?.[0] ? range[0].format('YYYY-MM-DD') : null,
        to: range?.[1] ? range[1].format('YYYY-MM-DD') : null,
        doctorId: filters.doctorId,
        gender: filters.gender,
        ageFrom: filters.ageFrom,
        ageTo: filters.ageTo,
        category: filters.category,
        indicator: filters.indicator,
        onlyAbnormal: filters.onlyAbnormal ? true : null,
    }), [range, filters]);

    const categories = useMemo(() => {
        const set = new Set((lab_values ?? []).map((v) => v.category).filter(Boolean));
        return Array.from(set).map((c) => ({ value: c, label: pick(CATEGORY_LABELS[c], lang) || c }));
    }, [lab_values, lang]);

    const indicatorOptions = useMemo(() => (lab_values ?? [])
        .filter((v) => !filters.category || v.category === filters.category)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((v) => ({ value: v.columnName, label: v[`name${t('data_lang')}`] || v.columnName })),
    [lab_values, filters.category, t]);

    const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
    const choosePreset = (p) => { setPreset(p); setRange(PRESET_RANGE[p]()); };
    const chooseRange = (v) => { setRange(v && (v[0] || v[1]) ? v : null); setPreset(v && (v[0] || v[1]) ? 'custom' : 'all'); };

    const filterCount = Object.values({ ...filters, ageFrom: age.ageFrom, ageTo: age.ageTo }).filter((v) => v !== null && v !== false).length;
    const clearFilters = () => { setFilters(NO_FILTERS); setAge({ ageFrom: null, ageTo: null }); };

    const all = t('stats_all', { defaultValue: 'Barchasi' });

    return (
        <div className="lsx">
            <div className="main_card">
                <h1>
                    <span>{t('lab_statistics', { defaultValue: 'Laboratoriya statistikasi' })}</span>
                    <Button icon={<ReloadOutlined />} onClick={() => setReloadKey((k) => k + 1)}>
                        {t('stats_refresh', { defaultValue: 'Yangilash' })}
                    </Button>
                </h1>
                <div className="main_card_content">
                    <div className="lsx-bar">
                        <Segmented
                            value={tab}
                            onChange={setTab}
                            options={[
                                { value: 'overview', label: t('stats_tab_overview', { defaultValue: 'Umumiy' }) },
                                { value: 'indicators', label: t('stats_tab_indicators', { defaultValue: "Ko'rsatkichlar" }) },
                                {
                                    value: 'signals',
                                    label: (
                                        <>
                                            {t('stats_tab_signals', { defaultValue: 'Xavf signallari' })}
                                            {pendingSignals ? <span className="lsx-count">{pendingSignals}</span> : null}
                                        </>
                                    ),
                                },
                            ]}
                        />
                        {tab !== 'signals' && (
                            <div className="lsx-period">
                                <Segmented
                                    size="small"
                                    value={preset}
                                    onChange={choosePreset}
                                    options={[
                                        { value: '30d', label: t('stats_p30', { defaultValue: '30 kun' }) },
                                        { value: '90d', label: t('stats_p90', { defaultValue: '3 oy' }) },
                                        { value: 'year', label: t('stats_this_year', { defaultValue: 'Shu yil' }) },
                                        { value: 'all', label: t('stats_all_time', { defaultValue: 'Butun davr' }) },
                                        ...(preset === 'custom' ? [{ value: 'custom', label: t('stats_custom_period', { defaultValue: 'Tanlangan' }) }] : []),
                                    ]}
                                />
                                <DatePicker.RangePicker
                                    size="small"
                                    value={range}
                                    onChange={chooseRange}
                                    format="DD.MM.YYYY"
                                    allowEmpty={[true, true]}
                                    placeholder={[t('stats_from', { defaultValue: 'dan' }), t('stats_to', { defaultValue: 'gacha' })]}
                                />
                            </div>
                        )}
                    </div>

                    {tab !== 'signals' && (
                        <div className="lsx-filters">
                            <Select
                                allowClear showSearch optionFilterProp="label"
                                value={filters.doctorId}
                                onChange={(v) => set({ doctorId: v ?? null })}
                                options={doctors.map((d) => ({ value: d.id, label: d.name }))}
                                placeholder={`${t('doctor', { defaultValue: 'Shifokor' })}: ${all.toLowerCase()}`}
                            />
                            <Select
                                allowClear
                                value={filters.gender}
                                onChange={(v) => set({ gender: v ?? null })}
                                options={[
                                    { value: 'male', label: t('male', { defaultValue: 'Erkak' }) },
                                    { value: 'female', label: t('female', { defaultValue: 'Ayol' }) },
                                    { value: 'unknown', label: t('stats_unknown', { defaultValue: "Noma'lum" }) },
                                ]}
                                placeholder={`${t('gender', { defaultValue: 'Jinsi' })}: ${all.toLowerCase()}`}
                            />
                            <div className="lsx-age">
                                <span>{t('stats_age', { defaultValue: 'Yoshi' })}</span>
                                <InputNumber min={0} max={120} value={age.ageFrom} onChange={(v) => setAge((a) => ({ ...a, ageFrom: v }))} placeholder={t('stats_from', { defaultValue: 'dan' })} />
                                <span>—</span>
                                <InputNumber min={0} max={120} value={age.ageTo} onChange={(v) => setAge((a) => ({ ...a, ageTo: v }))} placeholder={t('stats_to', { defaultValue: 'gacha' })} />
                            </div>
                            <Select
                                allowClear
                                value={filters.category}
                                onChange={(v) => set({ category: v ?? null, indicator: null })}
                                options={categories}
                                placeholder={`${t('stats_category', { defaultValue: 'Tahlil guruhi' })}: ${all.toLowerCase()}`}
                            />
                            <Select
                                className="ant-select--wide"
                                allowClear showSearch optionFilterProp="label"
                                value={filters.indicator}
                                onChange={(v) => set({ indicator: v ?? null })}
                                options={indicatorOptions}
                                placeholder={`${t('stats_indicator', { defaultValue: "Ko'rsatkich" })}: ${all.toLowerCase()}`}
                            />
                            <Checkbox checked={filters.onlyAbnormal} onChange={(e) => set({ onlyAbnormal: e.target.checked })}>
                                {t('stats_only_abnormal', { defaultValue: "Faqat me'yordan tashqari" })}
                            </Checkbox>
                            <span className="lsx-filters-spacer" />
                            {filterCount > 0 && (
                                <Button size="small" type="link" onClick={clearFilters}>
                                    {t('stats_reset', { defaultValue: 'Tozalash' })} ({filterCount})
                                </Button>
                            )}
                        </div>
                    )}

                    {tab === 'overview' && <OverviewTab params={params} reloadKey={reloadKey} lang={lang} />}
                    {tab === 'indicators' && <IndicatorsTab params={params} reloadKey={reloadKey} lang={lang} />}
                    {tab === 'signals' && <SignalsTab reloadKey={reloadKey} lang={lang} onChanged={() => setSignalsKey((k) => k + 1)} />}
                </div>
            </div>
        </div>
    );
}
