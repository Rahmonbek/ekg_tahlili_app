import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Spin, Modal, Space, Image, Typography, Tag } from 'antd';
import EcgOldResult from '../../../components/results/EcgOldResult';
import { get_ecg_analyse_by_id } from '../../../host/requests/ECGAnalyseRequest';
import { formatDate, calculateAge, personName } from '../../../tools/formatters';
import { useStore } from '../../../store/Store';
import DownloadReportButton from '../../../components/DownloadReportButton';
import DoctorDiagnosisBlock from '../../../components/results/DoctorDiagnosisBlock';
import AnalyseViewHeader from '../../../components/shared/AnalyseViewHeader';
import FileMismatchBanner, { parseFileMismatch } from '../../../components/shared/FileMismatchBanner';
import NotAnalyzableBanner, { parseAiResult } from '../../../components/shared/NotAnalyzableBanner';
import { replaceEkgFile } from '../../../host/EkgService';
import { buildFileUrl } from '../../../host/Host';
import useDocumentTitle from '../../../tools/useDocumentTitle';
import SignalOnlyBanner from '../../../components/shared/SignalOnlyBanner';
import AiLanguageNotice from '../../../components/shared/AiLanguageNotice';

const { Title, Text } = Typography;

export default function EcgAnalyseView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { setloader } = useStore();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [clinicModalVisible, setClinicModalVisible] = useState(false);

    // Yorliq sarlavhasi: bemor ismi va hujjat raqami bilan — shifokor
    // bir vaqtda bir nechta tahlilni ochganda keraklisini topa olishi uchun.
    useDocumentTitle(
        data
            ? `${[data.patcient?.lastName, data.patcient?.firstName].filter(Boolean).join(' ')} — ${data.documentNumber || t('analyse_ecg', { defaultValue: 'EKG' })}`
            : t('analyse_ecg', { defaultValue: 'EKG' })
    )

    const getData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setloader(true);
        try {
            const res = await get_ecg_analyse_by_id(id);
            setData(res.data);
        } catch (err) {
            navigate('/ecg-analyses');
        } finally {
            setLoading(false);
            setloader(false);
        }
    }, [id, navigate, setloader]);

    useEffect(() => {
        getData();
    }, [getData]);

    if (loading || !data) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    const clinic = data.clinic;
    const patientName = personName(data.patcient);
    const createdDoctorName = data.createdDoctor
        ? `${data.createdDoctor.lastName ?? ''} ${data.createdDoctor.firstName ?? ''}`.trim()
        : '';
    const treatingDoctorsText = Array.isArray(data.doctors)
        ? data.doctors
            .map((item) => {
                const doctor = item?.doctor ?? item;
                return `${doctor?.lastName ?? ''} ${doctor?.firstName ?? ''}`.trim();
            })
            .filter(Boolean)
            .join(', ')
        : '';

    // AI "tahlil qilib bo'lmadi" degan holat: status = 2 (AI tugadi) bo'lsa ham
    // natija ishonchsiz. Bunda "AI tahlil qilindi" (yashil) ko'rsatish sariq
    // ogohlantirish bilan ziddiyatli edi — endi status ham buni aks ettiradi.
    const aiResultForStatus = parseAiResult(data.aiAnswerData);
    const notAnalyzable = data.status === 2 && aiResultForStatus?.tahlil_imkonsiz === true;
    // status=2 (tayyor) bo'lsa-yu AI natijasi BO'SH bo'lsa — SOXTA "tayyor".
    const noAiResult = data.status === 2 && (!data.aiAnswerData || !String(data.aiAnswerData).trim());
    const statusTag = noAiResult ? (
        <Tag color="error">
            {t('status_no_ai_result', { defaultValue: 'AI natija olinmadi' })}
        </Tag>
    ) : notAnalyzable ? (
        <Tag color="warning">
            {t('status_not_analyzable', { defaultValue: 'AI tahlil qila olmadi' })}
        </Tag>
    ) : (
        <Tag color={{ 0: 'default', 1: 'processing', 2: 'success', 3: 'warning', '-1': 'error' }[data.status]}>
            {{ 0: t('status_pending'), 1: t('status_processing'), 2: t('status_done'), 3: (t('status_file_mismatch', { defaultValue: 'Fayl mos emas' })), '-1': t('status_error') }[data.status] ?? data.status}
        </Tag>
    );

    const diagnosisTag = typeof data.hasDiagnosis === 'boolean' ? (
        <Tag color={data.hasDiagnosis ? 'success' : 'default'}>
            {(t('diagnosis_status', { defaultValue: 'Tashxis' }))}: {data.hasDiagnosis ? (t('has_diagnosis', { defaultValue: 'Bor' })) : (t('no_diagnosis', { defaultValue: 'Yo‘q' }))}
        </Tag>
    ) : null;

    return (
        <div>
            <AnalyseViewHeader
                t={t}
                onBack={() => navigate('/ecg-analyses')}
                downloadNode={data.status === 2 ? <DownloadReportButton type="ecg" id={data.id} size="middle" className="analysis-view-download-btn" /> : null}
                clinic={clinic}
                onClinicClick={() => setClinicModalVisible(true)}
                documentNumber={data.documentNumber}
                patientName={patientName}
                ageText={data.patcient?.birthDate ? `${calculateAge(data.patcient.birthDate)} ${t('age', { defaultValue: 'yosh' })}` : ''}
                createdDoctorName={createdDoctorName}
                treatingDoctorsText={treatingDoctorsText}
                statusNode={statusTag}
                diagnosisNode={diagnosisTag}
                analysisDateText={data.analysisDate ? formatDate(data.analysisDate) : null}
                createdAtText={formatDate(data.createdAt)}
            />


            {/* AI "tahlil qilib bo'lmadi" degan holat — kulrang chip

                o'zi yetarli emas, uni e'tibordan chetda qoldirish oson */}

            <NotAnalyzableBanner result={parseAiResult(data.aiAnswerData)} />

            {/* AI xulosasi boshqa tilda yaratilgan bo'lsa sababi
                tushuntiriladi (T-059) */}
            <AiLanguageNotice
                aiLang={data.aiLang}
                kind="ecg"
                analysisId={data.id}
                onTranslated={(translated) => setData({
                    ...data,
                    // Asl matn bazada o'zgarishsiz qoladi — bu faqat
                    // ekrandagi ko'rinish (T-059)
                    aiAnswerData: JSON.stringify(translated),
                })}
            />

            {/* AI xatolik bersa ham signal hisob-kitobi natijalari
                saqlanadi va ko'rsatiladi (T-029) */}
            <SignalOnlyBanner result={parseAiResult(data.aiAnswerData)} />

            <FileMismatchBanner
                info={parseFileMismatch(data.aiAnswerData)}
                analysisId={data.id}
                onReplace={replaceEkgFile}
                accept=".pdf,.png,.jpg,.jpeg"
                meta={{
                    age: data.patcient?.birthDate ? calculateAge(data.patcient.birthDate) : 0,
                    gender: data.patcient?.gender ? 'erkak' : 'ayol',
                    lang: i18n.language || 'uz',
                }}
                onSuccess={getData}
            />

            {/* AI faylni tahlil qila olmaganda (mos emas / imkonsiz / xato)
                render qilingan grafik bo'lmaydi va tahlil ichida hech qanday
                fayl ko'rinmasdi. Bunday holatda foydalanuvchi yuklagan ASL
                faylni ko'rsatamiz (pdf yoki rasm). */}
            {(notAnalyzable || noAiResult || data.status === 3 || data.status === -1)
                && data.analyseFileLink && !data.generatedFileLink ? (
                <div className="ekg-image" style={{ marginBottom: 16 }}>
                    <p className="ecg_label">{t('uploaded_file', { defaultValue: 'Yuklangan fayl' })}</p>
                    {/\.pdf(\?|$)/i.test(data.analyseFileLink) ? (
                        <iframe
                            title={t('uploaded_file', { defaultValue: 'Yuklangan fayl' })}
                            src={buildFileUrl(data.analyseFileLink)}
                            style={{ width: '100%', height: '75vh', border: '1px solid var(--border_color)', borderRadius: 8 }}
                        />
                    ) : (
                        <Image
                            style={{ width: '100%', borderRadius: 8 }}
                            src={buildFileUrl(data.analyseFileLink)}
                        />
                    )}
                </div>
            ) : null}

            <EcgOldResult data={data} initialOpen={true} showMeta={false} />

            <DoctorDiagnosisBlock analysisType="ecg" analysisId={data.id} />

            <Modal
                title={t('clinic_info', { defaultValue: 'Shifoxona ma\'lumotlari' })}
                open={clinicModalVisible}
                onCancel={() => setClinicModalVisible(false)}
                footer={null}
                centered
            >
                {clinic && (
                    <div style={{ textAlign: 'center' }}>
                        {clinic.clinicLogo && (
                            <div style={{ marginBottom: 16 }}>
                                <Image
                                    src={clinic.clinicLogo}
                                    alt="Logo"
                                    width={120}
                                    style={{ borderRadius: '8px', objectFit: 'contain' }}
                                />
                            </div>
                        )}
                        <Title level={4}>{clinic.clinicName}</Title>

                        <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
                            {clinic.address && (
                                <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                                    <Text type="secondary">{t('address', { defaultValue: 'Manzil' })}:</Text>
                                    <div style={{ fontWeight: 500 }}>{clinic.district ? `${clinic.district.nameUz || clinic.district}, ` : ''}{clinic.address}</div>
                                </div>
                            )}
                            {clinic.phoneNumbers && clinic.phoneNumbers.length > 0 && (
                                <div style={{ paddingTop: 8 }}>
                                    <Text type="secondary">{t('phones', { defaultValue: 'Telefon raqamlar' })}:</Text>
                                    {clinic.phoneNumbers.map((p, index) => (
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
