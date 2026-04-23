import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FaHeartbeat, FaPlus, FaFlask } from 'react-icons/fa';
import { RiPulseLine } from 'react-icons/ri';
import { FaChartLine } from 'react-icons/fa';
import { MdOutlineMedicalInformation } from 'react-icons/md';
import { useStore } from '../../store/Store';
import StatCard from '../../components/shared/StatCard';
import { get_ecg_analyses_by_clinic, get_ecg_analyses_by_doctor } from '../../host/requests/ECGAnalyseRequest';
import { get_holter_analyses_by_clinic, get_holter_analyses_by_doctor } from '../../host/requests/HolterAnalyseRequest';
import { get_smad_analyses_by_clinic, get_smad_analyses_by_doctor } from '../../host/requests/SmadAnalyseRequest';
import { get_lab_analyses_by_clinic, get_lab_analyses_by_doctor } from '../../host/requests/LabAnalyseRequest';
import { get_diagnose_by_clinic, get_diagnose_by_doctor } from '../../host/requests/DiagnoseRequest';
import dayjs from 'dayjs';

export default function Dashboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, ecg_unread, holter_unread, smad_unread, lab_unread, diagnoses_unread } = useStore();
    const isDoctor = user && user.roleId === 4;

    const [stats, setStats] = useState({ ecg: null, holter: null, smad: null, lab: null, diagnoses: null });
    const [loading, setLoading] = useState(true);

    const today = dayjs().format('YYYY-MM-DD');

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            const params = { page: 1, pageSize: 1, dateFrom: today, dateTo: today };
            const clinicFetch = isDoctor
                ? [
                    get_ecg_analyses_by_doctor(params),
                    get_holter_analyses_by_doctor(params),
                    get_smad_analyses_by_doctor(params),
                    get_lab_analyses_by_doctor(params),
                    get_diagnose_by_doctor(params),
                ]
                : [
                    get_ecg_analyses_by_clinic(params),
                    get_holter_analyses_by_clinic(params),
                    get_smad_analyses_by_clinic(params),
                    get_lab_analyses_by_clinic(params),
                    get_diagnose_by_clinic(params),
                ];
            try {
                const [ecgRes, holterRes, smadRes, labRes, diagRes] = await Promise.allSettled(clinicFetch);
                setStats({
                    ecg: ecgRes.status === 'fulfilled' ? ecgRes.value.data.totalCount : null,
                    holter: holterRes.status === 'fulfilled' ? holterRes.value.data.totalCount : null,
                    smad: smadRes.status === 'fulfilled' ? smadRes.value.data.totalCount : null,
                    lab: labRes.status === 'fulfilled' ? labRes.value.data.totalCount : null,
                    diagnoses: diagRes.status === 'fulfilled' ? diagRes.value.data.totalCount : null,
                });
            } catch {
                // leave nulls
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [isDoctor, today]);

    const quickActions = [
        { label: t('new_ecg_analyse') || 'Yangi EKG', path: '/analyse-ecg', icon: <FaHeartbeat /> },
        { label: t('new_holter_analyse') || 'Yangi Holter', path: '/analyse-holter', icon: <RiPulseLine /> },
        { label: t('new_smad_analyse') || 'Yangi SMAD', path: '/analyse-smad', icon: <FaChartLine /> },
        { label: t('new_lab_analyse') || 'Yangi Lab', path: '/analyse-lab', icon: <FaFlask /> },
        { label: t('new_diagnose') || 'Yangi Tashxis', path: '/diagnoses-create', icon: <MdOutlineMedicalInformation /> },
    ];

    return (
        <div>
            <div className="main_card">
                <h1>
                    {t('dashboard') || 'Bosh sahifa'}
                    <span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8', marginLeft: 8 }}>
                        {dayjs().format('DD.MM.YYYY')}
                    </span>
                </h1>
                <div className="main_card_content">
                    <p className="dashboard_section_label">{t('today_stats') || 'Bugungi tahlillar'}</p>
                    <div className="stat_cards_grid">
                        <StatCard
                            icon={<FaHeartbeat />}
                            title={t('analyse_ecg') || 'EKG Tahlillar'}
                            value={loading ? '...' : stats.ecg}
                            subValue={ecg_unread}
                            subLabel={t('new') || 'yangi'}
                            color="#00D1B2"
                            path="/ecg-analyses"
                        />
                        <StatCard
                            icon={<RiPulseLine />}
                            title={t('analyse_holter') || 'Holter'}
                            value={loading ? '...' : stats.holter}
                            subValue={holter_unread}
                            subLabel={t('new') || 'yangi'}
                            color="#6366f1"
                            path="/holter-analyses"
                        />
                        <StatCard
                            icon={<FaChartLine />}
                            title={t('analyse_smad') || 'SMAD'}
                            value={loading ? '...' : stats.smad}
                            subValue={smad_unread}
                            subLabel={t('new') || 'yangi'}
                            color="#f59e0b"
                            path="/smad-analyses"
                        />
                        <StatCard
                            icon={<FaFlask />}
                            title={t('analyse_lab') || 'Lab'}
                            value={loading ? '...' : stats.lab}
                            subValue={lab_unread}
                            subLabel={t('new') || 'yangi'}
                            color="#10b981"
                            path="/lab-analyses"
                        />
                        <StatCard
                            icon={<MdOutlineMedicalInformation />}
                            title={t('patient_diagnostics') || 'Tashxislar'}
                            value={loading ? '...' : stats.diagnoses}
                            subValue={diagnoses_unread}
                            subLabel={t('new') || 'yangi'}
                            color="#ef4444"
                            path="/patient-diagnoses"
                        />
                    </div>

                    <p className="dashboard_section_label" style={{ marginTop: 32 }}>
                        {t('quick_actions') || 'Tez harakatlar'}
                    </p>
                    <div className="quick_actions_grid">
                        {quickActions.map((action) => (
                            <button
                                key={action.path}
                                className="btn_form quick_action_btn"
                                onClick={() => navigate(action.path)}
                            >
                                <span className="quick_action_icon">{action.icon}</span>
                                <FaPlus style={{ fontSize: 11 }} />
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
