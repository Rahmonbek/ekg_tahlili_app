import { Button, DatePicker, Input, Select, Table, Tag, Row, Col, Tooltip, Modal, Space, Image, Typography } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaSearch, FaHospital } from 'react-icons/fa';
import { FaEye } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import { get_diagnose_by_clinic, get_diagnose_by_doctor, get_diagnose_by_nurse, mark_diagnose_viewed } from '../../../host/requests/DiagnoseRequest';
import { formatDate, calculateAge , rowNumber } from '../../../tools/formatters';
import { useStore } from '../../../store/Store';
import EmptyState from '../../../components/shared/EmptyState';
import DeleteAnalysisButton from '../../../components/shared/DeleteAnalysisButton';
import { analysisListTour } from '../../../tools/tourSteps';
import { usePageTour } from '../../../components/shared/TourProvider';
import { MdOutlineMedicalInformation } from 'react-icons/md';
import useDocumentTitle from '../../../tools/useDocumentTitle';

const { Option } = Select;
const { Title, Text } = Typography;

export default function DiagnosesList() {
    // Qo'llanma qadamlari ro'yxatdan o'tkaziladi; tugma header'da
    usePageTour(analysisListTour);
    const { t } = useTranslation()
    useDocumentTitle(t('patient_diagnostics', { defaultValue: "Shifokor xulosasi" }));
    const navigate = useNavigate();
    const { user, setdiagnoses_unread } = useStore();
    const isDoctor = user && user.roleId === 4;
    // O'chirish faqat Admin (2) va Direktor (3) uchun — backend ham shuni tekshiradi
    const isClinicManager = user && (user.roleId === 2 || user.roleId === 3);
    const isNurse  = user && user.roleId === 5;

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const [searchInput, setSearchInput] = useState('');
    const [statusFilter, setStatusFilter] = useState(null);
    const [dateRange, setDateRange] = useState([null, null]);

    const [clinicModalVisible, setClinicModalVisible] = useState(false);
    const [selectedClinic, setSelectedClinic] = useState(null);

    const PAGE_SIZE = 10;

    const fetchData = useCallback(async (p, s, st, dr) => {
        setLoading(true);
        try {
            const params = { page: p, pageSize: PAGE_SIZE };
            if (s) params.search = s;
            if (st !== null && st !== undefined) params.status = st;
            if (dr && dr[0]) params.dateFrom = dr[0].format('YYYY-MM-DD');
            if (dr && dr[1]) params.dateTo = dr[1].format('YYYY-MM-DD');
            const res = isDoctor
                ? await get_diagnose_by_doctor(params)
                : isNurse
                    ? await get_diagnose_by_nurse(params)
                    : await get_diagnose_by_clinic(params);
            setData(res.data.items);
            setTotal(res.data.totalCount);
        } catch (err) {
            // handleApiError
        } finally {
            setLoading(false);
        }
    }, [isDoctor, isNurse]);

    useEffect(() => {
        fetchData(page, searchInput, statusFilter, dateRange);
        if (isDoctor) {
            mark_diagnose_viewed().then(() => setdiagnoses_unread(0)).catch(() => {});
        }
    }, [page, fetchData]);

    const handleSearch = () => {
        setPage(1);
        fetchData(1, searchInput, statusFilter, dateRange);
    };

    const handleDateRangeChange = (dates) => {
        setDateRange(dates || [null, null]);
    };

    const showClinicInfo = (clinic) => {
        setSelectedClinic(clinic);
        setClinicModalVisible(true);
    };

    const columns = [
        {
            // Ilgari bu ustunda bazadagi `id` chiqardi: ro'yxatda bitta yozuv
            // bo'lsa ham "16" deb yozilardi. Endi sahifadagi tartib raqami.
            title: '#',
            key: 'index',
            align: 'center',
            width: 60,
            render: rowNumber(page, PAGE_SIZE),
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
        //     title: t('clinic', { defaultValue: 'Shifoxona' }),
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
                // Jadvalda faqat familiya va ism: otasining ismi qatorni
                // keraksiz uzaytiradi va boshqa ustunlarni siqib qo'yadi
                const name = [p.lastName, p.firstName].filter(Boolean).join(' ');
                const age = p.birthDate ? calculateAge(p.birthDate) : null;
                return (
                    <span>
                        <strong>{name || `ID: ${p.id}`}</strong>
                        {age !== null && (
                            <span style={{ color: '#888', marginLeft: 6 }}>
                                ({age} {t('age', { defaultValue: 'yosh' })})
                            </span>
                        )}
                    </span>
                );
            },
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
            width: 110,
            render: (_, row) => (
                <Space size={0} data-tour="analysis-delete" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title={t('view')}>
                        <span
                            className="table_view_btn"
                            onClick={() => navigate(`/patient-diagnoses/view/${row.id}`)}
                        >
                            <FaEye />
                        </span>
                    </Tooltip>
                    {isClinicManager ? (
                        <DeleteAnalysisButton
                            type="diagnose"
                            id={row.id}
                            label={`#${row.id}`}
                            onDeleted={() => fetchData(page, searchInput, statusFilter, dateRange)}
                        />
                    ) : null}
                </Space>
            ),
        },
    ];

    const hasActiveFilters = searchInput || (dateRange[0] || dateRange[1]);

    const handleClearFilters = () => {
        setSearchInput('');
        setDateRange([null, null]);
        setPage(1);
        fetchData(1, '', null, [null, null]);
    };

    return (
        <div>
            <div className="main_card">
                <h1>
                    <span>
                        {t('patient_diagnostics', { defaultValue: 'Tibbiy Tashxislar' })}
                    </span>
                    <button
                    onClick={() => navigate('/diagnoses-create')}
                    className="btn_form" data-tour="analysis-new"
                    style={{ width: 'auto', padding: '0 24px', marginTop: 0 }}
                >
                    {t('create_new_diagnose', { defaultValue: 'Yangi tashxis' })}
                </button>
                </h1>
                <div className="main_card_content big_card_content">

                    {/* Toolbar */}
                    <div style={{ padding: '0 0 20px 0' }} className='filter_form_box'>
                        <Row gutter={[12, 12]} align="bottom">
                            <Col xs={24} sm={12} md={8}>
                                <div data-tour="analysis-search">
                                    <label className="filter_label">{t('search_by_patient')}</label>
                                    <Input
                                        
                                        placeholder={t('search_by_patient')}
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        className="login_input"
                                        allowClear
                                    />
                                </div>
                            </Col>
                            <Col xs={24} sm={12} md={8}>
                                <div data-tour="analysis-date">
                                    <label className="filter_label">{t("date_filter")}</label>
                                    <DatePicker.RangePicker
                                        className="login_input"
                                        onChange={handleDateRangeChange}
                                        placeholder={[t('date_from'), t('date_to')]}
                                        format="DD.MM.YYYY"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </Col>
                            <Col xs={24} sm={12} md={6} lg={4}>
                                {/* Tugma butun qolgan bo'shliqni egallamasin —
                                    boshqa ro'yxat sahifalari bilan bir xil o'lcham */}
                                <div className="filter_actions">
                                    <button onClick={handleSearch} className="btn_form">
                                        {t('search_patcient')}
                                    </button>
                                </div>
                                {hasActiveFilters && (
                                    <button onClick={handleClearFilters} style={{ marginTop: 6, background: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                                        {t('clear_filters', { defaultValue: 'Filtrlarni tozalash' })}
                                    </button>
                                )}
                            </Col>
                        </Row>
                    </div>

                    {/* Table */}
                    <div className="doctors_table" data-tour="analysis-table">
                        <Table
                            // Jadval keng bo'lsa gorizontal aylantirish — ilgari ortiqcha
                            // ustunlar shunchaki kesilardi va ularga yetib bo'lmasdi
                            scroll={{ x: "max-content" }}
                            rowKey="id"
                            loading={loading}
                            dataSource={data}
                            // Qator bosilsa ko'rish sahifasi ochiladi — tor ekranlarda
                            // "ko'z" tugmasi gorizontal skroll ortida qolib ketardi
                            onRow={(row) => ({
                                onClick: () => navigate(`/patient-diagnoses/view/${row.id}`),
                                style: { cursor: 'pointer' },
                            })}
                            columns={columns}
                            rowClassName={(row) => (!row.isViewed && isDoctor) ? 'table_row_unviewed' : ''}
                            locale={{
                                emptyText: (
                                    <EmptyState
                                        icon={<MdOutlineMedicalInformation />}
                                        message={t('no_diagnoses', { defaultValue: 'Hech qanday tashxis topilmadi' })}
                                        actionLabel={t('new_diagnose', { defaultValue: 'Yangi tashxis' })}
                                        actionPath="/diagnoses-create"
                                    />
                                )
                            }}
                            pagination={{
                                current: page,
                                pageSize: PAGE_SIZE,
                                total: total,
                                showSizeChanger: false,
                                showTotal: (tot) => t('total_results', { defaultValue: '{{count}} ta natija', count: tot }),
                                onChange: (p) => setPage(p),
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Clinic Info Modal */}
            <Modal
                title={t('clinic_info', { defaultValue: 'Shifoxona ma\'lumotlari' })}
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
                                    <Text type="secondary">{t('address', { defaultValue: 'Manzil' })}:</Text>
                                    <div style={{ fontWeight: 500 }}>{selectedClinic.district ? `${selectedClinic.district.nameUz || selectedClinic.district}, ` : ''}{selectedClinic.address}</div>
                                </div>
                            )}
                            {selectedClinic.phoneNumbers && selectedClinic.phoneNumbers.length > 0 && (
                                <div style={{ paddingTop: 8 }}>
                                    <Text type="secondary">{t('phones', { defaultValue: 'Telefon raqamlar' })}:</Text>
                                    {selectedClinic.phoneNumbers.map((p, index) => (
                                        <div key={index} style={{ fontWeight: 500, fontSize: '16px', color: '#00B39A' }}>{p}</div>
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
