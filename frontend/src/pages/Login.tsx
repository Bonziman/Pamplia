// src/pages/Login.tsx
// Full-screen background + glassmorphism card — Apple-inspired

import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { buildApiUrl } from '../api/apiBase';
import { useAuth } from '../auth/authContext';
import {
  Box,
  Flex,
  VStack,
  Heading,
  Text,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  FormControl,
  FormLabel,
  Link,
  Spinner,
  Alert,
  AlertIcon,
  Image,
  IconButton,
} from '@chakra-ui/react';
import { Eye, EyeOff } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../i18n/languageContext';

const Login: React.FC = () => {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const apiUrl = buildApiUrl('/auth/login');
      const response = await axios.post(apiUrl, { email, password }, { withCredentials: true });
      const redirectToSubdomain = response.data.redirect_to_subdomain;

      // Always redirect to the tenant's subdomain dashboard
      const currentHostname = window.location.hostname;
      const isIpHost = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(currentHostname);
      const envBaseDomain = process.env.REACT_APP_BASE_DOMAIN;
      const baseDomain =
        envBaseDomain && envBaseDomain.trim().length > 0
          ? envBaseDomain
          : currentHostname;

      if (redirectToSubdomain && !isIpHost) {
        const currentProtocol = window.location.protocol;
        const port = window.location.port;
        const portString = port ? `:${port}` : '';
        const targetHost = `${redirectToSubdomain}.${baseDomain}`;

        // If already on the correct subdomain, just navigate in-app
        if (currentHostname === targetHost) {
          await checkAuthStatus();
          navigate('/dashboard');
        } else {
          // Redirect to correct tenant subdomain
          window.location.href = `${currentProtocol}//${targetHost}${portString}/dashboard`;
        }
      } else {
        await checkAuthStatus();
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.response) {
        const status = err.response.status;
        const detail = err.response.data?.detail || t('login.unexpectedError');
        setError(status === 401 ? t('login.invalidCredentials') : `${t('login.loginFailed')} ${detail}`);
      } else if (err.request) {
        setError(t('login.serverUnreachable'));
      } else {
        setError(t('login.genericError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="gray.50">
        <Spinner size="xl" color="brand.500" thickness="3px" />
      </Flex>
    );
  }

  if (isAuthenticated) return null;

  return (
    <Flex
      minH="100vh"
      position="relative"
      overflow="hidden"
    >
      {/* Background image */}
      <Box
        position="absolute"
        inset="0"
        bgImage="url('https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80')"
        bgSize="cover"
        bgPosition="center"
        filter="brightness(0.7)"
        zIndex={0}
      />

      {/* Subtle gradient overlay */}
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
        <Box position="absolute" top={{ base: 4, md: 6 }} right={{ base: 4, md: 6 }}>
          <LanguageSwitcher size="sm" minimal />
        </Box>

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

          <VStack spacing={1} mb={7}>
            <Heading size="lg" color="white" fontWeight="700" textAlign="center">
              {t('login.welcomeBack')}
            </Heading>
            <Text fontSize="sm" color="whiteAlpha.700" textAlign="center">
              {t('login.signInToAccount')}
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

          <form onSubmit={handleLogin}>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel color="whiteAlpha.800" fontSize="sm" fontWeight="500" mb={1.5}>
                  {t('login.email')}
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

              <FormControl>
                <FormLabel color="whiteAlpha.800" fontSize="sm" fontWeight="500" mb={1.5}>
                  {t('login.password')}
                </FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isSubmitting}
                    autoComplete="current-password"
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
                    pr="48px"
                  />
                  <InputRightElement h="48px" w="48px">
                    <IconButton
                      aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                      icon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      variant="unstyled"
                      color="whiteAlpha.600"
                      _hover={{ color: 'white' }}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    />
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              <Flex w="100%" justify="flex-end">
                <Link
                  as={RouterLink}
                  to="/forgot-password"
                  fontSize="xs"
                  color="whiteAlpha.700"
                  _hover={{ color: 'white', textDecoration: 'none' }}
                  fontWeight="500"
                >
                  {t('login.forgotPassword')}
                </Link>
              </Flex>

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
                loadingText={t('login.signingIn')}
                _hover={{ bg: 'brand.600', transform: 'translateY(-1px)' }}
                _active={{ bg: 'brand.700', transform: 'translateY(0)' }}
                transition="all 0.15s ease"
                mt={2}
              >
                {t('login.signIn')}
              </Button>
            </VStack>
          </form>
        </Box>
      </Flex>
    </Flex>
  );
};

export default Login;
