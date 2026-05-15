import React, { useEffect, useState } from 'react'
import './App.css'
import './Ekg.css'
import Auth from './pages/auth/Auth'
import './locale/i18next'
import { useStore } from './store/Store'
import Main from './pages/cabinet/Main'
import { getTokenAccess } from './host/Host'
import { useNavigate } from 'react-router-dom'
import { get_user_data } from './host/requests/UserRequest';
import Loader from './components/Loader';
import { get_unviewed_counts } from './host/requests/DashboardRequest'
import ClinicSetupModal from './components/ClinicSetupModal'
import AnalysisProgressFloat from './components/AnalysisProgressFloat'
import useVideoSignalR from './hooks/useVideoSignalR'
import useConsultationSignalR from './hooks/useConsultationSignalR'
import IncomingCallModal from './components/video/IncomingCallModal'

export default function App() {
  const {
    user_id, setuser_id, user, setuser,
    open_admin_modal, setopen_admin_modal,
    loader,
    setecg_unread, setholter_unread, setsmad_unread, setlab_unread, setdiagnoses_unread,
    setclinic_setup_modal
  } = useStore()

  // SignalR video qo'ng'iroq — faqat Admin/Direktor/Shifokor uchun ulanadi
  const videoEnabled = !!user_id && [2, 3, 4].includes(user?.roleId)
  useVideoSignalR(videoEnabled)

  // SignalR konsultatsiya bildirishnomalari — faqat Admin/Direktor/Shifokor uchun
  useConsultationSignalR(videoEnabled)

  const [first_load, setfirst_load] = useState(false)
  const navigate = useNavigate()

  // Boshlang'ich yuklanish: faqat user yuklanmagan bo'lsa fetch qilish
  useEffect(() => {
    const token = getTokenAccess()
    if (token != null) {
      if (user == null) {
        getUserData()
      }
    } else {
      navigate("/")
      setfirst_load(true)
    }
  }, [user_id])

  // AdminModal yopilgandan keyin: user ma'lumotlarini yangilash va klinika setupni tekshirish
  useEffect(() => {
    if (!open_admin_modal && user != null) {
      getUserData(true)
    }
  }, [open_admin_modal])

  /**
   * Klinika setup kerakmi yoki yo'q tekshirish.
   * Faqat Admin (2) va Direktor (3) uchun.
   */
  const checkClinicSetup = (userData) => {
    const isAdmin = userData?.roleId === 2 || userData?.roleId === 3
    if (!isAdmin) return

    // Profil to'ldirilgan bo'lsa
    const profileDone = userData?.doctor?.firstName != null &&
      userData?.doctor?.firstName?.trim() !== ''
    if (!profileDone) return  // Avval profil to'ldirilsin (AdminModal ko'rsatadi)

    // Klinika asosiy ma'lumotlari bormi?
    const clinicName = userData?.clinic?.clinicName
    const address = userData?.clinic?.clinicDetail?.address
    const clinicDone = clinicName && clinicName.trim() !== '' &&
      address && address.trim() !== ''

    if (!clinicDone) {
      setclinic_setup_modal(true)
    }
  }

  const getUserData = async (isRefresh = false) => {
    try {
      const res = await get_user_data()
      setuser(res.data)
      setuser_id(res.data.id)
      setfirst_load(true)

      // Shifokor profili to'ldirilmagan bo'lsa — AdminModal ochish
      if (res.data.doctor == null || res.data.doctor.firstName == null ||
        res.data.doctor.firstName.trim() === '') {
        setopen_admin_modal(true)
      } else {
        // Profil to'liq — klinika setup ni tekshirish
        checkClinicSetup(res.data)
      }

      // Shifokor/hamshira uchun ko'rilmagan tahlillar sonini yuklash
      if (res.data.roleId === 4 || res.data.roleId === 5) {
        fetchUnreadCounts()
      }
    } catch (err) {
      // Faqat boshlang'ich yuklashda token muammosi bo'lsa — loginга yo'naltir
      if (!isRefresh) {
        navigate("/")
        setfirst_load(true)
      }
    }
  }

  const fetchUnreadCounts = async () => {
    try {
      const res = await get_unviewed_counts();
      const data = res.data;
      setecg_unread(data.ecg || 0);
      setholter_unread(data.holter || 0);
      setsmad_unread(data.smad || 0);
      setlab_unread(data.lab || 0);
      setdiagnoses_unread(data.diagnoses || 0);
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <>
      {first_load && (
        <div className="main_app">
          {user_id == null ? <Auth /> : <Main />}
          {loader ? <Loader /> : <></>}
        </div>
      )}
      {/* Klinika ma'lumotlari setup modali (2-qadam onboarding) */}
      <ClinicSetupModal />
      {/* Fon rejimidagi tahlillar float paneli */}
      {user_id != null && <AnalysisProgressFloat />}
      {/* Kiruvchi video qo'ng'iroq modali */}
      <IncomingCallModal />
    </>
  )
}
