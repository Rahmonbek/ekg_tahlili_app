import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Tour } from 'antd'
import { useTranslation } from 'react-i18next'

/**
 * Butun platforma uchun yagona qo'llanma (Tour) mexanizmi.
 *
 * Ilgari har bir sahifa o'z tugmasini chizardi va tur birinchi kirishda
 * avtomatik ochilardi. Endi:
 *  * tugma **bitta** — header'da, qaysi sahifada bo'lsangiz o'shanisini
 *    ishga tushiradi;
 *  * tur **avtomatik ochilmaydi**, faqat tugma orqali;
 *  * sahifalar faqat o'z qadamlarini ro'yxatdan o'tkazadi (`usePageTour`),
 *    interfeys elementini emas.
 */
const TourContext = createContext(null)

export function TourProvider({ children }) {
    const { t } = useTranslation()

    // Joriy sahifa ro'yxatdan o'tkazgan qadamlar
    const [registered, setRegistered] = useState({ steps: [], keepMissing: false, id: 0 })
    const [open, setOpen] = useState(false)
    const [activeSteps, setActiveSteps] = useState([])

    // Har bir ro'yxatdan o'tish o'z raqamini oladi. Sahifadan sahifaga
    // o'tganda React eski komponentning tozalash funksiyasini YANGISI
    // ro'yxatdan o'tgandan KEYIN chaqirishi mumkin — raqamsiz bu yangi
    // sahifaning qadamlarini o'chirib yuborardi va tugma o'chiq qolardi.
    const nextId = useRef(0)

    const register = useCallback((steps, options = {}) => {
        nextId.current += 1
        const id = nextId.current
        setRegistered({ steps: steps || [], keepMissing: !!options.keepMissing, id })
        return id
    }, [])

    const unregister = useCallback((id) => {
        setRegistered((prev) => {
            // Faqat o'z yozuvimizni tozalaymiz
            if (id != null && prev.id !== id) return prev
            return { steps: [], keepMissing: false, id: 0 }
        })
        setOpen(false)
    }, [])

    // Qadamlar tur OCHILGAN paytda hisoblanadi: shunda jadval qatorlari
    // yuklangan bo'ladi va rolga qarab ko'rinmaydigan elementlar
    // (masalan hamshirada o'chirish tugmasi) aniq aniqlanadi.
    useEffect(() => {
        if (!open) return undefined
        const timer = setTimeout(() => {
            const { steps, keepMissing } = registered
            const usable = keepMissing
                ? steps
                : steps.filter((s) => !s.selector || document.querySelector(s.selector))

            setActiveSteps(usable.map((s) => {
                const exists = !s.selector || !!document.querySelector(s.selector)
                return {
                    title: t(s.titleKey, { defaultValue: s.titleFallback ?? '' }),
                    description: t(s.descKey, { defaultValue: s.descFallback ?? '' }),
                    // `keepMissing` rejimida hali paydo bo'lmagan element uchun
                    // `target` berilmaydi — qadam ekran o'rtasida ko'rsatiladi
                    target: s.selector && exists ? () => document.querySelector(s.selector) : undefined,
                    placement: s.placement,
                }
            }))
        }, 0)
        return () => clearTimeout(timer)
    }, [open, registered, t])

    const value = useMemo(() => ({
        register,
        unregister,
        start: () => setOpen(true),
        // Header tugmasi shu bayroqqa qarab yoqiladi/o'chiriladi
        available: registered.steps.length > 0,
    }), [register, unregister, registered.steps.length])

    return (
        <TourContext.Provider value={value}>
            {children}
            {activeSteps.length > 0 ? (
                <Tour
                    open={open}
                    onClose={() => setOpen(false)}
                    onFinish={() => setOpen(false)}
                    steps={activeSteps}
                    indicatorsRender={(current, total) => (
                        <span style={{ color: '#64748b', fontSize: 13 }}>{current + 1} / {total}</span>
                    )}
                />
            ) : null}
        </TourContext.Provider>
    )
}

/** Header tugmasi va boshqa joylar uchun. */
export function useTour() {
    return useContext(TourContext) || { register: () => {}, unregister: () => {}, start: () => {}, available: false }
}

/**
 * Sahifa o'z qadamlarini ro'yxatdan o'tkazadi.
 *
 *     usePageTour(analysisListTour)
 *     usePageTour(analyzerTour, { keepMissing: true })
 *
 * @param {Array} steps  qadamlar (`tools/tourSteps.js`)
 * @param {object} options `{ keepMissing }` — elementi hali yo'q qadamlarni
 *                 tashlab yubormaslik (masalan bemor topilmaguncha
 *                 ko'rinmaydigan bloklar)
 */
export function usePageTour(steps, options = {}) {
    const { register, unregister } = useTour()
    const keepMissing = !!options.keepMissing

    useEffect(() => {
        const id = register(steps, { keepMissing })
        return () => unregister(id)
    }, [steps, keepMissing, register, unregister])
}
