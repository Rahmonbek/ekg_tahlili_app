import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Modal, Skeleton, Tag, message } from 'antd'
import {
    ArrowLeftOutlined, CalendarOutlined, CheckOutlined, DashboardOutlined, DownOutlined,
    EnvironmentOutlined, ExperimentOutlined, FieldTimeOutlined, FileTextOutlined, HeartOutlined,
    IdcardOutlined, LineChartOutlined, PhoneOutlined, RightOutlined, RobotOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { FaUserInjured } from 'react-icons/fa'
import { get_patient_card } from '../../../../host/requests/PatcientRequest'
import {
    create_combined_analysis,
    get_combined_analyses_by_patient,
    get_combined_analysis,
} from '../../../../host/requests/CombinedAnalysisRequest'
import CombinedResult, { CombinedAutoBadge } from '../../../../components/results/CombinedResult'
import { calculateAge, formatDate, formatDateTime, formatPhoneNumberForForm, personName } from '../../../../tools/formatters'
import { parseSeverity, SEVERITY, severityLabel } from '../../../../tools/severity'
import EmptyState from '../../../../components/shared/EmptyState'
import { patientCardTour } from '../../../../tools/tourSteps'
import { usePageTour } from '../../../../components/shared/TourProvider'
import useDocumentTitle from '../../../../tools/useDocumentTitle'
import LabDynamicsChart from '../../../../components/results/LabDynamicsChart'
import './PatcientCard.css'

/**
 * Bemor kartasi — bitta bemorning barcha tahlillari yagona xronologik lentada.
 *
 * Ilgari platformada bemorga oid hech qanday umumiy ko'rinish yo'q edi: EKG,
 * Holter, SMAD, Laboratoriya va shifokor xulosalari beshta alohida ro'yxatda
 * yashiringan edi va shifokor bir bemorning tarixini ko'rish uchun beshta
 * sahifani qo'lda kezib chiqishi kerak edi.
 *
 * Tuzilish (yuqoridan pastga — eng ko'p kerak bo'ladigani birinchi):
 *  1. Profil — ism, yosh/jins va aloqa ma'lumotlari yorliqlar ko'rinishida.
 *  2. Tahlil turlari plitkalari — soni ko'rinadi VA bosilganda tarix shu
 *     tur bo'yicha filtrlanadi (ilgari raqamlar faqat ko'rsatilardi).
 *  3. Tahlillar tarixi — kartochkalar. Kompleks AI uchun tanlash —
 *     yopishqoq panel: tanlangan soni va tugma doim ko'rinadi (ilgari
 *     tugma jadval sarlavhasida kichik bo'lib turardi).
 *  4. Kompleks AI xulosalari — o'sha joyda ochiladi.
 *  5. Ko'rsatkich dinamikasi.
 *
 * Ilgari jadvallar tor ekranda gorizontal aylantirishni talab qilardi.
 */

/** Tahlil turi → ko'rish sahifasi, nomi, ikonka va rang. */
const TYPE_META = {
    ecg: { path: 'ecg-analyses', key: 'analyse_ecg', short: 'EKG', icon: <HeartOutlined />, tone: 'ecg' },
    holter: { path: 'holter-analyses', key: 'analyse_holter', short: 'Holter', icon: <FieldTimeOutlined />, tone: 'holter' },
    smad: { path: 'smad-analyses', key: 'analyse_smad', short: 'SMAD', icon: <DashboardOutlined />, tone: 'smad' },
    lab: { path: 'lab-analyses', key: 'analyse_lab', short: 'Lab', icon: <ExperimentOutlined />, tone: 'lab' },
    diagnose: { path: 'patient-diagnoses', key: 'patient_diagnostics', short: 'Xulosa', icon: <FileTextOutlined />, tone: 'diagnose' },
}

/** Kartadagi soni maydoni — tur bo'yicha. */
const COUNT_FIELD = { ecg: 'ecgCount', holter: 'holterCount', smad: 'smadCount', lab: 'labCount', diagnose: 'diagnoseCount' }

/**
 * Kompleks AI tahliliga qo'shish mumkin bo'lgan turlar.
 * Shifokor xulosasi (`diagnose`) AI natijasi emas, shuning uchun yo'q.
 */
const COMBINABLE_TYPES = ['ecg', 'holter', 'smad', 'lab']

/** Kompleks tahlildagi tahlillar soni chegarasi (backend bilan bir xil). */
const COMBINE_MIN = 2
const COMBINE_MAX = 10

/** Tarix ro'yxati shuncha-shuncha ochiladi. */
const PAGE_SIZE = 10

const SEVERITY_MOD = {
    [SEVERITY.NORMAL]: 'normal',
    [SEVERITY.AVERAGE]: 'average',
    [SEVERITY.DANGER]: 'danger',
}

const rowKey = (row) => `${row.type}-${row.id}`

/** Tahlil holati (int) → qisqa yorliq. Tayyor (2) bo'lsa jiddiylik ko'rsatiladi. */
function statusText(status, t) {
    switch (status) {
        case 3: return [t('file_type_mismatch_short', { defaultValue: 'Fayl mos emas' }), 'warning']
        case -1: return [t('error', { defaultValue: 'Xatolik' }), 'danger']
        case 1: return [t('ai_processing', { defaultValue: 'AI tahlil qilmoqda' }), 'progress']
        case 0: return [t('waiting', { defaultValue: 'Kutmoqda' }), 'unknown']
        default: return null
    }
}

/** Jiddiylik yoki holat yorlig'i (bitta "pill"). */
function ResultPill({ status, severity, t }) {
    if (status === 2 || status == null) {
        if (severity == null) {
            return status === 2
                ? <span className="ptc-pill ptc-pill--unknown">{severityLabel(null, t)}</span>
                : null
        }
        const mod = SEVERITY_MOD[parseSeverity(severity)] ?? 'unknown'
        return <span className={`ptc-pill ptc-pill--${mod}`}>{severityLabel(severity, t)}</span>
    }
    const info = statusText(status, t)
    return info ? <span className={`ptc-pill ptc-pill--${info[1]}`}>{info[0]}</span> : null
}

export default function PatcientCard() {
    // Qo'llanma qadamlari ro'yxatdan o'tkaziladi; tugma header'da
    usePageTour(patientCardTour)
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { id } = useParams()

    const [card, setCard] = useState(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)

    // ── Tarix: filtr va sahifalash ──────────────────────────────────────
    const [typeFilter, setTypeFilter] = useState('all')
    const [visible, setVisible] = useState(PAGE_SIZE)

    // ── Kompleks (ko'p tahlilli) AI xulosasi ─────────────────────────────
    const [selectedKeys, setSelectedKeys] = useState([])
    const [combinedList, setCombinedList] = useState([])
    const [combineOpen, setCombineOpen] = useState(false)
    const [combining, setCombining] = useState(false)
    // Ochilgan kompleks xulosalar va ularning to'liq mazmuni.
    // Ro'yxat endpointi javob matnini qaytarmaydi (ro'yxat og'irlashmasin),
    // shuning uchun kartochka ochilganda alohida so'raladi va keshlanadi.
    const [expandedCombined, setExpandedCombined] = useState(null)
    const [combinedDetails, setCombinedDetails] = useState({})

    // Bemor kartasi yorlig'i bemor ismi bilan nomlanadi
    useDocumentTitle(
        card
            ? [card.lastName, card.firstName].filter(Boolean).join(' ')
            : t('patcients', { defaultValue: 'Bemorlar' })
    )

    const lang = t('data_lang') === 'Ru' ? 'ru' : t('data_lang') === 'En' ? 'en' : 'uz'

    const fetchCard = useCallback(async () => {
        setLoading(true)
        try {
            const res = await get_patient_card(id, { lang })
            setCard(res?.data ?? null)
            setNotFound(false)
        } catch (err) {
            setCard(null)
            setNotFound(true)
        } finally {
            setLoading(false)
        }
    }, [id, lang])

    const fetchCombined = useCallback(async () => {
        try {
            const res = await get_combined_analyses_by_patient(id)
            setCombinedList(Array.isArray(res?.data) ? res.data : [])
        } catch (err) {
            // Kompleks xulosalar — qo'shimcha ma'lumot: ular yuklanmasa ham
            // bemor kartasi ochilishi kerak
            setCombinedList([])
        }
    }, [id])

    useEffect(() => { fetchCard() }, [fetchCard])
    useEffect(() => { fetchCombined() }, [fetchCombined])

    const timeline = useMemo(() => card?.timeline ?? [], [card])
    const filtered = typeFilter === 'all' ? timeline : timeline.filter((row) => row.type === typeFilter)
    const shown = filtered.slice(0, visible)

    /** Tanlangan qatorlar — `type-id` kalitidan qayta tiklanadi. */
    const selectedItems = useMemo(() => selectedKeys
        .map((key) => timeline.find((row) => rowKey(row) === key))
        .filter(Boolean)
        .map((row) => ({ type: row.type, id: row.id })), [selectedKeys, timeline])
    const limitReached = selectedItems.length >= COMBINE_MAX
    const canCombine = selectedItems.length >= COMBINE_MIN && selectedItems.length <= COMBINE_MAX

    const toggleSelect = (row) => {
        const key = rowKey(row)
        setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
    }

    const changeFilter = (type) => {
        setTypeFilter((prev) => (prev === type ? 'all' : type))
        setVisible(PAGE_SIZE)
    }

    /** Kompleks xulosa kartochkasini ochadi va mazmunini (bir marta) yuklaydi. */
    const toggleCombined = useCallback(async (combinedId) => {
        setExpandedCombined((prev) => (prev === combinedId ? null : combinedId))
        if (combinedDetails[combinedId]) return
        try {
            const res = await get_combined_analysis(combinedId)
            setCombinedDetails((prev) => ({ ...prev, [combinedId]: res?.data ?? null }))
        } catch (err) {
            // Bitta xulosa ochilmasa qolganlari ishlashda davom etadi
            setCombinedDetails((prev) => ({ ...prev, [combinedId]: null }))
        }
    }, [combinedDetails])

    const startCombine = async () => {
        setCombining(true)
        try {
            // Rejim tanlovi yo'q — kompleks tahlil doim chuqur bajariladi
            const res = await create_combined_analysis({
                patientId: Number(id),
                items: selectedItems,
                lang,
            })
            const combinedId = res?.data?.combined_id
            setCombineOpen(false)
            setSelectedKeys([])
            if (res?.data?.reused) {
                // Takror yaratilmadi — mavjudi ochiladi. Foydalanuvchi nima
                // uchun yangi xulosa chiqmaganini bilishi kerak.
                message.warning(t('combined_duplicate', {
                    defaultValue: 'Bu tahlillar allaqachon AI ga birgalikda yuborilgan. Mavjud xulosa ochildi.',
                }), 6)
            }
            if (combinedId) navigate(`/combined-analyses/view/${combinedId}`)
        } catch (err) {
            message.error(
                err?.response?.data?.message
                || t('combined_failed', { defaultValue: 'Kompleks tahlil bajarilmadi. Qayta urinib ko\'ring.' })
            )
        } finally {
            setCombining(false)
        }
    }

    if (loading) {
        return (
            <div className="ptc">
                <div className="ptc-panel"><Skeleton active avatar paragraph={{ rows: 2 }} /></div>
                <div className="ptc-panel"><Skeleton active paragraph={{ rows: 6 }} /></div>
            </div>
        )
    }

    if (notFound || !card) {
        return (
            <div className="ptc">
                <div className="ptc-panel">
                    <EmptyState
                        icon={<FaUserInjured />}
                        message={t('patient_not_found', { defaultValue: 'Bemor topilmadi yoki sizda ko\'rish huquqi yo\'q' })}
                    />
                    <div style={{ textAlign: 'center' }}>
                        <Button onClick={() => navigate('/patcients')} icon={<ArrowLeftOutlined />}>
                            {t('back', { defaultValue: 'Orqaga' })}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    const fio = personName(card)
    const address = [card.regionName, card.districtName, card.address].filter(Boolean).join(', ')
    const age = card.birthDate ? calculateAge(card.birthDate) : null
    const lastDate = timeline.reduce((max, row) => {
        const d = row.analysisDate || row.createdAt
        return d && (!max || d > max) ? d : max
    }, null)

    const renderRow = (row) => {
        const meta = TYPE_META[row.type] ?? { short: row.type, icon: <FileTextOutlined />, tone: 'diagnose' }
        const key = rowKey(row)
        const selectable = COMBINABLE_TYPES.includes(row.type) && row.status === 2
        const selected = selectedKeys.includes(key)
        const date = row.analysisDate
            ? formatDate(row.analysisDate)
            : row.createdAt ? formatDateTime(row.createdAt) : '—'
        const open = () => { if (meta.path) navigate(`/${meta.path}/view/${row.id}`) }

        return (
            <li key={key} className={`ptc-row ${selected ? 'is-selected' : ''}`}>
                {/* Kompleks AI uchun tanlash — faqat AI natijasi tayyor tahlillar */}
                <button
                    type="button"
                    className="ptc-check"
                    aria-pressed={selected}
                    aria-label={t('select', { defaultValue: 'Tanlash' })}
                    disabled={!selectable || (!selected && limitReached)}
                    title={!selectable ? t('combine_hint', { defaultValue: 'Faqat AI natijasi tayyor bo\'lgan tahlillarni birlashtirish mumkin.' }) : undefined}
                    onClick={() => toggleSelect(row)}
                >
                    {selected && <CheckOutlined />}
                </button>

                <button type="button" className="ptc-row-main" onClick={open}>
                    <span className={`ptc-type ptc-type--${meta.tone}`} aria-hidden="true">{meta.icon}</span>
                    <span className="ptc-row-text">
                        <span className="ptc-row-title">
                            {meta.key ? t(meta.key, { defaultValue: meta.short }) : meta.short}
                            {row.documentNumber && <span className="ptc-row-doc">{row.documentNumber}</span>}
                        </span>
                        <span className="ptc-row-meta">
                            <span><CalendarOutlined /> {date}</span>
                            {row.doctorName && <span>{row.doctorName}</span>}
                        </span>
                    </span>
                    <span className="ptc-row-side">
                        <ResultPill status={row.status} severity={row.severity} t={t} />
                        <RightOutlined className="ptc-row-arrow" />
                    </span>
                </button>
            </li>
        )
    }

    return (
        <div className="ptc">
            {/* ═══════ 1. Profil ═══════ */}
            <section className="ptc-panel ptc-profile" data-tour="card-info">
                <Button className="ptc-back" type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/patcients')}>
                    {t('back', { defaultValue: 'Orqaga' })}
                </Button>
                <div className="ptc-profile-main">
                    <div className="ptc-avatar" aria-hidden="true">{(card.lastName || '?').charAt(0)}</div>
                    <div className="ptc-profile-text">
                        <h1 className="ptc-name">{fio}</h1>
                        <div className="ptc-sub">
                            {age != null && <span>{age} {t('age', { defaultValue: 'yosh' })}</span>}
                            <span>{card.gender ? t('male', { defaultValue: 'Erkak' }) : t('female', { defaultValue: 'Ayol' })}</span>
                            {card.birthDate && <span>{formatDate(card.birthDate)}</span>}
                        </div>
                    </div>
                </div>
                <div className="ptc-facts">
                    <span className="ptc-fact"><PhoneOutlined />{card.phone ? formatPhoneNumberForForm(card.phone) : '—'}</span>
                    <span className="ptc-fact"><IdcardOutlined />{card.passportMasked || '—'}</span>
                    {address && <span className="ptc-fact ptc-fact--wide"><EnvironmentOutlined />{address}</span>}
                    {lastDate && (
                        <span className="ptc-fact">
                            <CalendarOutlined />
                            {t('last_analysis', { defaultValue: 'Oxirgi tahlil' })}: {formatDate(lastDate)}
                        </span>
                    )}
                </div>
            </section>

            {/* ═══════ 2. Tahlil turlari (filtr ham) ═══════ */}
            <div className="ptc-stats" data-tour="card-counts">
                {Object.entries(TYPE_META).map(([type, meta]) => (
                    <button
                        key={type}
                        type="button"
                        className={`ptc-stat ptc-stat--${meta.tone} ${typeFilter === type ? 'is-active' : ''}`}
                        aria-pressed={typeFilter === type}
                        onClick={() => changeFilter(type)}
                    >
                        <span className="ptc-stat-icon">{meta.icon}</span>
                        <span className="ptc-stat-value">{card[COUNT_FIELD[type]] ?? 0}</span>
                        <span className="ptc-stat-label">{t(meta.key, { defaultValue: meta.short })}</span>
                    </button>
                ))}
            </div>

            {/* ═══════ 3. Tahlillar tarixi ═══════ */}
            <section className="ptc-panel" data-tour="card-timeline">
                <header className="ptc-panel-head">
                    <h2 className="ptc-panel-title">
                        {t('analyse_history', { defaultValue: 'Tahlillar tarixi' })}
                        <span className="ptc-count">{filtered.length}</span>
                    </h2>
                    {typeFilter !== 'all' && (
                        <Tag closable onClose={() => changeFilter(typeFilter)} className="ptc-filter-tag">
                            {t(TYPE_META[typeFilter].key, { defaultValue: TYPE_META[typeFilter].short })}
                        </Tag>
                    )}
                </header>

                {/* Kompleks AI: tanlov paneli — tanlash boshlanganda yopishqoq bo'ladi */}
                <div className={`ptc-combine ${selectedItems.length > 0 ? 'is-active' : ''}`}>
                    <RobotOutlined className="ptc-combine-icon" />
                    <span className="ptc-combine-text">
                        {selectedItems.length === 0
                            ? t('combine_pick_hint', { defaultValue: 'Kompleks AI xulosasi uchun 2–10 ta tayyor tahlilni belgilang' })
                            : t('combine_selected', {
                                count: selectedItems.length,
                                defaultValue: `Tanlandi: ${selectedItems.length} / ${COMBINE_MAX}`,
                            })}
                    </span>
                    {selectedItems.length > 0 && (
                        <Button type="link" onClick={() => setSelectedKeys([])}>
                            {t('cancel', { defaultValue: 'Bekor qilish' })}
                        </Button>
                    )}
                    <Button
                        type="primary"
                        icon={<ExperimentOutlined />}
                        disabled={!canCombine}
                        onClick={() => setCombineOpen(true)}
                    >
                        {t('combine_with_ai', { defaultValue: 'Birgalikda AI tahlil qilish' })}
                    </Button>
                </div>

                {filtered.length === 0 ? (
                    <EmptyState
                        icon={<FaUserInjured />}
                        message={t('no_analyses', { defaultValue: 'Tahlillar topilmadi' })}
                    />
                ) : (
                    <>
                        <ul className="ptc-list">{shown.map(renderRow)}</ul>
                        {filtered.length > visible && (
                            <Button className="ptc-more" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                                {t('combined_upload_show_more', { defaultValue: 'Yana ko\'rsatish' })} ({filtered.length - visible})
                            </Button>
                        )}
                    </>
                )}
            </section>

            {/* ═══════ 4. Kompleks AI xulosalari ═══════ */}
            {combinedList.length > 0 && (
                <section className="ptc-panel">
                    <header className="ptc-panel-head">
                        <h2 className="ptc-panel-title">
                            <RobotOutlined /> {t('combined_analyses', { defaultValue: 'Kompleks AI xulosalari' })}
                            <span className="ptc-count">{combinedList.length}</span>
                        </h2>
                    </header>
                    <ul className="ptc-list">
                        {combinedList.map((row) => {
                            const isOpen = expandedCombined === row.id
                            const types = [...new Set((row.items ?? []).map((i) => i.type))]
                            return (
                                <li key={row.id} className={`ptc-combined ${isOpen ? 'is-open' : ''}`}>
                                    <button
                                        type="button"
                                        className="ptc-row-main"
                                        aria-expanded={isOpen}
                                        onClick={() => toggleCombined(row.id)}
                                    >
                                        <span className="ptc-type ptc-type--ai" aria-hidden="true"><RobotOutlined /></span>
                                        <span className="ptc-row-text">
                                            <span className="ptc-row-title">
                                                {t('combined_n_analyses', {
                                                    count: row.itemCount,
                                                    defaultValue: `${row.itemCount} ta tahlil`,
                                                })}
                                                <CombinedAutoBadge isAuto={row.isAuto} />
                                                <span className="ptc-type-chips">
                                                    {types.map((type) => (
                                                        <span key={type} className={`ptc-mini ptc-mini--${TYPE_META[type]?.tone ?? 'diagnose'}`}>
                                                            {TYPE_META[type]?.short ?? type}
                                                        </span>
                                                    ))}
                                                </span>
                                            </span>
                                            <span className="ptc-row-meta">
                                                <span><CalendarOutlined /> {row.createdAt ? formatDateTime(row.createdAt) : '—'}</span>
                                                {row.doctorName && <span>{row.doctorName}</span>}
                                            </span>
                                        </span>
                                        <span className="ptc-row-side">
                                            <ResultPill status={row.status} severity={row.aiStatus} t={t} />
                                            <DownOutlined className={`ptc-row-arrow ${isOpen ? 'is-open' : ''}`} />
                                        </span>
                                    </button>
                                    {isOpen && (
                                        <div className="ptc-combined-body">
                                            {combinedDetails[row.id] === undefined
                                                ? <Skeleton active paragraph={{ rows: 4 }} />
                                                : <CombinedResult data={combinedDetails[row.id]} embedded />}
                                            <div className="ptc-combined-actions">
                                                <Button onClick={() => navigate(`/combined-analyses/view/${row.id}`)}>
                                                    {t('open_full', { defaultValue: 'To\'liq sahifada ochish' })}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </section>
            )}

            {/* ═══════ 5. Ko'rsatkich dinamikasi ═══════ */}
            {/* Bemor kartasi — dinamikaning eng tabiiy joyi: bu yerda savol
                aynan "bu bemorda ko'rsatkich qanday o'zgardi" bo'ladi. Kamida
                ikkita o'lchov bo'lmasa komponent o'zi bo'sh holatni ko'rsatadi (T-035). */}
            <section className="ptc-panel">
                <header className="ptc-panel-head">
                    <h2 className="ptc-panel-title">
                        <LineChartOutlined /> {t('indicator_dynamics', { defaultValue: "Ko'rsatkich dinamikasi" })}
                    </h2>
                </header>
                <LabDynamicsChart patcientId={card.patcient?.id ?? Number(id)} showTitle={false} />
            </section>

            <Modal
                open={combineOpen}
                title={t('combine_with_ai', { defaultValue: 'Birgalikda AI tahlil qilish' })}
                okText={t('send_to_ai', { defaultValue: 'AI ga yuborish' })}
                cancelText={t('cancel', { defaultValue: 'Bekor qilish' })}
                confirmLoading={combining}
                onOk={startCombine}
                onCancel={() => setCombineOpen(false)}
            >
                <p>
                    {t('combine_confirm', {
                        defaultValue: 'Tanlangan {{count}} ta tahlil AI ga birgalikda yuboriladi va yagona yakuniy xulosa olinadi.',
                        count: selectedItems.length,
                    })}
                </p>
                <Alert
                    type="info"
                    showIcon
                    style={{ marginTop: 12 }}
                    message={t('combine_hint', {
                        defaultValue: 'Faqat AI natijasi tayyor bo\'lgan tahlillarni birlashtirish mumkin.',
                    })}
                    description={t('combine_deep_note', {
                        defaultValue: 'Tahlillarning AI xulosalari bilan birga EKG rasmlari ham AI ga yuboriladi, shuning uchun javob bir necha daqiqa olishi mumkin.',
                    })}
                />
            </Modal>
        </div>
    )
}
