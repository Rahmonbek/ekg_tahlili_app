import { useState, useEffect, useCallback } from 'react';
import { get_doctor_by_clinic_id, get_params_for_add_staff } from '../host/requests/DoctorRequest';
import { useStore } from '../store/Store';

/**
 * Shifokor va lavozimlar bilan ishlash uchun hook.
 * Zustand cache doctors/positions ni saqlaydi.
 * 
 * Return: { doctorDatas, positionDatas, selectedDoctors, 
 *           onChangeDoctors, filterByPosition, resetDoctorSelection }
 */
export function useDoctorPositions() {
    const { doctors, setdoctors, positions, setpositions, setroles, user } = useStore();
    const [doctorDatas, setDoctorDatas] = useState([]);
    const [positionDatas, setPositionDatas] = useState([]);
    const [selectedDoctors, setSelectedDoctors] = useState([]);
    const fetchDoctors = useCallback(async () => {
        try {
            const res = await get_doctor_by_clinic_id({ id: user.clinic.id });
            setDoctorDatas(res.data.doctor);
            setdoctors(res.data.doctor);
        } catch (err) {
            // Shifokorlarni yuklashda xatolik
        }
    }, [user, setdoctors]);
    useEffect(() => {
        if (doctors.length === 0 && user != null) {
            fetchDoctors();
        } else {
            setDoctorDatas(doctors);
        }
    }, [user, doctors, fetchDoctors]);



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
    };
}
