import React from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

/**
 * Bo'sh ro'yxat holati.
 *
 * Ilgari komponent `actionLabel` va `actionPath` xossalarini qabul qilardi,
 * lekin ularni **umuman chizmasdi** — barcha ro'yxat sahifalari tugma
 * matnini uzatardi va u jimgina yo'qolardi. Foydalanuvchi bo'sh ekranni
 * ko'rib, keyingi qadamni o'zi topishi kerak edi.
 *
 * @param {React.ReactNode} icon
 * @param {string} message      asosiy xabar
 * @param {string} [hint]       qo'shimcha tushuntirish (kichik, kulrang)
 * @param {string} [actionLabel] tugma matni
 * @param {string} [actionPath]  tugma bosilganda o'tiladigan manzil
 * @param {Function} [onAction]  manzil o'rniga chaqiriladigan funksiya
 *                               (masalan "Filtrlarni tozalash")
 */
export default function EmptyState({
    icon,
    message,
    hint,
    actionLabel,
    actionPath,
    onAction,
}) {
    const navigate = useNavigate();

    const handleClick = () => {
        if (onAction) return onAction();
        if (actionPath) navigate(actionPath);
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            color: '#94a3b8',
        }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>{icon}</div>

            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: hint ? 6 : 16, color: '#64748b' }}>
                {message}
            </p>

            {hint ? (
                <p style={{ fontSize: 13, marginBottom: 16, color: '#94a3b8', maxWidth: 420, textAlign: 'center' }}>
                    {hint}
                </p>
            ) : null}

            {actionLabel && (actionPath || onAction) ? (
                <Button type="primary" ghost onClick={handleClick}>
                    {actionLabel}
                </Button>
            ) : null}
        </div>
    );
}
