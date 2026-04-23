import React, { use, useEffect } from 'react'
import logo from '../images/logo.png'
import { routers } from '../tools/routes'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { useStore } from '../store/Store'
import { Badge } from 'antd'

export default function SideBar() {
    const {t}=useTranslation()
    const location=useLocation()
    const {open_menu, user, ecg_unread, holter_unread, smad_unread, lab_unread, diagnoses_unread}=useStore()

    const unreadMap = {
        ecg_unread,
        holter_unread,
        smad_unread,
        lab_unread,
        diagnoses_unread,
    }

const { initMenu } = useStore();
useEffect(() => {
  initMenu();
}, []);

    const checkIsActive = (item, index) => {
        const path = location.pathname;
        const isRoot = path.replace(/\//g, '') === '' || path === '/cabinet';

        // '/' yoki '/cabinet' da turganimizda default ochiladigan menyuni aniqlash
        if (isRoot) {
            if (user && (user.roleId === 2 || user.roleId === 3)) {
                if (item.tools === 'doctor') return true;
            } else {
                if (item.tools === 'ecg-analyses') return true;
            }
        }

        // Subpagelar va tools bilan solishtirish
        if (item.tools && path.includes(item.tools)) return true;
        
        // Maxsus ECG analiz sahifasi uchun tag-sahifa (subpage) tekshiruvi
        if (item.tools === 'ecg-analyses' && path.includes('analyse-ecg')) return true;

        return false;
    };

  return (
    <div className={`sidebar ${!open_menu?"closed_menu":''}`}>
        <div className='sidebar_head'>
            <img src={logo} alt="logo"/>
            <h1>N MED AI</h1>
        </div>
        <div className='sidebar_line'></div>
        <div className='sidebar_menu'>
            {routers.map((item, index)=>{
                const isDoctor = user && (user.roleId === 4 || user.roleId === 5)
                const unreadCount = isDoctor && item.unread_key ? (unreadMap[item.unread_key] || 0) : 0
                return (user==null || item.role_id.length===0 || item.role_id.indexOf(user.roleId)!==-1) ? (
                <Link
                    to={item.path}
                    className={`sidebar_menu_item ${checkIsActive(item, index) ? "active_sidebar_item" : ""}`}
                    key={index}
                >
                    <div className='sidebar_icon'>
                        {item.icon}
                    </div>
                    <div className='sidebar_title'>
                        {t(item.title)}
                    </div>
                    {unreadCount > 0 && (
                        <Badge
                            count={unreadCount}
                            size="small"
                            style={{ backgroundColor: '#FF4D4F', marginLeft: 'auto', flexShrink: 0 }}
                        />
                    )}
                </Link>
                ) : null
            })}
        </div>
    </div>
  )
}
