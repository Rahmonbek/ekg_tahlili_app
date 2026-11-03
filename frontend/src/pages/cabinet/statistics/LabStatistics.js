import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, ConfigProvider, DatePicker, Divider, InputNumber, Select, Input, Space, message } from 'antd';
import { AlertOutlined, BarChartOutlined, ExperimentOutlined, FilePdfOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { useStore } from '../../../store/Store';
import useDocumentTitle from '../../../tools/useDocumentTitle';
import { download_lab_stats_pdf, get_lab_signals_summary, get_lab_stats_doctor_options } from '../../../host/requests/LabStatisticsRequest';
import { CATEGORY_LABELS, REVIEW_META, RULE_LABELS, STATUS_META, cleanParams, langCode, pick, ruleLabel } from './statsCommon';
import StatsOverview from './StatsOverview';
import StatsIndicators from './StatsIndicators';
import StatsSignals from './StatsSignals';
import './LabStatistics.css';

/** Chap paneldagi filtr maydonlari uchun ixcham mavzu (umumiy 40 px o'rniga). */
const SIDE_THEME = { token: { controlHeight: 34, borderRadius: 8, fontSize: 13 } };

const NO_FILTERS = { doctorId: null, gender: null, ageFrom: null, ageTo: null, category: null, indicator: null, onlyAbnormal: false };
const NO_SIGNAL_FILTERS = { status: null, review: null, rule: null, search: '' };
const STATUS_ORDER = ['CRITICAL', 'CRITERIA_MET', 'SUSPECTED', 'MONITOR', 'INSUFFICIENT_DATA'];

const PRESET_RANGE = {
    '30d': () => [dayjs().subtract(30, 'day'), dayjs()],
    '90d': () => [dayjs().subtract(3, 'month'), dayjs()],
    year: () => [dayjs().startOf('year'), dayjs()],
    all: () => null,
};

/**
 * Laboratoriya statistikasi (admin/direktor): chapda bo'limlar va BARCHA
 * filtrlar bitta ustunda (bir xil kenglikdagi maydonlar, har birida yorliq),
 * o'ngda hisobot. Filtrlar darhol qo'llanadi; yosh maydonlari yozib
 * bo'lingach (400 ms). Xavf signallari bo'limida chap ustun signal
 * filtrlariga almashadi.
 */
export default function LabStatistics() {
    const { t } = useTranslation();
    const lang = langCode(t);
    useDocumentTitle(t('lab_statistics', { defaultValue: 'Laboratoriya statistikasi' }));
    const { lab_values } = useStore();

    const [section, setSection] = useState('overview');
    const [pdfLoading, setPdfLoading] = useState(false);
    const [preset, setPreset] = useState('all');
    const [range, setRange] = useState(null);
    const [filters, setFilters] = useState(NO_FILTERS);
    const [age, setAge] = useState({ ageFrom: null, ageTo: null });
    const [sig, setSig] = useState(NO_SIGNAL_FILTERS);
    const [doctors, setDoctors] = useState([]);
    const [sigSummary, setSigSummary] = useState(null);
    const [signalsKey, setSignalsKey] = useState(0);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        get_lab_stats_doctor_options().then((r) => setDoctors(r.data || [])).catch(() => setDoctors([]));
    }, []);

    useEffect(() => {
        get_lab_signals_summary().then((r) => setSigSummary(r.data)).catch(() => setSigSummary(null));
    }, [reloadKey, signalsKey]);

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

    // PDF — sahifadagi filtrlar bilan, interfeys tilida
    const downloadPdf = async () => {
        setPdfLoading(true);
        try {
            await download_lab_stats_pdf(params, lang);
        } catch {
            message.error(t('pdf_download_failed', { defaultValue: "PDF yuklab bo'lmadi. Qayta urinib ko'ring." }));
        } finally {
            setPdfLoading(false);
        }
    };

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
    const chooseRange = (v) => {
        const has = v && (v[0] || v[1]);
        setRange(has ? v : null);
        setPreset(has ? 'custom' : 'all');
    };
    const filterCount = Object.values({ ...filters, ageFrom: age.ageFrom, ageTo: age.ageTo }).filter((v) => v !== null && v !== false).length
        + (range ? 1 : 0);
    const clearAll = () => { setFilters(NO_FILTERS); setAge({ ageFrom: null, ageTo: null }); setRange(null); setPreset('all'); };

    const sigCounts = useMemo(() => Object.fromEntries((sigSummary?.byStatus || []).map((r) => [r.key, Number(r.n) || 0])), [sigSummary]);
    const pendingSignals = (sigSummary?.byReview || []).find((x) => x.key === 'pending')?.n || 0;
    const sigCount = Object.values(sig).filter((v) => v).length;

    const all = t('stats_all', { defaultValue: 'Barchasi' });
    const periodText = range
        ? `${range[0] ? range[0].format('DD.MM.YYYY') : '…'} — ${range[1] ? range[1].format('DD.MM.YYYY') : '…'}`
        : t('stats_all_time', { defaultValue: 'Butun davr' });

    const sections = [
        { key: 'overview', icon: <BarChartOutlined />, label: t('stats_tab_overview', { defaultValue: 'Umumiy' }) },
        { key: 'indicators', icon: <ExperimentOutlined />, label: t('stats_tab_indicators', { defaultValue: "Ko'rsatkichlar" }) },
        { key: 'signals', icon: <AlertOutlined />, label: t('stats_tab_signals', { defaultValue: 'Xavf signallari' }), badge: pendingSignals },
    ];

    return (
        <div className="ls3">
            <div className="main_card">
                <h1>
                    <span>{t('lab_statistics', { defaultValue: 'Laboratoriya statistikasi' })}</span>
                    <Space>
                        <Button icon={<FilePdfOutlined />} loading={pdfLoading} onClick={downloadPdf}>
                            {t('download_pdf', { defaultValue: 'PDF yuklab olish' })}
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={() => setReloadKey((k) => k + 1)}>
                            {t('stats_refresh', { defaultValue: 'Yangilash' })}
                        </Button>
                    </Space>
                </h1>
                <div className="main_card_content">
                    <div className="ls3-layout">
                        <aside className="ls3-side">
                          {/* Filtrlar ixcham (34 px) — FAQAT shu panelda. Ilgari bu
                              LabStatistics.css da ~20 ta `!important` bilan qilingan edi. */}
                          <ConfigProvider theme={SIDE_THEME}>
                            <nav className="ls3-nav">
                                {sections.map((s) => (
                                    <button
                                        key={s.key}
                                        type="button"
                                        className={`ls3-nav-item${section === s.key ? ' ls3-nav-item--active' : ''}`}
                                        onClick={() => setSection(s.key)}
                                    >
                                        {s.icon}{s.label}
                                        {s.badge ? <span className="ls3-nav-badge">{s.badge}</span> : null}
                                    </button>
                                ))}
                            </nav>
                            <Divider />

                            {section !== 'signals' ? (
                                <>
                                    <div className="ls3-side-title">
                                        {t('stats_filters', { defaultValue: 'Filtrlar' })}
                                        {filterCount > 0 && <Button type="link" size="small" onClick={clearAll}>{t('stats_reset', { defaultValue: 'Tozalash' })} ({filterCount})</Button>}
                                    </div>
                                    <div className="ls3-side-fields">
                                        <div className="ls3-field">
                                            <label>{t('stats_period', { defaultValue: 'Davr (tahlil sanasi)' })}</label>
                                            <div className="ls3-presets">
                                                {[
                                                    ['30d', t('stats_p30', { defaultValue: '30 kun' })],
                                                    ['90d', t('stats_p90', { defaultValue: '3 oy' })],
                                                    ['year', t('stats_this_year', { defaultValue: 'Shu yil' })],
                                                    ['all', t('stats_all_short', { defaultValue: 'Hammasi' })],
                                                ].map(([key, label]) => (
                                                    <Button key={key} size="small" type={preset === key ? 'primary' : 'default'} onClick={() => choosePreset(key)}>{label}</Button>
                                                ))}
                                            </div>
                                            <DatePicker.RangePicker
                                                value={range}
                                                onChange={chooseRange}
                                                format="DD.MM.YYYY"
                                                allowEmpty={[true, true]}
                                                placeholder={[t('stats_from', { defaultValue: 'dan' }), t('stats_to', { defaultValue: 'gacha' })]}
                                            />
                                        </div>
                                        <div className="ls3-field">
                                            <label>{t('doctor', { defaultValue: 'Shifokor' })}</label>
                                            <Select allowClear showSearch optionFilterProp="label" value={filters.doctorId}
                                                onChange={(v) => set({ doctorId: v ?? null })}
                                                options={doctors.map((d) => ({ value: d.id, label: d.name }))} placeholder={all} />
                                        </div>
                                        <div className="ls3-field">
                                            <label>{t('gender', { defaultValue: 'Jinsi' })}</label>
                                            <Select allowClear value={filters.gender} onChange={(v) => set({ gender: v ?? null })} placeholder={all}
                                                options={[
                                                    { value: 'male', label: t('male', { defaultValue: 'Erkak' }) },
                                                    { value: 'female', label: t('female', { defaultValue: 'Ayol' }) },
                                                    { value: 'unknown', label: t('stats_unknown', { defaultValue: "Noma'lum" }) },
                                                ]} />
                                        </div>
                                        <div className="ls3-field">
                                            <label>{t('stats_age', { defaultValue: 'Yoshi' })}</label>
                                            <div className="ls3-range">
                                                <InputNumber min={0} max={120} value={age.ageFrom} onChange={(v) => setAge((a) => ({ ...a, ageFrom: v }))} placeholder={t('stats_from', { defaultValue: 'dan' })} />
                                                <span>—</span>
                                                <InputNumber min={0} max={120} value={age.ageTo} onChange={(v) => setAge((a) => ({ ...a, ageTo: v }))} placeholder={t('stats_to', { defaultValue: 'gacha' })} />
                                            </div>
                                        </div>
                                        <div className="ls3-field">
                                            <label>{t('stats_category', { defaultValue: 'Tahlil guruhi' })}</label>
                                            <Select allowClear value={filters.category} onChange={(v) => set({ category: v ?? null, indicator: null })}
                                                options={categories} placeholder={all} />
                                        </div>
                                        <div className="ls3-field">
                                            <label>{t('stats_indicator', { defaultValue: "Ko'rsatkich" })}</label>
                                            <Select allowClear showSearch optionFilterProp="label" value={filters.indicator}
                                                onChange={(v) => set({ indicator: v ?? null })} options={indicatorOptions} placeholder={all} />
                                        </div>
                                        <div className="ls3-field">
                                            <Checkbox checked={filters.onlyAbnormal} onChange={(e) => set({ onlyAbnormal: e.target.checked })}>
                                                {t('stats_only_abnormal', { defaultValue: "Faqat me'yordan tashqari" })}
                                            </Checkbox>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="ls3-side-title">
                                        {t('stats_filters', { defaultValue: 'Filtrlar' })}
                                        {sigCount > 0 && <Button type="link" size="small" onClick={() => setSig(NO_SIGNAL_FILTERS)}>{t('stats_reset', { defaultValue: 'Tozalash' })} ({sigCount})</Button>}
                                    </div>
                                    <div className="ls3-side-fields">
                                        <div className="ls3-field">
                                            <label>{t('patient', { defaultValue: 'Bemor' })}</label>
                                            <Input.Search allowClear placeholder={t('search_by_patient', { defaultValue: 'Bemor ismi' })}
                                                onSearch={(v) => setSig((s) => ({ ...s, search: v }))} />
                                        </div>
                                        <div className="ls3-field">
                                            <label>{t('stats_status', { defaultValue: 'Holat' })}</label>
                                            <Select allowClear value={sig.status} onChange={(v) => setSig((s) => ({ ...s, status: v ?? null }))} placeholder={all}
                                                options={STATUS_ORDER.map((s) => ({ value: s, label: `${pick(STATUS_META[s], lang)} (${sigCounts[s] || 0})` }))} />
                                        </div>
                                        <div className="ls3-field">
                                            <label>{t('stats_review', { defaultValue: 'Shifokor qarori' })}</label>
                                            <Select allowClear value={sig.review} onChange={(v) => setSig((s) => ({ ...s, review: v ?? null }))} placeholder={all}
                                                options={Object.keys(REVIEW_META).map((k) => ({ value: k, label: pick(REVIEW_META[k], lang) }))} />
                                        </div>
                                        <div className="ls3-field">
                                            <label>{t('stats_rule', { defaultValue: 'Qoida' })}</label>
                                            <Select allowClear showSearch optionFilterProp="label" value={sig.rule}
                                                onChange={(v) => setSig((s) => ({ ...s, rule: v ?? null }))} placeholder={all}
                                                options={Object.keys(RULE_LABELS).map((k) => ({ value: k, label: `${k} — ${ruleLabel(k, lang)}` }))} />
                                        </div>
                                    </div>
                                    <p className="ls3-side-note">
                                        {t('stats_signal_note', { defaultValue: "Signal — tashxis emas: shifokor dalillarni ko'rib tasdiqlaydi yoki rad etadi." })}
                                    </p>
                                </>
                            )}
                          </ConfigProvider>
                        </aside>

                        <main className="ls3-main">
                            {section === 'overview' && <StatsOverview params={params} reloadKey={reloadKey} lang={lang} periodText={periodText} />}
                            {section === 'indicators' && <StatsIndicators params={params} reloadKey={reloadKey} lang={lang} periodText={periodText} />}
                            {section === 'signals' && (
                                <StatsSignals
                                    filters={sig}
                                    setFilters={setSig}
                                    summary={sigSummary}
                                    reloadKey={reloadKey}
                                    lang={lang}
                                    onChanged={() => setSignalsKey((k) => k + 1)}
                                />
                            )}
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
}
