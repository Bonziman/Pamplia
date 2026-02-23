// src/components/CommandPalette.tsx
// ⌘K / Ctrl+K spotlight search — Apple-inspired command palette

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  Input,
  InputGroup,
  InputLeftElement,
  Box,
  Flex,
  Text,
  Kbd,
} from '@chakra-ui/react';
import {
  Search,
  LayoutDashboard,
  Calendar,
  Users,
  UserCog,
  Briefcase,
  Tags,
  Building2,
  FileText,
  Palette,
  Settings,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  section: string;
  icon: LucideIcon;
  keywords?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  userRole?: string;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onLogout,
  userRole,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = userRole === 'super_admin';
  const isAdmin = userRole === 'admin';

  // Build navigation items based on role
  const commands: CommandItem[] = useMemo(() => {
    const nav: CommandItem[] = [];

    nav.push({
      id: 'dashboard',
      label: 'Dashboard',
      section: 'Navigation',
      icon: LayoutDashboard,
      keywords: 'home overview stats',
      action: () => onNavigate('overview'),
    });

    if (!isSuperAdmin) {
      nav.push({
        id: 'calendar',
        label: 'Calendar',
        section: 'Navigation',
        icon: Calendar,
        keywords: 'appointments schedule booking',
        action: () => onNavigate('calendar'),
      });
    }

    if (!isSuperAdmin) {
      nav.push({
        id: 'clients',
        label: 'Clients',
        section: 'Navigation',
        icon: Users,
        keywords: 'customers contacts people',
        action: () => onNavigate('clients'),
      });
    }

    if (isAdmin || isSuperAdmin) {
      nav.push({
        id: 'users',
        label: isSuperAdmin ? 'Users' : 'Staff',
        section: 'Navigation',
        icon: UserCog,
        keywords: 'staff team members employees manage users',
        action: () => onNavigate('users'),
      });
    }

    if (!isSuperAdmin) {
      nav.push({
        id: 'services',
        label: 'Services',
        section: 'Navigation',
        icon: Briefcase,
        keywords: 'offerings products pricing',
        action: () => onNavigate('services'),
      });
    }

    if (isSuperAdmin) {
      nav.push({
        id: 'tenants',
        label: 'Tenants',
        section: 'Navigation',
        icon: Building2,
        keywords: 'organizations companies accounts',
        action: () => onNavigate('tenants'),
      });
    }

    // Settings
    if (!isSuperAdmin) {
      nav.push({
        id: 'tags',
        label: 'Manage Tags',
        section: 'Settings',
        icon: Tags,
        keywords: 'labels categories organize',
        action: () => onNavigate('settings-tags'),
      });
    }

    if (isAdmin || isSuperAdmin) {
      if (!isSuperAdmin) {
        nav.push({
          id: 'business',
          label: 'Business Settings',
          section: 'Settings',
          icon: Building2,
          keywords: 'company hours configuration',
          action: () => onNavigate('settings-business'),
        });

        nav.push({
          id: 'templates',
          label: 'Templates',
          section: 'Settings',
          icon: FileText,
          keywords: 'messages email sms communication',
          action: () => onNavigate('settings-templates'),
        });
      }
    }

    // Actions
    nav.push({
      id: 'logout',
      label: 'Log out',
      section: 'Actions',
      icon: LogOut,
      keywords: 'sign out exit',
      action: onLogout,
    });

    return nav;
  }, [isSuperAdmin, isAdmin, onNavigate, onLogout]);

  // Filter commands by query
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.section.toLowerCase().includes(q) ||
        (cmd.keywords && cmd.keywords.toLowerCase().includes(q))
    );
  }, [commands, query]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keep active index in bounds
  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, activeIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const active = listRef.current.querySelector('[data-active="true"]');
      active?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      onClose();
      // Small delay so modal closes before navigation
      requestAnimationFrame(() => item.action());
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[activeIndex]) {
            handleSelect(filtered[activeIndex]);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    },
    [filtered, activeIndex, handleSelect, onClose]
  );

  // Group filtered items by section
  const sections = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    filtered.forEach((item) => {
      if (!map.has(item.section)) map.set(item.section, []);
      map.get(item.section)!.push(item);
    });
    return map;
  }, [filtered]);

  // Flat index counter for keyboard navigation
  let flatIndex = -1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      motionPreset="slideInBottom"
    >
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(8px)" />
      <ModalContent
        mt="15vh"
        mb="auto"
        mx={4}
        bg="white"
        borderRadius="xl"
        overflow="hidden"
        shadow="2xl"
        border="1px solid"
        borderColor="gray.200"
        maxH="420px"
      >
        {/* Search input */}
        <Box borderBottom="1px solid" borderColor="gray.100" px={1}>
          <InputGroup size="lg">
            <InputLeftElement pointerEvents="none" h="56px">
              <Search size={18} color="var(--chakra-colors-gray-400)" />
            </InputLeftElement>
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search pages and actions..."
              border="none"
              h="56px"
              fontSize="sm"
              _focus={{ boxShadow: 'none' }}
              _placeholder={{ color: 'gray.400' }}
              aria-label="Search pages and actions"
            />
            <Flex align="center" pr={3}>
              <Kbd
                fontSize="2xs"
                bg="gray.100"
                borderColor="gray.200"
                color="gray.500"
                borderRadius="md"
                px={1.5}
                py={0.5}
              >
                ESC
              </Kbd>
            </Flex>
          </InputGroup>
        </Box>

        {/* Results */}
        <Box
          ref={listRef}
          overflowY="auto"
          maxH="340px"
          py={2}
          px={2}
          role="listbox"
          aria-label="Search results"
        >
          {filtered.length === 0 ? (
            <Flex align="center" justify="center" py={8}>
              <Text fontSize="sm" color="gray.400">
                No results for "{query}"
              </Text>
            </Flex>
          ) : (
            Array.from(sections.entries()).map(([section, items]) => (
              <Box key={section} mb={1}>
                <Text
                  fontSize="2xs"
                  fontWeight="600"
                  color="gray.400"
                  textTransform="uppercase"
                  letterSpacing="0.05em"
                  px={2}
                  py={1.5}
                  mb={0}
                >
                  {section}
                </Text>
                {items.map((item) => {
                  flatIndex++;
                  const isActive = flatIndex === activeIndex;
                  const currentIndex = flatIndex;
                  const IconComp = item.icon;
                  return (
                    <Flex
                      key={item.id}
                      data-active={isActive}
                      role="option"
                      aria-selected={isActive}
                      align="center"
                      gap={3}
                      px={3}
                      py={2}
                      borderRadius="lg"
                      cursor="pointer"
                      bg={isActive ? 'gray.100' : 'transparent'}
                      color={isActive ? 'gray.900' : 'gray.600'}
                      transition="background 0.1s ease"
                      _hover={{ bg: 'gray.50' }}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                    >
                      <Flex
                        w="32px"
                        h="32px"
                        align="center"
                        justify="center"
                        borderRadius="md"
                        bg={isActive ? 'brand.50' : 'gray.50'}
                        color={isActive ? 'brand.600' : 'gray.500'}
                        flexShrink={0}
                      >
                        <IconComp size={16} />
                      </Flex>
                      <Text fontSize="sm" fontWeight="500" mb={0}>
                        {item.label}
                      </Text>
                      {isActive && (
                        <Kbd
                          ml="auto"
                          fontSize="2xs"
                          bg="gray.200"
                          borderColor="gray.300"
                          color="gray.500"
                          borderRadius="md"
                          px={1.5}
                        >
                          ↵
                        </Kbd>
                      )}
                    </Flex>
                  );
                })}
              </Box>
            ))
          )}
        </Box>

        {/* Footer hint */}
        <Flex
          borderTop="1px solid"
          borderColor="gray.100"
          px={4}
          py={2}
          gap={4}
          align="center"
        >
          <Flex align="center" gap={1.5}>
            <Kbd fontSize="2xs" bg="gray.50" borderColor="gray.200" borderRadius="md" px={1}>↑</Kbd>
            <Kbd fontSize="2xs" bg="gray.50" borderColor="gray.200" borderRadius="md" px={1}>↓</Kbd>
            <Text fontSize="2xs" color="gray.400" mb={0}>navigate</Text>
          </Flex>
          <Flex align="center" gap={1.5}>
            <Kbd fontSize="2xs" bg="gray.50" borderColor="gray.200" borderRadius="md" px={1}>↵</Kbd>
            <Text fontSize="2xs" color="gray.400" mb={0}>select</Text>
          </Flex>
        </Flex>
      </ModalContent>
    </Modal>
  );
};

export default CommandPalette;
