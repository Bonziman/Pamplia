// src/components/modals/ConfirmationModal.tsx
import React from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    Text,
    Spinner,
} from '@chakra-ui/react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void> | void;
    title: string;
    bodyText?: string;
    children?: React.ReactNode;
    confirmButtonText?: string;
    cancelButtonText?: string;
    confirmButtonColorScheme?: string;
    isConfirmLoading?: boolean;
    hideCancelButton?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    bodyText,
    children,
    confirmButtonText = "Confirm",
    cancelButtonText = "Cancel",
    confirmButtonColorScheme = "red",
    isConfirmLoading = false,
    hideCancelButton = false,
}) => {
    const handleConfirm = async () => {
        await onConfirm();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
            <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
            <ModalContent borderRadius="xl" mx={4}>
                <ModalHeader
                    borderBottomWidth="1px"
                    borderColor="gray.100"
                    fontSize="lg"
                    fontWeight="700"
                    color="gray.900"
                    letterSpacing="-0.025em"
                >
                    {title}
                </ModalHeader>
                <ModalCloseButton borderRadius="full" _hover={{ bg: 'gray.100' }} />
                <ModalBody py={6}>
                    {bodyText && <Text color="gray.600" mb={children ? 4 : 0}>{bodyText}</Text>}
                    {children}
                </ModalBody>
                <ModalFooter borderTopWidth="1px" borderColor="gray.100" gap={3}>
                    {!hideCancelButton && (
                        <Button
                            variant="outline"
                            onClick={onClose}
                            isDisabled={isConfirmLoading}
                            borderRadius="lg"
                            fontWeight="600"
                        >
                            {cancelButtonText}
                        </Button>
                    )}
                    <Button
                        colorScheme={confirmButtonColorScheme}
                        onClick={handleConfirm}
                        isLoading={isConfirmLoading}
                        spinner={<Spinner size="sm" />}
                        borderRadius="lg"
                        fontWeight="600"
                    >
                        {confirmButtonText}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ConfirmationModal;
