// src/components/modals/CreateClientModal.tsx
import React, { useState, useEffect } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    ModalCloseButton, Button, VStack, FormControl, FormLabel, Input, Textarea,
    Alert, AlertIcon, Grid, GridItem,
} from '@chakra-ui/react';
import { ClientCreatePayload } from '../../api/clientApi';

interface CreateClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ClientCreatePayload) => Promise<void>;
}

const CreateClientModal: React.FC<CreateClientModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [birthday, setBirthday] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFirstName(''); setLastName(''); setEmail('');
            setPhone(''); setNotes(''); setBirthday('');
            setError(null); setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!firstName && !lastName && !email && !phone) {
            setError("At least one identifier (Name, Email, or Phone) is required.");
            return;
        }
        setIsSubmitting(true);
        const payload: ClientCreatePayload = {
            first_name: firstName || undefined,
            last_name: lastName || undefined,
            email: email || undefined,
            phone_number: phone || undefined,
            notes: notes || undefined,
            birthday: birthday || undefined,
        };
        try {
            await onSubmit(payload);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to create client.");
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
                    Add New Client
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
                            <Grid templateColumns="1fr 1fr" gap={4}>
                                <GridItem>
                                    <FormControl>
                                        <FormLabel fontSize="sm" fontWeight="600" color="gray.700">First Name</FormLabel>
                                        <Input
                                            value={firstName} onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="Jane" borderRadius="lg" bg="gray.50"
                                            _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                            isDisabled={isSubmitting}
                                        />
                                    </FormControl>
                                </GridItem>
                                <GridItem>
                                    <FormControl>
                                        <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Last Name</FormLabel>
                                        <Input
                                            value={lastName} onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Doe" borderRadius="lg" bg="gray.50"
                                            _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                            isDisabled={isSubmitting}
                                        />
                                    </FormControl>
                                </GridItem>
                            </Grid>
                            <Grid templateColumns="1fr 1fr" gap={4}>
                                <GridItem>
                                    <FormControl>
                                        <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Email</FormLabel>
                                        <Input
                                            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                            placeholder="jane@example.com" borderRadius="lg" bg="gray.50"
                                            _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                            isDisabled={isSubmitting}
                                        />
                                    </FormControl>
                                </GridItem>
                                <GridItem>
                                    <FormControl>
                                        <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Phone</FormLabel>
                                        <Input
                                            type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                                            placeholder="+1 (555) 000-0000" borderRadius="lg" bg="gray.50"
                                            _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                            isDisabled={isSubmitting}
                                        />
                                    </FormControl>
                                </GridItem>
                            </Grid>
                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Birthday</FormLabel>
                                <Input
                                    type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)}
                                    borderRadius="lg" bg="gray.50"
                                    _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                    isDisabled={isSubmitting} max="9999-12-31"
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Notes</FormLabel>
                                <Textarea
                                    value={notes} onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Any additional notes about the client"
                                    borderRadius="lg" bg="gray.50"
                                    _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                    rows={3} resize="vertical" isDisabled={isSubmitting}
                                />
                            </FormControl>
                        </VStack>
                    </ModalBody>
                    <ModalFooter borderTopWidth="1px" borderColor="gray.100" gap={3}>
                        <Button variant="outline" onClick={onClose} isDisabled={isSubmitting} borderRadius="lg" fontWeight="600">
                            Cancel
                        </Button>
                        <Button type="submit" colorScheme="brand" isLoading={isSubmitting} loadingText="Creating..." borderRadius="lg" fontWeight="600">
                            Create Client
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

export default CreateClientModal;
