// src/components/MobileBottomNav.tsx
// iOS-style bottom tab bar for mobile — shown below lg breakpoint

import React, { useState } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  Slide,
  useDisclosure,
} from '@chakra-ui/react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Briefcase,
  MoreHorizontal,
  UserCog,
  Tags,
  Building2,
  FileText,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLanguage } from '../i18n/languageContext';

// ─── Tab Item ────────────────────────────────────────────────────────────────
interface TabItemProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const TabItem: React.FC<TabItemProps> = ({ icon: Icon, label, isActive, onClick }) => (
  <Box
    as="button"
    onClick={onClick}
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    flex="1"
    py="1.5"
    bg="transparent"
    border="none"
    cursor="pointer"
    transition="all 0.15s ease"
    color={isActive ? 'brand.500' : 'gray.400'}
    _active={{ transform: 'scale(0.92)' }}
  >
    <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
    <Text fontSize="2xs" fontWeight={isActive ? '600' : '500'} mt="0.5" mb="0" lineHeight="1">
      {label}
    </Text>
  </Box>
);

// ─── More Menu Item ──────────────────────────────────────────────────────────
interface MoreMenuItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  isDanger?: boolean;
}

const MoreMenuItem: React.FC<MoreMenuItemProps> = ({ icon: Icon, label, onClick, isActive, isDanger }) => (
  <Box
    as="button"
    onClick={onClick}
    display="flex"
    alignItems="center"
    w="100%"
    h="48px"
    px="5"
    bg="transparent"
    border="none"
    cursor="pointer"
    borderRadius="xl"
    color={isDanger ? 'red.500' : isActive ? 'brand.500' : 'gray.700'}
    fontWeight={isActive ? '600' : '500'}
    fontSize="sm"
    transition="all 0.15s ease"
    _hover={{ bg: isDanger ? 'red.50' : 'gray.50' }}
    _active={{ bg: isDanger ? 'red.100' : 'gray.100' }}
  >
    <Icon size={18} style={{ marginRight: '12px', flexShrink: 0 }} />
    {label}
  </Box>
);

// ─── Props ───────────────────────────────────────────────────────────────────
interface MobileBottomNavProps {
  activeView: string;
  onNavigate: (path: string) => void;
  userRole: string | undefined;
  onLogout: () => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  onNavigate,
  userRole,
  onLogout,
}) => {
  const { t } = useLanguage();
  const { isOpen: isMoreOpen, onToggle: toggleMore, onClose: closeMore } = useDisclosure();

  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin';
  const canManageClients = isAdmin || userRole === 'staff';

  const handleNavigate = (path: string) => {
    closeMore();
    onNavigate(path);
  };

  const handleLogout = () => {
    closeMore();
    onLogout();
  };

  return (
    <>
      {/* Backdrop for "More" menu */}
      {isMoreOpen && (
        <Box
          position="fixed"
          inset="0"
          bg="blackAlpha.400"
          zIndex="overlay"
          onClick={closeMore}
          display={{ base: 'block', lg: 'none' }}
        />
      )}

      {/* "More" slide-up panel */}
      <Slide direction="bottom" in={isMoreOpen} style={{ zIndex: 1500 }}>
        <Box
          display={{ base: 'block', lg: 'none' }}
          bg="white"
          borderTopRadius="2xl"
          pb="env(safe-area-inset-bottom, 16px)"
          px="3"
          pt="3"
          maxH="65vh"
          overflowY="auto"
          shadow="dark-lg"
        >
          {/* Handle bar */}
          <Flex justify="center" mb="2">
            <Box w="36px" h="4px" borderRadius="full" bg="gray.300" />
          </Flex>

          {/* Close */}
          <Flex justify="space-between" align="center" px="2" mb="1">
            <Text fontSize="md" fontWeight="700" color="gray.900" mb="0">
              {t('nav.more')}
            </Text>
            <Box
              as="button"
              onClick={closeMore}
              bg="gray.100"
              border="none"
              borderRadius="full"
              w="28px"
              h="28px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              _hover={{ bg: 'gray.200' }}
            >
              <X size={14} />
            </Box>
          </Flex>

          <VStack spacing="0.5" align="stretch" py="1">
            {/* Staff / Users */}
            {(isSuperAdmin || isAdmin) && (
              <MoreMenuItem
                icon={UserCog}
                label={isSuperAdmin ? t('nav.users') : t('nav.staff')}
                onClick={() => handleNavigate('users')}
                isActive={activeView === 'users'}
              />
            )}

            {isSuperAdmin && (
              <MoreMenuItem
                icon={Building2}
                label={t('nav.tenants')}
                onClick={() => handleNavigate('tenants')}
                isActive={activeView === 'tenants'}
              />
            )}

            {!isSuperAdmin && isAdmin && (
              <>
                <Box h="1px" bg="gray.100" my="1.5" mx="3" />
                <Text fontSize="2xs" fontWeight="600" color="gray.400" px="5" textTransform="uppercase" letterSpacing="wider" mb="0">
                  {t('nav.settings')}
                </Text>
                <MoreMenuItem
                  icon={Tags}
                  label={t('nav.manageTags')}
                  onClick={() => handleNavigate('settings-tags')}
                  isActive={activeView === 'settings-tags'}
                />
                <MoreMenuItem
                  icon={Settings}
                  label={t('nav.businessSettings')}
                  onClick={() => handleNavigate('settings-business')}
                  isActive={activeView === 'settings-business'}
                />
                <MoreMenuItem
                  icon={FileText}
                  label={t('nav.templates')}
                  onClick={() => handleNavigate('settings-templates')}
                  isActive={activeView === 'settings-templates'}
                />
              </>
            )}

            <Box h="1px" bg="gray.100" my="1.5" mx="3" />

            <MoreMenuItem
              icon={LogOut}
              label={t('nav.logOut')}
              onClick={handleLogout}
              isDanger
            />
          </VStack>
        </Box>
      </Slide>

      {/* Bottom Tab Bar */}
      <Flex
        as="nav"
        position="fixed"
        bottom="0"
        left="0"
        right="0"
        bg="white"
        borderTop="1px solid"
        borderColor="gray.200"
        h="calc(56px + env(safe-area-inset-bottom, 0px))"
        pb="env(safe-area-inset-bottom, 0px)"
        zIndex="sticky"
        display={{ base: 'flex', lg: 'none' }}
        align="stretch"
        backdropFilter="saturate(180%) blur(20px)"
        backgroundColor="rgba(255, 255, 255, 0.92)"
      >
        <TabItem
          icon={LayoutDashboard}
          label={t('nav.home')}
          isActive={activeView === 'overview' || activeView === 'dashboard'}
          onClick={() => handleNavigate('/dashboard')}
        />

        {!isSuperAdmin && (
          <TabItem
            icon={Calendar}
            label={t('nav.calendar')}
            isActive={activeView === 'calendar'}
            onClick={() => handleNavigate('calendar')}
          />
        )}

        {!isSuperAdmin && canManageClients && (
          <TabItem
            icon={Users}
            label={t('nav.clients')}
            isActive={activeView === 'clients'}
            onClick={() => handleNavigate('clients')}
          />
        )}

        {!isSuperAdmin && isAdmin && (
          <TabItem
            icon={Briefcase}
            label={t('nav.services')}
            isActive={activeView === 'services'}
            onClick={() => handleNavigate('services')}
          />
        )}

        <TabItem
          icon={MoreHorizontal}
          label={t('nav.more')}
          isActive={isMoreOpen}
          onClick={toggleMore}
        />
      </Flex>
    </>
  );
};

export default MobileBottomNav;
