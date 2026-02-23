// src/components/staff/InviteStaffForm.tsx
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    VStack, FormControl, FormLabel, Input, FormErrorMessage, Button as ChakraButton,
    Select, HStack, Alert, AlertIcon, Grid, GridItem,
} from '@chakra-ui/react';
import { InvitationCreatePayload } from '../../types/Invitation'; // Adjust the import based on your project structure
import { inviteStaff } from '../../api/staffApi';
import { useBrandedToast } from '../../hooks/useBrandedToast'; // Your custom toast hook

interface InviteStaffFormProps {
    onSubmitSuccess: () => void; // To close drawer and refresh list
    onCancel: () => void;
}

// Validation schema for the form
const inviteSchema = yup.object().shape({
    email: yup.string().email('Invalid email format').required('Email is required'),
    first_name: yup.string().trim().min(1, 'First name is required').required('First name is required'),
    last_name: yup.string().trim().min(1, 'Last name is required').required('Last name is required'),
    role_to_assign: yup.string().oneOf(['staff', 'admin'], 'Invalid role').required('Role is required'),
});

const InviteStaffForm: React.FC<InviteStaffFormProps> = ({ onSubmitSuccess, onCancel }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<InvitationCreatePayload>({
        resolver: yupResolver(inviteSchema),
        defaultValues: {
            role_to_assign: 'staff', // Default role
        },
    });
    const toast = useBrandedToast();
    const [serverError, setServerError] = useState<string | null>(null);

    const onSubmit: SubmitHandler<InvitationCreatePayload> = async (data) => {
        setServerError(null);
        try {
            await inviteStaff(data);
            onSubmitSuccess(); // Call parent's success handler
            reset(); // Reset form fields
        } catch (error: any) {
            const errMsg = error.response?.data?.detail || "Failed to send invitation. Please try again.";
            setServerError(errMsg);
            toast({
                title: 'Invitation Failed',
                description: errMsg,
                status: 'error',
            });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <VStack spacing={5} align="stretch">
                <FormControl isInvalid={!!errors.email} isRequired>
                    <FormLabel htmlFor="email" fontSize="sm" fontWeight="medium" color="gray.600">Email Address</FormLabel>
                    <Input
                        id="email"
                        type="email"
                        {...register('email')}
                        placeholder="staff@example.com"
                        borderRadius="lg"
                        bg="gray.50"
                        _focus={{ bg: 'white', borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                        _hover={{ borderColor: 'gray.300' }}
                    />
                    <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
                </FormControl>

                <Grid templateColumns="1fr 1fr" gap={4}>
                    <GridItem>
                        <FormControl isInvalid={!!errors.first_name} isRequired>
                            <FormLabel htmlFor="first_name" fontSize="sm" fontWeight="medium" color="gray.600">First Name</FormLabel>
                            <Input
                                id="first_name"
                                {...register('first_name')}
                                placeholder="First name"
                                borderRadius="lg"
                                bg="gray.50"
                                _focus={{ bg: 'white', borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                                _hover={{ borderColor: 'gray.300' }}
                            />
                            <FormErrorMessage>{errors.first_name?.message}</FormErrorMessage>
                        </FormControl>
                    </GridItem>
                    <GridItem>
                        <FormControl isInvalid={!!errors.last_name} isRequired>
                            <FormLabel htmlFor="last_name" fontSize="sm" fontWeight="medium" color="gray.600">Last Name</FormLabel>
                            <Input
                                id="last_name"
                                {...register('last_name')}
                                placeholder="Last name"
                                borderRadius="lg"
                                bg="gray.50"
                                _focus={{ bg: 'white', borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                                _hover={{ borderColor: 'gray.300' }}
                            />
                            <FormErrorMessage>{errors.last_name?.message}</FormErrorMessage>
                        </FormControl>
                    </GridItem>
                </Grid>

                <FormControl isInvalid={!!errors.role_to_assign} isRequired>
                    <FormLabel htmlFor="role_to_assign" fontSize="sm" fontWeight="medium" color="gray.600">Assign Role</FormLabel>
                    <Select
                        id="role_to_assign"
                        {...register('role_to_assign')}
                        borderRadius="lg"
                        bg="gray.50"
                        _focus={{ bg: 'white', borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                        _hover={{ borderColor: 'gray.300' }}
                    >
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                    </Select>
                    <FormErrorMessage>{errors.role_to_assign?.message}</FormErrorMessage>
                </FormControl>

                {serverError && (
                    <Alert status="error" borderRadius="lg" fontSize="sm">
                        <AlertIcon />
                        {serverError}
                    </Alert>
                )}

                <HStack justifyContent="flex-end" spacing={3} mt={4}>
                    <ChakraButton
                        variant="outline"
                        onClick={onCancel}
                        isDisabled={isSubmitting}
                        borderRadius="lg"
                        fontWeight="600"
                    >
                        Cancel
                    </ChakraButton>
                    <ChakraButton
                        type="submit"
                        colorScheme="brand"
                        isLoading={isSubmitting}
                        borderRadius="lg"
                        fontWeight="600"
                    >
                        Send Invitation
                    </ChakraButton>
                </HStack>
            </VStack>
        </form>
    );
};

export default InviteStaffForm;
