// src/components/TagManagementView.tsx

import React, { useState } from 'react';
import { FetchedTag } from '../api/tagApi';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '../hooks/useQueryHooks';
import CreateTagModal from './modals/CreateTagModal';
import UpdateTagModal from './modals/UpdateTagModal';
import DeleteTagModal from './modals/DeleteTagModal';
import { Pencil, Trash2, MoreVertical, Plus, Tag as TagIcon } from 'lucide-react';

import {
    Box, Flex, Heading, Text, Icon,
    Table, Thead, Tbody, Tr, Th, Td, TableContainer,
    Menu, MenuButton, MenuList, MenuItem, IconButton, Button,
    Alert, AlertIcon, AlertDescription,
} from '@chakra-ui/react';
import { TableSkeleton, EmptyState } from './ui';

interface TagManagementViewProps {}

const TagManagementView: React.FC<TagManagementViewProps> = () => {
    // React Query hooks
    const { data: tags = [], isLoading, error: queryError } = useTags();
    const createMutation = useCreateTag();
    const updateMutation = useUpdateTag();
    const deleteMutation = useDeleteTag();

    const error = queryError ? 'Could not load tags.' : null;

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedTag, setSelectedTag] = useState<FetchedTag | null>(null);

    // CRUD Handlers
    const handleCreateTag = async (payload: any) => {
        await createMutation.mutateAsync(payload);
        setIsCreateModalOpen(false);
    };

    const handleUpdateTag = async (id: number, payload: any) => {
        await updateMutation.mutateAsync({ id, data: payload });
        setIsUpdateModalOpen(false);
        setSelectedTag(null);
    };

    const handleDeleteTag = async (id: number) => {
        await deleteMutation.mutateAsync(id);
        setIsDeleteModalOpen(false);
        setSelectedTag(null);
    };

    // Modal Open Handlers
    const handleOpenCreateModal = () => setIsCreateModalOpen(true);
    const handleOpenUpdateModal = (tag: FetchedTag) => {
      if (!tag || typeof tag.id === 'undefined') {
          console.error('Attempting to open update modal with invalid tag data!');
          return;
      }
      setSelectedTag(tag);
      setIsUpdateModalOpen(true);
    };
    const handleOpenDeleteModal = (tag: FetchedTag) => {
        setSelectedTag(tag);
        setIsDeleteModalOpen(true);
    };

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
                        Tags
                    </Heading>
                    <Text color="gray.500" fontSize="sm" mt={1} mb={0}>
                        {tags.length} tag{tags.length !== 1 ? 's' : ''} created
                    </Text>
                </Box>
                <Button
                    colorScheme="brand"
                    onClick={handleOpenCreateModal}
                    leftIcon={<Icon as={Plus} boxSize="4" />}
                    size="md"
                >
                    Add Tag
                </Button>
            </Flex>

            {/* Error */}
            {error && (
                <Alert status="error" borderRadius="xl" mb={5} variant="subtle">
                    <AlertIcon />
                    <AlertDescription flex="1" fontSize="sm">{error}</AlertDescription>
                </Alert>
            )}

            {/* Content */}
            {isLoading ? (
                <TableSkeleton rows={4} columns={4} />
            ) : tags.length === 0 ? (
                <Box bg="white" borderRadius="xl" border="1px solid" borderColor="gray.200">
                    <EmptyState
                        icon={TagIcon}
                        title="No tags created"
                        description="Tags help you organize and categorize your clients for better management."
                        actionLabel="Add Tag"
                        onAction={handleOpenCreateModal}
                        colorScheme="orange"
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
                                    Tag
                                </Th>
                                <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>
                                    Color
                                </Th>
                                <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5}>
                                    Icon
                                </Th>
                                <Th bg="gray.50" color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" borderBottom="1px solid" borderColor="gray.200" py={3.5} w="60px">
                                </Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {tags.map(tag => (
                                <Tr
                                    key={tag.id}
                                    transition="background 0.15s ease"
                                    _hover={{ bg: 'gray.50' }}
                                >
                                    <Td borderColor="gray.100" py={4}>
                                        <Flex align="center" gap={3}>
                                            <Flex
                                                align="center"
                                                justify="center"
                                                w="32px"
                                                h="32px"
                                                borderRadius="full"
                                                bg={tag.color_hex || '#0D9488'}
                                                flexShrink={0}
                                            >
                                                <Icon as={TagIcon} boxSize="3.5" color="white" strokeWidth={2} />
                                            </Flex>
                                            <Box>
                                                <Text fontWeight="600" color="gray.900" fontSize="sm" mb={0}>
                                                    {tag.tag_name}
                                                </Text>
                                                <Text fontSize="xs" color="gray.400" mb={0}>
                                                    ID: {tag.id}
                                                </Text>
                                            </Box>
                                        </Flex>
                                    </Td>
                                    <Td borderColor="gray.100" py={4}>
                                        <Flex align="center" gap={2}>
                                            <Box
                                                w="20px"
                                                h="20px"
                                                borderRadius="md"
                                                bg={tag.color_hex || '#CCCCCC'}
                                                border="1px solid"
                                                borderColor="blackAlpha.100"
                                                flexShrink={0}
                                            />
                                            <Text fontSize="sm" color="gray.600" fontFamily="mono" mb={0}>
                                                {tag.color_hex || '#CCCCCC'}
                                            </Text>
                                        </Flex>
                                    </Td>
                                    <Td borderColor="gray.100" py={4}>
                                        <Text fontSize="sm" color={tag.icon_identifier ? 'gray.700' : 'gray.400'} mb={0}>
                                            {tag.icon_identifier || '—'}
                                        </Text>
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
                                                    onClick={() => handleOpenUpdateModal(tag)}
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
                                                    onClick={() => handleOpenDeleteModal(tag)}
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

            {/* Render Modals */}
            <CreateTagModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSubmit={handleCreateTag}
            />
            <UpdateTagModal
                isOpen={isUpdateModalOpen}
                onClose={() => { setIsUpdateModalOpen(false); setSelectedTag(null); }}
                onSubmit={handleUpdateTag}
                tag={selectedTag}
            />
            <DeleteTagModal
                isOpen={isDeleteModalOpen}
                onClose={() => { setIsDeleteModalOpen(false); setSelectedTag(null); }}
                onConfirm={handleDeleteTag}
                tag={selectedTag}
            />
        </Box>
    );
};

export default TagManagementView;
