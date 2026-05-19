import React, { useState, useEffect, useCallback } from 'react';
import {
    Table, Tag, Button, Input, Select, Typography, Rate,
    Space, notification, Popconfirm, Card, Tooltip
} from 'antd';
import { UserAddOutlined, HistoryOutlined, SendOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    getMyConsultants,
    getDoctorsCatalog,
    addConsultant,
} from '../../../host/requests/ConsultationRequest';
import CreateConsultationModal from './CreateConsultationModal';
import './Consultation.css';

const { Title, Text } = Typography;
const { Search } = Input;

const STATUS_TAG = {
    active:   { color: 'green',  label: 'Aktiv' },
    pending:  { color: 'gold',   label: 'Kutmoqda' },
    rejected: { color: 'red',    label: 'Rad etildi' },
};

export default function MyConsultantsPage() {
    const { t }    = useTranslation();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('my');

    // Tab 1
    const [myList, setMyList]       = useState([]);
    const [myLoading, setMyLoading] = useState(false);

    // Tab 2
    const [catalog, setCatalog]     = useState([]);
    const [catLoading, setCatLoading] = useState(false);
    const [search, setSearch]       = useState('');
    const [specFilter, setSpecFilter] = useState(null);
    const [addingId, setAddingId]   = useState(null);

    // Modal
    const [modalOpen, setModalOpen]         = useState(false);
    const [selectedConsultant, setSelectedConsultant] = useState(null);

    const loadMyConsultants = useCallback(async () => {
        setMyLoading(true);
        try {
            const res = await getMyConsultants();
            setMyList(res.data || []);
        } catch (e) {
            notification.error({ message: e?.response?.data?.message || "Konsultantlarni yuklashda xatolik" });
        }
        finally { setMyLoading(false); }
    }, []);

    const loadCatalog = useCallback(async () => {
        setCatLoading(true);
        try {
            const params = {};
            if (search)     params.search        = search;
            if (specFilter) params.specialization = specFilter;
            const res = await getDoctorsCatalog(params);
            setCatalog(res.data || []);
        } catch (e) {
            notification.error({ message: e?.response?.data?.message || "Shifokorlar katalogini yuklashda xatolik" });
        }
        finally { setCatLoading(false); }
    }, [search, specFilter]);

    useEffect(() => { loadMyConsultants(); }, [loadMyConsultants]);
    useEffect(() => { loadCatalog(); }, [loadCatalog]);

    const handleAddConsultant = async (doctorId) => {
        setAddingId(doctorId);
        try {
            await addConsultant({ consultantDoctorId: doctorId });
            notification.success({ message: t('consultant_request_sent') || "So'rov yuborildi" });
            loadCatalog();
            loadMyConsultants();
        } catch (e) {
            notification.error({ message: e?.response?.data?.message || 'Xatolik' });
        } finally { setAddingId(null); }
    };

    const specs = [...new Set(catalog.map(d => d.specialization).filter(Boolean))];

    // ── My Consultants columns ────────────────────────────────────────────────
    const myColumns = [
        {
            title: t('patient_fullname'),
            dataIndex: 'fullName',
            key: 'fullName',
            render: (name) => <Text strong>{name}</Text>,
        },
        {
            title: 'Mutaxassislik',
            dataIndex: 'specialization',
            key: 'specialization',
            render: (v) => v ? <Text type="secondary">{v}</Text> : '—',
        },
        {
            title: 'Klinika',
            dataIndex: 'clinicName',
            key: 'clinicName',
            render: (v) => <Text type="secondary">{v || '—'}</Text>,
        },
        {
            title: 'Reyting',
            dataIndex: 'averageRating',
            key: 'averageRating',
            width: 140,
            render: (v) => <Rate disabled allowHalf value={v} style={{ fontSize: 12 }} />,
        },
        {
            title: t('total_consultations'),
            dataIndex: 'totalConsultations',
            key: 'totalConsultations',
            width: 100,
            align: 'center',
        },
        {
            title: 'Holat',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            render: (s) => {
                const cfg = STATUS_TAG[s] || { color: 'default', label: s };
                return <Tag color={cfg.color}>{cfg.label}</Tag>;
            },
        },
        {
            title: 'Aloqa',
            key: 'presence',
            width: 140,
            render: (_, row) => (
                <Space size={4} wrap>
                    <Tag color={row.isOnline ? 'green' : 'default'}>
                        {row.isOnline ? 'Online' : 'Offline'}
                    </Tag>
                    {row.isBusy && <Tag color="orange">Band</Tag>}
                </Space>
            ),
        },
        {
            title: '',
            key: 'actions',
            width: 200,
            render: (_, row) => {
                if (row.isLinkRequest) {
                    return (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {row.status === 'pending' ? 'Doktor tasdiqlashni kutmoqda' : 'So\'rov rad etildi'}
                        </Text>
                    );
                }
                return (
                    <Space size={4}>
                        <Button
                            type="primary"
                            size="small"
                            icon={<SendOutlined />}
                            onClick={() => {
                                setSelectedConsultant({ id: row.doctorId, fullName: row.fullName });
                                setModalOpen(true);
                            }}
                        >
                            {t('new_request') || "Yuborish"}
                        </Button>
                        <Button
                            size="small"
                            icon={<HistoryOutlined />}
                            onClick={() => navigate(`/consultations?consultantDoctorId=${row.doctorId}`)}
                        >
                            {t('consultation_history') || 'Tarix'}
                        </Button>
                    </Space>
                );
            },
        },
    ];

    // ── Catalog columns ───────────────────────────────────────────────────────
    const catalogColumns = [
        {
            title: t('patient_fullname'),
            dataIndex: 'fullName',
            key: 'fullName',
            render: (name) => <Text strong>{name}</Text>,
        },
        {
            title: 'Mutaxassislik',
            dataIndex: 'specialization',
            key: 'specialization',
            render: (v) => v ? <Text type="secondary">{v}</Text> : '—',
        },
        {
            title: 'Klinika',
            dataIndex: 'clinicName',
            key: 'clinicName',
            render: (v) => <Text type="secondary">{v || '—'}</Text>,
        },
        {
            title: 'Tajriba',
            dataIndex: 'experienceYears',
            key: 'experienceYears',
            width: 90,
            render: (v) => v ? `${v} yil` : '—',
        },
        {
            title: 'Reyting',
            dataIndex: 'averageRating',
            key: 'averageRating',
            width: 140,
            render: (v) => <Rate disabled allowHalf value={v} style={{ fontSize: 12 }} />,
        },
        {
            title: '',
            key: 'actions',
            width: 180,
            render: (_, row) => {
                if (row.isLinked) {
                    return <Tag color="green">{t('linked_badge') || 'Biriktirilgan'} ✓</Tag>;
                }
                if (row.linkRequestStatus === 'pending') {
                    return (
                        <Tooltip title="So'rov yuborilgan, doktor tasdiqlashni kutmoqda">
                            <Tag color="gold" icon={<ClockCircleOutlined />}>Kutmoqda</Tag>
                        </Tooltip>
                    );
                }
                const isRejected = row.linkRequestStatus === 'rejected';
                return (
                    <Space size={4}>
                        {isRejected && (
                            <Tag color="red" icon={<CloseCircleOutlined />} style={{ marginRight: 4 }}>
                                Rad etildi
                            </Tag>
                        )}
                        <Popconfirm
                            title={isRejected
                                ? "So'rovni qayta yuborishni tasdiqlaysizmi?"
                                : "Ushbu doktorni konsultant sifatida qo'shishni tasdiqlaysizmi?"}
                            onConfirm={() => handleAddConsultant(row.id)}
                            okText={t('accept') || 'Ha'}
                            cancelText={t('back') || "Yo'q"}
                        >
                            <Button
                                type={isRejected ? 'default' : 'primary'}
                                size="small"
                                icon={<UserAddOutlined />}
                                loading={addingId === row.id}
                            >
                                {isRejected ? 'Qayta yuborish' : (t('add_consultant') || "Qo'shish")}
                            </Button>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    const handleConsultationSuccess = () => {
        setModalOpen(false);
        setSelectedConsultant(null);
        navigate('/consultations');
    };

    const activeConsultants = myList.filter(item => !item.isLinkRequest && item.status === 'active').length;
    const pendingLinks = myList.filter(item => item.isLinkRequest && item.status === 'pending').length;

    return (
        <div className="consultation-page">
            <section className="consultation-shell">
                <div className="consultation-header">
                    <div>
                        <Title level={4} className="consultation-title">{t('consultants')}</Title>
                        <Text className="consultation-subtitle">
                            Konsultantni tanlang, bemor uchun so'rov yuboring va konsultatsiya tarixini kuzating.
                        </Text>
                    </div>
                </div>
                <div className="consultation-body">
                    <div className="consultation-summary-grid">
                        <div className="consultation-summary-card">
                            <div className="consultation-summary-label">Faol konsultantlar</div>
                            <div className="consultation-summary-value">{activeConsultants}</div>
                        </div>
                        <div className="consultation-summary-card">
                            <div className="consultation-summary-label">Tasdiq kutilmoqda</div>
                            <div className="consultation-summary-value">{pendingLinks}</div>
                        </div>
                        <div className="consultation-summary-card">
                            <div className="consultation-summary-label">Katalogdagi shifokorlar</div>
                            <div className="consultation-summary-value">{catalog.length}</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="consultation-shell">
                <div className="consultation-body">
                    <div className="consultation-flow">
                        <div className="consultation-flow-item">
                            <span className="consultation-flow-step">1</span>
                            <div className="consultation-flow-title">Konsultant qo'shing</div>
                            <div className="consultation-flow-copy">Katalogdan mos mutaxassisni topib biriktiring.</div>
                        </div>
                        <div className="consultation-flow-item">
                            <span className="consultation-flow-step">2</span>
                            <div className="consultation-flow-title">So'rov yuboring</div>
                            <div className="consultation-flow-copy">Bemor va kerakli tahlillarni tanlab yuboring.</div>
                        </div>
                        <div className="consultation-flow-item">
                            <span className="consultation-flow-step">3</span>
                            <div className="consultation-flow-title">Javobni kuzating</div>
                            <div className="consultation-flow-copy">Holatni konsultatsiyalar bo'limidan tekshiring.</div>
                        </div>
                        <div className="consultation-flow-item">
                            <span className="consultation-flow-step">4</span>
                            <div className="consultation-flow-title">Xulosani oling</div>
                            <div className="consultation-flow-copy">Video aloqa va yakuniy xulosani shu oqimdan kuzating.</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="consultation-shell">
                <div className="consultation-body">
                    <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', marginBottom: 16, gap: 0 }}>
                        {[
                            { key: 'my', label: t('my_consultants') || 'Konsultantlarim' },
                            { key: 'catalog', label: t('add_consultant') || "Konsultant qo'shish" },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                style={{
                                    padding: '8px 20px',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    borderBottom: activeTab === tab.key ? '2px solid #1677ff' : '2px solid transparent',
                                    color: activeTab === tab.key ? '#1677ff' : '#595959',
                                    fontWeight: activeTab === tab.key ? 600 : 400,
                                    transition: 'all 0.2s',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'my' && (
                        <Card size="small" style={{ borderRadius: 8 }}>
                    <Table
                        rowKey={(row) => row.isLinkRequest ? `invite_${row.invitationId}` : `cc_${row.clinicConsultantId}`}
                        columns={myColumns}
                        dataSource={myList}
                        loading={myLoading}
                        size="small"
                        pagination={{ pageSize: 10, showSizeChanger: false }}
                        locale={{ emptyText: t('no_consultants') || "Konsultantlar yo'q" }}
                    />
                        </Card>
                    )}

                    {activeTab === 'catalog' && (
                        <Card size="small" style={{ borderRadius: 8 }}>
                            <div className="consultation-toolbar">
                                <Space wrap>
                        <Search
                            placeholder="Ism bo'yicha qidirish"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            allowClear
                            style={{ width: 220 }}
                        />
                        <Select
                            style={{ width: 200 }}
                            placeholder="Mutaxassislik"
                            options={specs.map(s => ({ value: s, label: s }))}
                            value={specFilter}
                            onChange={setSpecFilter}
                            allowClear
                        />
                                </Space>
                            </div>
                            <Table
                        rowKey="id"
                        columns={catalogColumns}
                        dataSource={catalog}
                        loading={catLoading}
                        size="small"
                        pagination={{ pageSize: 10, showSizeChanger: false }}
                        locale={{ emptyText: t('no_consultants') || 'Doktorlar topilmadi' }}
                    />
                        </Card>
                    )}
                </div>
            </section>

            <CreateConsultationModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedConsultant(null); }}
                doctor={selectedConsultant}
                onSuccess={handleConsultationSuccess}
            />
        </div>
    );
}
