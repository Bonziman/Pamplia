// src/components/modals/RightDrawerModal.tsx
import React from 'react';
import {
    Drawer,
    DrawerBody,
    DrawerFooter,
    DrawerHeader,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
} from '@chakra-ui/react';

interface RightDrawerModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footerContent?: React.ReactNode;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
    placement?: 'right' | 'left' | 'top' | 'bottom';
}

const RightDrawerModal: React.FC<RightDrawerModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footerContent,
    size = 'md',
    placement = 'right',
}) => {
    return (
        <Drawer isOpen={isOpen} placement={placement} onClose={onClose} size={size}>
            <DrawerOverlay bg="blackAlpha.400" backdropFilter="blur(4px)" />
            <DrawerContent
                borderLeftRadius="2xl"
                boxShadow="-8px 0 30px rgba(0,0,0,0.08)"
            >
                <DrawerCloseButton
                    top={4}
                    right={4}
                    borderRadius="full"
                    _hover={{ bg: 'gray.100' }}
                />
                <DrawerHeader
                    borderBottomWidth="1px"
                    borderColor="gray.100"
                    fontSize="lg"
                    fontWeight="700"
                    color="gray.900"
                    letterSpacing="-0.025em"
                    py={5}
                    px={6}
                >
                    {title}
                </DrawerHeader>

                <DrawerBody py={6} px={6}>
                    {children}
                </DrawerBody>

                {footerContent && (
                    <DrawerFooter
                        borderTopWidth="1px"
                        borderColor="gray.100"
                        gap={3}
                        py={4}
                        px={6}
                    >
                        {footerContent}
                    </DrawerFooter>
                )}
            </DrawerContent>
        </Drawer>
    );
};

export default RightDrawerModal;
