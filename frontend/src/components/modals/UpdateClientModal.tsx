// src/components/modals/UpdateClientModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    ModalCloseButton, Button, VStack, HStack, FormControl, FormLabel, Input, Textarea,
    Alert, AlertIcon, Grid, GridItem, Checkbox, Heading, Tag, TagLabel, TagCloseButton,
    Wrap, WrapItem, Text, Spinner, Box, InputGroup, InputLeftElement, Divider,
} from '@chakra-ui/react';
import { Search } from 'lucide-react';
import { FetchedClient, ClientUpdatePayload } from '../../api/clientApi';
import { FetchedTag } from '../../api/tagApi';

interface UpdateClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (id: number, data: ClientUpdatePayload) => Promise<void>;
    client: FetchedClient | null;
    availableTags: FetchedTag[];
    onAssignTag: (clientId: number, tagId: number) => Promise<void>;
    onRemoveTag: (clientId: number, tagId: number) => Promise<void>;
    canAssignTags: boolean;
}

const UpdateClientModal: React.FC<UpdateClientModalProps> = ({
    isOpen, onClose, onSubmit, client,
    availableTags, onAssignTag, onRemoveTag, canAssignTags,
}) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [notes, setNotes] = useState('');
    const [birthday, setBirthday] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [tagSearchTerm, setTagSearchTerm] = useState('');
    const [tagError, setTagError] = useState<string | null>(null);
    const [assigningTagId, setAssigningTagId] = useState<number | null>(null);
    const [removingTagId, setRemovingTagId] = useState<number | null>(null);

    useEffect(() => {
        if (client && isOpen) {
            setFirstName(client.first_name || ''); setLastName(client.last_name || '');
            setEmail(client.email || ''); setPhone(client.phone_number || '');
            setNotes(client.notes || ''); setBirthday(client.birthday || '');
            setIsConfirmed(client.is_confirmed);
            setTagSearchTerm(''); setTagError(null); setAssigningTagId(null); setRemovingTagId(null);
            setError(null); setIsSubmitting(false);
        }
    }, [client, isOpen]);

    const filteredAvailableTagsForModal = useMemo(() => {
        if (!client) return [];
        const assignedTagIds = new Set(client.tags.map(t => t.id));
        return availableTags.filter(tag =>
            !assignedTagIds.has(tag.id) &&
            tag.tag_name.toLowerCase().includes(tagSearchTerm.toLowerCase())
        );
    }, [availableTags, client?.tags, tagSearchTerm]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!client) return;
        setError(null); setTagError(null);

        const payload: ClientUpdatePayload = {};
        if (firstName !== (client.first_name || '')) payload.first_name = firstName;
        if (lastName !== (client.last_name || '')) payload.last_name = lastName;
        if (email !== (client.email || '')) payload.email = email;
        if (phone !== (client.phone_number || '')) payload.phone_number = phone;
        if (notes !== (client.notes || '')) payload.notes = notes;
        if (birthday !== (client.birthday || '')) payload.birthday = birthday;
        if (isConfirmed !== client.is_confirmed) payload.is_confirmed = isConfirmed;

        setIsSubmitting(true);
        try {
            await onSubmit(client.id, payload);
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to update client.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleModalAssignTag = async (tagId: number) => {
        if (!client || !canAssignTags) return;
        setAssigningTagId(tagId); setTagError(null);
        try {
            await onAssignTag(client.id, tagId);
            setTagSearchTerm('');
        } catch (e) { setTagError("Failed to assign tag."); }
        finally { setAssigningTagId(null); }
    };

    const handleModalRemoveTag = async (tagId: number) => {
        if (!client || !canAssignTags) return;
        setRemovingTagId(tagId); setTagError(null);
        try {
            await onRemoveTag(client.id, tagId);
        } catch (e) { setTagError("Failed to remove tag."); }
        finally { setRemovingTagId(null); }
    };

    if (!isOpen || !client) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl" scrollBehavior="inside">
            <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
            <ModalContent borderRadius="xl" mx={4}>
                <ModalHeader
                    borderBottomWidth="1px" borderColor="gray.100"
                    fontSize="lg" fontWeight="700" color="gray.900" letterSpacing="-0.025em"
                >
                    Update Client
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

                            {/* Core Fields */}
                            <Grid templateColumns="1fr 1fr" gap={4}>
                                <GridItem>
                                    <FormControl>
                                        <FormLabel fontSize="sm" fontWeight="600" color="gray.700">First Name</FormLabel>
                                        <Input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                                            borderRadius="lg" bg="gray.50" _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                            isDisabled={isSubmitting} />
                                    </FormControl>
                                </GridItem>
                                <GridItem>
                                    <FormControl>
                                        <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Last Name</FormLabel>
                                        <Input value={lastName} onChange={(e) => setLastName(e.target.value)}
                                            borderRadius="lg" bg="gray.50" _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                            isDisabled={isSubmitting} />
                                    </FormControl>
                                </GridItem>
                            </Grid>
                            <Grid templateColumns="1fr 1fr" gap={4}>
                                <GridItem>
                                    <FormControl>
                                        <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Email</FormLabel>
                                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                            borderRadius="lg" bg="gray.50" _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                            isDisabled={isSubmitting} />
                                    </FormControl>
                                </GridItem>
                                <GridItem>
                                    <FormControl>
                                        <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Phone</FormLabel>
                                        <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                                            borderRadius="lg" bg="gray.50" _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                            isDisabled={isSubmitting} />
                                    </FormControl>
                                </GridItem>
                            </Grid>
                            <Grid templateColumns="1fr 1fr" gap={4}>
                                <GridItem>
                                    <FormControl>
                                        <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Birthday</FormLabel>
                                        <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)}
                                            borderRadius="lg" bg="gray.50" _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                            isDisabled={isSubmitting} max="9999-12-31" />
                                    </FormControl>
                                </GridItem>
                                <GridItem display="flex" alignItems="flex-end">
                                    <Checkbox
                                        isChecked={isConfirmed}
                                        onChange={(e) => setIsConfirmed(e.target.checked)}
                                        colorScheme="brand" size="lg" isDisabled={isSubmitting}
                                    >
                                        <Text fontSize="sm" fontWeight="500" color="gray.700">Client Confirmed</Text>
                                    </Checkbox>
                                </GridItem>
                            </Grid>
                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Notes</FormLabel>
                                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                                    borderRadius="lg" bg="gray.50" _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                    rows={3} resize="vertical" isDisabled={isSubmitting} />
                            </FormControl>

                            {/* Tag Management */}
                            {canAssignTags && (
                                <>
                                    <Divider />
                                    <Box>
                                        <Heading as="h4" size="sm" color="gray.700" fontWeight="600" mb={3}>Tags</Heading>
                                        {tagError && (
                                            <Alert status="error" borderRadius="lg" fontSize="sm" mb={3}>
                                                <AlertIcon /> {tagError}
                                            </Alert>
                                        )}
                                        {/* Assigned Tags */}
                                        <Wrap spacing={2} mb={3}>
                                            {client.tags?.length > 0 ? client.tags.map(tag => (
                                                <WrapItem key={tag.id}>
                                                    <Tag
                                                        size="md" borderRadius="full" variant="solid"
                                                        bg={tag.color_hex || '#CCCCCC'} color="white"
                                                    >
                                                        <TagLabel fontWeight="500">{tag.tag_name}</TagLabel>
                                                        <TagCloseButton
                                                            onClick={() => handleModalRemoveTag(tag.id)}
                                                            isDisabled={removingTagId === tag.id}
                                                        />
                                                        {removingTagId === tag.id && <Spinner size="xs" ml={1} />}
                                                    </Tag>
                                                </WrapItem>
                                            )) : (
                                                <Text fontSize="sm" color="gray.400" fontStyle="italic">No tags assigned.</Text>
                                            )}
                                        </Wrap>
                                        {/* Search & Assign */}
                                        <InputGroup size="sm" mb={2}>
                                            <InputLeftElement pointerEvents="none">
                                                <Search size={14} color="#9CA3AF" />
                                            </InputLeftElement>
                                            <Input
                                                value={tagSearchTerm} onChange={(e) => setTagSearchTerm(e.target.value)}
                                                placeholder="Search tags to assign..."
                                                borderRadius="lg" bg="gray.50" _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                            />
                                        </InputGroup>
                                        {tagSearchTerm && (
                                            <VStack align="stretch" spacing={1} maxH="120px" overflowY="auto">
                                                {filteredAvailableTagsForModal.length > 0 ? filteredAvailableTagsForModal.map(tag => (
                                                    <HStack
                                                        key={tag.id} px={3} py={1.5} borderRadius="lg" cursor="pointer"
                                                        _hover={{ bg: 'gray.50' }}
                                                        onClick={() => handleModalAssignTag(tag.id)}
                                                        opacity={assigningTagId === tag.id ? 0.6 : 1}
                                                    >
                                                        <Tag size="sm" borderRadius="full" bg={tag.color_hex || '#CCCCCC'} color="white">
                                                            <TagLabel>{tag.tag_name}</TagLabel>
                                                        </Tag>
                                                        {assigningTagId === tag.id && <Spinner size="xs" />}
                                                    </HStack>
                                                )) : (
                                                    <Text fontSize="sm" color="gray.400" fontStyle="italic" px={3} py={1}>No matching tags found.</Text>
                                                )}
                                            </VStack>
                                        )}
                                    </Box>
                                </>
                            )}
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

export default UpdateClientModal;
