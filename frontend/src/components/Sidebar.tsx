// src/components/Sidebar.tsx
// --- REFACTORED WITH CHAKRA UI ---

import React, { useRef, useEffect } from 'react';
// Removed Link from react-router-dom as we are using onNavigate prop with Chakra Buttons
import {
    Box,
    Flex,
    VStack,
    Button,
    Text,
    IconButton,
    Image,
    Icon as ChakraIcon, // To wrap FontAwesomeIcon or use Chakra icons
    Collapse, // For the settings menu
    useTheme, // To access theme values directly if needed
    useColorModeValue,
    Divider,
} from '@chakra-ui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarDays, faUsers, faTags, faArrowLeft, faArrowRight,
    faAddressBook, faCog, faSignOutAlt, faPalette, faThLarge, faFileInvoice,
    faChevronUp, faChevronDown
} from '@fortawesome/free-solid-svg-icons'; // Your existing icons

// Helper component for Nav items to reduce repetition
interface NavItemProps {
    icon: any; // FontAwesome icon definition
    label: string;
    isActive: boolean;
    isCollapsed: boolean;
    onClick: () => void;
    title?: string;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, isCollapsed, onClick, title }) => {
    // Directly use theme values for clarity
    const activeColor = useColorModeValue('brand.500', 'brand.300'); 
    const inactiveTextColor = useColorModeValue('ui.sidebarText', 'ui.sidebarText'); // Will resolve to #FFFFFF
    const inactiveIconColor = useColorModeValue('ui.sidebarIcon', 'ui.sidebarText'); // Will resolve to brand.500

    return (
        <Button
            onClick={onClick}
            variant="ghost" 
            justifyContent="flex-start"
            alignItems="center"
            w="100%"
            h="48px"
            px={isCollapsed ? "0" : "4"} 
            bg={isActive ? 'ui.sidebarActiveBg' : 'transparent'}
            _hover={{
                bg: 'ui.sidebarActiveBg', 
                '.navitem-icon': { color: activeColor }, 
                '.navitem-text': { color: activeColor }, 
            }}
            title={isCollapsed ? title || label : undefined}
            aria-current={isActive ? 'page' : undefined}
            display="flex"
        >
            <Flex
                align="center"
                justifyContent={isCollapsed ? "center" : "flex-start"}
                w="100%"
            >
                <ChakraIcon
                    className="navitem-icon" 
                    as={FontAwesomeIcon}
                    icon={icon}
                    boxSize="20px"
                    color={isActive ? activeColor : "white"} 
                    mr={isCollapsed ? "0" : "3"}
                    transition="margin 0.2s ease-in-out, color 0.2s ease-in-out"
                />
                {!isCollapsed && (
                    <Text
                        marginBottom="0px"
                        className="navitem-text" 
                        fontSize="md"
                        fontWeight="medium"
                        color={isActive ? activeColor : inactiveTextColor} // This should make it white
                        transition="color 0.2s ease-in-out"
                    >
                        {label}
                    </Text>
                )}
            </Flex>
        </Button>
    );
};


interface SidebarProps {
    isCollapsed: boolean;
    toggleSidebar: () => void;
    userRole: string | undefined;
    activeView: string;
    onNavigate: (path: string) => void;
    // userName: string; // userName from Figma seems to be in Header, not sidebar bottom
    // userAvatarUrl?: string | null; // Ditto
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
    onLogout
}) => {
    const settingsMenuRef = useRef<HTMLDivElement>(null); // For click outside settings menu

    // Permissions (can be memoized if complex)
    const canViewUsers = userRole === "super_admin" || userRole === "admin";
    const canManageServices = userRole === "super_admin" || userRole === "admin";
    const canManageClients = userRole === "super_admin" || userRole === "admin" || userRole === "staff";
    const canManageTagDefinitions = userRole === "super_admin" || userRole === "admin"; // Typically admin+
    const canAccessTenantSettings = userRole === "super_admin" || userRole === "admin";

    // UseEffect for settings menu click outside (similar to your logic)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
                if (isSettingsMenuOpen) {
                    toggleSettingsMenu();
                }
            }
        };
        if (isSettingsMenuOpen && !isCollapsed) { // Only enable when menu is open and sidebar not collapsed
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSettingsMenuOpen, toggleSettingsMenu, isCollapsed]);

    const sidebarWidth = isCollapsed ? "80px" : "260px";
    const sidebarBg = useColorModeValue('ui.sidebarBg', 'gray.800');

    return (
        <Box
            borderRadius={'0px 18px 18px 0'}
            as="aside"
            bg={sidebarBg}
            color="gray.100"
            w={sidebarWidth}
            minH="100vh" // Full height
            transition="width 0.2s ease-in-out"
            marginRight="28px"
            position="fixed" // Or "sticky" if parent layout supports it
            top="0"
            left="0"
            zIndex="sticky" // Ensure it's above content but below modals typically
            overflowY="auto" // Allow scrolling if content exceeds height
            boxShadow="md" // Subtle shadow
            css={{ // For custom scrollbar styling (optional)
                '&::-webkit-scrollbar': { width: '6px' },
                '&::-webkit-scrollbar-thumb': { bg: 'gray.600', borderRadius: '0px 18px 18px 0' },
            }}
        >
            <VStack spacing={0} align="stretch" h="100%"> {/* Main vertical stack */}
                {/* Top Section: Logo & Toggle */}
                <Flex
                    paddingInline="20px"
                    align="center"
                    justify={isCollapsed ? "center" : "space-between"}
                    h="92px" // Match header height
                    
                    borderBottomWidth="1px"
                    borderColor="gray.700" // Darker border for dark bg
                >
                    {!isCollapsed && (
                        <Image src="/logo_light.png" alt="Pamplia Logo" h="auto" w="150px" />
                        
                    )}
                    <IconButton
                        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        icon={<ChakraIcon as={FontAwesomeIcon} icon={isCollapsed ? faArrowRight : faArrowLeft} />}
                        onClick={toggleSidebar}
                        variant="ghost"
                        color="ui.sidebarText"
                        _hover={{ bg: 'ui.sidebarActiveBg', color: 'brand.500' }}
                        size="md"
                        ml={isCollapsed ? 0 : "auto"} // Push to right when expanded
                    />
                    
                </Flex>

                {/* Navigation Section */}
                <VStack as="nav" spacing="1" p={isCollapsed ? "2" : "4"} flex="1" overflowY="auto" color={"ui.sidebarText"}>
                    {/* Nav items here, use NavItem component */}
                    <NavItem icon={faThLarge} label="Dashboard" isActive={activeView === 'overview' || activeView === 'dashboard'} isCollapsed={isCollapsed} onClick={() => onNavigate('/dashboard')} />
                    <NavItem icon={faCalendarDays} label="Calendar" isActive={activeView === 'calendar'} isCollapsed={isCollapsed} onClick={() => onNavigate('calendar')} />
                    {canManageClients && <NavItem icon={faAddressBook} label="Clients" isActive={activeView === 'clients'} isCollapsed={isCollapsed} onClick={() => onNavigate('clients')} />}
                    {/* For "Staff", use the Users icon or a dedicated staff icon */}
                    {canViewUsers && <NavItem icon={faUsers} label="Staff" isActive={activeView === 'users' || activeView === 'staff'} isCollapsed={isCollapsed} onClick={() => onNavigate('users')} title="Staff Management"/>}
                    {canManageServices && <NavItem icon={faTags} label="Services" isActive={activeView === 'services'} isCollapsed={isCollapsed} onClick={() => onNavigate('services')} />}
                    {/* Remove duplicate Dashboard from screenshot */}
                </VStack>
                

                {/* Bottom Section: Settings & Logout */}
                <Box mt="auto" p={isCollapsed ? "2" : "4"} borderTopWidth="1px" borderColor="gray.700" bottom="0px" position="absolute" width="100%">
                    <Box ref={settingsMenuRef}> {/* Ref for click-outside */}
                        <Collapse in={isSettingsMenuOpen && !isCollapsed} animateOpacity>
                            <VStack spacing="1" py="2" align="stretch">
                                {canManageTagDefinitions && (
                                    <Button variant="ghost" color="ui.sidebarText" justifyContent="flex-start" w="100%" onClick={() => onNavigate('settings-tags')} leftIcon={<ChakraIcon as={FontAwesomeIcon} icon={faTags} color="ui.sidebarIcon" />}>
                                        Manage Tags
                                    </Button>
                                )}
                                {canAccessTenantSettings && (
                                    <Button variant="ghost" color="ui.sidebarText" justifyContent="flex-start" w="100%" onClick={() => onNavigate('settings-business')} leftIcon={<ChakraIcon as={FontAwesomeIcon} icon={faCog} color="ui.sidebarIcon" />}>
                                        Business Settings
                                    </Button>
                                )}
                                 {canAccessTenantSettings && (
                                    <Button variant="ghost" color="ui.sidebarText" justifyContent="flex-start" w="100%" onClick={() => onNavigate('settings-templates')} leftIcon={<ChakraIcon as={FontAwesomeIcon} icon={faFileInvoice} color="ui.sidebarIcon" />}>
                                        Templates
                                    </Button>
                                )}
                                <Button variant="ghost" color="ui.sidebarText" justifyContent="flex-start" w="100%" onClick={() => alert("Appearance settings clicked")} leftIcon={<ChakraIcon as={FontAwesomeIcon} icon={faPalette} color="ui.sidebarIcon" />}>
                                    Appearance
                                </Button>
                                {/* Add other settings items here */}
                            </VStack>
                        </Collapse>

                        <Button
                            onClick={toggleSettingsMenu}
                            isDisabled={isCollapsed}
                            variant="ghost"
                            w="100%"
                            justifyContent={isCollapsed ? "center" : "flex-start"}
                            alignItems="center"
                            color="ui.sidebarText"
                            _hover={{ bg: 'ui.sidebarActiveBg', color: 'brand.500' }}
                            h="48px"
                            mt="1" // Margin top if settings menu is above
                        >
                            <Flex align="center" w="100%" justify={isCollapsed ? "center" : "space-between"}>
                                <Flex align="center">
                                    <ChakraIcon as={FontAwesomeIcon} icon={faCog} boxSize="20px" color="ui.sidebarIcon" mr={isCollapsed ? "0" : "3"} />
                                    {!isCollapsed && <Text fontSize="md" fontWeight="medium" color="ui.sidebarText">Settings</Text>}
                                </Flex>
                                {!isCollapsed && <ChakraIcon as={FontAwesomeIcon} icon={isSettingsMenuOpen ? faChevronUp : faChevronDown} />}
                            </Flex>
                        </Button>
                    </Box>

                    <Button
                        onClick={onLogout}
                        variant="ghost"
                        w="100%"
                        justifyContent={isCollapsed ? "center" : "flex-start"}
                        alignItems="center"
                        color="ui.sidebarText"
                        _hover={{ bg: 'ui.sidebarActiveBg', color: 'brand.500' }} // Or a different color for logout hover
                        h="48px"
                        mt="1"
                    >
                        <Flex align="center">
                            <ChakraIcon as={FontAwesomeIcon} icon={faSignOutAlt} boxSize="20px" color="ui.sidebarIcon" mr={isCollapsed ? "0" : "3"} />
                            {!isCollapsed && <Text fontSize="md" fontWeight="medium" color="ui.sidebarText">Log out</Text>}
                        </Flex>
                    </Button>
                </Box>
                
            </VStack>
        </Box>
    );
};

export default Sidebar;
