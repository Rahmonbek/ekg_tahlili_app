import React from 'react';
import { Button } from 'antd';
import { IoArrowBack } from 'react-icons/io5';
import { FaHospital } from 'react-icons/fa';
import { analysisViewTour } from '../../tools/tourSteps';
import { usePageTour } from '../../components/shared/TourProvider';

export default function AnalyseViewHeader({
    t,
    onBack,
    downloadNode,
    clinic,
    onClinicClick,
    patientName,
    ageText,
    createdDoctorName,
    treatingDoctorsText,
    statusNode,
    diagnosisNode,
    analysisDateText,
    createdAtText,
    documentNumber,
}) {
    // Qo'llanma qadamlari ro'yxatdan o'tkaziladi; tugma header'da
    usePageTour(analysisViewTour);
    return (
        <div className="analysis-view-header">
            <div className="analysis-view-actions">
                <div className="analysis-view-actions-left">
                    <Button
                        onClick={onBack}
                        icon={<IoArrowBack />}
                        className="btn_form mini_btn_main analysis-view-back-btn"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        {t('back')}
                    </Button>
                </div>

                <div className="analysis-view-actions-right">
                    {downloadNode ? (
                        <div className="analysis-view-download-wrap" data-tour="view-download">{downloadNode}</div>
                    ) : null}
                    {clinic && (
                        <button
                            type="button"
                            onClick={onClinicClick}
                            className="analysis-view-clinic-btn"
                        >
                            <FaHospital />
                            <span>{clinic.clinicName}</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="analysis-view-meta-grid">
                <div className="analysis-view-meta-card">
                    <p className="analysis-view-meta-label">{t('patcient_info', { defaultValue: 'Bemor' })}</p>
                    <p className="analysis-view-meta-value" title={patientName || ''}>
                        {patientName || '—'}
                    </p>
                    <p className="analysis-view-meta-sub">{ageText || '—'}</p>
                </div>

                <div className="analysis-view-meta-card">
                    <p className="analysis-view-meta-label">{t('doctor', { defaultValue: 'Shifokor' })}</p>
                    <p className="analysis-view-meta-value" title={createdDoctorName || ''}>
                        {createdDoctorName || '—'}
                    </p>
                    <p className="analysis-view-meta-sub">
                        {t('treating_doctors', { defaultValue: 'Davolovchi shifokor(lar)' })}: {treatingDoctorsText || '—'}
                    </p>
                </div>

                <div className="analysis-view-meta-card">
                    <p className="analysis-view-meta-label">{t('status', { defaultValue: 'Holat' })}</p>
                    <div className="analysis-view-meta-row">
                        {statusNode}
                    </div>
                    {diagnosisNode ? (
                        <div className="analysis-view-meta-row">{diagnosisNode}</div>
                    ) : null}
                </div>

                {/* Hujjat raqami ilgari faqat PDF ichida bor edi — shifokor uni
                    bemorga aytishi uchun tahlilni yuklab olishga majbur edi */}
                <div className="analysis-view-meta-card">
                    <p className="analysis-view-meta-label">{t('document_number', { defaultValue: 'Hujjat raqami' })}</p>
                    <p className="analysis-view-meta-value" title={documentNumber || ''}>
                        {documentNumber || '—'}
                    </p>
                </div>

                {/* Tahlil sanasi kiritilmagan bo'lsa uni yuklash sanasi
                    bilan almashtirmaymiz: bemordan namuna qachon olingani
                    va fayl qachon yuklangani — turli narsalar */}
                <div className="analysis-view-meta-card">
                    {analysisDateText ? (
                        <>
                            <p className="analysis-view-meta-label">
                                {t('analysis_date', { defaultValue: 'Tahlil sanasi' })}
                            </p>
                            <p className="analysis-view-meta-value">{analysisDateText}</p>
                            {createdAtText && createdAtText !== analysisDateText ? (
                                <p className="analysis-view-meta-sub">
                                    {t('created_at', { defaultValue: 'Yuklangan' })}: {createdAtText}
                                </p>
                            ) : null}
                        </>
                    ) : (
                        <>
                            <p className="analysis-view-meta-label">
                                {t('created_at', { defaultValue: 'Yuklangan sana' })}
                            </p>
                            <p className="analysis-view-meta-value">{createdAtText || '—'}</p>
                            <p className="analysis-view-meta-sub analysis-view-meta-missing">
                                {t('analysis_date_missing', {
                                    defaultValue: 'Tahlil sanasi kiritilmagan',
                                })}
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
