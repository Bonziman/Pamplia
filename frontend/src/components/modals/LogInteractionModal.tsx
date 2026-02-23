// src/components/modals/LogInteractionModal.tsx
import React, { useState, useEffect } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    ModalCloseButton, Button, VStack, FormControl, FormLabel, Input, Select,
    Textarea, Alert, AlertIcon, RadioGroup, Radio, HStack, Text, Spinner,
    FormHelperText,
} from '@chakra-ui/react';
import {
    ManualLogCreatePayload, MANUAL_CHANNELS, MANUAL_DIRECTIONS, CommunicationChannel, CommunicationDirection
} from '../../types/Communication';
import { FetchedAppointment } from '../../api/appointmentApi';
import { fetchClientAppointments } from '../../api/clientApi';

interface LogInteractionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (payload: ManualLogCreatePayload) => Promise<void>;
    clientId: number | null;
}

const getDefaultFormData = (clientId: number | null): Partial<ManualLogCreatePayload> => ({
    client_id: clientId ?? undefined,
    channel: CommunicationChannel.PHONE,
    direction: CommunicationDirection.OUTBOUND,
    notes: '',
    subject: '',
    appointment_id: undefined,
    timestamp: undefined,
});

const LogInteractionModal: React.FC<LogInteractionModalProps> = ({
    isOpen, onClose, onSave, clientId,
}) => {
    const [formData, setFormData] = useState<Partial<ManualLogCreatePayload>>(getDefaultFormData(clientId));
    const [clientAppointments, setClientAppointments] = useState<FetchedAppointment[]>([]);
    const [isLoadingAppts, setIsLoadingAppts] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && clientId) {
            setIsLoadingAppts(true);
            fetchClientAppointments(clientId)
                .then(data => setClientAppointments(data))
                .catch(err => console.error("Failed to fetch client appointments for modal", err))
                .finally(() => setIsLoadingAppts(false));
            setFormData(getDefaultFormData(clientId));
            setError(null);
            setIsSaving(false);
        }
    }, [isOpen, clientId]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === '' ? undefined : value }));
        setError(null);
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value === "" ? undefined : parseInt(value, 10),
        }));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!clientId || !formData.channel || !formData.direction || !formData.notes) {
            setError("Please fill in all required fields (Channel, Direction, Notes).");
            return;
        }
        setIsSaving(true);
        setError(null);
        const payload: ManualLogCreatePayload = {
            client_id: clientId,
            channel: formData.channel as CommunicationChannel,
            direction: formData.direction as CommunicationDirection,
            notes: formData.notes,
            subject: formData.subject || undefined,
            appointment_id: formData.appointment_id || undefined,
            timestamp: formData.timestamp || undefined,
        };
        try {
            await onSave(payload);
        } catch (err: any) {
            const detail = err.response?.data?.detail || err.message || "Failed to save log entry.";
            setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || clientId === null) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg" scrollBehavior="inside">
            <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
            <ModalContent borderRadius="xl" mx={4}>
                <ModalHeader
                    borderBottomWidth="1px" borderColor="gray.100"
                    fontSize="lg" fontWeight="700" color="gray.900" letterSpacing="-0.025em"
                >
                    Log Manual Interaction
                </ModalHeader>
                <ModalCloseButton borderRadius="full" _hover={{ bg: 'gray.100' }} />
                <form onSubmit={handleSubmit}>
                    <ModalBody py={6}>
                        <VStack spacing={5} align="stretch">
                            {error && (
                                <Alert status="error" borderRadius="lg" fontSize="sm">
                                    <AlertIcon /> {error}
                                </Alert>
                            )}

                            <FormControl isRequired>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Channel</FormLabel>
                                <RadioGroup
                                    value={formData.channel}
                                    onChange={(val) => { setFormData(prev => ({ ...prev, channel: val as CommunicationChannel })); setError(null); }}
                                >
                                    <HStack spacing={4} flexWrap="wrap">
                                        {MANUAL_CHANNELS.map(chan => (
                                            <Radio
                                                key={chan.value} value={chan.value}
                                                colorScheme="brand" isDisabled={isSaving}
                                                borderColor="gray.300"
                                            >
                                                <Text fontSize="sm">{chan.label}</Text>
                                            </Radio>
                                        ))}
                                    </HStack>
                                </RadioGroup>
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Direction</FormLabel>
                                <RadioGroup
                                    value={formData.direction}
                                    onChange={(val) => { setFormData(prev => ({ ...prev, direction: val as CommunicationDirection })); setError(null); }}
                                >
                                    <HStack spacing={4}>
                                        {MANUAL_DIRECTIONS.map(dir => (
                                            <Radio
                                                key={dir.value} value={dir.value}
                                                colorScheme="brand" isDisabled={isSaving}
                                                borderColor="gray.300"
                                            >
                                                <Text fontSize="sm">{dir.label}</Text>
                                            </Radio>
                                        ))}
                                    </HStack>
                                </RadioGroup>
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Date & Time</FormLabel>
                                <Input
                                    type="datetime-local" name="timestamp"
                                    value={formData.timestamp || ''}
                                    onChange={handleInputChange}
                                    borderRadius="lg" bg="gray.50"
                                    _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                    isDisabled={isSaving}
                                />
                                <FormHelperText fontSize="xs" color="gray.500">
                                    Defaults to now if left blank. Allows backdating.
                                </FormHelperText>
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Subject / Summary</FormLabel>
                                <Input
                                    name="subject" value={formData.subject || ''}
                                    onChange={handleInputChange} maxLength={255}
                                    placeholder="e.g., Call re: Reschedule"
                                    borderRadius="lg" bg="gray.50"
                                    _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                    isDisabled={isSaving}
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Notes</FormLabel>
                                <Textarea
                                    name="notes" value={formData.notes || ''}
                                    onChange={handleInputChange} rows={5}
                                    placeholder="Enter details about the interaction..."
                                    borderRadius="lg" bg="gray.50"
                                    _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                    isDisabled={isSaving}
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">
                                    Link to Appointment {isLoadingAppts && <Spinner size="xs" ml={2} />}
                                </FormLabel>
                                <Select
                                    name="appointment_id"
                                    value={formData.appointment_id || ''}
                                    onChange={handleSelectChange}
                                    borderRadius="lg" bg="gray.50"
                                    _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                    isDisabled={isSaving || isLoadingAppts}
                                    placeholder="-- Select Appointment --"
                                >
                                    {clientAppointments
                                        .sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime())
                                        .map(appt => (
                                            <option key={appt.id} value={appt.id}>
                                                {new Date(appt.appointment_time).toLocaleDateString()} @ {new Date(appt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({appt.services?.map(s => s.name).join(', ') || 'Service'})
                                            </option>
                                        ))
                                    }
                                    {!isLoadingAppts && clientAppointments.length === 0 && (
                                        <option disabled>No appointments found</option>
                                    )}
                                </Select>
                            </FormControl>
                        </VStack>
                    </ModalBody>
                    <ModalFooter borderTopWidth="1px" borderColor="gray.100" gap={3}>
                        <Button variant="outline" onClick={onClose} isDisabled={isSaving} borderRadius="lg" fontWeight="600">
                            Cancel
                        </Button>
                        <Button type="submit" colorScheme="brand" isLoading={isSaving} loadingText="Saving..." borderRadius="lg" fontWeight="600">
                            Save Log Entry
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

export default LogInteractionModal;
