import React, { use } from 'react'
import logo from '../images/logo.png'
import { routers } from '../tools/routes'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'
export default function SideBar() {
    const {t}=useTranslation()
    const location=useLocation()
  return (
    <div className='sidebar'>
        <div className='sidebar_head'>
            <img src={logo}/>
            <h1>N MED AI</h1>
        </div>
        <div className='sidebar_line'></div>
        <div className='sidebar_menu'>
            {routers.map((item, index)=>(
                <Link to={item.path} className={`sidebar_menu_item 
                ${(location.pathname.indexOf(item.tools)!=-1 && item.tools.length!=0) || (item.tools.length==0 && location.pathname.replaceAll("/", '').length==0)?"active_sidebar_item":""}`} key={index}>
                   <div className='sidebar_icon'>
                    {item.icon}
                   </div>
                    <div className='sidebar_title'>
                        {t(item.title)}
                    </div>
                </Link>
            ))}
        </div>
    </div>
  )
}
