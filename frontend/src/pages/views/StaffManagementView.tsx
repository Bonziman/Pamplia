// src/pages/views/StaffManagementView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Heading, Tabs, TabList, TabPanels, Tab, TabPanel, Button as ChakraButton,
    Table, Thead, Tbody, Tr, Th, Td, TableContainer, IconButton, Tag as ChakraTag,
    Flex, useDisclosure, Text, HStack, Center,
    Menu, MenuButton, MenuList, MenuItem,
    Select,
} from '@chakra-ui/react';
import { Plus, Pencil, Mail, X, UserX, UserCheck, MoreVertical } from 'lucide-react';

import { useAuth } from '../../auth/authContext';
import { fetchUsers, FetchUsersParams } from '../../api/userApi';
import { UserOut } from '../../types/User';

import {
    listInvitations, resendStaffInvitation, cancelStaffInvitation, updateStaffStatus, ListInvitationsParams
} from '../../api/staffApi';
import { InvitationOut, InvitationStatus } from '../../types/Invitation';

import RightDrawerModal from '../../components/modals/RightDrawerModal';
import ConfirmationModal from '../../components/modals/ConfirmationModal';
import InviteStaffForm from '../../components/staff/InviteStaffForm';
import EditStaffForm from '../../components/staff/EditStaffForm';
import { useBrandedToast } from '../../hooks/useBrandedToast';
import { useLanguage } from '../../i18n/languageContext';

const ITEMS_PER_PAGE = 10;

const StaffManagementView: React.FC = () => {
    const { language } = useLanguage();
    const isFr = language === 'fr';
    const tx = (en: string, fr: string) => (isFr ? fr : en);

    const { userProfile } = useAuth();
    const toast = useBrandedToast();

    const [staffMembers, setStaffMembers] = useState<UserOut[]>([]);
    const [isLoadingStaff, setIsLoadingStaff] = useState<boolean>(true);
    const [staffTotal, setStaffTotal] = useState(0);
    const [staffCurrentPage, setStaffCurrentPage] = useState(1);
    const [staffError, setStaffError] = useState<string | null>(null);

    const [invitations, setInvitations] = useState<InvitationOut[]>([]);
    const [isLoadingInvitations, setIsLoadingInvitations] = useState<boolean>(true);
    const [invitationsTotal, setInvitationsTotal] = useState(0);
    const [invitationsCurrentPage, setInvitationsCurrentPage] = useState(1);
    const [invitationsError, setInvitationsError] = useState<string | null>(null);
    const [invitationStatusFilter, setInvitationStatusFilter] = useState<InvitationStatus | undefined>(undefined);

    const { isOpen: isInviteDrawerOpen, onOpen: onOpenInviteDrawer, onClose: onCloseInviteDrawer } = useDisclosure();
    const { isOpen: isEditDrawerOpen, onOpen: onOpenEditDrawer, onClose: onCloseEditDrawer } = useDisclosure();
    const { isOpen: isConfirmModalOpen, onOpen: onOpenConfirmModal, onClose: onCloseConfirmModal } = useDisclosure();

    const [selectedStaffForEdit, setSelectedStaffForEdit] = useState<UserOut | null>(null);
    const [confirmActionInfo, setConfirmActionInfo] = useState<{ // Renamed for clarity
        action: () => Promise<void>;
        title: string;
        body: string;
        confirmText: string;
        colorScheme: string;
    } | null>(null);

    const canManageStaff = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

    const loadStaffMembers = useCallback(async (page: number) => {
        if (!canManageStaff) {
            setIsLoadingStaff(false);
            setStaffMembers([]); // Ensure it's an empty array
            return;
        }
        setIsLoadingStaff(true);
        setStaffError(null);
        try {
            const params: FetchUsersParams = { // Use the imported type
                page,
                limit: ITEMS_PER_PAGE,
                role: 'staff', // Fetch only staff role initially
                // is_active: true, // Optionally fetch only active by default
                // If super_admin, they might need a tenant_id_filter from a UI element
                // tenant_id_filter: userProfile?.role === 'super_admin' ? selectedTenantForSuperAdmin : undefined
            };
            const response = await fetchUsers(params);
            if (response && Array.isArray(response.items)) {
                setStaffMembers(response.items);
                setStaffTotal(response.total);
                setStaffCurrentPage(response.page);
            } else {
                console.error("Staff API response.items is not an array or response is undefined:", response);
                setStaffMembers([]); // Default to empty array
                setStaffTotal(0);
                setStaffError("Received unexpected data for staff members.");
            }
        } catch (err: any) {
            setStaffError(err.response?.data?.detail || "Failed to load staff members.");
            setStaffMembers([]); // Clear data on error
            setStaffTotal(0);
        } finally {
            setIsLoadingStaff(false);
        }
    }, [canManageStaff]); // canManageStaff already derives from userProfile.role


    const loadInvitations = useCallback(async (page: number, status?: InvitationStatus) => {
        if (!canManageStaff) {
            setIsLoadingInvitations(false);
            setInvitations([]); // Ensure it's an empty array
            return;
        }
        setIsLoadingInvitations(true);
        setInvitationsError(null);
        try {
            const params: ListInvitationsParams = { page, limit: ITEMS_PER_PAGE };
            if (status) {
                params.status = status;
            }
            const response = await listInvitations(params);
             if (response && Array.isArray(response.items)) {
                setInvitations(response.items);
                setInvitationsTotal(response.total);
                setInvitationsCurrentPage(response.page);
            } else {
                console.error("Invitations API response.items is not an array or response is undefined:", response);
                setInvitations([]); // Default to empty array
                setInvitationsTotal(0);
                setInvitationsError("Received unexpected data for invitations.");
            }
        } catch (err: any) {
            setInvitationsError(err.response?.data?.detail || "Failed to load invitations.");
            setInvitations([]); // Clear data on error
            setInvitationsTotal(0);
        } finally {
            setIsLoadingInvitations(false);
        }
    }, [canManageStaff]);

    useEffect(() => {
        if (canManageStaff) {
            loadStaffMembers(staffCurrentPage); // Load current page for staff
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canManageStaff, staffCurrentPage]); // Re-fetch if page changes

    useEffect(() => {
        if (canManageStaff) {
            loadInvitations(invitationsCurrentPage, invitationStatusFilter); // Load current page for invitations
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canManageStaff, invitationsCurrentPage, invitationStatusFilter]); // Re-fetch if page or filter changes


    const handleInviteSubmitted = () => {
        onCloseInviteDrawer();
        toast({ title: "Invitation Sent", description: "The invitation has been successfully sent.", status: "success" });
        // Refresh invitations, go to first page of pending invites
        setInvitationStatusFilter('pending');
        setInvitationsCurrentPage(1); // This will trigger the useEffect for loadInvitations
    };

    const handleEditStaffSubmitted = () => {
        onCloseEditDrawer();
        toast({ title: "Staff Updated", description: "Staff member details have been updated.", status: "success" });
        loadStaffMembers(staffCurrentPage);
    };

    const openEditStaffDrawer = (staff: UserOut) => {
        setSelectedStaffForEdit(staff);
        onOpenEditDrawer();
    };
    
    const handleToggleStaffStatus = (staff: UserOut) => { // No need for async here
        setConfirmActionInfo({
            action: async () => {
                try {
                    await updateStaffStatus(staff.id, { is_active: !staff.is_active });
                    toast({ title: `Staff ${staff.is_active ? 'Deactivated' : 'Activated'}`, status: 'success' });
                    loadStaffMembers(staffCurrentPage);
                } catch (error: any) {
                    toast({ title: `Error ${staff.is_active ? 'Deactivating' : 'Activating'} Staff`, description: error.response?.data?.detail || "An error occurred.", status: 'error' });
                } finally {
                    onCloseConfirmModal();
                }
            },
            title: `${staff.is_active ? 'Deactivate' : 'Activate'} Staff Member?`,
            body: `Are you sure you want to ${staff.is_active ? 'deactivate' : 'activate'} ${staff.name}?`,
            confirmText: staff.is_active ? 'Deactivate' : 'Activate',
            colorScheme: staff.is_active ? 'red' : 'green',
        });
        onOpenConfirmModal();
    };

    const handleResendInvitation = (invitationId: number) => { // No need for async here
         setConfirmActionInfo({
            action: async () => {
                try {
                    await resendStaffInvitation(invitationId);
                    toast({ title: "Invitation Resent", status: 'success' });
                    loadInvitations(invitationsCurrentPage, invitationStatusFilter);
                } catch (error: any) {
                    toast({ title: "Error Resending", description: error.response?.data?.detail || "Could not resend invitation.", status: 'error' });
                } finally {
                    onCloseConfirmModal();
                }
            },
            title: "Resend Invitation?",
            body: "Are you sure you want to resend this invitation? A new invitation link will be generated if the old one expired.",
            confirmText: "Resend",
            colorScheme: "brand",
        });
        onOpenConfirmModal();
    };
    
    const handleCancelInvitation = (invitationId: number) => { // No need for async here
        setConfirmActionInfo({
            action: async () => {
                try {
                    await cancelStaffInvitation(invitationId);
                    toast({ title: "Invitation Cancelled", status: 'info' });
                    loadInvitations(invitationsCurrentPage, invitationStatusFilter);
                } catch (error: any) {
                    toast({ title: "Error Cancelling", description: error.response?.data?.detail || "Could not cancel invitation.", status: 'error' });
                } finally {
                    onCloseConfirmModal();
                }
            },
            title: "Cancel Invitation?",
            body: "Are you sure you want to cancel this pending invitation?",
            confirmText: "Cancel Invitation",
            colorScheme: "red",
        });
        onOpenConfirmModal();
    };

    // Pagination handlers
    const handleStaffPageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= Math.ceil(staffTotal / ITEMS_PER_PAGE)) {
            setStaffCurrentPage(newPage);
        }
    };
    const handleInvitationsPageChange = (newPage: number) => {
         if (newPage > 0 && newPage <= Math.ceil(invitationsTotal / ITEMS_PER_PAGE)) {
            setInvitationsCurrentPage(newPage);
        }
    };


    if (!userProfile || !canManageStaff) { // Added check for userProfile
        return <Box p="6"><Text>{tx('You do not have permission to manage staff.', "Vous n'avez pas la permission de gerer l'equipe.")}</Text></Box>;
    }

    // Helper for rendering pagination
    const renderPagination = (
        currentPage: number,
        totalItems: number,
        onPageChange: (page: number) => void,
        isLoading: boolean
    ) => {
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        if (totalPages <= 1) return null;

        return (
            <Flex justifyContent="space-between" alignItems="center" mt="5" px={1}>
                <Text fontSize="xs" color="gray.500" mb={0}>
                    Showing page {currentPage} of {totalPages}
                </Text>
                <HStack spacing={2}>
                    <ChakraButton
                        onClick={() => onPageChange(currentPage - 1)}
                        isDisabled={currentPage === 1 || isLoading}
                        size="sm"
                        variant="outline"
                        borderRadius="lg"
                        fontSize="xs"
                    >
                        Previous
                    </ChakraButton>
                    <ChakraButton
                        onClick={() => onPageChange(currentPage + 1)}
                        isDisabled={currentPage === totalPages || isLoading}
                        size="sm"
                        variant="outline"
                        borderRadius="lg"
                        fontSize="xs"
                    >
                        Next
                    </ChakraButton>
                </HStack>
            </Flex>
        );
    };


    return (
        <Box>
            <Flex
                align={{ base: 'flex-start', sm: 'center' }}
                justify="space-between"
                direction={{ base: 'column', sm: 'row' }}
                gap={3}
                mb={6}
            >
                <Box>
                    <Heading as="h1" size="lg" color="gray.900" fontWeight="700" letterSpacing="-0.02em">
                        {tx('Staff Management', "Gestion de l'equipe")}
                    </Heading>
                    <Text color="gray.500" fontSize="sm" mt={1} mb={0}>
                        {isFr
                            ? `${staffTotal} membre${staffTotal !== 1 ? 's' : ''} · ${invitationsTotal} invitation${invitationsTotal !== 1 ? 's' : ''}`
                            : `${staffTotal} member${staffTotal !== 1 ? 's' : ''} · ${invitationsTotal} invitation${invitationsTotal !== 1 ? 's' : ''}`}
                    </Text>
                </Box>
                <ChakraButton colorScheme="brand" leftIcon={<Plus size={16} />} onClick={onOpenInviteDrawer} size="md">
                    {tx('Invite Staff', "Inviter l'equipe")}
                </ChakraButton>
            </Flex>

            <Tabs variant="soft-rounded" colorScheme="brand" isLazy>
                <TabList mb="5" gap={2}>
                    <Tab fontSize="sm" fontWeight="500">{tx('Staff Members', 'Membres equipe')} ({staffTotal})</Tab>
                    <Tab fontSize="sm" fontWeight="500">{tx('Invitations', 'Invitations')} ({invitationsTotal})</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel p="0">
                        {isLoadingStaff && (
                            <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" overflow="hidden">
                                <HStack spacing={4} px={5} py={3.5} bg="gray.50" borderBottom="1px solid" borderColor="gray.200">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Box key={i} h="10px" flex={1} bg="gray.200" borderRadius="md" />
                                    ))}
                                </HStack>
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <HStack key={i} spacing={4} px={5} py={4} borderBottom="1px solid" borderColor="gray.100">
                                        <Box h="32px" w="32px" bg="gray.200" borderRadius="full" flexShrink={0} />
                                        {Array.from({ length: 4 }).map((_, j) => (
                                            <Box key={j} h="14px" flex={1} bg="gray.100" borderRadius="md" />
                                        ))}
                                    </HStack>
                                ))}
                            </Box>
                        )}
                        {staffError && <Text color="red.500" my="4" fontSize="sm">Error: {staffError}</Text>}
                        {!isLoadingStaff && !staffError && (!staffMembers || staffMembers.length === 0) && (
                            <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200">
                                <Center py={12} flexDir="column" gap={3}>
                                    <Flex align="center" justify="center" w="56px" h="56px" borderRadius="full" bg="brand.50">
                                        <Flex align="center" justify="center" w="40px" h="40px" borderRadius="full" bg="brand.100">
                                            <Plus size={20} color="var(--chakra-colors-brand-500)" />
                                        </Flex>
                                    </Flex>
                                    <Text fontWeight="600" color="gray.800">No staff members yet</Text>
                                    <Text fontSize="sm" color="gray.500">Invite team members to get started</Text>
                                </Center>
                            </Box>
                        )}
                        {!isLoadingStaff && !staffError && staffMembers && staffMembers.length > 0 && (
                            <>
                            <TableContainer
                                bg="white"
                                borderRadius="xl"
                                border="1px solid"
                                borderColor="gray.200"
                                transition="all 0.2s ease"
                                _hover={{ shadow: 'sm' }}
                            >
                                <Table variant="simple" size="md">
                                    <Thead>
                                        <Tr>
                                            <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>Name</Th>
                                            <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>Email</Th>
                                            <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>Role</Th>
                                            <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>Status</Th>
                                            <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5} w="60px"></Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {staffMembers.map(staff => (
                                            <Tr key={staff.id} transition="background 0.15s ease" _hover={{ bg: 'gray.50' }}>
                                                <Td borderColor="gray.100" py={4}>
                                                    <Flex align="center" gap={3}>
                                                        <Flex
                                                            align="center"
                                                            justify="center"
                                                            w="36px"
                                                            h="36px"
                                                            borderRadius="full"
                                                            bg="brand.500"
                                                            color="white"
                                                            fontSize="xs"
                                                            fontWeight="700"
                                                            flexShrink={0}
                                                        >
                                                            {staff.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'}
                                                        </Flex>
                                                        <Text fontWeight="600" color="gray.900" fontSize="sm" mb={0}>{staff.name}</Text>
                                                    </Flex>
                                                </Td>
                                                <Td borderColor="gray.100" py={4}>
                                                    <Text fontSize="sm" color="gray.600" mb={0}>{staff.email}</Text>
                                                </Td>
                                                <Td borderColor="gray.100" py={4}>
                                                    <ChakraTag size="sm" colorScheme={staff.role === 'admin' ? 'purple' : 'gray'} borderRadius="full" fontWeight="500" fontSize="xs">{staff.role}</ChakraTag>
                                                </Td>
                                                <Td borderColor="gray.100" py={4}>
                                                    <ChakraTag size="sm" variant="subtle" colorScheme={staff.is_active ? 'green' : 'red'} borderRadius="full" fontWeight="500" fontSize="xs">
                                                        {staff.is_active ? 'Active' : 'Inactive'}
                                                    </ChakraTag>
                                                </Td>
                                                <Td borderColor="gray.100" py={4}>
                                                    <Menu placement="bottom-end" isLazy>
                                                        <MenuButton as={IconButton} aria-label="Actions" icon={<MoreVertical size={16} />} variant="ghost" size="sm" color="gray.400" _hover={{ color: 'gray.600', bg: 'gray.100' }}/>
                                                        <MenuList minW="150px" py={1.5} borderRadius="xl" border="1px solid" borderColor="gray.200" shadow="lg">
                                                            <MenuItem icon={<Pencil size={15} />} fontSize="sm" borderRadius="md" mx={1.5} px={3} _hover={{ bg: 'gray.50' }} onClick={() => openEditStaffDrawer(staff)}>Edit Details</MenuItem>
                                                            <MenuItem 
                                                                icon={staff.is_active ? <UserX size={15} /> : <UserCheck size={15} />} 
                                                                onClick={() => handleToggleStaffStatus(staff)}
                                                                color={staff.is_active ? 'red.500' : 'green.500'}
                                                                fontSize="sm" borderRadius="md" mx={1.5} px={3}
                                                                _hover={{ bg: staff.is_active ? 'red.50' : 'green.50' }}
                                                            >
                                                                {staff.is_active ? 'Deactivate' : 'Activate'}
                                                            </MenuItem>
                                                        </MenuList>
                                                    </Menu>
                                                </Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            </TableContainer>
                            {renderPagination(staffCurrentPage, staffTotal, handleStaffPageChange, isLoadingStaff)}
                            </>
                        )}
                    </TabPanel>

                    <TabPanel p="0">
                         <Flex mb="4" alignItems="center" gap={3}>
                            <Text fontSize="sm" color="gray.500" mb={0}>Filter:</Text>
                            <Select 
                                placeholder="All Statuses" 
                                value={invitationStatusFilter || ""}
                                onChange={(e) => {
                                    const value = e.target.value as InvitationStatus | "";
                                    setInvitationStatusFilter(value === "" ? undefined : value);
                                    setInvitationsCurrentPage(1);
                                }}
                                w="180px" size="sm" borderRadius="lg"
                                bg="white" border="1px solid" borderColor="gray.200"
                                _hover={{ borderColor: 'gray.300' }}
                            >
                                <option value="pending">Pending</option>
                                <option value="accepted">Accepted</option>
                                <option value="expired">Expired</option>
                                <option value="cancelled">Cancelled</option>
                            </Select>
                        </Flex>
                        {isLoadingInvitations && (
                            <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200" overflow="hidden">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <HStack key={i} spacing={4} px={5} py={4} borderBottom="1px solid" borderColor="gray.100">
                                        {Array.from({ length: 6 }).map((_, j) => (
                                            <Box key={j} h="14px" flex={1} bg="gray.100" borderRadius="md" />
                                        ))}
                                    </HStack>
                                ))}
                            </Box>
                        )}
                        {invitationsError && <Text color="red.500" my="4" fontSize="sm">Error: {invitationsError}</Text>}
                        {!isLoadingInvitations && !invitationsError && (!invitations || invitations.length === 0) && (
                            <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200">
                                <Center py={10} flexDir="column" gap={2}>
                                    <Text fontWeight="600" color="gray.800">No invitations found</Text>
                                    <Text fontSize="sm" color="gray.500">No invitations match the current filter</Text>
                                </Center>
                            </Box>
                        )}
                        {!isLoadingInvitations && !invitationsError && invitations && invitations.length > 0 && (
                             <>
                             <TableContainer
                                bg="white"
                                borderRadius="xl"
                                border="1px solid"
                                borderColor="gray.200"
                                transition="all 0.2s ease"
                                _hover={{ shadow: 'sm' }}
                             >
                                <Table variant="simple" size="md">
                                    <Thead>
                                        <Tr>
                                            <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>Email</Th>
                                            <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>Name</Th>
                                            <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>Role</Th>
                                            <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>Status</Th>
                                            <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>Sent</Th>
                                            <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>Expires</Th>
                                            <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5} w="80px"></Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {invitations.map(invite => (
                                            <Tr key={invite.id} transition="background 0.15s ease" _hover={{ bg: 'gray.50' }}>
                                                <Td borderColor="gray.100" py={4}>
                                                    <Text fontSize="sm" color="gray.700" mb={0}>{invite.email}</Text>
                                                </Td>
                                                <Td borderColor="gray.100" py={4}>
                                                    <Text fontSize="sm" color="gray.700" mb={0}>{invite.first_name || '—'} {invite.last_name || ''}</Text>
                                                </Td>
                                                <Td borderColor="gray.100" py={4}>
                                                    <ChakraTag size="sm" variant="outline" borderRadius="full" fontWeight="500" fontSize="xs">{invite.role_to_assign}</ChakraTag>
                                                </Td>
                                                <Td borderColor="gray.100" py={4}>
                                                    <ChakraTag size="sm" variant="subtle" borderRadius="full" fontWeight="500" fontSize="xs" colorScheme={
                                                        invite.status === 'pending' ? 'yellow' :
                                                        invite.status === 'accepted' ? 'green' :
                                                        invite.status === 'expired' ? 'orange' :
                                                        invite.status === 'cancelled' ? 'red' : 'gray'
                                                    }>
                                                        {invite.status}
                                                    </ChakraTag>
                                                </Td>
                                                <Td borderColor="gray.100" py={4}>
                                                    <Text fontSize="sm" color="gray.600" mb={0}>{new Date(invite.created_at).toLocaleDateString()}</Text>
                                                </Td>
                                                <Td borderColor="gray.100" py={4}>
                                                    <Text fontSize="sm" color="gray.600" mb={0}>{invite.status === 'pending' ? new Date(invite.token_expiry).toLocaleDateString() : '—'}</Text>
                                                </Td>
                                                <Td borderColor="gray.100" py={4}>
                                                    {invite.status === 'pending' && (
                                                        <HStack spacing="1">
                                                            <IconButton aria-label="Resend Invitation" icon={<Mail size={16} />} size="xs" variant="ghost" colorScheme="blue" onClick={() => handleResendInvitation(invite.id)} title="Resend Invite"/>
                                                            <IconButton aria-label="Cancel Invitation" icon={<X size={16} />} size="xs" variant="ghost" colorScheme="red" onClick={() => handleCancelInvitation(invite.id)} title="Cancel Invite"/>
                                                        </HStack>
                                                    )}
                                                </Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            </TableContainer>
                            {renderPagination(invitationsCurrentPage, invitationsTotal, handleInvitationsPageChange, isLoadingInvitations)}
                            </>
                        )}
                    </TabPanel>
                </TabPanels>
            </Tabs>

            <RightDrawerModal isOpen={isInviteDrawerOpen} onClose={onCloseInviteDrawer} title="Invite New Staff Member">
                <InviteStaffForm onSubmitSuccess={handleInviteSubmitted} onCancel={onCloseInviteDrawer} />
            </RightDrawerModal>

            {selectedStaffForEdit && (
                <RightDrawerModal isOpen={isEditDrawerOpen} onClose={() => { onCloseEditDrawer(); setSelectedStaffForEdit(null); }} title={`Edit Staff: ${selectedStaffForEdit.name}`}>
                    <EditStaffForm staffMember={selectedStaffForEdit} onSubmitSuccess={handleEditStaffSubmitted} onCancel={() => { onCloseEditDrawer(); setSelectedStaffForEdit(null); }} />
                </RightDrawerModal>
            )}

            {confirmActionInfo && (
                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => { onCloseConfirmModal(); setConfirmActionInfo(null); }}
                    onConfirm={async () => { if (confirmActionInfo.action) await confirmActionInfo.action(); }}
                    title={confirmActionInfo.title}
                    bodyText={confirmActionInfo.body}
                    confirmButtonText={confirmActionInfo.confirmText}
                    confirmButtonColorScheme={confirmActionInfo.colorScheme}
                />
            )}
        </Box>
    );
};

export default StaffManagementView;
