import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function StatCard({ icon, title, value, subValue, subLabel, allTimeValue, allTimeLabel, color = '#00D1B2', path }) {
    const navigate = useNavigate();
    return (
        <div
            className="stat_card"
            onClick={() => path && navigate(path)}
            style={{ cursor: path ? 'pointer' : 'default' }}
        >
            <div className="stat_card_icon" style={{ backgroundColor: color + '18', color }}>
                {icon}
            </div>
            <div className="stat_card_body">
                <p className="stat_card_title">{title}</p>
                <h2 className="stat_card_value">{allTimeValue ?? '—'}</h2>
                {subValue > 0 && (
                    <span className="stat_card_sub" style={{ color }}>
                        {subValue} {subLabel}
                    </span>
                )}
               
            </div>
        </div>
    );
}
