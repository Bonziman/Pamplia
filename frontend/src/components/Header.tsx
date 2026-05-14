// src/components/Header.tsx
// Clean header with breadcrumbs, search pill, notifications, user menu

import React from 'react';
import {
  Flex,
  Box,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Avatar,
  Text,
  IconButton,
  HStack,
  Kbd,
  Icon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
} from '@chakra-ui/react';
import NotificationsPopover from './NotificationsPopover';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../i18n/languageContext';
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  Settings,
  Menu as MenuIcon,
  Search,
  LayoutDashboard,
} from 'lucide-react';

interface HeaderProps {
  userName: string;
  userRole?: string;
  userEmail?: string;
  onLogout: () => void;
  onMobileMenuToggle?: () => void;
  pageTitle?: string;
  onOpenCommandPalette?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  userName,
  userRole,
  onLogout,
  onMobileMenuToggle,
  pageTitle,
  onOpenCommandPalette,
}) => {
  const { t } = useLanguage();

  // Derive breadcrumb from pageTitle
  const dashboardLabel = t('nav.dashboard');
  const isSubPage = pageTitle && pageTitle !== dashboardLabel;

  return (
    <Flex
      as="header"
      align="center"
      justify="space-between"
      w="100%"
      px={{ base: 4, md: 6 }}
      h="64px"
      bg="ui.headerBg"
      borderBottom="1px solid"
      borderColor="ui.border"
      position="sticky"
      top="0"
      zIndex="banner"
      backdropFilter="saturate(180%) blur(20px)"
      backgroundColor="rgba(255, 255, 255, 0.85)"
      flexShrink={0}
    >
      {/* Left: Mobile menu toggle + Breadcrumbs */}
      <Flex align="center" gap="3">
        {/* Hamburger for tablet */}
        <IconButton
          aria-label="Open menu"
          icon={<MenuIcon size={20} />}
          variant="ghost"
          color="gray.600"
          display={{ base: 'none', md: 'flex', lg: 'none' }}
          onClick={onMobileMenuToggle}
          size="sm"
        />

        {/* Breadcrumbs */}
        <Breadcrumb
          spacing="2"
          separator={<Icon as={ChevronRight} boxSize="3.5" color="gray.400" />}
          display={{ base: 'none', md: 'flex' }}
        >
          <BreadcrumbItem>
            <BreadcrumbLink
              display="flex"
              alignItems="center"
              gap="1.5"
              color={isSubPage ? 'gray.400' : 'gray.800'}
              fontWeight={isSubPage ? '400' : '600'}
              fontSize="sm"
              _hover={{ color: 'brand.500', textDecoration: 'none' }}
              transition="color 0.15s ease"
            >
              <Icon as={LayoutDashboard} boxSize="3.5" />
              {dashboardLabel}
            </BreadcrumbLink>
          </BreadcrumbItem>
          {isSubPage && (
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink
                color="gray.800"
                fontWeight="600"
                fontSize="sm"
                _hover={{ textDecoration: 'none' }}
                cursor="default"
              >
                {pageTitle}
              </BreadcrumbLink>
            </BreadcrumbItem>
          )}
        </Breadcrumb>
      </Flex>

      {/* Right: Search + Notification + User menu */}
      <HStack spacing="2">
        {/* Search pill — opens ⌘K */}
        <Flex
          as="button"
          onClick={onOpenCommandPalette}
          aria-label="Open search (⌘K)"
          align="center"
          gap="2"
          px="3"
          h="34px"
          bg="gray.100"
          borderRadius="lg"
          cursor="pointer"
          border="none"
          transition="all 0.15s ease"
          _hover={{ bg: 'gray.200' }}
          _focusVisible={{ boxShadow: '0 0 0 2px #0D9488' }}
          display={{ base: 'none', md: 'flex' }}
        >
          <Search size={14} color="var(--chakra-colors-gray-400)" />
          <Text fontSize="xs" color="gray.400" mb="0" fontWeight="500">
            {t('header.search')}
          </Text>
          <Flex gap="0.5" ml="1">
            <Kbd fontSize="2xs" bg="white" borderColor="gray.200" color="gray.400" borderRadius="md" px={1} minW="auto" lineHeight="1.4">⌘</Kbd>
            <Kbd fontSize="2xs" bg="white" borderColor="gray.200" color="gray.400" borderRadius="md" px={1} minW="auto" lineHeight="1.4">K</Kbd>
          </Flex>
        </Flex>
        <Box display="block">
          <LanguageSwitcher size="sm" minimal />
        </Box>
        {/* Notifications */}
        <NotificationsPopover />

        {/* User menu */}
        <Menu placement="bottom-end" gutter={8}>
          <MenuButton
            as={Box}
            cursor="pointer"
            borderRadius="lg"
            px="2"
            py="1.5"
            _hover={{ bg: 'gray.50' }}
            _focusVisible={{ boxShadow: '0 0 0 2px #0D9488' }}
            transition="background 0.15s ease"
            aria-label="User menu"
          >
            <Flex align="center" gap="2.5">
              <Avatar
                size="sm"
                name={userName}
                bg="brand.500"
                color="white"
                fontSize="xs"
                fontWeight="600"
              />
              <Box display={{ base: 'none', md: 'block' }} textAlign="left">
                <Text fontSize="sm" fontWeight="600" color="gray.800" lineHeight="1.2" mb="0">
                  {userName}
                </Text>
                {userRole && (
                  <Text fontSize="2xs" color="gray.500" lineHeight="1.2" textTransform="capitalize" mb="0">
                    {userRole.replace('_', ' ')}
                  </Text>
                )}
              </Box>
              <ChevronDown size={14} color="var(--chakra-colors-gray-400)" />
            </Flex>
          </MenuButton>

          <MenuList
            minW="200px"
            py="1.5"
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.200"
            shadow="lg"
            bg="white"
          >
            <MenuItem
              fontSize="sm"
              px="3.5"
              py="2"
              borderRadius="md"
              mx="1.5"
              _hover={{ bg: 'gray.50' }}
              icon={<User size={15} />}
            >
              {t('header.profile')}
            </MenuItem>
            <MenuItem
              fontSize="sm"
              px="3.5"
              py="2"
              borderRadius="md"
              mx="1.5"
              _hover={{ bg: 'gray.50' }}
              icon={<Settings size={15} />}
            >
              {t('header.accountSettings')}
            </MenuItem>
            <MenuDivider my="1.5" />
            <MenuItem
              fontSize="sm"
              px="3.5"
              py="2"
              borderRadius="md"
              mx="1.5"
              color="red.500"
              fontWeight="500"
              _hover={{ bg: 'red.50' }}
              icon={<LogOut size={15} />}
              onClick={onLogout}
            >
              {t('nav.logOut')}
            </MenuItem>
          </MenuList>
        </Menu>
      </HStack>
    </Flex>
  );
};

export default Header;
