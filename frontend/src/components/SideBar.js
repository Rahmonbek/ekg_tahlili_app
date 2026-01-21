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

    
  return (
    <div className={`sidebar ${!open_menu?"closed_menu":''}`}>
        <div className='sidebar_head'>
            <img src={logo}/>
            <h1>N MED AI</h1>
        </div>
        <div className='sidebar_line'></div>
        <div className='sidebar_menu'>
            {routers.map((item, index)=>(
                (user==null || item.role_id.length==0 || item.role_id.indexOf(user.roleId)!=-1)?<Link to={item.path} className={`sidebar_menu_item 
                ${(location.pathname.indexOf(item.tools)!=-1 && item.tools.length!=0) || (index==0 && location.pathname.replaceAll("/", '').length==0) || 
                
                (user!=null && (user.roleId!=2 && user.roleId!=3) && item.tools=='analyse-ecg' && location.pathname.replaceAll("/", '').length==0)?"active_sidebar_item":""}`} key={index}>
                   <div className='sidebar_icon'>
                    {item.icon}
                   </div>
                    <div className='sidebar_title'>
                        {t(item.title)}
                    </div>
                </Link>:<></>
            ))}
        </div>
    </div>
  )
}
