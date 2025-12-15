import React from 'react'
import ChangeLangs from './ChangeLangs'
import { FaBars } from 'react-icons/fa6'
import { useStore } from '../store/Store'
import { IoMdExit } from 'react-icons/io'
import { useNavigate } from 'react-router-dom'

export default function Header() {
  const {open_menu, setopen_menu, setuser_id, setuser}=useStore()
  const navigate = useNavigate();
  const handleExit = () => {
    localStorage.removeItem("NMED_token");
    navigate("/"); 
    setuser_id(null)
    setuser(null)
  };

  return (
    <div className='main_header'>
      <div onClick={()=>{setopen_menu(!open_menu)}} className='menu_close'>
<FaBars />
      </div>

<div className='lang_exit'>
      <div  className='header_others'>
<ChangeLangs/>
      </div>

      <div className='exit_icon'>
<button onClick={handleExit}><IoMdExit /></button>
      </div>
      </div>
    </div>
  )
}
