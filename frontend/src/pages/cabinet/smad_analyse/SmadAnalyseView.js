import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Spin, Modal, Space, Image, Typography, Tag } from 'antd';
import SmadOldResult from '../../../components/results/smad_analyse/SmadOldResult';
import { get_smad_analyse_by_id } from '../../../host/requests/SmadAnalyseRequest';
import { formatDate, calculateAge } from '../../../tools/formatters';
import { useStore } from '../../../store/Store';
import DownloadReportButton from '../../../components/DownloadReportButton';
import DoctorDiagnosisBlock from '../../../components/results/DoctorDiagnosisBlock';
import AnalyseViewHeader from '../../../components/shared/AnalyseViewHeader';

const { Title, Text } = Typography;

export default function SmadAnalyseView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { setloader } = useStore();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [clinicModalVisible, setClinicModalVisible] = useState(false);

    const getData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setloader(true);
        try {
            const res = await get_smad_analyse_by_id(id);
            setData(res.data);
        } catch (err) {
            navigate('/smad-analyses');
        } finally {
            setLoading(false);
            setloader(false);
        }
    }, [id, navigate, setloader]);

    useEffect(() => {
        getData();
    }, [getData]);

    if (loading || !data) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    const clinic = data.clinic;
    const patientName = [data.patcient?.lastName, data.patcient?.firstName, data.patcient?.sureName].filter(Boolean).join(' ');
    const createdDoctorName = data.createdDoctor
        ? `${data.createdDoctor.lastName ?? ''} ${data.createdDoctor.firstName ?? ''}`.trim()
        : '';
    const treatingDoctorsText = Array.isArray(data.doctors)
        ? data.doctors
            .map((item) => {
                const doctor = item?.doctor ?? item;
                return `${doctor?.lastName ?? ''} ${doctor?.firstName ?? ''}`.trim();
            })
            .filter(Boolean)
            .join(', ')
        : '';

    const statusTag = (
        <Tag color={{ 0: 'default', 1: 'processing', 2: 'success', '-1': 'error' }[data.status]}>
            {{ 0: t('status_pending'), 1: t('status_processing'), 2: t('status_done'), '-1': t('status_error') }[data.status] ?? data.status}
        </Tag>
    );

    const diagnosisTag = typeof data.hasDiagnosis === 'boolean' ? (
        <Tag color={data.hasDiagnosis ? 'success' : 'default'}>
            {(t('diagnosis_status') || 'Tashxis')}: {data.hasDiagnosis ? (t('has_diagnosis') || 'Bor') : (t('no_diagnosis') || 'Yo‘q')}
        </Tag>
    ) : null;

    return (
        <div>
            <AnalyseViewHeader
                t={t}
                onBack={() => navigate('/smad-analyses')}
                downloadNode={data.status === 2 ? <DownloadReportButton type="smad" id={data.id} size="middle" className="analysis-view-download-btn" /> : null}
                clinic={clinic}
                onClinicClick={() => setClinicModalVisible(true)}
                patientName={patientName}
                ageText={data.patcient?.birthDate ? `${calculateAge(data.patcient.birthDate)} ${t('age') || 'yosh'}` : ''}
                createdDoctorName={createdDoctorName}
                treatingDoctorsText={treatingDoctorsText}
                statusNode={statusTag}
                diagnosisNode={diagnosisTag}
                analysisDateText={formatDate(data.analysisDate || data.createdAt)}
                createdAtText={formatDate(data.createdAt)}
            />

            <SmadOldResult data={data} initialOpen={true} />

            <DoctorDiagnosisBlock analysisType="smad" analysisId={data.id} />

            <Modal
                title={t('clinic_info') || 'Shifoxona ma\'lumotlari'}
                open={clinicModalVisible}
                onCancel={() => setClinicModalVisible(false)}
                footer={null}
                centered
            >
                {clinic && (
                    <div style={{ textAlign: 'center' }}>
                        {clinic.clinicLogo && (
                            <div style={{ marginBottom: 16 }}>
                                <Image
                                    src={clinic.clinicLogo}
                                    alt="Logo"
                                    width={120}
                                    style={{ borderRadius: '8px', objectFit: 'contain' }}
                                />
                            </div>
                        )}
                        <Title level={4}>{clinic.clinicName}</Title>

                        <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
                            {clinic.address && (
                                <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                                    <Text type="secondary">{t('address') || 'Manzil'}:</Text>
                                    <div style={{ fontWeight: 500 }}>{clinic.district ? `${clinic.district.nameUz || clinic.district}, ` : ''}{clinic.address}</div>
                                </div>
                            )}
                            {clinic.phoneNumbers && clinic.phoneNumbers.length > 0 && (
                                <div style={{ paddingTop: 8 }}>
                                    <Text type="secondary">{t('phones') || 'Telefon raqamlar'}:</Text>
                                    {clinic.phoneNumbers.map((p, index) => (
                                        <div key={index} style={{ fontWeight: 500, fontSize: '16px', color: '#00D1B2' }}>{p}</div>
                                    ))}
                                </div>
                            )}
                        </Space>
                    </div>
                )}
            </Modal>
        </div>
    );
}
