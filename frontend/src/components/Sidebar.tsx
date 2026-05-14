// src/components/Sidebar.tsx
// Apple-inspired sidebar with Lucide icons & Chakra UI

import React, { useRef, useEffect } from 'react';
import {
  Box,
  Flex,
  VStack,
  Text,
  IconButton,
  Image,
  Collapse,
  Tooltip,
} from '@chakra-ui/react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCog,
  Tag,
  Briefcase,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  Tags,
  Building2,
  FileText,
  Palette,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLanguage } from '../i18n/languageContext';

// ─── NavItem ─────────────────────────────────────────────────────────────────
interface NavItemProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
  title?: string;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, isActive, isCollapsed, onClick, title }) => {
  const content = (
    <Box
      as="button"
      onClick={onClick}
      display="flex"
      alignItems="center"
      w="100%"
      h="42px"
      px={isCollapsed ? 0 : 3}
      justifyContent={isCollapsed ? 'center' : 'flex-start'}
      borderRadius="lg"
      bg={isActive ? 'ui.sidebarActive' : 'transparent'}
      color={isActive ? 'brand.400' : 'ui.sidebarMuted'}
      fontWeight={isActive ? '600' : '500'}
      fontSize="sm"
      cursor="pointer"
      border="none"
      transition="all 0.15s ease"
      _hover={{
        bg: isActive ? 'ui.sidebarActive' : 'ui.sidebarHover',
        color: isActive ? 'brand.400' : 'ui.sidebarText',
      }}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon size={isCollapsed ? 22 : 18} style={{ flexShrink: 0 }} />
      {!isCollapsed && (
        <Text ml="3" fontSize="sm" whiteSpace="nowrap" mb="0">
          {label}
        </Text>
      )}
    </Box>
  );

  if (isCollapsed) {
    return (
      <Tooltip label={title || label} placement="right" hasArrow openDelay={200}>
        {content}
      </Tooltip>
    );
  }

  return content;
};

// ─── Settings Sub-Item ───────────────────────────────────────────────────────
interface SettingsItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  isActive?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ icon: Icon, label, onClick, isActive }) => (
  <Box
    as="button"
    onClick={onClick}
    display="flex"
    alignItems="center"
    w="100%"
    h="36px"
    px="3"
    pl="10"
    borderRadius="md"
    bg={isActive ? 'ui.sidebarActive' : 'transparent'}
    color={isActive ? 'brand.400' : 'ui.sidebarMuted'}
    fontSize="sm"
    fontWeight="normal"
    cursor="pointer"
    border="none"
    transition="all 0.15s ease"
    _hover={{ bg: 'ui.sidebarHover', color: 'ui.sidebarText' }}
  >
    <Icon size={15} style={{ flexShrink: 0 }} />
    <Text ml="2.5" mb="0" whiteSpace="nowrap">{label}</Text>
  </Box>
);

// ─── Sidebar Props ───────────────────────────────────────────────────────────
interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  userRole: string | undefined;
  tenantId?: number;
  activeView: string;
  onNavigate: (path: string) => void;
  isSettingsMenuOpen: boolean;
  toggleSettingsMenu: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  toggleSidebar,
  userRole,
  activeView,
  onNavigate,
  isSettingsMenuOpen,
  toggleSettingsMenu,
  onLogout,
}) => {
  const { t } = useLanguage();
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Permissions
  const isSuperAdmin = userRole === 'super_admin';
  const canViewUsers = isSuperAdmin || userRole === 'admin';
  const canManageServices = userRole === 'admin';
  const canManageClients = userRole === 'admin' || userRole === 'staff';
  const canManageTagDefinitions = userRole === 'admin';
  const canAccessTenantSettings = userRole === 'admin';

  // Click-outside handler for settings menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        if (isSettingsMenuOpen) toggleSettingsMenu();
      }
    };
    if (isSettingsMenuOpen && !isCollapsed) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsMenuOpen, toggleSettingsMenu, isCollapsed]);

  const sidebarWidth = isCollapsed ? '72px' : '240px';

  const isSettingsActive = ['settings-tags', 'settings-business', 'settings-templates'].includes(activeView);

  return (
    <Box
      as="aside"
      bg="ui.sidebarBg"
      w={sidebarWidth}
      minH="100vh"
      position="fixed"
      top="0"
      left="0"
      zIndex="sticky"
      transition="width 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
      display={{ base: 'none', lg: 'flex' }}
      flexDirection="column"
      borderRight="1px solid"
      borderColor="whiteAlpha.100"
      overflowX="hidden"
      overflowY="auto"
      css={{
        '&::-webkit-scrollbar': { width: '4px' },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '4px',
        },
      }}
    >
      {/* Logo & collapse toggle */}
      <Flex
        align="center"
        justify={isCollapsed ? 'center' : 'space-between'}
        h="64px"
        px={isCollapsed ? 2 : 5}
        flexShrink={0}
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
      >
        {!isCollapsed && (
          <Image
            src="/logo_light.png"
            alt="Pamplia"
            h="28px"
            w="auto"
            objectFit="contain"
          />
        )}
        <IconButton
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          icon={isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          onClick={toggleSidebar}
          variant="unstyled"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="ui.sidebarMuted"
          _hover={{ color: 'ui.sidebarText' }}
          size="sm"
          minW="unset"
        />
      </Flex>

      {/* Navigation */}
      <VStack
        as="nav"
        spacing="1"
        px={isCollapsed ? 2 : 3}
        pt="4"
        pb="2"
        flex="1"
        align="stretch"
      >
        <NavItem
          icon={LayoutDashboard}
          label={t('nav.dashboard')}
          isActive={activeView === 'overview' || activeView === 'dashboard'}
          isCollapsed={isCollapsed}
          onClick={() => onNavigate('/dashboard')}
        />

        {isSuperAdmin && (
          <NavItem
            icon={Building2}
            label={t('nav.tenants')}
            isActive={activeView === 'tenants'}
            isCollapsed={isCollapsed}
            onClick={() => onNavigate('tenants')}
          />
        )}

        {!isSuperAdmin && (
          <NavItem
            icon={Calendar}
            label={t('nav.calendar')}
            isActive={activeView === 'calendar'}
            isCollapsed={isCollapsed}
            onClick={() => onNavigate('calendar')}
          />
        )}

        {!isSuperAdmin && canManageClients && (
          <NavItem
            icon={Users}
            label={t('nav.clients')}
            isActive={activeView === 'clients'}
            isCollapsed={isCollapsed}
            onClick={() => onNavigate('clients')}
          />
        )}

        {canViewUsers && (
          <NavItem
            icon={UserCog}
            label={isSuperAdmin ? t('nav.users') : t('nav.staff')}
            isActive={activeView === 'users' || activeView === 'staff'}
            isCollapsed={isCollapsed}
            onClick={() => onNavigate('users')}
            title={isSuperAdmin ? t('nav.users') : t('nav.staff')}
          />
        )}

        {!isSuperAdmin && canManageServices && (
          <NavItem
            icon={Briefcase}
            label={t('nav.services')}
            isActive={activeView === 'services'}
            isCollapsed={isCollapsed}
            onClick={() => onNavigate('services')}
          />
        )}
      </VStack>

      {/* Bottom: Settings & Logout */}
      <Box
        px={isCollapsed ? 2 : 3}
        pb="4"
        pt="2"
        borderTop="1px solid"
        borderColor="whiteAlpha.100"
        flexShrink={0}
      >
        <Box ref={settingsMenuRef}>
          <Collapse in={isSettingsMenuOpen && !isCollapsed} animateOpacity>
            <VStack spacing="0.5" py="1" align="stretch">
              {canManageTagDefinitions && (
                <SettingsItem
                  icon={Tags}
                  label={t('nav.manageTags')}
                  onClick={() => onNavigate('settings-tags')}
                  isActive={activeView === 'settings-tags'}
                />
              )}
              {canAccessTenantSettings && (
                <SettingsItem
                  icon={Building2}
                  label={t('nav.businessSettings')}
                  onClick={() => onNavigate('settings-business')}
                  isActive={activeView === 'settings-business'}
                />
              )}
              {canAccessTenantSettings && (
                <SettingsItem
                  icon={FileText}
                  label={t('nav.templates')}
                  onClick={() => onNavigate('settings-templates')}
                  isActive={activeView === 'settings-templates'}
                />
              )}
              <SettingsItem
                icon={Palette}
                label={t('nav.appearance')}
                onClick={() => {}}
              />
            </VStack>
          </Collapse>

          {/* Settings toggle */}
          {isCollapsed ? (
            <Tooltip label={t('nav.settings')} placement="right" hasArrow openDelay={200}>
              <Box
                as="button"
                display="flex"
                alignItems="center"
                justifyContent="center"
                w="100%"
                h="42px"
                borderRadius="lg"
                bg={isSettingsActive ? 'ui.sidebarActive' : 'transparent'}
                color={isSettingsActive ? 'brand.400' : 'ui.sidebarMuted'}
                cursor="pointer"
                border="none"
                transition="all 0.15s ease"
                _hover={{ bg: 'ui.sidebarHover', color: 'ui.sidebarText' }}
                onClick={toggleSettingsMenu}
              >
                <Settings size={22} />
              </Box>
            </Tooltip>
          ) : (
            <Box
              as="button"
              onClick={toggleSettingsMenu}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              w="100%"
              h="42px"
              px="3"
              borderRadius="lg"
              bg={isSettingsActive ? 'ui.sidebarActive' : 'transparent'}
              color={isSettingsActive ? 'brand.400' : 'ui.sidebarMuted'}
              fontSize="sm"
              fontWeight="500"
              cursor="pointer"
              border="none"
              transition="all 0.15s ease"
              _hover={{ bg: 'ui.sidebarHover', color: 'ui.sidebarText' }}
            >
              <Flex align="center">
                <Settings size={18} />
                <Text ml="3" mb="0">{t('nav.settings')}</Text>
              </Flex>
              {isSettingsMenuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Box>
          )}
        </Box>

        {/* Logout */}
        {isCollapsed ? (
          <Tooltip label={t('nav.logOut')} placement="right" hasArrow openDelay={200}>
            <Box
              as="button"
              display="flex"
              alignItems="center"
              justifyContent="center"
              w="100%"
              h="42px"
              mt="1"
              borderRadius="lg"
              bg="transparent"
              color="ui.sidebarMuted"
              cursor="pointer"
              border="none"
              transition="all 0.15s ease"
              _hover={{ bg: 'red.900', color: 'red.400' }}
              onClick={onLogout}
            >
              <LogOut size={22} />
            </Box>
          </Tooltip>
        ) : (
          <Box
            as="button"
            onClick={onLogout}
            display="flex"
            alignItems="center"
            w="100%"
            h="42px"
            px="3"
            mt="1"
            borderRadius="lg"
            bg="transparent"
            color="ui.sidebarMuted"
            fontSize="sm"
            fontWeight="500"
            cursor="pointer"
            border="none"
            transition="all 0.15s ease"
            _hover={{ bg: 'red.900', color: 'red.400' }}
          >
            <LogOut size={18} />
            <Text ml="3" mb="0">{t('nav.logOut')}</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Sidebar;
