import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Wait, it should be react-router-dom
import { useTranslation } from 'react-i18next';
import { Button, Spin, Modal, Space, Image, Typography, Tag } from 'antd';
import { IoArrowBack } from 'react-icons/io5';
import { FaHospital } from 'react-icons/fa';
import LabOldResult from '../../../components/results/lab_analyse/LabOldResult';
import { get_lab_analyse_by_id } from '../../../host/requests/LabAnalyseRequest';
import { useStore } from '../../../store/Store';
import DownloadReportButton from '../../../components/DownloadReportButton';
import DoctorDiagnosisBlock from '../../../components/results/DoctorDiagnosisBlock';
import { formatDate, calculateAge } from '../../../tools/formatters';

const { Title, Text } = Typography;

export default function LabAnalyseView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { setloader } = useStore();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [clinicModalVisible, setClinicModalVisible] = useState(false);

    useEffect(() => {
        if (id) {
            getData();
        }
    }, [id]);

    const getData = async () => {
        setLoading(true);
        setloader(true);
        try {
            const res = await get_lab_analyse_by_id(id);
            setData(res.data);
        } catch (err) {
            navigate('/lab-analyses');
        } finally {
            setLoading(false);
            setloader(false);
        }
    };

    if (loading || !data) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    const clinic = data.clinic;

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Button
                    onClick={() => navigate('/lab-analyses')}
                    icon={<IoArrowBack />}
                    className="btn_form mini_btn_main"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                    {t('back')}
                </Button>

                {data.status === 2 && (
                    <DownloadReportButton type="lab" id={data.id} size="middle" />
                )}

                {clinic && (
                    <div
                        onClick={() => setClinicModalVisible(true)}
                        style={{
                            cursor: 'pointer',
                            color: '#1890ff',
                            fontWeight: 600,
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '4px 12px',
                            borderRadius: '6px',
                            background: '#e6f7ff',
                            border: '1px solid #91d5ff'
                        }}
                    >
                        <FaHospital /> {clinic.clinicName}
                    </div>
                )}
            </div>

            {/* Bemor va tahlil meta-ma'lumotlari */}
            <div style={{ marginBottom: 12, padding: '8px 14px', background: '#fafafa', borderRadius: 8, border: '1px solid #f0f0f0', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                <Text strong style={{ fontSize: 14 }}>
                    {[data.patcient?.lastName, data.patcient?.firstName, data.patcient?.sureName].filter(Boolean).join(' ') || '—'}
                </Text>
                {data.patcient?.birthDate && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        {calculateAge(data.patcient.birthDate)} {t('age') || 'yosh'}
                    </Text>
                )}
                <Tag color={{ 0: 'default', 1: 'processing', 2: 'success', '-1': 'error' }[data.status]}>
                    {{ 0: t('status_pending'), 1: t('status_processing'), 2: t('status_done'), '-1': t('status_error') }[data.status] ?? data.status}
                </Tag>
                {data.createdDoctor && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        {t('doctor') || 'Shifokor'}: <strong>{`${data.createdDoctor.lastName ?? ''} ${data.createdDoctor.firstName ?? ''}`.trim()}</strong>
                    </Text>
                )}
                <Text type="secondary" style={{ fontSize: 13 }}>
                    {t('analysis_date') || 'Sana'}: {formatDate(data.analysisDate || data.createdAt)}
                </Text>
            </div>

            <LabOldResult data={data} initialOpen={true} />

            <DoctorDiagnosisBlock analysisType="lab" analysisId={data.id} />

            {/* Clinic Info Modal */}
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
