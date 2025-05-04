// src/components/dashboard/StatWidget.tsx
// --- NEW FILE ---

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'; // Type for icon prop
import { faArrowRight } from '@fortawesome/free-solid-svg-icons'; // Example icon for links

import './StatWidget.css'; // Create this CSS file

interface StatWidgetProps {
    label: string;
    value: string | number | null | undefined; // Allow various types for value
    icon?: IconDefinition; // Optional icon
    unit?: string; // Optional unit (e.g., 'MAD', '$')
    isLoading?: boolean; // Optional loading state
    isClickable?: boolean; // Determines if it acts like a link
    linkTo?: string; // The target path for navigation
    linkState?: any; // Optional state to pass during navigation (for filtering)
}

const StatWidget: React.FC<StatWidgetProps> = ({
    label,
    value,
    icon,
    unit,
    isLoading = false,
    isClickable = false,
    linkTo,
    linkState,
}) => {
    const navigate = useNavigate();

    const handleClick = () => {
        if (isClickable && linkTo) {
            console.log(`Navigating to ${linkTo} with state:`, linkState);
            navigate(linkTo, { state: linkState });
        }
    };

    const displayValue = isLoading
        ? <span className="loading-spinner"></span> // Simple spinner or skeleton
        : (value !== null && value !== undefined ? value : '-');

    const widgetClasses = `stat-widget ${isClickable ? 'clickable' : ''} ${isLoading ? 'loading' : ''}`;

    return (
        <div className={widgetClasses} onClick={isClickable ? handleClick : undefined}>
            <div className="widget-content">
                {icon && <FontAwesomeIcon icon={icon} className="widget-icon" />}
                <div className="widget-text">
                    <span className="widget-label">{label}</span>
                    <span className="widget-value">
                        {displayValue}
                        {unit && !isLoading && value !== null && value !== undefined && <span className="widget-unit">{` ${unit}`}</span>}
                    </span>
                </div>
            </div>
             {isClickable && !isLoading && <FontAwesomeIcon icon={faArrowRight} className="widget-link-icon" />}
        </div>
    );
};

export default StatWidget;
