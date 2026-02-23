// src/pages/views/TemplatesView.tsx

import React, { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, MoreVertical, Copy, Info, Mail } from 'lucide-react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';

import {
    createTemplate, updateTemplate, deleteTemplate
} from '../../api/templateApi';
import {
    TemplateOut, TEMPLATE_TRIGGER_LABELS, EMAIL_PLACEHOLDERS,
    TemplateCreatePayload, TemplateUpdatePayload
} from '../../types/Template';
import { useTemplates, queryKeys } from '../../hooks/useQueryHooks';

import DeleteTemplateModal from '../../components/modals/DeleteTemplateModal';
import CreateUpdateTemplateModal from '../../components/modals/CreateUpdateTemplateModal';

import { TableSkeleton, EmptyState } from '../../components/ui';
import {
    Box, Flex, Heading, Text, Icon,
    Table, Thead, Tbody, Tr, Th, Td, TableContainer,
    Badge, Switch, Menu, MenuButton, MenuList, MenuItem, IconButton,
    Alert, AlertIcon, AlertDescription, CloseButton,
    Tooltip, Wrap, WrapItem, Tag, TagLabel,
    useToast,
} from '@chakra-ui/react';
import { Button } from '@chakra-ui/react';

const getErrorMessage = (err: any, defaultMessage: string): string => {
    console.error("API Error:", err);
    let errorMessage = defaultMessage;
    if (axios.isAxiosError(err) && err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') { errorMessage = detail; }
        else if (Array.isArray(detail) && detail[0]?.msg) { errorMessage = `${detail[0].loc.join(' -> ')}: ${detail[0].msg}`; }
        else { errorMessage = JSON.stringify(detail); }
    } else if (err instanceof Error) { errorMessage = err.message; }
    return errorMessage;
};


const TemplatesView: React.FC = () => {
    const queryClient = useQueryClient();
    const toast = useToast();
    const { data: templates = [], isLoading, error: queryError } = useTemplates();
    const [error, setError] = useState<string | null>(queryError ? 'Failed to load templates.' : null);

    // Modal State
    const [isCreateUpdateModalOpen, setIsCreateUpdateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateOut | null>(null);

    // --- Handlers for Modals ---
    const handleOpenCreateModal = () => {
        setSelectedTemplate(null);
        setIsCreateUpdateModalOpen(true);
    };

    const handleOpenEditModal = (template: TemplateOut) => {
        setSelectedTemplate(template);
        setIsCreateUpdateModalOpen(true);
    };

    const handleOpenDeleteModal = (template: TemplateOut) => {
        setSelectedTemplate(template);
        setIsDeleteModalOpen(true);
    };

    const handleCloseModals = () => {
        setIsCreateUpdateModalOpen(false);
        setIsDeleteModalOpen(false);
        setSelectedTemplate(null);
    };

    // --- Handler for Saving (Create or Update) ---
    const handleSaveTemplate = useCallback(async (
        templateId: number | null,
        data: TemplateCreatePayload | TemplateUpdatePayload
    ) => {
        setError(null);
        try {
            if (templateId) {
                await updateTemplate(templateId, data as TemplateUpdatePayload);
            } else {
                await createTemplate(data as TemplateCreatePayload);
            }
            handleCloseModals();
            queryClient.invalidateQueries({ queryKey: queryKeys.templates });
        } catch (err: any) {
            throw err;
        }
    }, [queryClient]);

    // --- Handler for Deleting ---
    const handleDeleteTemplate = useCallback(async (templateId: number) => {
         setError(null);
         try {
             await deleteTemplate(templateId);
             handleCloseModals();
             queryClient.invalidateQueries({ queryKey: queryKeys.templates });
         } catch (err: any) {
             throw err;
         }
    }, [queryClient]);

    // --- Toggle Active Status (optimistic) ---
     const handleToggleActive = useCallback(async (template: TemplateOut) => {
         setError(null);
         const newStatus = !template.is_active;

         // Optimistic UI update
         queryClient.setQueryData<TemplateOut[]>(queryKeys.templates, (old) =>
           old?.map(t => t.id === template.id ? { ...t, is_active: newStatus } : t) ?? []
         );

         try {
             await updateTemplate(template.id, { is_active: newStatus });
         } catch (err: any) {
             setError(getErrorMessage(err, "Failed to update template status."));
             // Revert optimistic update on error
             queryClient.invalidateQueries({ queryKey: queryKeys.templates });
         }
     }, [queryClient]);


    // --- Copy Placeholder ---
    const copyPlaceholder = (placeholder: string) => {
         navigator.clipboard.writeText(placeholder).then(() => {
             toast({
                 title: 'Copied!',
                 description: `${placeholder} copied to clipboard`,
                 status: 'success',
                 duration: 1500,
                 isClosable: true,
                 position: 'bottom',
             });
         }).catch(err => console.error('Copy failed: ', err));
     };

    // --- Render ---
    return (
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
                        Email Templates
                    </Heading>
                    <Text color="gray.500" fontSize="sm" mt={1} mb={0}>
                        Manage automated email communications
                    </Text>
                </Box>
                <Button
                    colorScheme="brand"
                    onClick={handleOpenCreateModal}
                    leftIcon={<Icon as={Plus} boxSize="4" />}
                    size="md"
                >
                    Add Template
                </Button>
            </Flex>

            {/* Page-level Error */}
            {error && (
                <Alert status="error" borderRadius="xl" mb={5} variant="subtle">
                    <AlertIcon />
                    <AlertDescription flex="1" fontSize="sm">{error}</AlertDescription>
                    <CloseButton size="sm" onClick={() => setError(null)} />
                </Alert>
            )}

            {/* Placeholders Info Section */}
            <Box
                bg="blue.50"
                border="1px solid"
                borderColor="blue.100"
                borderRadius="xl"
                p={4}
                mb={6}
            >
                <Flex align="center" gap={2} mb={3}>
                    <Icon as={Info} boxSize="4" color="blue.500" />
                    <Text fontSize="sm" fontWeight="600" color="blue.700" mb={0}>
                        Available Placeholders
                    </Text>
                    <Text fontSize="xs" color="blue.500" mb={0}>
                        — Click to copy
                    </Text>
                </Flex>
                <Wrap spacing={2}>
                    {EMAIL_PLACEHOLDERS.map(p => (
                        <WrapItem key={p.placeholder}>
                            <Tooltip label={p.description} hasArrow placement="top" fontSize="xs">
                                <Tag
                                    size="sm"
                                    variant="subtle"
                                    colorScheme="blue"
                                    cursor="pointer"
                                    borderRadius="lg"
                                    px={2.5}
                                    _hover={{ bg: 'blue.100', transform: 'translateY(-1px)' }}
                                    transition="all 0.15s ease"
                                    onClick={() => copyPlaceholder(p.placeholder)}
                                >
                                    <TagLabel fontSize="xs" fontFamily="mono">
                                        {p.placeholder}
                                    </TagLabel>
                                    <Icon as={Copy} boxSize="3" ml={1.5} />
                                </Tag>
                            </Tooltip>
                        </WrapItem>
                    ))}
                </Wrap>
            </Box>


            {/* Templates Table */}
            {isLoading ? (
                <TableSkeleton rows={4} columns={5} />
            ) : templates.length === 0 ? (
                <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200">
                    <EmptyState
                        icon={Mail}
                        title="No templates yet"
                        description="Create email templates to automate your communications."
                        actionLabel="Add Template"
                        onAction={handleOpenCreateModal}
                        colorScheme="blue"
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
                                <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>
                                    Template
                                </Th>
                                <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>
                                    Trigger
                                </Th>
                                <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>
                                    Subject
                                </Th>
                                <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5} textAlign="center">
                                    Active
                                </Th>
                                <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5} w="60px">
                                </Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {templates.map(template => (
                                <Tr
                                    key={template.id}
                                    transition="background 0.15s ease"
                                    _hover={{ bg: 'gray.50' }}
                                    opacity={template.is_active ? 1 : 0.6}
                                >
                                    <Td borderColor="gray.100" py={4}>
                                        <Flex align="center" gap={3}>
                                            <Flex
                                                align="center"
                                                justify="center"
                                                w="36px"
                                                h="36px"
                                                borderRadius="lg"
                                                bg={template.is_active ? 'brand.50' : 'gray.100'}
                                                flexShrink={0}
                                            >
                                                <Icon
                                                    as={Mail}
                                                    boxSize="4"
                                                    color={template.is_active ? 'brand.500' : 'gray.400'}
                                                    strokeWidth={1.5}
                                                />
                                            </Flex>
                                            <Text fontWeight="600" color="gray.900" fontSize="sm" mb={0}>
                                                {template.name}
                                            </Text>
                                        </Flex>
                                    </Td>
                                    <Td borderColor="gray.100" py={4}>
                                        <Badge
                                            variant="subtle"
                                            colorScheme="purple"
                                            borderRadius="full"
                                            px={2.5}
                                            py={0.5}
                                            fontSize="xs"
                                            fontWeight="500"
                                        >
                                            {TEMPLATE_TRIGGER_LABELS[template.event_trigger] || template.event_trigger}
                                        </Badge>
                                    </Td>
                                    <Td borderColor="gray.100" py={4}>
                                        <Text fontSize="sm" color={template.email_subject ? 'gray.700' : 'gray.400'} mb={0} noOfLines={1} maxW="250px">
                                            {template.email_subject || '— None —'}
                                        </Text>
                                    </Td>
                                    <Td borderColor="gray.100" py={4} textAlign="center">
                                        <Switch
                                            size="md"
                                            colorScheme="brand"
                                            isChecked={template.is_active}
                                            onChange={() => handleToggleActive(template)}
                                            aria-label={template.is_active ? 'Deactivate template' : 'Activate template'}
                                        />
                                    </Td>
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
                                                    onClick={() => handleOpenEditModal(template)}
                                                >
                                                    Edit
                                                </MenuItem>
                                                <MenuItem
                                                    icon={<Trash2 size={15} />}
                                                    fontSize="sm"
                                                    color="red.500"
                                                    borderRadius="md"
                                                    mx={1.5}
                                                    px={3}
                                                    _hover={{ bg: 'red.50' }}
                                                    onClick={() => handleOpenDeleteModal(template)}
                                                >
                                                    Delete
                                                </MenuItem>
                                            </MenuList>
                                        </Menu>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </TableContainer>
            )}
            
            {/* Modals */}
             <CreateUpdateTemplateModal
                isOpen={isCreateUpdateModalOpen}
                onClose={handleCloseModals}
                template={selectedTemplate}
                onSave={handleSaveTemplate} 
             />
             
             <DeleteTemplateModal
                 isOpen={isDeleteModalOpen}
                 onClose={handleCloseModals}
                 template={selectedTemplate}
                 onConfirmDelete={handleDeleteTemplate} 
            />
        </Box>
    );
};

export default TemplatesView;
