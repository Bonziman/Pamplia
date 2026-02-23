// src/components/modals/UpdateAppointmentModal.tsx
import React, { useState, useEffect } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    ModalCloseButton, Button, VStack, FormControl, FormLabel, Input, Select,
    Alert, AlertIcon, Grid, GridItem,
} from '@chakra-ui/react';
import { FetchedAppointment, AppointmentUpdatePayload } from '../../api/appointmentApi';
import { formatForDateTimeLocalInput } from '../../utils/formatDate';
import { AppointmentStatus } from '../../types/enums';

const appointmentStatuses = Object.values(AppointmentStatus);

interface UpdateAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (id: number, data: AppointmentUpdatePayload) => Promise<void>;
    appointment: FetchedAppointment | null;
}

const UpdateAppointmentModal: React.FC<UpdateAppointmentModalProps> = ({
    isOpen, onClose, onSubmit, appointment,
}) => {
    const [formData, setFormData] = useState<AppointmentUpdatePayload>({});
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (appointment) {
            const formattedTime = formatForDateTimeLocalInput(appointment.appointment_time);
            setFormData({
                client_name: appointment.client_name,
                client_email: appointment.client_email,
                appointment_time: formattedTime,
                status: appointment.status,
            });
            setError(null);
        } else {
            setFormData({});
        }
    }, [appointment]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!appointment) return;
        setError(null);
        setIsSubmitting(true);
        try {
            const payload: AppointmentUpdatePayload = {
                ...formData,
                appointment_time: formData.appointment_time
                    ? new Date(formData.appointment_time).toISOString()
                    : undefined,
            };
            await onSubmit(appointment.id, payload);
        } catch (apiError: any) {
            setError(apiError.response?.data?.detail || "Failed to update appointment.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
            <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
            <ModalContent borderRadius="xl" mx={4}>
                <ModalHeader
                    borderBottomWidth="1px" borderColor="gray.100"
                    fontSize="lg" fontWeight="700" color="gray.900" letterSpacing="-0.025em"
                >
                    Update Appointment #{appointment?.id}
                </ModalHeader>
                <ModalCloseButton borderRadius="full" _hover={{ bg: 'gray.100' }} />
                {appointment && (
                    <form onSubmit={handleSubmit}>
                        <ModalBody py={6}>
                            <VStack spacing={4} align="stretch">
                                {error && (
                                    <Alert status="error" borderRadius="lg" fontSize="sm">
                                        <AlertIcon /> {error}
                                    </Alert>
                                )}
                                <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                                    <GridItem>
                                        <FormControl>
                                            <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Client Name</FormLabel>
                                            <Input
                                                name="client_name" value={formData.client_name || ''}
                                                onChange={handleChange}
                                                borderRadius="lg" bg="gray.50"
                                                _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                                isDisabled={isSubmitting}
                                            />
                                        </FormControl>
                                    </GridItem>
                                    <GridItem>
                                        <FormControl>
                                            <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Client Email</FormLabel>
                                            <Input
                                                name="client_email" type="email"
                                                value={formData.client_email || ''}
                                                onChange={handleChange}
                                                borderRadius="lg" bg="gray.50"
                                                _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                                isDisabled={isSubmitting}
                                            />
                                        </FormControl>
                                    </GridItem>
                                </Grid>
                                <FormControl isRequired>
                                    <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Appointment Time</FormLabel>
                                    <Input
                                        name="appointment_time" type="datetime-local"
                                        value={formData.appointment_time || ''}
                                        onChange={handleChange}
                                        borderRadius="lg" bg="gray.50"
                                        _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                        isDisabled={isSubmitting}
                                    />
                                </FormControl>
                                <FormControl isRequired>
                                    <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Status</FormLabel>
                                    <Select
                                        name="status" value={formData.status || ''}
                                        onChange={handleChange}
                                        borderRadius="lg" bg="gray.50"
                                        _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                        isDisabled={isSubmitting}
                                    >
                                        {appointmentStatuses.map(statusValue => (
                                            <option key={statusValue} value={statusValue}>
                                                {statusValue.charAt(0).toUpperCase() + statusValue.slice(1).replace('_', ' ')}
                                            </option>
                                        ))}
                                    </Select>
                                </FormControl>
                            </VStack>
                        </ModalBody>
                        <ModalFooter borderTopWidth="1px" borderColor="gray.100" gap={3}>
                            <Button variant="outline" onClick={onClose} isDisabled={isSubmitting} borderRadius="lg" fontWeight="600">
                                Cancel
                            </Button>
                            <Button type="submit" colorScheme="brand" isLoading={isSubmitting} loadingText="Saving..." borderRadius="lg" fontWeight="600">
                                Save Changes
                            </Button>
                        </ModalFooter>
                    </form>
                )}
            </ModalContent>
        </Modal>
    );
};

export default UpdateAppointmentModal;
