// src/components/staff/EditStaffForm.tsx
import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    VStack, FormControl, FormLabel, Input, FormErrorMessage, Button as ChakraButton,
    HStack, Box, Text, Badge, Alert, AlertIcon,
} from '@chakra-ui/react';
import { UserOut, UserUpdatePayload } from '../../types/User'; // UserUpdatePayload should allow name
import { updateUser } from '../../api/userApi'; // Using the general updateUser API
import { useBrandedToast } from '../../hooks/useBrandedToast';

interface EditStaffFormProps {
    staffMember: UserOut;
    onSubmitSuccess: () => void;
    onCancel: () => void;
}

// Validation schema for editing staff (only name for now)
const editSchema = yup.object().shape({
    name: yup.string().trim().min(2, 'Name is too short').required('Name is required'),
    // email: yup.string().email('Invalid email format'), // Usually email changes are more complex
    // is_active: yup.boolean(), // If you move is_active toggle here
});

// Define the form data type based on what UserUpdatePayload accepts for name
interface EditStaffFormData {
    name: string;
    // email?: string; // If allowing email edit
}


const EditStaffForm: React.FC<EditStaffFormProps> = ({ staffMember, onSubmitSuccess, onCancel }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<EditStaffFormData>({
        resolver: yupResolver(editSchema),
        defaultValues: {
            name: staffMember.name,
        },
    });
    const toast = useBrandedToast();
    const [serverError, setServerError] = useState<string | null>(null);

    // Reset form if staffMember prop changes (e.g., opening modal for different user)
    useEffect(() => {
        reset({ name: staffMember.name });
    }, [staffMember, reset]);


    const onSubmit: SubmitHandler<EditStaffFormData> = async (data) => {
        setServerError(null);
        const payload: UserUpdatePayload = {
            name: data.name,
            // If you add more fields like email or role to UserUpdatePayload for this form:
            // email: data.email,
        };

        try {
            await updateUser(staffMember.id, payload); // Uses the general user update API
            onSubmitSuccess();
        } catch (error: any) {
            const errMsg = error.response?.data?.detail || "Failed to update staff member. Please try again.";
            setServerError(errMsg);
            toast({
                title: 'Update Failed',
                description: errMsg,
                status: 'error',
            });
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <VStack spacing={5} align="stretch">
                <Box bg="gray.50" borderRadius="xl" p={4} borderWidth="1px" borderColor="gray.100">
                    <VStack spacing={1} align="start">
                        <Text fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">Staff Member</Text>
                        <Text fontSize="sm" fontWeight="600" color="gray.800">{staffMember.email}</Text>
                        <Badge colorScheme={staffMember.role === 'admin' ? 'purple' : 'brand'} borderRadius="full" px={2} fontSize="xs" mt={1}>
                            {staffMember.role}
                        </Badge>
                    </VStack>
                </Box>

                <FormControl isInvalid={!!errors.name} isRequired>
                    <FormLabel htmlFor="name" fontSize="sm" fontWeight="medium" color="gray.600">Full Name</FormLabel>
                    <Input
                        id="name"
                        {...register('name')}
                        placeholder="Full name"
                        borderRadius="lg"
                        bg="gray.50"
                        _focus={{ bg: 'white', borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                        _hover={{ borderColor: 'gray.300' }}
                    />
                    <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
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
                        Save Changes
                    </ChakraButton>
                </HStack>
            </VStack>
        </form>
    );
};

export default EditStaffForm;
