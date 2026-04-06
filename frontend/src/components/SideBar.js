import React, { use, useEffect } from 'react'
import logo from '../images/logo.png'
import { routers } from '../tools/routes'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
import { useStore } from '../store/Store'

export default function SideBar() {
    const {t}=useTranslation()
    const location=useLocation()
    const {open_menu, user}=useStore()

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
            {routers.map((item, index)=>(
                (user==null || item.role_id.length===0 || item.role_id.indexOf(user.roleId)!==-1) ? (
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
                </Link>
                ) : null
            ))}
        </div>
    </div>
  )
}
