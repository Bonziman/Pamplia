import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { FetchedAppointment } from '../api/appointmentApi'; // Adjust path if needed
import { formatReadableDateTime } from '../utils/formatDate'; // Adjust path if needed
import './AppointmentCalendar.css'; // Ensure CSS is updated
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons';


interface AppointmentCalendarProps {
    appointments: FetchedAppointment[];
    onAppointmentClick?: (appointment: FetchedAppointment) => void;
    onDayClick?: (date: Date) => void; // Callback for clicking a day
}

// Helper to get month name
const getMonthName = (monthIndex: number): string => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return months[monthIndex];
};

// Helper to format time as HH:MM (24-hour)
const formatTime = (dateString: string): string => {
    try {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    } catch (e) {
        console.error("Error formatting time:", e);
        return "Invalid Time";
    }
};

// Style interface for tooltip position
interface TooltipPosition {
    top: number;
    left: number;
    visibility: 'visible' | 'hidden';
}

const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
    appointments,
    onAppointmentClick,
    onDayClick
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipContent, setTooltipContent] = useState<FetchedAppointment | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({ top: 0, left: 0, visibility: 'hidden' });
    const hoveredElementRef = useRef<HTMLDivElement | null>(null);
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const appointmentsByDay = useMemo(() => {
        const grouped: { [key: number]: FetchedAppointment[] } = {};
        appointments.forEach(appt => {
            try {
                const apptDate = new Date(appt.appointment_time);
                if (apptDate.getFullYear() === currentYear && apptDate.getMonth() === currentMonth) {
                    const dayOfMonth = apptDate.getDate();
                    if (!grouped[dayOfMonth]) {
                        grouped[dayOfMonth] = [];
                    }
                    grouped[dayOfMonth].push(appt);
                    grouped[dayOfMonth].sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime());
                }
            } catch (e) {
                console.error("Error processing appointment date:", appt.appointment_time, e);
            }
        });
        return grouped;
    }, [appointments, currentYear, currentMonth]);

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    };

    const calculateAndSetTooltipPosition = useCallback(() => {
        if (!tooltipVisible || !tooltipRef.current || !hoveredElementRef.current) {
            if (tooltipPosition.visibility === 'visible') {
                setTooltipPosition(prev => ({ ...prev, visibility: 'hidden' }));
            }
            return;
        }
        const triggerElement = hoveredElementRef.current;
        const tooltipElement = tooltipRef.current;
        const triggerRect = triggerElement.getBoundingClientRect();
        const tooltipRect = tooltipElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const GAP = 10;
        const EDGE_MARGIN = 8;
        let finalTop: number;
        let finalLeft: number;
        const spaceBelow = viewportHeight - triggerRect.bottom;
        const spaceAbove = triggerRect.top;
        const fitsBelow = tooltipRect.height + GAP < spaceBelow;
        const fitsAbove = tooltipRect.height + GAP < spaceAbove;

        if (fitsBelow) {
            finalTop = triggerRect.bottom + GAP;
        } else if (fitsAbove) {
            finalTop = triggerRect.top - tooltipRect.height - GAP;
        } else {
            finalTop = triggerRect.bottom + GAP;
            if (finalTop + tooltipRect.height > viewportHeight - EDGE_MARGIN) {
                 const potentialTop = viewportHeight - tooltipRect.height - EDGE_MARGIN;
                 finalTop = (potentialTop >= EDGE_MARGIN) ? potentialTop : EDGE_MARGIN;
             }
        }
        let desiredLeft = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        finalLeft = desiredLeft;
        if (finalLeft < EDGE_MARGIN) {
            finalLeft = EDGE_MARGIN;
        } else if (finalLeft + tooltipRect.width > viewportWidth - EDGE_MARGIN) {
            finalLeft = viewportWidth - tooltipRect.width - EDGE_MARGIN;
        }
        setTooltipPosition({ top: finalTop, left: finalLeft, visibility: 'visible' });
    }, [tooltipVisible, tooltipPosition.visibility]);

    useEffect(() => {
        if (tooltipVisible) {
            const timer = setTimeout(calculateAndSetTooltipPosition, 0);
            return () => clearTimeout(timer);
        }
    }, [tooltipVisible, tooltipContent, calculateAndSetTooltipPosition]);

    useEffect(() => {
        const handler = () => { if (tooltipVisible) calculateAndSetTooltipPosition(); };
        window.addEventListener('scroll', handler, true);
        window.addEventListener('resize', handler);
        return () => {
            window.removeEventListener('scroll', handler, true);
            window.removeEventListener('resize', handler);
        };
    }, [tooltipVisible, calculateAndSetTooltipPosition]);

    const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>, appointment: FetchedAppointment) => {
        hoveredElementRef.current = event.currentTarget;
        setTooltipContent(appointment);
        setTooltipVisible(true);
    };

    const handleMouseLeave = () => {
        hoveredElementRef.current = null;
        setTooltipVisible(false);
        setTooltipContent(null);
        setTooltipPosition(prev => ({ ...prev, visibility: 'hidden' }));
    };

    const handleDayDivClick = (day: number) => {
        if (onDayClick) {
            const clickedDate = new Date(currentYear, currentMonth, day);
            onDayClick(clickedDate);
        }
    };

    const renderCalendarDays = () => {
        const days = [];
        const today = new Date();
        const todayString = today.toDateString();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayOfMonthIndex = new Date(currentYear, currentMonth, 1).getDay();

        for (let i = 0; i < firstDayOfMonthIndex; i++) {
            days.push(<div key={`empty-start-${i}`} className="calendar-day empty"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayAppointments = appointmentsByDay[day] || [];
            const isMultiple = dayAppointments.length > 1;
            const isToday = new Date(currentYear, currentMonth, day).toDateString() === todayString;

            days.push(
                <div
                    key={day}
                    className={`calendar-day ${isToday ? 'today' : ''} ${dayAppointments.length > 0 ? 'has-appointments' : ''}`}
                    onClick={() => handleDayDivClick(day)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Add appointment for ${getMonthName(currentMonth)} ${day}, ${currentYear}`}
                    onKeyDown={(e) => e.key === 'Enter' && handleDayDivClick(day)} // Keyboard accessibility
                >
                    <div className="day-content-wrapper">
                        <div className="day-header">
                             <div className="day-number">{day}</div>
                        </div>
                        <div className="appointments-container">
                            {dayAppointments.map(appt => (
                                <div
                                    key={appt.id}
                                    className={`appointment-item ${isMultiple ? 'minimized' : ''} status-${appt.status}`}
                                    onClick={(e) => { e.stopPropagation(); onAppointmentClick && onAppointmentClick(appt); }}
                                    onMouseEnter={(e) => handleMouseEnter(e, appt)}
                                    onMouseLeave={handleMouseLeave}
                                    title="" // Let custom tooltip handle it
                                >
                                    <span className="appointment-time">{formatTime(appt.appointment_time)}</span>
                                    <span className="appointment-client">{appt.client_name}</span>
                                    {!isMultiple && (
                                        <ul className="appointment-services">
                                            {appt.services?.slice(0, 1).map(s => <li key={s.id}>{s.name}</li>)}
                                            {(appt.services?.length ?? 0) > 1 && <li className="more-services">...</li>}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="add-appointment-overlay">
                            <span className="add-appointment-button">+</span>
                        </div>
                    </div>
                </div>
            );
        }

        const totalCells = firstDayOfMonthIndex + daysInMonth;
        const remainingCells = 7 - (totalCells % 7);
        if (remainingCells < 7) {
             for (let i = 0; i < remainingCells; i++) {
                days.push(<div key={`empty-end-${i}`} className="calendar-day empty"></div>);
            }
        }
        return days;
    };

    return (
        <div className="appointment-calendar-container">
            <div className="calendar-header">
                <button onClick={goToPreviousMonth} className="nav-button" aria-label="Previous month"> <FontAwesomeIcon icon={faAngleLeft} /> </button>
                <h2>{getMonthName(currentMonth)} {currentYear}</h2>
                <button onClick={goToNextMonth} className="nav-button" aria-label="Next month"> <FontAwesomeIcon icon={faAngleRight} /> </button>
            </div>
            <div className="calendar-grid">
                <div className="weekday">Sun</div>
                <div className="weekday">Mon</div>
                <div className="weekday">Tue</div>
                <div className="weekday">Wed</div>
                <div className="weekday">Thu</div>
                <div className="weekday">Fri</div>
                <div className="weekday">Sat</div>
                {renderCalendarDays()}
            </div>

            <div
                ref={tooltipRef}
                className="shared-appointment-tooltip"
                style={{
                    position: 'fixed',
                    top: `${tooltipPosition.top}px`,
                    left: `${tooltipPosition.left}px`,
                    visibility: tooltipPosition.visibility,
                    opacity: tooltipVisible ? 1 : 0,
                }}
                role="tooltip"
                aria-hidden={!tooltipVisible}
            >
                {tooltipContent && (
                    <>
                        <strong>Client:</strong> {tooltipContent.client_name}<br />
                        <strong>Email:</strong> {tooltipContent.client_email}<br />
                        <strong>Time:</strong> {formatReadableDateTime(tooltipContent.appointment_time)}<br />
                        <strong>Status:</strong> <span className={`tooltip-status status-${tooltipContent.status}`}>{tooltipContent.status}</span><br />
                        {tooltipContent.services?.length > 0 && (
                            <>
                                <strong>Services:</strong>
                                <ul>
                                    {tooltipContent.services.map(s => (
                                        <li key={s.id}>
                                            {s.name} ({s.duration_minutes} min) - ${s.price}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AppointmentCalendar;
