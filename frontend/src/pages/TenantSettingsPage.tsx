// src/pages/TenantSettingsPage.tsx
// --- FULL REPLACEMENT - COMPLETE CODE ---

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/authContext'; // To get user role
import { fetchTenantMe, updateTenantMe } from '../api/tenantApi'; // Import API functions
import { TenantOut, TenantUpdate, BusinessHoursConfig } from '../types/tenants'; // Import Types (adjust path if needed)
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faBuilding, faAddressCard, faMapMarkerAlt, faTools, faFileContract, faSave, faTimes, faEdit } from '@fortawesome/free-solid-svg-icons';

// Import the editor component
import BusinessHoursEditor from '../components/settings/BusinessHoursEditor'; // Adjust path

// Import shared styles or create new ones
import './styles/TenantSettingsPage.css'; // Create this CSS file
 // Assuming common form styles

// Default Logo
const DEFAULT_LOGO_URL = '/defaults/icons8-male-user-94.png'; // Adjust path as needed

type SettingsTab = 'general' | 'contact' | 'address' | 'operational' | 'policy';

const TenantSettingsPage: React.FC = () => {
    const { userProfile } = useAuth(); // Get user profile for role checks

    // State for data, loading, editing, messages
    const [tenantData, setTenantData] = useState<TenantOut | null>(null);
    const [initialData, setInitialData] = useState<TenantOut | null>(null); // Store originally fetched data
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');

    // Memoized permissions check
    const canEdit = useMemo(() => userProfile?.role === 'admin' || userProfile?.role === 'super_admin', [userProfile?.role]);
    const isSuperAdmin = useMemo(() => userProfile?.role === 'super_admin', [userProfile?.role]);

    // --- Fetch Data ---
    const loadTenantData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const data = await fetchTenantMe();
            // Ensure business_hours_config is handled correctly (null or object)
            const sanitizedData = {
                ...data,
                business_hours_config: data.business_hours_config ?? null
            };
            setTenantData(sanitizedData);
            setInitialData(sanitizedData); // Store the initial state for change comparison
            console.log("Tenant data loaded:", sanitizedData);
        } catch (err: any) {
            console.error("Failed to load tenant settings:", err);
            const detail = err.response?.data?.detail || err.message || "Failed to load tenant settings.";
            setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
        } finally {
            setIsLoading(false);
        }
    }, []); // Empty dependency array, load only once on mount

    useEffect(() => {
        loadTenantData();
    }, [loadTenantData]); // Depend on the memoized function

    // --- Form Input Handler (for standard inputs) ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setTenantData((prev: TenantOut | null) => {
            if (!prev) return null;
            // Add specific type handling if needed, e.g., for numbers
            return { ...prev, [name]: value };
        });
        // Clear messages on user input
        setError(null);
        setSuccessMessage(null);
    };

    // --- Handler for Business Hours Changes ---
    const handleHoursChange = useCallback((newConfig: BusinessHoursConfig | null) => { // Allow null
        setTenantData((prev: TenantOut | null) => prev ? { ...prev, business_hours_config: newConfig } : null);
        setError(null);
        setSuccessMessage(null);
    }, []);

    // --- Edit Mode Toggle ---
    const handleEditToggle = () => {
        setError(null);
        setSuccessMessage(null);
        if (isEditing && initialData) {
            // If cancelling edit, reset form data to the initial fetched state
            setTenantData(initialData);
            console.log("Edit cancelled, resetting form data.");
        } else if (!isEditing && initialData) {
            // Entering edit mode, ensure current state matches initial before edits start
             setTenantData(initialData);
             console.log("Entering edit mode.");
        }
        setIsEditing(prev => !prev);
    };

    // --- Save Changes ---
    const handleSaveChanges = async () => {
        if (!tenantData || !initialData || !canEdit) {
            setError("Cannot save: No data loaded or insufficient permissions.");
            return;
        }

        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        // Construct payload with only changed fields
        const payload: TenantUpdate = {
            business_hours_config: tenantData?.business_hours_config ?? null, // Provide a default value
        };
        let hasChanges = false;

        // Iterate over keys of the potentially edited tenantData
        (Object.keys(tenantData) as Array<keyof TenantOut>).forEach(key => {
            // Ensure the key is potentially updatable and exists in initial data for comparison
            if (!initialData.hasOwnProperty(key)) return;

            const currentValue = tenantData[key];
            const initialValue = initialData[key];

            // Special comparison for JSON objects
            if (key === 'business_hours_config' || key === 'booking_widget_config') {
                if (JSON.stringify(currentValue) !== JSON.stringify(initialValue)) {
                    (payload as any)[key] = currentValue; // Send the potentially null or object value
                    hasChanges = true;
                }
            }
            // Standard comparison for other fields
            else if (currentValue !== initialValue) {
                 // Prevent non-superadmin from changing 'name'
                 if (key === 'name' && !isSuperAdmin) {
                     console.warn("Attempted to change 'name' without super_admin role. Skipping.");
                     return; // Skip adding 'name' to payload
                 }
                 // Handle empty strings potentially needing to be null
                (payload as any)[key] = currentValue === '' ? null : currentValue;
                hasChanges = true;
            }
        });


        if (!hasChanges) {
            setError("No changes detected to save.");
            setIsSaving(false);
            setIsEditing(false); // Exit edit mode if no changes were made
            return;
        }

        console.log("Saving payload:", payload);

        try {
            const updatedTenant = await updateTenantMe(payload);
            // Sanitize response data before setting state
            const sanitizedData = {
                 ...updatedTenant,
                 business_hours_config: updatedTenant.business_hours_config ?? null
            };
            setTenantData(sanitizedData); // Update local state with response
            setInitialData(sanitizedData); // Update initial data to reflect saved state
            setIsEditing(false); // Exit edit mode
            setSuccessMessage("Settings updated successfully!");
            console.log("Tenant settings updated:", updatedTenant);
        } catch (err: any) {
            console.error("Failed to update tenant settings:", err);
            const detail = err.response?.data?.detail || err.message || "Failed to save settings.";
             setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
            // Keep isEditing true on error so user can retry or cancel
        } finally {
            setIsSaving(false);
        }
    };

    // --- Render Loading/Error ---
    if (isLoading) {
        return <div className="loading-message view-section">Loading Tenant Settings... <FontAwesomeIcon icon={faSpinner} spin /></div>;
    }

    if (error && !tenantData && !isSaving) { // Show critical error only if data never loaded (and not during save)
        return <div className="error-message alert alert-danger view-section">{error} <button className="button button-secondary button-small" onClick={loadTenantData}>Retry</button></div>;
    }

    if (!tenantData) {
        return <div className="info-message view-section">Tenant data is unavailable or could not be loaded.</div>;
    }

    // --- Tab Content Renderer ---
    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="form-section">
                        <h3 className="form-section-title">General Information</h3>
                        <div className="form-group">
                            <label htmlFor="tenantName">Business Name</label>
                            <input
                                type="text" id="tenantName" name="name"
                                value={tenantData.name || ''}
                                onChange={handleInputChange}
                                disabled={!isEditing || !isSuperAdmin} // Only super admin can edit name
                                className={!isSuperAdmin && isEditing ? 'input-disabled-reason' : ''} // Style differently if disabled due to role
                                required
                            />
                             {!isSuperAdmin && <small className="field-hint">Only Super Admin can change the business name.</small>}
                        </div>
                         <div className="form-group">
                             <label htmlFor="tenantSubdomain">Subdomain</label>
                             <input type="text" id="tenantSubdomain" name="subdomain" value={tenantData.subdomain || ''} disabled className="input-disabled" />
                             <small className="field-hint">Subdomain cannot be changed after creation.</small>
                         </div>
                        <div className="form-group">
                            <label htmlFor="tenantSlogan">Slogan / Tagline</label>
                            <input
                                type="text" id="tenantSlogan" name="slogan"
                                value={tenantData.slogan || ''}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                                className={!isEditing ? 'input-disabled' : ''}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="logoUrl">Logo URL</label>
                            <input
                                type="url" id="logoUrl" name="logo_url"
                                value={tenantData.logo_url || ''}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                                className={!isEditing ? 'input-disabled' : ''}
                                placeholder="https://example.com/logo.png"
                            />
                            {/* Future: Add upload button here */}
                        </div>
                    </div>
                );
            case 'contact':
                return (
                    <div className="form-section">
                        <h3 className="form-section-title">Contact Details</h3>
                        <div className="form-group">
                            <label htmlFor="contactEmail">Contact Email</label>
                            <input
                                type="email" id="contactEmail" name="contact_email"
                                value={tenantData.contact_email || ''}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                                className={!isEditing ? 'input-disabled' : ''}
                                placeholder="info@yourbusiness.com"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="contactPhone">Contact Phone</label>
                            <input
                                type="tel" id="contactPhone" name="contact_phone"
                                value={tenantData.contact_phone || ''}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                                className={!isEditing ? 'input-disabled' : ''}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="websiteUrl">Website URL</label>
                            <input
                                type="url" id="websiteUrl" name="website_url"
                                value={tenantData.website_url || ''}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                                className={!isEditing ? 'input-disabled' : ''}
                                placeholder="https://yourbusiness.com"
                            />
                        </div>
                    </div>
                );
             case 'address':
                 return (
                     <div className="form-section">
                         <h3 className="form-section-title">Business Address</h3>
                         <div className="form-group">
                             <label htmlFor="addressStreet">Street</label>
                             <input type="text" id="addressStreet" name="address_street" value={tenantData.address_street || ''} onChange={handleInputChange} disabled={!isEditing} className={!isEditing ? 'input-disabled' : ''}/>
                         </div>
                         <div className="form-grid-col-2">
                             <div className="form-group">
                                 <label htmlFor="addressCity">City</label>
                                 <input type="text" id="addressCity" name="address_city" value={tenantData.address_city || ''} onChange={handleInputChange} disabled={!isEditing} className={!isEditing ? 'input-disabled' : ''}/>
                             </div>
                             <div className="form-group">
                                 <label htmlFor="addressState">State / Province</label>
                                 <input type="text" id="addressState" name="address_state" value={tenantData.address_state || ''} onChange={handleInputChange} disabled={!isEditing} className={!isEditing ? 'input-disabled' : ''}/>
                             </div>
                         </div>
                         <div className="form-grid-col-2">
                             <div className="form-group">
                                 <label htmlFor="addressPostalCode">Postal Code</label>
                                 <input type="text" id="addressPostalCode" name="address_postal_code" value={tenantData.address_postal_code || ''} onChange={handleInputChange} disabled={!isEditing} className={!isEditing ? 'input-disabled' : ''}/>
                             </div>
                              <div className="form-group">
                                 <label htmlFor="addressCountry">Country</label>
                                 <input type="text" id="addressCountry" name="address_country" value={tenantData.address_country || ''} onChange={handleInputChange} disabled={!isEditing} className={!isEditing ? 'input-disabled' : ''}/>
                             </div>
                         </div>
                     </div>
                 );
            case 'operational':
                 return (
                     <div className="form-section">
                         <h3 className="form-section-title">Operational Settings</h3>
                         <div className="form-group">
                             <label htmlFor="timezone">Timezone</label>
                             <input type="text" id="timezone" name="timezone" list="timezones-list" value={tenantData.timezone || 'UTC'} onChange={handleInputChange} disabled={!isEditing} required className={!isEditing ? 'input-disabled' : ''}/>
                             <datalist id="timezones-list">
                                 <option value="UTC" />
                                 <option value="Africa/Casablanca" />
                                 <option value="Europe/Paris" />
                                 <option value="Europe/London" />
                                 <option value="America/New_York" />
                                 <option value="America/Chicago" />
                                 <option value="America/Denver" />
                                 <option value="America/Los_Angeles" />
                                 <option value="Asia/Dubai" />
                                 <option value="Asia/Tokyo" />
                             </datalist>
                             <small className="field-hint">Standard TZ Database Name (e.g., UTC, Africa/Casablanca)</small>
                         </div>
                          <div className="form-group">
                             <label htmlFor="defaultCurrency">Default Currency</label>
                             <input type="text" id="defaultCurrency" name="default_currency" value={tenantData.default_currency || 'MAD'} onChange={handleInputChange} disabled={!isEditing} required maxLength={3} pattern="[A-Z]{3}" title="Enter 3-letter ISO 4217 code" className={!isEditing ? 'input-disabled' : ''}/>
                              <small className="field-hint">3-letter ISO 4217 code (e.g., MAD, USD, EUR)</small>
                         </div>
                         {/* --- ADD REMINDER INPUT --- */}
                         <div className="form-group">
                             <label htmlFor="reminderInterval">Reminder Interval (Hours)</label>
                             <input
                                type="number"
                                id="reminderInterval"
                                name="reminder_interval_hours"
                                value={tenantData?.reminder_interval_hours ?? ''} // Use '' if null for input value
                                onChange={handleInputChange}
                                disabled={!isEditing}
                                className={`form-input ${!isEditing ? 'input-disabled' : ''}`}
                                min="1" // Minimum 1 hour
                                max="168" // Maximum 1 week (adjust as needed)
                                step="1"
                                placeholder="e.g., 24"
                             />
                              <small className="field-hint">Hours before appointment to send reminder. Leave blank or enter 0 to disable.</small>
                         </div>
                          <div className="form-group">
                              <label>Business Hours</label>
                              {/* Render the BusinessHoursEditor component */}
                              <BusinessHoursEditor
                                 value={tenantData?.business_hours_config}
                                 onChange={handleHoursChange}
                                 isEditing={isEditing}
                             />
                          </div>
                     </div>
                 );
             case 'policy':
                 return (
                     <div className="form-section">
                          <h3 className="form-section-title">Policies & Configuration</h3>
                         <div className="form-group">
                             <label htmlFor="cancellationPolicy">Cancellation Policy</label>
                             <textarea
                                id="cancellationPolicy" name="cancellation_policy_text"
                                value={tenantData.cancellation_policy_text || ''}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                                rows={8} // Increased rows
                                className={`form-textarea ${!isEditing ? 'input-disabled' : ''}`}
                            />
                         </div>
                          {/* Placeholder for Booking Widget Config - Display read-only JSON */}
                          <div className="form-group">
                              <label>Booking Widget Config (Read-Only)</label>
                              <textarea
                                  value={tenantData.booking_widget_config ? JSON.stringify(tenantData.booking_widget_config, null, 2) : 'Not configured.'}
                                  readOnly
                                  disabled
                                  className="input-disabled code-display"
                                  rows={5}
                              />
                              <small className="field-hint">Configuration for embeddable booking widget (future feature).</small>
                          </div>
                     </div>
                 );
            default:
                // Ensure exhaustive check or return null
                 const _exhaustiveCheck: never = activeTab;
                return null;
        }
    };

    // --- Main Render ---
    return (
        <div className="view-section tenant-settings-page">
            {/* Page Header */}
            <div className="view-header tenant-settings-header">
                 <div className="header-logo-name">
                     <img
                        src={tenantData.logo_url || DEFAULT_LOGO_URL}
                        alt={`${tenantData.name} Logo`}
                        className="tenant-logo-preview"
                        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_LOGO_URL; }} // Type assertion for safety
                    />
                    <div className="header-text">
                        <h1>{tenantData.name}</h1>
                        <p className="header-subtext">Manage your business profile and operational settings</p>
                     </div>
                 </div>
                {/* Only show Edit/Save/Cancel buttons if the user has permission */}
                {canEdit && (
                    <div className="header-actions">
                        {!isEditing ? (
                            <button className="button button-primary" onClick={handleEditToggle}>
                                <FontAwesomeIcon icon={faEdit} style={{ marginRight: '5px' }}/> Edit Settings
                            </button>
                        ) : (
                            <>
                                <button className="button button-success" onClick={handleSaveChanges} disabled={isSaving}>
                                    {isSaving ? <><FontAwesomeIcon icon={faSpinner} spin /> Saving...</> : <><FontAwesomeIcon icon={faSave} style={{ marginRight: '5px' }}/> Save Changes</>}
                                </button>
                                <button className="button button-secondary" onClick={handleEditToggle} disabled={isSaving}>
                                     <FontAwesomeIcon icon={faTimes} style={{ marginRight: '5px' }}/> Cancel
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

             {/* Display Global Success/Error Messages */}
             {successMessage && <div className="alert alert-success">{successMessage}</div>}
             {/* Show persistent error only if not editing (errors during edit show inline potentially or clear on input) */}
             {error && !isEditing && <div className="alert alert-danger">{error}</div>}


            {/* Settings Content Layout (Tabs + Form Area) */}
            <div className="settings-content-layout">
                 {/* Left Side Navigation (Tabs) */}
                 <div className="settings-nav">
                     <ul>
                         <li className={activeTab === 'general' ? 'active' : ''} onClick={() => setActiveTab('general')}>
                            <FontAwesomeIcon icon={faBuilding} fixedWidth/> General
                         </li>
                         <li className={activeTab === 'contact' ? 'active' : ''} onClick={() => setActiveTab('contact')}>
                            <FontAwesomeIcon icon={faAddressCard} fixedWidth/> Contact
                         </li>
                         <li className={activeTab === 'address' ? 'active' : ''} onClick={() => setActiveTab('address')}>
                            <FontAwesomeIcon icon={faMapMarkerAlt} fixedWidth/> Address
                         </li>
                         <li className={activeTab === 'operational' ? 'active' : ''} onClick={() => setActiveTab('operational')}>
                            <FontAwesomeIcon icon={faTools} fixedWidth/> Operational
                         </li>
                          <li className={activeTab === 'policy' ? 'active' : ''} onClick={() => setActiveTab('policy')}>
                            <FontAwesomeIcon icon={faFileContract} fixedWidth/> Policies & Config
                         </li>
                     </ul>
                 </div>

                 {/* Right Side Form Area (Content changes based on activeTab) */}
                <div className="settings-form-area">
                    {/* Display specific error during save attempt */}
                    {error && isSaving && <div className="alert alert-danger">{error}</div>}
                    {/* Use a key on the form or content div if resetting state on tab change is needed */}
                    {/* key={activeTab} */}
                    <form onSubmit={(e) => e.preventDefault()}>
                        {renderTabContent()}
                     </form>
                 </div>
            </div>
        </div>
    );
};

export default TenantSettingsPage;
