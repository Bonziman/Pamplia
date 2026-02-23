// src/components/modals/CreateUpdateTemplateModal.tsx
import React, { useState, useEffect } from 'react';
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    ModalCloseButton, Button, VStack, FormControl, FormLabel, Input, Select,
    Textarea, Alert, AlertIcon, HStack, Switch, Text, Tooltip, Tag, Wrap, WrapItem,
    FormHelperText, Box, useToast,
} from '@chakra-ui/react';
import {
    TemplateOut, TemplateCreatePayload, TemplateUpdatePayload,
    TemplateEventTrigger, TemplateType, TEMPLATE_TRIGGER_LABELS, EMAIL_PLACEHOLDERS
} from '../../types/Template';
import { Copy, Info } from 'lucide-react';

interface CreateUpdateTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (templateId: number | null, data: TemplateCreatePayload | TemplateUpdatePayload) => Promise<void>;
    template?: TemplateOut | null;
}

const defaultFormData: TemplateCreatePayload = {
    name: '',
    type: TemplateType.EMAIL,
    event_trigger: TemplateEventTrigger.APPOINTMENT_BOOKED_CLIENT,
    email_subject: '',
    email_body: '',
    is_active: true,
};

const CreateUpdateTemplateModal: React.FC<CreateUpdateTemplateModalProps> = ({
    isOpen, onClose, onSave, template,
}) => {
    const isEditing = !!template;
    const [formData, setFormData] = useState<TemplateCreatePayload | TemplateUpdatePayload>(defaultFormData);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const toast = useToast();

    useEffect(() => {
        if (isOpen) {
            if (isEditing && template) {
                setFormData({
                    name: template.name,
                    email_subject: template.email_subject || '',
                    email_body: template.email_body,
                    is_active: template.is_active,
                });
            } else {
                setFormData(defaultFormData);
            }
            setError(null);
            setIsSaving(false);
        }
    }, [isOpen, isEditing, template]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        setFormData(prev => ({
            ...prev,
            [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value,
        }));
        setError(null);
    };

    const copyPlaceholder = (placeholder: string) => {
        navigator.clipboard.writeText(placeholder).then(() => {
            toast({ title: 'Copied!', description: placeholder, status: 'success', duration: 1500, isClosable: true, position: 'top' });
        }).catch(err => console.error('Copy failed: ', err));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);
        try {
            const payload = { ...formData };
            if (isEditing) {
                delete (payload as Partial<TemplateCreatePayload>).type;
                delete (payload as Partial<TemplateCreatePayload>).event_trigger;
            }
            await onSave(template?.id ?? null, payload);
        } catch (err: any) {
            const detail = err.response?.data?.detail || err.message || `Failed to ${isEditing ? 'update' : 'create'} template.`;
            setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const triggerOptions = Object.entries(TEMPLATE_TRIGGER_LABELS) as [TemplateEventTrigger, string][];

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl" scrollBehavior="inside">
            <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
            <ModalContent borderRadius="xl" mx={4}>
                <ModalHeader
                    borderBottomWidth="1px" borderColor="gray.100"
                    fontSize="lg" fontWeight="700" color="gray.900" letterSpacing="-0.025em"
                >
                    {isEditing ? 'Edit Template' : 'Create New Template'}
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

                            {/* Placeholders */}
                            <Box bg="gray.50" borderRadius="lg" p={4} borderWidth="1px" borderColor="gray.100">
                                <HStack mb={2}>
                                    <Text fontSize="sm" fontWeight="600" color="gray.700">
                                        <Info size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                                        Available Placeholders
                                    </Text>
                                </HStack>
                                <Wrap spacing={2}>
                                    {EMAIL_PLACEHOLDERS.map(p => (
                                        <WrapItem key={p.placeholder}>
                                            <Tooltip label={`${p.description} — Click to copy`} fontSize="xs" hasArrow>
                                                <Tag
                                                    size="sm" variant="subtle" colorScheme="brand"
                                                    cursor="pointer" onClick={() => copyPlaceholder(p.placeholder)}
                                                    _hover={{ bg: 'brand.100' }}
                                                    borderRadius="md" px={2} py={1}
                                                >
                                                    <HStack spacing={1}>
                                                        <Text fontSize="xs" fontFamily="mono">{p.placeholder}</Text>
                                                        <Copy size={10} />
                                                    </HStack>
                                                </Tag>
                                            </Tooltip>
                                        </WrapItem>
                                    ))}
                                </Wrap>
                            </Box>

                            <FormControl isRequired>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Template Name</FormLabel>
                                <Input
                                    name="name" value={formData.name || ''}
                                    onChange={handleInputChange}
                                    borderRadius="lg" bg="gray.50"
                                    _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                    isDisabled={isSaving}
                                />
                                <FormHelperText fontSize="xs" color="gray.500">
                                    A descriptive name (e.g., "Client Reminder Email").
                                </FormHelperText>
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Trigger Event</FormLabel>
                                <Select
                                    name="event_trigger"
                                    value={!isEditing ? (formData as TemplateCreatePayload).event_trigger : template?.event_trigger}
                                    onChange={handleInputChange}
                                    borderRadius="lg" bg="gray.50"
                                    _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                    isDisabled={isSaving || isEditing}
                                >
                                    {triggerOptions.map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </Select>
                                {isEditing && (
                                    <FormHelperText fontSize="xs" color="gray.500">
                                        Trigger event cannot be changed after creation.
                                    </FormHelperText>
                                )}
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Email Subject</FormLabel>
                                <Input
                                    name="email_subject" value={formData.email_subject || ''}
                                    onChange={handleInputChange}
                                    placeholder="e.g., Your Appointment Reminder for {{appointment_date}}"
                                    borderRadius="lg" bg="gray.50"
                                    _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                    isDisabled={isSaving}
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel fontSize="sm" fontWeight="600" color="gray.700">Email Body</FormLabel>
                                <Textarea
                                    name="email_body" value={formData.email_body || ''}
                                    onChange={handleInputChange} rows={10}
                                    placeholder="Enter email content here. Use placeholders like {{client_name}}..."
                                    borderRadius="lg" bg="gray.50"
                                    _focus={{ bg: 'white', borderColor: 'brand.500' }}
                                    isDisabled={isSaving} fontFamily="mono" fontSize="sm"
                                />
                            </FormControl>

                            <FormControl display="flex" alignItems="center" justifyContent="space-between" bg="gray.50" p={4} borderRadius="lg">
                                <Box>
                                    <Text fontSize="sm" fontWeight="600" color="gray.700">Active</Text>
                                    <Text fontSize="xs" color="gray.500">Inactive templates will not be sent.</Text>
                                </Box>
                                <Switch
                                    name="is_active"
                                    isChecked={formData.is_active ?? true}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                    colorScheme="brand" size="lg"
                                    isDisabled={isSaving}
                                />
                            </FormControl>
                        </VStack>
                    </ModalBody>
                    <ModalFooter borderTopWidth="1px" borderColor="gray.100" gap={3}>
                        <Button variant="outline" onClick={onClose} isDisabled={isSaving} borderRadius="lg" fontWeight="600">
                            Cancel
                        </Button>
                        <Button type="submit" colorScheme="brand" isLoading={isSaving} loadingText="Saving..." borderRadius="lg" fontWeight="600">
                            {isEditing ? 'Save Changes' : 'Create Template'}
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
};

export default CreateUpdateTemplateModal;
