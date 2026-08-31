import { Alert, Button, DatePicker, Input, Select, Table, Tag, Row, Col, Tooltip, Modal, Space, Image, Typography } from 'antd';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaSearch, FaHospital } from 'react-icons/fa';
import { FaEye } from 'react-icons/fa6';
import { useNavigate } from 'react-router-dom';
import { get_ecg_analyses_by_clinic, get_ecg_analyses_by_doctor, get_ecg_analyses_by_nurse, mark_ecg_viewed } from '../../../host/requests/ECGAnalyseRequest';
import { formatDateTime, calculateAge, formatDate , rowNumber } from '../../../tools/formatters';
import { useStore } from '../../../store/Store';
import EmptyState from '../../../components/shared/EmptyState';
import DeleteAnalysisButton from '../../../components/shared/DeleteAnalysisButton';
import RetryAnalysisButton, { parseErrorReason } from '../../../components/shared/RetryAnalysisButton';
import { analyzeEkgFileRetry } from '../../../host/EkgService';
import ExportButton from '../../../components/shared/ExportButton';
import FilterPanel from '../../../components/shared/FilterPanel';
import { analysisListTour } from '../../../tools/tourSteps';
import { usePageTour } from '../../../components/shared/TourProvider';
import { FaHeartbeat, FaCheck, FaClock, FaSpinner, FaExclamationCircle } from 'react-icons/fa';
import useDocumentTitle from '../../../tools/useDocumentTitle';
import { buildFileUrl } from '../../../host/Host';
import LongTextCell from '../../../components/shared/LongTextCell';

const { Option } = Select;
const { Title, Text } = Typography;

const STATUS_COLORS = {
    0: 'default',
    1: 'processing',
    2: 'success',
    '-1': 'error',
};

const AI_STATUS_COLORS = {
    1: 'green', // Normal (Green)
    2: 'gold', // Average (Yellow/Orange)
    3: 'red', // Danger (Red)
};

export default function EcgAnalysesList() {
    // Qo'llanma qadamlari ro'yxatdan o'tkaziladi; tugma header'da
    usePageTour(analysisListTour);
    const { t } = useTranslation()
    useDocumentTitle(t('analyse_ecg', { defaultValue: "EKG tahlillari" }));
    const navigate = useNavigate();
    const { user, setecg_unread } = useStore();
    const isDoctor = user && user.roleId === 4;
    // O'chirish faqat Admin (2) va Direktor (3) uchun — backend ham shuni tekshiradi
    const isClinicManager = user && (user.roleId === 2 || user.roleId === 3);
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

    const [diagnosisMap, setDiagnosisMap] = useState([]);

    const [clinicModalVisible, setClinicModalVisible] = useState(false);
    const [selectedClinic, setSelectedClinic] = useState(null);

    // Qidiruv tugmasi bosilganda ishlatiladigan filtrlar qiymati
    const filterRef = useRef({
        search: '',
        status: null,
        aiStatus: null,
        dateRange: [null, null],
        hasDiagnosis: null
    });

    const PAGE_SIZE = 10;

    const fetchData = useCallback(async (p) => {
        setLoading(true);
        try {
            const { search, status, aiStatus, dateRange: dr, hasDiagnosis } = filterRef.current;
            const params = { page: p, pageSize: PAGE_SIZE };

            if (search) params.search = search;
            if (status !== null && status !== undefined) params.status = status;
            if (aiStatus !== null && aiStatus !== undefined) params.automaticAnalysisBool = aiStatus;
            if (dr && dr[0]) params.dateFrom = dr[0].format('YYYY-MM-DD');
            if (dr && dr[1]) params.dateTo = dr[1].format('YYYY-MM-DD');
            if (hasDiagnosis !== null) params.hasDiagnosis = hasDiagnosis;

            const res = isDoctor
                ? await get_ecg_analyses_by_doctor(params)
                : isNurse
                    ? await get_ecg_analyses_by_nurse(params)
                    : await get_ecg_analyses_by_clinic(params);

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
            mark_ecg_viewed().then(() => setecg_unread(0)).catch(() => { });
        }
    }, [page, isDoctor, fetchData]);


    // Ro'yxat va sana filtrlari DARHOL qo'llanadi. Ilgari ular ham
    // "Qidirish" tugmasi ortida edi: foydalanuvchi filtrni tanlardi,
    // jadval o'zgarmasdi va bu buzilgandek ko'rinardi.
    //
    // Erkin matnli qidiruv ataylab tugma ortida qoladi — u har bosilgan
    // harfda so'rov yuborishi kerak emas.
    const filtersApplied = useRef(false);
    useEffect(() => {
        if (!filtersApplied.current) {
            // Birinchi render: `useEffect(page)` allaqachon so'rov yuboradi
            filtersApplied.current = true;
            return;
        }
        filterRef.current = {
            ...filterRef.current,
            status: statusFilter,
            aiStatus: aiStatusFilter,
            dateRange,
            hasDiagnosis: hasDiagnosisFilter,
        };
        setPage(1);
        fetchData(1);
    }, [statusFilter, aiStatusFilter, hasDiagnosisFilter, dateRange, fetchData]);


    // ── Zaxira yangilash (T-030) ────────────────────────────────────────
    // Holat SignalR orqali darhol keladi, lekin u zanjirning eng zaif
    // bo'g'ini: server qayta ishga tushsa yoki foydalanuvchi sahifani
    // yangilasa kuzatuv yo'qoladi va tahlil ekranda "kutilmoqda" bo'lib
    // qolaveradi. Ro'yxatda tugallanmagan yozuv bo'lsa, sahifa o'zini
    // davriy yangilaydi.
    //
    // 10 soniya — foydalanuvchi sezmaydigan, lekin serverga yuk
    // bermaydigan oraliq. Tugallanmagan yozuv qolmasa so'rov to'xtaydi.
    useEffect(() => {
        const pending = data.some((x) => x.status === 0 || x.status === 1);
        if (!pending) return undefined;

        const timer = setInterval(() => {
            // Foydalanuvchi boshqa ilovaga o'tgan bo'lsa so'rov yubormaymiz
            if (document.hidden) return;
            fetchData(page);
        }, 10000);

        return () => clearInterval(timer);
    }, [data, page, fetchData]);

    const handleSearch = () => {
        // Hozirgi state dagi qiymatlarni ref ga saqlaymiz
        filterRef.current = {
            search: searchInput,
            status: statusFilter,
            aiStatus: aiStatusFilter,
            dateRange: dateRange,
            hasDiagnosis: hasDiagnosisFilter
        };
        setPage(1);
        fetchData(1);
    };

    const handleAIStatusChange = (val) => {
        setAiStatusFilter(val ?? null);
    };

    const handleStatusChange = (val) => {
        setStatusFilter(val ?? null);
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
            3: t('status_file_mismatch', { defaultValue: 'Fayl mos emas' }),
            '-1': t('status_error'),
        };
        return map[status] ?? status;
    };

    const aiStatusLabel = (st) => {
        const map = {
            1: t('normal', { defaultValue: 'Normal' }),
            2: t('avarage', { defaultValue: 'O\'rta' }),
            3: t('danger', { defaultValue: 'Xavfli' }),
        };
        return map[st] ?? st;
    };

    const columns = [
        {
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
            // EKG tasmasining kichik ko'rinishi: bir xil bemorning
            // bir necha yozuvini ko'z bilan ajratish uchun eng tez yo'l (T-097)
            title: '',
            key: 'thumb',
            width: 64,
            render: (_, row) => (row.thumbnailUrl ? (
                <img
                    src={buildFileUrl(row.thumbnailUrl)}
                    alt=""
                    loading="lazy"
                    style={{
                        width: 48, height: 34, objectFit: 'cover',
                        borderRadius: 4, border: '1px solid #E2E8F0', background: '#fff',
                    }}
                />
            ) : null),
        },
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
                // Kiritgan xodim ismi alohida ustun emas, bemor ostida kichik
                // matnda: ro'yxatdagi deyarli barcha qatorlarda bir xil qiymat
                // takrorlanardi va joyni behuda egallardi.
                const d = row.createdDoctor;
                const doctorName = d ? `${d.lastName ?? ''} ${d.firstName ?? ''}`.trim() : '';
                return (
                    <div>
                        <strong>{name || `ID: ${p.id}`}</strong>
                        {/* Hujjat raqami — bir bemorning bir necha tahlilini
                            ajratish va PDF bilan solishtirish uchun (T-097) */}
                        <div style={{ fontSize: 11, color: '#94A3B8', letterSpacing: 0.2 }}>{row.documentNumber}</div>
                        {age !== null && (
                            <span style={{ color: '#888', marginLeft: 6 }}>
                                ({age} {t('age', { defaultValue: 'yosh' })})
                            </span>
                        )}
                        {doctorName ? (
                            <div style={{ color: '#94a3b8', fontSize: 12 }}>
                                {t('created_by', { defaultValue: 'Kiritgan' })}: {doctorName}
                            </div>
                        ) : null}
                    </div>
                );
            },
        },
        {
            // Qisqacha AI xulosasi — ilgari ro'yxatda jiddiylik chipidan boshqa
            // hech narsa yo'q edi va shifokor har bir tahlilni ochishga majbur edi.
            title: t('ai_summary', { defaultValue: 'AI xulosasi (qisqacha)' }),
            dataIndex: 'aiSummary',
            key: 'aiSummary',
            width: 320,
            // Matn katakka chizilmaydi: yon panel ochilganda u uch-to'rt
            // qatorga bo'linib, qator balandligini ikki barobar oshirardi.
            // Endi ko'z tugmasi — to'liq matn modalda.
            render: (value, row) => (
                <LongTextCell
                    text={value}
                    title={t('ai_summary', { defaultValue: 'AI xulosasi (qisqacha)' })}
                />
            ),
        },

        {
            title: t('processing_status', { defaultValue: 'Tahlil holati' }),
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            // `row` kerak: xatolik sababi va "N daqiqadan beri" matni uchun
            render: (st, row) => {
                const colors = { 0: 'default', 1: 'processing', 2: 'success', 3: 'warning', '-1': 'error' };
                const icons = {
                    0: <FaClock style={{ marginRight: 4 }} />,
                    1: <FaSpinner className="ant-spin-dot-spin" style={{ marginRight: 4 }} />,
                    2: <FaCheck style={{ marginRight: 4 }} />,
                    3: <FaExclamationCircle style={{ marginRight: 4 }} />,
                    '-1': <FaExclamationCircle style={{ marginRight: 4 }} />
                };
                const tag = (
                    <Tag color={colors[st]} style={{ borderRadius: '4px', fontWeight: 500 }}>
                        {icons[st]} {statusLabel(st)}
                    </Tag>
                );

                // Xatolik sababini ko'rsatamiz — ilgari faqat "Xatolik" deb
                // yozilardi va foydalanuvchi nima bo'lganini bilmasdi (T-044)
                if (st === -1) {
                    // Sabab serverda hisoblanadi: `aiAnswerData` ro'yxat
                    // javobiga ataylab kiritilmaydi (u to'liq tibbiy xulosa)
                    const reason = parseErrorReason(row.errorReason, t);
                    // Sabab matni katakda chizilmaydi — u qatorni
                    // balandlashtirardi. Chip yonida ko'z tugmasi.
                    return (
                        <LongTextCell
                            before={tag}
                            text={reason}
                            title={t('error_reason', { defaultValue: 'Xatolik sababi' })}
                        />
                    );
                }

                // "Yuklanmoqda" holatida qancha vaqt o'tganini ko'rsatamiz:
                // muzlab qolgan yozuv shu orqali ko'zga tashlanadi
                if ((st === 0 || st === 1) && row.createdAt) {
                    const minutes = Math.floor((Date.now() - new Date(row.createdAt).getTime()) / 60000);
                    return (
                        <span>
                            {tag}
                            {minutes >= 1 ? (
                                <div style={{ fontSize: 11, color: minutes > 30 ? '#DC2626' : '#94a3b8' }}>
                                    {t('minutes_ago', { defaultValue: '{{count}} daqiqadan beri', count: minutes })}
                                </div>
                            ) : null}
                        </span>
                    );
                }

                return tag;
            }
        },
        {
            title: t('ai_result', { defaultValue: 'AI Natija' }),
            dataIndex: 'aiStatus',
            key: 'aiStatus',
            align: 'center',
            render: (st) => (
                st ? (
                    <Tag color={AI_STATUS_COLORS[st] || 'default'} style={{ borderRadius: '4px', fontWeight: 500 }}>
                        {aiStatusLabel(st)}
                    </Tag>
                ) : (
                    // AI qiymat qaytarmagan yoki qiymat 1/2/3 dan boshqa bo'lgan holat.
                    // ATAYLAB kulrang — yashil "Normal" ko'rsatish xavfli bo'lardi.
                    <Tag color="default" style={{ borderRadius: '4px', fontWeight: 500 }}>
                        {t('severity_unknown', { defaultValue: 'Baholanmadi' })}
                    </Tag>
                )
            ),
        },
        {
            title: t('diagnosis_written', { defaultValue: 'Holati' }),
            key: 'diagnosis_written',
            align: 'center',
            render: (_, row) => {
                if (row.hasDiagnosis) {
                    return (
                        <Tag color="success" style={{ borderRadius: '4px', fontWeight: 500 }}>
                            <FaCheck style={{ marginRight: 4 }} /> {t('diagnosis_written', { defaultValue: 'Tashxis yozilgan' })}
                        </Tag>
                    );
                }
                return (
                    <Tag color="default" style={{ borderRadius: '4px' }}>
                        {t('diagnosis_not_written', { defaultValue: 'Tashxis yozilmagan' })}
                    </Tag>
                );
            },
        },

        // Removed redundant diagnosis column
        {
            // Ilgari ikkita sana yonma-yon turardi va farqi tushuntirilmasdi.
            // Endi tahlil sanasi ko'rsatiladi, tizimga kiritilgan sana Tooltip da.
            title: t('analysis_date', { defaultValue: 'Tahlil sanasi' }),
            key: 'analysisDate',
            align: 'center',
            render: (_, row) => (
                <Tooltip title={`${t('created_at', { defaultValue: 'Tizimga kiritilgan' })}: ${formatDateTime(row.createdAt)}`}>
                    <span>
                        {row.analysisDate ? formatDate(row.analysisDate) : formatDate(row.createdAt)}
                        {/* Bir kunda bir necha tahlil bo'lsa faqat sana
                            ularni ajratmaydi (T-097) */}
                        <span style={{ display: 'block', fontSize: 11, color: '#94A3B8' }}>
                            {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </span>
                </Tooltip>
            ),
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
                            onClick={() => navigate(`/ecg-analyses/view/${row.id}`)}
                        >
                            <FaEye />
                        </span>
                    </Tooltip>
                    {row.status === -1 ? (
                        <RetryAnalysisButton
                            id={row.id}
                            onRetry={analyzeEkgFileRetry}
                            meta={{
                                age: row.patcient?.birthDate ? calculateAge(row.patcient.birthDate) : 0,
                                gender: row.patcient?.gender ? 'erkak' : 'ayol',
                                lang: t('data_lang') === 'Ru' ? 'ru' : t('data_lang') === 'En' ? 'en' : 'uz',
                            }}
                            onDone={() => fetchData(page)}
                        />
                    ) : null}
                    {isClinicManager ? (
                        <DeleteAnalysisButton
                            type="ecg"
                            id={row.id}
                            label={row.documentNumber}
                            onDeleted={() => fetchData(page)}
                        />
                    ) : null}
                </Space>
            ),
        },
    ];

    // Joriy sahifadagi xavfli (3-daraja) tahlillar soni

    // "Filtrlar" tugmasidagi belgi uchun — yashiringan filtr

    // yoqilganini foydalanuvchi ko'rib tursin

    const activeFilterCount = [statusFilter, aiStatusFilter, hasDiagnosisFilter]

        .filter((v) => v !== null && v !== undefined).length

        + ((dateRange[0] || dateRange[1]) ? 1 : 0);


    const dangerCount = data.filter((x) => x.aiStatus === 3).length;


    const hasActiveFilters = searchInput || statusFilter !== null || aiStatusFilter !== null || hasDiagnosisFilter !== null || (dateRange[0] || dateRange[1]);

    const handleClearFilters = () => {
        setSearchInput('');
        setStatusFilter(null);
        setAiStatusFilter(null);
        setHasDiagnosisFilter(null);
        setDateRange([null, null]);
        setPage(1);
        // `filterRef` ni ham darhol tozalaymiz. Ilgari bu yerda
        // `fetchData(1, '', null, ...)` yozilgan edi — `fetchData` esa
        // faqat bitta argument (sahifa) oladi va filtrlarni `filterRef`
        // dan o'qiydi. Ya'ni qo'shimcha argumentlar e'tiborsiz qolardi
        // va so'rov ESKI filtr bilan ketardi: "Filtrlarni tozalash"
        // bosilgandan keyin ham ro'yxat bo'sh ko'rinardi.
        filterRef.current = {
            search: '',
            status: null,
            aiStatus: null,
            dateRange: [null, null],
            hasDiagnosis: null,
        };
        fetchData(1);
    };

    return (
        <div>
            <div className="main_card">
                <h1>
                    <span>
                        {t('analyse_ecg', { defaultValue: 'EKG Tahlillar' })}

                    </span>
                    <button
                        onClick={() => navigate('/analyse-ecg')}
                        className="btn_form" data-tour="analysis-new"
                        style={{ width: 'auto', padding: '0 24px', marginTop: 0 }}
                    >
                        {t('create_new_ecg_analyse', { defaultValue: 'Yangi EKG tahlil' })}
                    </button>
                </h1>
                <div className="main_card_content big_card_content">

                    {/* Toolbar */}
                    <FilterPanel
                            activeCount={activeFilterCount}
                            onClear={handleClearFilters}
                            primary={<>
                                {/* Yorliq olib tashlandi: tugma ham "Qidirish" deyiladi
                                    va placeholder nima kiritishni aytadi — takror edi */}
                                <div className="filter_item" data-tour="analysis-search">

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
                                {/* Qidirish va eksport bir xil balandlikda,
                                    yonma-yon: ilgari ular ustma-ust turardi */}
                                <div className="filter_actions">
                                    <button onClick={handleSearch} className="btn_form">
                                        {t('search')}
                                    </button>
                                </div>
                            
                            </>}
                            secondary={
                                /* Eksport ro'yxatni toraytirmaydi, uni chiqaradi —
                                   shuning uchun qidiruv guruhidan ajratilib o'ng
                                   chekkaga chiqarildi. */
                                    isClinicManager ? (
                                        <ExportButton
                                            type="ecg"
                                            filters={{
                                                search: filterRef.current.search,
                                                status: filterRef.current.status,
                                                aiStatus: filterRef.current.aiStatus,
                                                dateFrom: filterRef.current.dateRange?.[0]?.startOf('day')?.toISOString(),
                                                dateTo: filterRef.current.dateRange?.[1]?.endOf('day')?.toISOString(),
                                            }}
                                        />
                                    ) : null
                            }
                                                    >
                            <Col xs={24} sm={24} md={12} lg={8} xl={4}>
                                <div className="filter_item" data-tour="analysis-date">
                                    <label className="filter_label">{t("date_filter")}</label>
                                    <DatePicker.RangePicker
                                        className="login_input"
                                        value={dateRange[0] || dateRange[1] ? dateRange : null}
                                        onChange={handleDateRangeChange}
                                        placeholder={[t('date_from'), t('date_to')]}
                                        format="DD.MM.YYYY"
                                        style={{ width: '100%' }}
                                        allowEmpty={[true, true]}
                                        allowClear
                                        onClear={() => {
                                            setDateRange([null, null]);
                                            filterRef.current.dateRange = [null, null];
                                            setPage(1);
                                            fetchData(1);
                                        }}
                                    />
                                </div>
                            </Col>
                            <Col xs={24} sm={24} md={12} lg={8} xl={4}>
                                <div className="filter_item" data-tour="analysis-status">
                                    <label className="filter_label">{t('processing_status')}</label>
                                    <Select
                                        className="login_input custom_select"
                                        placeholder={t('processing_status')}
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
                            <Col xs={24} sm={24} md={12} lg={8} xl={4}>
                                <div className="filter_item" data-tour="analysis-ai-filter">
                                    <label className="filter_label">{t('filter_by_ai', { defaultValue: 'AI bo\'yicha' })}</label>
                                    <Select
                                        className="login_input custom_select"
                                        placeholder={t('filter_by_ai', { defaultValue: 'AI bo\'yicha' })}
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
                                        <Option value={1}>{t('normal', { defaultValue: 'Normal' })}</Option>
                                        <Option value={2}>{t('avarage', { defaultValue: 'O\'rta' })}</Option>
                                        <Option value={3}>{t('danger', { defaultValue: 'Xavfli' })}</Option>
                                    </Select>
                                </div>
                            </Col>
                            <Col xs={24} sm={24} md={12} lg={8} xl={4}>
                                <div className="filter_item">
                                    <label className="filter_label">{t('diagnosis_written', { defaultValue: 'Tashxis holati' })}</label>
                                    <Select
                                        className="login_input custom_select"
                                        placeholder={t('diagnosis_written', { defaultValue: 'Tashxis holati' })}
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
                                        <Option value={true}>{t('diagnosis_written', { defaultValue: 'Tashxis yozilgan' })}</Option>
                                        <Option value={false}>{t('diagnosis_not_written', { defaultValue: 'Tashxis yozilmagan' })}</Option>
                                    </Select>
                                </div>
                            </Col>
                        </FilterPanel>
                    <div className="doctors_table" data-tour="analysis-table">
                        <Table
                            // Jadval keng bo'lsa gorizontal aylantirish — ilgari ortiqcha
                            // ustunlar shunchaki kesilardi va ularga yetib bo'lmasdi
                            scroll={{ x: "max-content" }}
                            rowKey="id"
                            loading={loading}
                            dataSource={data}
                            columns={columns}
                            // Qator bosilsa ko'rish sahifasi ochiladi — tor ekranlarda
                            // "ko'z" tugmasi gorizontal skroll ortida qolib ketardi
                            onRow={(row) => ({
                                onClick: () => navigate(`/ecg-analyses/view/${row.id}`),
                                style: { cursor: 'pointer' },
                            })}
                            rowClassName={(row) => [
                                (!row.isViewed && isDoctor) ? 'table_row_unviewed' : '',
                                row.aiStatus === 3 ? 'table_row_danger' : '',
                            ].filter(Boolean).join(' ')}
                            locale={{
                                emptyText: (
                                    // Filtr yoqilgan bo'lsa bo'shlikning sababi boshqa —
                                    // ro'yxat bo'sh emas, shunchaki filtrga hech narsa mos
                                    // kelmagan. Bularni ajratmaslik T-019 dagi 'ma'lumot
                                    // yo'qolibdi' degan taassurotni keltirib chiqaradi.
                                    activeFilterCount > 0 ? (
                                        <EmptyState
                                            icon={<FaHeartbeat />}
                                            message={t('empty_filtered', { defaultValue: 'Filtrga mos natija topilmadi' })}
                                            hint={t('empty_filtered_hint', { defaultValue: 'Tanlangan sana oralig\'i yoki holat bo\'yicha yozuv yo\'q. Filtrlarni tekshirib ko\'ring.' })}
                                            actionLabel={t('clear_filters', { defaultValue: 'Filtrlarni tozalash' })}
                                            onAction={handleClearFilters}
                                        />
                                    ) : (
                                        <EmptyState
                                            icon={<FaHeartbeat />}
                                            message={t('no_ecg_analyses', { defaultValue: 'Hech qanday EKG tahlil topilmadi' })}
                                            actionLabel={t('new_ecg_analyse', { defaultValue: 'Yangi EKG tahlil' })}
                                            actionPath="/analyse-ecg"
                                        />
                                    )
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
