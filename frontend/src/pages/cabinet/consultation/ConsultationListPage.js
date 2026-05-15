import React, { useState, useEffect, useCallback } from 'react';
import { Table, Tag, Button, Select, DatePicker, Row, Col, Typography } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getConsultationList } from '../../../host/requests/ConsultationRequest';
import { useStore } from '../../../store/Store';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const STATUS_COLORS = {
    pending:   'gold',
    accepted:  'blue',
    scheduled: 'purple',
    concluded: 'green',
    rejected:  'red',
    expired:   'default',
    cancelled: 'default',
};

export default function ConsultationListPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setConsultationBadge } = useStore();

    // URL ?consultantDoctorId=X — MyConsultantsPage "Tarix" tugmasidan
    const consultantDoctorId = searchParams.get('consultantDoctorId')
        ? Number(searchParams.get('consultantDoctorId'))
        : null;

    const [data, setData]         = useState([]);
    const [loading, setLoading]   = useState(false);
    const [statusFilter, setStatusFilter] = useState(null);
    const [dateRange, setDateRange]       = useState(null);

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            if (statusFilter) params.status = statusFilter;
            if (consultantDoctorId) params.consultantDoctorId = consultantDoctorId;
            const res = await getConsultationList(params);
            let items = res.data || [];
            if (dateRange && dateRange[0] && dateRange[1]) {
                const from = dateRange[0].startOf('day');
                const to   = dateRange[1].endOf('day');
                items = items.filter(i => {
                    const d = dayjs(i.createdAt);
                    return d.isAfter(from) && d.isBefore(to);
                });
            }
            setData(items);
            // Admin sidebar badge — pending soni
            const pending = items.filter(i => i.status === 'pending').length;
            setConsultationBadge({ adminPendingCount: pending });
        } catch { }
        finally { setLoading(false); }
    }, [statusFilter, dateRange, consultantDoctorId, setConsultationBadge]);

    useEffect(() => { fetchList(); }, [fetchList]);

    // SignalR hodisalari — status o'zgarganda qayta yuklash
    useEffect(() => {
        const handler = () => fetchList();
        window.addEventListener('consultation-status-changed', handler);
        return () => window.removeEventListener('consultation-status-changed', handler);
    }, [fetchList]);

    const columns = [
        {
            title: t('patient_fullname'),
            dataIndex: 'patientName',
            key: 'patientName',
        },
        {
            title: t('consultant_doctor'),
            dataIndex: 'consultantName',
            key: 'consultantName',
        },
        {
            title: t('created_at'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (v) => v ? dayjs(v).format('DD.MM.YYYY HH:mm') : '—',
            sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        },
        {
            title: t('status'),
            dataIndex: 'status',
            key: 'status',
            render: (v) => (
                <Tag color={STATUS_COLORS[v] || 'default'}>
                    {t(`cons_status_${v}`) || v}
                </Tag>
            ),
        },
        {
            title: t('view'),
            key: 'action',
            render: (_, row) => (
                <Button
                    icon={<EyeOutlined />}
                    size="small"
                    onClick={() => navigate(`/consultations/${row.id}`)}
                >
                    {t('view')}
                </Button>
            ),
        },
    ];

    const statusOptions = [
        { value: null,        label: t('all_statuses') },
        { value: 'pending',   label: t('cons_status_pending') },
        { value: 'accepted',  label: t('cons_status_accepted') },
        { value: 'scheduled', label: t('cons_status_scheduled') },
        { value: 'concluded', label: t('cons_status_concluded') },
        { value: 'rejected',  label: t('cons_status_rejected') },
        { value: 'cancelled', label: t('cons_status_cancelled') },
        { value: 'expired',   label: t('cons_status_expired') },
    ];

    return (
        <div style={{ padding: '0 8px' }}>
            <Title level={4} style={{ marginBottom: consultantDoctorId ? 8 : 16 }}>
                {t('consultation')}
            </Title>
            {consultantDoctorId && (
                <div style={{ marginBottom: 12 }}>
                    <Tag
                        color="blue"
                        closable
                        onClose={() => navigate('/consultations')}
                    >
                        {t('consultant_doctor')} #{consultantDoctorId}
                    </Tag>
                </div>
            )}

            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={8} md={6}>
                    <Select
                        style={{ width: '100%' }}
                        placeholder={t('filter_by_status')}
                        options={statusOptions}
                        value={statusFilter}
                        onChange={(v) => setStatusFilter(v)}
                        allowClear
                    />
                </Col>
                <Col xs={24} sm={12} md={10}>
                    <RangePicker
                        style={{ width: '100%' }}
                        onChange={(v) => setDateRange(v)}
                    />
                </Col>
                <Col xs={24} sm={4}>
                    <Button onClick={fetchList}>{t('refresh') || 'Yangilash'}</Button>
                </Col>
            </Row>

            <Table
                rowKey="id"
                columns={columns}
                dataSource={data}
                loading={loading}
                pagination={{ pageSize: 15, showSizeChanger: false }}
                locale={{ emptyText: t('no_consultations') }}
                scroll={{ x: 600 }}
            />
        </div>
    );
}
