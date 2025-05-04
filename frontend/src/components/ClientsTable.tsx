// src/components/ClientsTable.tsx
// --- FULL REPLACEMENT - CORRECTED & COMPLETE ---

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom'; // --- Import Link ---
// Make sure ClientTag is defined in clientApi.ts or a shared types file
import { FetchedClient, ClientTag } from '../api/clientApi';
import { FetchedTag } from '../api/tagApi'; // Import available tag type
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisV, faPencilAlt, faTrashAlt, faSort, faSortUp, faSortDown, faTimes, faSpinner } from '@fortawesome/free-solid-svg-icons';

import './TableStyles.css'; // Shared table styles
import './ClientsTable.css'; // Specific styles for this table/view


// --- Action Menu Component ---
interface ActionMenuProps {
    clientId: number; isDeleted: boolean; canDelete: boolean;
    onEdit: (clientId: number) => void; onDelete: (clientId: number) => void;
}
const ActionMenu: React.FC<ActionMenuProps> = ({ clientId, isDeleted, canDelete, onEdit, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const handleToggle = (e: React.MouseEvent) => { e.stopPropagation(); setIsOpen(!isOpen); };
    const handleEdit = (e: React.MouseEvent) => { e.stopPropagation(); onEdit(clientId); setIsOpen(false); };
    const handleDelete = (e: React.MouseEvent) => { e.stopPropagation(); onDelete(clientId); setIsOpen(false); };

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
            <button onClick={handleToggle} className="action-menu-toggle" aria-label="Actions">
                <FontAwesomeIcon icon={faEllipsisV} />
            </button>
            {isOpen && (
                <div className="action-menu-dropdown">
                    {!isDeleted ? (
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

// --- Pagination Controls Component ---
interface PaginationProps { currentPage: number; totalPages: number; onPageChange: (page: number) => void; }
const PaginationControls: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
     if (totalPages <= 1) return null;
    const pageNumbers = []; const maxPagesToShow = 5; let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2)); let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    if (endPage - startPage + 1 < maxPagesToShow) { startPage = Math.max(1, endPage - maxPagesToShow + 1); }
    for (let i = startPage; i <= endPage; i++) { pageNumbers.push(i); }
    return (
        <div className="pagination-controls">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>{'<'} Previous</button>
            {startPage > 1 && (<><button onClick={() => onPageChange(1)}>1</button>{startPage > 2 && <span>...</span>}</>)}
            {pageNumbers.map(number => (<button key={number} onClick={() => onPageChange(number)} className={currentPage === number ? 'active' : ''}>{number}</button>))}
            {endPage < totalPages && (<>{endPage < totalPages - 1 && <span>...</span>}<button onClick={() => onPageChange(totalPages)}>{totalPages}</button></>)}
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next {'>'}</button>
        </div>
    );
};


// --- Inline Tag Editor (Integrated) ---
interface InlineTagEditorProps {
    client: FetchedClient; availableTags: FetchedTag[];
    onAssignTag: (clientId: number, tagId: number) => Promise<void>; onRemoveTag: (clientId: number, tagId: number) => Promise<void>;
    onClose: () => void;
}
const InlineTagEditor: React.FC<InlineTagEditorProps> = ({ client, availableTags, onAssignTag, onRemoveTag, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [assigningTagId, setAssigningTagId] = useState<number | null>(null);
    const [removingTagId, setRemovingTagId] = useState<number | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => { // Close popover if clicking outside
        const handleClickOutside = (event: MouseEvent) => { if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) onClose(); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const filteredAvailableTags = useMemo(() => {
        const assignedTagIds = new Set(client.tags?.map(t => t.id) ?? []);
        return availableTags.filter(tag => !assignedTagIds.has(tag.id) && tag.tag_name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [availableTags, client.tags, searchTerm]);

    const handleAssign = async (tagId: number) => { setAssigningTagId(tagId); try { await onAssignTag(client.id, tagId); setSearchTerm(''); } catch (e) { /* Parent handles error */ } finally { setAssigningTagId(null); } };
    const handleRemove = async (tagId: number) => { setRemovingTagId(tagId); try { await onRemoveTag(client.id, tagId); } catch (e) { /* Parent handles error */ } finally { setRemovingTagId(null); } };

    return (
        <div className="inline-tag-editor-popover" ref={popoverRef} onClick={e => e.stopPropagation()}>
            <button className="inline-tag-editor-close" onClick={onClose}>×</button>
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
                <input type="text" placeholder="Assign tag..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="tag-search-input" autoFocus />
                <ul className="available-tags-list">
                    {filteredAvailableTags.length > 0 ? filteredAvailableTags.map(tag => (
                        <li key={tag.id}>
                            <button onClick={() => handleAssign(tag.id)} disabled={assigningTagId === tag.id} className="assign-tag-btn">
                                <span className="tag" style={{ backgroundColor: tag.color_hex || '#CCCCCC' }}>{tag.tag_name}</span>
                                {assigningTagId === tag.id && <FontAwesomeIcon icon={faSpinner} spin size="xs"/>}
                            </button>
                        </li>
                    )) : (searchTerm && <li><i>No matching tags</i></li>)}
                </ul>
            </div>
        </div>
    );
};

// --- Main ClientsTable Component ---
interface ClientsTableProps {
    clients: FetchedClient[]; isLoading: boolean; userProfile: { role: string; tenant_id?: number | null; };
    showDeletedClients: boolean; canDeleteClients: boolean;
    onAddClient: () => void; onEditClient: (client: FetchedClient) => void; onDeleteClient: (client: FetchedClient) => void; onToggleShowDeleted: () => void;
    availableTags: FetchedTag[]; onAssignTag: (clientId: number, tagId: number) => Promise<void>; onRemoveTag: (clientId: number, tagId: number) => Promise<void>; canAssignTags: boolean;
}
type SortableClientColumns = 'id' | 'name' | 'email' | 'is_confirmed';

const ClientsTable: React.FC<ClientsTableProps> = ({
    clients, isLoading, userProfile, showDeletedClients, canDeleteClients, onAddClient, onEditClient, onDeleteClient, onToggleShowDeleted,
    availableTags, onAssignTag, onRemoveTag, canAssignTags
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortColumn, setSortColumn] = useState<SortableClientColumns | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [editingTagsForClientId, setEditingTagsForClientId] = useState<number | null>(null);

    // --- Derived Data ---
    const sortedClients = useMemo(() => {
        // --- Sorting Logic ---
        if (!sortColumn) return clients; // Return original if no sort applied

        const sorted = [...clients].sort((a, b) => {
            let aValue: string | number | boolean = '';
            let bValue: string | number | boolean = '';

            switch (sortColumn) {
                case 'id':
                    aValue = a.id;
                    bValue = b.id;
                    break;
                case 'name':
                    aValue = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
                    bValue = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
                    break;
                case 'email':
                    aValue = a.email?.toLowerCase() || '';
                    bValue = b.email?.toLowerCase() || '';
                    break;
                case 'is_confirmed':
                    aValue = a.is_confirmed;
                    bValue = b.is_confirmed;
                    break;
            }

            // Comparison logic
            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted; // Return the sorted array
        // --- End Sorting Logic ---
    }, [clients, sortColumn, sortDirection]);

    const totalPages = Math.ceil(sortedClients.length / itemsPerPage);

    const paginatedClients = useMemo(() => {
        // --- Pagination Logic ---
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return sortedClients.slice(startIndex, endIndex); // Return the sliced array
        // --- End Pagination Logic ---
    }, [sortedClients, currentPage, itemsPerPage]);

    // --- Handlers ---
    const handlePageChange = (page: number) => setCurrentPage(page);
    const handleSort = (column: SortableClientColumns) => {
        setSortDirection(prev => (sortColumn === column && prev === 'asc' ? 'desc' : 'asc'));
        setSortColumn(column);
        setCurrentPage(1); // Reset page on sort
    };
    const getSortIcon = (column: SortableClientColumns) => (sortColumn === column ? (sortDirection === 'asc' ? faSortUp : faSortDown) : faSort);
    const handleEditClick = (clientId: number) => { const client = clients.find(c => c.id === clientId); if (client) onEditClient(client); };
    const handleDeleteClick = (clientId: number) => { const client = clients.find(c => c.id === clientId); if (client) onDeleteClient(client); };
    const handleToggleTagEditor = (clientId: number | null) => setEditingTagsForClientId(clientId);

    // --- Render ---
    return (
        <div className="view-section clients-view">
            <div className="view-header">
                <h2>Client Management</h2>
                <div className="view-controls">
                    <label className="checkbox-label"><input type="checkbox" checked={showDeletedClients} onChange={onToggleShowDeleted} /> Show Deleted</label>
                    <button onClick={onAddClient} className="button button-primary">Add New Client</button>
                </div>
            </div>

            {isLoading ? ( <div className="loading-message">Loading clients...</div> ) : (
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
                                    {userProfile.role === 'super_admin' && <th>Tenant ID</th>}
                                    <th>Tags</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedClients.length > 0 ? paginatedClients.map((c: FetchedClient) => {
                                    const clientName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || '-';
                                    return (
                                        <tr key={c.id} className={c.is_deleted ? 'deleted-row' : ''}>
                                            {userProfile.role === 'super_admin' && <th>{c.id}</th>}
                                            <td>
                                                {c.is_deleted ? ( clientName ) : (
                                                    <Link to={`/dashboard/clients/${c.id}`} className="client-name-link">
                                                        {clientName}
                                                    </Link>
                                                )}
                                            </td>
                                            <td>{c.email || '-'}</td>
                                            <td>{c.phone_number || '-'}</td>
                                            <td><span className={`status-badge ${c.is_confirmed ? 'status-confirmed' : 'status-unconfirmed'}`}>{c.is_confirmed ? 'Yes' : 'No'}</span></td>
                                            {showDeletedClients && <td><span className={`status-badge ${c.is_deleted ? 'status-deleted-active' : 'status-active'}`}>{c.is_deleted ? 'Yes' : 'No'}</span></td>}
                                            {userProfile.role === 'super_admin' && <td>{c.tenant_id}</td>}
                                            <td className="tags-column-cell" style={{ position: 'relative' }}>
                                                <div
                                                    className={`tag-cell ${canAssignTags && !c.is_deleted ? 'editable' : ''}`}
                                                    onClick={canAssignTags && !c.is_deleted ? (e) => { e.stopPropagation(); handleToggleTagEditor(editingTagsForClientId === c.id ? null : c.id); } : undefined}
                                                    title={canAssignTags && !c.is_deleted ? "Click to edit tags" : ""}
                                                >
                                                    {c.tags?.length > 0 ? c.tags.map((tag: ClientTag) => (
                                                        <span key={tag.id} className="tag" style={{ backgroundColor: tag.color_hex || '#CCCCCC', color: '#fff' }}>
                                                            {tag.tag_name}
                                                        </span>
                                                    )) : <span className="no-tags-assigned">-</span>}
                                                </div>
                                                {editingTagsForClientId === c.id && (
                                                    <InlineTagEditor
                                                        client={c}
                                                        availableTags={availableTags}
                                                        onAssignTag={onAssignTag}
                                                        onRemoveTag={onRemoveTag}
                                                        onClose={() => handleToggleTagEditor(null)}
                                                    />
                                                )}
                                            </td>
                                            <td><ActionMenu clientId={c.id} isDeleted={c.is_deleted} canDelete={canDeleteClients} onEdit={handleEditClick} onDelete={handleDeleteClick} /></td>
                                        </tr>
                                    );
                                })
                                : ( <tr><td colSpan={userProfile.role === 'super_admin' ? (showDeletedClients ? 9 : 8) : (showDeletedClients ? 8 : 7)}>No clients found matching criteria.</td></tr> )}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                </>
            )}
        </div>
    );
};

export default ClientsTable;
