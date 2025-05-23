// src/pages/views/StaffManagementView.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Heading, Tabs, TabList, TabPanels, Tab, TabPanel, Button as ChakraButton,
    Table, Thead, Tbody, Tr, Th, Td, TableContainer, IconButton, Tag as ChakraTag,
    Flex, Spacer, useDisclosure, Spinner, Center, Text, HStack,
    Menu, MenuButton, MenuList, MenuItem,
    Select, // Added Select for filter
} from '@chakra-ui/react';
import { AddIcon, EditIcon, EmailIcon, CloseIcon } from '@chakra-ui/icons'; // Removed unused icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserSlash, faUserCheck, faEllipsisV } from '@fortawesome/free-solid-svg-icons';

import { useAuth, UserProfile } from '../../auth/authContext';
import { fetchUsers, updateUser, FetchUsersParams } from '../../api/userApi'; // Import FetchUsersParams
import { UserOut, UserStatusUpdatePayload, UserUpdatePayload } from '../../types/User';
import { PaginatedResponse } from '../../types/Pagination';
import {
    inviteStaff, listInvitations, resendStaffInvitation, cancelStaffInvitation, updateStaffStatus, ListInvitationsParams
} from '../../api/staffApi';
import { InvitationOut, InvitationCreatePayload, InvitationStatus } from '../../types/Invitation';

import RightDrawerModal from '../../components/modals/RightDrawerModal';
import ConfirmationModal from '../../components/modals/ConfirmationModal';
import InviteStaffForm from '../../components/staff/InviteStaffForm';
import EditStaffForm from '../../components/staff/EditStaffForm';
import { useBrandedToast } from '../../hooks/useBrandedToast';

const ITEMS_PER_PAGE = 10;

const StaffManagementView: React.FC = () => {
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
    }, [canManageStaff, userProfile?.role]); // Removed userProfile from deps if tenant_id_filter not used yet for super_admin


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
                    toast({ title: "Invitation Cancelled", status: 'success' });
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
        return <Box p="6"><Text>You do not have permission to manage staff.</Text></Box>;
    }

    // Helper for rendering pagination (can be extracted to a component later)
    const renderPagination = (
        currentPage: number,
        totalItems: number,
        onPageChange: (page: number) => void,
        isLoading: boolean
    ) => {
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        if (totalPages <= 1) return null;

        return (
            <Flex justifyContent="center" mt="6">
                <HStack>
                    <ChakraButton onClick={() => onPageChange(currentPage - 1)} isDisabled={currentPage === 1 || isLoading} size="sm">
                        Previous
                    </ChakraButton>
                    <Text fontSize="sm" px="2">Page {currentPage} of {totalPages}</Text>
                    <ChakraButton onClick={() => onPageChange(currentPage + 1)} isDisabled={currentPage === totalPages || isLoading} size="sm">
                        Next
                    </ChakraButton>
                </HStack>
            </Flex>
        );
    };


    return (
        <Box p={{ base: "2", md: "4" }}> {/* Adjusted padding */}
            <Flex mb="6" alignItems="center" flexWrap="wrap" gap="4">
                <Heading as="h1" size="lg" color="gray.700">Staff Management</Heading> {/* Changed size */}
                <Spacer />
                <ChakraButton colorScheme="brand" leftIcon={<AddIcon />} onClick={onOpenInviteDrawer} size="md">
                    Invite Staff
                </ChakraButton>
            </Flex>

            <Tabs variant="soft-rounded" colorScheme="brand" isLazy> {/* Added isLazy for performance */}
                <TabList mb="4">
                    <Tab>Staff Members ({staffTotal})</Tab>
                    <Tab>Invitations ({invitationsTotal})</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel p="0">
                        {isLoadingStaff && <Center py="10"><Spinner color="brand.500" size="lg" /></Center>}
                        {staffError && <Text color="red.500" my="4">Error: {staffError}</Text>}
                        {!isLoadingStaff && !staffError && (!staffMembers || staffMembers.length === 0) && <Text my="4">No staff members found.</Text>}
                        {!isLoadingStaff && !staffError && staffMembers && staffMembers.length > 0 && (
                            <>
                            <TableContainer borderWidth="1px" borderColor="gray.200" borderRadius="md">
                                <Table variant="simple" size="sm">
                                    <Thead bg="gray.50">
                                        <Tr>
                                            <Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Status</Th><Th>Actions</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {staffMembers.map(staff => (
                                            <Tr key={staff.id}>
                                                <Td>{staff.name}</Td>
                                                <Td>{staff.email}</Td>
                                                <Td><ChakraTag size="sm" colorScheme={staff.role === 'admin' ? 'purple' : 'gray'}>{staff.role}</ChakraTag></Td>
                                                <Td>
                                                    <ChakraTag size="sm" variant="subtle" colorScheme={staff.is_active ? 'green' : 'red'}>
                                                        {staff.is_active ? 'Active' : 'Inactive'}
                                                    </ChakraTag>
                                                </Td>
                                                <Td>
                                                    <Menu placement="bottom-end" isLazy>
                                                        <MenuButton as={IconButton} aria-label="Actions" icon={<FontAwesomeIcon icon={faEllipsisV} />} variant="ghost" size="sm"/>
                                                        <MenuList minW="150px">
                                                            <MenuItem icon={<EditIcon fontSize="sm"/>} onClick={() => openEditStaffDrawer(staff)}>Edit Details</MenuItem>
                                                            <MenuItem 
                                                                icon={<FontAwesomeIcon icon={staff.is_active ? faUserSlash : faUserCheck} />} 
                                                                onClick={() => handleToggleStaffStatus(staff)}
                                                                color={staff.is_active ? 'red.500' : 'green.500'}
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
                         <Flex mb="4" alignItems="center">
                            <Text mr="3" fontSize="sm">Filter by status:</Text>
                            <Select 
                                placeholder="All Statuses" 
                                value={invitationStatusFilter || ""}
                                onChange={(e) => {
                                    const value = e.target.value as InvitationStatus | "";
                                    setInvitationStatusFilter(value === "" ? undefined : value);
                                    setInvitationsCurrentPage(1); // Reset to page 1 on filter change
                                    // useEffect will pick up change in invitationStatusFilter and reload
                                }}
                                w="200px" size="sm" borderRadius="md"
                            >
                                <option value="pending">Pending</option>
                                <option value="accepted">Accepted</option>
                                <option value="expired">Expired</option>
                                <option value="cancelled">Cancelled</option>
                            </Select>
                        </Flex>
                        {isLoadingInvitations && <Center py="10"><Spinner color="brand.500" size="lg" /></Center>}
                        {invitationsError && <Text color="red.500" my="4">Error: {invitationsError}</Text>}
                        {!isLoadingInvitations && !invitationsError && (!invitations || invitations.length === 0) && <Text my="4">No invitations found matching the criteria.</Text>}
                        {!isLoadingInvitations && !invitationsError && invitations && invitations.length > 0 && (
                             <>
                             <TableContainer borderWidth="1px" borderColor="gray.200" borderRadius="md">
                                <Table variant="simple" size="sm">
                                    <Thead bg="gray.50">
                                        <Tr>
                                            <Th>Email</Th><Th>Name</Th><Th>Role</Th><Th>Status</Th><Th>Sent</Th><Th>Expires</Th><Th>Actions</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {invitations.map(invite => (
                                            <Tr key={invite.id}>
                                                <Td>{invite.email}</Td>
                                                <Td>{invite.first_name || '-'} {invite.last_name || ''}</Td>
                                                <Td><ChakraTag size="sm" variant="outline">{invite.role_to_assign}</ChakraTag></Td>
                                                <Td>
                                                    <ChakraTag size="sm" variant="subtle" colorScheme={
                                                        invite.status === 'pending' ? 'yellow' :
                                                        invite.status === 'accepted' ? 'green' :
                                                        invite.status === 'expired' ? 'orange' :
                                                        invite.status === 'cancelled' ? 'red' : 'gray'
                                                    }>
                                                        {invite.status}
                                                    </ChakraTag>
                                                </Td>
                                                <Td>{new Date(invite.created_at).toLocaleDateString()}</Td>
                                                <Td>{invite.status === 'pending' ? new Date(invite.token_expiry).toLocaleDateString() : '-'}</Td>
                                                <Td>
                                                    {invite.status === 'pending' && (
                                                        <HStack spacing="1">
                                                            <IconButton aria-label="Resend Invitation" icon={<EmailIcon />} size="xs" variant="ghost" colorScheme="blue" onClick={() => handleResendInvitation(invite.id)} title="Resend Invite"/>
                                                            <IconButton aria-label="Cancel Invitation" icon={<CloseIcon />} size="xs" variant="ghost" colorScheme="red" onClick={() => handleCancelInvitation(invite.id)} title="Cancel Invite"/>
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
