// src/pages/views/ServicesView.tsx

import React, { useState, useCallback } from 'react';
import axios from 'axios';
import {
    FetchedService,
    ServiceCreatePayload,
    ServiceUpdatePayload
} from '../../api/serviceApi';
import { useServices, useCreateService, useUpdateService, useDeleteService } from '../../hooks/useQueryHooks';

// Modals
import CreateServiceModal from '../../components/modals/CreateServiceModal';
import UpdateServiceModal from '../../components/modals/UpdateServiceModal';
import DeleteServiceModal from '../../components/modals/DeleteServiceModal';

import { Pencil, Trash2, MoreVertical, Plus, Clock, Settings } from 'lucide-react';

import {
    Button, Box, Flex, Heading, Text, Icon,
    Table, Thead, Tbody, Tr, Th, Td, TableContainer,
    Badge, Menu, MenuButton, MenuList, MenuItem, IconButton,
    Alert, AlertIcon, AlertDescription, CloseButton,
} from "@chakra-ui/react";
import { TableSkeleton, EmptyState } from '../../components/ui';

interface ServicesViewProps {
    userProfile: { role: string; id: number };
}

// --- Utility function to extract error message ---
const getErrorMessage = (err: any, defaultMessage: string): string => {
    console.error("API Error:", err.response || err);
    let errorMessage = defaultMessage;
    if (axios.isAxiosError(err) && err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') { errorMessage = detail; }
        else if (Array.isArray(detail) && detail[0]?.msg) { errorMessage = `${detail[0].loc.join(' -> ')}: ${detail[0].msg}`; }
        else { errorMessage = JSON.stringify(detail); }
    } else if (err instanceof Error) { errorMessage = err.message; }
    return errorMessage;
};


const ServicesView: React.FC<ServicesViewProps> = ({ userProfile }) => {
    // Modal State
    const [isCreateServiceModalOpen, setIsCreateServiceModalOpen] = useState(false);
    const [isUpdateServiceModalOpen, setIsUpdateServiceModalOpen] = useState(false);
    const [isDeleteServiceModalOpen, setIsDeleteServiceModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<FetchedService | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);

    // Permissions derived from props
    const canManageServices = userProfile.role === "super_admin" || userProfile.role === "admin";
    const canDeleteServices = userProfile.role === "super_admin" || userProfile.role === "admin";

    // React Query hooks
    const { data: managedServices = [], isLoading: loadingManagedServices } = useServices(canManageServices);
    const createMutation = useCreateService();
    const updateMutation = useUpdateService();
    const deleteMutation = useDeleteService();

    // --- Handlers ---
    const handleOpenCreateServiceModal = () => setIsCreateServiceModalOpen(true);
    const handleServiceRowEditClick = (service: FetchedService) => { setSelectedService(service); setIsUpdateServiceModalOpen(true); };
    const handleServiceRowDeleteClick = (service: FetchedService) => { setSelectedService(service); setIsDeleteServiceModalOpen(true); };

    const handleCreateService = useCallback(async (data: ServiceCreatePayload) => {
        setLocalError(null);
        try {
            await createMutation.mutateAsync(data);
            setIsCreateServiceModalOpen(false);
        } catch (err: any) {
            setLocalError(getErrorMessage(err, "Failed to create service."));
        }
    }, [createMutation]);

    const handleUpdateService = useCallback(async (id: number, data: ServiceUpdatePayload) => {
        setLocalError(null);
        try {
            await updateMutation.mutateAsync({ id, data });
            setIsUpdateServiceModalOpen(false);
            setSelectedService(null);
        } catch (err: any) {
            setLocalError(getErrorMessage(err, "Failed to update service."));
        }
    }, [updateMutation]);

    const handleDeleteService = useCallback(async (id: number) => {
        setLocalError(null);
        try {
            await deleteMutation.mutateAsync(id);
            setIsDeleteServiceModalOpen(false);
            setSelectedService(null);
        } catch (err: any) {
            setLocalError(getErrorMessage(err, "Failed to delete service."));
        }
    }, [deleteMutation]);

    // --- Render ---

    if (!canManageServices) {
        return (
            <Flex align="center" justify="center" minH="300px">
                <Text color="gray.500">You do not have permission to manage services.</Text>
            </Flex>
        );
    }

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes}min`;
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    };

    return (
        <>
            <Box>
                {/* Page Header */}
                <Flex
                    align={{ base: 'flex-start', sm: 'center' }}
                    justify="space-between"
                    direction={{ base: 'column', sm: 'row' }}
                    gap={3}
                    mb={6}
                >
                    <Box>
                        <Heading as="h1" size="lg" color="gray.900" fontWeight="700" letterSpacing="-0.02em">
                            Services
                        </Heading>
                        <Text color="gray.500" fontSize="sm" mt={1} mb={0}>
                            {managedServices.length} service{managedServices.length !== 1 ? 's' : ''} available
                        </Text>
                    </Box>
                    <Button
                        colorScheme="brand"
                        onClick={handleOpenCreateServiceModal}
                        leftIcon={<Icon as={Plus} boxSize="4" />}
                        size="md"
                    >
                        Add Service
                    </Button>
                </Flex>

                {/* Error Alert */}
                {localError && (
                    <Alert status="error" borderRadius="xl" mb={5} variant="subtle">
                        <AlertIcon />
                        <AlertDescription flex="1" fontSize="sm">{localError}</AlertDescription>
                        <CloseButton size="sm" onClick={() => setLocalError(null)} />
                    </Alert>
                )}

                {/* Content */}
                {loadingManagedServices ? (
                    <TableSkeleton rows={5} columns={userProfile.role === 'super_admin' ? 5 : 4} />
                ) : !managedServices || managedServices.length === 0 ? (
                    <Box
                        bg="white"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="gray.200"
                    >
                        <EmptyState
                            icon={Settings}
                            title="No services yet"
                            description="Create your first service to start accepting bookings from clients."
                            actionLabel="Add Service"
                            onAction={handleOpenCreateServiceModal}
                        />
                    </Box>
                ) : (
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
                                    <Th
                                        bg="gray.50"
                                        color="gray.500"
                                        fontSize="xs"
                                        fontWeight="600"
                                        textTransform="uppercase"
                                        letterSpacing="0.05em"
                                        borderBottom="1px solid"
                                        borderColor="gray.200"
                                        py={3.5}
                                    >
                                        Service
                                    </Th>
                                    <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>
                                        Duration
                                    </Th>
                                    <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>
                                        Price
                                    </Th>
                                    {userProfile.role === 'super_admin' && (
                                        <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>
                                            Tenant
                                        </Th>
                                    )}
                                    <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5} w="60px">
                                    </Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {managedServices.map(s => (
                                    <Tr
                                        key={s.id}
                                        transition="background 0.15s ease"
                                        _hover={{ bg: 'gray.50' }}
                                    >
                                        <Td borderColor="gray.100" py={4}>
                                            <Flex align="center" gap={3}>
                                                <Flex
                                                    align="center"
                                                    justify="center"
                                                    w="36px"
                                                    h="36px"
                                                    borderRadius="lg"
                                                    bg="brand.50"
                                                    flexShrink={0}
                                                >
                                                    <Icon as={Settings} boxSize="4" color="brand.500" strokeWidth={1.5} />
                                                </Flex>
                                                <Box>
                                                    <Text fontWeight="600" color="gray.900" fontSize="sm" mb={0}>
                                                        {s.name}
                                                    </Text>
                                                    <Text fontSize="xs" color="gray.400" mb={0}>
                                                        ID: {s.id}
                                                    </Text>
                                                </Box>
                                            </Flex>
                                        </Td>
                                        <Td borderColor="gray.100" py={4}>
                                            <Badge
                                                variant="subtle"
                                                colorScheme="blue"
                                                borderRadius="full"
                                                px={2.5}
                                                py={0.5}
                                                fontSize="xs"
                                                fontWeight="500"
                                            >
                                                <Flex align="center" gap={1}>
                                                    <Icon as={Clock} boxSize="3" />
                                                    {formatDuration(s.duration_minutes)}
                                                </Flex>
                                            </Badge>
                                        </Td>
                                        <Td borderColor="gray.100" py={4}>
                                            <Text fontWeight="600" color="gray.900" fontSize="sm" mb={0}>
                                                {s.price != null ? `${s.price.toFixed(2)}` : '—'}
                                                {s.price != null && (
                                                    <Text as="span" fontWeight="400" color="gray.400" fontSize="xs" ml={1}>
                                                        DH
                                                    </Text>
                                                )}
                                            </Text>
                                        </Td>
                                        {userProfile.role === 'super_admin' && (
                                            <Td borderColor="gray.100" py={4}>
                                                <Badge variant="outline" colorScheme="gray" borderRadius="full" fontSize="xs">
                                                    #{s.tenant_id}
                                                </Badge>
                                            </Td>
                                        )}
                                        <Td borderColor="gray.100" py={4}>
                                            <Menu placement="bottom-end" isLazy>
                                                <MenuButton
                                                    as={IconButton}
                                                    aria-label="Actions"
                                                    icon={<MoreVertical size={16} />}
                                                    variant="ghost"
                                                    size="sm"
                                                    color="gray.400"
                                                    _hover={{ color: 'gray.600', bg: 'gray.100' }}
                                                />
                                                <MenuList
                                                    minW="150px"
                                                    py={1.5}
                                                    borderRadius="xl"
                                                    border="1px solid"
                                                    borderColor="gray.200"
                                                    shadow="lg"
                                                >
                                                    <MenuItem
                                                        icon={<Pencil size={15} />}
                                                        fontSize="sm"
                                                        borderRadius="md"
                                                        mx={1.5}
                                                        px={3}
                                                        _hover={{ bg: 'gray.50' }}
                                                        onClick={() => handleServiceRowEditClick(s)}
                                                    >
                                                        Edit
                                                    </MenuItem>
                                                    {canDeleteServices && (
                                                        <MenuItem
                                                            icon={<Trash2 size={15} />}
                                                            fontSize="sm"
                                                            color="red.500"
                                                            borderRadius="md"
                                                            mx={1.5}
                                                            px={3}
                                                            _hover={{ bg: 'red.50' }}
                                                            onClick={() => handleServiceRowDeleteClick(s)}
                                                        >
                                                            Delete
                                                        </MenuItem>
                                                    )}
                                                </MenuList>
                                            </Menu>
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </TableContainer>
                )}
            </Box>

            {/* --- Modals --- */}
            <CreateServiceModal
                isOpen={isCreateServiceModalOpen}
                onClose={() => setIsCreateServiceModalOpen(false)}
                onSubmit={handleCreateService}
                userProfile={userProfile}
            />
            <UpdateServiceModal
                isOpen={isUpdateServiceModalOpen}
                onClose={() => { setIsUpdateServiceModalOpen(false); setSelectedService(null); }}
                onSubmit={handleUpdateService}
                service={selectedService}
            />
            <DeleteServiceModal
                isOpen={isDeleteServiceModalOpen}
                onClose={() => { setIsDeleteServiceModalOpen(false); setSelectedService(null); }}
                onConfirm={handleDeleteService}
                service={selectedService}
            />
        </>
    );
};

export default ServicesView;
