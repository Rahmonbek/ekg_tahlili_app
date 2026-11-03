import React, { useEffect, useMemo, useState } from 'react';
import { Empty, Select, Spin } from 'antd';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { useTranslation } from 'react-i18next';

import { get_lab_patient_dynamics } from '../../host/requests/LabValueTypesRequest';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement,
    Tooltip, Legend, Filler);

/**
 * Bitta ko'rsatkichning barcha tahlillar bo'yicha o'zgarishi (T-035).
 *
 * Nima uchun kerak
 * ----------------
 * Qiymatlar `lab_analyses` ning 40 ta ustunida allaqachon saqlanardi,
 * lekin ularni **faqat bitta tahlil ichida** ko'rish mumkin edi.
 * "Gemoglobin uch oyda qanday o'zgardi" degan savolga javob berish
 * uchun shifokor tahlillarni birma-bir ochib, raqamlarni qo'lda yozib
 * olishi kerak edi. Aynan shu — dinamika — laboratoriya
 * tahlilining asosiy qiymati.
 *
 * Norma yo'lagi
 * -------------
 * Grafikda referens diapazoni **fon sohasi** sifatida chiziladi, chunki
 * bitta nuqtaning "yuqori" ekani emas, uning normadan qanchalik uzoqda
 * ekani va qaysi tomonga siljiyotgani muhim.
 */
/**
 * @param {number} patcientId  bemor identifikatori
 * @param {boolean} showTitle  ichki sarlavhani ko'rsatish. Komponent
 *   sarlavhasi bor `Card` ichida joylashganda `false` beriladi — aks
 *   holda bir xil matn ikki marta chiqadi.
 */
export default function LabDynamicsChart({ patcientId, showTitle = true }) {
    const { t } = useTranslation();
    const [series, setSeries] = useState(null);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    // Bemorda jami nechta lab tahlili borligi — "kamida 2 tahlil kerak" va
    // "tahlillar har xil ko'rsatkichlarni o'lchagan" holatlarini farqlash uchun.
    const [analysisCount, setAnalysisCount] = useState(0);

    useEffect(() => {
        let alive = true;
        if (patcientId == null) {
            setLoading(false);
            return undefined;
        }

        setLoading(true);
        get_lab_patient_dynamics(patcientId)
            .then((res) => {
                if (!alive) return;
                // Backend endi { analysisCount, series } qaytaradi; eski
                // massiv shakli ham qo'llab-quvvatlanadi (zaxira).
                const payload = res?.data;
                const data = Array.isArray(payload?.series) ? payload.series
                    : Array.isArray(payload) ? payload : [];
                setSeries(data);
                setAnalysisCount(payload?.analysisCount ?? data.length);
                setSelected(data[0]?.columnName ?? null);
            })
            .catch(() => { if (alive) { setSeries([]); setAnalysisCount(0); } })
            .finally(() => { if (alive) setLoading(false); });

        return () => { alive = false; };
    }, [patcientId]);

    const current = useMemo(
        () => series?.find((s) => s.columnName === selected) ?? null,
        [series, selected]);

    const chart = useMemo(() => {
        if (!current) return null;

        const labels = current.points.map(
            (p) => new Date(p.date).toLocaleDateString('uz-UZ',
                { day: '2-digit', month: '2-digit', year: '2-digit' }));
        const values = current.points.map((p) => p.value);

        // Katalog me'yori — jins ma'lum bo'lsa aniq diapazon, aks holda
        // ikkalasining kengi. Bir jinsda chegara yo'q bo'lsa (FSG/LG ayol
        // me'yori) — birlashmada ham yo'q (L-17)
        const { normalMinMale: mMin, normalMinFemale: fMin,
                normalMaxMale: mMax, normalMaxFemale: fMax } = current;
        const min = current.gender === true ? mMin
            : current.gender === false ? fMin
            : (mMin == null || fMin == null ? null : Math.min(mMin, fMin));
        const max = current.gender === true ? mMax
            : current.gender === false ? fMax
            : (mMax == null || fMax == null ? null : Math.max(mMax, fMax));
        const catalogBand = Number.isFinite(min) && Number.isFinite(max);

        // Har nuqtaning o'z me'yori (L-23): laboratoriya blankasidagi me'yor
        // (`refLow`/`refHigh`) bo'lsa — shu, chunki u assayga xos (erkin T3:
        // klinika 1.2–4.2, katalog 3.1–6.8) va kartochkadagi baho ham shunga
        // tayanadi. Bo'lmasa — katalog me'yori. Teskari me'yor (min > max)
        // e'tiborsiz qoldiriladi (L-38). Faqat yuqori chegara bo'lsa ("≤ 5")
        // pastki chegara 0.
        const bands = current.points.map((p) => {
            const lo = Number.isFinite(p.refLow) ? p.refLow : null;
            const hi = Number.isFinite(p.refHigh) ? p.refHigh : null;
            const labOk = (lo != null || hi != null) && !(lo != null && hi != null && lo > hi);
            if (labOk) return { low: lo ?? (hi != null ? 0 : null), high: hi, lab: true };
            return catalogBand ? { low: min, high: max, lab: false } : { low: null, high: null, lab: false };
        });
        const hasBand = bands.some((b) => b.low != null && b.high != null);
        const anyLab = bands.some((b) => b.lab);

        // Nuqta bahosi: serverdagi `flag` (-1 past / 0 me'yor / 1 yuqori —
        // kartochkadagi bilan bir xil). Eski javobda bo'lmasa — me'yor
        // yo'lagidan hisoblanadi.
        const flags = current.points.map((p, i) => {
            if (p.flag === -1 || p.flag === 0 || p.flag === 1) return p.flag;
            const { low, high } = bands[i];
            if (low == null && high == null) return null;
            if (low != null && p.value < low) return -1;
            if (high != null && p.value > high) return 1;
            return 0;
        });
        const FLAG_COLOR = { 1: '#DC2626', '-1': '#D97706', 0: '#16A34A' };
        const pointColors = flags.map((f) => (f == null ? '#0EA5E9' : FLAG_COLOR[f]));

        const datasets = [{
            label: current[`name${t('data_lang')}`] ?? current.nameUz,
            data: values,
            borderColor: '#0EA5E9',
            backgroundColor: '#0EA5E9',
            pointBackgroundColor: pointColors,
            pointBorderColor: pointColors,
            tension: 0.25,
            pointRadius: 5,
            pointHoverRadius: 7,
            // Tooltip uchun: nuqta bahosi va me'yor manbasi
            flags,
            flagSources: current.points.map((p, i) => p.flagSource ?? (bands[i].lab ? 'lab' : null)),
        }];

        // Norma yo'lagi: pastki va yuqori chegara orasidagi soha. Me'yor
        // tahlildan tahlilga farq qilishi mumkin (har xil laboratoriya) —
        // shuning uchun chegaralar nuqtama-nuqta.
        if (hasBand) {
            datasets.push(
                {
                    label: anyLab
                        ? `${t('normal_range', { defaultValue: 'Norma' })} (${t('lab_ref_source', { defaultValue: 'laboratoriya' })})`
                        : t('normal_range', { defaultValue: 'Norma' }),
                    data: bands.map((b) => b.high),
                    borderColor: 'rgba(22, 163, 74, 0.35)',
                    backgroundColor: 'rgba(22, 163, 74, 0.08)',
                    borderDash: [6, 4],
                    pointRadius: 0,
                    fill: '+1',
                },
                {
                    label: '',
                    data: bands.map((b) => b.low),
                    borderColor: 'rgba(22, 163, 74, 0.35)',
                    borderDash: [6, 4],
                    pointRadius: 0,
                    fill: false,
                },
            );
        }

        return { labels, datasets };
    }, [current, t]);

    if (loading) return <div style={{ padding: 24 }}><Spin /></div>;

    // Kamida ikki o'lchovi bor ko'rsatkich yo'q — bu nosozlik emas.
    // Ammo SABABI ikki xil bo'lishi mumkin, shuning uchun xabar ham farqli:
    if (!series || series.length === 0) {
        // (a) Bemorda 2+ tahlil bor, lekin hech bir ko'rsatkich ikki
        //     tahto takrorlanmagan — ya'ni tahlillar har xil turdagi
        //     (biri qon, biri gormon, biri peshob) bo'lgan. Dinamika
        //     bir XIL ko'rsatkichni vaqt bo'yicha solishtiradi.
        const differentIndicators = analysisCount >= 2;
        return (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={differentIndicators
                    ? t('no_dynamics_diff_indicators', {
                        defaultValue: "Bu bemorda {{count}} ta tahlil bor, lekin ular har xil ko'rsatkichlarni o'lchagan. Dinamika grafigi bir xil ko'rsatkichni (masalan gemoglobinni) kamida ikkita tahlilda taqqoslaydi — shuning uchun bir xil ko'rsatkich bo'lgan tahlillar kerak.",
                        count: analysisCount,
                    })
                    : t('no_dynamics_yet', {
                        defaultValue: "Dinamikani ko'rsatish uchun kamida ikkita tahlil kerak",
                    })}
            />
        );
    }

    return (
        <div className="lab-dynamics">
            <div className="lab-dynamics-head">
                {showTitle
                    ? <b>{t('indicator_dynamics', { defaultValue: "Ko'rsatkich dinamikasi" })}</b>
                    : <span />}
                <Select
                    value={selected}
                    onChange={setSelected}
                    // Sarlavha yonida, o'ngda: umumiy `.ant-select { width: 100% }`
                    // uni butun qatorga cho'zib yuborardi
                    style={{ width: 300, maxWidth: '100%' }}
                    showSearch
                    optionFilterProp="label"
                    options={series.map((s) => ({
                        value: s.columnName,
                        label: `${s[`name${t('data_lang')}`] ?? s.nameUz} (${s.points.length})`,
                    }))}
                />
            </div>

            {chart && (
                // Chart.js o'lchamni ota-elementdan oladi va u `position: relative`
                // bo'lmasa konteyner torayganda (menyu ochilganda) KICHRAYMAYDI:
                // grafik 73 px toshib, butun sahifa yonga suriladigan bo'lib qolardi
                <div className="lab-dynamics-canvas">
                <Line
                    data={chart}
                    options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                            legend: {
                                // Norma yo'lagining ikkinchi chizig'i
                                // nomsiz — uni afsonada ko'rsatmaymiz
                                labels: { filter: (item) => item.text !== '' },
                            },
                            tooltip: {
                                callbacks: {
                                    label: (ctx) => {
                                        let text = `${ctx.dataset.label}: ${ctx.parsed.y}`
                                            + (current.measure ? ` ${current.measure}` : '');
                                        // Asosiy chiziq nuqtasi — baho va me'yor manbasi
                                        const flag = ctx.dataset.flags?.[ctx.dataIndex];
                                        if (flag === 1 || flag === -1) {
                                            text += flag === 1
                                                ? ` ↑ ${t('above_normal', { defaultValue: 'Yuqori' })}`
                                                : ` ↓ ${t('below_normal', { defaultValue: 'Past' })}`;
                                            if (ctx.dataset.flagSources?.[ctx.dataIndex] === 'lab') {
                                                text += ` (${t('lab_ref_source', { defaultValue: 'laboratoriya' })})`;
                                            }
                                        }
                                        return text;
                                    },
                                },
                            },
                        },
                        scales: {
                            y: { title: { display: !!current.measure, text: current.measure } },
                        },
                    }}
                    height={260}
                />
                </div>
            )}
        </div>
    );
}
