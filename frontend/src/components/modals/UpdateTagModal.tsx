// src/components/modals/UpdateTagModal.tsx
import React, { useState, useEffect } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    ModalCloseButton, Button, VStack, FormControl, FormLabel, Input,
    Alert, AlertIcon, HStack, Badge,
} from '@chakra-ui/react';
import { FetchedTag, TagUpdatePayload } from '../../api/tagApi';

interface UpdateTagModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (id: number, data: TagUpdatePayload) => Promise<void>;
    tag: FetchedTag | null;
}

const UpdateTagModal: React.FC<UpdateTagModalProps> = ({ isOpen, onClose, onSubmit, tag }) => {
    const [tagName, setTagName] = useState('');
    const [colorHex, setColorHex] = useState('#0D9488');
    const [iconId, setIconId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (tag && isOpen) {
            setTagName(tag.tag_name);
            setColorHex(tag.color_hex || '#0D9488');
            setIconId(tag.icon_identifier || '');
            setError(null);
            setIsSubmitting(false);
        }
    }, [tag, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tag) return;
        setError(null);
        if (!tagName) { setError("Tag name cannot be empty."); return; }
        if (colorHex && !/^#[0-9A-Fa-f]{6}$/.test(colorHex)) {
            setError("Invalid hex color format (e.g., #RRGGBB)."); return;
        }

        const payload: TagUpdatePayload = {};
        if (tagName !== tag.tag_name) payload.tag_name = tagName;
        if (colorHex !== (tag.color_hex || '#0D9488')) payload.color_hex = colorHex;
        if (iconId !== (tag.icon_identifier || '')) payload.icon_identifier = iconId;

        if (Object.keys(payload).length === 0) { setError("No changes detected."); return; }

        setIsSubmitting(true);
        try {
            await onSubmit(tag.id, payload);
        } catch (err: any) {
            setError(err.response?.data?.detail || "Failed to update tag.");
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
                    fontSize="lg" fontWeight="700" color="gray.900" letterSpacing="-0.025em"
                >
                    Update Tag
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
                                        {tagName || 'Preview'}
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
                        <Button type="submit" colorScheme="brand" isLoading={isSubmitting} loadingText="Updating..." borderRadius="lg" fontWeight="600">
                            Update Tag
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

export default UpdateTagModal;
