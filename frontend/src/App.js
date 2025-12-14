import React, { useEffect, useState } from 'react'
import './App.css'
import './Ekg.css'
import Auth from './pages/auth/Auth'
import { useTranslation } from 'react-i18next';
import './locale/i18next'
import { useStore } from './store/Store'
import Main from './pages/cabinet/Main'
import { get_clinic_data } from './host/requests/ClinicRequest'
import { deleteTokenAccess } from './host/Host'
import {useNavigate} from 'react-router-dom'
export default function App() {
  const {t}=useTranslation()
  const {user_id, setuser_id, clinic, setclinic}=useStore()
  const [first_load, setfirst_load]=useState(false)
  const navigate=useNavigate()
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
            deleteTokenAccess()
            navigate('/')
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
