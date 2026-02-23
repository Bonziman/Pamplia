// src/components/modals/DeleteTagModal.tsx
import React, { useState, useEffect } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    ModalCloseButton, Button, Text, VStack, Icon, Alert, AlertIcon, Badge,
} from '@chakra-ui/react';
import { AlertTriangle } from 'lucide-react';
import { FetchedTag } from '../../api/tagApi';

interface DeleteTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (id: number) => Promise<void>;
    tag: FetchedTag | null;
}

const DeleteTagModal: React.FC<DeleteTagModalProps> = ({ isOpen, onClose, onConfirm, tag }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) { setError(null); setIsSubmitting(false); }
    }, [isOpen]);

    const handleConfirm = async () => {
        if (!tag) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await onConfirm(tag.id);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to delete tag.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !tag) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
            <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
            <ModalContent borderRadius="xl" mx={4}>
                <ModalHeader
                    borderBottomWidth="1px" borderColor="gray.100"
                    fontSize="lg" fontWeight="700" color="gray.900"
                >
                    Confirm Deletion
                </ModalHeader>
                <ModalCloseButton borderRadius="full" _hover={{ bg: 'gray.100' }} />
                <ModalBody py={8}>
                    <VStack spacing={4} textAlign="center">
                        <Icon as={AlertTriangle} boxSize={12} color="red.400" />
                        <VStack spacing={2}>
                            <Text color="gray.600">Are you sure you want to permanently delete the tag:</Text>
                            <Badge
                                px={3} py={1} borderRadius="full" fontSize="md" fontWeight="600"
                                bg={tag.color_hex || '#CCCCCC'} color="white"
                            >
                                {tag.tag_name}
                            </Badge>
                        </VStack>
                        <Text fontSize="sm" color="gray.500">
                            This will remove the tag from all clients it is currently assigned to. This action cannot be undone.
                        </Text>
                        {error && (
                            <Alert status="error" borderRadius="lg" fontSize="sm">
                                <AlertIcon /> {error}
                            </Alert>
                        )}
                    </VStack>
                </ModalBody>
                <ModalFooter borderTopWidth="1px" borderColor="gray.100" gap={3}>
                    <Button variant="outline" onClick={onClose} isDisabled={isSubmitting} borderRadius="lg" fontWeight="600">
                        Cancel
                    </Button>
                    <Button colorScheme="red" onClick={handleConfirm} isLoading={isSubmitting} loadingText="Deleting..." borderRadius="lg" fontWeight="600">
                        Yes, Delete Tag
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default DeleteTagModal;
