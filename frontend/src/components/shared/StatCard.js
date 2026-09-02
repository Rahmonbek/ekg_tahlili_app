import React from 'react';
import { Skeleton, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';

/**
 * Asosiy paneldagi statistika kartochkasi.
 *
 * Ilgari kartochka `allTimeValue` ni asosiy raqam sifatida ko'rsatardi,
 * bo'lim sarlavhasi esa "BUGUNGI TAHLILLAR" edi. Ya'ni bugun bironta ham
 * tahlil bo'lmasa-da ekranda umumiy son (masalan 10) turardi va shifoxona
 * rahbari uni bugungi ish hajmi deb tushunardi.
 *
 * Endi: asosiy raqam — BUGUNGI son, umumiy son esa pastda kichik matnda.
 *
 * @param {number|null} value        bugungi son (null = yuklanmoqda)
 * @param {number|null} allTimeValue umumiy son
 * @param {number}      subValue     ko'rilmagan tahlillar soni (badge)
 * @param {boolean}     disabled     shifoxona faollashtirilmagan bo'lsa bosilmaydi
 */
export default function StatCard({
    icon,
    title,
    value,
    allTimeValue,
    allTimeLabel,
    subValue,
    subLabel,
    color = '#00B39A',
    path,
    loading = false,
    disabled = false,
}) {
    const navigate = useNavigate();
    const clickable = Boolean(path) && !disabled && !loading;

    const handleClick = () => {
        if (clickable) navigate(path);
    };

    const card = (
        <div
            className={`stat_card${disabled ? ' stat_card_disabled' : ''}`}
            onClick={handleClick}
            onKeyDown={(e) => {
                if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleClick();
                }
            }}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            style={{
                cursor: clickable ? 'pointer' : 'default',
                opacity: disabled ? 0.55 : 1,
            }}
        >
            <div
                className="stat_card_icon"
                style={{
                    // `#RRGGBB18` alfa-suffiks faqat 6 xonali hex uchun to'g'ri
                    backgroundColor: /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}18` : undefined,
                    color,
                }}
            >
                {icon}
            </div>

            <div className="stat_card_body">
                <p className="stat_card_title">{title}</p>

                {loading ? (
                    // Yuklanish paytida "—" ko'rsatish "ma'lumot yo'q" degan
                    // noto'g'ri signal berardi. Skeleton aniqroq.
                    <Skeleton.Input active size="small" style={{ width: 56, height: 28 }} />
                ) : (
                    <h2 className="stat_card_value">{value ?? 0}</h2>
                )}

                {!loading && allTimeValue != null && (
                    <span className="stat_card_alltime">
                        {allTimeLabel || 'Jami'}: {allTimeValue}
                    </span>
                )}

                {!loading && subValue > 0 && (
                    <span className="stat_card_sub" style={{ color }}>
                        {subValue} {subLabel}
                    </span>
                )}
            </div>
        </div>
    );

    return disabled
        ? <Tooltip title="Shifoxonangiz faollashtirilgandan so'ng ochiladi">{card}</Tooltip>
        : card;
}
