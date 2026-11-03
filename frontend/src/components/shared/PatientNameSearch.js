import React from 'react';
import { Button, Form, Input } from 'antd';
import { PlusOutlined, RightOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { calculateAge, formatDate, formatPhoneNumberForForm, genderLabel } from '../../tools/formatters';
import { latinNameRule, normalizeLatinName } from '../../tools/latinInput';
import './PatientNameSearch.css';

/**
 * Bemor qidiruvi — bitta maydon: ism, familiya, otasining ismi yoki
 * ularning istalgan birikmasi. Natijalar ro'yxatidan bemor tanlanadi
 * yoki "Yangi bemor qo'shish" bosiladi.
 *
 * Holat `usePatientNameSearch` da; bu komponent faqat ko'rinish.
 *
 * Props:
 *   form        — qidiruv formasi (Ant Design)
 *   search      — `usePatientNameSearch()` natijasi
 */
export default function PatientNameSearch({ form, search }) {
    const { t } = useTranslation();
    const {
        results, searched, loading, limitReached, isCreating,
        searchPatcient, selectPatient, startCreate,
    } = search;

    return (
        <div className="pns">
            <Form
                form={form}
                data-tour="analyzer-patient"
                name="patientNameSearch"
                layout="vertical"
                onFinish={searchPatcient}
                requiredMark={false}
            >
                <div className="pns-bar">
                    <Form.Item
                        name="query"
                        className="pns-input"
                        label={t('patient_search_label', { defaultValue: 'Ism, familiya yoki otasining ismi' })}
                        normalize={normalizeLatinName}
                        rules={[
                            {
                                validator: (_, value) => ((value || '').replace(/\s/g, '').length >= 2
                                    ? Promise.resolve()
                                    : Promise.reject(new Error(t('patient_search_min', { defaultValue: 'Kamida 2 ta harf kiriting' })))),
                            },
                            latinNameRule(t),
                        ]}
                    >
                        <Input
                            prefix={<SearchOutlined />}
                            className="login_input"
                            placeholder={t('patient_search_placeholder', { defaultValue: 'Masalan: ISMOILOV RAHMON' })}
                            maxLength={100}
                            allowClear
                            autoComplete="off"
                        />
                    </Form.Item>
                    {/* Bo'sh yorliqli Form.Item — tugma maydon bilan aynan bir
                        chiziqda turadi (yorliq balandligi qo'lda berilmaydi) */}
                    <Form.Item label=" " colon={false} className="pns-btn-item">
                        <Button type="primary" htmlType="submit" loading={loading} icon={<SearchOutlined />} className="pns-btn">
                            {t('search_patcient', { defaultValue: 'Qidirish' })}
                        </Button>
                    </Form.Item>
                </div>
            </Form>

            {searched && !isCreating && (
                <div className="pns-results">
                    <div className="pns-results-head">
                        <span className="pns-results-title">
                            {t('patient_search_results', { defaultValue: 'Topilgan bemorlar' })}
                            <span className="pns-count">{results.length}</span>
                        </span>
                        <Button icon={<PlusOutlined />} onClick={startCreate}>
                            {t('patient_add_new', { defaultValue: 'Yangi bemor qo\'shish' })}
                        </Button>
                    </div>

                    {results.length === 0 ? (
                        <p className="pns-empty">
                            {t('patient_search_empty', { defaultValue: 'Bunday bemor topilmadi. Yangi bemor qo\'shishingiz mumkin.' })}
                        </p>
                    ) : (
                        <ul className="pns-list">
                            {results.map((row) => {
                                const age = row.birthDate ? calculateAge(row.birthDate) : null;
                                const gender = genderLabel(row.gender, t);
                                const facts = [
                                    row.birthDate && `${formatDate(row.birthDate)}${age != null ? ` (${age} ${t('age', { defaultValue: 'yosh' })})` : ''}`,
                                    gender,
                                    row.passportMasked && row.passportMasked !== '—' && row.passportMasked,
                                    row.phone && formatPhoneNumberForForm(row.phone),
                                ].filter(Boolean);
                                const place = [row.regionName, row.districtName].filter(Boolean).join(', ');
                                return (
                                    <li key={row.id}>
                                        <button type="button" className="pns-row" onClick={() => selectPatient(row)}>
                                            <span className="pns-avatar" aria-hidden="true">
                                                {row.lastName ? row.lastName.charAt(0) : <UserOutlined />}
                                            </span>
                                            <span className="pns-text">
                                                <span className="pns-name">
                                                    {[row.lastName, row.firstName, row.sureName].filter(Boolean).join(' ')}
                                                </span>
                                                {facts.length > 0 && <span className="pns-meta">{facts.join(' · ')}</span>}
                                                {(place || row.analysesCount > 0) && (
                                                    <span className="pns-meta">
                                                        {[place, row.analysesCount > 0 && t('patient_analyses_count', {
                                                            count: row.analysesCount,
                                                            defaultValue: `${row.analysesCount} ta tahlil`,
                                                        })].filter(Boolean).join(' · ')}
                                                    </span>
                                                )}
                                            </span>
                                            <span className="pns-pick">
                                                {t('select', { defaultValue: 'Tanlash' })}
                                                <RightOutlined />
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {limitReached && (
                        <p className="pns-note">
                            {t('patient_search_limit', {
                                count: results.length,
                                defaultValue: `Faqat birinchi ${results.length} ta natija ko'rsatildi — qidiruvni aniqlashtiring`,
                            })}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
