// src/components/Sidebar.tsx
// --- FULL REPLACEMENT ---

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link for navigation
import './Sidebar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarDays, faUsers, faTags, faArrowLeft, faArrowRight,
    faAddressBook, faUserCircle, faChevronDown, faChevronUp, faCog,
    faSignOutAlt, faIdBadge, faPalette, faThLarge, faFileInvoice // Ensure these icons are available in the solid set
} from '@fortawesome/free-solid-svg-icons';

interface SidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    userRole: string | undefined;
    activeView: string; // Base path like 'clients', 'calendar'
    onNavigate: (path: string) => void; // Function to trigger router navigation
    userName: string;
    userAvatarUrl?: string | null;
    isSettingsMenuOpen: boolean;
    toggleSettingsMenu: () => void;
    onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    isCollapsed,
    toggleSidebar,
    userRole,
    activeView, // Now represents the base path (e.g., 'clients')
    onNavigate,
    userName,
    userAvatarUrl,
    isSettingsMenuOpen,
    toggleSettingsMenu,
    onLogout
}) => {
    const profileSectionRef = useRef<HTMLDivElement>(null);

    // Permissions
    const canViewUsers = userRole === "super_admin" || userRole === "admin";
    const canManageServices = userRole === "super_admin" || userRole === "admin";
    const canManageClients = userRole === "super_admin" || userRole === "admin" || userRole === "staff";
    const canManageTagDefinitions = userRole === "super_admin" || userRole === "admin" || userRole === "staff";
    const canAccessTenantSettings = userRole === "super_admin" || userRole === "admin";

    // Icons
    const menuIcon = isCollapsed ? <FontAwesomeIcon icon={faArrowRight} /> : <FontAwesomeIcon icon={faArrowLeft} />;
    const calendarIcon = <FontAwesomeIcon icon={faCalendarDays} />;
    const clientsIcon = <FontAwesomeIcon icon={faAddressBook} />;
    const servicesIcon = <FontAwesomeIcon icon={faTags} />;
    const usersIcon = <FontAwesomeIcon icon={faUsers} />;
    const tagsIcon = <FontAwesomeIcon icon={faTags} />;
    const settingsIcon = <FontAwesomeIcon icon={faCog} />;
    const profileSettingsIcon = <FontAwesomeIcon icon={faIdBadge} />;
    const themeIcon = <FontAwesomeIcon icon={faPalette} />;
    const logoutIcon = <FontAwesomeIcon icon={faSignOutAlt} />;
    const profileToggleIcon = isSettingsMenuOpen ? faChevronUp : faChevronDown;
    const dashboardIcon = <FontAwesomeIcon icon={faThLarge} />;
    const templateIcon = <FontAwesomeIcon icon={faFileInvoice} />;

    // Handler for navigating from settings menu
    const handleSettingsNavigation = (viewPath: string) => {
        onNavigate(viewPath); // Use the navigation function passed from Dashboard
        // No need to toggle menu here, parent Dashboard handles closing on navigate
    };

     // Close settings menu if clicking outside of it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileSectionRef.current && !profileSectionRef.current.contains(event.target as Node)) {
                // Check if the menu is currently open before trying to close it
                if(isSettingsMenuOpen) {
                    toggleSettingsMenu(); // Call the toggle function from props
                }
            }
        };
        // Only add listener if menu is open
        if (isSettingsMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        // Cleanup listener on unmount or when menu closes
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSettingsMenuOpen, toggleSettingsMenu]); // Depend on state and toggle function


    return (
        <aside className={`app-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-top">
                <button className="sidebar-toggle-button" onClick={toggleSidebar} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                    {menuIcon}
                </button>
                <nav className="sidebar-nav">
                    <ul>
                        {/* Use Link component for standard navigation, or button with onNavigate */}
                        <li className={activeView === 'dashboard' ? 'active' : ''} title={isCollapsed ? "Calendar" : ""}>
                            {/* Using button + onNavigate handler */}
                            <button onClick={() => onNavigate('dashboard')}>
                                <span className="nav-icon">{dashboardIcon}</span>
                                {!isCollapsed && <span className="nav-text">Dashboard</span>}
                            </button>
                            {/* Alternative using Link:
                            <Link to="/dashboard/calendar">
                                <span className="nav-icon">{calendarIcon}</span>
                                {!isCollapsed && <span className="nav-text">Calendar</span>}
                            </Link> */}
                        </li>
                        <li className={activeView === 'calendar' ? 'active' : ''} title={isCollapsed ? "Calendar" : ""}>
                            {/* Using button + onNavigate handler */}
                            <button onClick={() => onNavigate('calendar')}>
                                <span className="nav-icon">{calendarIcon}</span>
                                {!isCollapsed && <span className="nav-text">Calendar</span>}
                            </button>
                            {/* Alternative using Link:
                            <Link to="/dashboard/calendar">
                                <span className="nav-icon">{calendarIcon}</span>
                                {!isCollapsed && <span className="nav-text">Calendar</span>}
                            </Link> */}
                        </li>
                        {canManageClients && (
                            <li className={activeView === 'clients' ? 'active' : ''} title={isCollapsed ? "Clients" : ""}>
                                <button onClick={() => onNavigate('clients')}>
                                    <span className="nav-icon">{clientsIcon}</span>
                                    {!isCollapsed && <span className="nav-text">Clients</span>}
                                </button>
                            </li>
                        )}
                        {canManageServices && (
                             <li className={activeView === 'services' ? 'active' : ''} title={isCollapsed ? "Services" : ""}>
                                <button onClick={() => onNavigate('services')}>
                                    <span className="nav-icon">{servicesIcon}</span>
                                    {!isCollapsed && <span className="nav-text">Services</span>}
                                </button>
                             </li>
                        )}
                        {canViewUsers && (
                            <li className={activeView === 'users' ? 'active' : ''} title={isCollapsed ? "Users" : ""}>
                                <button onClick={() => onNavigate('users')}>
                                    <span className="nav-icon">{usersIcon}</span>
                                    {!isCollapsed && <span className="nav-text">Users</span>}
                                </button>
                            </li>
                        )}
                        
                    </ul>
                </nav>
            </div>

            <div className="sidebar-spacer"></div>

            <div className="sidebar-bottom" ref={profileSectionRef}>
                {!isCollapsed && isSettingsMenuOpen && (
                    <div className="settings-menu">
                         {canManageTagDefinitions && (
                             <button onClick={() => handleSettingsNavigation('settings-tags')}>
                                 <FontAwesomeIcon icon={faTags} fixedWidth /> Manage Tags
                             </button>
                         )}
                         {canAccessTenantSettings && (
                             <button onClick={() => onNavigate('/dashboard/settings-business')}>
                                 <FontAwesomeIcon icon={faCog} fixedWidth /> Tenant Settings
                             </button>
                         )}
                         {canAccessTenantSettings && (
                             <button onClick={() => onNavigate('/dashboard/settings-templates')}>
                                 <FontAwesomeIcon icon={faFileInvoice} fixedWidth /> Manage Templates
                             </button>
                         )}
                         <button onClick={() => alert("Theme switcher not implemented yet!")}>
                             <FontAwesomeIcon icon={faPalette} fixedWidth /> Appearance
                         </button>
                    </div>
                )}

                <div className={`sidebar-profile-section ${isCollapsed ? 'collapsed' : ''} ${isSettingsMenuOpen ? 'menu-open' : ''}`}>
                    <button
                        className="profile-button"
                        onClick={toggleSettingsMenu} // Use the passed toggle function
                        disabled={isCollapsed}
                        aria-haspopup="true"
                        aria-expanded={isSettingsMenuOpen}
                    >
                        
                        {!isCollapsed && (
                            <>
                                <span className="nav-icon">{settingsIcon}</span>
                                <span className="profile-info"><span className="profile-name">Settings</span></span>
                                <span className="profile-toggle-icon"><FontAwesomeIcon icon={profileToggleIcon} /></span>
                            </>
                        )}
                    </button>
                </div>

                 <div className={`sidebar-logout-section ${isCollapsed ? 'collapsed' : ''}`}>
                     <button className="sidebar-logout-button" onClick={onLogout} title={isCollapsed ? "Log out" : ""}>
                         <span className="nav-icon">{logoutIcon}</span>
                         {!isCollapsed && <span className="nav-text">Log out</span>}
                     </button>
                 </div>
            </div>
        </aside>
    );
};

export default Sidebar;
