// src/components/StatusBadge.tsx
// --- NEW FILE ---
import React from 'react';
import '../components/TableStyles.css'; // Assuming badge styles are here

interface StatusBadgeProps {
    status: string; // The status string (e.g., 'pending', 'confirmed', 'cancelled')
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
    const statusClass = status ? status.toLowerCase().replace(' ', '-') : 'unknown';
    const formattedStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';

    return (
        <span className={`status-badge status-${statusClass}`}>
            {formattedStatus}
        </span>
    );
};
