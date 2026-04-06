import React, { useEffect, useState } from 'react'
import './App.css'
import './Ekg.css'
import Auth from './pages/auth/Auth'
import { useTranslation } from 'react-i18next';
import './locale/i18next'
import { useStore } from './store/Store'
import Main from './pages/cabinet/Main'
import OpenAI from "openai";
import { deleteTokenAccess, getTokenAccess } from './host/Host'
import {useNavigate} from 'react-router-dom'
import { get_user_data } from './host/requests/UserRequest';
import Loader from './components/Loader';
import { get_ecg_unviewed_count } from './host/requests/ECGAnalyseRequest'
import { get_holter_unviewed_count } from './host/requests/HolterAnalyseRequest'
import { get_smad_unviewed_count } from './host/requests/SmadAnalyseRequest'
import { get_lab_unviewed_count } from './host/requests/LabAnalyseRequest'
import { get_diagnose_unviewed_count } from './host/requests/DiagnoseRequest'

export default function App() {
  const {t}=useTranslation()
  const {user_id, setuser_id, user, setuser, open_admin_modal, setopen_admin_modal, loader, setloader,
    setecg_unread, setholter_unread, setsmad_unread, setlab_unread, setdiagnoses_unread}=useStore()
  
  const [first_load, setfirst_load]=useState(false)
  const navigate=useNavigate()
  
  useEffect(()=>{

    const token=getTokenAccess()
    if(token!=null){
      if(user==null || !open_admin_modal){
getUserData()
      }
     }else{
      navigate("/")
       setfirst_load(true)
    }
   
    }, [user_id, open_admin_modal])





    
    


    const getUserData=async()=>{
      try{
         var res=await get_user_data()
         setuser(res.data)
         setuser_id(res.data.id)
         setfirst_load(true)
         console.log(res)
         if(res.data.doctor==null || res.data.doctor.firstName==null){
          setopen_admin_modal(true)
         }
         if(res.data.roleId===4 || res.data.roleId===5){
           fetchUnreadCounts()
         }
      }catch(err){
        console.log(err)
      }finally{

      }
    }

    const fetchUnreadCounts=async()=>{
      try{
        const [ecg, holter, smad, lab, diag] = await Promise.allSettled([
          get_ecg_unviewed_count(),
          get_holter_unviewed_count(),
          get_smad_unviewed_count(),
          get_lab_unviewed_count(),
          get_diagnose_unviewed_count(),
        ])
        if(ecg.status==='fulfilled') setecg_unread(ecg.value.data?.count || 0)
        if(holter.status==='fulfilled') setholter_unread(holter.value.data?.count || 0)
        if(smad.status==='fulfilled') setsmad_unread(smad.value.data?.count || 0)
        if(lab.status==='fulfilled') setlab_unread(lab.value.data?.count || 0)
        if(diag.status==='fulfilled') setdiagnoses_unread(diag.value.data?.count || 0)
      }catch(err){
        console.log(err)
      }
    }
  return (
<>

{first_load && (
  <div className="main_app">
    {user_id == null ? <Auth /> : <Main />}
     {
      loader?<Loader/>:<></>
     }
   </div>
)}
    </>

  )
}
