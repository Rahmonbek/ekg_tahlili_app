import React, { useEffect, useState } from 'react'
import { Alert, Segmented, Skeleton, Table } from 'antd'
import { useTranslation } from 'react-i18next'
import { Chart } from 'react-chartjs-2'
import '../statistics/statsCommon'
import { sa_ai_usage } from '../../../host/requests/SuperAdminRequest'
import useDocumentTitle from '../../../tools/useDocumentTitle'
import { fmtNum } from './saCommon'
import './SuperAdmin.css'

const PERIODS = [7, 30, 90, 365]
const usd = (v) => `$${Number(v ?? 0).toFixed(2)}`

/**
 * AI xarajati (SA-20): `ai_usage` jadvalidan (Python har bir AI chaqiruvini
 * yozadi) — kunlik narx/chaqiruvlar, modul va model kesimida. Narx faqat
 * `AI_PRICES` sozlangan bo'lsa hisoblanadi, aks holda $0 ko'rinadi.
 */
export default function SaAiUsage() {
    const { t } = useTranslation()
    useDocumentTitle(t('sa_ai_usage', { defaultValue: 'AI xarajati' }))
    const [days, setDays] = useState(30)
    const [data, setData] = useState(null)

    useEffect(() => {
        setData(null)
        sa_ai_usage(days).then((r) => setData(r.data)).catch(() => setData({ available: false }))
    }, [days])

    const cols = (first) => [
        { title: first, dataIndex: 'key', render: (v) => v || '—' },
        { title: t('sa_ai_calls_col', { defaultValue: 'Chaqiruvlar' }), dataIndex: 'calls', align: 'right', render: fmtNum },
        { title: t('sa_tokens_in', { defaultValue: 'Kirish tokenlari' }), dataIndex: 'inputTokens', align: 'right', render: fmtNum },
        { title: t('sa_tokens_cached', { defaultValue: 'Keshlangan' }), dataIndex: 'cachedTokens', align: 'right', render: fmtNum },
        { title: t('sa_tokens_out', { defaultValue: 'Chiqish tokenlari' }), dataIndex: 'outputTokens', align: 'right', render: fmtNum },
        { title: t('sa_cost', { defaultValue: 'Narx' }), dataIndex: 'costUsd', align: 'right', render: usd },
    ]

    const tt = data?.totals
    return (
        <div className="sa">
            <div className="main_card">
                <h1>
                    <span>{t('sa_ai_usage', { defaultValue: 'AI xarajati' })}</span>
                    <Segmented value={days} onChange={setDays}
                        options={PERIODS.map((p) => ({ value: p, label: `${p} ${t('sa_days', { defaultValue: 'kun' })}` }))} />
                </h1>
                <div className="main_card_content" style={{ background: 'var(--sa-bg)' }}>
                    {data === null && <Skeleton active paragraph={{ rows: 8 }} />}
                    {data && !data.available && (
                        <Alert type="info" showIcon
                            message={t('sa_ai_no_table', { defaultValue: "AI xarajati jadvali hali yaratilmagan yoki ma'lumot yo'q" })} />
                    )}
                    {data?.available && (
                        <>
                            <div className="sa-kpis sa-kpis--4">
                                {[
                                    [t('sa_cost', { defaultValue: 'Narx' }), usd(tt.costUsd)],
                                    [t('sa_ai_calls_col', { defaultValue: 'Chaqiruvlar' }), fmtNum(tt.calls)],
                                    [t('sa_tokens_in', { defaultValue: 'Kirish tokenlari' }), fmtNum(tt.inputTokens)],
                                    [t('sa_tokens_out', { defaultValue: 'Chiqish tokenlari' }), fmtNum(tt.outputTokens)],
                                ].map(([label, value]) => (
                                    <div className="sa-kpi" key={label}><div className="sa-kpi-body">
                                        <div className="sa-kpi-label">{label}</div>
                                        <div className="sa-kpi-value">{value}</div>
                                    </div></div>
                                ))}
                            </div>

                            <section className="sa-panel" style={{ marginBottom: 16 }}>
                                <div className="sa-panel-head"><h3>{t('sa_ai_daily', { defaultValue: 'Kunlik xarajat va chaqiruvlar' })}</h3></div>
                                <div className="sa-chart">
                                    <Chart type="bar"
                                        data={{
                                            labels: data.series.map((s) => new Date(s.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })),
                                            datasets: [
                                                {
                                                    type: 'bar', label: t('sa_cost', { defaultValue: 'Narx' }) + ' ($)',
                                                    data: data.series.map((s) => Number(s.costUsd)), backgroundColor: '#00B39A',
                                                    borderRadius: 3, yAxisID: 'y', maxBarThickness: 24,
                                                },
                                                {
                                                    type: 'line', label: t('sa_ai_calls_col', { defaultValue: 'Chaqiruvlar' }),
                                                    data: data.series.map((s) => s.calls), borderColor: '#3B82F6', backgroundColor: '#3B82F6',
                                                    pointRadius: 2, tension: 0.3, yAxisID: 'y1',
                                                },
                                            ],
                                        }}
                                        options={{
                                            responsive: true, maintainAspectRatio: false,
                                            interaction: { mode: 'index', intersect: false },
                                            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } } },
                                            scales: {
                                                x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
                                                y: { beginAtZero: true, grid: { color: '#eef2f7' }, ticks: { callback: (v) => `$${v}` } },
                                                y1: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { precision: 0 } },
                                            },
                                        }} />
                                </div>
                            </section>

                            <div className="sa-grid sa-grid--halves">
                                <section className="sa-panel">
                                    <div className="sa-panel-head"><h3>{t('sa_by_module', { defaultValue: "Modullar bo'yicha" })}</h3></div>
                                    <Table rowKey="key" size="small" pagination={false} columns={cols(t('sa_module', { defaultValue: 'Modul' }))}
                                        dataSource={data.byModule} scroll={{ x: 640 }} />
                                </section>
                                <section className="sa-panel">
                                    <div className="sa-panel-head"><h3>{t('sa_by_model', { defaultValue: "Modellar bo'yicha" })}</h3></div>
                                    <Table rowKey="key" size="small" pagination={false} columns={cols('Model')}
                                        dataSource={data.byModel} scroll={{ x: 640 }} />
                                </section>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
