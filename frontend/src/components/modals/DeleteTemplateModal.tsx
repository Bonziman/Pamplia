// src/components/modals/DeleteTemplateModal.tsx
import React, { useState, useEffect } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    ModalCloseButton, Button, Text, VStack, Icon, Alert, AlertIcon,
} from '@chakra-ui/react';
import { AlertTriangle } from 'lucide-react';
import { TemplateOut } from '../../types/Template';

interface DeleteTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmDelete: (templateId: number) => Promise<void>;
    template: TemplateOut | null;
}

const DeleteTemplateModal: React.FC<DeleteTemplateModalProps> = ({
    isOpen, onClose, onConfirmDelete, template,
}) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) { setError(null); setIsDeleting(false); }
    }, [isOpen]);

    const handleDelete = async () => {
        if (!template) return;
        setIsDeleting(true);
        setError(null);
        try {
            await onConfirmDelete(template.id);
        } catch (err: any) {
            const detail = err.response?.data?.detail || err.message || "Failed to delete template.";
            setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isOpen || !template) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
            <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
            <ModalContent borderRadius="xl" mx={4}>
                <ModalHeader
                    borderBottomWidth="1px" borderColor="gray.100"
                    fontSize="lg" fontWeight="700" color="gray.900"
                >
                    Delete Template
                </ModalHeader>
                <ModalCloseButton borderRadius="full" _hover={{ bg: 'gray.100' }} />
                <ModalBody py={8}>
                    <VStack spacing={4} textAlign="center">
                        <Icon as={AlertTriangle} boxSize={12} color="red.400" />
                        <VStack spacing={1}>
                            <Text color="gray.600">Are you sure you want to delete the template:</Text>
                            <Text fontWeight="700" color="gray.900" fontSize="lg">"{template.name}"</Text>
                        </VStack>
                        <Text fontSize="sm" color="gray.500">This action cannot be undone.</Text>
                        {error && (
                            <Alert status="error" borderRadius="lg" fontSize="sm">
                                <AlertIcon /> {error}
                            </Alert>
                        )}
                    </VStack>
                </ModalBody>
                <ModalFooter borderTopWidth="1px" borderColor="gray.100" gap={3}>
                    <Button variant="outline" onClick={onClose} isDisabled={isDeleting} borderRadius="lg" fontWeight="600">
                        Cancel
                    </Button>
                    <Button colorScheme="red" onClick={handleDelete} isLoading={isDeleting} loadingText="Deleting..." borderRadius="lg" fontWeight="600">
                        Delete Template
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default DeleteTemplateModal;
