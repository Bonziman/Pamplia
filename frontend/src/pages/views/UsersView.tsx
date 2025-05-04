// src/pages/views/UsersView.tsx
// --- NEW FILE ---

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/authContext'; // Assuming useAuth provides userProfile
import { fetchUsers } from '../../api/userApi';
import { FetchedUser } from '../../api/userApi'; // Or define/import interface here
import '../../components/TableStyles.css'; // Reuse table styles

interface UsersViewProps {
    userProfile: { role: string; /* other profile fields */ }; // Pass necessary profile info
    // setError?: (message: string | null) => void; // Optional: For reporting global errors
}

const UsersView: React.FC<UsersViewProps> = ({ userProfile }) => {
    const [users, setUsers] = useState<FetchedUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState<boolean>(true); // Start loading true
    const [localError, setLocalError] = useState<string | null>(null);

    // Permissions derived from props
    const canViewUsers = userProfile.role === "super_admin" || userProfile.role === "admin";

    const loadUsers = useCallback(() => {
        if (!canViewUsers) {
            console.log("UsersView: Skipping fetch, permission denied.");
            setLoadingUsers(false);
            setUsers([]); // Ensure users are empty if no permission
            return;
        }
        setLoadingUsers(true);
        setLocalError(null);
        console.log("UsersView: Fetching users...");
        fetchUsers()
            .then(data => {
                console.log("UsersView: Fetch success", data);
                setUsers(data);
            })
            .catch(err => {
                console.error("UsersView: Fetch error", err);
                // Extract message if possible, otherwise use generic
                const message = err.response?.data?.detail || err.message || "Could not load users.";
                setLocalError(message);
                setUsers([]); // Clear data on error
            })
            .finally(() => {
                setLoadingUsers(false);
            });
    }, [canViewUsers]); // Dependency: permission check

    // Fetch users on component mount or when permission changes
    useEffect(() => {
        loadUsers();
    }, [loadUsers]); // Dependency: the memoized load function

    // --- Render ---

    if (!canViewUsers) {
        return <div className="permission-message">You do not have permission to view users.</div>;
    }

    return (
        <div className="view-section">
            <div className="view-header">
                <h2>Users Dashboard</h2>
                {/* Add Create User Button here if needed */}
            </div>

            {localError && <div className="error-message">Error: {localError}</div>}

            {loadingUsers ? (
                <div className="loading-message">Loading users...</div>
            ) : !users || users.length === 0 ? (
                <div className="info-message">No users found.</div>
            ) : (
                <div className="table-container">
                    <table className="data-table users-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>ID</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Tenant ID</th>
                                {/* Add Actions header if needed */}
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td>{u.name ?? '-'}</td>
                                    <td>{u.id}</td>
                                    <td>{u.email}</td>
                                    <td>{u.role}</td>
                                    <td>{u.tenant_id ?? 'N/A'}</td>
                                    {/* Add actions cells if needed */}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default UsersView;
