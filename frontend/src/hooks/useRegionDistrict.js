import { useState, useEffect, useCallback } from 'react';
import { get_region_data, get_districts_data } from '../host/requests/RegionRequest';
import { useStore } from '../store/Store';

/**
 * Region/Tuman ma'lumotlarini boshqarish uchun hook.
 * Zustand cache regions ni saqlab qoladi — faqat 1 marta fetch.
 * 
 * Return: { regions, districts, fetchDistricts }
 */
export function useRegionDistrict() {
    const { regions, setregions } = useStore();
    const [districts, setDistricts] = useState([]);

    useEffect(() => {
        if (regions.length === 0) {
            fetchRegions();
        }
    }, []);

    const fetchRegions = useCallback(async () => {
        try {
            const res = await get_region_data();
            if (res.data) {
                setregions(res.data);
            }
        } catch (err) {
            // Region yuklashda xatolik — sessiya davom etishi mumkin
        }
    }, [setregions]);

    const fetchDistricts = useCallback(async (regionId) => {
        try {
            const res = await get_districts_data({ region_id: regionId });
            if (res.data) {
                setDistricts(res.data);
            }
        } catch (err) {
            // Tumanlarni yuklashda xatolik
        }
    }, []);

    return { regions, districts, setDistricts, fetchDistricts };
}
