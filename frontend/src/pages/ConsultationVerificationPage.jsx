import React, { useEffect, useMemo, useState } from 'react';
import { Card, Descriptions, Result, Spin, Tag, Typography } from 'antd';
import { CheckCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getConsultationVerification } from '../host/requests/ConsultationRequest';
import { getAnalysisVerification } from '../host/requests/ReportRequest';
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

    const route = useMemo(() => {
        const consultationMatch = window.location.pathname.match(/\/consultation\/verify\/(\d+)/);
        if (consultationMatch) {
            return { kind: 'consultation', id: Number(consultationMatch[1]) };
        }
        const analysisMatch = window.location.pathname.match(/\/analysis\/verify\/([^/]+)\/(\d+)/);
        if (analysisMatch) {
            return { kind: 'analysis', type: analysisMatch[1], id: Number(analysisMatch[2]) };
        }
        return { kind: 'unknown', id: 0 };
    }, []);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        const request = route.kind === 'analysis'
            ? getAnalysisVerification(route.type, route.id)
            : getConsultationVerification(route.id);
        request
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
    }, [route]);

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
                    {'analysisTypeName' in data && (
                        <Descriptions.Item label="Tahlil turi">{data.analysisTypeName}</Descriptions.Item>
                    )}
                    <Descriptions.Item label="Bemor">{data.patientFullName}</Descriptions.Item>
                    <Descriptions.Item label={route.kind === 'analysis' ? 'Tahlil kiritgan shifokor' : 'Konsultant shifokor'}>{data.doctorFullName}</Descriptions.Item>
                    <Descriptions.Item label="Klinika">{data.clinicName}</Descriptions.Item>
                    <Descriptions.Item label={route.kind === 'analysis' ? 'Tahlil sanasi' : 'Konsultatsiya sanasi'}>
                        {data.analysisDate
                            ? dayjs(data.analysisDate).format('DD.MM.YYYY HH:mm')
                            : data.consultationDate ? dayjs(data.consultationDate).format('DD.MM.YYYY') : '-'}
                    </Descriptions.Item>
                    {route.kind === 'consultation' && (
                        <>
                            <Descriptions.Item label="Xulosa sanasi">
                                {data.conclusionCreatedAt ? dayjs(data.conclusionCreatedAt).format('DD.MM.YYYY HH:mm') : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Bemor holati">
                                <Tag color="green">{conditionLabels[data.patientCondition] || data.patientCondition}</Tag>
                            </Descriptions.Item>
                        </>
                    )}
                    {route.kind === 'analysis' && (
                        <Descriptions.Item label="Holati">
                            <Tag color="green">{String(data.status ?? '-')}</Tag>
                        </Descriptions.Item>
                    )}
                </Descriptions>
            </Card>
        </div>
    );
}
