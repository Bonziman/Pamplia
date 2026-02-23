// src/components/modals/UpdateServiceModal.tsx
import React, { useState, useEffect } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    ModalCloseButton, Button, VStack, FormControl, FormLabel, Input, Textarea,
    Alert, AlertIcon, NumberInput, NumberInputField, Grid, GridItem,
    InputGroup, InputLeftElement,
} from '@chakra-ui/react';
import { FetchedService, ServiceUpdatePayload } from '../../api/serviceApi';

interface UpdateServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (id: number, data: ServiceUpdatePayload) => Promise<void>;
    service: FetchedService | null;
}

const UpdateServiceModal: React.FC<UpdateServiceModalProps> = ({ isOpen, onClose, onSubmit, service }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState<number | ''>('');
    const [price, setPrice] = useState<number | ''>('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (service && isOpen) {
            setName(service.name);
            setDescription(service.description || '');
            setDuration(service.duration_minutes);
            setPrice(service.price);
            setError(null); setIsSubmitting(false);
        }
    }, [service, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!service) return;
        setError(null);

        const payload: ServiceUpdatePayload = {};
        if (name !== service.name) payload.name = name;
        if (description !== (service.description || '')) payload.description = description || undefined;
        if (duration !== '' && Number(duration) !== service.duration_minutes) payload.duration_minutes = Number(duration);
        if (price !== '' && Number(price) !== service.price) payload.price = Number(price);

        if (Object.keys(payload).length === 0) { setError("No changes detected."); return; }
        if (isNaN(Number(duration)) || isNaN(Number(price))) { setError("Duration and Price must be valid numbers."); return; }

        setIsSubmitting(true);
        try {
            await onSubmit(service.id, payload);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to update service.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!service) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
            <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
            <ModalContent borderRadius="xl" mx={4}>
                <ModalHeader
                    borderBottomWidth="1px" borderColor="gray.100"
                    fontSize="lg" fontWeight="700" color="gray.900" letterSpacing="-0.025em"
                >
                    Update Service
                </ModalHeader>
                <ModalCloseButton borderRadius="full" _hover={{ bg: 'gray.100' }} />
                <form onSubmit={handleSubmit}>
                    <ModalBody py={6}>
                        <VStack spacing={4} align="stretch">
                            {error && (
                                <Alert status="error" borderRadius="lg" fontSize="sm">
                                    <AlertIcon /> {error}
                                </Alert>
                            )}
                            <FormControl isRequired>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Service Name</FormLabel>
                                <Input
                                    value={name} onChange={(e) => setName(e.target.value)}
                                    borderRadius="lg" bg="gray.50" _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                    isDisabled={isSubmitting}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Description</FormLabel>
                                <Textarea
                                    value={description} onChange={(e) => setDescription(e.target.value)}
                                    borderRadius="lg" bg="gray.50" _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                    rows={3} resize="vertical" isDisabled={isSubmitting}
                                />
                            </FormControl>
                            <Grid templateColumns="1fr 1fr" gap={4}>
                                <GridItem>
                                    <FormControl isRequired>
                                        <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Duration (minutes)</FormLabel>
                                        <NumberInput
                                            value={duration} onChange={(_, val) => setDuration(isNaN(val) ? '' : val)}
                                            min={1} isDisabled={isSubmitting}
                                        >
                                            <NumberInputField
                                                borderRadius="lg" bg="gray.50"
                                                _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                            />
                                        </NumberInput>
                                    </FormControl>
                                </GridItem>
                                <GridItem>
                                    <FormControl isRequired>
                                        <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Price</FormLabel>
                                        <InputGroup>
                                            <InputLeftElement pointerEvents="none" color="gray.400" fontSize="sm">$</InputLeftElement>
                                            <Input
                                                type="number" step="0.01"
                                                value={price} onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                                borderRadius="lg" bg="gray.50"
                                                _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                                isDisabled={isSubmitting}
                                            />
                                        </InputGroup>
                                    </FormControl>
                                </GridItem>
                            </Grid>
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
            </ModalContent>
        </Modal>
    );
};

export default UpdateServiceModal;
