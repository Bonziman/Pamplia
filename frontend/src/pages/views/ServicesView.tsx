// src/pages/views/ServicesView.tsx
// --- NEW FILE ---

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios'; // For error checking utility
import { useAuth } from '../../auth/authContext'; // Assuming provides userProfile
import {
    fetchManagedServices,
    createService,
    updateService,
    deleteService,
    FetchedService,
    ServiceCreatePayload,
    ServiceUpdatePayload
} from '../../api/serviceApi';

// Modals
import CreateServiceModal from '../../components/modals/CreateServiceModal';
import UpdateServiceModal from '../../components/modals/UpdateServiceModal';
import DeleteServiceModal from '../../components/modals/DeleteServiceModal';

import '../../components/TableStyles.css'; // Reuse table styles
import '../Dashboard.css'; // Reuse view section styles if needed

import { Button, Spinner } from "@chakra-ui/react"

interface ServicesViewProps {
    userProfile: { role: string; id: number /* other profile fields */ }; // Pass necessary profile info
    // setError?: (message: string | null) => void; // Optional: For reporting global errors
}

// --- Utility function to extract error message ---
const getErrorMessage = (err: any, defaultMessage: string): string => {
    console.error("API Error:", err.response || err);
    let errorMessage = defaultMessage;
    if (axios.isAxiosError(err) && err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') { errorMessage = detail; }
        else if (Array.isArray(detail) && detail[0]?.msg) { errorMessage = `${detail[0].loc.join(' -> ')}: ${detail[0].msg}`; }
        else { errorMessage = JSON.stringify(detail); }
    } else if (err instanceof Error) { errorMessage = err.message; }
    return errorMessage;
};


const ServicesView: React.FC<ServicesViewProps> = ({ userProfile }) => {
    const [managedServices, setManagedServices] = useState<FetchedService[]>([]);
    const [loadingManagedServices, setLoadingManagedServices] = useState<boolean>(true); // Start true
    const [localError, setLocalError] = useState<string | null>(null);

    // Modal State
    const [isCreateServiceModalOpen, setIsCreateServiceModalOpen] = useState(false);
    const [isUpdateServiceModalOpen, setIsUpdateServiceModalOpen] = useState(false);
    const [isDeleteServiceModalOpen, setIsDeleteServiceModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<FetchedService | null>(null);

    // Permissions derived from props
    const canManageServices = userProfile.role === "super_admin" || userProfile.role === "admin";
    const canDeleteServices = userProfile.role === "super_admin" || userProfile.role === "admin";

    const loadManagedServices = useCallback(() => {
        if (!canManageServices) {
            console.log("ServicesView: Skipping fetch, permission denied.");
            setLoadingManagedServices(false);
            setManagedServices([]);
            return;
        }
        setLoadingManagedServices(true);
        setLocalError(null);
        console.log("ServicesView: Fetching managed services...");
        fetchManagedServices()
            .then(data => {
                console.log("ServicesView: Fetch success", data);
                setManagedServices(data);
            })
            .catch(err => {
                console.error("ServicesView: Fetch error", err);
                setLocalError(getErrorMessage(err, "Could not load services list."));
                setManagedServices([]);
            })
            .finally(() => {
                setLoadingManagedServices(false);
            });
    }, [canManageServices]); // Dependency: permission check

    // Fetch services on mount or when permission changes
    useEffect(() => {
        loadManagedServices();
    }, [loadManagedServices]); // Dependency: the memoized load function

    // --- Handlers ---
    const handleOpenCreateServiceModal = () => setIsCreateServiceModalOpen(true);
    const handleServiceRowEditClick = (service: FetchedService) => { setSelectedService(service); setIsUpdateServiceModalOpen(true); };
    const handleServiceRowDeleteClick = (service: FetchedService) => { setSelectedService(service); setIsDeleteServiceModalOpen(true); };

    const handleCreateService = useCallback(async (data: ServiceCreatePayload) => {
        setLocalError(null);
        try {
            console.log("ServicesView: Creating service...", data);
            await createService(data);
            loadManagedServices(); // Refresh list
            setIsCreateServiceModalOpen(false);
            console.log("ServicesView: Create success");
        } catch (err: any) {
            console.error("ServicesView: Create error", err);
            setLocalError(getErrorMessage(err, "Failed to create service."));
            // Optional: Keep modal open on error? throw err;
        }
    }, [loadManagedServices]); // Dependency: load function

    const handleUpdateService = useCallback(async (id: number, data: ServiceUpdatePayload) => {
        setLocalError(null);
        try {
            console.log("ServicesView: Updating service...", id, data);
            await updateService(id, data);
            loadManagedServices(); // Refresh list
            setIsUpdateServiceModalOpen(false);
            setSelectedService(null);
            console.log("ServicesView: Update success");
        } catch (err: any) {
            console.error("ServicesView: Update error", err);
            setLocalError(getErrorMessage(err, "Failed to update service."));
            // Optional: Keep modal open on error? throw err;
        }
    }, [loadManagedServices]); // Dependency: load function

    const handleDeleteService = useCallback(async (id: number) => {
        setLocalError(null);
        try {
            console.log("ServicesView: Deleting service...", id);
            await deleteService(id);
            loadManagedServices(); // Refresh list
            setIsDeleteServiceModalOpen(false);
            setSelectedService(null);
            console.log("ServicesView: Delete success");
        } catch (err: any) {
            console.error("ServicesView: Delete error", err);
            setLocalError(getErrorMessage(err, "Failed to delete service."));
            // Optional: Keep modal open on error? throw err;
        }
    }, [loadManagedServices]); // Dependency: load function

    // --- Render ---

    if (!canManageServices) {
        return <div className="permission-message">You do not have permission to manage services.</div>;
    }

    return (
        <>
            <div className="view-section">
                <div className="view-header">
                    <h2>Services Management</h2>
                    <Button onClick={handleOpenCreateServiceModal} className="button button-primary">Add New Service</Button>
                </div>

                {localError && <div className="error-message">Error: {localError} <button onClick={() => setLocalError(null)}>×</button></div>}

                {loadingManagedServices ? (
                    <div className="loading-message" style={{display: 'flex',width: '100%', alignItems: 'center', padding: '20px' }}>
                        <Spinner color='brand.500' alignSelf='center'/>
                    </div>
                    
                ) : !managedServices || managedServices.length === 0 ? (
                    <div className="info-message">No services found.</div>
                ) : (
                    <div className="table-container">
                        <table className="data-table services-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Duration</th>
                                    <th>Price</th>
                                    {userProfile.role === 'super_admin' && <th>Tenant ID</th>}
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {managedServices.map(s => (
                                    <tr key={s.id}>
                                        <td>{s.id}</td>
                                        <td>{s.name}</td>
                                        <td>{s.duration_minutes} min</td>
                                        <td>{s.price != null ? s.price.toFixed(2) : 'N/A'}</td>
                                        {userProfile.role === 'super_admin' && <td>{s.tenant_id}</td>}
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => handleServiceRowEditClick(s)} className="button button-secondary button-small">Edit</button>
                                                {canDeleteServices && <button onClick={() => handleServiceRowDeleteClick(s)} className="button button-danger button-small">Delete</button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* --- Modals --- */}
            {/* Render modals within this view, controlled by this view's state */}
            <CreateServiceModal
                isOpen={isCreateServiceModalOpen}
                onClose={() => setIsCreateServiceModalOpen(false)}
                onSubmit={handleCreateService}
                userProfile={userProfile} // Pass profile if needed by modal logic
            />
            <UpdateServiceModal
                isOpen={isUpdateServiceModalOpen}
                onClose={() => { setIsUpdateServiceModalOpen(false); setSelectedService(null); }}
                onSubmit={handleUpdateService}
                service={selectedService}
            />
            <DeleteServiceModal
                isOpen={isDeleteServiceModalOpen}
                onClose={() => { setIsDeleteServiceModalOpen(false); setSelectedService(null); }}
                onConfirm={handleDeleteService}
                service={selectedService}
            />
        </>
    );
};

export default ServicesView;
