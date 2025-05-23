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
    IconButton, // If you want a custom close button icon
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons'; // Example icon

interface RightDrawerModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode; // Content for the DrawerBody
    footerContent?: React.ReactNode; // Optional content for the DrawerFooter
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
    placement?: 'right' | 'left' | 'top' | 'bottom'; // Default to right
}

const RightDrawerModal: React.FC<RightDrawerModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footerContent,
    size = 'md', // Default size
    placement = 'right',
}) => {
    return (
        <Drawer isOpen={isOpen} placement={placement} onClose={onClose} size={size}>
            <DrawerOverlay />
            <DrawerContent>
                {/* 
                  DrawerCloseButton is convenient but can be replaced with a custom 
                  IconButton in the header if more control over styling/position is needed.
                */}
                <DrawerCloseButton /> 
                <DrawerHeader borderBottomWidth="1px" borderColor="gray.200">
                    {title}
                </DrawerHeader>

                <DrawerBody py="6"> {/* Add some default vertical padding to body */}
                    {children}
                </DrawerBody>

                {footerContent && (
                    <DrawerFooter borderTopWidth="1px" borderColor="gray.200">
                        {footerContent}
                    </DrawerFooter>
                )}
            </DrawerContent>
        </Drawer>
    );
};

export default RightDrawerModal;
