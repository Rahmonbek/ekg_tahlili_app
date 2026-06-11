import React, { useEffect, useMemo, useState } from 'react';
import { Card, Descriptions, Result, Spin, Tag, Typography } from 'antd';
import { CheckCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getConsultationVerification } from '../host/requests/ConsultationRequest';
import './ConsultationVerificationPage.css';

const { Text, Title } = Typography;

const conditionLabels = {
    good: 'Yaxshi',
    moderate: "O'rtacha",
    bad: 'Yomon',
};

export default function ConsultationVerificationPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const consultationId = useMemo(() => {
        const match = window.location.pathname.match(/\/consultation\/verify\/(\d+)/);
        return match ? Number(match[1]) : 0;
    }, []);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        getConsultationVerification(consultationId)
            .then((res) => {
                if (mounted) setData(res.data);
            })
            .catch((err) => {
                if (mounted) setError(err?.response?.data?.message || 'Hujjat topilmadi');
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => { mounted = false; };
    }, [consultationId]);

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
                    status="404"
                    title="Hujjat tasdiqlanmadi"
                    subTitle={error || "Konsultatsiya xulosasi NMED bazasidan topilmadi."}
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
                        <Title level={3}>NMED hujjat tasdiqlash</Title>
                        <Text type="secondary">Milliy tibbiy diagnostika platformasi</Text>
                    </div>
                </div>

                <Result
                    icon={<CheckCircleOutlined className="cons-verify-success-icon" />}
                    title="Hujjat tasdiqlandi"
                    subTitle={data.verificationText}
                />

                <Descriptions bordered column={1} size="middle">
                    <Descriptions.Item label="Hujjat raqami">
                        <Text strong>{data.documentNumber}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Bemor">{data.patientFullName}</Descriptions.Item>
                    <Descriptions.Item label="Konsultant shifokor">{data.doctorFullName}</Descriptions.Item>
                    <Descriptions.Item label="Klinika">{data.clinicName}</Descriptions.Item>
                    <Descriptions.Item label="Konsultatsiya sanasi">
                        {data.consultationDate ? dayjs(data.consultationDate).format('DD.MM.YYYY') : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Xulosa sanasi">
                        {data.conclusionCreatedAt ? dayjs(data.conclusionCreatedAt).format('DD.MM.YYYY HH:mm') : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Bemor holati">
                        <Tag color="green">{conditionLabels[data.patientCondition] || data.patientCondition}</Tag>
                    </Descriptions.Item>
                </Descriptions>
            </Card>
        </div>
    );
}
