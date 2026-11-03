import React, { useState } from 'react'
import { Badge, Button, Row } from 'antd'
import { FilterOutlined, UpOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

/**
 * Yig'iladigan filtr paneli.
 *
 * Muammo: ro'yxat sahifalarida beshtagacha filtr bor va ular bitta qatorga
 * sig'masdi — qator bo'linib ketardi, jadval esa pastga surilardi. Yangi
 * filtr qo'shilganda holat yomonlashardi.
 *
 * Yechim: eng ko'p ishlatiladigan **qidiruv** va **"Qidirish"** tugmasi doim
 * ko'rinadi; qolgan filtrlar "Filtrlar" tugmasi ostida yig'iladi. Tugmada
 * **faol filtrlar soni** belgi bilan ko'rsatiladi, shunda yashiringan
 * filtr sezilmay qolmaydi.
 *
 * Yuqori qatorning maketi
 * -----------------------
 * Ilgari u 24 ustunli panjaraga qurilgan edi va har bir element
 * `xl={4}` olardi — ya'ni kenglikning oltidan biri. 1520 px ekranda
 * qidiruv, "Qidirish", eksport va "Filtrlar" chap uchdan birga
 * tiqilib, o'ng tomonda yarim ekran bo'sh qolardi. Uchala boshqaruv
 * bir xil ko'rinardi va guruhlanmagandi, shuning uchun qaysi biri
 * ro'yxatni toraytirishi, qaysi biri amal bajarishi bilinmasdi.
 *
 * Endi panjara emas, **flexbox**:
 *
 *   [ qidiruv (o'sadi) ] [Qidirish] [Filtrlar] .......... [Eksport]
 *   └──────── ro'yxatni toraytirish ────────┘             └ amal ┘
 *
 * Qidiruv maydoni bo'sh joyni egallaydi (600 px gacha), eksport esa
 * o'ng chekkaga suriladi — u ro'yxatni o'zgartirmaydi, balki uni
 * chiqaradi.
 *
 * @param {React.ReactNode} primary    qidiruv maydoni va "Qidirish" tugmasi
 * @param {React.ReactNode} secondary  o'ng chekkaga suriladigan amallar (eksport)
 * @param {React.ReactNode} children   yig'iladigan filtrlar
 * @param {number} activeCount         faol filtrlar soni (belgi uchun)
 * @param {function} onClear           "Tozalash" bosilganda
 */
export default function FilterPanel({ primary, secondary, children, activeCount = 0, onClear }) {
    const { t } = useTranslation()
    // Faol filtr bo'lsa panel ochiq holda boshlanadi — foydalanuvchi
    // qaysi filtr yoqilganini darhol ko'rsin
    const [open, setOpen] = useState(activeCount > 0)

    return (
        <div className="filter_form_box" style={{ padding: '0 0 16px 0' }}>
            <div className="filter_toolbar">
                <div className="filter_toolbar_search">
                    {primary}
                </div>

                <Badge count={activeCount} size="small" offset={[-4, 4]}>
                    <Button
                        icon={open ? <UpOutlined /> : <FilterOutlined />}
                        onClick={() => setOpen((v) => !v)}
                        className="filter_toolbar_btn"
                        data-tour="analysis-filters"
                    >
                        {t('filters', { defaultValue: 'Filtrlar' })}
                    </Button>
                </Badge>

                {/* "Filtrlar" yonida: ilgari filtrlar qatorining oxirida edi va
                    to'rtta filtrdan keyin alohida qatorga tushib qolardi */}
                {activeCount > 0 && onClear ? (
                    <Button type="text" onClick={onClear} className="filter_clear_btn">
                        {t('clear_filters', { defaultValue: 'Filtrlarni tozalash' })}
                    </Button>
                ) : null}

                {secondary ? (
                    <div className="filter_toolbar_actions">
                        {secondary}
                    </div>
                ) : null}
            </div>

            {open ? (
                <Row gutter={[12, 12]} align="bottom" style={{ marginTop: 12 }}>
                    {children}
                </Row>
            ) : null}
        </div>
    )
}
