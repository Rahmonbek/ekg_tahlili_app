import React, { useEffect, useState } from 'react'
import EkgAnalyzer from './pages/ekg_analyse/EkgAnalyzer'
import './App.css'
import './Ekg.css'
import Login from './pages/auth/components/Login'
import Auth from './pages/auth/Auth'
import { useTranslation } from 'react-i18next';
import './locale/i18next'
import { Route, Routes } from 'react-router-dom'
import { useStore } from './store/Store'
import Main from './pages/cabinet/Main'
import { get_clinic_data } from './host/requests/ClinicRequest'
export default function App() {
  const {t}=useTranslation()
  const {user_id, setuser_id, clinic, setclinic}=useStore()
  const [first_load, setfirst_load]=useState(false)
  useEffect(()=>{
    const token=window.localStorage.getItem("NMED_token")
    if(token!=null){
      getClinicData()
    

    }else{
       setfirst_load(true)
    }
   
    }, [])

    const getClinicData=async()=>{
      try{
         var res=await get_clinic_data()
         setclinic(res.data)
         setuser_id(res.data.user.id)
         setfirst_load(true)
         console.log(res)
      }catch(err){

      }finally{

      }
    }
  return (
<>

{first_load?<div className='main_app'>
     {user_id==null?<Auth/>:<Main/>}
     
      {/* <EkgAnalyzer/> */}
    </div>:<></>}
    </>

  )
}
