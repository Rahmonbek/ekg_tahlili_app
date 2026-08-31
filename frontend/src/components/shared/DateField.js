import React from 'react'
import { DatePicker } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

/** Formada saqlanadigan format — backend shu ko'rinishni kutadi. */
export const DATE_VALUE_FORMAT = 'YYYY-MM-DD'

/** Foydalanuvchiga ko'rinadigan format — O'zbekistonda odatiy ko'rinish. */
export const DATE_DISPLAY_FORMAT = 'DD.MM.YYYY'

/**
 * Ant Design `DatePicker` — brauzerning tug'ma `<input type="date">` o'rniga.
 *
 * Nima uchun almashtirildi: tug'ma element ilova tiliga emas, **brauzer
 * tiliga** bo'ysunadi. Interfeys o'zbek tilida bo'lgani holda maydonda
 * ruscha `дд.мм.гггг` ko'rinardi. Bundan tashqari har bir brauzerda
 * boshqacha ko'rinadi va sana formati OS sozlamasiga bog'liq edi.
 *
 * `Form.Item` ichida ishlatilganda forma qiymati **satr** bo'lib qoladi
 * (`YYYY-MM-DD`) — shuning uchun mavjud yuborish (submit) mantig'ini
 * o'zgartirish shart emas. Buning uchun `dateFieldProps()` dan foydalaning.
 */
export default function DateField({ value, onChange, disabledAfterToday = true, ...rest }) {
    const { t } = useTranslation()

    return (
        <DatePicker
            className="login_input"
            style={{ width: '100%' }}
            format={DATE_DISPLAY_FORMAT}
            placeholder={t('select_date', { defaultValue: 'Sanani tanlang' })}
            value={value ? dayjs(value) : null}
            onChange={(d) => onChange?.(d ? d.format(DATE_VALUE_FORMAT) : null)}
            // Tug'ilgan sana kelajakda bo'lishi mumkin emas
            disabledDate={disabledAfterToday ? (d) => d && d.isAfter(dayjs(), 'day') : undefined}
            {...rest}
        />
    )
}

/**
 * `Form.Item` uchun props: qiymat formada satr ko'rinishida saqlanadi.
 *
 *   <Form.Item name="birthdate" {...dateFieldProps()}>
 *       <DateField />
 *   </Form.Item>
 */
export const dateFieldProps = () => ({
    // `getValueProps` shart emas — DateField satrni o'zi dayjs ga o'giradi
    normalize: (v) => (typeof v === 'string' || v == null ? v : v.format(DATE_VALUE_FORMAT)),
})
