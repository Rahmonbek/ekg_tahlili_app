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
import SmadAnalysesList from './smad_analyse/SmadAnalysesList'
import HolterAnalysesList from './holter_analyse/HolterAnalysesList'
import LabAnalysesList from './lab_analyse/LabAnalysesList'
import DiagnosesList from './diagnoses/DiagnosesList'
import EcgAnalyseView from './ecg_analyse/EcgAnalyseView'
import HolterAnalyseView from './holter_analyse/HolterAnalyseView'
import SmadAnalyseView from './smad_analyse/SmadAnalyseView'
import LabAnalyseView from './lab_analyse/LabAnalyseView'
import DiagnoseView from './diagnoses/DiagnoseView'
const ProtectedRoute = ({ allowedRoles, userRole, children }) => {
    // Agar berilgan ruxsatlar bo'sh bo'lsa (barchaga) YOKI foydalanuvchi roli ruxsat etilganlar ruyxatida bo'lsa
    if (allowedRoles.length === 0 || allowedRoles.includes(userRole)) {
        return children;
    }
    // Ruxsat yo'q bo'lsa majburiy asosiy (Home) sahifaga qaytsin
    return <Navigate to="/" replace />;
};


export default function Main() {
    const { t } = useTranslation()
    const { complaints, setcomplaints, user, setlab_values, lab_values } = useStore()
    useEffect(() => {
        if (complaints.length == 0) {
            getComplaints()
        }
        if (lab_values.length == 0) {
            getLabValuesTypes()
        }
    }, [])
    const getComplaints = async () => {
        try {
            var res = await get_complaints_data()
            setcomplaints(res.data)
        } catch (err) {

        }
    }
    const getLabValuesTypes = async () => {
        try {
            var res = await get_lab_values_data()
            setlab_values(res.data)
        } catch (err) {

        }
    }
    return (
        <div className='main_box'>
            <SideBar />
            <div className='content_box'>
                <Header />
                {user != null ? <div className='content'>
                    <Routes>
                        {/* Birlamchi yo'naltirishlar (Default Routes) */}
                        <Route path="/" element={user.roleId === 2 || user.roleId === 3 ? <Doctors /> : <EcgAnalysesList />} />
                        <Route path="/cabinet" element={<Navigate to="/" replace />} />

                        {/* Admin/Menejer kabi maxsus rollar uchun marshrutlar (Role: 2, 3) */}
                        <Route path="/doctor" element={
                            <ProtectedRoute allowedRoles={[2, 3]} userRole={user.roleId}><Doctors /></ProtectedRoute>
                        } />
                        <Route path="/doctor/create" element={
                            <ProtectedRoute allowedRoles={[2, 3]} userRole={user.roleId}><CreateUpdateDoctor /></ProtectedRoute>
                        } />
                        <Route path="/doctor/create/:id" element={
                            <ProtectedRoute allowedRoles={[2, 3]} userRole={user.roleId}><CreateUpdateDoctor /></ProtectedRoute>
                        } />
                        <Route path="/settings" element={
                            <ProtectedRoute allowedRoles={[2, 3]} userRole={user.roleId}><ClinicInfo /></ProtectedRoute>
                        } />

                        {/* Barchaga ochiq marshrutlar */}
                        {/* 1. Tahlillar Ro'yxati (List) */}
                        <Route path="/ecg-analyses" element={
                            <ProtectedRoute allowedRoles={[]} userRole={user.roleId}><EcgAnalysesList /></ProtectedRoute>
                        } />
                        <Route path="/smad-analyses" element={
                            <ProtectedRoute allowedRoles={[]} userRole={user.roleId}><SmadAnalysesList /></ProtectedRoute>
                        } />
                        <Route path="/holter-analyses" element={
                            <ProtectedRoute allowedRoles={[]} userRole={user.roleId}><HolterAnalysesList /></ProtectedRoute>
                        } />
                        <Route path="/lab-analyses" element={
                            <ProtectedRoute allowedRoles={[]} userRole={user.roleId}><LabAnalysesList /></ProtectedRoute>
                        } />
                        <Route path="/patient-diagnoses" element={
                            <ProtectedRoute allowedRoles={[]} userRole={user.roleId}><DiagnosesList /></ProtectedRoute>
                        } />

                        {/* 2. Tahlil yaratish/ko'rish (Details/Analyze) */}
                        <Route path="/analyse-ecg" element={
                            <ProtectedRoute allowedRoles={[]} userRole={user.roleId}><EcgAnalyzer /></ProtectedRoute>
                        } />
                        <Route path="/analyse-holter" element={
                            <ProtectedRoute allowedRoles={[]} userRole={user.roleId}><HolterAnalyzer /></ProtectedRoute>
                        } />
                        <Route path="/analyse-smad" element={
                            <ProtectedRoute allowedRoles={[]} userRole={user.roleId}><SmadAnalyzer /></ProtectedRoute>
                        } />
                        <Route path="/analyse-lab" element={
                            <ProtectedRoute allowedRoles={[]} userRole={user.roleId}><LabAnalyzer /></ProtectedRoute>
                        } />
                        <Route path="/diagnoses-create" element={
                            <ProtectedRoute allowedRoles={[]} userRole={user.roleId}><Diagnoses /></ProtectedRoute>
                        } />

                        {/* 3. Ko'rish (View) sahifalari */}
                        <Route path="/ecg-analyses/view/:id" element={
                            <ProtectedRoute allowedRoles={[]} userRole={user.roleId}><EcgAnalyseView /></ProtectedRoute>
                        } />
                        <Route path="/holter-analyses/view/:id" element={
                            <ProtectedRoute allowedRoles={[]} userRole={user.roleId}><HolterAnalyseView /></ProtectedRoute>
                        } />
                        <Route path="/smad-analyses/view/:id" element={
                            <ProtectedRoute allowedRoles={[]} userRole={user.roleId}><SmadAnalyseView /></ProtectedRoute>
                        } />
                        <Route path="/lab-analyses/view/:id" element={
                            <ProtectedRoute allowedRoles={[]} userRole={user.roleId}><LabAnalyseView /></ProtectedRoute>
                        } />
                        <Route path="/patient-diagnoses/view/:id" element={
                            <ProtectedRoute allowedRoles={[]} userRole={user.roleId}><DiagnoseView /></ProtectedRoute>
                        } />

                        {/* Bemorlar va Boshqalar */}
                        <Route path="/patcients" element={
                            <ProtectedRoute allowedRoles={[]} userRole={user.roleId}><Patcients /></ProtectedRoute>
                        } />
                        {/* Notog'ri linkka (404) kirsangiz, avtomatik bosh sahifaga qaytaradi */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div> : <></>}
            </div>
            <AdminModal />
        </div>
    )
}
