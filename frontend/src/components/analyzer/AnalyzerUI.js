/**
 * Tahlil yuklash sahifalarining umumiy ko'rinish qismlari.
 *
 * EKG, Holter, SMAD, Laboratoriya va Kompleks AI sahifalari bir xil
 * tuzilishda: raqamlangan qadamlar (Bemor → … → Sozlamalar) va
 * "Yuborishga tayyorlik" paneli. Har bir sahifa faqat o'ziga xos
 * maydonlarni (shikoyatlar, kategoriyalar, hisobot muallifi, …) qo'shadi.
 *
 * Uslublar: `Analyzer.css` (`anz-*` klasslari).
 */
import React from 'react';
import { Alert, Button, Select, Upload } from 'antd';
import {
    CheckCircleFilled, DownOutlined, EditOutlined, InboxOutlined,
    LockOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import PatientSearchSection from '../shared/PatientSearchSection';
import PatientInfoForm from '../shared/PatientInfoForm';
import DateField from '../shared/DateField';
import { calculateAge } from '../../tools/formatters';

import './Analyzer.css';

/** Sahifa sarlavhasi. */
export function AnalyzerHeader({ title, subtitle }) {
    return (
        <div className="anz-header">
            <h1 className="anz-title">{title}</h1>
            {subtitle && <p className="anz-subtitle">{subtitle}</p>}
        </div>
    );
}

/** Ikki ustunli joylashuv: qadamlar + tayyorlik paneli. */
export function AnalyzerLayout({ children, aside }) {
    return (
        <div className="anz-layout">
            <div className="anz-main">{children}</div>
            <aside className="anz-summary">{aside}</aside>
        </div>
    );
}

/** Klinikada shifokor yo'q bo'lsa — xodimlar sahifasiga yo'naltiradi. */
export function NoDoctorsAlert() {
    const { t } = useTranslation();
    return (
        <Alert
            type="warning"
            showIcon
            message={t('no_doctors_alert_title')}
            description={t('no_doctors_alert_desc')}
            action={<Link to="/doctor" className="ant-btn ant-btn-default ant-btn-sm">{t('go_to_staff')}</Link>}
            style={{ marginBottom: 16 }}
        />
    );
}

/** Raqamlangan qadam kartochkasi. `locked` bo'lsa ichi ko'rsatilmaydi. */
export function AnalyzerStep({ number, title, hint, done, locked, lockedText, action, children, tour }) {
    const status = done ? 'done' : (locked ? 'locked' : 'active');
    return (
        <section className={`anz-step anz-step--${status}`} data-tour={tour}>
            <header className="anz-step-head">
                <span className="anz-step-num" aria-hidden="true">
                    {done ? <CheckCircleFilled /> : (locked ? <LockOutlined /> : number)}
                </span>
                <div className="anz-step-titles">
                    <h2 className="anz-step-title">{title}</h2>
                    {hint && !locked && <p className="anz-step-hint">{hint}</p>}
                    {locked && lockedText && <p className="anz-step-hint">{lockedText}</p>}
                </div>
                {action && !locked && <div className="anz-step-action">{action}</div>}
            </header>
            {!locked && <div className="anz-step-body">{children}</div>}
        </section>
    );
}

/** Bosiladigan tanlov "chip"i (checkbox/radio o'rniga). */
export function Chip({ selected, onClick, disabled, children }) {
    return (
        <button
            type="button"
            className={`anz-chip ${selected ? 'is-selected' : ''}`}
            aria-pressed={selected}
            disabled={disabled}
            onClick={onClick}
        >
            {selected && <CheckCircleFilled className="anz-chip-check" />}
            {children}
        </button>
    );
}

/** Maydon sarlavhasi + ichidagi qism. */
export function Field({ label, required, optional, note, children, tour }) {
    const { t } = useTranslation();
    return (
        <div className="anz-field" data-tour={tour}>
            {label && (
                <div className="anz-label">
                    {label}
                    {required && <span className="anz-required">*</span>}
                    {optional && <span className="anz-optional">{t('analyzer_optional', { defaultValue: 'ixtiyoriy' })}</span>}
                </div>
            )}
            {children}
            {note && <p className="anz-note">{note}</p>}
        </div>
    );
}

/**
 * 1-qadam: bemor. Qidiruv → topilsa ixcham kartochka, topilmasa yangi
 * bemor formasi. Bemor formasi DOIM DOM da turadi: qidiruv natijasi
 * `form.setFieldsValue` bilan yoziladi va ulangan Form talab qilinadi.
 */
export function PatientStep({ patient, onSearchChange, onStartOver, number = 1 }) {
    const { t } = useTranslation();
    const {
        patcient, checkReady, isNewPatient, editPatient, setEditPatient,
        form, form1, loading, loadingSave, searchPatcient, savePatcient,
        phoneValue, setPhoneValue, gender, setGender, regions, districts, fetchDistricts,
    } = patient;

    const name = checkReady && patcient
        ? [patcient.lastName, patcient.firstName, patcient.sureName].filter(Boolean).join(' ')
        : '';
    const age = checkReady && patcient?.birthDate ? calculateAge(patcient.birthDate) : null;

    return (
        <AnalyzerStep
            number={number}
            title={t('analyzer_step_patient', { defaultValue: 'Bemor' })}
            hint={checkReady ? null : t('analyzer_step_patient_hint', { defaultValue: 'Passport seriyasi va tug\'ilgan sana bo\'yicha qidiring' })}
            done={checkReady && !editPatient}
            action={checkReady && !editPatient && (
                <>
                    <Button type="link" icon={<EditOutlined />} onClick={() => setEditPatient(true)}>
                        {t('edit', { defaultValue: 'O\'zgartirish' })}
                    </Button>
                    <Button type="link" icon={<ReloadOutlined />} onClick={onStartOver}>
                        {t('analyzer_other_patient', { defaultValue: 'Boshqa bemor' })}
                    </Button>
                </>
            )}
        >
            {/* Bemor topilgach qidiruv yashiriladi (DOM da qoladi) */}
            <div className={checkReady ? 'anz-hidden' : undefined}>
                <PatientSearchSection
                    form={form1}
                    onFinish={searchPatcient}
                    onReset={onSearchChange}
                    loading={loading}
                />
            </div>

            {checkReady && !editPatient && (
                <div className="anz-patient-card">
                    <div className="anz-patient-avatar" aria-hidden="true">
                        {(patcient?.lastName || '?').charAt(0)}
                    </div>
                    <div className="anz-patient-info">
                        <div className="anz-patient-name">{name}</div>
                        <div className="anz-patient-meta">
                            <span>{patcient?.gender ? t('male') : t('female')}</span>
                            {age != null && <span>{age} {t('age', { defaultValue: 'yosh' })}</span>}
                            {patcient?.phone && <span>{patcient.phone}</span>}
                        </div>
                    </div>
                </div>
            )}

            {isNewPatient && (
                <Alert
                    type="info"
                    showIcon
                    className="anz-new-patient-alert"
                    message={t('analyzer_new_patient', { defaultValue: 'Bemor topilmadi — yangi bemor ma\'lumotlarini kiriting va saqlang' })}
                    description={t('alert_patcient')}
                />
            )}

            <div className={isNewPatient || editPatient ? 'anz-patient-form' : 'anz-hidden'}>
                <PatientInfoForm
                    form={form}
                    patcient={patcient}
                    onFinish={savePatcient}
                    loading={loadingSave}
                    phoneValue={phoneValue}
                    setPhoneValue={setPhoneValue}
                    gender={gender}
                    setGender={setGender}
                    regions={regions}
                    districts={districts}
                    fetchDistricts={fetchDistricts}
                />
                {editPatient && (
                    <Button type="link" onClick={() => setEditPatient(false)}>
                        {t('cancel', { defaultValue: 'Bekor qilish' })}
                    </Button>
                )}
            </div>
        </AnalyzerStep>
    );
}

/**
 * Fayl tanlash maydoni. `maxFiles > 1` bo'lsa bir nechta fayl tanlanadi
 * va har biri ro'yxatdan alohida olib tashlanadi.
 */
export function FileDropzone({ fileTypes, files, onSelect, onRemove, text, hint, maxFiles = 1 }) {
    const { t } = useTranslation();
    const multiple = maxFiles > 1;
    return (
        <Upload.Dragger
            className="anz-dragger"
            accept={fileTypes.accept}
            beforeUpload={onSelect}
            onRemove={(item) => onRemove(item.originFileObj)}
            multiple={multiple}
            maxCount={multiple ? undefined : 1}
            fileList={files.map((f) => ({
                // Barqaror `uid`: indeks bo'yicha bo'lsa, o'rtadagi fayl
                // o'chirilganda keyingilari "boshqa fayl" bo'lib qolardi
                uid: `${f.name}|${f.size}|${f.lastModified}`,
                name: f.name,
                status: 'done',
                originFileObj: f,
            }))}
        >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">
                {text || t('click_or_drag_file', { defaultValue: 'Fayl tanlang yoki bu yerga tashlang' })}
            </p>
            {hint && <p className="ant-upload-hint">{hint}</p>}
        </Upload.Dragger>
    );
}

/** AI tahlil tili + tahlil sanasi (bir qatorda). */
export function LangDateFields({ lang, onLangChange, dateValue, onDateChange }) {
    const { t } = useTranslation();
    return (
        <div className="anz-row">
            <Field label={t('lang_analyse')}>
                <Select
                    style={{ width: '100%' }}
                    value={lang}
                    onChange={onLangChange}
                    options={[
                        { value: 'uz', label: t('uzbek') },
                        { value: 'ru', label: t('russian') },
                        { value: 'en', label: t('english') },
                    ]}
                />
            </Field>
            <Field label={t('analysis_date')}>
                {/* Tug'ma `<input type="date">` brauzer tiliga bo'ysunardi
                    (o'zbek interfeysda ruscha `дд.мм.гггг`) */}
                <DateField value={dateValue} onChange={onDateChange} />
            </Field>
        </div>
    );
}

/** Shifokorlar ro'yxati — chip'lar. `single` bo'lsa bittasi tanlanadi. */
export function DoctorChips({ label, doctors, isSelected, onToggle, note, tour }) {
    if (!doctors?.length) return null;
    return (
        <Field label={label} required note={note} tour={tour}>
            <div className="anz-chips">
                {doctors.map((item) => (
                    <Chip key={item.id} selected={isSelected(item)} onClick={() => onToggle(item)}>
                        {item.lastName} {item.firstName}
                    </Chip>
                ))}
            </div>
        </Field>
    );
}

/** Ochib-yopiladigan ixtiyoriy bo'lim (shikoyatlar, kategoriyalar). */
export function CollapsibleField({ id, title, count, open, onToggle, children, tour }) {
    const { t } = useTranslation();
    return (
        <div className="anz-field anz-collapsible" data-tour={tour}>
            <button
                type="button"
                className="anz-collapse-head"
                aria-expanded={open}
                aria-controls={id}
                onClick={onToggle}
            >
                <span className="anz-label anz-label--inline">
                    {title}
                    <span className="anz-optional">{t('analyzer_optional', { defaultValue: 'ixtiyoriy' })}</span>
                    {count > 0 && <span className="anz-count">{count}</span>}
                </span>
                <DownOutlined className={`anz-chevron ${open ? 'is-open' : ''}`} />
            </button>
            {open && <div id={id} className="anz-collapse-body">{children}</div>}
        </div>
    );
}

/** Ikki variantli tanlov kartochkalari (EKG: AI bilan / faqat saqlash). */
export function ModeSwitch({ value, onChange, options }) {
    return (
        <div className="anz-segment" role="radiogroup">
            {options.map((opt) => (
                <button
                    key={String(opt.value)}
                    type="button"
                    role="radio"
                    aria-checked={value === opt.value}
                    className={`anz-segment-item ${value === opt.value ? 'is-active' : ''}`}
                    onClick={() => onChange(opt.value)}
                >
                    {opt.icon}
                    <span>
                        <strong>{opt.title}</strong>
                        {opt.desc && <small>{opt.desc}</small>}
                    </span>
                </button>
            ))}
        </div>
    );
}

/**
 * "Yuborishga tayyorlik" paneli. `items` — tekshiruv ro'yxati:
 * `{ key, label, value, ok, hint }`. Birinchi bajarilmagan bandning
 * `hint` i tugma ostida "nima yetishmayapti" deb ko'rsatiladi.
 */
export function ReadinessPanel({ items, mode, submitLabel, submitIcon, onSubmit, loading, blocked, note }) {
    const { t } = useTranslation();
    const missing = items.find((item) => !item.ok);
    const ready = !missing && !blocked;
    return (
        <div className="anz-summary-card">
            <h3 className="anz-summary-title">{t('analyzer_summary', { defaultValue: 'Yuborishga tayyorlik' })}</h3>
            <ul className="anz-checklist">
                {items.map((item) => (
                    <li key={item.key} className={item.ok ? 'is-ok' : ''}>
                        <CheckCircleFilled className="anz-check-icon" />
                        <span className="anz-check-text">
                            <span className="anz-check-label">{item.label}</span>
                            {item.value && <span className="anz-check-value">{item.value}</span>}
                        </span>
                    </li>
                ))}
            </ul>

            {mode && <div className="anz-summary-mode">{mode}</div>}

            <Button
                type="primary"
                size="large"
                block
                data-tour="analyzer-submit"
                disabled={!ready}
                loading={loading}
                onClick={onSubmit}
                icon={submitIcon}
            >
                {submitLabel}
            </Button>
            {missing?.hint && <p className="anz-missing">{missing.hint}</p>}
            {ready && note && <p className="anz-note">{note}</p>}
        </div>
    );
}

/** Bemorning oldingi tahlillari. */
export function HistorySection({ title, items, renderItem, hasMore, loading, onMore }) {
    const { t } = useTranslation();
    if (!items.length) return null;
    return (
        <div className="anz-history">
            <h2 className="anz-history-title">{title}</h2>
            {items.map(renderItem)}
            {hasMore && (
                <Button onClick={onMore} loading={loading} className="anz-more">
                    {t('get_other_results')}
                </Button>
            )}
        </div>
    );
}
