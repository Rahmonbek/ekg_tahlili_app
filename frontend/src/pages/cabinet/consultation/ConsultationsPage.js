import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    Button, Table, Tag, Select, message, Typography
} from 'antd';
import { PlusOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getConsultationList } from '../../../host/requests/ConsultationRequest';
import './Consultation.css';

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_COLORS = {
    created: 'gold',
    reviewing: 'blue',
    completed: 'green',
    rejected: 'red',
};

export default function ConsultationsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [consultations, setConsultations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        loadConsultations();
    }, []);

    const loadConsultations = async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            const res = await getConsultationList(params);
            setConsultations(res.data || []);
        } catch {
            message.error(t('error'));
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            const res = await getConsultationList(params);
            setConsultations(res.data || []);
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
            title: t('doctor'),
            dataIndex: 'doctorFullName',
            key: 'doctorFullName',
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
        {
            title: t('created_at'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (v) => v ? dayjs(v).format('DD.MM.YYYY') : '—',
        },
        {
            title: '',
            key: 'actions',
            render: (_, record) => (
                <Button
                    size="small"
                    onClick={() => navigate(`/consultations/${record.id}`)}
                >
                    {t('view')}
                </Button>
            ),
        },
    ];

    return (
        <div className="consultation-page">
            <div className="consultation-shell">
                <div className="consultation-header">
                    <div>
                        <Title level={4} className="consultation-title">{t('consultation')}</Title>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/consultations/create')}
                    >
                        {t('create_consultation')}
                    </Button>
                </div>
                <div className="consultation-body">
                    <div className="consultation-filter-row">
                        <Select
                            value={statusFilter}
                            onChange={setStatusFilter}
                            style={{ width: 200 }}
                            placeholder={t('filter_by_status')}
                        >
                            <Option value="">{t('all_statuses')}</Option>
                            <Option value="created">{t('cons_status_created')}</Option>
                            <Option value="reviewing">{t('cons_status_reviewing')}</Option>
                            <Option value="completed">{t('cons_status_completed')}</Option>
                            <Option value="rejected">{t('cons_status_rejected')}</Option>
                        </Select>
                        <Button icon={<ReloadOutlined />} onClick={handleFilter}>
                            {t('refresh')}
                        </Button>
                    </div>

                    <Table
                        rowKey="id"
                        dataSource={consultations}
                        columns={columns}
                        loading={loading}
                        pagination={{ pageSize: 20 }}
                        scroll={{ x: 900 }}
                    />
                </div>
            </div>
        </div>
    );
}
