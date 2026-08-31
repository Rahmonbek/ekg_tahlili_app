import { useEffect } from 'react'

/** Brauzer yorlig'idagi umumiy qo'shimcha. */
const SUFFIX = 'NMED'

/**
 * Sahifa ochilganda brauzer yorlig'ining sarlavhasini o'zgartiradi.
 *
 * Ilgari barcha sahifalarda bitta SEO sarlavhasi turardi:
 * "NMED — AI EKG va Tibbiy Diagnostika Platformasi | O'zbekiston".
 * Shifokorlar odatda bir nechta yorliq ochib ishlaydi (bemor kartasi,
 * EKG natijasi, xulosa yozish) — barcha yorliqlar bir xil nomlanganda
 * keraklisini topib bo'lmasdi, brauzer tarixi va xatcho'plar ham
 * foydasiz edi.
 *
 * @param {string} title Sahifa nomi. Bo'sh bo'lsa sarlavha o'zgarmaydi
 *                       (masalan ma'lumot hali yuklanmagan bo'lsa).
 */
export default function useDocumentTitle(title) {
    useEffect(() => {
        if (!title) return

        const previous = document.title
        document.title = `${title} — ${SUFFIX}`

        // Sahifadan chiqilganda avvalgi sarlavhani qaytaramiz: aks holda
        // orqaga qaytilganda eski sahifaning nomi qolib ketardi.
        return () => { document.title = previous }
    }, [title])   // `title` tarjima bilan birga o'zgaradi — til almashsa ham yangilanadi
}
