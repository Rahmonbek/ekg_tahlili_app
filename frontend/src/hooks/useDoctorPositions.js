import { useState, useEffect, useCallback } from 'react';
import { get_doctor_by_clinic_id } from '../host/requests/DoctorRequest';
import { useStore } from '../store/Store';

/**
 * Shifokor va lavozimlar bilan ishlash uchun hook.
 * Zustand cache doctors/positions ni saqlaydi.
 * 
 * Return: { doctorDatas, positionDatas, selectedDoctors, 
 *           onChangeDoctors, filterByPosition, resetDoctorSelection }
 */
export function useDoctorPositions() {
    const { doctors, setdoctors, user } = useStore();
    const [doctorDatas, setDoctorDatas] = useState([]);
    const [positionDatas, setPositionDatas] = useState([]);
    const [selectedDoctors, setSelectedDoctors] = useState([]);
    const [doctorsLoaded, setDoctorsLoaded] = useState(doctors.length > 0);

    // Primitive ID — user object reference o'zgarganda qayta fetch bo'lmasin
    const clinicId = user?.clinic?.id;

    const fetchDoctors = useCallback(async () => {
        if (!clinicId) return;
        try {
            const res = await get_doctor_by_clinic_id({ id: clinicId });
            setDoctorDatas(res.data.doctor);
            setdoctors(res.data.doctor);
        } catch (err) {
            // Shifokorlarni yuklashda xatolik
        } finally {
            setDoctorsLoaded(true);
        }
    }, [clinicId, setdoctors]);

    useEffect(() => {
        if (!clinicId) return;
        if (doctors.length === 0) {
            fetchDoctors();
        } else {
            setDoctorDatas(doctors);
            setDoctorsLoaded(true);
        }
    // clinicId — stable primitive. user object reference va doctors
    // o'zgarishi ortiqcha fetch trigger bo'lmasligi uchun deps dan chiqarildi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clinicId]);

    const onChangeDoctors = useCallback((val) => {
        setSelectedDoctors((prev) => {
            const idx = prev.findIndex((x) => x.id === val.id);
            if (idx === -1) {
                return [...prev, val];
            } else {
                return prev.filter((x) => x.id !== val.id);
            }
        });
    }, []);

    const filterByPosition = useCallback((positionIds) => {
        setSelectedDoctors([]);
        if (positionIds.length === 0) {
            setDoctorDatas(doctors);
        } else {
            const result = doctors.filter((doctor) =>
                doctor.positions.some((pos) => positionIds.includes(pos.id))
            );
            setDoctorDatas([...result]);
        }
    }, [doctors]);

    const resetDoctorSelection = useCallback(() => {
        setSelectedDoctors([]);
        setDoctorDatas(doctors);
    }, [doctors]);

    return {
        doctorDatas,
        positionDatas,
        selectedDoctors,
        onChangeDoctors,
        filterByPosition,
        resetDoctorSelection,
        doctorsLoaded,
    };
}
