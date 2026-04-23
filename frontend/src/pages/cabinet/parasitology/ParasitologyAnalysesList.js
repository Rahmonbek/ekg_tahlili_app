import { Button, DatePicker, Input, Select, Table, Tag, Row, Col, Tooltip } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaSearch } from 'react-icons/fa';
import { FaEye } from 'react-icons/fa6';
import { GiMicroscope } from 'react-icons/gi';
import { useNavigate } from 'react-router-dom';
import {
    get_parasitology_analyses_by_clinic,
    get_parasitology_analyses_by_doctor,
    get_parasitology_analyses_by_nurse,
} from '../../../host/requests/ParasitologyRequest';
import { formatDate, calculateAge } from '../../../tools/formatters';
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

    const fetchData = useCallback(async (p, s, st, dr, jd) => {
        setLoading(true);
        try {
            const params = { page: p, pageSize: PAGE_SIZE };
            if (s) params.search = s;
            if (st) params.status = st;
            if (dr && dr[0]) params.dateFrom = dr[0].format('YYYY-MM-DD');
            if (dr && dr[1]) params.dateTo = dr[1].format('YYYY-MM-DD');
            if (jd !== null && jd !== undefined) params.jiddiylik = jd;

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
        fetchData(page, searchInput, statusFilter, dateRange, jiddiylikFilter);
    }, [page, fetchData]);

    const handleSearch = () => {
        setPage(1);
        fetchData(1, searchInput, statusFilter, dateRange, jiddiylikFilter);
    };

    const hasActiveFilters = searchInput || statusFilter || jiddiylikFilter !== null || (dateRange[0] || dateRange[1]);

    const handleClearFilters = () => {
        setSearchInput('');
        setStatusFilter(null);
        setJiddiylikFilter(null);
        setDateRange([null, null]);
        setPage(1);
        fetchData(1, '', null, [null, null], null);
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
            dataIndex: 'id',
            key: 'id',
            align: 'center',
            width: 60,
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
            title: t('status') || 'Holat',
            dataIndex: 'analysisStatus',
            key: 'analysisStatus',
            align: 'center',
            render: (s) => (
                <Tag color={STATUS_COLORS[s] ?? 'default'}>
                    {statusLabel(s)}
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
                   
                     <button
                    onClick={() => navigate('/parasitology-analyzer')}
                    className="btn_form"
                    style={{ width: 'auto', padding: '0 24px', marginTop: 0 }}
                >
                    {t('create_new_parasitology_analyse') || 'Yangi tahlil'}
                </button>
                </h1>
                <div className="main_card_content big_card_content">

                    {/* Toolbar */}
                    <div style={{ padding: '0 0 20px 0' }} className="filter_form_box">
                        <Row gutter={[12, 12]} align="bottom">
                            <Col xs={24} sm={12} md={6}>
                                <div>
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
                                            fetchData(1, '', statusFilter, dateRange, jiddiylikFilter);
                                        }}
                                    />
                                </div>
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                                <div>
                                    <label className="filter_label">{t('date_filter')}</label>
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
                                <div>
                                    <label className="filter_label">{t('filter_by_status')}</label>
                                    <Select
                                        className="login_input custom_select"
                                        placeholder={t('filter_by_status')}
                                        value={statusFilter}
                                        allowClear
                                        onChange={(val) => setStatusFilter(val ?? null)}
                                        style={{ width: '100%' }}
                                    >
                                        <Option value="pending">{t('status_pending')}</Option>
                                        <Option value="analyzed">{t('status_done')}</Option>
                                        <Option value="not_analyzed">{t('not_analysed')}</Option>
                                        <Option value="failed">{t('status_error')}</Option>
                                    </Select>
                                </div>
                            </Col>
                            <Col xs={24} sm={12} md={4}>
                                <div>
                                    <label className="filter_label">{t('infection_level') || 'Jiddiylik'}</label>
                                    <Select
                                        className="login_input custom_select"
                                        placeholder={t('infection_level') || 'Jiddiylik'}
                                        value={jiddiylikFilter}
                                        allowClear
                                        onChange={(val) => setJiddiylikFilter(val ?? null)}
                                        style={{ width: '100%' }}
                                    >
                                        <Option value={1}>{t('normal') || 'Normal'}</Option>
                                        <Option value={2}>{t('avarage') || "O'rta"}</Option>
                                        <Option value={3}>{t('danger') || 'Xavfli'}</Option>
                                    </Select>
                                </div>
                            </Col>
                            <Col xs={24} sm={12} md={4}>
                                <div style={{ display: 'flex', gap: 8, height: '48px' }}>
                                    <button
                                        onClick={handleSearch}
                                        className="btn_form"
                                        style={{ flex: 1, margin: 0, height: '48px' }}
                                    >
                                        {t('search_patcient')}
                                    </button>
                                </div>
                                {hasActiveFilters && (
                                    <button
                                        onClick={handleClearFilters}
                                        style={{
                                            marginTop: 6,
                                            background: 'none',
                                            color: '#94a3b8',
                                            fontSize: 13,
                                            cursor: 'pointer',
                                            padding: 0,
                                            textDecoration: 'underline',
                                        }}
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
