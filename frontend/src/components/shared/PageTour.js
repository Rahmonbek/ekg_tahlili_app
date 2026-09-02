import React, { useEffect, useState } from 'react'
import { Button, Tooltip, Tour } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

/** `localStorage` kalitining prefiksi — bir marta ko'rilgan turlar shu yerda. */
const SEEN_PREFIX = 'nmed_tour_seen_'

/**
 * Sahifa bo'yicha interaktiv qo'llanma (Ant Design `Tour`).
 *
 * Nima uchun kerak: platformada hech qanday o'rgatuvchi mexanizm yo'q edi.
 * Shifoxonalarda xodimlar tez almashadi va har birini alohida o'qitish qimmat;
 * "Faqat saqlash" va "AI bilan tahlil" farqi, AI xulosasi ranglari, passport
 * bo'yicha qidirish mantiqi — bularning hech biri interfeysda tushuntirilmagan.
 *
 * Qadamlar CSS selektorlari orqali beriladi (`data-tour="..."` atributlari).
 * Ref'larni har bir sahifada qo'lda uzatish shart emas, va **elementi mavjud
 * bo'lmagan qadam avtomatik o'tkazib yuboriladi** — masalan shifokorga
 * ko'rinmaydigan tugma haqidagi qadam turni buzmaydi.
 *
 * @param {string} pageKey   `localStorage` uchun noyob kalit (masalan "ecg_list")
 * @param {Array}  steps     [{ selector, titleKey, descKey, titleFallback, descFallback }]
 * @param {boolean} autoStart birinchi kirishda avtomatik ishga tushsinmi
 * @param {boolean} compact   faqat ikonka ko'rsatilsinmi (tor joylar uchun)
 */
export default function PageTour({
    pageKey,
    steps = [],
    autoStart = true,
    compact = false,
    keepMissing = false,
}) {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const [ready, setReady] = useState(false)
    const [activeSteps, setActiveSteps] = useState([])

    const storageKey = SEEN_PREFIX + pageKey

    // Sahifa render bo'lib bo'lgach targetlar DOM da paydo bo'ladi.
    // Jadval ma'lumot bilan to'lguncha biroz kutamiz, aks holda tur
    // hali mavjud bo'lmagan elementlarga ishora qiladi.
    useEffect(() => {
        // Jadval ma'lumot bilan to'lishini kutamiz — aks holda avtomatik
        // ishga tushgan tur hali mavjud bo'lmagan qatorlarni o'tkazib yuboradi.
        const timer = setTimeout(() => setReady(true), 1200)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        if (!ready || !autoStart) return
        try {
            if (!localStorage.getItem(storageKey)) setOpen(true)
        } catch {
            // localStorage o'chirilgan bo'lishi mumkin (private rejim) — jim o'tamiz
        }
    }, [ready, autoStart, storageKey])

    // Qadamlar tur OCHILGAN paytda hisoblanadi, render vaqtida emas: shunda
    // jadval qatorlari yuklanib bo'lgan bo'ladi va rolga qarab ko'rinmaydigan
    // elementlar (masalan hamshirada o'chirish tugmasi) aniq aniqlanadi.
    useEffect(() => {
        if (!open) return
        const timer = setTimeout(() => {
            const usable = keepMissing
                ? steps
                : steps.filter((s) => !s.selector || document.querySelector(s.selector))

            setActiveSteps(
                usable.map((s) => {
                    const exists = !s.selector || !!document.querySelector(s.selector)
                    return {
                        title: t(s.titleKey, { defaultValue: s.titleFallback ?? '' }),
                        description: t(s.descKey, { defaultValue: s.descFallback ?? '' }),
                        // Funksiya antd tomonidan har bir qadamda qayta chaqiriladi.
                        // `keepMissing` rejimida hali paydo bo'lmagan element uchun
                        // `target` berilmaydi — qadam ekran o'rtasida ko'rsatiladi.
                        target: s.selector && exists
                            ? () => document.querySelector(s.selector)
                            : undefined,
                        placement: s.placement,
                    }
                })
            )
        }, 0)
        return () => clearTimeout(timer)
    }, [open, steps, t, keepMissing])

    const markSeen = () => {
        try { localStorage.setItem(storageKey, '1') } catch { /* e'tiborsiz */ }
    }

    const handleClose = () => {
        setOpen(false)
        markSeen()
    }

    const label = t('page_guide', { defaultValue: 'Sahifa bo\'yicha qo\'llanma' })

    return (
        <>
            <Tooltip title={label}>
                <Button
                    type="text"
                    icon={<QuestionCircleOutlined />}
                    onClick={() => setOpen(true)}
                    className="page_tour_btn"
                    aria-label={label}
                >
                    {compact ? null : <span className="page_tour_btn_text">{label}</span>}
                </Button>
            </Tooltip>

            {activeSteps.length > 0 ? (
                <Tour
                    open={open}
                    onClose={handleClose}
                    onFinish={handleClose}
                    steps={activeSteps}
                    indicatorsRender={(current, total) => (
                        <span style={{ color: '#64748b', fontSize: 13 }}>{current + 1} / {total}</span>
                    )}
                />
            ) : null}
        </>
    )
}

/**
 * Barcha "ko'rilgan" bayroqlarni tozalaydi — profil menyusidagi
 * "Qo'llanmalarni qayta ko'rsatish" tugmasi uchun.
 */
export function resetAllTours() {
    try {
        Object.keys(localStorage)
            .filter((k) => k.startsWith(SEEN_PREFIX))
            .forEach((k) => localStorage.removeItem(k))
        return true
    } catch {
        return false
    }
}
