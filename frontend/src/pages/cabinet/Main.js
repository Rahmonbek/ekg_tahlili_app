import React, { useEffect } from 'react'
import SideBar from '../../components/SideBar'
import Header from '../../components/Header'
import { useTranslation } from 'react-i18next'
import { Route, Routes } from 'react-router-dom'
import ClinicInfo from './pages/ClinicInfo'
import EcgAnalyzer from './ecg_analyse/EcgAnalyzer'
import { useStore } from '../../store/Store'
import { get_complaints_data } from '../../host/requests/ComplaintsRequest'
import AdminModal from '../../components/AdminModal'
import Doctors from './pages/doctors/Doctors'

export default function Main() {
    const {t}=useTranslation()
    const {complaints, setcomplaints}=useStore()
    useEffect(()=>{
         if(complaints.length==0){
            getComplaints()
         }
    }, [])
    const getComplaints=async()=>{
        try{
             var res=await get_complaints_data()
             console.log(res)
             setcomplaints(res.data)
        }catch(err){
            console.log(err)
        }
    }
  return (
    <div className='main_box'>
        <SideBar/>
        <div className='content_box'>
            <Header/>
            <div className='content'>
                <Routes>
                    <Route path="" element={<Doctors/>} />
                    <Route path="settings" element={<ClinicInfo/>} />
                    <Route path="analyse-ecg" element={<EcgAnalyzer/>} />
                </Routes>
            </div>
        </div>
        <AdminModal/>
    </div>
  )
}
