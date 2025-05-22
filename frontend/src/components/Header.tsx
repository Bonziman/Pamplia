// src/components/Header.tsx
// --- REFACTORED WITH CHAKRA UI ---

import React from 'react';
import {
    Flex,
    Box,
    InputGroup,
    Input,
    InputRightElement,
    IconButton,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    MenuDivider,
    Avatar,
    Text,
    Icon as ChakraIcon, // Generic Icon component
    Button, // If the MenuButton should look more like a button
    useColorModeValue, // For light/dark mode awareness if needed later
} from '@chakra-ui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons'; // FontAwesome icons
import { SearchIcon, BellIcon, ChevronDownIcon } from '@chakra-ui/icons'; // Chakra's own icons
// Or from react-icons, e.g., import { FiSearch, FiBell, FiChevronDown } from 'react-icons/fi';

interface HeaderProps {
    userName: string;
    userRole?: string; // Assuming role might come from userProfile
    userEmail?: string; // Assuming email might come from userProfile
    onLogout: () => void;
    // Add any other props needed, e.g., onProfileClick, onSettingsClick
}

const Header: React.FC<HeaderProps> = ({ userName, userRole, userEmail, onLogout }) => {
    // Use colors from your theme.ts
    const topbarBg = useColorModeValue('ui.topbarBg', 'gray.700'); // Example for dark mode
    const inputBg = useColorModeValue('white', 'gray.600');
    const iconColor = useColorModeValue('gray.600', 'gray.300');
    const textColor = useColorModeValue('gray.700', 'gray.100');
    const userMenuButtonBg = useColorModeValue('transparent', 'transparent');
    const userMenuButtonHoverBg = useColorModeValue('blackAlpha.100', 'whiteAlpha.100'); // Using theme's Button variant 'ghostTopbar'

    return (
        <Flex
            as="header"
            align="center"
            justify="space-between"
            w="100%"
            px="6" // Padding horizontal
            py="3" // Padding vertical

            bg={'#10b6a4'}
            borderRadius='xl' // from theme.radii.md
            h="64px" // Fixed height for the header
            marginBottom="28px"
        >
            {/* Left Section: Search Bar */}
            <Box flex="1" maxWidth="400px"> {/* Limit search bar width */}
                <InputGroup size="md">
                    <Input
                        variant="topbarSearch" // Using your custom theme variant
                        placeholder="Search anything..."
                        borderRadius="md" // from theme.radii.md
                        // bg={inputBg} // variant="topbarSearch" handles this
                    />
                    <InputRightElement>
                        <SearchIcon color={iconColor} />
                        {/* Or: <Icon as={FiSearch} color={iconColor} /> */}
                    </InputRightElement>
                </InputGroup>
            </Box>

            {/* Right Section: Icons & User Menu */}
            <Flex align="center" gap="4"> {/* Gap between items */}
                <IconButton
                    aria-label="Notifications"
                    icon={<BellIcon w="5" h="5" />}
                    // icon={<Icon as={FiBell} boxSize="5" />}
                    variant="ghostTopbar" // Using your custom theme variant
                    isRound // Make it circular if desired
                    color={iconColor}
                    _hover={{ bg: userMenuButtonHoverBg }}
                />

                <Menu placement="bottom-end">
                    <MenuButton
                        as={Button} // Renders MenuButton as a Chakra Button
                        variant="ghost" // Standard ghost button, or make a custom one
                        bg={userMenuButtonBg}
                        _hover={{ bg: userMenuButtonHoverBg }}
                        _active={{ bg: userMenuButtonHoverBg }}
                        px="2" // Minimal padding for the button part
                        py="1"
                        borderRadius="md"
                        h="auto" // Adjust height to content
                    >
                        <Flex align="center">
                            <Avatar
                                size="sm"
                                name={userName}
                                // src="/defaults/icons8-male-user-94.png" // Use actual avatar URL if available
                                mr="3"
                            />
                            <Box textAlign="left" mr="3">
                                <Text fontWeight="medium" fontSize="sm" color='white'>
                                    {userName}
                                </Text>
                                {(userRole || userEmail) && (
                                    <Text fontSize="xs" color="gray.500">
                                        {userRole && userEmail ? `${userRole} | ${userEmail}` : userRole || userEmail}
                                    </Text>
                                )}
                            </Box>
                            <ChevronDownIcon color='white' />
                            {/* Or: <Icon as={FiChevronDown} color={iconColor} /> */}
                        </Flex>
                    </MenuButton>
                    <MenuList minWidth="200px" zIndex="dropdown"> {/* Ensure menu is on top */}
                        <MenuItem onClick={() => alert('Profile clicked')}>
                            Profile
                        </MenuItem>
                        <MenuItem onClick={() => alert('Settings clicked')}>
                            Account Settings
                        </MenuItem>
                        <MenuDivider />
                        <MenuItem onClick={onLogout} color="red.500" fontWeight="medium">
                        <ChakraIcon as={FontAwesomeIcon} icon={faSignOutAlt} boxSize="20px" color="ui.sidebarIcon"  />
                            Logout
                        </MenuItem>
                    </MenuList>
                </Menu>
            </Flex>
        </Flex>
    );
};

export default Header;
