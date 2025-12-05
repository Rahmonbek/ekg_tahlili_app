import React from 'react'
import EkgAnalyzer from './pages/ekg_analyse/EkgAnalyzer'
import './App.css'
import './Ekg.css'
import Login from './pages/auth/components/Login'
import Auth from './pages/auth/Auth'
import { useTranslation } from 'react-i18next';
import './locale/i18next'
export default function App() {
  return (
    <div className='main_app'>
      <Auth/>
      {/* <EkgAnalyzer/> */}
    </div>
  )
}
