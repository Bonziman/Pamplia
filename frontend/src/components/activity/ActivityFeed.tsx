// src/components/activity/ActivityFeed.tsx
// --- NEW FILE ---

import React, { useState, useEffect, useCallback } from 'react';
import { fetchClientCommunications } from '../../api/communicationsApi'; 
import { CommunicationLogOut, PaginatedCommunicationsLogResponse } from '../../types/Communication'; // Adjust path
import {
    Phone, Mail, MessageSquare, Users, Monitor, HelpCircle,
    ArrowRight, ArrowLeft,
    Calendar, User, Loader2
} from 'lucide-react';
import { Tooltip } from 'react-tooltip'; // If using tooltips
import './ActivityFeed.css'; // Create this CSS file

// Map Channel to Icon
const channelIcons: Record<string, React.ElementType> = {
    EMAIL: Mail,
    SMS: MessageSquare,
    PHONE: Phone,
    SYSTEM: Monitor, // Or other system icon
    IN_PERSON: Users,
    VIRTUAL_MEETING: Monitor,
    OTHER: HelpCircle,
};

interface ActivityFeedProps {
    clientId: number;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ clientId }) => {
    const [logs, setLogs] = useState<CommunicationLogOut[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 6; // Match backend limit

    const loadLogs = useCallback(async (page: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetchClientCommunications(clientId, page, itemsPerPage);
            setLogs(response.items);
            setTotalPages(Math.ceil(response.total / itemsPerPage));
            setCurrentPage(page); // Ensure current page state matches fetched page
        } catch (err: any) {
             const detail = err.response?.data?.detail || err.message || "Failed to load communication history.";
             setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
            setLogs([]); // Clear logs on error
        } finally {
            setIsLoading(false);
        }
    }, [clientId, itemsPerPage]); // Dependency on clientId and itemsPerPage

    // Initial load and load when page changes
    useEffect(() => {
        console.log(`ActivityFeed: Loading logs for client ${clientId}, page ${currentPage}`);
        loadLogs(currentPage);
    }, [clientId, currentPage, loadLogs]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // Format timestamp for display
     const formatTimestamp = (isoString: string): string => {
         try {
             const date = new Date(isoString);
             // Example: Oct 27, 2023, 10:30 AM - adjust format as needed
             return date.toLocaleString([], {
                 month: 'short', day: 'numeric', year: 'numeric',
                 hour: 'numeric', minute: '2-digit', hour12: true
            });
         } catch (e) { return "Invalid Date"; }
     };

    return (
        <div className="activity-feed">
            <h3>Communication History</h3>

            {error && <div className="error-message alert alert-danger">{error}</div>}

            {isLoading ? (
                <div className="loading-message">Loading history... <Loader2 size={16} className="animate-spin" /></div>
            ) : logs.length === 0 ? (
                <p className="no-data-message">No communication history found for this client.</p>
            ) : (
                <div className="log-list">
                    {logs.map(log => (
                        <div key={log.id} className={`log-entry channel-${log.channel.toLowerCase()} direction-${log.direction.toLowerCase()}`}>
                            <div className="log-icon-col">
                                <span className="log-channel-icon" title={log.channel}>
                                     {(() => { const ChannelIcon = channelIcons[log.channel] || HelpCircle; return <ChannelIcon size={16} />; })()}
                                </span>
                                {log.direction !== 'SYSTEM' && (
                                     <span className="log-direction-icon" title={log.direction}>
                                        {log.direction === 'OUTBOUND' ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
                                     </span>
                                )}
                            </div>
                            <div className="log-details-col">
                                <div className="log-header">
                                     <span className="log-subject">{log.subject || log.type.replace(/_/g,' ')}</span>
                                     <span className="log-timestamp">{formatTimestamp(log.timestamp)}</span>
                                </div>
                                <div className="log-notes">{log.notes || <span className="text-muted">-</span>}</div>
                                <div className="log-footer">
                                     {log.user ? (
                                         <span className="log-user" title={`Logged by: ${log.user.email}`}>
                                             <User size={12} />
                                             Logged by {log.user.name || log.user.email} {/* Display name or fallback to email */}
                                         </span>
                                     ) : log.user_id ? ( // Fallback if user object isn't present for some reason
                                         <span className="log-user" title={`Logged by User ID: ${log.user_id}`}>
                                             <User size={12} /> Logged by User {log.user_id}
                                         </span>
                                     ) : null}
                                     {log.appointment_id && <span className="log-appointment-link" title={`Related to Appointment ID: ${log.appointment_id}`}><Calendar size={12} /> Appt. #{log.appointment_id}</span>}
                                     <span className={`log-status status-${log.status.toLowerCase()}`}>{log.status}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="pagination-controls activity-pagination">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || isLoading}>
                        &lt; Previous
                    </button>
                    <span> Page {currentPage} of {totalPages} </span>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || isLoading}>
                        Next &gt;
                    </button>
                </div>
            )}
        </div>
    );
};

export default ActivityFeed;
