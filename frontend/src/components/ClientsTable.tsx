// src/components/ClientsTable.tsx
// --- FULL REPLACEMENT - REFACTORED FOR SERVER-SIDE DATA & FILTERS ---

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faEllipsisV, faPencilAlt, faTrashAlt, faSort, faSortUp, faSortDown,
    faTimes, faSpinner, faSearch, faFilter, faUndo
} from '@fortawesome/free-solid-svg-icons';
// Assuming react-select for a good multi-select experience. If not using, a simpler multi-select can be built.
// npm install react-select
// npm install @types/react-select
import Select, { MultiValue } from 'react-select'; // For tag filtering

import { FetchedClient, ClientTag, fetchClients, FetchClientsParams, PaginatedResponse } from '../api/clientApi'; // Ensure PaginatedResponse is exported
import { FetchedTag, fetchTags as fetchAvailableTenantTagsApi } from '../api/tagApi'; // Renamed import for clarity

import './TableStyles.css';
import './ClientsTable.css';

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


// --- Action Menu Component (Keep as is from your version) ---
interface ActionMenuProps {
    client: FetchedClient; // Pass full client for context if needed
    canDelete: boolean;
    onEdit: (client: FetchedClient) => void;
    onDelete: (client: FetchedClient) => void;
}
const ActionMenu: React.FC<ActionMenuProps> = ({ client, canDelete, onEdit, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleToggle = (e: React.MouseEvent) => { e.stopPropagation(); setIsOpen(!isOpen); };
    // Pass the full client object to onEdit/onDelete
    const handleEdit = (e: React.MouseEvent) => { e.stopPropagation(); onEdit(client); setIsOpen(false); };
    const handleDelete = (e: React.MouseEvent) => { e.stopPropagation(); onDelete(client); setIsOpen(false); };


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                const toggleButton = menuRef.current?.closest('.action-menu-container')?.querySelector('.action-menu-toggle');
                if (!toggleButton || !toggleButton.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="action-menu-container" ref={menuRef}>
            <button onClick={handleToggle} className="action-menu-toggle" aria-label="Actions" disabled={client.is_deleted}>
                <FontAwesomeIcon icon={faEllipsisV} />
            </button>
            {isOpen && (
                <div className="action-menu-dropdown">
                    {!client.is_deleted ? (
                        <>
                            <button onClick={handleEdit}><FontAwesomeIcon icon={faPencilAlt} fixedWidth /> Edit</button>
                            {canDelete && (<button onClick={handleDelete} className="action-delete"><FontAwesomeIcon icon={faTrashAlt} fixedWidth /> Delete</button>)}
                        </>
                    ) : (<span className="action-deleted">Deleted</span>)}
                </div>
            )}
        </div>
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
    if (totalItems === 0 && totalPages <=1) return <div className="pagination-controls no-results">No clients found.</div>;
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
        <div className="pagination-controls">
            <div className="pagination-info">
                Showing {itemStart}-{itemEnd} of {totalItems} clients
            </div>
            <div className="pagination-buttons">
                <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
                    {'<'} Previous
                </button>
                {startPage > 1 && (
                    <>
                        <button onClick={() => onPageChange(1)}>1</button>
                        {startPage > 2 && <span className="pagination-ellipsis">...</span>}
                    </>
                )}
                {pageNumbers.map(number => (
                    <button
                        key={number}
                        onClick={() => onPageChange(number)}
                        className={currentPage === number ? 'active' : ''}
                    >
                        {number}
                    </button>
                ))}
                {endPage < totalPages && (
                    <>
                        {endPage < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
                        <button onClick={() => onPageChange(totalPages)}>{totalPages}</button>
                    </>
                )}
                <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                    Next {'>'}
                </button>
            </div>
            <div className="items-per-page-selector">
                <label htmlFor="itemsPerPage">Items per page:</label>
                <select
                    id="itemsPerPage"
                    value={itemsPerPage}
                    onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                >
                    {[10, 25, 50, 100].map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
            </div>
        </div>
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
                            {removingTagId === tag.id ? <FontAwesomeIcon icon={faSpinner} spin size="xs"/> : <FontAwesomeIcon icon={faTimes} size="xs" />}
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
                                {assigningTagId === tag.id && <FontAwesomeIcon icon={faSpinner} spin size="xs"/>}
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

    const getSortIcon = (column: SortableClientColumns) => (
        sortColumn === column ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSort
    );

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
        <div className="view-section clients-view">
            <div className="view-header">
                <h2>Client Management</h2>
                <div className="view-controls">
                     {/* "Show Deleted" is controlled by parent via onToggleShowDeleted prop */}
                    <label className="checkbox-label">
                        <input type="checkbox" checked={showDeletedClients} onChange={onToggleShowDeleted} /> Show Deleted
                    </label>
                    <button onClick={onAddClient} className="button button-primary">Add New Client</button>
                </div>
            </div>

            {/* --- Filter Controls --- */}
            <div className="filters-bar client-filters">
                <div className="filter-group search-filter">
                    <FontAwesomeIcon icon={faSearch} className="filter-icon" />
                    <input
                        type="text"
                        placeholder="Search by name, email, phone..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="form-input search-input"
                    />
                </div>
                <div className="filter-group tag-filter">
                    <FontAwesomeIcon icon={faFilter} className="filter-icon" />
                    <Select<TagOption, true> // `true` for isMulti
                        isMulti
                        options={tagOptionsForFilter}
                        value={selectedFilterTags}
                        onChange={handleTagFilterChange}
                        placeholder="Filter by tags..."
                        className="tag-multiselect"
                        classNamePrefix="react-select"
                        styles={{ // Optional: basic styling for react-select
                            control: (base) => ({ ...base, minWidth: '250px' }),
                            menu: (base) => ({ ...base, zIndex: 5 }), // Ensure dropdown is on top
                        }}
                    />
                </div>
                <button onClick={handleClearFilters} className="button button-secondary clear-filters-btn">
                    <FontAwesomeIcon icon={faUndo} /> Clear Filters
                </button>
            </div>

            {isLoading && !clients.length ? ( <div className="loading-message">Loading clients...</div> ) : null}
            {error && ( <div className="error-message">Error: {error} <button onClick={loadClients}>Retry</button></div> )}
            
            {!isLoading && !error && clients.length === 0 && (debouncedSearchTerm || selectedFilterTags.length > 0) && (
                 <div className="no-results-message">No clients match your current filters.</div>
            )}
             {!isLoading && !error && clients.length === 0 && !debouncedSearchTerm && selectedFilterTags.length === 0 && (
                 <div className="no-results-message">No clients found. <button onClick={onAddClient} className="button-link">Add your first client.</button></div>
            )}


            {clients.length > 0 && (
                <>
                    <div className="table-container">
                        <table className="data-table clients-table">
                            <thead>
                                <tr>
                                    {userProfile.role === 'super_admin' && <th onClick={() => handleSort('id')}>ID <FontAwesomeIcon icon={getSortIcon('id')} /></th>}
                                    <th onClick={() => handleSort('name')}>Name <FontAwesomeIcon icon={getSortIcon('name')} /></th>
                                    <th onClick={() => handleSort('email')}>Email <FontAwesomeIcon icon={getSortIcon('email')} /></th>
                                    <th>Phone</th>
                                    <th onClick={() => handleSort('is_confirmed')}>Confirmed <FontAwesomeIcon icon={getSortIcon('is_confirmed')} /></th>
                                    {showDeletedClients && <th>Deleted</th>}
                                    {/* Removed Tenant ID column as it's usually implicit or for super_admin only if ALL tenants are shown */}
                                    {/* {userProfile.role === 'super_admin' && <th>Tenant ID</th>}  */}
                                    <th>Tags</th>
                                    <th onClick={() => handleSort('created_at')}>Created <FontAwesomeIcon icon={getSortIcon('created_at')} /></th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.map((client: FetchedClient) => {
                                    const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || '(No Name)';
                                    return (
                                        <tr key={client.id} className={client.is_deleted ? 'deleted-row' : ''}>
                                            {userProfile.role === 'super_admin' && <td>{client.id}</td>}
                                            <td>
                                                {client.is_deleted ? ( clientName ) : (
                                                    <Link to={`/dashboard/clients/${client.id}`} className="client-name-link">
                                                        {clientName}
                                                    </Link>
                                                )}
                                            </td>
                                            <td>{client.email || '-'}</td>
                                            <td>{client.phone_number || '-'}</td>
                                            <td><span className={`status-badge ${client.is_confirmed ? 'status-confirmed' : 'status-unconfirmed'}`}>{client.is_confirmed ? 'Yes' : 'No'}</span></td>
                                            {showDeletedClients && <td><span className={`status-badge ${client.is_deleted ? 'status-deleted-active' : 'status-active'}`}>{client.is_deleted ? 'Yes' : 'No'}</span></td>}
                                            {/* {userProfile.role === 'super_admin' && <td>{client.tenant_id}</td>} */}
                                            <td className="tags-column-cell" style={{ position: 'relative' }}>
                                                <div
                                                    className={`tag-cell ${canAssignTags && !client.is_deleted ? 'editable' : ''}`}
                                                    onClick={canAssignTags && !client.is_deleted ? (e) => { e.stopPropagation(); handleToggleTagEditor(editingTagsForClientId === client.id ? null : client.id); } : undefined}
                                                    title={canAssignTags && !client.is_deleted ? "Click to edit tags" : ""}
                                                >
                                                    {client.tags?.length > 0 ? client.tags.slice(0, 3).map((tag: ClientTag) => ( // Show max 3 tags initially
                                                        <span key={tag.id} className="tag" style={{ backgroundColor: tag.color_hex || '#CCCCCC', color: '#fff' }}>
                                                            {tag.tag_name}
                                                        </span>
                                                    )) : <span className="no-tags-assigned">-</span>}
                                                    {client.tags?.length > 3 && <span className="tag-more">+{client.tags.length - 3} more</span>}
                                                </div>
                                                {editingTagsForClientId === client.id && (
                                                    <InlineTagEditor
                                                        client={client}
                                                        availableTagsForEditor={availableTagsForInlineEditor}
                                                        onAssignTag={handleAssignTagForInlineEditor}
                                                        onRemoveTag={handleRemoveTagForInlineEditor}
                                                        onClose={() => handleToggleTagEditor(null)}
                                                    />
                                                )}
                                            </td>
                                            <td>{new Date(client.created_at).toLocaleDateString()}</td>
                                            <td>
                                                <ActionMenu
                                                    client={client}
                                                    canDelete={canDeleteClients}
                                                    onEdit={() => onEditClient(client)}    // Use prop from Dashboard
                                                    onDelete={() => onDeleteClient(client)}  // Use prop from Dashboard
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                        itemsPerPage={itemsPerPage}
                        totalItems={totalItems}
                        onItemsPerPageChange={handleItemsPerPageChange}
                    />
                </>
            )}
        </div>
    );
};

export default ClientsTable;
