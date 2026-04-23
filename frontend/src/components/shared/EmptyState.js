import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function EmptyState({ icon, message, actionLabel, actionPath }) {
    const navigate = useNavigate();
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
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, color: '#64748b' }}>{message}</p>
           
        </div>
    );
}
