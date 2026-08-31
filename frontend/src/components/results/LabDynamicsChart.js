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
                const data = Array.isArray(res?.data) ? res.data : [];
                setSeries(data);
                setSelected(data[0]?.columnName ?? null);
            })
            .catch(() => { if (alive) setSeries([]); })
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

        // Jins ma'lum bo'lsa aniq diapazon, aks holda ikkalasining kengi
        const min = current.gender === true ? current.normalMinMale
            : current.gender === false ? current.normalMinFemale
            : Math.min(...[current.normalMinMale, current.normalMinFemale]
                .filter((x) => x != null));
        const max = current.gender === true ? current.normalMaxMale
            : current.gender === false ? current.normalMaxFemale
            : Math.max(...[current.normalMaxMale, current.normalMaxFemale]
                .filter((x) => x != null));

        const datasets = [{
            label: current[`name${t('data_lang')}`] ?? current.nameUz,
            data: values,
            borderColor: '#0EA5E9',
            backgroundColor: '#0EA5E9',
            tension: 0.25,
            pointRadius: 4,
        }];

        // Norma yo'lagi: pastki va yuqori chegara orasidagi soha
        if (Number.isFinite(min) && Number.isFinite(max)) {
            datasets.push(
                {
                    label: t('normal_range', { defaultValue: 'Norma' }),
                    data: labels.map(() => max),
                    borderColor: 'rgba(22, 163, 74, 0.35)',
                    backgroundColor: 'rgba(22, 163, 74, 0.08)',
                    borderDash: [6, 4],
                    pointRadius: 0,
                    fill: '+1',
                },
                {
                    label: '',
                    data: labels.map(() => min),
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

    // Kamida ikki o'lchovi bor ko'rsatkich yo'q — bu nosozlik emas,
    // shunchaki taqqoslash uchun ma'lumot yetarli emas.
    if (!series || series.length === 0) {
        return (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t('no_dynamics_yet', {
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
                    style={{ minWidth: 240 }}
                    options={series.map((s) => ({
                        value: s.columnName,
                        label: `${s[`name${t('data_lang')}`] ?? s.nameUz} (${s.points.length})`,
                    }))}
                />
            </div>

            {chart && (
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
                                    label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}`
                                        + (current.measure ? ` ${current.measure}` : ''),
                                },
                            },
                        },
                        scales: {
                            y: { title: { display: !!current.measure, text: current.measure } },
                        },
                    }}
                    height={260}
                />
            )}
        </div>
    );
}
