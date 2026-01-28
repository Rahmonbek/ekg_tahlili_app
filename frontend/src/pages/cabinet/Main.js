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
import CreateUpdateDoctor from './pages/doctors/create/CreateUpdateDoctor'
import Diagnoses from './diagnoses/Diagnoses'
import LabAnalyzer from './lab_analyse/LabAnalyzer'
import { get_lab_values_data } from '../../host/requests/LabValueTypesRequest'
import Patcients from './pages/patcients/Patcients'


export default function Main() {
    const {t}=useTranslation()
    const {complaints, setcomplaints, user,  setlab_values, lab_values}=useStore()
    useEffect(()=>{
         if(complaints.length==0){
            getComplaints()
         }
          if(lab_values.length==0){
            getLabValuesTypes()
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
    const getLabValuesTypes=async()=>{
        try{
             var res=await get_lab_values_data()
             console.log(res)
             setlab_values(res.data)
        }catch(err){
            console.log(err)
        }
    }
  return (
    <div className='main_box'>
        <SideBar/>
        <div className='content_box'>
            <Header/>
            {user!=null?<div className='content'>
                <Routes>
                {user.roleId==2 || user.roleId==3?<>
                <Route path="" element={<Doctors/>} />
                <Route path="/cabinet" element={<Doctors/>} />
                    <Route path="/doctor" element={<Doctors/>} />
                    <Route path="/doctor/create" element={<CreateUpdateDoctor/>} />
                    <Route path="/doctor/create/:id" element={<CreateUpdateDoctor/>} />
                    <Route path="/settings" element={<ClinicInfo/>} />
                </>:<></>}
                    
                    {user.roleId!=2 && user.roleId!=3?<><Route path="" element={<EcgAnalyzer/>} /><Route path="/cabinet" element={<EcgAnalyzer/>} /></>:<></>}
                    <Route path="analyse-ecg" element={<EcgAnalyzer/>} />
                    <Route path="analyse-lab" element={<LabAnalyzer/>} />
                    <Route path="diagnoses" element={<Diagnoses/>} />
                    <Route path="patcients" element={<Patcients/>} />
                </Routes>
            </div>:<></>}
        </div>
        <AdminModal/>
    </div>
  )
}
