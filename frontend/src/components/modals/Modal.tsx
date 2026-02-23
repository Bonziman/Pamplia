// src/components/modals/Modal.tsx
import React, { ReactNode } from 'react';
import {
  Modal as ChakraModal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
} from '@chakra-ui/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'lg' }) => {
  return (
    <ChakraModal isOpen={isOpen} onClose={onClose} size={size} isCentered scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
      <ModalContent borderRadius="xl" mx={4}>
        <ModalCloseButton borderRadius="full" _hover={{ bg: 'gray.100' }} />
        {title && (
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
        )}
        <ModalBody py={6}>
          {children}
        </ModalBody>
      </ModalContent>
    </ChakraModal>
  );
};

export default Modal;
