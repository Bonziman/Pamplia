// src/components/Header.tsx
import React from 'react';
import './Header.css'; // We'll create this CSS file next

interface HeaderProps {
  userName: string;
  onLogout: () => void;
}
const Header: React.FC<HeaderProps> = ({ userName, onLogout }) => {
  return (
    <header className="app-header">
      <div className="header-logo">
        {/* Replace with actual logo later */}
        Pamplia
      </div>
      <div className="header-user-controls">
      <span className="profile-avatar">
      <img src="/defaults/icons8-male-user-94.png" alt="" style={{ width: '50px' }}/>
      </span>
        <span className="user-name">{userName}</span>
        <button onClick={onLogout} className="logout-button">
          {/* Replace with icon later */}
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;

