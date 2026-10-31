import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { save_patcient_data, search_patcients_by_name } from '../host/requests/PatcientRequest';
import { formatPhoneNumber, formatPhoneNumberForForm } from '../tools/formatters';
import { dangerAlert } from '../tools/Alerts';

/** Backend bilan bir xil: `PatcientService.NameSearchLimit`. */
export const NAME_SEARCH_LIMIT = 30;

/**
 * Tahlil yuklash sahifalari uchun bemor tanlash: ism / familiya /
 * otasining ismi bo'yicha qidiruv → ro'yxatdan tanlash YOKI yangi bemor.
 *
 * Ilgari bemor passport seriyasi + tug'ilgan sana bo'yicha qidirilardi
 * va topilmasa shu ikki qiymat bilan yangi bemor yaratilardi. Endi
 * yangi bemor uchun faqat familiya va ism majburiy (loyiha egasining
 * qarori), passport va tug'ilgan sana formadagi ixtiyoriy maydonlar.
 *
 * Qaytaradigan nomlar eski `usePatientSearch` bilan mos (`patcient`,
 * `checkReady`, `savePatcient`, `resetPatient`, …) — sahifalar shular
 * orqali ishlaydi.
 *
 * @param {object}   opts
 * @param {object}   opts.form           bemor ma'lumotlari formasi (Ant Design)
 * @param {Function} opts.getDistricts   viloyat bo'yicha tumanlarni yuklaydi
 * @param {Function} [opts.onPatientFound] bemor tanlangach/saqlangach chaqiriladi
 */
export function usePatientNameSearch({ form, getDistricts, onPatientFound }) {
    const { t } = useTranslation();
    const [results, setResults] = useState([]);
    const [searched, setSearched] = useState(false);
    const [lastQuery, setLastQuery] = useState('');
    const [patcient, setPatcient] = useState(null);
    const [checkReady, setCheckReady] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingSave, setLoadingSave] = useState(false);
    const [phoneValue, setPhoneValue] = useState('');

    const lang = t('data_lang') === 'Ru' ? 'ru' : t('data_lang') === 'En' ? 'en' : 'uz';

    const searchPatcient = useCallback(async ({ query }) => {
        const q = (query || '').trim();
        setLoading(true);
        setIsCreating(false);
        try {
            const res = await search_patcients_by_name({ q, lang });
            setResults(Array.isArray(res?.data?.data) ? res.data.data : []);
            setLastQuery(q);
            setSearched(true);
        } catch (err) {
            setResults([]);
            dangerAlert(err?.response?.data?.message
                || t('patient_search_failed', { defaultValue: 'Qidiruvda xatolik. Qayta urinib ko\'ring.' }));
        } finally {
            setLoading(false);
        }
    }, [lang, t]);

    /** Ro'yxat qatori → tahrirlash formasi qiymatlari (O'zgartirish tugmasi uchun). */
    const fillForm = useCallback(async (p) => {
        const values = {
            lastname: p.lastName || '',
            firstname: p.firstName || '',
            surename: p.sureName || '',
            birthdate: p.birthDate || null,
            gender: p.gender ?? undefined,
            passport: p.passportMasked && p.passportMasked !== '—' ? p.passportMasked : '',
            phone: formatPhoneNumberForForm(p.phone),
            address: p.address || '',
            regioname: undefined,
            districtname: undefined,
        };
        if (p.regionId) {
            values.regioname = p.regionId;
            await getDistricts(p.regionId);
            if (p.districtId) values.districtname = { value: p.districtId, label: p.districtName };
        }
        form.setFieldsValue(values);
        setPhoneValue(values.phone);
    }, [form, getDistricts]);

    /** Ro'yxatdan bemor tanlandi. */
    const selectPatient = useCallback(async (row) => {
        setPatcient(row);
        setCheckReady(true);
        setIsCreating(false);
        await fillForm(row);
        onPatientFound?.(row);
    }, [fillForm, onPatientFound]);

    /**
     * "Yangi bemor qo'shish": forma qidiruv so'zlari bilan to'ldiriladi
     * (familiya ism otasining_ismi tartibida) — qayta yozish shart emas.
     */
    const startCreate = useCallback(() => {
        const [lastname = '', firstname = '', ...rest] = lastQuery.toUpperCase().split(/\s+/).filter(Boolean);
        form.resetFields();
        form.setFieldsValue({ lastname, firstname, surename: rest.join(' ') });
        setPhoneValue('');
        setPatcient(null);
        setCheckReady(false);
        setIsCreating(true);
    }, [form, lastQuery]);

    const cancelCreate = useCallback(() => setIsCreating(false), []);

    /** Yangi bemorni yaratadi yoki tanlangan bemorni tahrirlaydi. */
    const savePatcient = useCallback(async (val) => {
        setLoadingSave(true);
        try {
            const phone = formatPhoneNumber(val.phone);
            const res = await save_patcient_data({
                // Tahrirlash rejimida aynan shu bemor yangilanadi
                id: !isCreating && patcient?.id ? patcient.id : undefined,
                lastname: val.lastname,
                firstname: val.firstname,
                surename: val.surename || '',
                birthdate: val.birthdate || null,
                gender: val.gender ?? null,
                passport: val.passport || '',
                // "+998" prefiksining o'zi — telefon kiritilmagan
                phone: phone && phone.length > 3 ? phone : '',
                address: val.address || '',
                district_id: val.districtname?.value ?? null,
            });
            const saved = res.data;
            // Javob — bemor entity'si; ro'yxat qatori ko'rinishiga keltiramiz
            const row = {
                id: saved.id,
                lastName: saved.lastName,
                firstName: saved.firstName,
                sureName: saved.sureName,
                birthDate: saved.birthDate,
                gender: saved.gender,
                phone: saved.phone,
                address: saved.address,
                passportMasked: saved.passport || '—',
                regionId: saved.district?.region?.id ?? saved.district?.regionId ?? null,
                districtId: saved.districtId ?? null,
                districtName: saved.district ? saved.district[`name${t('data_lang')}`] : null,
            };
            setPatcient(row);
            setCheckReady(true);
            setIsCreating(false);
            // Forma bazada SAQLANGAN qiymatlarni ko'rsatsin (normallashtirilgan
            // ism, passport) — "O'zgartirish" bosilganda eski matn chiqmasin
            await fillForm(row);
            onPatientFound?.(row);
        } catch (err) {
            dangerAlert(err?.response?.data?.message
                || t('patient_save_failed', { defaultValue: 'Bemor ma\'lumotlarini saqlab bo\'lmadi' }));
        } finally {
            setLoadingSave(false);
        }
    }, [isCreating, patcient, fillForm, onPatientFound, t]);

    /** Hammasini boshidan — qidiruv natijalari ham tozalanadi. */
    const resetPatient = useCallback(() => {
        setPatcient(null);
        setCheckReady(false);
        setIsCreating(false);
        setResults([]);
        setSearched(false);
        setLastQuery('');
        setPhoneValue('');
        setLoading(false);
        setLoadingSave(false);
    }, []);

    return {
        results,
        searched,
        lastQuery,
        limitReached: results.length >= NAME_SEARCH_LIMIT,
        patcient,
        checkReady,
        isCreating,
        loading,
        loadingSave,
        phoneValue,
        setPhoneValue,
        searchPatcient,
        selectPatient,
        startCreate,
        cancelCreate,
        savePatcient,
        resetPatient,
    };
}
