import React, { useEffect, useMemo, useState } from 'react';
import { Card, Descriptions, Result, Spin, Typography } from 'antd';
import { CheckCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getDocumentVerification } from '../host/requests/ReportRequest';
import { getConsultationVerification } from '../host/requests/ConsultationRequest';
import './ConsultationVerificationPage.css';

const { Text, Title } = Typography;

/**
 * QR kod orqali hujjat haqiqiyligini tekshirish sahifasi.
 *
 * Manzil formati: /verify/{token}
 * Token — hujjat turi va ID sidan HMAC orqali hosil qilingan, taxmin qilib
 * bo'lmaydigan qator (masalan `ecg96-hjbIL1XEBpPIunbDjnNh5A`).
 *
 * Ilgari manzil `/analysis/verify/ecg/96` ko'rinishida, ya'ni ketma-ket ID bilan
 * edi — hujjatni qo'lga kiritgan har kim ID ni oshirib borib boshqa bemorlarning
 * ma'lumotlarini ko'ra olardi.
 */
export default function ConsultationVerificationPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const token = useMemo(() => {
        const match = window.location.pathname.match(/\/verify\/([A-Za-z0-9_-]+)/);
        return match ? match[1] : null;
    }, []);

    // Token prefiksidan hujjat turini bilamiz: "consultation7-..." yoki "ecg96-..."
    const isConsultation = useMemo(
        () => Boolean(token && token.startsWith('consultation')),
        [token]
    );

    useEffect(() => {
        let mounted = true;

        if (!token) {
            setError('Tasdiqlash kodi ko’rsatilmagan');
            setLoading(false);
            return undefined;
        }

        setLoading(true);
        const request = isConsultation
            ? getConsultationVerification(token)
            : getDocumentVerification(token);

        request
            .then((res) => { if (mounted) setData(res.data); })
            .catch((err) => {
                if (mounted) {
                    setError(err?.response?.data?.message || 'Hujjat topilmadi');
                }
            })
            .finally(() => { if (mounted) setLoading(false); });

        return () => { mounted = false; };
    }, [token, isConsultation]);

    if (loading) {
        return (
            <div className="cons-verify-page">
                <Spin size="large" />
            </div>
        );
    }

    if (error || !data?.isValid) {
        return (
            <div className="cons-verify-page">
                <Result
                    status="error"
                    title="Hujjat tasdiqlanmadi"
                    subTitle={
                        error
                        || 'Bu tasdiqlash kodi yaroqsiz yoki hujjat NMED bazasidan topilmadi.'
                    }
                />
            </div>
        );
    }

    return (
        <div className="cons-verify-page">
            <Card className="cons-verify-card">
                <div className="cons-verify-brand">
                    <div className="cons-verify-logo"><SafetyCertificateOutlined /></div>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>NMED</Title>
                        <Text type="secondary">Milliy tibbiy diagnostika platformasi</Text>
                    </div>
                </div>

                <Result
                    status="success"
                    icon={<CheckCircleOutlined className="cons-verify-success-icon" />}
                    title="Hujjat tasdiqlandi"
                    subTitle={data.verificationText}
                />

                <Descriptions bordered column={1} size="middle">
                    <Descriptions.Item label="Hujjat raqami">
                        <Text strong>{data.documentNumber}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Hujjat turi">
                        {data.documentType || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Bemor">
                        {data.patientInitials || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Shifoxona">
                        {data.clinicName || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Sana">
                        {data.issuedAt ? dayjs(data.issuedAt).format('DD.MM.YYYY') : '-'}
                    </Descriptions.Item>
                </Descriptions>

                <Text type="secondary" className="cons-verify-note">
                    Maxfiylikni saqlash uchun bu sahifada bemorning to&apos;liq ism-sharifi va
                    tibbiy ma&apos;lumotlari ko&apos;rsatilmaydi. Hujjatning to&apos;liq mazmunini
                    faqat vakolatli xodim NMED tizimiga kirib ko&apos;ra oladi.
                </Text>
            </Card>
        </div>
    );
}
