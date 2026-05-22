import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Image, Space, Spin, Typography } from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import EcgOldResult from '../../../components/results/EcgOldResult';
import SmadOldResult from '../../../components/results/smad_analyse/SmadOldResult';
import HolterOldResult from '../../../components/results/holter_analyse/HolterOldResult';
import LabOldResult from '../../../components/results/lab_analyse/LabOldResult';
import ParasitologyOldResult from '../parasitology/ParasitologyOldResult';
import { get_ecg_analyse_by_id } from '../../../host/requests/ECGAnalyseRequest';
import { get_smad_analyse_by_id } from '../../../host/requests/SmadAnalyseRequest';
import { get_holter_analyse_by_id } from '../../../host/requests/HolterAnalyseRequest';
import { get_lab_analyse_by_id } from '../../../host/requests/LabAnalyseRequest';
import { get_parasitology_analyse_by_id } from '../../../host/requests/ParasitologyRequest';
import { apiEcg, imgApi } from '../../../host/Host';

const { Text } = Typography;

const normalizeAnalysisType = (analysis) => {
    const raw = analysis?.type || analysis?.analysisType || '';
    const value = String(raw).toLowerCase();

    if (value.includes('ekg') || value.includes('ecg')) return 'EKG';
    if (value.includes('smad')) return 'SMAD';
    if (value.includes('holter')) return 'Holter';
    if (value.includes('lab')) return 'Lab';
    if (value.includes('parasit')) return 'Parasit';

    return raw;
};

const VIEW_CONFIG = {
    EKG: {
        label: 'EKG',
        fetcher: get_ecg_analyse_by_id,
        render: (data) => <EcgOldResult data={data} initialOpen={true} />,
    },
    SMAD: {
        label: 'SMAD',
        fetcher: get_smad_analyse_by_id,
        render: (data) => <SmadOldResult data={data} initialOpen={true} />,
    },
    Holter: {
        label: 'Holter',
        fetcher: get_holter_analyse_by_id,
        render: (data) => <HolterOldResult data={data} initialOpen={true} />,
    },
    Lab: {
        label: 'Lab',
        fetcher: get_lab_analyse_by_id,
        render: (data) => <LabOldResult data={data} initialOpen={true} />,
    },
    Parasit: {
        label: 'Parazitologiya',
        fetcher: get_parasitology_analyse_by_id,
        render: (data) => <ParasitologyOldResult data={data} initialOpen={true} showDownloadButton={false} />,
    },
};

const joinUrl = (base, path) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

function AnalysisFiles({ type, data, t }) {
    const files = [];

    if (type === 'EKG') {
        if (data?.analyseFileLink) files.push({ label: t('analysis_file') || 'Tahlil fayli', url: joinUrl(apiEcg, data.analyseFileLink) });
        if (data?.generatedFileLink) files.push({ label: t('ecg-image') || 'EKG rasmi', url: joinUrl(apiEcg, data.generatedFileLink), image: true });
        if (data?.generatedShortFileLink) files.push({ label: t('short_image') || 'Qisqa rasm', url: joinUrl(apiEcg, data.generatedShortFileLink), image: true });
    } else if (type === 'Parasit') {
        if (data?.filePath) files.push({ label: t('analysis_file') || 'Tahlil fayli', url: joinUrl(imgApi, data.filePath), image: true });
    } else if (data?.analyseFileLink) {
        files.push({ label: t('analysis_file') || 'Tahlil fayli', url: joinUrl(apiEcg, data.analyseFileLink) });
    }

    if (files.length === 0) return null;

    return (
        <div className="cons-analysis-files">
            <Text strong>{t('analysis_files') || 'Tahlil fayllari'}</Text>
            <Space wrap style={{ marginTop: 8 }}>
                {files.map((file) => (
                    file.image ? (
                        <Image
                            key={file.label}
                            width={92}
                            height={64}
                            src={file.url}
                            alt={file.label}
                            style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }}
                            preview={{ src: file.url }}
                            fallback=""
                        />
                    ) : (
                        <Button
                            key={file.label}
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            icon={<DownloadOutlined />}
                        >
                            {file.label}
                        </Button>
                    )
                ))}
            </Space>
        </div>
    );
}

export { normalizeAnalysisType };

export default function ConsultationAnalysisInlineView({ analysis }) {
    const { t } = useTranslation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const type = normalizeAnalysisType(analysis);
    const config = useMemo(() => VIEW_CONFIG[type], [type]);

    const loadAnalysis = useCallback(async () => {
        if (!analysis?.id || !config?.fetcher) return;

        setLoading(true);
        setError(false);
        try {
            const res = await config.fetcher(analysis.id);
            setData(res.data);
        } catch {
            setError(true);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [analysis?.id, config]);

    useEffect(() => {
        loadAnalysis();
    }, [loadAnalysis]);

    if (!config) {
        return (
            <Alert
                type="warning"
                showIcon
                message={t('analysis_type_not_supported') || 'Bu tahlil turi hozircha ko\'rsatilmaydi'}
            />
        );
    }

    return (
        <div className="cons-analysis-inline-view">
            <div className="cons-analysis-inline-toolbar">
                <Text strong>{config.label} #{analysis?.id}</Text>
                <Button size="small" icon={<ReloadOutlined />} onClick={loadAnalysis} loading={loading}>
                    {t('refresh') || 'Yangilash'}
                </Button>
            </div>

            {loading && (
                <div className="cons-analysis-inline-loading">
                    <Spin />
                </div>
            )}

            {!loading && error && (
                <Alert
                    type="error"
                    showIcon
                    message={t('error') || 'Xatolik'}
                    description={t('analysis_load_error') || 'Tahlil ma\'lumotlarini yuklab bo\'lmadi'}
                />
            )}

            {!loading && !error && data && (
                <div className="cons-analysis-inline-result">
                    <AnalysisFiles type={type} data={data} t={t} />
                    {config.render(data)}
                </div>
            )}
        </div>
    );
}
