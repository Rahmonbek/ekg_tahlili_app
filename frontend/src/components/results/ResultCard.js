import React, { useEffect, useState } from 'react';
import { Button, Image } from 'antd';
import { DownOutlined, RobotOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import parseAiResult from '../../tools/aiResult';
import { calculateAge, formatDate } from '../../tools/formatters';
import { parseSeverity, SEVERITY, severityLabel } from '../../tools/severity';
import { dangerAlert, successAlert, warningAlert } from '../../tools/Alerts';
import { analyzeEkgFileRetry, retryAnalysis } from '../../host/EkgService';
import { buildFileUrl } from '../../host/Host';
import AnalysisResultBody from './AnalysisResultBody';
import ClinicHeader from './ClinicHeader';
import './AnalysisResult.css';

const SEVERITY_MOD = {
    [SEVERITY.NORMAL]: 'normal',
    [SEVERITY.AVERAGE]: 'average',
    [SEVERITY.DANGER]: 'danger',
    [SEVERITY.UNKNOWN]: 'unknown',
};

/** Shifokor nomi (rol bilan) — `{ role, lastName, firstName }`. */
function doctorText(doctor, t) {
    if (!doctor) return '';
    const name = `${doctor.lastName ?? ''} ${doctor.firstName ?? ''}`.trim();
    const role = doctor.role?.[`name${t('data_lang')}`];
    return role ? `${name} (${role})` : name;
}

/** EKG `analyze-retry` javobidan natijani o'qiydi (sinxron endpoint). */
function parseEcgRetry(res) {
    const raw = res?.ai_response?.raw ?? res?.ai_response;
    try {
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
        return raw;
    }
}

/**
 * Bitta tahlil natijasi kartochkasi — EKG, Holter, SMAD va Laboratoriya
 * uchun umumiy.
 *
 * Ilgari har tur uchun alohida `XOldResult.js` bor edi (4 ta deyarli bir
 * xil fayl). Ulardagi "AI orqali tekshirish" tugmasi Holter, SMAD va
 * Laboratoriyada ham EKG ning `analyze-retry` endpoint'ini chaqirardi —
 * ya'ni lab tahlilining id si bilan BOSHQA (EKG) tahlilni qayta ishga
 * tushirib yuborishi mumkin edi. Endi har tur o'z `/retry` endpoint'iga
 * murojaat qiladi.
 *
 * Ikki ko'rinish:
 *  * **yig'iluvchi** (ro'yxat, "oldingi tahlillar", konsultatsiya) — sarlavha
 *    qatorida sana, hujjat raqami va jiddiylik; bosilganda ochiladi;
 *  * **ochiq** (`showMeta={false}` + `initialOpen` — ko'rish sahifasi) —
 *    sarlavha qatori yo'q: sana, shifokor va holat sahifa sarlavhasida
 *    allaqachon bor, takrorlash faqat joy egallardi.
 *
 * @param {'ecg'|'holter'|'smad'|'lab'} kind
 * @param {object}  data         tahlil DTO si
 * @param {Array<{label:string, value:string}>} [metaRows]  turga xos qo'shimcha qatorlar
 * @param {string}  [image]      asl fayl / EKG rasmi havolasi
 * @param {string}  [imageShort] EKG eskizi
 */
export default function ResultCard({
    kind,
    data,
    initialOpen = false,
    showMeta = true,
    metaRows = [],
    image: initialImage,
    imageShort: initialImageShort,
}) {
    const { t, i18n } = useTranslation();
    const [open, setOpen] = useState(initialOpen);
    const [result, setResult] = useState(null);
    const [image, setImage] = useState(initialImage);
    const [imageShort, setImageShort] = useState(initialImageShort);
    const [retrying, setRetrying] = useState(false);
    const [retrySent, setRetrySent] = useState(false);

    useEffect(() => {
        setResult(parseAiResult(data?.aiAnswerData));
    }, [data?.aiAnswerData]);
    useEffect(() => { setImage(initialImage); }, [initialImage]);
    useEffect(() => { setImageShort(initialImageShort); }, [initialImageShort]);

    if (!data) return null;

    const severity = result != null && typeof result === 'object'
        ? parseSeverity(result.automatic_analysis_bool)
        : SEVERITY.UNKNOWN;
    const mod = result != null ? SEVERITY_MOD[severity] : 'unknown';
    const bare = initialOpen && !showMeta;

    // AI natijasi umuman yo'q. Holter/SMAD/Lab da 0/1 holat — AI hozir
    // ishlayapti, qayta yuborish ikkinchi parallel tahlilni boshlab yuborardi.
    // EKG da 1 — "faqat saqlangan" (AI kutmoqda), u yerda tugma kerak.
    const inProgress = kind !== 'ecg' && (data.status === 0 || data.status === 1);
    const canRequestAi = data.aiAnswerData == null && result == null && !inProgress && !retrySent;

    const requestAi = async () => {
        const formData = new FormData();
        (data.complaints ?? []).forEach((f) => formData.append('complaint', f.nameUz));
        if (data.patcient) {
            formData.append('gender', data.patcient.gender ? 'erkak' : 'ayol');
            formData.append('age', calculateAge(data.patcient.birthDate));
        }
        formData.append('lang', (i18n.language || 'uz').slice(0, 2));
        formData.append('id', data.id);

        setRetrying(true);
        try {
            if (kind === 'ecg') {
                warningAlert(t('please_wait'));
                const res = await analyzeEkgFileRetry(formData);
                setResult(parseEcgRetry(res));
                // `ecg_png_base64` nomi aldamchi — qiymat fayl yo'li (T-084)
                setImage(res.ecg_image_url ?? res.ecg_png_base64 ?? image);
                setImageShort(res.ecg_thumbnail_url ?? res.ecg_png_base64_short ?? imageShort);
            } else {
                await retryAnalysis(kind)(formData);
                setRetrySent(true);
                successAlert(t('analysis_resent', {
                    defaultValue: 'Tahlil AI ga yuborildi — natija tayyor bo\'lganda xabar beriladi.',
                }));
            }
        } catch {
            dangerAlert(t('api_error'));
        } finally {
            setRetrying(false);
        }
    };

    const doctorRows = [];
    if (showMeta && data.createdDoctor) {
        doctorRows.push({ label: t('doctor_of_created'), value: doctorText(data.createdDoctor, t) });
    }
    if (showMeta && data.doctors?.length) {
        doctorRows.push({
            label: t('doctor_of_patcient'),
            value: data.doctors.map((d) => doctorText(d, t)).filter(Boolean).join(', '),
        });
    }
    const rows = [...doctorRows, ...metaRows].filter((r) => r.value);

    const content = (
        <div className="rcard-body">
            {showMeta && <ClinicHeader clinic={data.clinic} />}

            {rows.length > 0 && (
                <dl className="rcard-meta">
                    {rows.map((row) => (
                        <div key={row.label} className="rcard-meta-row">
                            <dt>{row.label}</dt>
                            <dd>{row.value}</dd>
                        </div>
                    ))}
                </dl>
            )}

            {canRequestAi && (
                <div className="rcard-empty">
                    <span>{t('not_analysed')}</span>
                    <Button type="primary" icon={<RobotOutlined />} loading={retrying} onClick={requestAi}>
                        {kind === 'ecg'
                            ? t('check_by_ai')
                            : t('request_ai_analysis', { defaultValue: 'AI orqali tahlil qilish' })}
                    </Button>
                </div>
            )}
            {retrySent && (
                <div className="rcard-empty">
                    <span>{t('analysis_resent', { defaultValue: 'Tahlil AI ga yuborildi — natija tayyor bo\'lganda xabar beriladi.' })}</span>
                </div>
            )}

            {/* EKG "faqat saqlangan" (AI hali yo'q): rasm natija tanasida
                chiqmaydi, shuning uchun shu yerda ko'rsatiladi */}
            {kind === 'ecg' && result == null && image && (
                <div className="ekg-image arb-ecg-image">
                    <Image
                        style={{ width: '100%', borderRadius: '8px' }}
                        preview={{ src: buildFileUrl(image) }}
                        src={buildFileUrl(image)}
                        placeholder={imageShort ? (
                            <Image preview={false} src={buildFileUrl(imageShort)} style={{ width: '100%' }} />
                        ) : undefined}
                    />
                </div>
            )}

            <AnalysisResultBody
                kind={kind}
                result={result}
                image={image}
                imageShort={imageShort}
                files={data.files}
                gender={data.patcient?.gender}
            />
        </div>
    );

    if (bare) return <div className="rcard rcard--bare">{content}</div>;

    const date = data.analysisDate ?? data.createdAt;
    return (
        <div className={`rcard rcard--${mod} ${open ? 'is-open' : ''}`}>
            <button
                type="button"
                className="rcard-head"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
            >
                <span className="rcard-head-main">
                    <span className="rcard-date">{date ? formatDate(date) : '—'}</span>
                    {data.documentNumber && <span className="rcard-doc">{data.documentNumber}</span>}
                </span>
                <span className="rcard-head-side">
                    <span className={`rcard-pill rcard-pill--${mod}`}>
                        {result != null
                            ? severityLabel(typeof result === 'object' ? result.automatic_analysis_bool : null, t)
                            : t('not_analysed')}
                    </span>
                    <DownOutlined className={`rcard-chevron ${open ? 'is-open' : ''}`} />
                </span>
            </button>
            {open && content}
        </div>
    );
}
