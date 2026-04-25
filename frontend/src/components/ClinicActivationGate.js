import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Result } from 'antd'
import { MdOutlineHourglassEmpty } from 'react-icons/md'
import { FaLock } from 'react-icons/fa'

/**
 * ClinicActivationGate
 * Klinika is_active=false bo'lganda sahifani blok qiladi.
 *
 * Props:
 *  - isActive: boolean — klinika faolmi
 *  - isAdmin: boolean — foydalanuvchi admin/direktoryaimi
 *  - children: sahifa kontenti
 *
 * Agar !isActive && isAdmin → sahifa o'rniga "Aktivatsiya kutilmoqda" xabari
 * Agar isActive → sahifa ko'rsatiladi
 */
export default function ClinicActivationGate({ isActive, children }) {
    const { t } = useTranslation()

    if (isActive) return children

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '40px 20px',
        }}>
            <div style={{
                background: '#fff',
                borderRadius: 16,
                padding: '48px 40px',
                maxWidth: 480,
                width: '100%',
                boxShadow: '0 4px 24px rgba(44,62,107,0.10)',
                textAlign: 'center',
                border: '1.5px solid #e0e0e0',
            }}>
                <div style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f0faf5 0%, #e8f4fd 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    border: '2px solid #1D9E75'
                }}>
                    <MdOutlineHourglassEmpty size={36} color="#1D9E75" />
                </div>

                <h2 style={{
                    color: '#2C3E6B',
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 12,
                }}>
                    {t('clinic_not_active_title')}
                </h2>

                <p style={{
                    color: '#666',
                    fontSize: 14,
                    lineHeight: 1.7,
                    marginBottom: 0,
                }}>
                    {t('clinic_not_active_desc')}
                </p>

                <div style={{
                    marginTop: 24,
                    padding: '12px 16px',
                    background: '#f9fafb',
                    borderRadius: 8,
                    border: '1px solid #e0e0e0',
                    fontSize: 13,
                    color: '#888',
                }}>
                    💡 {t('waiting_activation_hint')}
                </div>
            </div>
        </div>
    )
}
