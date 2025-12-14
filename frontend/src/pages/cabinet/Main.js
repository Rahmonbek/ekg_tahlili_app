import React from 'react'
import SideBar from '../../components/SideBar'
import Header from '../../components/Header'
import { useTranslation } from 'react-i18next'
import { Route, Routes } from 'react-router-dom'
import ClinicInfo from './pages/ClinicInfo'
import EkgAnalyzer from '../ekg_analyse/EkgAnalyzer'
import EcgAnalyzer from './ecg_analyse/EcgAnalyzer'

export default function Main() {
    const {t}=useTranslation()
  return (
    <div className='main_box'>
        <SideBar/>
        <div className='content_box'>
            <Header/>
            <div className='content'>
                <Routes>
                    <Route path="settings" element={<ClinicInfo/>} />
                    <Route path="analyse-ecg" element={<EcgAnalyzer/>} />
                </Routes>
            </div>
        </div>
    </div>
  )
}
