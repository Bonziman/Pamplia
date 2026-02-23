// src/components/modals/CreateServiceModal.tsx
import React, { useState, useEffect } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    ModalCloseButton, Button, VStack, FormControl, FormLabel, Input, Textarea,
    Alert, AlertIcon, NumberInput, NumberInputField, Grid, GridItem, Heading,
    InputGroup, InputLeftElement, Text,
} from '@chakra-ui/react';
import { ServiceCreatePayload } from '../../api/serviceApi';

interface CreateServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ServiceCreatePayload) => Promise<void>;
    userProfile: { role: string; tenant_id?: number | null };
}

const CreateServiceModal: React.FC<CreateServiceModalProps> = ({ isOpen, onClose, onSubmit, userProfile }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [duration, setDuration] = useState<number | ''>('');
    const [price, setPrice] = useState<number | ''>('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName(''); setDescription(''); setDuration(''); setPrice('');
            setError(null); setIsSubmitting(false);
        }
    }, [isOpen, userProfile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!name || duration === '' || price === '') {
            setError("Name, Duration, and Price are required.");
            return;
        }
        if (isNaN(Number(duration)) || isNaN(Number(price))) {
            setError("Duration and Price must be valid numbers.");
            return;
        }
        const payload: ServiceCreatePayload = {
            name,
            description: description || undefined,
            duration_minutes: Number(duration),
            price: Number(price),
        };
        setIsSubmitting(true);
        try {
            await onSubmit(payload);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to create service.");
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
                    Create New Service
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
                                    placeholder="e.g., Haircut, Consultation"
                                    borderRadius="lg" bg="gray.50" _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                    isDisabled={isSubmitting}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Description</FormLabel>
                                <Textarea
                                    value={description} onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief description of the service"
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
                                                placeholder="30" borderRadius="lg" bg="gray.50"
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
                                                placeholder="0.00" borderRadius="lg" bg="gray.50"
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
                        <Button type="submit" colorScheme="brand" isLoading={isSubmitting} loadingText="Creating..." borderRadius="lg" fontWeight="600">
                            Create Service
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

export default CreateServiceModal;
