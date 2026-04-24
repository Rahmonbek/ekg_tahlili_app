import { Button, DatePicker, Input, Select, Table, Tag, Row, Col, Tooltip, Modal, Space, Image, Typography } from 'antd';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaSearch, FaHeartbeat, FaCheck, FaClock, FaSpinner, FaExclamationCircle } from 'react-icons/fa';
import { FaEye } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import { get_smad_analyses_by_clinic, get_smad_analyses_by_doctor, get_smad_analyses_by_nurse, mark_smad_viewed } from '../../../host/requests/SmadAnalyseRequest';
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

export default function SmadAnalysesList() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, setsmad_unread } = useStore();
    const isDoctor = user && user.roleId === 4;
    const isNurse = user && user.roleId === 5;

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const [searchInput, setSearchInput] = useState('');
    const [statusFilter, setStatusFilter] = useState(null);
    const [aiStatusFilter, setAiStatusFilter] = useState(null);
    const [dateRange, setDateRange] = useState([null, null]);
    const [hasDiagnosisFilter, setHasDiagnosisFilter] = useState(null);

    const [clinicModalVisible, setClinicModalVisible] = useState(false);
    const [selectedClinic, setSelectedClinic] = useState(null);

    const PAGE_SIZE = 10;

    const filterRef = useRef({
        search: '',
        status: null,
        aiStatus: null,
        dateRange: [null, null],
        hasDiagnosis: null,
    });

    const fetchData = useCallback(async (p) => {
        setLoading(true);
        try {
            const { search, status, aiStatus, dateRange: dr, hasDiagnosis } = filterRef.current;
            const params = { page: p, pageSize: PAGE_SIZE };
            if (search) params.search = search;
            if (status !== null && status !== undefined) params.status = status;
            if (dr && dr[0]) params.dateFrom = dr[0].format('YYYY-MM-DD');
            if (dr && dr[1]) params.dateTo = dr[1].format('YYYY-MM-DD');
            if (aiStatus !== null && aiStatus !== undefined) params.automaticAnalysisBool = aiStatus;
            if (hasDiagnosis !== null) params.hasDiagnosis = hasDiagnosis;
            const res = isDoctor
                ? await get_smad_analyses_by_doctor(params)
                : isNurse
                    ? await get_smad_analyses_by_nurse(params)
                    : await get_smad_analyses_by_clinic(params);
            setData(res.data.items);
            setTotal(res.data.totalCount);
        } catch (err) {
            // handleApiError
        } finally {
            setLoading(false);
        }
    }, [isDoctor, isNurse]);

    useEffect(() => {
        fetchData(page);
        if (isDoctor) {
            mark_smad_viewed().then(() => setsmad_unread(0)).catch(() => { });
        }
    }, [page, isDoctor, fetchData]);

    const handleSearch = () => {
        filterRef.current = {
            search: searchInput,
            status: statusFilter,
            aiStatus: aiStatusFilter,
            dateRange,
            hasDiagnosis: hasDiagnosisFilter,
        };
        setPage(1);
        fetchData(1);
    };

    const handleStatusChange = (val) => {
        setStatusFilter(val ?? null);
    };

    const handleAIStatusChange = (val) => {
        setAiStatusFilter(val ?? null);
    };

    const handleDateRangeChange = (dates) => {
        setDateRange(dates || [null, null]);
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
            key: 'index',
            align: 'center',
            width: 60,
            render: (_, __, index) => (page - 1) * PAGE_SIZE + index + 1,
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
            title: t('passport'),
            key: 'passport',
            align: 'center',
            render: (_, row) => row.patcient?.passport || '—',
        },
        {
            title: t('birthdate'),
            key: 'birthdate',
            align: 'center',
            render: (_, row) => row.patcient ? formatDate(row.patcient.birthDate) : '—',
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
            title: t('processing_status') || 'Tahlil holati',
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            render: (st) => {
                const colors = { 0: 'default', 1: 'processing', 2: 'success', '-1': 'error' };
                const icons = {
                    0: <FaClock style={{ marginRight: 4 }} />,
                    1: <FaSpinner className="ant-spin-dot-spin" style={{ marginRight: 4 }} />,
                    2: <FaCheck style={{ marginRight: 4 }} />,
                    '-1': <FaExclamationCircle style={{ marginRight: 4 }} />
                };
                return (
                    <Tag color={colors[st]} style={{ borderRadius: '4px', fontWeight: 500 }}>
                        {icons[st]} {statusLabel(st)}
                    </Tag>
                );
            }
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
                ) : <Tag color={'blue'} style={{ borderRadius: '4px', fontWeight: 500 }}>
                    {t('not_analysed') || 'Tahlil qilinmagan'}
                </Tag>
            ),
        },
        {
            title: t('diagnosis_written') || 'Holati',
            key: 'diagnosis_written',
            align: 'center',
            render: (_, row) => {
                if (row.hasDiagnosis) {
                    return (
                        <Tag color="success" style={{ borderRadius: '4px', fontWeight: 500 }}>
                            <FaCheck style={{ marginRight: 4 }} /> {t('diagnosis_written') || 'Tashxis yozilgan'}
                        </Tag>
                    );
                }
                return (
                    <Tag color="default" style={{ borderRadius: '4px' }}>
                        {t('diagnosis_not_written') || 'Tashxis yozilmagan'}
                    </Tag>
                );
            },
        },
        // Removed redundant diagnosis column
        {
            title: t('date_filter') || 'Tizimga kiritilgan sana',
            key: 'createdAt',
            align: 'center',
            render: (_, row) => formatDate(row.createdAt),
        },
        {
            title: t('analysis_date') || 'Tahlil olingan sana',
            key: 'analysisDate',
            align: 'center',
            render: (_, row) => (row.analysisDate ? formatDate(row.analysisDate) : formatDate(row.createdAt)),
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
                        onClick={() => navigate(`/smad-analyses/view/${row.id}`)}
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
                    <span>
                        {t('analyse_smad') || 'SMAD Tahlillar'}

                    </span>
                    <button
                        onClick={() => navigate('/analyse-smad')}
                        className="btn_form"
                        style={{ width: 'auto', padding: '0 24px', marginTop: 0 }}
                    >
                        {t('create_new_smad_analyse') || 'Yangi SMAD tahlil'}
                    </button>
                </h1>
                <div className="main_card_content big_card_content">

                    {/* Toolbar */}
                    <div style={{ padding: '0 0 20px 0' }} className='filter_form_box'>
                        <Row gutter={[12, 12]} align="bottom">
                            <Col xs={24} sm={12} md={6}>
                                <div className="filter_item">
                                    <label className="filter_label">{t('search_by_patient')}</label>
                                    <Input
                                        placeholder={t('search_by_patient')}
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onPressEnter={handleSearch}
                                        className="login_input"

                                        allowClear
                                        onClear={() => {
                                            setSearchInput('');
                                            filterRef.current.search = '';
                                            setPage(1);
                                            fetchData(1);
                                        }}
                                    />
                                </div>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <div className="filter_item">
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
                                <div className="filter_item">
                                    <label className="filter_label">{t('filter_by_status')}</label>
                                    <Select
                                        className="login_input custom_select"
                                        placeholder={t('filter_by_status')}
                                        value={statusFilter}
                                        allowClear
                                        onClear={() => {
                                            setStatusFilter(null);
                                            filterRef.current.status = null;
                                            setPage(1);
                                            fetchData(1);
                                        }}
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
                                <div className="filter_item">
                                    <label className="filter_label">{t('filter_by_ai') || 'AI bo\'yicha'}</label>
                                    <Select
                                        className="login_input custom_select"
                                        placeholder={t('filter_by_ai') || 'AI bo\'yicha'}
                                        value={aiStatusFilter}
                                        allowClear
                                        onClear={() => {
                                            setAiStatusFilter(null);
                                            filterRef.current.aiStatus = null;
                                            setPage(1);
                                            fetchData(1);
                                        }}
                                        onChange={handleAIStatusChange}
                                        style={{ width: '100%' }}
                                    >
                                        <Option value={1}>{t('normal') || 'Normal'}</Option>
                                        <Option value={2}>{t('avarage') || 'O\'rta'}</Option>
                                        <Option value={3}>{t('danger') || 'Xavfli'}</Option>
                                    </Select>
                                </div>
                            </Col>
                            <Col xs={24} sm={12} md={4}>
                                <div className="filter_item">
                                    <label className="filter_label">{t('diagnosis_status') || 'Tashxis holati'}</label>
                                    <Select
                                        className="login_input custom_select"
                                        placeholder={t('diagnosis_status') || 'Tashxis holati'}
                                        value={hasDiagnosisFilter}
                                        allowClear
                                        onClear={() => {
                                            setHasDiagnosisFilter(null);
                                            filterRef.current.hasDiagnosis = null;
                                            setPage(1);
                                            fetchData(1);
                                        }}
                                        onChange={(val) => setHasDiagnosisFilter(val ?? null)}
                                        style={{ width: '100%' }}
                                    >
                                        <Option value={true}>{t('diagnosis_written') || 'Tashxis yozilgan'}</Option>
                                        <Option value={false}>{t('diagnosis_not_written') || 'Tashxis yozilmagan'}</Option>
                                    </Select>
                                </div>
                            </Col>
                            <Col xs={24} sm={12} md={4}>
                                <div style={{ display: 'flex', gap: 8, height: '48px' }}>
                                    <button onClick={handleSearch} className="btn_form" style={{ flex: 1, margin: 0, height: '48px' }}>
                                        {t('search')}
                                    </button>
                                    <button onClick={() => navigate('/analyse-smad')} className="btn_form" style={{ width: '48px', flexShrink: 0, margin: 0, height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FaPlus />
                                    </button>
                                </div>
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
                                        icon={<FaHeartbeat />}
                                        message={t('no_smad_analyses') || 'Hech qanday SMAD tahlil topilmadi'}
                                        actionLabel={t('new_smad_analyse') || 'Yangi SMAD tahlil'}
                                        actionPath="/analyse-smad"
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
