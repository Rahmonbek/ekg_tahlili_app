import React, { useEffect } from 'react'
import SideBar from '../../components/SideBar'
import Header from '../../components/Header'
import { useTranslation } from 'react-i18next'
import { Route, Routes, Navigate } from 'react-router-dom'
import ClinicInfo from './pages/ClinicInfo'
import EcgAnalyzer from './ecg_analyse/EcgAnalyzer'
import EcgAnalysesList from './ecg_analyse/EcgAnalysesList'
import { useStore } from '../../store/Store'
import { get_complaints_data } from '../../host/requests/ComplaintsRequest'
import AdminModal from '../../components/AdminModal'
import Doctors from './pages/doctors/Doctors'
import CreateUpdateDoctor from './pages/doctors/create/CreateUpdateDoctor'
import Diagnoses from './diagnoses/Diagnoses'
import LabAnalyzer from './lab_analyse/LabAnalyzer'
import { get_lab_values_data } from '../../host/requests/LabValueTypesRequest'
import Patcients from './pages/patcients/Patcients'
import HolterAnalyzer from './holter_analyse/HolterAnalyzer'
import SmadAnalyzer from './smad_analyse/SmadAnalyzer'
import ParasitologyAnalyzer from './parasitology/ParasitologyAnalyzer'
import ParasitologyAnalysesList from './parasitology/ParasitologyAnalysesList'
import ParasitologyAnalyseView from './parasitology/ParasitologyAnalyseView'
import SmadAnalysesList from './smad_analyse/SmadAnalysesList'
import HolterAnalysesList from './holter_analyse/HolterAnalysesList'
import LabAnalysesList from './lab_analyse/LabAnalysesList'
import DiagnosesList from './diagnoses/DiagnosesList'
import EcgAnalyseView from './ecg_analyse/EcgAnalyseView'
import HolterAnalyseView from './holter_analyse/HolterAnalyseView'
import SmadAnalyseView from './smad_analyse/SmadAnalyseView'
import LabAnalyseView from './lab_analyse/LabAnalyseView'
import DiagnoseView from './diagnoses/DiagnoseView'
import Dashboard from './Dashboard'
import ClinicActivationGate from '../../components/ClinicActivationGate'
import VideoConference from './video_conference/VideoConference'
import MyConsultantsPage from './consultation/MyConsultantsPage'
import ConsultationListPage from './consultation/ConsultationListPage'
import ConsultationDetailPage from './consultation/ConsultationDetailPage'
import IncomingConsultationsPage from './consultation/IncomingConsultationsPage'
import MySchedulePage from './consultation/MySchedulePage'
import ConsultationWorkPage from './consultation/ConsultationWorkPage'

// ─── Rol asosida himoya ──────────────────────────────────────────────────────
const ProtectedRoute = ({ allowedRoles, userRole, children }) => {
    if (allowedRoles.length === 0 || allowedRoles.includes(userRole)) {
        return children
    }
    return <Navigate to="/" replace />
}

// ─── Klinika faollik gate: is_active=false bo'lsa blok xabari ko'rsatadi ────
// Faqat admin/direktor uchun qo'llaniladi (shifokor/hamshira loginda bloklanadi)
const ClinicGatedRoute = ({ allowedRoles, userRole, clinicIsActive, children }) => {
    if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        return <Navigate to="/" replace />
    }
    return (
        <ClinicActivationGate isActive={clinicIsActive}>
            {children}
        </ClinicActivationGate>
    )
}

export default function Main() {
    const { t } = useTranslation()
    const { complaints, setcomplaints, user, setlab_values, lab_values } = useStore()

    // Klinika faollik holati — SuperAdmin (1) uchun har doim true
    const clinicIsActive = user?.roleId === 1
        ? true
        : (user?.clinic?.isActive ?? false)

    useEffect(() => {
        if (complaints.length === 0) {
            getComplaints()
        }
        if (lab_values.length === 0) {
            getLabValuesTypes()
        }
    }, [])

    const getComplaints = async () => {
        try {
            const res = await get_complaints_data()
            setcomplaints(res.data)
        } catch (err) { }
    }

    const getLabValuesTypes = async () => {
        try {
            const res = await get_lab_values_data()
            setlab_values(res.data)
        } catch (err) { }
    }

    return (
        <div className='main_box'>
            <SideBar />
            <div className='content_box'>
                <Header />
                {user != null ? <div className='content'>
                    <Routes>
                        {/* ── Bosh sahifa va Dashboard ───────────────────────── */}
                        <Route path="/" element={
                            user.roleId === 2 || user.roleId === 3
                                ? <Dashboard />
                                : <ClinicActivationGate isActive={clinicIsActive}>
                                    <EcgAnalysesList />
                                </ClinicActivationGate>
                        } />
                        <Route path="/cabinet" element={<Navigate to="/" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />

                        {/* ── Admin/Direktor: klinika faollashtirilmasa ham kirishi mumkin ── */}
                        <Route path="/doctor" element={
                            <ProtectedRoute allowedRoles={[2, 3]} userRole={user.roleId}>
                                <Doctors />
                            </ProtectedRoute>
                        } />
                        <Route path="/doctor/create" element={
                            <ProtectedRoute allowedRoles={[2, 3]} userRole={user.roleId}>
                                <CreateUpdateDoctor />
                            </ProtectedRoute>
                        } />
                        <Route path="/doctor/create/:id" element={
                            <ProtectedRoute allowedRoles={[2, 3]} userRole={user.roleId}>
                                <CreateUpdateDoctor />
                            </ProtectedRoute>
                        } />
                        <Route path="/settings" element={
                            <ProtectedRoute allowedRoles={[2, 3]} userRole={user.roleId}>
                                <ClinicInfo />
                            </ProtectedRoute>
                        } />

                        {/* ── Tahlil ro'yxatlari — klinika faol bo'lsa ochiladi ── */}
                        <Route path="/ecg-analyses" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <EcgAnalysesList />
                            </ClinicGatedRoute>
                        } />
                        <Route path="/smad-analyses" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <SmadAnalysesList />
                            </ClinicGatedRoute>
                        } />
                        <Route path="/holter-analyses" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <HolterAnalysesList />
                            </ClinicGatedRoute>
                        } />
                        <Route path="/lab-analyses" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <LabAnalysesList />
                            </ClinicGatedRoute>
                        } />
                        <Route path="/patient-diagnoses" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <DiagnosesList />
                            </ClinicGatedRoute>
                        } />

                        {/* ── Tahlil yaratish — klinika faol bo'lsa ochiladi ── */}
                        <Route path="/analyse-ecg" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <EcgAnalyzer />
                            </ClinicGatedRoute>
                        } />
                        <Route path="/analyse-holter" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <HolterAnalyzer />
                            </ClinicGatedRoute>
                        } />
                        <Route path="/analyse-smad" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <SmadAnalyzer />
                            </ClinicGatedRoute>
                        } />
                        <Route path="/analyse-lab" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <LabAnalyzer />
                            </ClinicGatedRoute>
                        } />
                        <Route path="/diagnoses-create" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <Diagnoses />
                            </ClinicGatedRoute>
                        } />

                        {/* ── Ko'rish sahifalari — klinika faol bo'lsa ochiladi ── */}
                        <Route path="/ecg-analyses/view/:id" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <EcgAnalyseView />
                            </ClinicGatedRoute>
                        } />
                        <Route path="/holter-analyses/view/:id" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <HolterAnalyseView />
                            </ClinicGatedRoute>
                        } />
                        <Route path="/smad-analyses/view/:id" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <SmadAnalyseView />
                            </ClinicGatedRoute>
                        } />
                        <Route path="/lab-analyses/view/:id" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <LabAnalyseView />
                            </ClinicGatedRoute>
                        } />
                        <Route path="/patient-diagnoses/view/:id" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <DiagnoseView />
                            </ClinicGatedRoute>
                        } />

                        {/* ── Parazitologiya — klinika faol bo'lsa ochiladi ── */}
                        <Route path="/parasitology-analyses" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <ParasitologyAnalysesList />
                            </ClinicGatedRoute>
                        } />
                        <Route path="/parasitology-analyzer" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <ParasitologyAnalyzer />
                            </ClinicGatedRoute>
                        } />
                        <Route path="/parasitology-analyses/view/:id" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <ParasitologyAnalyseView />
                            </ClinicGatedRoute>
                        } />

                        {/* ── Bemorlar — klinika faol bo'lsa ochiladi ── */}
                        <Route path="/patcients" element={
                            <ClinicGatedRoute allowedRoles={[]} userRole={user.roleId} clinicIsActive={clinicIsActive}>
                                <Patcients />
                            </ClinicGatedRoute>
                        } />

                        {/* ── Video Konferensiya — Admin/Direktor/Shifokor ── */}
                        <Route path="/video-conference" element={
                            <ProtectedRoute allowedRoles={[2, 3, 4]} userRole={user.roleId}>
                                <VideoConference />
                            </ProtectedRoute>
                        } />

                        {/* ── Online Konsultatsiya — Admin/Direktor ── */}
                        <Route path="/consultants" element={
                            <ProtectedRoute allowedRoles={[2, 3]} userRole={user.roleId}>
                                <MyConsultantsPage />
                            </ProtectedRoute>
                        } />
                        <Route path="/consultations" element={
                            <ProtectedRoute allowedRoles={[2, 3]} userRole={user.roleId}>
                                <ConsultationListPage />
                            </ProtectedRoute>
                        } />
                        <Route path="/consultations/:id" element={
                            <ProtectedRoute allowedRoles={[2, 3, 4]} userRole={user.roleId}>
                                <ConsultationDetailPage />
                            </ProtectedRoute>
                        } />

                        {/* ── Online Konsultatsiya — Shifokor ── */}
                        <Route path="/incoming-consultations" element={
                            <ProtectedRoute allowedRoles={[4]} userRole={user.roleId}>
                                <IncomingConsultationsPage />
                            </ProtectedRoute>
                        } />
                        <Route path="/my-schedule" element={
                            <ProtectedRoute allowedRoles={[4]} userRole={user.roleId}>
                                <MySchedulePage />
                            </ProtectedRoute>
                        } />
                        <Route path="/consultations/:id/work" element={
                            <ProtectedRoute allowedRoles={[4]} userRole={user.roleId}>
                                <ConsultationWorkPage />
                            </ProtectedRoute>
                        } />

                        {/* 404 */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div> : <></>}
            </div>
            <AdminModal />
        </div>
    )
}
