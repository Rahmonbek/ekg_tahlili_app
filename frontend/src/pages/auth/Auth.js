import React from 'react'
import Login from './components/Login'
import logo from '../../images/logo.png'
import { useTranslation } from 'react-i18next'
import ChangeLangs from '../../components/ChangeLangs'


export default function Auth() {
    const {t}=useTranslation()
  return (
    <>
    <div className='auth_navbar'>
        <div className='auth_brand'>
               <img src={logo}/>
               <h1>{t("main_title")}</h1>
        </div>

        <div className='auth_lang'>
               <ChangeLangs/>
               
        </div>
    </div>
    <Login/>
</>
  )
}
