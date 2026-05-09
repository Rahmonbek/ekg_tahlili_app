import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FaHeartbeat, FaPlus, FaFlask, FaMicroscope } from 'react-icons/fa';
import { RiPulseLine } from 'react-icons/ri';
import { FaChartLine } from 'react-icons/fa';
import { MdOutlineMedicalInformation } from 'react-icons/md';
import { useStore } from '../../store/Store';
import StatCard from '../../components/shared/StatCard';
import { get_dashboard_statistics } from '../../host/requests/DashboardRequest';
import dayjs from 'dayjs';

const EMPTY_COUNTS = { ecg: null, holter: null, smad: null, lab: null, diagnoses: null, parasitology: null };

export default function Dashboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, ecg_unread, holter_unread, smad_unread, lab_unread, diagnoses_unread } = useStore();

    const [today, setToday] = useState(EMPTY_COUNTS);
    const [allTime, setAllTime] = useState(EMPTY_COUNTS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const res = await get_dashboard_statistics();
                const data = res.data;
                setToday({
                    ecg: data.today.ecg,
                    holter: data.today.holter,
                    smad: data.today.smad,
                    lab: data.today.lab,
                    diagnoses: data.today.diagnoses,
                    parasitology: data.today.parasitology,
                });
                setAllTime({
                    ecg: data.allTime.ecg,
                    holter: data.allTime.holter,
                    smad: data.allTime.smad,
                    lab: data.allTime.lab,
                    diagnoses: data.allTime.diagnoses,
                    parasitology: data.allTime.parasitology,
                });
            } catch {
                // leave nulls
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const val = (v) => (loading ? '...' : v);

    const cards = [
        {
            icon: <FaHeartbeat />,
            title: t('analyse_ecg') || 'EKG Tahlillar',
            value: val(today.ecg),
            allTimeValue: loading ? null : allTime.ecg,
            subValue: ecg_unread,
            color: '#00D1B2',
            path: '/ecg-analyses',
        },
        {
            icon: <RiPulseLine />,
            title: t('analyse_holter') || 'Holter',
            value: val(today.holter),
            allTimeValue: loading ? null : allTime.holter,
            subValue: holter_unread,
            color: '#6366f1',
            path: '/holter-analyses',
        },
        {
            icon: <FaChartLine />,
            title: t('analyse_smad') || 'SMAD',
            value: val(today.smad),
            allTimeValue: loading ? null : allTime.smad,
            subValue: smad_unread,
            color: '#f59e0b',
            path: '/smad-analyses',
        },
        {
            icon: <FaFlask />,
            title: t('analyse_lab') || 'Lab',
            value: val(today.lab),
            allTimeValue: loading ? null : allTime.lab,
            subValue: lab_unread,
            color: '#10b981',
            path: '/lab-analyses',
        },
        {
            icon: <MdOutlineMedicalInformation />,
            title: t('patient_diagnostics') || 'Tashxislar',
            value: val(today.diagnoses),
            allTimeValue: loading ? null : allTime.diagnoses,
            subValue: diagnoses_unread,
            color: '#ef4444',
            path: '/patient-diagnoses',
        },
        // {
        //     icon: <FaMicroscope />,
        //     title: t('parasitology_analyse') || 'Parazitologiya',
        //     value: val(today.parasitology),
        //     allTimeValue: loading ? null : allTime.parasitology,
        //     subValue: 0,
        //     color: '#8b5cf6',
        //     path: '/parasitology-analyses',
        // },
    ];

    const quickActions = [
        { label: t('new_ecg_analyse') || 'Yangi EKG', path: '/analyse-ecg', icon: <FaHeartbeat /> },
        { label: t('new_holter_analyse') || 'Yangi Holter', path: '/analyse-holter', icon: <RiPulseLine /> },
        { label: t('new_smad_analyse') || 'Yangi SMAD', path: '/analyse-smad', icon: <FaChartLine /> },
        { label: t('new_lab_analyse') || 'Yangi Lab', path: '/analyse-lab', icon: <FaFlask /> },
        { label: t('new_diagnose') || 'Yangi Tashxis', path: '/diagnoses-create', icon: <MdOutlineMedicalInformation /> },
        // { label: t('new_parasitology_analyse') || 'Yangi Parazitologiya', path: '/parasitology-analyzer', icon: <FaMicroscope /> },
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
                        {cards.map((card) => (
                            <StatCard
                                key={card.path}
                                icon={card.icon}
                                title={card.title}
                                value={card.value}
                                subValue={card.subValue}
                                subLabel={t('new') || 'yangi'}
                                allTimeValue={card.allTimeValue}
                                allTimeLabel={t('total') || 'Jami'}
                                color={card.color}
                                path={card.path}
                            />
                        ))}
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
