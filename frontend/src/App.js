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
export default function App() {
  const {t}=useTranslation()
  const {user_id, setuser_id, user, setuser}=useStore()
  const [first_load, setfirst_load]=useState(false)
  const navigate=useNavigate()
  useEffect(()=>{

    const token=window.localStorage.getItem("NMED_token")
    if(token!=null){
      getUserData()
    

    }else{
      navigate("/")
       setfirst_load(true)
    }
   
    }, [user_id])

    const getUserData=async()=>{
      try{
         var res=await get_user_data()
         setuser(res.data)
         setuser_id(res.data.id)
         setfirst_load(true)
         console.log(res)
      }catch(err){
        console.log(err)
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
