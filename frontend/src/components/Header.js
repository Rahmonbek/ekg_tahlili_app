import React, { useState } from 'react'
import ChangeLangs from './ChangeLangs'
import { FaBars } from 'react-icons/fa6'
import { useStore } from '../store/Store'
import { IoIosExit, IoMdExit } from 'react-icons/io'
import { useNavigate } from 'react-router-dom'
import { deleteTokenAccess } from '../host/Host'
import staff from '../images/staff_face.jpg'
import { useTranslation } from 'react-i18next'
import maleStaff from '../images/men_staff.jpg'
import femaleStaff from '../images/women_staff.jpg'
import { MdOutlineMedicalInformation } from 'react-icons/md'
export default function Header() {
  const { open_menu, setopen_menu, setuser_id, setuser, user } = useStore();
  console.log(user.doctor.firstName); 
  console.log(user.doctor.gender);
console.log(user.doctor.lastName);   
console.log(user.doctor.phone);     
console.log(user.role.nameEn);

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

  const lastName = user.doctor.lastName; 
let prefix = "";


const twoLetterPrefixes = ["Sh", "Ch"]; 
const lastNameUpper = lastName.toUpperCase();

const prefixMatch = twoLetterPrefixes.find(p => lastNameUpper.startsWith(p.toUpperCase()));
if (prefixMatch) {
  prefix = prefixMatch;
} else {
  prefix = lastNameUpper[0];
}
const displayName = `${prefix}.${user.doctor.firstName}`;


  return (
    <div className='main_header'>
      <div onClick={() => setopen_menu(!open_menu)} className='menu_close'>
        <FaBars />
      </div>

      <div className='lang_exit'>
        <div className='header_others'>
          <ChangeLangs />
        </div>
<div className='open_list'>
        <div className='exit_icon' onClick={handleExitIconClick}>
        <img src={user ? (user.doctor.gender ? maleStaff : femaleStaff) : staff} alt="Staff" />
          <div>
          <h1>{user ? displayName : "..."}</h1>
 <p>
  {user 
    ? user.role[`name${t("data_lang")}`] 
    : ""
  }
</p>

           </div>
        </div>

        <div  className={`right_list ${isRightListOpen ? "open" : ""}`}>
<ul>
  <li ><a><i><MdOutlineMedicalInformation /></i> Shaxsiy ma'lumotlar</a></li>
  <li onClick={handleExit}><a><i><IoIosExit /></i> Chiqish</a></li>
</ul>
        </div>
        </div>
      </div>
    </div>
  );
}