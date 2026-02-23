// src/pages/ForgotPassword.tsx
// Glassmorphism forgot-password page matching Login.tsx design

import React, { useState, FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Flex,
  VStack,
  Heading,
  Text,
  Input,
  Button,
  FormControl,
  FormLabel,
  Image,
  Icon,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    // Simulate a brief delay for UX polish, then show success
    // In production, this would call POST /auth/forgot-password
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Always show success to prevent email enumeration
      setIsSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Flex minH="100vh" position="relative" overflow="hidden">
      {/* Background image — same as Login */}
      <Box
        position="absolute"
        inset="0"
        bgImage="url('https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80')"
        bgSize="cover"
        bgPosition="center"
        filter="brightness(0.7)"
        zIndex={0}
      />

      {/* Gradient overlay */}
      <Box
        position="absolute"
        inset="0"
        bg="linear-gradient(135deg, rgba(13, 148, 136, 0.3) 0%, rgba(17, 24, 39, 0.6) 100%)"
        zIndex={1}
      />

      {/* Content */}
      <Flex
        position="relative"
        zIndex={2}
        w="100%"
        minH="100vh"
        align="center"
        justify="center"
        px={4}
      >
        <Box
          w="100%"
          maxW="420px"
          bg="rgba(255, 255, 255, 0.12)"
          backdropFilter="saturate(180%) blur(24px)"
          borderRadius="2xl"
          border="1px solid"
          borderColor="whiteAlpha.300"
          p={{ base: 8, md: 10 }}
          shadow="dark-lg"
        >
          {/* Logo */}
          <Flex justify="center" mb={6}>
            <Image
              src="/logo_light.png"
              alt="Pamplia"
              h="32px"
              w="auto"
              fallback={
                <Text fontSize="2xl" fontWeight="800" color="white" letterSpacing="-0.5px">
                  Pamplia
                </Text>
              }
            />
          </Flex>

          {!isSubmitted ? (
            <>
              <VStack spacing={1} mb={7}>
                <Heading size="lg" color="white" fontWeight="700" textAlign="center">
                  Reset password
                </Heading>
                <Text fontSize="sm" color="whiteAlpha.700" textAlign="center" lineHeight="1.5">
                  Enter your email and we'll send you instructions to reset your password.
                </Text>
              </VStack>

              {error && (
                <Alert
                  status="error"
                  borderRadius="lg"
                  mb={5}
                  bg="red.500"
                  color="white"
                  fontSize="sm"
                  py={2.5}
                >
                  <AlertIcon color="white" />
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <VStack spacing={4}>
                  <FormControl>
                    <FormLabel color="whiteAlpha.800" fontSize="sm" fontWeight="500" mb={1.5}>
                      Email address
                    </FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      disabled={isSubmitting}
                      autoComplete="email"
                      autoFocus
                      size="lg"
                      bg="whiteAlpha.100"
                      border="1px solid"
                      borderColor="whiteAlpha.300"
                      color="white"
                      _placeholder={{ color: 'whiteAlpha.500' }}
                      _hover={{ borderColor: 'whiteAlpha.400' }}
                      _focus={{
                        borderColor: 'brand.400',
                        boxShadow: '0 0 0 1px var(--chakra-colors-brand-400)',
                        bg: 'whiteAlpha.150',
                      }}
                      borderRadius="xl"
                      fontSize="sm"
                      h="48px"
                    />
                  </FormControl>

                  <Button
                    type="submit"
                    w="100%"
                    size="lg"
                    h="48px"
                    bg="brand.500"
                    color="white"
                    fontWeight="600"
                    fontSize="sm"
                    borderRadius="xl"
                    isLoading={isSubmitting}
                    loadingText="Sending..."
                    _hover={{ bg: 'brand.600', transform: 'translateY(-1px)' }}
                    _active={{ bg: 'brand.700', transform: 'translateY(0)' }}
                    transition="all 0.15s ease"
                    leftIcon={<Mail size={16} />}
                  >
                    Send reset link
                  </Button>
                </VStack>
              </form>
            </>
          ) : (
            /* Success state */
            <VStack spacing={4} py={4}>
              <Flex
                w="64px"
                h="64px"
                align="center"
                justify="center"
                borderRadius="full"
                bg="whiteAlpha.200"
              >
                <Icon as={CheckCircle} w={8} h={8} color="brand.300" />
              </Flex>
              <Heading size="md" color="white" fontWeight="700" textAlign="center">
                Check your email
              </Heading>
              <Text
                fontSize="sm"
                color="whiteAlpha.700"
                textAlign="center"
                lineHeight="1.6"
                px={2}
              >
                If an account exists for <strong style={{ color: 'white' }}>{email}</strong>, you'll receive a password reset link shortly.
              </Text>
              <Button
                w="100%"
                size="lg"
                h="48px"
                bg="whiteAlpha.200"
                color="white"
                fontWeight="600"
                fontSize="sm"
                borderRadius="xl"
                _hover={{ bg: 'whiteAlpha.300' }}
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                }}
                mt={2}
              >
                Try another email
              </Button>
            </VStack>
          )}

          {/* Back to login */}
          <Flex justify="center" mt={6}>
            <Button
              as={RouterLink}
              to="/login"
              variant="unstyled"
              display="flex"
              alignItems="center"
              gap="1.5"
              fontSize="sm"
              color="whiteAlpha.700"
              fontWeight="500"
              _hover={{ color: 'white' }}
            >
              <ArrowLeft size={14} />
              Back to sign in
            </Button>
          </Flex>
        </Box>
      </Flex>
    </Flex>
  );
};

export default ForgotPassword;
