// src/components/modals/CreateTagModal.tsx
import React, { useState, useEffect } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    ModalCloseButton, Button, VStack, FormControl, FormLabel, Input,
    Alert, AlertIcon, HStack, Badge,
} from '@chakra-ui/react';
import { TagCreatePayload } from '../../api/tagApi';

interface CreateTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: TagCreatePayload) => Promise<void>;
}

const CreateTagModal: React.FC<CreateTagModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [tagName, setTagName] = useState('');
    const [colorHex, setColorHex] = useState('#0D9488');
    const [iconId, setIconId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTagName(''); setColorHex('#0D9488'); setIconId('');
            setError(null); setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!tagName) { setError("Tag name is required."); return; }
        setIsSubmitting(true);
        const payload: TagCreatePayload = {
            tag_name: tagName,
            color_hex: colorHex || undefined,
            icon_identifier: iconId || undefined,
        };
        try {
            await onSubmit(payload);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to create tag.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
            <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
            <ModalContent borderRadius="xl" mx={4}>
                <ModalHeader
                    borderBottomWidth="1px" borderColor="gray.100"
                    fontSize="lg" fontWeight="700" color="gray.900" letterSpacing="-0.025em"
                >
                    Create New Tag
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
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Tag Name</FormLabel>
                                <Input
                                    value={tagName} onChange={e => setTagName(e.target.value)}
                                    placeholder="e.g., VIP, New Client"
                                    borderRadius="lg" bg="gray.50" _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                    isDisabled={isSubmitting}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Color</FormLabel>
                                <HStack spacing={3}>
                                    <Input
                                        type="color" value={colorHex} onChange={e => setColorHex(e.target.value)}
                                        w="50px" h="40px" p={1} borderRadius="lg" cursor="pointer"
                                        isDisabled={isSubmitting}
                                    />
                                    <Input
                                        value={colorHex} onChange={e => setColorHex(e.target.value)}
                                        placeholder="#000000" maxLength={7} w="120px"
                                        borderRadius="lg" bg="gray.50" _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                        fontSize="sm" isDisabled={isSubmitting}
                                    />
                                    <Badge px={3} py={1} borderRadius="full" bg={colorHex} color="white" fontSize="sm">
                                        Preview
                                    </Badge>
                                </HStack>
                            </FormControl>
                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Icon Identifier (Optional)</FormLabel>
                                <Input
                                    value={iconId} onChange={e => setIconId(e.target.value)}
                                    placeholder="e.g., fa-star"
                                    borderRadius="lg" bg="gray.50" _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                    isDisabled={isSubmitting}
                                />
                            </FormControl>
                        </VStack>
                    </ModalBody>
                    <ModalFooter borderTopWidth="1px" borderColor="gray.100" gap={3}>
                        <Button variant="outline" onClick={onClose} isDisabled={isSubmitting} borderRadius="lg" fontWeight="600">
                            Cancel
                        </Button>
                        <Button type="submit" colorScheme="brand" isLoading={isSubmitting} loadingText="Creating..." borderRadius="lg" fontWeight="600">
                            Create Tag
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

export default CreateTagModal;
