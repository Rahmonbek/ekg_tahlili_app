/**
 * Bemor ma'lumotlari faqat LOTIN harflarida kiritiladi (loyiha egasining
 * talabi): kirill/rus harflari rad etiladi — aks holda "ISMOILOV" va
 * "ИСМОИЛОВ" ikki xil bemor bo'lib qolardi va qidiruvda topilmasdi.
 *
 * Backend dagi mos qoida: `Helpers/PatientInput.cs` — ikkalasi bir xil
 * bo'lishi kerak.
 */

/** Tutuq belgisining klaviaturaga qarab har xil ko'rinishlari. */
const APOSTROPHES = /[‘’`ʻʼ]/g

/** Ism maydonlari: lotin harflari, bo'shliq, tutuq, defis, nuqta. */
const NAME_RE = /^[A-Za-z'\-. ]*$/

/** Boshqa matnlar (manzil, passport): faqat ASCII + № belgisi. */
const TEXT_RE = /^[\x20-\x7E№]*$/

/** Tutuqlarni bitta ko'rinishga keltiradi va katta harfga o'tkazadi. */
export function normalizeLatinName(value) {
    if (value == null) return value
    return String(value).replace(APOSTROPHES, "'").replace(/\s{2,}/g, ' ').toUpperCase()
}

/** Manzil kabi matn: tutuqlar bir xil, katta harf. */
export function normalizeLatinText(value) {
    if (value == null) return value
    return String(value).replace(APOSTROPHES, "'").toUpperCase()
}

export const isLatinName = (value) => NAME_RE.test(normalizeLatinName(value || ''))
export const isLatinText = (value) => TEXT_RE.test(normalizeLatinText(value || ''))

/** Ant Design `rules` uchun: ism maydoni lotincha bo'lsin. */
export const latinNameRule = (t) => ({
    validator: (_, value) => (isLatinName(value)
        ? Promise.resolve()
        : Promise.reject(new Error(t('latin_only', { defaultValue: 'Faqat lotin harflarida kiriting' })))),
})

/** Ant Design `rules` uchun: manzil/passport lotincha bo'lsin. */
export const latinTextRule = (t) => ({
    validator: (_, value) => (isLatinText(value)
        ? Promise.resolve()
        : Promise.reject(new Error(t('latin_only', { defaultValue: 'Faqat lotin harflarida kiriting' })))),
})
