import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Spin } from 'antd';
import { IoArrowBack } from 'react-icons/io5';
import { FaDownload } from 'react-icons/fa6';
import { apiEcg } from '../../../host/Host';
import { formatDateTime } from '../../../tools/formatters';
import ClinicHeader from '../../../components/results/ClinicHeader';
import { get_diagnose_by_id } from '../../../host/requests/DiagnoseRequest';
import { useStore } from '../../../store/Store';

export default function DiagnoseView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { setloader } = useStore();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            getData();
        }
    }, [id]);

    const getData = async () => {
        setLoading(true);
        setloader(true);
        try {
            const res = await get_diagnose_by_id(id);
            setData(res.data);
        } catch (err) {
            navigate('/patient-diagnoses');
        } finally {
            setLoading(false);
            setloader(false);
        }
    };

    if (loading || !data) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <Button
                    onClick={() => navigate('/patient-diagnoses')}
                    icon={<IoArrowBack />}
                    className="btn_form mini_btn_main"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                    {t('back')}
                </Button>
            </div>

            <div className="main_card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 20px 0' }}>
                    <h1 style={{ margin: 0 }}>{t('new_diagnose')} #{data.id}</h1>
                    <ClinicHeader clinic={data.clinic} />
                </div>
                
                <div className="main_card_content">
                    {data.patcient && (
                        <div>
                            <p className="ecg_label">{t('patcient_info')}</p>
                            <div className="ekg-item-info-text">
                                <b>{t('patient_fullname')}: </b>
                                <p>{data.patcient.lastName} {data.patcient.firstName} {data.patcient.sureName}</p>
                            </div>
                            {data.patcient.passport && (
                                <div className="ekg-item-info-text">
                                    <b>{t('passport_seria')}: </b>
                                    <p>{data.patcient.passport}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {data.mainDoctor && (
                        <div>
                            <p className="ecg_label">{t('owner_diagnosis')}</p>
                            <div className="ekg-item-info-text">
                                <b>{data.mainDoctor.role?.[`name${t('data_lang')}`] || ''}: </b>
                                <p>{data.mainDoctor.lastName} {data.mainDoctor.firstName}</p>
                            </div>
                            {data.mainDoctor.positions?.length > 0 && (
                                <div className="ekg-item-info-text">
                                    <b>{t('doctor_positions')}: </b>
                                    <p>{data.mainDoctor.positions.map(p => p[`name${t('data_lang')}`]).join(', ')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {data.createdDoctor && (
                        <div>
                            <p className="ecg_label">{t('doctor_of_created')}</p>
                            <div className="ekg-item-info-text">
                                <b>{data.createdDoctor.role?.[`name${t('data_lang')}`] || ''}: </b>
                                <p>{data.createdDoctor.lastName} {data.createdDoctor.firstName}</p>
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="ecg_label">{t('created_at')}</p>
                        <div className="ekg-item-info-text">
                            <p>{data.createdAt ? formatDateTime(data.createdAt) : '—'}</p>
                        </div>
                    </div>

                    {data.diagnoseFileLink && (
                        <div style={{ marginTop: 16 }}>
                            <p className="ecg_label">{t('diagnoses_file')}</p>
                            <a
                                href={`${apiEcg}${data.diagnoseFileLink}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn_form mini_btn_main"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
                            >
                                <FaDownload /> {t('diagnoses_file')}
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
