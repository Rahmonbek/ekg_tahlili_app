import React, { useState, useEffect, useCallback } from 'react';
import {
    Tabs, Row, Col, Card, Avatar, Tag, Button, Input, Select,
    Typography, Spin, Rate, Empty, Space
} from 'antd';
import { UserOutlined, PlusOutlined, HistoryOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getMyConsultants, getDoctorsCatalog } from '../../../host/requests/ConsultationRequest';
import CreateConsultationModal from './CreateConsultationModal';

const { Title, Text } = Typography;
const { Search } = Input;

export default function MyConsultantsPage() {
    const { t }    = useTranslation();
    const navigate = useNavigate();

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);

    // Tab 1: Mening konsultantlarim
    const [myList, setMyList]       = useState([]);
    const [myLoading, setMyLoading] = useState(false);

    // Tab 2: Katalog
    const [catalog, setCatalog]     = useState([]);
    const [catLoading, setCatLoading] = useState(false);
    const [search, setSearch]       = useState('');
    const [specFilter, setSpecFilter] = useState(null);

    const loadMyConsultants = useCallback(async () => {
        setMyLoading(true);
        try {
            const res = await getMyConsultants();
            setMyList(res.data || []);
        } catch { }
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
        } catch { }
        finally { setCatLoading(false); }
    }, [search, specFilter]);

    useEffect(() => { loadMyConsultants(); }, [loadMyConsultants]);
    useEffect(() => { loadCatalog(); }, [loadCatalog]);

    const openModal = (doctor) => {
        setSelectedDoctor(doctor);
        setModalOpen(true);
    };

    const handleSuccess = () => {
        loadMyConsultants();
        loadCatalog();
        navigate('/consultations');
    };

    // Noyob mutaxassisliklar (katalogdan)
    const specs = [...new Set(catalog.map(d => d.specialization).filter(Boolean))];

    return (
        <div style={{ padding: '0 8px' }}>
            <Title level={4}>{t('consultants')}</Title>

            <Tabs defaultActiveKey="my">
                {/* ─── Tab 1: Mening konsultantlarim ─── */}
                <Tabs.TabPane tab={t('my_consultants')} key="my">
                    {myLoading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    ) : myList.length === 0 ? (
                        <Empty description={t('no_consultants')} />
                    ) : (
                        <Row gutter={[12, 12]}>
                            {myList.map(doc => (
                                <Col key={doc.clinicConsultantId} xs={24} sm={12} md={8} lg={6}>
                                    <Card
                                        size="small"
                                        style={{ borderRadius: 12 }}
                                        actions={[
                                            <Button
                                                key="request"
                                                type="link"
                                                icon={<PlusOutlined />}
                                                onClick={() => openModal(doc)}
                                            >
                                                {t('new_request')}
                                            </Button>,
                                            <Button
                                                key="history"
                                                type="link"
                                                icon={<HistoryOutlined />}
                                                onClick={() => navigate(`/consultations?consultantDoctorId=${doc.doctorId}`)}
                                            >
                                                {t('consultation_history')}
                                            </Button>,
                                        ]}
                                    >
                                        <Card.Meta
                                            avatar={
                                                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }}>
                                                    {doc.fullName?.[0] || '?'}
                                                </Avatar>
                                            }
                                            title={<Text strong>{doc.fullName}</Text>}
                                            description={
                                                <>
                                                    {doc.specialization && <div><Text type="secondary">{doc.specialization}</Text></div>}
                                                    <div><Text type="secondary" style={{ fontSize: 12 }}>{doc.clinicName}</Text></div>
                                                    <div style={{ marginTop: 4 }}>
                                                        <Rate disabled allowHalf value={doc.averageRating} style={{ fontSize: 12 }} />
                                                    </div>
                                                    <div style={{ marginTop: 4 }}>
                                                        <Tag color={doc.status === 'active' ? 'green' : 'orange'}>
                                                            {doc.status === 'active' ? t('linked_badge') : 'Pauza'}
                                                        </Tag>
                                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                                            {t('total_consultations')}: {doc.totalConsultations}
                                                        </Text>
                                                    </div>
                                                </>
                                            }
                                        />
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}
                </Tabs.TabPane>

                {/* ─── Tab 2: Yangi konsultant qo'shish ─── */}
                <Tabs.TabPane tab={t('add_consultant')} key="catalog">
                    <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
                        <Col xs={24} sm={12} md={10}>
                            <Search
                                placeholder={`${t('my_consultants')} qidirish`}
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                allowClear
                            />
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Select
                                style={{ width: '100%' }}
                                placeholder="Mutaxassislik"
                                options={specs.map(s => ({ value: s, label: s }))}
                                value={specFilter}
                                onChange={setSpecFilter}
                                allowClear
                            />
                        </Col>
                    </Row>

                    {catLoading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    ) : catalog.length === 0 ? (
                        <Empty description={t('no_consultants')} />
                    ) : (
                        <Row gutter={[12, 12]}>
                            {catalog.map(doc => (
                                <Col key={doc.id} xs={24} sm={12} md={8} lg={6}>
                                    <Card size="small" style={{ borderRadius: 12 }}>
                                        <Card.Meta
                                            avatar={
                                                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#722ed1' }}>
                                                    {doc.fullName?.[0] || '?'}
                                                </Avatar>
                                            }
                                            title={
                                                <Space>
                                                    <Text strong>{doc.fullName}</Text>
                                                    {doc.isLinked && (
                                                        <Tag color="green" style={{ fontSize: 10 }}>
                                                            {t('linked_badge')} ✓
                                                        </Tag>
                                                    )}
                                                </Space>
                                            }
                                            description={
                                                <>
                                                    {doc.specialization && <div><Text type="secondary">{doc.specialization}</Text></div>}
                                                    <div><Text type="secondary" style={{ fontSize: 12 }}>{doc.clinicName}</Text></div>
                                                    {doc.experienceYears && (
                                                        <div><Text type="secondary" style={{ fontSize: 12 }}>{doc.experienceYears} {t('experience_years')}</Text></div>
                                                    )}
                                                    <Rate disabled allowHalf value={doc.averageRating} style={{ fontSize: 12 }} />
                                                </>
                                            }
                                        />
                                        <Button
                                            type="primary"
                                            size="small"
                                            style={{ marginTop: 10, width: '100%' }}
                                            onClick={() => openModal(doc)}
                                        >
                                            {t('send_request')}
                                        </Button>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}
                </Tabs.TabPane>
            </Tabs>

            {/* Konsultatsiya yaratish modali */}
            <CreateConsultationModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedDoctor(null); }}
                doctor={selectedDoctor}
                onSuccess={handleSuccess}
            />
        </div>
    );
}
