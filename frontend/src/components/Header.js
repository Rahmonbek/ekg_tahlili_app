import React from 'react'
import ChangeLangs from './ChangeLangs'
import { FaBars } from 'react-icons/fa6'
import { useStore } from '../store/Store'

export default function Header() {
  const {open_menu, setopen_menu}=useStore()
  return (
    <div className='main_header'>
      <div onClick={()=>{setopen_menu(!open_menu)}} className='menu_close'>
<FaBars />
      </div>

      <div  className='header_others'>
<ChangeLangs/>
      </div>
        
    </div>
  )
}
