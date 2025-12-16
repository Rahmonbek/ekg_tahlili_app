import React, { useState } from 'react'
import ChangeLangs from './ChangeLangs'
import { FaBars, FaCircleInfo, FaHandSparkles } from 'react-icons/fa6'
import { useStore } from '../store/Store'
import { IoIosExit, IoMdExit } from 'react-icons/io'
import { useNavigate } from 'react-router-dom'
import { deleteTokenAccess } from '../host/Host'
import staff from '../images/staff_face.jpg'
import { useTranslation } from 'react-i18next'
import maleStaff from '../images/men_staff.jpg'
import femaleStaff from '../images/women_staff.jpg'
import { MdOutlineMedicalInformation } from 'react-icons/md'
import { formatHeaderLastname } from '../tools/formatters'
export default function Header() {
  const { open_menu, setopen_menu, setuser_id, setuser, user, setopen_admin_modal } = useStore();


const [isRightListOpen, setIsRightListOpen] = useState(false);

const handleExitIconClick = () => {
  setIsRightListOpen(!isRightListOpen);
};


  const navigate = useNavigate();

  const { t } = useTranslation();
  
  const handleExit = () => {
    deleteTokenAccess();
    navigate("/"); 
    setuser_id(null);
    setuser(null);
  };



  


  return (
    <div className='main_header'>
      <div onClick={() => setopen_menu(!open_menu)} className='menu_close'>
        <FaBars />
      </div>

      <div className='lang_exit'>
        <div className='header_others'>
          <ChangeLangs />
        </div>
{user!=null && user.doctor!=null?<div className='open_list'>
        <div className='exit_icon' onClick={handleExitIconClick}>
        <img src={(!user?.doctor?.gender ? femaleStaff : maleStaff)} alt="Staff" />
          <div>
          <h1>{formatHeaderLastname(user?.doctor?.lastName)+user?.doctor?.firstName}</h1>
 <p>
  { user.role[`name${t("data_lang")}`] 
  }
</p>

           </div>
        </div>

        <div  className={`right_list ${isRightListOpen ? "open" : ""}`}>
<ul>
  <li onClick={()=>{setopen_admin_modal(true); setIsRightListOpen(false)}}><a><i><FaCircleInfo /></i> {t("self_data")}</a></li>
  <li onClick={()=>{handleExit();  setIsRightListOpen(false)}}><a><i><FaHandSparkles /></i> {t("exit")}</a></li>
</ul>
        </div>
        </div>:<></>}

      </div>
    </div>
  );
}