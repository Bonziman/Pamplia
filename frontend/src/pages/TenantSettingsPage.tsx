// src/pages/TenantSettingsPage.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/authContext';
import { updateTenantMe } from '../api/tenantApi';
import { TenantOut, TenantUpdate, BusinessHoursConfig } from '../types/tenants';
import { Building2, Contact2, MapPin, Wrench, FileText, Save, X, Pencil } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
    Box, Flex, Text, Button, Image, Input, Textarea, Icon,
    Alert, AlertIcon, AlertDescription,
    VStack, HStack, Spinner, FormControl, FormLabel, FormHelperText,
    SimpleGrid,
} from '@chakra-ui/react';

import BusinessHoursEditor from '../components/settings/BusinessHoursEditor';
import { PageLoader } from '../components/ui';

import { useTenantMe, queryKeys } from '../hooks/useQueryHooks';

const DEFAULT_LOGO_URL = '/defaults/icons8-male-user-94.png';

type SettingsTab = 'general' | 'contact' | 'address' | 'operational' | 'policy';

const TenantSettingsPage: React.FC = () => {
    const { userProfile } = useAuth();
    const queryClient = useQueryClient();

    // React Query for fetching
    const { data: fetchedTenant, isLoading, error: queryError } = useTenantMe();

    // Local form state
    const [tenantData, setTenantData] = useState<TenantOut | null>(null);
    const [initialData, setInitialData] = useState<TenantOut | null>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');

    // Sync fetched data → local state (only when not editing)
    useEffect(() => {
        if (fetchedTenant && !isEditing) {
            const sanitizedData = {
                ...fetchedTenant,
                business_hours_config: fetchedTenant.business_hours_config ?? null
            };
            setTenantData(sanitizedData);
            setInitialData(sanitizedData);
        }
    }, [fetchedTenant, isEditing]);

    // Memoized permissions check
    const canEdit = useMemo(() => userProfile?.role === 'admin' || userProfile?.role === 'super_admin', [userProfile?.role]);
    const isSuperAdmin = useMemo(() => userProfile?.role === 'super_admin', [userProfile?.role]);

    const validateBusinessHours = (config: BusinessHoursConfig | null | undefined): string | null => {
        if (!config) return null;
        for (const [day, value] of Object.entries(config)) {
            if (!value?.isOpen) continue;
            const intervals = value.intervals ?? [];
            if (intervals.length === 0) {
                return `Business hours for ${day} are open but have no time interval.`;
            }
            for (const interval of intervals) {
                if (!interval.start || !interval.end) {
                    return `Business hours for ${day} must include both start and end times.`;
                }
                if (interval.end <= interval.start) {
                    return `Business hours for ${day} must have an end time after the start time.`;
                }
            }
        }
        return null;
    };

    // --- Form Input Handler (for standard inputs) ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const parsedValue = type === 'number' ? (value === '' ? null : Number(value)) : value;
        setTenantData((prev: TenantOut | null) => {
            if (!prev) return null;
            return { ...prev, [name]: parsedValue };
        });
        // Clear messages on user input
        setError(null);
        setSuccessMessage(null);
    };

    // --- Handler for Business Hours Changes ---
    const handleHoursChange = useCallback((newConfig: BusinessHoursConfig | null) => { // Allow null
        setTenantData((prev: TenantOut | null) => prev ? { ...prev, business_hours_config: newConfig } : null);
        setError(null);
        setSuccessMessage(null);
    }, []);

    // --- Edit Mode Toggle ---
    const handleEditToggle = () => {
        setError(null);
        setSuccessMessage(null);
        if (isEditing && initialData) {
            // If cancelling edit, reset form data to the initial fetched state
            setTenantData(initialData);
        } else if (!isEditing && initialData) {
             setTenantData(initialData);
        }
        setIsEditing(prev => !prev);
    };

    // --- Save Changes ---
    const handleSaveChanges = async () => {
        if (!tenantData || !initialData || !canEdit) {
            setError("Cannot save: No data loaded or insufficient permissions.");
            return;
        }

        const hoursValidationError = validateBusinessHours(tenantData.business_hours_config);
        if (hoursValidationError) {
            setError(hoursValidationError);
            return;
        }

        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        // Construct payload with only changed fields
        const payload: TenantUpdate = {
            business_hours_config: tenantData?.business_hours_config ?? null, // Provide a default value
        };
        let hasChanges = false;

        // Iterate over keys of the potentially edited tenantData
        (Object.keys(tenantData) as Array<keyof TenantOut>).forEach(key => {
            // Ensure the key is potentially updatable and exists in initial data for comparison
            if (!initialData.hasOwnProperty(key)) return;

            const currentValue = tenantData[key];
            const initialValue = initialData[key];

            // Special comparison for JSON objects
            if (key === 'business_hours_config' || key === 'booking_widget_config') {
                if (JSON.stringify(currentValue) !== JSON.stringify(initialValue)) {
                    (payload as any)[key] = currentValue; // Send the potentially null or object value
                    hasChanges = true;
                }
            }
            // Standard comparison for other fields
            else if (currentValue !== initialValue) {
                 // Prevent non-superadmin from changing 'name'
                 if (key === 'name' && !isSuperAdmin) {
                     console.warn("Attempted to change 'name' without super_admin role. Skipping.");
                     return; // Skip adding 'name' to payload
                 }
                 // Handle empty strings potentially needing to be null
                (payload as any)[key] = currentValue === '' ? null : currentValue;
                hasChanges = true;
            }
        });


        if (!hasChanges) {
            setError("No changes detected to save.");
            setIsSaving(false);
            setIsEditing(false); // Exit edit mode if no changes were made
            return;
        }

        try {
            const updatedTenant = await updateTenantMe(payload);
            const sanitizedData = {
                 ...updatedTenant,
                 business_hours_config: updatedTenant.business_hours_config ?? null
            };
            setTenantData(sanitizedData);
            setInitialData(sanitizedData);
            setIsEditing(false);
            setSuccessMessage("Settings updated successfully!");
            queryClient.invalidateQueries({ queryKey: queryKeys.tenantMe });
        } catch (err: any) {
            const detail = err.response?.data?.detail || err.message || "Failed to save settings.";
             setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
            // Keep isEditing true on error so user can retry or cancel
        } finally {
            setIsSaving(false);
        }
    };

    // --- Render Loading/Error ---
    if (isLoading) {
        return <PageLoader />;
    }

    if (queryError && !tenantData && !isSaving) {
        return (
            <Alert status="error" borderRadius="xl">
                <AlertIcon />
                <AlertDescription fontSize="sm" flex="1">{queryError.message || 'Failed to load tenant settings.'}</AlertDescription>
                <Button size="xs" variant="ghost" onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.tenantMe })}>Retry</Button>
            </Alert>
        );
    }

    if (!tenantData) {
        return (
            <Alert status="info" borderRadius="xl">
                <AlertIcon />
                <AlertDescription fontSize="sm">Tenant data is unavailable or could not be loaded.</AlertDescription>
            </Alert>
        );
    }

    // --- Tab Content Renderer ---
    const renderTabContent = () => {
        const inputProps = {
            size: 'sm' as const,
            borderRadius: 'lg',
            borderColor: isEditing ? 'gray.300' : 'gray.200',
            bg: isEditing ? 'white' : 'gray.50',
            _hover: isEditing ? { borderColor: 'gray.400' } : {},
            _focus: { borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' },
            _disabled: { opacity: 0.7, cursor: 'not-allowed', bg: 'gray.50' },
        };

        switch (activeTab) {
            case 'general':
                return (
                    <VStack spacing="5" align="stretch">
                        <Text fontSize="md" fontWeight="600" color="gray.800">General Information</Text>
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Business Name</FormLabel>
                            <Input
                                {...inputProps}
                                name="name"
                                value={tenantData.name || ''}
                                onChange={handleInputChange}
                                isDisabled={!isEditing || !isSuperAdmin}
                                isRequired
                            />
                            {!isSuperAdmin && <FormHelperText fontSize="xs">Only Super Admin can change the business name.</FormHelperText>}
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Subdomain</FormLabel>
                            <Input {...inputProps} name="subdomain" value={tenantData.subdomain || ''} isDisabled bg="gray.50" />
                            <FormHelperText fontSize="xs">Subdomain cannot be changed after creation.</FormHelperText>
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Slogan / Tagline</FormLabel>
                            <Input {...inputProps} name="slogan" value={tenantData.slogan || ''} onChange={handleInputChange} isDisabled={!isEditing} />
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Logo URL</FormLabel>
                            <Input {...inputProps} name="logo_url" type="url" value={tenantData.logo_url || ''} onChange={handleInputChange} isDisabled={!isEditing} placeholder="https://example.com/logo.png" />
                        </FormControl>
                    </VStack>
                );
            case 'contact':
                return (
                    <VStack spacing="5" align="stretch">
                        <Text fontSize="md" fontWeight="600" color="gray.800">Contact Details</Text>
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Contact Email</FormLabel>
                            <Input {...inputProps} name="contact_email" type="email" value={tenantData.contact_email || ''} onChange={handleInputChange} isDisabled={!isEditing} placeholder="info@yourbusiness.com" />
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Contact Phone</FormLabel>
                            <Input {...inputProps} name="contact_phone" type="tel" value={tenantData.contact_phone || ''} onChange={handleInputChange} isDisabled={!isEditing} />
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Website URL</FormLabel>
                            <Input {...inputProps} name="website_url" type="url" value={tenantData.website_url || ''} onChange={handleInputChange} isDisabled={!isEditing} placeholder="https://yourbusiness.com" />
                        </FormControl>
                    </VStack>
                );
            case 'address':
                return (
                    <VStack spacing="5" align="stretch">
                        <Text fontSize="md" fontWeight="600" color="gray.800">Business Address</Text>
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Street</FormLabel>
                            <Input {...inputProps} name="address_street" value={tenantData.address_street || ''} onChange={handleInputChange} isDisabled={!isEditing} />
                        </FormControl>
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="500" color="gray.700">City</FormLabel>
                                <Input {...inputProps} name="address_city" value={tenantData.address_city || ''} onChange={handleInputChange} isDisabled={!isEditing} />
                            </FormControl>
                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="500" color="gray.700">State / Province</FormLabel>
                                <Input {...inputProps} name="address_state" value={tenantData.address_state || ''} onChange={handleInputChange} isDisabled={!isEditing} />
                            </FormControl>
                        </SimpleGrid>
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Postal Code</FormLabel>
                                <Input {...inputProps} name="address_postal_code" value={tenantData.address_postal_code || ''} onChange={handleInputChange} isDisabled={!isEditing} />
                            </FormControl>
                            <FormControl>
                                <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Country</FormLabel>
                                <Input {...inputProps} name="address_country" value={tenantData.address_country || ''} onChange={handleInputChange} isDisabled={!isEditing} />
                            </FormControl>
                        </SimpleGrid>
                    </VStack>
                );
            case 'operational':
                return (
                    <VStack spacing="5" align="stretch">
                        <Text fontSize="md" fontWeight="600" color="gray.800">Operational Settings</Text>
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Timezone</FormLabel>
                            <Input {...inputProps} name="timezone" list="timezones-list" value={tenantData.timezone || 'UTC'} onChange={handleInputChange} isDisabled={!isEditing} isRequired />
                            <datalist id="timezones-list">
                                <option value="UTC" />
                                <option value="Africa/Casablanca" />
                                <option value="Europe/Paris" />
                                <option value="Europe/London" />
                                <option value="America/New_York" />
                                <option value="America/Chicago" />
                                <option value="America/Denver" />
                                <option value="America/Los_Angeles" />
                                <option value="Asia/Dubai" />
                                <option value="Asia/Tokyo" />
                            </datalist>
                            <FormHelperText fontSize="xs">Standard TZ Database Name (e.g., UTC, Africa/Casablanca)</FormHelperText>
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Default Currency</FormLabel>
                            <Input {...inputProps} name="default_currency" value={tenantData.default_currency || 'MAD'} onChange={handleInputChange} isDisabled={!isEditing} isRequired maxLength={3} />
                            <FormHelperText fontSize="xs">3-letter ISO 4217 code (e.g., MAD, USD, EUR)</FormHelperText>
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Reminder Interval (Hours)</FormLabel>
                            <Input
                                {...inputProps}
                                name="reminder_interval_hours"
                                type="number"
                                value={tenantData?.reminder_interval_hours ?? ''}
                                onChange={handleInputChange}
                                isDisabled={!isEditing}
                                min={1}
                                max={168}
                                step={1}
                                placeholder="e.g., 24"
                            />
                            <FormHelperText fontSize="xs">Hours before appointment to send reminder. Leave blank or enter 0 to disable.</FormHelperText>
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Business Hours</FormLabel>
                            <FormHelperText fontSize="xs" mb="2">Times use 24-hour format (e.g., 17:00 for 5 PM).</FormHelperText>
                            <BusinessHoursEditor
                                value={tenantData?.business_hours_config}
                                onChange={handleHoursChange}
                                isEditing={isEditing}
                            />
                        </FormControl>
                    </VStack>
                );
            case 'policy':
                return (
                    <VStack spacing="5" align="stretch">
                        <Text fontSize="md" fontWeight="600" color="gray.800">Policies & Configuration</Text>
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Cancellation Policy</FormLabel>
                            <Textarea
                                size="sm"
                                borderRadius="lg"
                                borderColor={isEditing ? 'gray.300' : 'gray.200'}
                                bg={isEditing ? 'white' : 'gray.50'}
                                _hover={isEditing ? { borderColor: 'gray.400' } : {}}
                                _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                                _disabled={{ opacity: 0.7, cursor: 'not-allowed', bg: 'gray.50' }}
                                name="cancellation_policy_text"
                                value={tenantData.cancellation_policy_text || ''}
                                onChange={handleInputChange}
                                isDisabled={!isEditing}
                                rows={8}
                            />
                        </FormControl>
                        <FormControl>
                            <FormLabel fontSize="sm" fontWeight="500" color="gray.700">Booking Widget Config (Read-Only)</FormLabel>
                            <Textarea
                                size="sm"
                                borderRadius="lg"
                                bg="gray.50"
                                borderColor="gray.200"
                                fontFamily="mono"
                                fontSize="xs"
                                value={tenantData.booking_widget_config ? JSON.stringify(tenantData.booking_widget_config, null, 2) : 'Not configured.'}
                                isReadOnly
                                isDisabled
                                rows={5}
                            />
                            <FormHelperText fontSize="xs">Configuration for embeddable booking widget (future feature).</FormHelperText>
                        </FormControl>
                    </VStack>
                );
            default:
                const _exhaustiveCheck: never = activeTab;
                return null;
        }
    };

    // --- Main Render ---
    const tabItems: { key: SettingsTab; icon: any; label: string }[] = [
        { key: 'general', icon: Building2, label: 'General' },
        { key: 'contact', icon: Contact2, label: 'Contact' },
        { key: 'address', icon: MapPin, label: 'Address' },
        { key: 'operational', icon: Wrench, label: 'Operational' },
        { key: 'policy', icon: FileText, label: 'Policies & Config' },
    ];

    return (
        <Box>
            {/* Page Header */}
            <Flex
                align="center"
                justify="space-between"
                mb="6"
                flexWrap="wrap"
                gap="4"
            >
                <HStack spacing="4">
                    <Image
                        src={tenantData.logo_url || DEFAULT_LOGO_URL}
                        alt={`${tenantData.name} Logo`}
                        boxSize="56px"
                        borderRadius="xl"
                        objectFit="cover"
                        border="1px solid"
                        borderColor="gray.200"
                        bg="white"
                        onError={(e: any) => { e.target.src = DEFAULT_LOGO_URL; }}
                    />
                    <Box>
                        <Text fontSize="lg" fontWeight="700" color="gray.900" mb="0">{tenantData.name}</Text>
                        <Text fontSize="sm" color="gray.500" mb="0">Manage your business profile and operational settings</Text>
                    </Box>
                </HStack>
                {canEdit && (
                    <HStack spacing="2">
                        {!isEditing ? (
                            <Button
                                size="sm"
                                colorScheme="brand"
                                borderRadius="lg"
                                leftIcon={<Pencil size={14} />}
                                fontWeight="600"
                                onClick={handleEditToggle}
                            >
                                Edit Settings
                            </Button>
                        ) : (
                            <>
                                <Button
                                    size="sm"
                                    colorScheme="green"
                                    borderRadius="lg"
                                    leftIcon={isSaving ? <Spinner size="xs" /> : <Save size={14} />}
                                    fontWeight="600"
                                    onClick={handleSaveChanges}
                                    isLoading={isSaving}
                                    loadingText="Saving..."
                                >
                                    Save Changes
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    borderRadius="lg"
                                    leftIcon={<X size={14} />}
                                    onClick={handleEditToggle}
                                    isDisabled={isSaving}
                                >
                                    Cancel
                                </Button>
                            </>
                        )}
                    </HStack>
                )}
            </Flex>

            {/* Global Messages */}
            {successMessage && (
                <Alert status="success" borderRadius="xl" mb="4">
                    <AlertIcon />
                    <AlertDescription fontSize="sm">{successMessage}</AlertDescription>
                </Alert>
            )}
            {error && !isEditing && (
                <Alert status="error" borderRadius="xl" mb="4">
                    <AlertIcon />
                    <AlertDescription fontSize="sm">{error}</AlertDescription>
                </Alert>
            )}

            {/* Settings Layout */}
            <Flex
                gap="6"
                direction={{ base: 'column', md: 'row' }}
            >
                {/* Side Navigation */}
                <Box
                    w={{ base: '100%', md: '220px' }}
                    flexShrink={0}
                >
                    <VStack
                        as="nav"
                        spacing="1"
                        align="stretch"
                        bg="white"
                        borderRadius="xl"
                        border="1px solid"
                        borderColor="gray.200"
                        p="2"
                    >
                        {tabItems.map(({ key, icon: TabIcon, label }) => (
                            <Flex
                                key={key}
                                as="button"
                                align="center"
                                gap="2.5"
                                px="3"
                                py="2.5"
                                borderRadius="lg"
                                fontSize="sm"
                                fontWeight={activeTab === key ? '600' : '400'}
                                color={activeTab === key ? 'brand.600' : 'gray.600'}
                                bg={activeTab === key ? 'brand.50' : 'transparent'}
                                _hover={{ bg: activeTab === key ? 'brand.50' : 'gray.50' }}
                                transition="all 0.15s ease"
                                onClick={() => setActiveTab(key)}
                                border="none"
                                cursor="pointer"
                                textAlign="left"
                                w="100%"
                            >
                                <Icon as={TabIcon} boxSize="4" />
                                <Text mb="0">{label}</Text>
                            </Flex>
                        ))}
                    </VStack>
                </Box>

                {/* Form Area */}
                <Box
                    flex="1"
                    bg="white"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="gray.200"
                    p="6"
                >
                    {error && isSaving && (
                        <Alert status="error" borderRadius="xl" mb="4">
                            <AlertIcon />
                            <AlertDescription fontSize="sm">{error}</AlertDescription>
                        </Alert>
                    )}
                    <form onSubmit={(e) => e.preventDefault()}>
                        {renderTabContent()}
                    </form>
                </Box>
            </Flex>
        </Box>
    );
};

export default TenantSettingsPage;
