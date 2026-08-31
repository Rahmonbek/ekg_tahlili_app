import { useEffect, useState } from 'react';
import axiosInstance from '../host/Api';

/**
 * Tahlil turi uchun ruxsat etilgan fayl kengaytmalari (T-041).
 *
 * Ilgari har bir yuklash sahifasida `accept=".pdf"` ko'rinishida qo'lda
 * yozilgan edi va u server qabul qiladigan ro'yxatdan farq qilardi:
 *
 * | Tur    | Interfeys ko'rsatardi | Server qabul qilardi          |
 * |--------|-----------------------|-------------------------------|
 * | EKG    | xml, jpg, png         | xml, csv, tsv, png, jpg, jpeg |
 * | Holter | pdf                   | pdf, png, jpg, jpeg           |
 * | SMAD   | pdf                   | pdf, png, jpg, jpeg           |
 *
 * Ya'ni klinika Holter hisobotining suratini yuklay olardi, lekin buni
 * bilmasdi. Teskari xavf ham bor: interfeys serverdan kengroq ro'yxat
 * ko'rsatsa, foydalanuvchi faylni tanlab, yuklab, faqat serverdan
 * xatolik olardi.
 *
 * Ro'yxat bir marta so'raladi va modul darajasida keshlanadi — u
 * deyarli o'zgarmaydi va har sahifa ochilishida so'rov yuborish keraksiz.
 */

/** Modul darajasidagi kesh: barcha sahifalar uchun bitta so'rov. */
let cache = null;
let pending = null;

/** Server javob bermasa ishlatiladi — forma baribir ishlashi kerak. */
const FALLBACK = {
    ecg: ['.csv', '.jpeg', '.jpg', '.png', '.tsv', '.xml'],
    holter: ['.jpeg', '.jpg', '.pdf', '.png'],
    smad: ['.jpeg', '.jpg', '.pdf', '.png'],
    lab: ['.jpeg', '.jpg', '.pdf', '.png'],
    diagnose: ['.jpeg', '.jpg', '.pdf', '.png'],
};

async function load() {
    if (cache) return cache;
    if (!pending) {
        pending = axiosInstance
            .get('/analyses/file-types')
            .then((res) => {
                cache = res.data || FALLBACK;
                return cache;
            })
            .catch(() => {
                cache = FALLBACK;
                return cache;
            })
            .finally(() => {
                pending = null;
            });
    }
    return pending;
}

/**
 * @param {string} kind "ecg" | "holter" | "smad" | "lab" | "diagnose"
 * @returns {{ extensions: string[], accept: string, label: string }}
 */
export default function useFileTypes(kind) {
    const [types, setTypes] = useState(cache || FALLBACK);

    useEffect(() => {
        let alive = true;
        load().then((data) => {
            if (alive) setTypes(data);
        });
        return () => { alive = false; };
    }, []);

    const extensions = types[kind] || FALLBACK[kind] || [];

    return {
        extensions,
        // `<Upload accept>` uchun
        accept: extensions.join(','),
        // Foydalanuvchiga ko'rsatiladigan matn: "pdf, png, jpg"
        label: extensions.map((e) => e.replace('.', '')).join(', '),
    };
}
