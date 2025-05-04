// src/components/TagManagementView.tsx
// --- NEW FILE ---

import React, { useState, useEffect, useCallback } from 'react';
import { fetchTags, deleteTag, FetchedTag } from '../api/tagApi'; // Import tag API functions
import CreateTagModal from './modals/CreateTagModal';
import UpdateTagModal from './modals/UpdateTagModal';
import DeleteTagModal from './modals/DeleteTagModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

import './TableStyles.css'; // Use common table styles
import './TagManagementView.css'; // Specific styles
import { createTag, updateTag } from '../api/tagApi';

// Define required props if any (e.g., userProfile for tenant context if needed, though API handles it)
interface TagManagementViewProps {
    // Add props if needed, e.g., userProfile
}

const TagManagementView: React.FC<TagManagementViewProps> = () => {
    const [tags, setTags] = useState<FetchedTag[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedTag, setSelectedTag] = useState<FetchedTag | null>(null);

    // Fetching Logic
    const loadTags = useCallback(() => {
        setIsLoading(true);
        setError(null);
        fetchTags()
            .then(data => setTags(data))
            .catch(err => {
                console.error("Failed to load tags", err);
                setError("Could not load tags.");
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        loadTags();
    }, [loadTags]);

    // CRUD Handlers (call API and reload list)
    const handleCreateTag = async (payload: any) => { // Use specific TagCreatePayload type
        // Assuming createTag is imported from tagApi
        await createTag(payload); // API function handles actual call
        
        loadTags(); // Reload list after creation
        setIsCreateModalOpen(false); // Close modal
    };

    const handleUpdateTag = async (id: number, payload: any) => { // Use specific TagUpdatePayload type
        // Assuming updateTag is imported
        await updateTag(id, payload);
        loadTags();
        setIsUpdateModalOpen(false);
        setSelectedTag(null);
    };

    const handleDeleteTag = async (id: number) => {
        // Assuming deleteTag is imported
        await deleteTag(id);
        loadTags();
        setIsDeleteModalOpen(false);
        setSelectedTag(null);
    };

    // Modal Open Handlers
    const handleOpenCreateModal = () => setIsCreateModalOpen(true);
    const handleOpenUpdateModal = (tag: FetchedTag) => {
      console.log('handleOpenUpdateModal called with tag:', tag); // DEBUG LINE
      if (!tag || typeof tag.id === 'undefined') {
          console.error('Attempting to open update modal with invalid tag data!');
          return; // Prevent opening with bad data
      }
      setSelectedTag(tag);
      setIsUpdateModalOpen(true);
  };
    const handleOpenDeleteModal = (tag: FetchedTag) => {
        setSelectedTag(tag);
        setIsDeleteModalOpen(true);
    };

    return (
        <div className="view-section tag-management-view">
            <div className="view-header">
                <h2>Manage Tags</h2>
                <button onClick={handleOpenCreateModal} className="button button-primary">Add New Tag</button>
            </div>

            {error && <div className="error-message">Error: {error}</div>}

            {isLoading ? (
                <div className="loading-message">Loading tags...</div>
            ) : (
                <div className="table-container">
                    <table className="data-table tags-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Color</th>
                                <th>Icon</th>
                                {/* Add Tenant ID column for Super Admin? */}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tags.length > 0 ? tags.map(tag => (
                                <tr key={tag.id}>
                                    <td>{tag.id}</td>
                                    <td>{tag.tag_name}</td>
                                    <td>
                                        <span className="color-preview" style={{ backgroundColor: tag.color_hex || '#CCCCCC' }}></span>
                                        {tag.color_hex || '#CCCCCC'}
                                    </td>
                                    <td>{tag.icon_identifier || '-'}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button onClick={() => handleOpenUpdateModal(tag)} className="button button-secondary button-small">
                                                <FontAwesomeIcon icon={faPencilAlt} /> Edit
                                            </button>
                                            <button onClick={() => handleOpenDeleteModal(tag)} className="button button-danger button-small">
                                                <FontAwesomeIcon icon={faTrashAlt} /> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5}>No tags found. Create one!</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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
                tag={selectedTag} // Pass selected tag data
            />
            <DeleteTagModal
                isOpen={isDeleteModalOpen}
                onClose={() => { setIsDeleteModalOpen(false); setSelectedTag(null); }}
                onConfirm={handleDeleteTag}
                tag={selectedTag} // Pass selected tag data
            />
        </div>
    );
};

export default TagManagementView;
