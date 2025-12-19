import React, { useEffect, useState } from 'react'
import './App.css'
import './Ekg.css'
import Auth from './pages/auth/Auth'
import { useTranslation } from 'react-i18next';
import './locale/i18next'
import { useStore } from './store/Store'
import Main from './pages/cabinet/Main'

import { deleteTokenAccess } from './host/Host'
import {useNavigate} from 'react-router-dom'
import { get_user_data } from './host/requests/UserRequest';
import Loader from './components/Loader';

export default function App() {
  const {t}=useTranslation()
  const {user_id, setuser_id, user, setuser, open_admin_modal, setopen_admin_modal, loader, setloader}=useStore()
  
  const [first_load, setfirst_load]=useState(false)
  const navigate=useNavigate()
  
  useEffect(()=>{

    const token=window.localStorage.getItem("NMED_token")
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
      }catch(err){
        console.log(err)
            deleteTokenAccess()
            navigate('/')
      }finally{

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
