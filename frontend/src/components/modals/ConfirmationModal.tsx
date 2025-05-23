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
    Spinner, // For loading state on confirm button
    Flex,
} from '@chakra-ui/react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void> | void;
    title: string;
    bodyText?: string; // Simple text body
    children?: React.ReactNode; // Or more complex body content
    confirmButtonText?: string;
    cancelButtonText?: string;
    confirmButtonColorScheme?: string;
    isConfirmLoading?: boolean; // To show spinner on confirm button
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
    confirmButtonColorScheme = "red", // Default to red for destructive actions
    isConfirmLoading = false,
    hideCancelButton = false,
}) => {
    const handleConfirm = async () => {
        await onConfirm(); // Await if it's a promise
        // onClose(); // Caller should decide if modal closes on confirm, often yes.
                     // But if onConfirm itself navigates or causes unmount, onClose here might be redundant or cause issues.
                     // For now, let the onConfirm handler also manage closing if needed.
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{title}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                    {bodyText && <Text mb={children ? 4 : 0}>{bodyText}</Text>}
                    {children}
                </ModalBody>
                <ModalFooter>
                    {!hideCancelButton && (
                        <Button variant="outline" mr={3} onClick={onClose} isDisabled={isConfirmLoading}>
                            {cancelButtonText}
                        </Button>
                    )}
                    <Button
                        colorScheme={confirmButtonColorScheme}
                        onClick={handleConfirm}
                        isLoading={isConfirmLoading}
                        spinner={<Spinner size="sm" />}
                    >
                        {confirmButtonText}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ConfirmationModal;
