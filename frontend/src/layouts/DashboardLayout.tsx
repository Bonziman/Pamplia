// src/layouts/DashboardLayout.tsx
// Responsive shell: Sidebar (desktop) + Header + MobileBottomNav + content area

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Flex, useBreakpointValue } from '@chakra-ui/react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import MobileBottomNav from '../components/MobileBottomNav';
import CommandPalette from '../components/CommandPalette';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userName: string;
  userRole: string | undefined;
  activeView: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  isSettingsMenuOpen: boolean;
  toggleSettingsMenu: () => void;
  tenantId?: number;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  userName,
  userRole,
  activeView,
  onNavigate,
  onLogout,
  isSettingsMenuOpen,
  toggleSettingsMenu,
  tenantId,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Sidebar width for content offset (desktop only)
  const sidebarWidth = isSidebarCollapsed ? '72px' : '240px';

  // Page title derived from active view
  const pageTitles: Record<string, string> = {
    overview: 'Dashboard',
    dashboard: 'Dashboard',
    calendar: 'Calendar',
    clients: 'Clients',
    users: userRole === 'super_admin' ? 'Users' : 'Staff',
    services: 'Services',
    tenants: 'Tenants',
    'settings-tags': 'Manage Tags',
    'settings-business': 'Business Settings',
    'settings-templates': 'Templates',
  };

  return (
    <Flex minH="100vh" bg="ui.bg">
      {/* Sidebar — hidden below lg */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        userRole={userRole}
        tenantId={tenantId}
        activeView={activeView}
        onNavigate={onNavigate}
        isSettingsMenuOpen={isSettingsMenuOpen}
        toggleSettingsMenu={toggleSettingsMenu}
        onLogout={onLogout}
      />

      {/* Main content area */}
      <Box
        ml={{ base: 0, lg: sidebarWidth }}
        transition="margin-left 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
        flex="1"
        display="flex"
        flexDirection="column"
        minH="100vh"
        // Push content above bottom nav on mobile
        pb={{ base: 'calc(56px + env(safe-area-inset-bottom, 0px))', lg: 0 }}
      >
        {/* Header */}
        <Header
          userName={userName}
          userRole={userRole}
          onLogout={onLogout}
          pageTitle={pageTitles[activeView] || 'Dashboard'}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Scrollable content */}
        <Box
          as="main"
          flex="1"
          px={{ base: 4, md: 6, xl: 8 }}
          py={{ base: 4, md: 6 }}
          overflowY="auto"
          maxW="1440px"
          w="100%"
          mx="auto"
        >
          {children}
        </Box>
      </Box>

      {/* Mobile bottom nav — hidden above lg */}
      <MobileBottomNav
        activeView={activeView}
        onNavigate={onNavigate}
        userRole={userRole}
        onLogout={onLogout}
      />

      {/* Command palette — ⌘K */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(path) => onNavigate(path)}
        onLogout={onLogout}
        userRole={userRole}
      />
    </Flex>
  );
};

export default DashboardLayout;
