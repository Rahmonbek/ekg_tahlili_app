import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Table, Tag, message, Typography, Space } from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getConsultantHistory } from '../../../host/requests/ConsultationRequest';
import './Consultation.css';

const { Title, Text } = Typography;

const STATUS_COLORS = {
    created: 'gold',
    reviewing: 'blue',
    completed: 'green',
    rejected: 'red',
};

export default function ConsultantHistoryPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadHistory();
    }, [id]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const res = await getConsultantHistory(id);
            setData(res.data);
        } catch {
            message.error(t('error'));
        } finally {
            setLoading(false);
        }
    };

    const statusLabel = (status) => {
        const map = {
            created: t('cons_status_created'),
            reviewing: t('cons_status_reviewing'),
            completed: t('cons_status_completed'),
            rejected: t('cons_status_rejected'),
        };
        return map[status] || status;
    };

    const columns = [
        {
            title: t('patient_fullname'),
            dataIndex: 'patientFullName',
            key: 'patientFullName',
        },
        {
            title: t('consultation_date'),
            dataIndex: 'consultationDate',
            key: 'consultationDate',
            render: (v) => v ? dayjs(v).format('DD.MM.YYYY') : '—',
        },
        {
            title: t('price_at_creation'),
            dataIndex: 'priceAtCreation',
            key: 'priceAtCreation',
            render: (v) => v != null ? `${Number(v).toLocaleString()} UZS` : '—',
        },
        {
            title: t('ecg_status'),
            dataIndex: 'status',
            key: 'status',
            render: (v) => (
                <Tag color={STATUS_COLORS[v] || 'default'}>{statusLabel(v)}</Tag>
            ),
        },
        {
            title: t('diagnosis'),
            dataIndex: 'hasConclusion',
            key: 'hasConclusion',
            render: (v) => v
                ? <Tag icon={<CheckCircleOutlined />} color="green">{t('has_conclusion')}</Tag>
                : <Tag icon={<CloseCircleOutlined />} color="default">{t('no_conclusion')}</Tag>,
        },
    ];

    return (
        <div className="consultation-page">
            <div className="consultation-shell">
                <div className="consultation-header">
                    <div>
                        <Button
                            type="text"
                            icon={<ArrowLeftOutlined />}
                            onClick={() => navigate('/consultants')}
                            style={{ marginBottom: 4, padding: 0 }}
                        >
                            {t('back')}
                        </Button>
                        <Title level={4} className="consultation-title">{t('consultation_history')}</Title>
                    </div>
                    {data && (
                        <Space direction="vertical" align="end" size={2}>
                            <Text type="secondary">{t('total_amount')}:</Text>
                            <Text strong style={{ fontSize: 18 }}>
                                {Number(data.totalAmount || 0).toLocaleString()} UZS
                            </Text>
                        </Space>
                    )}
                </div>
                <div className="consultation-body">
                    <Table
                        rowKey="id"
                        dataSource={data?.consultations || []}
                        columns={columns}
                        loading={loading}
                        pagination={{ pageSize: 20 }}
                        scroll={{ x: 700 }}
                    />
                </div>
            </div>
        </div>
    );
}
