import { useState, useRef, useEffect } from 'react'
import ChangeLangs from './ChangeLangs'
import { FaBars, FaCircleInfo, FaHandSparkles } from 'react-icons/fa6'
import { MdOutlinePendingActions } from 'react-icons/md'
import { useStore } from '../store/Store'
import { useNavigate, useLocation } from 'react-router-dom'
import { deleteTokenAccess } from '../host/Host'
import { useTranslation } from 'react-i18next'
import maleStaff from '../images/avatars/male.jpg'
import femaleStaff from '../images/avatars/female.jpg'
import { formatHeaderLastname } from '../tools/formatters'
import { FaHome } from 'react-icons/fa'
import { MdChevronRight } from 'react-icons/md'
import { buildCrumbs } from '../tools/breadcrumbs'
import VideoCallHeaderIndicator from './video/VideoCallHeaderIndicator'
import { imgApi } from '../host/Host'

export default function Header() {
  const { open_menu, setopen_menu, setuser_id, setuser, user, setopen_admin_modal } = useStore();
  const [isRightListOpen, setIsRightListOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Tashqaridan bosganda dropdown yopiladi
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsRightListOpen(false);
      }
    };
    if (isRightListOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isRightListOpen]);

  const handleExitIconClick = () => setIsRightListOpen(!isRightListOpen);

  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const crumbs = buildCrumbs(location.pathname);

  const handleExit = () => {
    deleteTokenAccess();
    navigate("/");
    setuser_id(null);
    setuser(null);
  };

  const headerAvatar = user?.doctor?.avatar
    ? `${imgApi}${user.doctor.avatar}`
    : (!user?.doctor?.gender ? femaleStaff : maleStaff);

  // Admin yoki Direktor va klinika hali faollashtirilmagan
  const showInactiveNotice =
    (user?.roleId === 2 || user?.roleId === 3) &&
    user?.clinic?.isActive === false;

  return (
    <div className='main_header'>
      <div onClick={() => setopen_menu(!open_menu)} className={`menu_close ${open_menu ? "open" : ""}`}>
        <FaBars />
      </div>

      {/* Klinika faollashtirilmagan xabar — markazda, faqat Admin/Direktor uchun */}
      {showInactiveNotice && (
        <div className='clinic_inactive_notice'>
          <span className='clinic_inactive_pulse' />
          <MdOutlinePendingActions className='clinic_inactive_icon' />
          <span className='clinic_inactive_text'>{t('clinic_not_active_title')}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className='header_breadcrumb'>
        {crumbs.map((crumb, i) => (
          <span key={crumb.path} className='breadcrumb_item'>
            {i > 0 && <MdChevronRight className='breadcrumb_sep' />}
            {i === 0
              ? <span className='breadcrumb_link' onClick={() => navigate(crumb.path)}><FaHome /></span>
              : i < crumbs.length - 1
                ? <span className='breadcrumb_link' onClick={() => navigate(crumb.path)}>{t(crumb.labelKey)}</span>
                : <span className='breadcrumb_current'>{t(crumb.labelKey)}</span>
            }
          </span>
        ))}
      </nav>

      <div className='lang_exit'>
        <VideoCallHeaderIndicator />
        <div className='header_others'>
          <ChangeLangs />
        </div>
        {user != null && user.doctor != null ? <div className='open_list' ref={dropdownRef}>
          <div className='exit_icon' onClick={handleExitIconClick}>
            <div className="head_img"> <img src={headerAvatar} alt="Staff" /></div>
           
            <div>
              <h1>{formatHeaderLastname(user?.doctor?.lastName) + user?.doctor?.firstName}</h1>
              <p>{user.role[`name${t("data_lang")}`]}</p>
            </div>
          </div>

          <div className={`right_list ${isRightListOpen ? "open" : ""}`}>
            <ul>
              <li onClick={() => { setopen_admin_modal(true); setIsRightListOpen(false) }}><a><i><FaCircleInfo /></i> {t("self_data")}</a></li>
              <li onClick={() => { handleExit(); setIsRightListOpen(false) }}><a><i><FaHandSparkles /></i> {t("exit")}</a></li>
            </ul>
          </div>
        </div> : <></>}
      </div>
    </div>
  );
}
