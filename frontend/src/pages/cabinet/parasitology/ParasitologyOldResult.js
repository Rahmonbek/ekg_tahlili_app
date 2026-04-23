import { Image } from 'antd';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoIosArrowBack, IoIosArrowDown } from 'react-icons/io';
import { imgApi } from '../../../host/Host';
import { formatDateTime } from '../../../tools/formatters';
import ParasitologyResult from './ParasitologyResult';

function parseAiResponse(raw) {
    if (!raw) return null;
    if (typeof raw !== 'string') return raw;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function statusClass(status, jiddiylik) {
    if (status === 'failed') return 'danger_analyse';
    if (status === 'pending' || status === 'not_analyzed') return 'unknown_analyse';
    if (status === 'analyzed') {
        if (jiddiylik === 3) return 'danger_analyse';
        if (jiddiylik === 2) return 'avarage_analyse';
        return 'normal_analyse';
    }
    return 'unknown_analyse';
}

export default function ParasitologyOldResult({ data, initialOpen = false }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(initialOpen);

    if (!data) return null;

    const parsed = parseAiResponse(data.aiResponse);
    const statusLabel = data.analysisStatus === 'analyzed'
        ? t('status_done')
        : data.analysisStatus === 'failed'
        ? t('status_error')
        : data.analysisStatus === 'pending'
        ? t('status_pending')
        : t('not_analysed');


    return (
        <div className={`old_analyse main_card ${open ? 'opened_main_card' : 'closed_main_card'} ${statusClass(data.analysisStatus, data.jiddiylikDarajasi)}`}>
            <h1 onClick={() => setOpen(!open)}>
                <p>{formatDateTime(data.createdAt)}</p>
                <p>
                    {data.magnification ? `${data.magnification} · ` : ''}{statusLabel}
                    <span>{open ? <IoIosArrowDown /> : <IoIosArrowBack />}</span>
                </p>
            </h1>
            {open && (
                <div className="main_card_content">
                    {data.createdDoctor && (
                        <div>
                            <p className="ecg_label">{t('doctor_of_created')}</p>
                            <div className="ekg-item-info-text">
                                <p>{data.createdDoctor.lastName} {data.createdDoctor.firstName}</p>
                            </div>
                        </div>
                    )}
                    {data.doctors && data.doctors.length > 0 && (
                        <div>
                            <p className="ecg_label">{t('doctor_of_patcient')}</p>
                            {data.doctors.map((doc, i) => (
                                <div key={i} className="ekg-item-info-text">
                                    <p>{doc.lastName} {doc.firstName}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {data.filePath && !parsed && (
                        <div style={{ textAlign: 'center', marginBottom: 16 }}>
                            <Image
                                src={imgApi + data.filePath}
                                alt="parasitology"
                                style={{ maxHeight: 400, borderRadius: 8, objectFit: 'contain' }}
                                preview={{ mask: t('view_image') }}
                            />
                        </div>
                    )}
                    {parsed
                        ? <ParasitologyResult result={parsed} image={data.filePath} />
                        : <p className="ecg_label">{t('not_analysed')}</p>
                    }
                </div>
            )}
        </div>
    );
}
