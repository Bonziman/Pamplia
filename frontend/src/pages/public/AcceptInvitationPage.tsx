// src/pages/public/AcceptInvitationPage.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Flex, Box, Heading, Text, FormControl, FormLabel, Input, Button as ChakraButton,
    VStack, Spinner, Center, Alert, AlertIcon, AlertTitle, AlertDescription, FormErrorMessage, InputGroup, InputRightElement, IconButton
} from '@chakra-ui/react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';

import { useAuth } from '../../auth/authContext'; // For login after success
import { acceptInvitation, ValidateTokenResponse, validateInvitationToken } from '../../api/staffApi'; // Assuming staffApi.ts exists
import { InvitationAcceptPayload } from '../../types/Invitation'; // You'll need to define this type
import { useBrandedToast } from '../../hooks/useBrandedToast'; // Your custom toast hook
import type { UserProfile } from '@/types/User';

// Define the form schema
const validationSchema = yup.object().shape({
    first_name: yup.string().required('First name is required').min(2, 'First name is too short'),
    last_name: yup.string().required('Last name is required').min(2, 'Last name is too short'),
    password: yup.string().required('Password is required').min(8, 'Password must be at least 8 characters'),
    confirmPassword: yup.string()
        .oneOf([yup.ref('password'), undefined], 'Passwords must match') // Use undefined for yup v1+
        .required('Confirm password is required'),
});

type AcceptInvitationFormData = Omit<InvitationAcceptPayload, 'token'>; // first_name, last_name, password

const AcceptInvitationPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login: contextLogin } = useAuth(); // Get login function from auth context
    const toast = useBrandedToast();

    const token = searchParams.get('token');

    const [validationState, setValidationState] = useState<'validating' | 'valid' | 'invalid'>('validating');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [inviteDetails, setInviteDetails] = useState<Partial<ValidateTokenResponse>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);


    const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<AcceptInvitationFormData>({
        resolver: yupResolver(validationSchema),
    });

    useEffect(() => {
        if (!token) {
            setValidationState('invalid');
            setValidationError('Invitation token is missing. Please check the link.');
            return;
        }

        const checkToken = async () => {
            try {
                setValidationState('validating');
                const response = await validateInvitationToken(token);
                if (response.valid) {
                    setInviteDetails({
                        email: response.email,
                        first_name: response.first_name,
                        last_name: response.last_name,
                    });
                    setValue('first_name', response.first_name || '');
                    setValue('last_name', response.last_name || '');
                    setValidationState('valid');
                } else {
                    setValidationState('invalid');
                    setValidationError(response.message || 'This invitation link is invalid or has expired.');
                }
            } catch (error: any) {
                setValidationState('invalid');
                setValidationError(error.response?.data?.detail || error.message || 'Failed to validate invitation. Please try again.');
            }
        };
        checkToken();
    }, [token, setValue]);

    const { manuallySetUserSession } = useAuth(); // Get the new function
    const onSubmit: SubmitHandler<AcceptInvitationFormData> = async (data) => {
        if (!token) {
            toast({ title: "Error", description: "Token missing.", status: "error" });
            return;
        }
        try {
            const payload: InvitationAcceptPayload = {
                token,
                password: data.password,
                first_name: data.first_name,
                last_name: data.last_name,
            };
            // This API call is successful and the backend SETS THE HTTPONLY COOKIE
            const response = await acceptInvitation(payload); 
            // response is: { access_token: string, token_type: string, user: UserOut }

            console.log("AcceptInvitationPage: Response from acceptInvitation API:", response);

            // MANUALLY update the AuthContext with the user data received from the API
            // This makes the app immediately aware of the authenticated user.
            // The HttpOnly cookie is already set by the browser from the previous API response.
            // The `response.user` should match the `UserProfile` type structure.
            if (response.user) {
                manuallySetUserSession(response.user as UserProfile, response.access_token); // Pass token if needed by manuallySetUserSession
            } else {
                // This should ideally not happen if API call was successful
                throw new Error("User data not found in activation response.");
            }
            
            toast({
                title: `Welcome, ${response.user.name}!`,
                description: "Your account has been successfully activated.",
                status: 'success',
                colorScheme: 'brand'
                // maybe add duration too later
            });
            navigate('/dashboard/overview'); 
        } catch (error: any) {
            const errorMessage = error.response?.data?.detail || error.message || "Failed to complete account activation process.";
            toast({ title: "Activation Process Failed", description: errorMessage, status: "error" });
            console.error("Error during onSubmit in AcceptInvitationPage:", error);
        }
    };

    const handleTogglePassword = () => setShowPassword(!showPassword);
    const handleToggleConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

    if (validationState === 'validating') {
        return (
            <Center h="100vh">
                <Spinner size="xl" color="brand.500" thickness="4px" />
                <Text ml="3">Validating invitation...</Text>
            </Center>
        );
    }

    if (validationState === 'invalid') {
        return (
            <Center h="100vh" flexDirection="column" p="6">
                <Alert status="error" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" borderRadius="md" maxWidth="400px">
                    <AlertIcon boxSize="40px" mr={0} />
                    <AlertTitle mt={4} mb={1} fontSize="lg">Invitation Invalid</AlertTitle>
                    <AlertDescription maxWidth="sm">{validationError}</AlertDescription>
                </Alert>
                <ChakraButton mt="6" colorScheme="brand" onClick={() => navigate('/login')}>Go to Login</ChakraButton>
            </Center>
        );
    }

    // If validationState === 'valid', show the form
    return (
        <Flex minH="100vh" align="center" justify="center" bg="gray.50" p="4">
            <Box
                bg="white"
                p={{ base: "6", md: "8" }}
                rounded="lg"
                shadow="xl"
                w="full"
                maxW="md"
            >
                <Heading as="h1" size="lg" textAlign="center" mb="2">
                    Activate Your Account
                </Heading>
                <Text textAlign="center" color="gray.600" mb="6">
                    You're invited to join as {inviteDetails.role || 'a staff member'} for email: <strong>{inviteDetails.email}</strong>.
                    <br/>Set your password to get started.
                </Text>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <VStack spacing="4">
                        <FormControl isInvalid={!!errors.first_name}>
                            <FormLabel htmlFor="first_name">First Name</FormLabel>
                            <Input id="first_name" {...register('first_name')} />
                            <FormErrorMessage>{errors.first_name?.message}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={!!errors.last_name}>
                            <FormLabel htmlFor="last_name">Last Name</FormLabel>
                            <Input id="last_name" {...register('last_name')} />
                            <FormErrorMessage>{errors.last_name?.message}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={!!errors.password}>
                            <FormLabel htmlFor="password">Password</FormLabel>
                            <InputGroup>
                                <Input id="password" type={showPassword ? 'text' : 'password'} {...register('password')} />
                                <InputRightElement>
                                    <IconButton aria-label={showPassword ? "Hide password" : "Show password"} icon={showPassword ? <ViewOffIcon /> : <ViewIcon />} onClick={handleTogglePassword} variant="ghost"/>
                                </InputRightElement>
                            </InputGroup>
                            <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={!!errors.confirmPassword}>
                            <FormLabel htmlFor="confirmPassword">Confirm Password</FormLabel>
                             <InputGroup>
                                <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} {...register('confirmPassword')} />
                                <InputRightElement>
                                     <IconButton aria-label={showConfirmPassword ? "Hide password" : "Show password"} icon={showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />} onClick={handleToggleConfirmPassword} variant="ghost"/>
                                </InputRightElement>
                            </InputGroup>
                            <FormErrorMessage>{errors.confirmPassword?.message}</FormErrorMessage>
                        </FormControl>

                        <ChakraButton
                            type="submit"
                            colorScheme="brand"
                            w="full"
                            isLoading={isSubmitting}
                        >
                            Activate Account
                        </ChakraButton>
                    </VStack>
                </form>
            </Box>
        </Flex>
    );
};

export default AcceptInvitationPage;
