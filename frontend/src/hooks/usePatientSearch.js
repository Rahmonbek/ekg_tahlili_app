import { useState, useCallback } from 'react';
import { get_patcient_by_passport, save_patcient_data } from '../host/requests/PatcientRequest';
import { formatPhoneNumber, formatPhoneNumberForForm } from '../tools/formatters';
import { useTranslation } from 'react-i18next';

/**
 * Bemor qidirish va saqlash uchun hook.
 * EcgAnalyzer, LabAnalyzer, HolterAnalyzer, SmadAnalyzer larda ishlatiladi.
 * 
 * Return: { patcient, passport, birthdate, loading, loadingSave, checkReady,
 *           searchPatcient, savePatcient, resetPatient, phoneValue, setPhoneValue }
 */
export function usePatientSearch({ form, getDistricts, onPatientFound }) {
    const { t } = useTranslation();
    const [patcient, setPatcient] = useState(null);
    const [passport, setPassport] = useState(null);
    const [birthdate, setBirthdate] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingSave, setLoadingSave] = useState(false);
    const [checkReady, setCheckReady] = useState(false);
    const [phoneValue, setPhoneValue] = useState('');

    const searchPatcient = useCallback(async (val) => {
        try {
            setLoading(true);
            setPassport(val.passport);
            setBirthdate(val.birthdate);

            const res = await get_patcient_by_passport(val);
            setPatcient(res.data);

            const new_data = {
                address: res.data.address || '',
                firstname: res.data.firstName || '',
                lastname: res.data.lastName || '',
                surename: res.data.sureName || '',
                gender: res.data.gender,
                phone: formatPhoneNumberForForm(res.data.phone),
            };

            if (res.data?.district?.region) {
                const regionId = res.data.district.region.id;
                new_data.regioname = regionId;
                await getDistricts(regionId);
                new_data.districtname = {
                    value: res.data.district.id,
                    label: res.data.district[`name${t("data_lang")}`],
                };
            }

            form.setFieldsValue(new_data);
            setPhoneValue(formatPhoneNumberForForm(res.data.phone));
            setCheckReady(true);

            if (onPatientFound) {
                onPatientFound(res.data);
            }
        } catch (err) {
            setPatcient({});
        } finally {
            setLoading(false);
        }
    }, [form, getDistricts, onPatientFound, t]);

    const savePatcient = useCallback(async (val) => {
        try {
            setLoadingSave(true);
            const res = await save_patcient_data({
                ...val,
                district_id: val.districtname.value,
                passport,
                birthdate,
                address: val.address,
                phone: formatPhoneNumber(val.phone),
            });
            setPatcient(res.data);
            setCheckReady(true);
        } catch (err) {
            setPatcient({});
        } finally {
            setLoadingSave(false);
        }
    }, [passport, birthdate]);

    const resetPatient = useCallback(() => {
        setPatcient(null);
        setCheckReady(false);
        setPhoneValue('');
        setLoading(false);
        setLoadingSave(false);
    }, []);

    return {
        patcient,
        passport,
        birthdate,
        loading,
        loadingSave,
        checkReady,
        phoneValue,
        setPhoneValue,
        searchPatcient,
        savePatcient,
        resetPatient,
    };
}
