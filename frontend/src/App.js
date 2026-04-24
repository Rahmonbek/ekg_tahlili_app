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
import { get_unviewed_counts } from './host/requests/DashboardRequest'

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
         if(res.data.doctor==null || res.data.doctor.firstName==null){
          setopen_admin_modal(true)
         }
         if(res.data.roleId===4 || res.data.roleId===5){
           fetchUnreadCounts()
         }
      }catch(err){
        // token yo'q yoki muddati o'tgan — login ga yo'naltir
        navigate("/")
        setfirst_load(true)
      }finally{

      }
    }

    const fetchUnreadCounts=async()=>{
      try{
        const res = await get_unviewed_counts();
        const data = res.data;
        setecg_unread(data.ecg || 0);
        setholter_unread(data.holter || 0);
        setsmad_unread(data.smad || 0);
        setlab_unread(data.lab || 0);
        setdiagnoses_unread(data.diagnoses || 0);
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
