import { Button, DatePicker, Input, Select, Table, Tag, Row, Col, Tooltip } from 'antd';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaSearch, FaCheck } from 'react-icons/fa';
import { FaEye } from 'react-icons/fa6';
import { GiMicroscope } from 'react-icons/gi';
import { useNavigate } from 'react-router-dom';
import {
    get_parasitology_analyses_by_clinic,
    get_parasitology_analyses_by_doctor,
    get_parasitology_analyses_by_nurse,
} from '../../../host/requests/ParasitologyRequest';
import { formatDateTime, calculateAge, formatDate } from '../../../tools/formatters';
import { useStore } from '../../../store/Store';
import EmptyState from '../../../components/shared/EmptyState';

const { Option } = Select;

// analysisStatus: pending | analyzed | not_analyzed | failed
const STATUS_COLORS = {
    pending: 'processing',
    analyzed: 'success',
    not_analyzed: 'default',
    failed: 'error',
};

const JIDDIYLIK_COLORS = {
    1: '#52c41a',
    2: '#faad14',
    3: '#ff4d4f',
};

const PAGE_SIZE = 10;

export default function ParasitologyAnalysesList() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useStore();
    const isDoctor = user && user.roleId === 4;
    const isNurse = user && user.roleId === 5;

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const [searchInput, setSearchInput] = useState('');
    const [statusFilter, setStatusFilter] = useState(null);
    const [dateRange, setDateRange] = useState([null, null]);
    const [jiddiylikFilter, setJiddiylikFilter] = useState(null);
    const [hasDiagnosisFilter, setHasDiagnosisFilter] = useState(null);

    const filterRef = useRef({
        search: '',
        status: null,
        dateRange: [null, null],
        jiddiylik: null,
        hasDiagnosis: null,
    });

    const fetchData = useCallback(async (p) => {
        setLoading(true);
        try {
            const { search, status, dateRange: dr, jiddiylik, hasDiagnosis } = filterRef.current;
            const params = { page: p, pageSize: PAGE_SIZE };
            if (search) params.search = search;
            if (status) params.status = status;
            if (dr && dr[0]) params.dateFrom = dr[0].format('YYYY-MM-DD');
            if (dr && dr[1]) params.dateTo = dr[1].format('YYYY-MM-DD');
            if (jiddiylik !== null && jiddiylik !== undefined) params.jiddiylik = jiddiylik;
            if (hasDiagnosis !== null) params.hasDiagnosis = hasDiagnosis;

            const res = isDoctor
                ? await get_parasitology_analyses_by_doctor(params)
                : isNurse
                    ? await get_parasitology_analyses_by_nurse(params)
                    : await get_parasitology_analyses_by_clinic(params);

            setData(res.data.items);
            setTotal(res.data.totalCount);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, [isDoctor, isNurse]);

    useEffect(() => {
        fetchData(page);
    }, [page, fetchData]);

    const handleSearch = () => {
        filterRef.current = {
            search: searchInput,
            status: statusFilter,
            dateRange,
            jiddiylik: jiddiylikFilter,
            hasDiagnosis: hasDiagnosisFilter,
        };
        setPage(1);
        fetchData(1);
    };

    const statusLabel = (s) => {
        const map = {
            pending: t('status_pending'),
            analyzed: t('status_done'),
            not_analyzed: t('not_analysed'),
            failed: t('status_error'),
        };
        return map[s] ?? s;
    };

    const jiddiylikLabel = (j) => {
        const map = {
            1: t('normal') || 'Normal',
            2: t('avarage') || "O'rta",
            3: t('danger') || 'Xavfli',
        };
        return map[j] ?? '—';
    };

    const columns = [
        {
            title: '#',
            key: 'index',
            align: 'center',
            width: 60,
            render: (_, __, index) => (page - 1) * PAGE_SIZE + index + 1,
        },
        {
            title: t('patient_fullname'),
            key: 'patient',
            render: (_, row) => {
                const p = row.patcient;
                if (!p) return '—';
                const name = [p.lastName, p.firstName, p.sureName].filter(Boolean).join(' ');
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
            title: t('infection_level') || "Jiddiylik",
            dataIndex: 'jiddiylikDarajasi',
            key: 'jiddiylik',
            align: 'center',
            render: (j) =>
                j ? (
                    <Tag color={JIDDIYLIK_COLORS[j]} style={{ borderRadius: 4, fontWeight: 500 }}>
                        {jiddiylikLabel(j)}
                    </Tag>
                ) : '—',
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
                        onClick={() => navigate(`/parasitology-analyses/view/${row.id}`)}
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
                    {t('parasitology_analyse') || 'Parazitologik tahlillar'}
                </h1>
                <div className="main_card_content big_card_content">

                    {/* Toolbar */}
                    <div style={{ padding: '0 0 20px 0' }} className="filter_form_box">
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
                                        onChange={(dates) => setDateRange(dates || [null, null])}
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
                                        onChange={(val) => setStatusFilter(val ?? null)}
                                        style={{ width: '100%' }}
                                    >
                                        <Option value="pending">{t('para_status_pending')}</Option>
                                        <Option value="analyzed">{t('para_status_analyzed')}</Option>
                                        <Option value="not_analyzed">{t('para_status_not_analyzed')}</Option>
                                        <Option value="failed">{t('para_status_failed')}</Option>
                                    </Select>
                                </div>
                            </Col>
                            <Col xs={24} sm={12} md={4}>
                                <div className="filter_item">
                                    <label className="filter_label">{t('para_filter_jiddiylik') || 'AI natija'}</label>
                                    <Select
                                        className="login_input custom_select"
                                        placeholder={t('para_filter_jiddiylik')}
                                        value={jiddiylikFilter}
                                        allowClear
                                        onClear={() => {
                                            setJiddiylikFilter(null);
                                            filterRef.current.jiddiylik = null;
                                            setPage(1);
                                            fetchData(1);
                                        }}
                                        onChange={(val) => setJiddiylikFilter(val ?? null)}
                                        style={{ width: '100%' }}
                                    >
                                        <Option value={1}>{t('normal')}</Option>
                                        <Option value={2}>{t('avarage')}</Option>
                                        <Option value={3}>{t('danger')}</Option>
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
                                    <button onClick={() => navigate('/parasitology/analyze')} className="btn_form" style={{ width: '48px', flexShrink: 0, margin: 0, height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                            locale={{
                                emptyText: (
                                    <EmptyState
                                        icon={<GiMicroscope />}
                                        message={t('parasitology_analyse') || 'Hech qanday parazitologik tahlil topilmadi'}
                                        actionLabel={t('retry_parasitology_analyse') || 'Yangi tahlil qilish'}
                                        actionPath="/parasitology-analyzer"
                                    />
                                ),
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
        </div>
    );
}
