// src/pages/Dashboard.tsx // Assuming file path based on previous examples
import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/authContext";
import { useNavigate } from "react-router-dom";
import { fetchUsers } from "../api/userApi"; // Adjust path if needed

// Define a basic type for the user fetched by fetchUsers, adjust as needed
interface FetchedUser {
    id: number;
    name: string;
    email: string;
    role: string;
    tenant_id: number;
}

const Dashboard: React.FC = () => { // Use React.FC for type safety
  // Destructure user (from token), userProfile (from /profile), token, logout, and isLoading (from context)
  const { user, userProfile, token, logout, isLoading: authIsLoading } = useAuth();
  const [users, setUsers] = useState<FetchedUser[]>([]); // Use the FetchedUser type
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true); // Renamed to avoid conflict
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Effect to fetch the list of users for the table
  useEffect(() => {
    // Only fetch if authenticated (token exists) and auth loading is complete
    if (!authIsLoading && token) {
      const fetchData = async () => {
        setLoadingUsers(true); // Start loading users list
        try {
          console.log("Fetching users list...");
          // Pass token explicitly if fetchUsers requires it, otherwise axiosInstance handles it
          const fetchedUsers: FetchedUser[] = await fetchUsers(token); // Assuming fetchUsers uses axiosInstance or gets token passed
          setUsers(fetchedUsers);
           console.log("Fetched users list:", fetchedUsers);
        } catch (error) {
          console.error("Error fetching users list:", error);
          // Handle error fetching users list (e.g., show a message)
        } finally {
          setLoadingUsers(false); // Finish loading users list
        }
      };

      fetchData();
    } else if (!authIsLoading && !token) {
        // If auth is loaded but there's no token, no need to try fetching users
        setLoadingUsers(false);
    }
  }, [authIsLoading, token]); // Depend on authIsLoading and token

  // --- Render Logic ---

  // Show main loading state while auth context is initializing
  if (authIsLoading) {
    return <div>Loading Authentication...</div>;
  }

  // If auth is loaded but there's no user/profile (shouldn't happen if ProtectedRoute is used, but good safety check)
  if (!user || !userProfile) {
     // This might indicate an issue, or the user just logged out.
     // ProtectedRoute should redirect to login, but we can show a message or null.
     console.log("Dashboard: No user or userProfile found after auth loading.");
     // Optional: navigate('/login');
     return <div>Not authenticated. Redirecting...</div>; // Or return null
  }

  // Main dashboard content
  return (
    <div>
      {/* Header Section */}
      <div>
        {/* Use userProfile?.name for the display name */}
        <h1>Welcome, {userProfile?.name || user?.sub}</h1> {/* Fallback to sub if name not available */}
        {/* Role can come from user (token) or userProfile */}
        <p>Your role: {user.role}</p>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <hr />

      {/* Users Table Section */}
      <h2>Users Dashboard</h2>
      {/* Role-based check for displaying the table */}
      {user.role === "super_admin" || user.role === "admin" ? (
        loadingUsers ? (
          <div>Loading users list...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Email</th>
                <th>Role</th>
                <th>Tenant ID</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => ( // Renamed map variable
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.id}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{u.tenant_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : (
        <p>You do not have permission to view the users list.</p>
      )}
    </div>
  );
};

export default Dashboard;
