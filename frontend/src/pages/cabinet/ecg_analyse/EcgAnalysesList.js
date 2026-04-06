import { Button, DatePicker, Input, Select, Table, Tag, Row, Col } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaSearch } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { get_ecg_analyses_by_clinic } from '../../../host/requests/ECGAnalyseRequest';
import { formatDate, calculateAge } from '../../../tools/formatters';

const { Option } = Select;

const STATUS_COLORS = {
    0: 'default',
    1: 'processing',
    2: 'success',
    '-1': 'error',
};

export default function EcgAnalysesList() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const [searchInput, setSearchInput] = useState('');
    const [statusFilter, setStatusFilter] = useState(null);
    const [dateRange, setDateRange] = useState([null, null]);

    const PAGE_SIZE = 10;

    const fetchData = useCallback(async (p, s, st, dr) => {
        setLoading(true);
        try {
            const params = { page: p, pageSize: PAGE_SIZE };
            if (s) params.search = s;
            if (st !== null && st !== undefined) params.status = st;
            if (dr && dr[0]) params.dateFrom = dr[0].format('YYYY-MM-DD');
            if (dr && dr[1]) params.dateTo = dr[1].format('YYYY-MM-DD');
            const res = await get_ecg_analyses_by_clinic(params);
            setData(res.data.items);
            setTotal(res.data.totalCount);
        } catch (err) {
            // handleApiError already called by axiosInstance interceptor
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(page, searchInput, statusFilter, dateRange);
    }, [page, fetchData]);

    const handleSearch = () => {

        setPage(1)
        fetchData(1, searchInput, statusFilter, dateRange);
    };

    const handleStatusChange = (val) => {
        setStatusFilter(val ?? null);

    };

    const handleDateRangeChange = (dates) => {
        setDateRange(dates || [null, null]);

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

    const columns = [
        {
            title: '#',
            dataIndex: 'id',
            key: 'id',
            align: 'center',
            width: 70,
        },
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
            title: t('ecg_status'),
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
    ];

    return (
        <div>
            <div className="main_card">
                <div className="main_card_content big_card_content">

                    {/* Toolbar */}
                    <div style={{ padding: '0 0 20px 0' }} className='filter_form_box'>
                        <Row gutter={[16, 16]} align="bottom">
                            <Col xs={24} sm={12} md={8} lg={6}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#34495e', fontSize: '14px' }}>
                                        {t('search_by_patient')}
                                    </label>
                                    <Input
                                        prefix={<FaSearch style={{ color: '#aaa' }} />}
                                        placeholder={t('search_by_patient')}
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        className="login_input"
                                        allowClear
                                        onClear={() => { setSearchInput(''); }}
                                    />
                                </div>
                            </Col>
                            <Col xs={24} sm={12} md={8} lg={6}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#34495e', fontSize: '14px' }}>
                                        {t("date_filter")}
                                    </label>
                                    <DatePicker.RangePicker
                                        className="login_input"
                                        onChange={handleDateRangeChange}
                                        placeholder={[t('date_from'), t('date_to')]}
                                        format="DD.MM.YYYY"
                                    />
                                </div>
                            </Col>
                            <Col xs={24} sm={12} md={8} lg={5}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#34495e', fontSize: '14px' }}>
                                        {t('filter_by_status')}
                                    </label>
                                    <Select
                                        className="login_input custom_select"
                                        placeholder={t('filter_by_status')}
                                        allowClear
                                        dropdownStyle={{ borderRadius: '8px' }}
                                        onChange={handleStatusChange}
                                    >
                                        <Option value={0}>{t('status_pending')}</Option>
                                        <Option value={1}>{t('status_processing')}</Option>
                                        <Option value={2}>{t('status_done')}</Option>
                                        <Option value={-1}>{t('status_error')}</Option>
                                    </Select>
                                </div>
                            </Col>
                            <Col xs={24} sm={12} md={24} lg={7}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, color: '#34495e', fontSize: '14px' }}>

                                    </label>
                                    <div style={{ display: 'flex', gap: 12, height: '48px' }}>
                                        <button onClick={handleSearch} className="btn_form" style={{ flex: 1, margin: 0, height: '48px' }}>
                                            {t('search_patcient')}
                                        </button>
                                        <button onClick={() => navigate('/analyse-ecg')} className="btn_form text-white" style={{ flex: 1, margin: 0, height: '48px', backgroundColor: '#00D1B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <FaPlus style={{ marginRight: 8 }} /> {t('new_ecg_analyse')}
                                        </button>
                                    </div>
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
                            pagination={{
                                current: page,
                                pageSize: PAGE_SIZE,
                                total: total,
                                showSizeChanger: false,
                                onChange: (p) => setPage(p),
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
