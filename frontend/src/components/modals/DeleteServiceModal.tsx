// src/components/modals/DeleteServiceModal.tsx
import React, { useState, useEffect } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    ModalCloseButton, Button, Text, VStack, Icon, Alert, AlertIcon,
} from '@chakra-ui/react';
import { AlertTriangle } from 'lucide-react';
import { FetchedService } from '../../api/serviceApi';

interface DeleteServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (id: number) => Promise<void>;
    service: FetchedService | null;
}

const DeleteServiceModal: React.FC<DeleteServiceModalProps> = ({ isOpen, onClose, onConfirm, service }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) { setError(null); setIsSubmitting(false); }
    }, [isOpen]);

    const handleConfirm = async () => {
        if (!service) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await onConfirm(service.id);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to delete service.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!service) return null;

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
                        <VStack spacing={1}>
                            <Text color="gray.600">Are you sure you want to delete the service:</Text>
                            <Text fontWeight="700" color="gray.900" fontSize="lg">{service.name}</Text>
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
                    <Button variant="outline" onClick={onClose} isDisabled={isSubmitting} borderRadius="lg" fontWeight="600">
                        Cancel
                    </Button>
                    <Button colorScheme="red" onClick={handleConfirm} isLoading={isSubmitting} loadingText="Deleting..." borderRadius="lg" fontWeight="600">
                        Yes, Delete
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default DeleteServiceModal;
