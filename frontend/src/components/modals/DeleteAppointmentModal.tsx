// src/components/modals/DeleteAppointmentModal.tsx
import React, { useState } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    ModalCloseButton, Button, Text, VStack, Icon, Alert, AlertIcon,
} from '@chakra-ui/react';
import { AlertTriangle } from 'lucide-react';
import { FetchedAppointment } from '../../api/appointmentApi';
import { formatReadableDateTime } from '../../utils/formatDate';

interface DeleteAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (id: number) => Promise<void>;
    appointment: FetchedAppointment | null;
}

const DeleteAppointmentModal: React.FC<DeleteAppointmentModalProps> = ({
    isOpen, onClose, onConfirm, appointment,
}) => {
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!appointment) return;
        setError(null);
        setIsSubmitting(true);
        try {
            await onConfirm(appointment.id);
        } catch (apiError: any) {
            setError(apiError.response?.data?.detail || "Failed to delete appointment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setError(null);
        setIsSubmitting(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} isCentered size="md">
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
                    {appointment && (
                        <VStack spacing={4} textAlign="center">
                            <Icon as={AlertTriangle} boxSize={12} color="red.400" />
                            <Text color="gray.600" lineHeight="tall">
                                Are you sure you want to delete the appointment for{' '}
                                <Text as="span" fontWeight="700" color="gray.900">
                                    {appointment.client_name}
                                </Text>{' '}
                                at {formatReadableDateTime(appointment.appointment_time)}?
                            </Text>
                            {error && (
                                <Alert status="error" borderRadius="lg" fontSize="sm">
                                    <AlertIcon /> {error}
                                </Alert>
                            )}
                        </VStack>
                    )}
                </ModalBody>
                <ModalFooter borderTopWidth="1px" borderColor="gray.100" gap={3}>
                    <Button variant="outline" onClick={handleClose} isDisabled={isSubmitting} borderRadius="lg" fontWeight="600">
                        Cancel
                    </Button>
                    <Button colorScheme="red" onClick={handleConfirm} isLoading={isSubmitting} loadingText="Deleting..." borderRadius="lg" fontWeight="600">
                        Delete
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default DeleteAppointmentModal;
