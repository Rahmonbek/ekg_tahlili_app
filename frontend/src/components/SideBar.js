import React, { useEffect } from 'react'
import logo from '../images/logo.png'
import { routers } from '../tools/routes'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { useStore } from '../store/Store'
import { Badge, Tooltip } from 'antd'
import { FaLock } from 'react-icons/fa'

const ANALYZER_ROUTES = {
    'analyse-ecg':           'ecg-analyses',
    'analyse-holter':        'holter-analyses',
    'analyse-smad':          'smad-analyses',
    'analyse-lab':           'lab-analyses',
    'diagnoses-create':      'patient-diagnoses',
    'parasitology-analyzer': 'parasitology-analyses',
};

export default function SideBar() {
    const {t}=useTranslation()
    const location=useLocation()
    const {open_menu, user, ecg_unread, holter_unread, smad_unread, lab_unread, diagnoses_unread, consultationBadge, initMenu, setopen_menu}=useStore()

    const unreadMap = {
        ecg_unread,
        holter_unread,
        smad_unread,
        lab_unread,
        diagnoses_unread,
        consultation_admin_pending: consultationBadge?.adminPendingCount ?? 0,
        consultation_doctor_pending: consultationBadge?.doctorPendingCount ?? 0,
    }

    // Klinika faollik holati (Main.js dagi mantiq bilan bir xil)
    const clinicIsActive = user?.roleId === 1
        ? true
        : (user?.clinic?.isActive ?? false)

    useEffect(() => {
        initMenu();

        const handleResize = () => initMenu();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, [initMenu]);

    // Mobil: route o'zgarganda menyu yopilsin (click bilan aralashmaslik uchun)
    useEffect(() => {
        if (window.innerWidth <= 1024) {
            setopen_menu(false);
        }
    }, [location.pathname, setopen_menu]);

    const checkIsActive = (item) => {
        const path = location.pathname;

        // Root va dashboard sahifalar
        if (path === '/' || path === '/cabinet' || path === '/dashboard') {
            // Admin/Direktor uchun Dashboard ko'rsatiladi — hech qanday item highlighted bo'lmasin
            if (user && (user.roleId === 2 || user.roleId === 3)) return false;
            // Boshqa rollar uchun ecg-analyses highlighted
            return item.tools === 'ecg-analyses';
        }

        // Bevosita path match: ro'yxat va view sahifalar (/ecg-analyses, /ecg-analyses/view/123)
        if (item.tools && path.includes(item.tools)) return true;

        // Tahlil yaratish sahifalarini mos ro'yxat sahifasiga ulash
        for (const [segment, tools] of Object.entries(ANALYZER_ROUTES)) {
            if (path.includes(segment) && item.tools === tools) return true;
        }

        return false;
    };

  return (
    <div className={`sidebar ${!open_menu?"closed_menu":''}`}>
        <Link to={'/'} className='sidebar_head'>
            <img src={logo} alt="logo"/>
            <h1>N MED AI</h1>
        </Link>
        <div className='sidebar_line'></div>
        <div className='sidebar_menu'>
            {routers.map((item, index)=>{
                const isDoctor = user && (user.roleId === 4 || user.roleId === 5)
                // Konsultatsiya badge'lari barcha rollarda ko'rsatiladi
                const isConsultationKey = item.unread_key === 'consultation_admin_pending'
                    || item.unread_key === 'consultation_doctor_pending'
                const unreadCount = (isDoctor || isConsultationKey) && item.unread_key
                    ? (unreadMap[item.unread_key] || 0)
                    : 0
                // Klinika faollashtilmagan va route faol klinika talab qilsa — qulf belgisi
                const isLocked = item.requires_active && !clinicIsActive
                return (user==null || item.role_id.length===0 || item.role_id.indexOf(user.roleId)!==-1) ? (
                <Tooltip
                    key={index}
                    title={isLocked ? t('clinic_not_active_title') : ''}
                    placement="right"
                    color="#2C3E6B"
                >
                <Link
                    to={item.path}
                    className={`sidebar_menu_item ${checkIsActive(item) ? "active_sidebar_item" : ""} ${isLocked ? "locked_sidebar_item" : ""}`}
                >
                    <div className='sidebar_icon'>
                        {item.icon}
                    </div>
                    <div className='sidebar_title'>
                        {t(item.title)}
                    </div>
                    {isLocked ? (
                        <FaLock
                            size={11}
                            color="#aaa"
                            style={{ marginLeft: 'auto', flexShrink: 0 }}
                        />
                    ) : unreadCount > 0 ? (
                        <Badge
                            count={unreadCount}
                            size="small"
                            style={{ backgroundColor: '#FF4D4F', marginLeft: 'auto', flexShrink: 0 }}
                        />
                    ) : null}
                </Link>
                </Tooltip>
                ) : null
            })}
        </div>
    </div>
  )
}
