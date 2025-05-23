// src/components/staff/EditStaffForm.tsx
import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    VStack, FormControl, FormLabel, Input, FormErrorMessage, Button as ChakraButton,
    HStack, Text,
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
            <VStack spacing={4} align="stretch">
                <Text fontSize="sm" color="gray.600">
                    Editing details for: <strong>{staffMember.email}</strong> (Role: {staffMember.role})
                </Text>
                <FormControl isInvalid={!!errors.name} isRequired>
                    <FormLabel htmlFor="name">Full Name</FormLabel>
                    <Input id="name" {...register('name')} />
                    <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
                </FormControl>

                {/* 
                Example if you wanted to include is_active toggle here:
                (Requires UserUpdatePayload to accept is_active and updateUser API to handle it)
                <FormControl display="flex" alignItems="center">
                    <FormLabel htmlFor="is_active_edit" mb="0">
                        Account Active
                    </FormLabel>
                    <Switch 
                        id="is_active_edit" 
                        colorScheme="brand"
                        isChecked={currentIsActive} // Manage this with a local state
                        onChange={(e) => setCurrentIsActive(e.target.checked)}
                    />
                </FormControl>
                You would need to add `is_active: currentIsActive` to the payload.
                However, keeping activate/deactivate as a separate, direct action in the table might be clearer.
                */}

                {serverError && (
                    <Text color="red.500" fontSize="sm" textAlign="center">{serverError}</Text>
                )}

                <HStack justifyContent="flex-end" spacing={3} mt={4}>
                    <ChakraButton variant="outline" onClick={onCancel} isDisabled={isSubmitting}>
                        Cancel
                    </ChakraButton>
                    <ChakraButton
                        type="submit"
                        colorScheme="brand"
                        isLoading={isSubmitting}
                    >
                        Save Changes
                    </ChakraButton>
                </HStack>
            </VStack>
        </form>
    );
};

export default EditStaffForm;
