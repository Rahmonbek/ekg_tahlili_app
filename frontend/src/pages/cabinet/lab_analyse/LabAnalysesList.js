import { Button, DatePicker, Input, Select, Table, Tag, Row, Col, Tooltip, Modal, Space, Image, Typography } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaSearch, FaFlask } from 'react-icons/fa';
import { FaEye } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import { get_lab_analyses_by_clinic, get_lab_analyses_by_doctor, get_lab_analyses_by_nurse, mark_lab_viewed } from '../../../host/requests/LabAnalyseRequest';
import { formatDate, calculateAge } from '../../../tools/formatters';
import { useStore } from '../../../store/Store';
import EmptyState from '../../../components/shared/EmptyState';

const { Option } = Select;
const { Title, Text } = Typography;

const STATUS_COLORS = {
    0: 'default',
    1: 'processing',
    2: 'success',
    '-1': 'error',
};

const AI_STATUS_COLORS = {
    1: '#52c41a', // Normal
    2: '#faad14', // Average
    3: '#ff4d4f', // Danger
};

export default function LabAnalysesList() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, setlab_unread } = useStore();
    const isDoctor = user && user.roleId === 4;
    const isNurse = user && user.roleId === 5;

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const [searchInput, setSearchInput] = useState('');
    const [statusFilter, setStatusFilter] = useState(null);
    const [dateRange, setDateRange] = useState([null, null]);
    const [autoAnalysisFilter, setAutoAnalysisFilter] = useState(null);

    const [clinicModalVisible, setClinicModalVisible] = useState(false);
    const [selectedClinic, setSelectedClinic] = useState(null);

    const PAGE_SIZE = 10;

    const fetchData = useCallback(async (p, s, st, dr, ab) => {
        setLoading(true);
        try {
            const params = { page: p, pageSize: PAGE_SIZE };
            if (s) params.search = s;
            if (st !== null && st !== undefined) params.status = st;
            if (dr && dr[0]) params.dateFrom = dr[0].format('YYYY-MM-DD');
            if (dr && dr[1]) params.dateTo = dr[1].format('YYYY-MM-DD');
            if (ab !== null && ab !== undefined) params.automaticAnalysisBool = ab;
            const res = isDoctor
                ? await get_lab_analyses_by_doctor(params)
                : isNurse
                    ? await get_lab_analyses_by_nurse(params)
                    : await get_lab_analyses_by_clinic(params);
            setData(res.data.items);
            setTotal(res.data.totalCount);
        } catch (err) {
            // handleApiError
        } finally {
            setLoading(false);
        }
    }, [isDoctor, isNurse]);

    useEffect(() => {
        fetchData(page, searchInput, statusFilter, dateRange, autoAnalysisFilter);
        if (isDoctor) {
            mark_lab_viewed().then(() => setlab_unread(0)).catch(() => { });
        }
    }, [page, fetchData]);

    const handleSearch = () => {
        setPage(1);
        fetchData(1, searchInput, statusFilter, dateRange, autoAnalysisFilter);
    };

    const handleStatusChange = (val) => {
        setStatusFilter(val ?? null);
    };

    const handleDateRangeChange = (dates) => {
        setDateRange(dates || [null, null]);
    };

    const hasActiveFilters = searchInput || statusFilter !== null || autoAnalysisFilter !== null || (dateRange[0] || dateRange[1]);

    const handleClearFilters = () => {
        setSearchInput('');
        setStatusFilter(null);
        setAutoAnalysisFilter(null);
        setDateRange([null, null]);
        setPage(1);
        fetchData(1, '', null, [null, null], null);
    };

    const showClinicInfo = (clinic) => {
        setSelectedClinic(clinic);
        setClinicModalVisible(true);
    };

    const statusLabel = (status) => {
        const map = {
            0: t('status_pending'),
            1: t('status_processing'),
            2: t('status_done'),
            '-1': t('status_error'),
        };
        return map[status] ?? status;
    };

    const aiStatusLabel = (st) => {
        const map = {
            1: t('normal') || 'Normal',
            2: t('avarage') || 'O\'rta',
            3: t('danger') || 'Xavfli',
        };
        return map[st] ?? st;
    };

    const columns = [
        {
            title: '#',
            dataIndex: 'id',
            key: 'id',
            align: 'center',
            width: 60,
        },
        ...(isDoctor ? [{
            title: '',
            dataIndex: 'isViewed',
            key: 'isViewed',
            align: 'center',
            width: 36,
            render: (val) => val
                ? <Tag color="green" style={{ margin: 0 }}>✓</Tag>
                : <Tag color="gold" style={{ margin: 0 }}>Yangi</Tag>,
        }] : []),
        // {
        //     title: t('clinic') || 'Shifoxona',
        //     key: 'clinic',
        //     render: (_, row) => (
        //         <span
        //             onClick={() => showClinicInfo(row.clinic)}
        //             style={{ cursor: 'pointer', color: '#1890ff', fontWeight: 500 }}
        //         >
        //             {row.clinic?.clinicName || '—'}
        //         </span>
        //     ),
        // },
        {
            title: t('patient_fullname'),
            key: 'patient',
            render: (_, row) => {
                const p = row.patcient;
                if (!p) return '—';
                const name = [p.lastName, p.firstName, p.sureName]
                    .filter(Boolean)
                    .join(' ');
                const age = p.birthDate ? calculateAge(p.birthDate) : null;
                return (
                    <span>
                        <strong>{name || `ID: ${p.id}`}</strong>
                        {age !== null && (
                            <span style={{ color: '#888', marginLeft: 6 }}>
                                ({age} {t('age') || 'yosh'})
                            </span>
                        )}
                    </span>
                );
            },
        },
        {
            title: t('passport_seria'),
            key: 'passport',
            align: 'center',
            render: (_, row) => row.patcient?.passport || '—',
        },
        {
            title: t('doctor'),
            key: 'doctor',
            render: (_, row) => {
                const d = row.createdDoctor;
                if (!d) return '—';
                return `${d.lastName ?? ''} ${d.firstName ?? ''}`.trim() || '—';
            },
        },
        {
            title: t('ai_result') || 'AI Natija',
            dataIndex: 'aiStatus',
            key: 'aiStatus',
            align: 'center',
            render: (st) => (
                st ? (
                    <Tag color={AI_STATUS_COLORS[st]} style={{ borderRadius: '4px', fontWeight: 500 }}>
                        {aiStatusLabel(st)}
                    </Tag>
                ) : '—'
            ),
        },
        {
            title: t('status'),
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            render: (status) => (
                <Tag color={STATUS_COLORS[status] ?? 'default'}>
                    {statusLabel(status)}
                </Tag>
            ),
        },
        {
            title: t('created_at'),
            dataIndex: 'createdAt',
            key: 'createdAt',
            align: 'center',
            render: (val) => (val ? formatDate(val) : '—'),
        },
        {
            title: '',
            key: 'view',
            align: 'center',
            width: 60,
            render: (_, row) => (
                <Tooltip title={t('view')}>
                    <span
                        className="table_view_btn"
                        onClick={() => navigate(`/lab-analyses/view/${row.id}`)}
                    >
                        <FaEye />
                    </span>
                </Tooltip>
            ),
        },
    ];

    return (
        <div>
            <div className="main_card">
                <h1>
                    {t('analyse_lab') || 'Lab Tahlillar'}
                    <span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8' }}>
                        {total > 0 ? ` — ${total} ta` : ''}
                    </span>
                </h1>
                <div className="main_card_content big_card_content">

                    {/* Toolbar */}
                    <div style={{ padding: '0 0 20px 0' }} className='filter_form_box'>
                        <Row gutter={[12, 12]} align="bottom">
                            <Col xs={24} sm={12} md={6}>
                                <div>
                                    <label className="filter_label">{t('search_by_patient')}</label>
                                    <Input
                                        prefix={<FaSearch style={{ color: '#aaa' }} />}
                                        placeholder={t('search_by_patient')}
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onPressEnter={handleSearch}
                                        className="login_input"
                                        allowClear
                                        onClear={() => { setSearchInput(''); fetchData(1, '', statusFilter, dateRange, autoAnalysisFilter); }}
                                    />
                                </div>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <div>
                                    <label className="filter_label">{t("date_filter")}</label>
                                    <DatePicker.RangePicker
                                        className="login_input"
                                        value={dateRange[0] || dateRange[1] ? dateRange : null}
                                        onChange={handleDateRangeChange}
                                        placeholder={[t('date_from'), t('date_to')]}
                                        format="DD.MM.YYYY"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </Col>
                            <Col xs={24} sm={12} md={4}>
                                <div>
                                    <label className="filter_label">{t('filter_by_status')}</label>
                                    <Select
                                        className="login_input custom_select"
                                        placeholder={t('filter_by_status')}
                                        value={statusFilter}
                                        allowClear
                                        onChange={handleStatusChange}
                                        style={{ width: '100%' }}
                                    >
                                        <Option value={0}>{t('status_pending')}</Option>
                                        <Option value={1}>{t('status_processing')}</Option>
                                        <Option value={2}>{t('status_done')}</Option>
                                        <Option value={-1}>{t('status_error')}</Option>
                                    </Select>
                                </div>
                            </Col>
                            <Col xs={24} sm={12} md={4}>
                                <div>
                                    <label className="filter_label">{t('filter_by_ai') || 'AI bo\'yicha'}</label>
                                    <Select
                                        className="login_input custom_select"
                                        placeholder={t('filter_by_ai') || 'AI bo\'yicha'}
                                        value={autoAnalysisFilter}
                                        allowClear
                                        onChange={(val) => setAutoAnalysisFilter(val ?? null)}
                                        style={{ width: '100%' }}
                                    >
                                        <Option value={1}>{t('normal') || 'Normal'}</Option>
                                        <Option value={2}>{t('avarage') || 'O\'rta'}</Option>
                                        <Option value={3}>{t('danger') || 'Xavfli'}</Option>
                                    </Select>
                                </div>
                            </Col>
                            <Col xs={24} sm={12} md={4}>
                                <div style={{ display: 'flex', gap: 8, height: '48px' }}>
                                    <button onClick={handleSearch} className="btn_form" style={{ flex: 1, margin: 0, height: '48px' }}>
                                        {t('search_patcient')}
                                    </button>
                                    <button onClick={() => navigate('/analyse-lab')} className="btn_form" style={{ width: '48px', flexShrink: 0, margin: 0, height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FaPlus />
                                    </button>
                                </div>
                                {hasActiveFilters && (
                                    <button
                                        onClick={handleClearFilters}
                                        style={{ marginTop: 6, background: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                                    >
                                        {t('clear_filters') || 'Filtrlarni tozalash'}
                                    </button>
                                )}
                            </Col>
                        </Row>
                    </div>

                    {/* Table */}
                    <div className="doctors_table">
                        <Table
                            rowKey="id"
                            loading={loading}
                            dataSource={data}
                            columns={columns}
                            rowClassName={(row) => (!row.isViewed && isDoctor) ? 'table_row_unviewed' : ''}
                            locale={{
                                emptyText: (
                                    <EmptyState
                                        icon={<FaFlask />}
                                        message={t('no_lab_analyses') || 'Hech qanday Lab tahlil topilmadi'}
                                        actionLabel={t('new_lab_analyse') || 'Yangi Lab tahlil'}
                                        actionPath="/analyse-lab"
                                    />
                                )
                            }}
                            pagination={{
                                current: page,
                                pageSize: PAGE_SIZE,
                                total: total,
                                showSizeChanger: false,
                                showTotal: (tot) => `${tot} ta natija`,
                                onChange: (p) => setPage(p),
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Clinic Info Modal */}
            <Modal
                title={t('clinic_info') || 'Shifoxona ma\'lumotlari'}
                open={clinicModalVisible}
                onCancel={() => setClinicModalVisible(false)}
                footer={null}
                centered
            >
                {selectedClinic && (
                    <div style={{ textAlign: 'center' }}>
                        {selectedClinic.clinicLogo && (
                            <div style={{ marginBottom: 16 }}>
                                <Image
                                    src={selectedClinic.clinicLogo}
                                    alt="Logo"
                                    width={120}
                                    style={{ borderRadius: '8px', objectFit: 'contain' }}
                                />
                            </div>
                        )}
                        <Title level={4}>{selectedClinic.clinicName}</Title>

                        <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
                            {selectedClinic.address && (
                                <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                                    <Text type="secondary">{t('address') || 'Manzil'}:</Text>
                                    <div style={{ fontWeight: 500 }}>{selectedClinic.district ? `${selectedClinic.district.nameUz || selectedClinic.district}, ` : ''}{selectedClinic.address}</div>
                                </div>
                            )}
                            {selectedClinic.phoneNumbers && selectedClinic.phoneNumbers.length > 0 && (
                                <div style={{ paddingTop: 8 }}>
                                    <Text type="secondary">{t('phones') || 'Telefon raqamlar'}:</Text>
                                    {selectedClinic.phoneNumbers.map((p, index) => (
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
