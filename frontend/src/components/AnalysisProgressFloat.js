import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notification } from 'antd';
import { useStore } from '../store/Store';

const statusIcon = {
    loading: (
        <span style={{ display: 'inline-block', width: 16, height: 16, marginRight: 8, verticalAlign: 'middle' }}>
            <svg viewBox="0 0 24 24" width="16" height="16">
                <circle cx="12" cy="12" r="10" stroke="#4FD1C5" strokeWidth="3" fill="none"
                    strokeDasharray="31.4" strokeDashoffset="10">
                    <animateTransform attributeName="transform" type="rotate"
                        from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
                </circle>
            </svg>
        </span>
    ),
    done:    <span style={{ color: '#52c41a', marginRight: 8, fontSize: 16 }}>✓</span>,
    error:   <span style={{ color: '#ff4d4f', marginRight: 8, fontSize: 16 }}>✗</span>,
};

const itemStyle = (status) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
    opacity: status === 'loading' ? 1 : 0.85,
});

export default function AnalysisProgressFloat() {
    const { pendingAnalyses, removePendingAnalysis } = useStore();
    const navigate = useNavigate();
    const notifiedKeys = useRef(new Set());

    useEffect(() => {
        pendingAnalyses.forEach((item) => {
            if (item.status === 'loading') return;
            if (notifiedKeys.current.has(item.key)) return;
            notifiedKeys.current.add(item.key);

            if (item.status === 'done') {
                notification.success({
                    message: `${item.label} tayyor!`,
                    description: (
                        <span
                            style={{ color: '#0f766e', cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => { navigate(item.listPath); notification.destroy(item.key); }}
                        >
                            Natijalarni ko'rish →
                        </span>
                    ),
                    key: item.key,
                    duration: 10,
                });
            } else if (item.status === 'error') {
                notification.error({
                    message: `${item.label} xatolik bilan tugadi`,
                    description: item.errorMsg,
                    key: item.key,
                    duration: 8,
                });
            }
        });
    }, [pendingAnalyses, navigate]);

    const visible = pendingAnalyses.length > 0;
    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 280,
            background: '#fff',
            borderRadius: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 100000,
            overflow: 'hidden',
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
                padding: '10px 14px',
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
            }}>
                Tahlillar
            </div>
            <div style={{ padding: '4px 14px 8px' }}>
                {pendingAnalyses.map((item) => (
                    <div key={item.key} style={itemStyle(item.status)}>
                        <span style={{ fontSize: 13, color: '#333', display: 'flex', alignItems: 'center' }}>
                            {statusIcon[item.status]}
                            {item.label}
                        </span>
                        {item.status === 'loading' ? (
                            <span style={{ fontSize: 11, color: '#999' }}>davom etmoqda...</span>
                        ) : item.status === 'done' ? (
                            <span
                                style={{ fontSize: 12, color: '#0f766e', cursor: 'pointer', textDecoration: 'underline' }}
                                onClick={() => { navigate(item.listPath); removePendingAnalysis(item.key); }}
                            >
                                Ko'rish
                            </span>
                        ) : (
                            <span
                                style={{ fontSize: 12, color: '#999', cursor: 'pointer' }}
                                onClick={() => removePendingAnalysis(item.key)}
                            >
                                Yopish
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
