// src/components/ClientsTable.tsx
// --- Enhanced with Chakra UI for consistent design ---

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    MoreVertical, Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown,
    X, Loader2, Search, Filter, RotateCcw, Users
} from 'lucide-react';
import Select, { MultiValue } from 'react-select';
import {
    Box, Flex, Text, Table, Thead, Tbody, Tr, Th, Td,
    Avatar, Badge, Tag as ChakraTag, TagLabel,
    Menu, MenuButton, MenuList, MenuItem as ChakraMenuItem, MenuDivider,
    IconButton, Button, Input, InputGroup, InputLeftElement,
    Alert, AlertIcon, AlertDescription,
    HStack, Icon, Tooltip,
    Select as ChakraSelect,
} from '@chakra-ui/react';
import { TableSkeleton, EmptyState } from './ui';

import { FetchedClient, ClientTag, fetchClients, FetchClientsParams, PaginatedResponse } from '../api/clientApi';
import { FetchedTag, fetchTags as fetchAvailableTenantTagsApi } from '../api/tagApi';

// --- Helper: Debounce Hook ---
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}


// --- Action Menu Component (Chakra UI) ---
interface ActionMenuProps {
    client: FetchedClient;
    canDelete: boolean;
    onEdit: (client: FetchedClient) => void;
    onDelete: (client: FetchedClient) => void;
}
const ActionMenu: React.FC<ActionMenuProps> = ({ client, canDelete, onEdit, onDelete }) => {
    if (client.is_deleted) {
        return (
            <Text fontSize="xs" color="gray.400" fontStyle="italic">Deleted</Text>
        );
    }
    return (
        <Menu placement="bottom-end" gutter={4}>
            <MenuButton
                as={IconButton}
                icon={<MoreVertical size={16} />}
                variant="ghost"
                size="sm"
                aria-label="Actions"
                color="gray.400"
                _hover={{ color: 'gray.600', bg: 'gray.100' }}
                borderRadius="lg"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
            <MenuList
                minW="160px"
                py="1.5"
                borderRadius="xl"
                border="1px solid"
                borderColor="gray.200"
                shadow="lg"
            >
                <ChakraMenuItem
                    fontSize="sm"
                    icon={<Pencil size={14} />}
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        onEdit(client);
                    }}
                    borderRadius="md"
                    mx="1.5"
                    _hover={{ bg: 'gray.50' }}
                >
                    Edit
                </ChakraMenuItem>
                {canDelete && (
                    <>
                        <MenuDivider my="1" />
                        <ChakraMenuItem
                            fontSize="sm"
                            icon={<Trash2 size={14} />}
                            color="red.500"
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onDelete(client);
                            }}
                            borderRadius="md"
                            mx="1.5"
                            _hover={{ bg: 'red.50' }}
                        >
                            Delete
                        </ChakraMenuItem>
                    </>
                )}
            </MenuList>
        </Menu>
    );
};


// --- Pagination Controls Component (Keep as is, or slightly adapt for totalItems) ---
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;
    totalItems: number;
    onItemsPerPageChange: (size: number) => void;
}
const PaginationControls: React.FC<PaginationProps> = ({
    currentPage, totalPages, onPageChange, itemsPerPage, totalItems, onItemsPerPageChange
}) => {
    if (totalItems === 0 && totalPages <=1) return null;
    if (totalPages <= 1 && totalItems <= itemsPerPage) return null;

    const pageNumbers = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }

    const itemStart = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const itemEnd = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <Flex
            align="center"
            justify="space-between"
            px="6"
            py="3"
            borderTop="1px solid"
            borderColor="gray.100"
            flexWrap="wrap"
            gap="3"
        >
            <Text fontSize="sm" color="gray.500">
                Showing <Text as="span" fontWeight="600" color="gray.700">{itemStart}–{itemEnd}</Text> of{' '}
                <Text as="span" fontWeight="600" color="gray.700">{totalItems}</Text> clients
            </Text>
            <HStack spacing="1">
                <Button
                    size="sm"
                    variant="ghost"
                    colorScheme="gray"
                    onClick={() => onPageChange(currentPage - 1)}
                    isDisabled={currentPage === 1}
                    borderRadius="lg"
                    fontSize="xs"
                >
                    Previous
                </Button>
                {startPage > 1 && (
                    <>
                        <Button size="sm" variant="ghost" onClick={() => onPageChange(1)} borderRadius="lg" fontSize="xs" minW="8">1</Button>
                        {startPage > 2 && <Text fontSize="xs" color="gray.400" px="1">...</Text>}
                    </>
                )}
                {pageNumbers.map(number => (
                    <Button
                        key={number}
                        size="sm"
                        variant={currentPage === number ? 'solid' : 'ghost'}
                        colorScheme={currentPage === number ? 'brand' : 'gray'}
                        onClick={() => onPageChange(number)}
                        borderRadius="lg"
                        fontSize="xs"
                        minW="8"
                    >
                        {number}
                    </Button>
                ))}
                {endPage < totalPages && (
                    <>
                        {endPage < totalPages - 1 && <Text fontSize="xs" color="gray.400" px="1">...</Text>}
                        <Button size="sm" variant="ghost" onClick={() => onPageChange(totalPages)} borderRadius="lg" fontSize="xs" minW="8">{totalPages}</Button>
                    </>
                )}
                <Button
                    size="sm"
                    variant="ghost"
                    colorScheme="gray"
                    onClick={() => onPageChange(currentPage + 1)}
                    isDisabled={currentPage === totalPages}
                    borderRadius="lg"
                    fontSize="xs"
                >
                    Next
                </Button>
            </HStack>
            <HStack spacing="2">
                <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">Per page:</Text>
                <ChakraSelect
                    size="sm"
                    value={itemsPerPage}
                    onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                    borderRadius="lg"
                    w="70px"
                    borderColor="gray.200"
                    _hover={{ borderColor: 'gray.300' }}
                >
                    {[10, 25, 50, 100].map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </ChakraSelect>
            </HStack>
        </Flex>
    );
};


// --- Inline Tag Editor (Keep as is from your version) ---
interface InlineTagEditorProps {
    client: FetchedClient;
    availableTagsForEditor: FetchedTag[]; // Renamed to avoid confusion with filter tags
    onAssignTag: (clientId: number, tagId: number) => Promise<FetchedClient | void>; // Return updated client or void
    onRemoveTag: (clientId: number, tagId: number) => Promise<void>;
    onClose: () => void;
}
const InlineTagEditor: React.FC<InlineTagEditorProps> = ({ client, availableTagsForEditor, onAssignTag, onRemoveTag, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [assigningTagId, setAssigningTagId] = useState<number | null>(null);
    const [removingTagId, setRemovingTagId] = useState<number | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) onClose(); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const filteredAvailableTags = useMemo(() => {
        const assignedTagIds = new Set(client.tags?.map(t => t.id) ?? []);
        return availableTagsForEditor.filter(tag => !assignedTagIds.has(tag.id) && tag.tag_name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [availableTagsForEditor, client.tags, searchTerm]);

    const handleAssign = async (tagId: number) => {
        setAssigningTagId(tagId);
        try {
            await onAssignTag(client.id, tagId); // Parent will handle client list update
            setSearchTerm('');
        } catch (e) { /* Parent handles error display */ }
        finally { setAssigningTagId(null); }
    };
    const handleRemove = async (tagId: number) => {
        setRemovingTagId(tagId);
        try {
            await onRemoveTag(client.id, tagId); // Parent will handle client list update
        } catch (e) { /* Parent handles error display */ }
        finally { setRemovingTagId(null); }
    };

    return (
        <div className="inline-tag-editor-popover" ref={popoverRef} onClick={e => e.stopPropagation()}>
            <button className="inline-tag-editor-close" onClick={onClose} aria-label="Close tag editor">×</button>
            <h4>Edit Tags for {client.first_name} {client.last_name}</h4>
            <div className="current-tags-section">
                {client.tags?.length > 0 ? client.tags.map(tag => (
                    <span key={tag.id} className="tag assigned-tag" style={{ backgroundColor: tag.color_hex || '#CCCCCC' }}>
                        {tag.tag_name}
                        <button onClick={() => handleRemove(tag.id)} className="remove-tag-btn" disabled={removingTagId === tag.id} aria-label={`Remove tag ${tag.tag_name}`}>
                            {removingTagId === tag.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                        </button>
                    </span>
                )) : <span className="no-tags-assigned">No tags assigned.</span>}
            </div>
            <div className="add-tags-section">
                <input type="text" placeholder="Search & assign tag..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="tag-search-input" autoFocus />
                <ul className="available-tags-list">
                    {filteredAvailableTags.length > 0 ? filteredAvailableTags.map(tag => (
                        <li key={tag.id}>
                            <button onClick={() => handleAssign(tag.id)} disabled={assigningTagId === tag.id} className="assign-tag-btn">
                                <span className="tag" style={{ backgroundColor: tag.color_hex || '#CCCCCC' }}>{tag.tag_name}</span>
                                {assigningTagId === tag.id && <Loader2 size={12} className="animate-spin" />}
                            </button>
                        </li>
                    )) : (searchTerm && filteredAvailableTags.length === 0 && <li><i>No matching tags to assign</i></li>)}
                </ul>
            </div>
        </div>
    );
};


// --- Main ClientsTable Component ---
interface ClientsTableProps {
    userProfile: { role: string; tenant_id?: number | null; };
    showDeletedClients: boolean; // From parent Dashboard state
    canDeleteClients: boolean;
    onAddClient: () => void;
    onEditClient: (client: FetchedClient) => void;
    onDeleteClient: (client: FetchedClient) => void;
    onToggleShowDeleted: () => void;

    // Tag related props for InlineTagEditor - these are passed from Dashboard
    availableTags: FetchedTag[]; // List of all available tags for the tenant (for inline editor)
    onAssignTag: (clientId: number, tagId: number) => Promise<FetchedClient | void>; // Dashboard's assign handler
    onRemoveTag: (clientId: number, tagId: number) => Promise<void>; // Dashboard's remove handler
    canAssignTags: boolean;
}

type SortableClientColumns = 'id' | 'name' | 'email' | 'is_confirmed' | 'created_at' | 'updated_at';

// Options for react-select
interface TagOption { value: number; label: string; color?: string | null; }

const ClientsTable: React.FC<ClientsTableProps> = ({
    userProfile, showDeletedClients, canDeleteClients, onAddClient, onEditClient, onDeleteClient, onToggleShowDeleted,
    availableTags: availableTagsForInlineEditor, // Renamed to distinguish from tags fetched for filtering
    onAssignTag: onAssignTagFromDashboard,
    onRemoveTag: onRemoveTagFromDashboard,
    canAssignTags
}) => {
    // --- State for data, loading, and errors specific to this table ---
    const [clients, setClients] = useState<FetchedClient[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // --- State for pagination ---
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);
    const [totalItems, setTotalItems] = useState<number>(0);
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // --- State for sorting ---
    const [sortColumn, setSortColumn] = useState<SortableClientColumns>('last_name' as SortableClientColumns);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // --- State for filtering ---
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedFilterTags, setSelectedFilterTags] = useState<MultiValue<TagOption>>([]); // For react-select
    const [availableTagsForFilter, setAvailableTagsForFilter] = useState<FetchedTag[]>([]); // Tags for the filter dropdown

    // --- State for inline tag editor ---
    const [editingTagsForClientId, setEditingTagsForClientId] = useState<number | null>(null);


    // Debounce search term
    const debouncedSearchTerm = useDebounce(searchTerm, 500); // 500ms delay

    // --- Fetch available tags for the filter dropdown ---
    useEffect(() => {
        const loadTagsForFilter = async () => {
            try {
                // fetchAvailableTenantTagsApi is the renamed import from ../api/tagApi
                const tagsData = await fetchAvailableTenantTagsApi();
                setAvailableTagsForFilter(tagsData);
            } catch (err) {
                console.error("Failed to load tags for filter:", err);
                // Optionally set an error state for this specific failure
            }
        };
        loadTagsForFilter();
    }, []); // Fetch once on mount

    const tagOptionsForFilter: TagOption[] = useMemo(() => {
        return availableTagsForFilter.map(tag => ({
            value: tag.id,
            label: tag.tag_name,
            color: tag.color_hex
        }));
    }, [availableTagsForFilter]);


    // --- Main Data Fetching Logic for Clients ---
    const loadClients = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        console.log("ClientsTable: Fetching clients...");

        const params: FetchClientsParams = {
            page: currentPage,
            limit: itemsPerPage,
            includeDeleted: showDeletedClients, // Use prop from Dashboard
            sortBy: sortColumn,
            sortDirection: sortDirection,
        };
        if (debouncedSearchTerm) {
            params.searchTerm = debouncedSearchTerm;
        }
        if (selectedFilterTags.length > 0) {
            params.tagIds = selectedFilterTags.map(tag => tag.value).join(',');
        }

        try {
            const response: PaginatedResponse<FetchedClient> = await fetchClients(params);
            setClients(response.items);
            setTotalItems(response.total);
            // currentPage might be adjusted by backend if it's out of bounds, but usually frontend controls it.
            // For simplicity, we assume `response.page` matches `currentPage` sent.
            if (response.page !== currentPage && response.total > 0) {
                 // If backend corrected the page (e.g., requested page 10 but only 5 exist)
                 // setCurrentPage(response.page); // This can cause an extra re-render/fetch cycle.
                 // Better to ensure frontend doesn't request out-of-bounds pages.
            } else if (response.total === 0 && currentPage > 1) {
                // If filters result in no items, and we are not on page 1, reset to page 1
                setCurrentPage(1); // This will trigger a re-fetch via the useEffect below
            }

        } catch (err: any) {
            console.error("ClientsTable: Error fetching clients", err);
            setError(err.message || "Failed to load clients.");
            setClients([]); // Clear clients on error
            setTotalItems(0);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, itemsPerPage, showDeletedClients, sortColumn, sortDirection, debouncedSearchTerm, selectedFilterTags]);

    // Effect to fetch clients when dependencies change
    useEffect(() => {
        loadClients();
    }, [loadClients]); // `loadClients` is memoized with its own dependencies

    // --- Handlers ---
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };
    const handleItemsPerPageChange = (size: number) => {
        setItemsPerPage(size);
        setCurrentPage(1); // Reset to first page when items per page changes
    };

    const handleSort = (column: SortableClientColumns) => {
        const newDirection = (sortColumn === column && sortDirection === 'asc') ? 'desc' : 'asc';
        setSortColumn(column);
        setSortDirection(newDirection);
        setCurrentPage(1); // Reset to first page on sort
    };

    const getSortIcon = (column: SortableClientColumns) => {
        if (sortColumn === column) {
            return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
        }
        return <ArrowUpDown size={14} />;
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setCurrentPage(1); // Reset to first page on new search
    };

    const handleTagFilterChange = (selectedOptions: MultiValue<TagOption>) => {
        setSelectedFilterTags(selectedOptions);
        setCurrentPage(1); // Reset to first page on tag filter change
    };
    
    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedFilterTags([]);
        // setSortColumn('last_name'); // Optionally reset sort
        // setSortDirection('asc');
        setCurrentPage(1); // Reset to first page
        // `showDeletedClients` is managed by parent, so `onToggleShowDeleted` would be used if a clear button affected it.
    };


    // Handler for inline tag editor success (to refresh the specific client's tags)
    const handleTagUpdateForClient = async (clientId: number, updatedClientData?: FetchedClient) => {
        if (updatedClientData) {
            setClients(prev => prev.map(c => c.id === clientId ? updatedClientData : c));
        } else {
            // If the API doesn't return the full updated client, or for removal, we might need to re-fetch that client or the list
            // For simplicity now, a full list refresh might be easiest if granular update is complex
            loadClients(); // Re-fetch the current page of clients
        }
    };

    const handleAssignTagForInlineEditor = async (clientId: number, tagId: number): Promise<void> => {
        try {
            const updatedClient = await onAssignTagFromDashboard(clientId, tagId); // Call dashboard's handler
            if (updatedClient) {
                 handleTagUpdateForClient(clientId, updatedClient as FetchedClient);
            } else {
                loadClients(); // Fallback to reload list if no client data returned
            }
        } catch (error) {
            // Error already handled by dashboard's handler typically, re-throw if needed by editor
            console.error("Inline editor assign tag error:", error);
            throw error;
        }
    };
    
    const handleRemoveTagForInlineEditor = async (clientId: number, tagId: number): Promise<void> => {
        try {
            await onRemoveTagFromDashboard(clientId, tagId); // Call dashboard's handler
            // After removal, the specific client's tags array in the local 'clients' state needs updating
            // or simply reload the list.
            const clientToUpdate = clients.find(c => c.id === clientId);
            if (clientToUpdate) {
                const newTags = clientToUpdate.tags.filter(t => t.id !== tagId);
                handleTagUpdateForClient(clientId, {...clientToUpdate, tags: newTags });
            } else {
                 loadClients(); // Fallback
            }
        } catch (error) {
            console.error("Inline editor remove tag error:", error);
            throw error;
        }
    };

    const handleToggleTagEditor = (clientId: number | null) => {
        setEditingTagsForClientId(clientId);
    };

    // --- Render ---
    return (
        <Box>
            {/* Page Header */}
            <Flex align="center" justify="space-between" mb="6" flexWrap="wrap" gap="3">
                <Box>
                    <Text fontSize="lg" fontWeight="700" color="gray.900" mb="0">
                        Client Management
                    </Text>
                    <Text fontSize="sm" color="gray.500" mb="0">
                        {totalItems > 0 ? `${totalItems} client${totalItems !== 1 ? 's' : ''} total` : 'Manage your clients'}
                    </Text>
                </Box>
                <HStack spacing="3">
                    <Flex
                        as="label"
                        align="center"
                        gap="2"
                        px="3"
                        py="1.5"
                        bg="gray.50"
                        borderRadius="lg"
                        cursor="pointer"
                        fontSize="sm"
                        color="gray.600"
                        _hover={{ bg: 'gray.100' }}
                        transition="background 0.15s"
                    >
                        <input type="checkbox" checked={showDeletedClients} onChange={onToggleShowDeleted} style={{ accentColor: '#0D9488' }} />
                        Show Deleted
                    </Flex>
                    <Button
                        colorScheme="brand"
                        size="sm"
                        borderRadius="lg"
                        onClick={onAddClient}
                        fontWeight="600"
                    >
                        Add New Client
                    </Button>
                </HStack>
            </Flex>

            {/* --- Filter Controls --- */}
            <Flex
                gap="3"
                mb="5"
                flexWrap="wrap"
                align="center"
            >
                <InputGroup maxW="320px" size="sm">
                    <InputLeftElement pointerEvents="none">
                        <Search size={14} color="var(--chakra-colors-gray-400)" />
                    </InputLeftElement>
                    <Input
                        placeholder="Search by name, email, phone..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        borderRadius="lg"
                        borderColor="gray.200"
                        _hover={{ borderColor: 'gray.300' }}
                        _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                        bg="white"
                    />
                </InputGroup>
                <Box minW="260px" flex="1" maxW="400px">
                    <Select<TagOption, true>
                        isMulti
                        options={tagOptionsForFilter}
                        value={selectedFilterTags}
                        onChange={handleTagFilterChange}
                        placeholder="Filter by tags..."
                        styles={{
                            control: (base) => ({
                                ...base,
                                minHeight: '32px',
                                borderRadius: '8px',
                                borderColor: '#E2E8F0',
                                fontSize: '14px',
                                '&:hover': { borderColor: '#CBD5E0' },
                            }),
                            menu: (base) => ({ ...base, zIndex: 10, borderRadius: '12px' }),
                            multiValue: (base) => ({ ...base, borderRadius: '6px', backgroundColor: '#F0FDFA' }),
                            multiValueLabel: (base) => ({ ...base, color: '#0D9488', fontSize: '12px' }),
                            multiValueRemove: (base) => ({ ...base, color: '#0D9488', ':hover': { backgroundColor: '#CCFBF1', color: '#0F766E' } }),
                        }}
                    />
                </Box>
                <Button
                    size="sm"
                    variant="ghost"
                    colorScheme="gray"
                    onClick={handleClearFilters}
                    borderRadius="lg"
                    leftIcon={<RotateCcw size={14} />}
                    fontWeight="500"
                >
                    Clear
                </Button>
            </Flex>

            {/* Loading state */}
            {isLoading && !clients.length && <TableSkeleton />}

            {/* Error state */}
            {error && (
                <Alert status="error" borderRadius="xl" mb="4">
                    <AlertIcon />
                    <AlertDescription fontSize="sm" flex="1">{error}</AlertDescription>
                    <Button size="xs" variant="ghost" onClick={loadClients} ml="2">Retry</Button>
                </Alert>
            )}
            
            {/* Empty states */}
            {!isLoading && !error && clients.length === 0 && (debouncedSearchTerm || selectedFilterTags.length > 0) && (
                <EmptyState
                    icon={Search}
                    title="No matching clients"
                    description="Try adjusting your search or filter criteria."
                    actionLabel="Clear Filters"
                    onAction={handleClearFilters}
                    compact
                />
            )}
            {!isLoading && !error && clients.length === 0 && !debouncedSearchTerm && selectedFilterTags.length === 0 && (
                <EmptyState
                    icon={Users}
                    title="No clients yet"
                    description="Add your first client to start managing appointments."
                    actionLabel="Add New Client"
                    onAction={onAddClient}
                />
            )}

            {/* Main Table */}
            {clients.length > 0 && (
                <Box
                    bg="white"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="gray.200"
                    overflow="hidden"
                >
                    <Box overflowX="auto">
                        <Table variant="simple" size="sm">
                            <Thead>
                                <Tr>
                                    {userProfile.role === 'super_admin' && (
                                        <Th
                                            bg="gray.50"
                                            fontSize="xs"
                                            fontWeight="600"
                                            textTransform="uppercase"
                                            letterSpacing="0.05em"
                                            color="gray.500"
                                            borderBottomColor="gray.200"
                                            cursor="pointer"
                                            _hover={{ color: 'gray.700' }}
                                            onClick={() => handleSort('id')}
                                            whiteSpace="nowrap"
                                        >
                                            <HStack spacing="1"><Text>ID</Text>{getSortIcon('id')}</HStack>
                                        </Th>
                                    )}
                                    <Th bg="gray.50" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" color="gray.500" borderBottomColor="gray.200" cursor="pointer" _hover={{ color: 'gray.700' }} onClick={() => handleSort('last_name')} whiteSpace="nowrap">
                                        <HStack spacing="1"><Text>Name</Text>{getSortIcon('last_name')}</HStack>
                                    </Th>
                                    <Th bg="gray.50" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" color="gray.500" borderBottomColor="gray.200" cursor="pointer" _hover={{ color: 'gray.700' }} onClick={() => handleSort('email')} whiteSpace="nowrap">
                                        <HStack spacing="1"><Text>Email</Text>{getSortIcon('email')}</HStack>
                                    </Th>
                                    <Th bg="gray.50" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" color="gray.500" borderBottomColor="gray.200">Phone</Th>
                                    <Th bg="gray.50" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" color="gray.500" borderBottomColor="gray.200" cursor="pointer" _hover={{ color: 'gray.700' }} onClick={() => handleSort('is_confirmed')} whiteSpace="nowrap">
                                        <HStack spacing="1"><Text>Status</Text>{getSortIcon('is_confirmed')}</HStack>
                                    </Th>
                                    {showDeletedClients && (
                                        <Th bg="gray.50" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" color="gray.500" borderBottomColor="gray.200">Archived</Th>
                                    )}
                                    <Th bg="gray.50" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" color="gray.500" borderBottomColor="gray.200">Tags</Th>
                                    <Th bg="gray.50" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" color="gray.500" borderBottomColor="gray.200" cursor="pointer" _hover={{ color: 'gray.700' }} onClick={() => handleSort('created_at')} whiteSpace="nowrap">
                                        <HStack spacing="1"><Text>Created</Text>{getSortIcon('created_at')}</HStack>
                                    </Th>
                                    <Th bg="gray.50" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" color="gray.500" borderBottomColor="gray.200" w="60px"></Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {clients.map((client: FetchedClient) => {
                                    const firstName = client.first_name || '';
                                    const lastName = client.last_name || '';
                                    const clientName = `${firstName} ${lastName}`.trim() || '(No Name)';
                                    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
                                    return (
                                        <Tr
                                            key={client.id}
                                            opacity={client.is_deleted ? 0.5 : 1}
                                            _hover={{ bg: 'gray.50' }}
                                            transition="background 0.1s ease"
                                        >
                                            {userProfile.role === 'super_admin' && (
                                                <Td borderBottomColor="gray.100" py="3">
                                                    <Text fontSize="xs" color="gray.400" fontFamily="mono">#{client.id}</Text>
                                                </Td>
                                            )}
                                            <Td borderBottomColor="gray.100" py="3">
                                                <HStack spacing="3">
                                                    <Avatar
                                                        size="sm"
                                                        name={clientName}
                                                        bg="brand.50"
                                                        color="brand.600"
                                                        fontSize="xs"
                                                        fontWeight="600"
                                                    />
                                                    <Box>
                                                        {client.is_deleted ? (
                                                            <Text fontSize="sm" fontWeight="500" color="gray.500">{clientName}</Text>
                                                        ) : (
                                                            <Text
                                                                as={Link}
                                                                to={`/dashboard/clients/${client.id}`}
                                                                fontSize="sm"
                                                                fontWeight="500"
                                                                color="gray.800"
                                                                _hover={{ color: 'brand.500', textDecoration: 'none' }}
                                                                transition="color 0.15s"
                                                            >
                                                                {clientName}
                                                            </Text>
                                                        )}
                                                    </Box>
                                                </HStack>
                                            </Td>
                                            <Td borderBottomColor="gray.100" py="3">
                                                <Text fontSize="sm" color="gray.600">{client.email || '—'}</Text>
                                            </Td>
                                            <Td borderBottomColor="gray.100" py="3">
                                                <Text fontSize="sm" color="gray.600">{client.phone_number || '—'}</Text>
                                            </Td>
                                            <Td borderBottomColor="gray.100" py="3">
                                                <Badge
                                                    colorScheme={client.is_confirmed ? 'green' : 'yellow'}
                                                    variant="subtle"
                                                    borderRadius="full"
                                                    px="2.5"
                                                    py="0.5"
                                                    fontSize="xs"
                                                    fontWeight="500"
                                                >
                                                    {client.is_confirmed ? 'Confirmed' : 'Unconfirmed'}
                                                </Badge>
                                            </Td>
                                            {showDeletedClients && (
                                                <Td borderBottomColor="gray.100" py="3">
                                                    <Badge
                                                        colorScheme={client.is_deleted ? 'red' : 'gray'}
                                                        variant="subtle"
                                                        borderRadius="full"
                                                        px="2.5"
                                                        py="0.5"
                                                        fontSize="xs"
                                                    >
                                                        {client.is_deleted ? 'Yes' : 'No'}
                                                    </Badge>
                                                </Td>
                                            )}
                                            <Td borderBottomColor="gray.100" py="3" position="relative">
                                                <Flex
                                                    gap="1"
                                                    flexWrap="wrap"
                                                    align="center"
                                                    cursor={canAssignTags && !client.is_deleted ? 'pointer' : 'default'}
                                                    onClick={canAssignTags && !client.is_deleted ? (e: React.MouseEvent) => { e.stopPropagation(); handleToggleTagEditor(editingTagsForClientId === client.id ? null : client.id); } : undefined}
                                                    role={canAssignTags && !client.is_deleted ? 'button' : undefined}
                                                    tabIndex={canAssignTags && !client.is_deleted ? 0 : undefined}
                                                    onKeyDown={canAssignTags && !client.is_deleted ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggleTagEditor(editingTagsForClientId === client.id ? null : client.id); } } : undefined}
                                                    _hover={canAssignTags && !client.is_deleted ? { opacity: 0.8 } : {}}
                                                    transition="opacity 0.15s"
                                                >
                                                    {client.tags?.length > 0 ? (
                                                        <>
                                                            {client.tags.slice(0, 3).map((tag: ClientTag) => (
                                                                <ChakraTag
                                                                    key={tag.id}
                                                                    size="sm"
                                                                    borderRadius="full"
                                                                    bg={tag.color_hex ? `${tag.color_hex}20` : 'gray.100'}
                                                                    color={tag.color_hex || 'gray.600'}
                                                                    border="1px solid"
                                                                    borderColor={tag.color_hex ? `${tag.color_hex}40` : 'gray.200'}
                                                                    px="2"
                                                                >
                                                                    <TagLabel fontSize="2xs" fontWeight="500">{tag.tag_name}</TagLabel>
                                                                </ChakraTag>
                                                            ))}
                                                            {client.tags.length > 3 && (
                                                                <Tooltip label={client.tags.slice(3).map(t => t.tag_name).join(', ')} fontSize="xs">
                                                                    <Badge
                                                                        fontSize="2xs"
                                                                        colorScheme="gray"
                                                                        borderRadius="full"
                                                                        variant="subtle"
                                                                        px="1.5"
                                                                    >
                                                                        +{client.tags.length - 3}
                                                                    </Badge>
                                                                </Tooltip>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <Text fontSize="xs" color="gray.400">—</Text>
                                                    )}
                                                </Flex>
                                                {editingTagsForClientId === client.id && (
                                                    <InlineTagEditor
                                                        client={client}
                                                        availableTagsForEditor={availableTagsForInlineEditor}
                                                        onAssignTag={handleAssignTagForInlineEditor}
                                                        onRemoveTag={handleRemoveTagForInlineEditor}
                                                        onClose={() => handleToggleTagEditor(null)}
                                                    />
                                                )}
                                            </Td>
                                            <Td borderBottomColor="gray.100" py="3">
                                                <Text fontSize="sm" color="gray.500">
                                                    {new Date(client.created_at).toLocaleDateString()}
                                                </Text>
                                            </Td>
                                            <Td borderBottomColor="gray.100" py="3">
                                                <ActionMenu
                                                    client={client}
                                                    canDelete={canDeleteClients}
                                                    onEdit={() => onEditClient(client)}
                                                    onDelete={() => onDeleteClient(client)}
                                                />
                                            </Td>
                                        </Tr>
                                    );
                                })}
                            </Tbody>
                        </Table>
                    </Box>
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        itemsPerPage={itemsPerPage}
                        totalItems={totalItems}
                        onItemsPerPageChange={handleItemsPerPageChange}
                    />
                </Box>
            )}
        </Box>
    );
};

export default ClientsTable;
