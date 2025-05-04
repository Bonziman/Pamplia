// src/components/settings/BusinessHoursEditor.tsx
// --- NEW FILE ---

import React from 'react';
import { BusinessHoursConfig, DayHours, TimeInterval } from './tenants'; // Adjust path
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon } from '@fortawesome/free-solid-svg-icons';
import './BusinessHoursEditor.css'; // Create this CSS file
import '../SwitchToggle.css'; // Assuming you have a common toggle style

// Define the order and display names for days
const DAYS_OF_WEEK = [
    { key: 'monday', display: 'Monday' },
    { key: 'tuesday', display: 'Tuesday' },
    { key: 'wednesday', display: 'Wednesday' },
    { key: 'thursday', display: 'Thursday' },
    { key: 'friday', display: 'Friday' },
    { key: 'saturday', display: 'Saturday' },
    { key: 'sunday', display: 'Sunday' },
] as const; // Use "as const" for stricter typing on keys

type DayKey = typeof DAYS_OF_WEEK[number]['key'];


// --- Default Hours Structure ---
// Used if the config from the backend is null or missing days
const createDefaultDayHours = (isOpen: boolean = true, start: string = "09:00", end: string = "17:00"): DayHours => ({
    isOpen,
    intervals: isOpen ? [{ start, end }] : [],
});

const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
    monday: createDefaultDayHours(),
    tuesday: createDefaultDayHours(),
    wednesday: createDefaultDayHours(),
    thursday: createDefaultDayHours(),
    friday: createDefaultDayHours(),
    saturday: createDefaultDayHours(false), // Default Saturday closed
    sunday: createDefaultDayHours(false),   // Default Sunday closed
};


interface BusinessHoursEditorProps {
    value: BusinessHoursConfig | null | undefined; // Current value from parent state
    onChange: (newConfig: BusinessHoursConfig) => void; // Function to update parent state
    isEditing: boolean; // Controls if inputs are enabled
}

const BusinessHoursEditor: React.FC<BusinessHoursEditorProps> = ({
    value,
    onChange,
    isEditing,
}) => {

    // Merge provided value with defaults to ensure all days are present
    const currentConfig = React.useMemo(() => {
        const config = { ...DEFAULT_BUSINESS_HOURS };
        if (value) {
            for (const day of DAYS_OF_WEEK) {
                if (value[day.key]) {
                    // Ensure intervals array exists and has at least one element if open
                    const dayValue = value[day.key];
                    if (dayValue.isOpen && (!dayValue.intervals || dayValue.intervals.length === 0)) {
                         // If marked open but no interval, provide a default one
                         config[day.key] = { ...dayValue, intervals: [{ start: "09:00", end: "17:00" }]};
                    } else if (!dayValue.isOpen) {
                         // If marked closed, ensure intervals are empty
                         config[day.key] = { ...dayValue, intervals: [] };
                    }
                     else {
                        config[day.key] = dayValue;
                    }
                }
            }
        }
        return config;
    }, [value]);


    const handleToggleDay = (dayKey: DayKey) => {
        const currentDayConfig = currentConfig[dayKey];
        const wasOpen = currentDayConfig.isOpen;
        const newDayConfig: DayHours = {
            ...currentDayConfig,
            isOpen: !wasOpen,
            // If turning on, add default interval if none exists. If turning off, clear intervals.
            intervals: !wasOpen
                ? (currentDayConfig.intervals?.length > 0 ? currentDayConfig.intervals : [{ start: "09:00", end: "17:00" }])
                : [],
        };

        onChange({
            ...currentConfig,
            [dayKey]: newDayConfig,
        });
    };

    const handleTimeChange = (dayKey: DayKey, intervalIndex: number, type: 'start' | 'end', time: string) => {
        const currentDayConfig = currentConfig[dayKey];
        const newIntervals = [...currentDayConfig.intervals]; // Clone intervals array

        if (newIntervals[intervalIndex]) {
            newIntervals[intervalIndex] = {
                ...newIntervals[intervalIndex],
                [type]: time,
            };

            onChange({
                ...currentConfig,
                [dayKey]: {
                    ...currentDayConfig,
                    intervals: newIntervals,
                },
            });
        }
    };

    return (
        <div className="business-hours-editor">
            {DAYS_OF_WEEK.map(({ key, display }) => {
                const dayConfig = currentConfig[key];
                // For this UI, we only edit the first interval if it exists
                const firstInterval = dayConfig.intervals?.[0] ?? { start: '', end: '' };

                return (
                    <div key={key} className={`day-row ${!dayConfig.isOpen ? 'day-closed' : ''} ${!isEditing ? 'read-only' : ''}`}>
                        <div className="day-label-toggle">
                            <label className="switch-toggle">
                                <input
                                    type="checkbox"
                                    checked={dayConfig.isOpen}
                                    onChange={() => handleToggleDay(key)}
                                    disabled={!isEditing}
                                />
                                <span className="slider round"></span>
                            </label>
                            <span className="day-name">{display}</span>
                        </div>

                        <div className="day-time-inputs">
                            {dayConfig.isOpen ? (
                                <>
                                    <span className="time-label">From</span>
                                    <input
                                        type="time"
                                        className="time-input"
                                        value={firstInterval.start}
                                        onChange={(e) => handleTimeChange(key, 0, 'start', e.target.value)}
                                        disabled={!isEditing}
                                        required={dayConfig.isOpen} // Make required only if day is open
                                    />
                                    <span className="time-label">To</span>
                                    <input
                                        type="time"
                                        className="time-input"
                                        value={firstInterval.end}
                                        onChange={(e) => handleTimeChange(key, 0, 'end', e.target.value)}
                                        disabled={!isEditing}
                                        required={dayConfig.isOpen} // Make required only if day is open
                                    />
                                </>
                            ) : (
                                <div className="closed-indicator">
                                    <FontAwesomeIcon icon={faMoon} /> Closed
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
             {!isEditing && <p className="read-only-overlay-hint">Click "Edit Settings" to make changes.</p>}
        </div>
    );
};

export default BusinessHoursEditor;
