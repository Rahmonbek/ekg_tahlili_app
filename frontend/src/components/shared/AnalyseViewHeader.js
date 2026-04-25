import React from 'react';
import { Button } from 'antd';
import { IoArrowBack } from 'react-icons/io5';
import { FaHospital } from 'react-icons/fa';

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
}) {
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
                        <div className="analysis-view-download-wrap">{downloadNode}</div>
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
                    <p className="analysis-view-meta-label">{t('patcient_info') || 'Bemor'}</p>
                    <p className="analysis-view-meta-value">{patientName || '—'}</p>
                    <p className="analysis-view-meta-sub">{ageText || '—'}</p>
                </div>

                <div className="analysis-view-meta-card">
                    <p className="analysis-view-meta-label">{t('doctor') || 'Shifokor'}</p>
                    <p className="analysis-view-meta-value">{createdDoctorName || '—'}</p>
                    <p className="analysis-view-meta-sub">
                        {t('select_doctor_of_patcient') || 'Davolovchi shifokorlar'}: {treatingDoctorsText || '—'}
                    </p>
                </div>

                <div className="analysis-view-meta-card">
                    <p className="analysis-view-meta-label">{t('status') || 'Holat'}</p>
                    <div className="analysis-view-meta-row">
                        {statusNode}
                    </div>
                    {diagnosisNode ? (
                        <div className="analysis-view-meta-row">{diagnosisNode}</div>
                    ) : (
                        <p className="analysis-view-meta-sub">—</p>
                    )}
                </div>

                <div className="analysis-view-meta-card">
                    <p className="analysis-view-meta-label">{t('analysis_date') || 'Sana'}</p>
                    <p className="analysis-view-meta-value">{analysisDateText || '—'}</p>
                    <p className="analysis-view-meta-sub">
                        {t('created_at') || 'Yaratilgan'}: {createdAtText || '—'}
                    </p>
                </div>
            </div>
        </div>
    );
}
