// src/pages/views/TenantsManagementView.tsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button as ChakraButton,
  Center,
  Divider,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  Select,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Tag,
  Checkbox,
  Textarea,
} from '@chakra-ui/react';
import { ExternalLink, Plus, MoreVertical } from 'lucide-react';
import {
  createTenant,
  createTenantPayment,
  expireOverdueTenants,
  fetchTenantPayments,
  fetchTenantReminderHealth,
  fetchTenantStats,
  fetchTenants,
  retryTenantFailedReminders,
  runReminderJobNow,
  updateTenantById,
} from '../../api/tenantApi';
import { createService } from '../../api/serviceApi';
import { createUser, fetchUsers, resetUserPassword, updateUser } from '../../api/userApi';
import { TenantOut, TenantPaymentRecord } from '../../types/tenants';
import { UserOut } from '../../types/User';
import { useBrandedToast } from '../../hooks/useBrandedToast';

const TenantsManagementView: React.FC = () => {
  const toast = useBrandedToast();
  const [tenants, setTenants] = useState<TenantOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [billingFilter, setBillingFilter] = useState('');
  const [selectedTenantIds, setSelectedTenantIds] = useState<number[]>([]);
  const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false);

  const [selectedTenant, setSelectedTenant] = useState<TenantOut | null>(null);
  const [tenantStats, setTenantStats] = useState<any>(null);
  const [tenantUsers, setTenantUsers] = useState<UserOut[]>([]);
  const [tenantPayments, setTenantPayments] = useState<TenantPaymentRecord[]>([]);
  const [tenantReminderHealth, setTenantReminderHealth] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isRunningOverdueSweep, setIsRunningOverdueSweep] = useState(false);
  const [isRunningReminderJob, setIsRunningReminderJob] = useState(false);
  const [isRetryingReminders, setIsRetryingReminders] = useState(false);
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);

  const createModal = useDisclosure();
  const editModal = useDisclosure();
  const detailDrawer = useDisclosure();
  const resetModal = useDisclosure();
  const paymentModal = useDisclosure();

  const [createStep, setCreateStep] = useState(1);
  const [createForm, setCreateForm] = useState({
    name: '',
    subdomain: '',
    slogan: '',
    logo_url: '',
    contact_email: '',
    contact_phone: '',
    address_city: 'Casablanca',
    address_country: 'Maroc',
    timezone: 'Africa/Casablanca',
    default_currency: 'MAD',
    billing_plan: 'starter',
    billing_status: 'trial',
    reminder_interval_hours: 24,
    workday_open: '09:00',
    workday_close: '19:00',
    sunday_open: false,
    admin_name: '',
    admin_email: '',
    admin_password: '',
    staff_payload: '',
    services_payload: 'Brushing|45|180\nColoration premium|75|350\nSoin visage|60|260',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    subdomain: '',
    timezone: 'UTC',
    default_currency: 'MAD',
    contact_email: '',
    contact_phone: '',
    is_active: true,
  });

  const [resetUser, setResetUser] = useState<UserOut | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    currency: 'MAD',
    payment_method: 'cash',
    period_start: '',
    period_end: '',
    notes: '',
    activate_tenant: true,
  });

  const deriveBaseDomain = (hostname: string) => {
    if (!hostname) return '';
    if (hostname.endsWith('.nip.io')) {
      const parts = hostname.split('.');
      return parts.length <= 6 ? hostname : parts.slice(1).join('.');
    }
    const parts = hostname.split('.');
    return parts.length <= 2 ? hostname : parts.slice(1).join('.');
  };

  const protocol = window.location.protocol;
  const baseDomain = (process.env.REACT_APP_BASE_DOMAIN || '').trim() || deriveBaseDomain(window.location.hostname);

  const resetCreateWizard = () => {
    setCreateStep(1);
    setCreateForm({
      name: '',
      subdomain: '',
      slogan: '',
      logo_url: '',
      contact_email: '',
      contact_phone: '',
      address_city: 'Casablanca',
      address_country: 'Maroc',
      timezone: 'Africa/Casablanca',
      default_currency: 'MAD',
      billing_plan: 'starter',
      billing_status: 'trial',
      reminder_interval_hours: 24,
      workday_open: '09:00',
      workday_close: '19:00',
      sunday_open: false,
      admin_name: '',
      admin_email: '',
      admin_password: '',
      staff_payload: '',
      services_payload: 'Brushing|45|180\nColoration premium|75|350\nSoin visage|60|260',
    });
  };

  const parseServicesPayload = (payload: string) => payload
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = '', duration = '', price = ''] = line.split('|').map((item) => item.trim());
      return {
        name,
        duration_minutes: Number(duration),
        price: Number(price),
      };
    })
    .filter((service) => service.name && Number.isFinite(service.duration_minutes) && service.duration_minutes > 0 && Number.isFinite(service.price) && service.price >= 0);

  const parseStaffPayload = (payload: string) => payload
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = '', email = '', role = 'staff'] = line.split('|').map((item) => item.trim());
      return {
        name,
        email,
        role: role === 'admin' ? 'admin' : 'staff',
      };
    })
    .filter((member) => member.name && member.email);

  const loadTenants = useCallback(async (): Promise<TenantOut[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTenants();
      setTenants(data);
      return data;
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || 'Failed to load tenants.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
      setTenants([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const filteredTenants = useMemo(() => {
    const now = new Date();
    const sevenDaysAhead = new Date();
    sevenDaysAhead.setDate(sevenDaysAhead.getDate() + 7);

    return tenants.filter((tenant: TenantOut) => {
      const matchesSearch =
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.subdomain.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter
        ? (statusFilter === 'active' ? tenant.is_active : !tenant.is_active)
        : true;

      let matchesBilling = true;
      const nextDueAt = tenant.next_due_at ? new Date(tenant.next_due_at) : null;

      if (billingFilter === 'due_soon') {
        matchesBilling = !!nextDueAt && nextDueAt >= now && nextDueAt <= sevenDaysAhead;
      } else if (billingFilter === 'overdue') {
        matchesBilling = !!nextDueAt && nextDueAt < now;
      } else if (billingFilter) {
        matchesBilling = (tenant.billing_status || 'trial') === billingFilter;
      }

      return matchesSearch && matchesStatus && matchesBilling;
    });
  }, [tenants, searchQuery, statusFilter, billingFilter]);

  const selectedCount = selectedTenantIds.length;

  const areAllVisibleSelected = useMemo(() => {
    if (filteredTenants.length === 0) return false;
    return filteredTenants.every((tenant) => selectedTenantIds.includes(tenant.id));
  }, [filteredTenants, selectedTenantIds]);

  const handleOpenDetails = async (tenant: TenantOut) => {
    setSelectedTenant(tenant);
    setTenantStats(null);
    setTenantUsers([]);
    setTenantPayments([]);
    setTenantReminderHealth(null);
    setIsLoadingDetails(true);
    detailDrawer.onOpen();
    try {
      const [statsResponse, usersResponse, paymentsResponse, reminderHealthResponse] = await Promise.all([
        fetchTenantStats(tenant.id),
        fetchUsers({ page: 1, limit: 10, tenant_id_filter: tenant.id }),
        fetchTenantPayments(tenant.id, 10),
        fetchTenantReminderHealth(tenant.id),
      ]);
      setTenantStats(statsResponse);
      setTenantUsers(usersResponse.items || []);
      setTenantPayments(paymentsResponse);
      setTenantReminderHealth(reminderHealthResponse);
    } catch (err: any) {
      toast({ title: 'Failed to load tenant details', description: err.response?.data?.detail || err.message, status: 'error' });
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleOpenEdit = (tenant: TenantOut) => {
    setSelectedTenant(tenant);
    setEditForm({
      name: tenant.name,
      subdomain: tenant.subdomain,
      timezone: tenant.timezone,
      default_currency: tenant.default_currency,
      contact_email: tenant.contact_email || '',
      contact_phone: tenant.contact_phone || '',
      is_active: tenant.is_active,
    });
    editModal.onOpen();
  };

  const handleSaveTenant = async () => {
    if (!selectedTenant) return;
    try {
      await updateTenantById(selectedTenant.id, {
        name: editForm.name,
        subdomain: editForm.subdomain,
        timezone: editForm.timezone,
        default_currency: editForm.default_currency,
        contact_email: editForm.contact_email || null,
        contact_phone: editForm.contact_phone || null,
        is_active: editForm.is_active,
      });
      toast({ title: 'Tenant updated', status: 'success' });
      editModal.onClose();
      const refreshedTenants = await loadTenants();
      if (detailDrawer.isOpen && selectedTenant) {
        const updatedTenant = refreshedTenants.find((t: TenantOut) => t.id === selectedTenant.id);
        if (updatedTenant) setSelectedTenant(updatedTenant);
      }
    } catch (err: any) {
      toast({ title: 'Failed to update tenant', description: err.response?.data?.detail || err.message, status: 'error' });
    }
  };

  const handleCreateTenant = async () => {
    if (!createForm.name.trim() || !createForm.subdomain.trim()) {
      toast({ title: 'Salon name and subdomain are required', status: 'warning' });
      return;
    }

    if (!createForm.admin_name.trim() || !createForm.admin_email.trim() || createForm.admin_password.trim().length < 8) {
      toast({ title: 'Primary admin account is required', description: 'Provide name, email, and a password with at least 8 characters.', status: 'warning' });
      return;
    }

    const services = parseServicesPayload(createForm.services_payload);
    const staffMembers = parseStaffPayload(createForm.staff_payload);

    const businessHours = {
      monday: { isOpen: true, intervals: [{ start: createForm.workday_open, end: createForm.workday_close }] },
      tuesday: { isOpen: true, intervals: [{ start: createForm.workday_open, end: createForm.workday_close }] },
      wednesday: { isOpen: true, intervals: [{ start: createForm.workday_open, end: createForm.workday_close }] },
      thursday: { isOpen: true, intervals: [{ start: createForm.workday_open, end: createForm.workday_close }] },
      friday: { isOpen: true, intervals: [{ start: createForm.workday_open, end: createForm.workday_close }] },
      saturday: { isOpen: true, intervals: [{ start: createForm.workday_open, end: createForm.workday_close }] },
      sunday: { isOpen: createForm.sunday_open, intervals: createForm.sunday_open ? [{ start: createForm.workday_open, end: createForm.workday_close }] : [] },
    };

    try {
      setIsCreatingTenant(true);
      const tenant = await createTenant({ name: createForm.name.trim(), subdomain: createForm.subdomain.trim().toLowerCase() });

      await updateTenantById(tenant.id, {
        slogan: createForm.slogan.trim() || null,
        logo_url: createForm.logo_url.trim() || null,
        contact_email: createForm.contact_email.trim() || null,
        contact_phone: createForm.contact_phone.trim() || null,
        address_city: createForm.address_city.trim() || null,
        address_country: createForm.address_country.trim() || null,
        timezone: createForm.timezone.trim() || 'Africa/Casablanca',
        default_currency: createForm.default_currency.trim().toUpperCase() || 'MAD',
        billing_plan: createForm.billing_plan,
        billing_status: createForm.billing_status,
        reminder_interval_hours: createForm.reminder_interval_hours,
        business_hours_config: businessHours,
      });

      await createUser({
        name: createForm.admin_name.trim(),
        email: createForm.admin_email.trim().toLowerCase(),
        password: createForm.admin_password.trim(),
        role: 'admin',
        tenant_id: tenant.id,
      });

      for (const member of staffMembers) {
        await createUser({
          name: member.name,
          email: member.email.toLowerCase(),
          password: createForm.admin_password.trim(),
          role: member.role,
          tenant_id: tenant.id,
        });
      }

      for (const service of services) {
        await createService({
          name: service.name,
          duration_minutes: service.duration_minutes,
          price: service.price,
          tenant_id: tenant.id,
        });
      }

      toast({ title: 'Tenant onboarded', description: 'Salon, admin account, hours, staff, and starter services are ready.', status: 'success' });
      createModal.onClose();
      resetCreateWizard();
      loadTenants();
    } catch (err: any) {
      toast({ title: 'Onboarding failed', description: err.response?.data?.detail || err.message, status: 'error' });
    } finally {
      setIsCreatingTenant(false);
    }
  };

  const handleToggleTenantStatus = async (tenant: TenantOut) => {
    try {
      await updateTenantById(tenant.id, { is_active: !tenant.is_active });
      toast({ title: `Tenant ${tenant.is_active ? 'suspended' : 'activated'}`, status: 'success' });
      loadTenants();
    } catch (err: any) {
      toast({ title: 'Failed to update tenant', description: err.response?.data?.detail || err.message, status: 'error' });
    }
  };

  const handleOpenResetPassword = (user: UserOut) => {
    setResetUser(user);
    setResetPasswordValue('');
    resetModal.onOpen();
  };

  const handleOpenPaymentModal = () => {
    if (!selectedTenant) return;
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setDate(nextMonth.getDate() + 30);
    setPaymentForm({
      amount: '',
      currency: selectedTenant.default_currency || 'MAD',
      payment_method: 'cash',
      period_start: today.toISOString().slice(0, 10),
      period_end: nextMonth.toISOString().slice(0, 10),
      notes: '',
      activate_tenant: true,
    });
    paymentModal.onOpen();
  };

  const handleCreatePayment = async () => {
    if (!selectedTenant) return;

    const amountValue = Number(paymentForm.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast({ title: 'Invalid amount', description: 'Enter a payment amount greater than 0.', status: 'warning' });
      return;
    }

    if (!paymentForm.period_start || !paymentForm.period_end) {
      toast({ title: 'Missing billing period', description: 'Select period start and end dates.', status: 'warning' });
      return;
    }

    try {
      setIsSubmittingPayment(true);
      await createTenantPayment(selectedTenant.id, {
        amount: amountValue,
        currency: paymentForm.currency,
        payment_method: paymentForm.payment_method,
        period_start: new Date(`${paymentForm.period_start}T00:00:00`).toISOString(),
        period_end: new Date(`${paymentForm.period_end}T23:59:59`).toISOString(),
        notes: paymentForm.notes || undefined,
        activate_tenant: paymentForm.activate_tenant,
      });

      const refreshedTenants = await loadTenants();
      const updatedTenant = refreshedTenants.find((t: TenantOut) => t.id === selectedTenant.id) || selectedTenant;
      setSelectedTenant(updatedTenant);
      const payments = await fetchTenantPayments(selectedTenant.id, 10);
      setTenantPayments(payments);

      toast({ title: 'Payment recorded', status: 'success' });
      paymentModal.onClose();
    } catch (err: any) {
      toast({ title: 'Failed to record payment', description: err.response?.data?.detail || err.message, status: 'error' });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser) return;
    if (resetPasswordValue.trim().length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters.', status: 'warning' });
      return;
    }
    try {
      await resetUserPassword(resetUser.id, resetPasswordValue.trim());
      toast({ title: 'Password reset', status: 'success' });
      resetModal.onClose();
    } catch (err: any) {
      toast({ title: 'Failed to reset password', description: err.response?.data?.detail || err.message, status: 'error' });
    }
  };

  const handleChangeUserRole = async (user: UserOut, role: string) => {
    if (user.role === role) return;
    try {
      await updateUser(user.id, { role });
      toast({ title: 'Role updated', status: 'success' });
      if (selectedTenant) {
        const response = await fetchUsers({ page: 1, limit: 10, tenant_id_filter: selectedTenant.id });
        setTenantUsers(response.items || []);
      }
    } catch (err: any) {
      toast({ title: 'Failed to update role', description: err.response?.data?.detail || err.message, status: 'error' });
    }
  };

  const handleToggleTenantSelection = (tenantId: number) => {
    setSelectedTenantIds((prev) => (
      prev.includes(tenantId) ? prev.filter((id) => id !== tenantId) : [...prev, tenantId]
    ));
  };

  const handleToggleSelectVisible = () => {
    if (areAllVisibleSelected) {
      const visibleIds = new Set(filteredTenants.map((tenant) => tenant.id));
      setSelectedTenantIds((prev) => prev.filter((id) => !visibleIds.has(id)));
      return;
    }

    const union = new Set<number>(selectedTenantIds);
    filteredTenants.forEach((tenant) => union.add(tenant.id));
    setSelectedTenantIds(Array.from(union));
  };

  const applyBulkUpdate = async (
    updater: (tenant: TenantOut) => Partial<TenantOut>,
    successTitle: string,
    partialFailureTitle: string
  ) => {
    if (selectedTenantIds.length === 0) {
      toast({ title: 'No tenants selected', description: 'Select at least one tenant first.', status: 'warning' });
      return;
    }

    const selectedTenants = tenants.filter((tenant) => selectedTenantIds.includes(tenant.id));
    if (selectedTenants.length === 0) return;

    setIsApplyingBulkAction(true);
    let successCount = 0;
    let errorCount = 0;

    for (const tenant of selectedTenants) {
      try {
        await updateTenantById(tenant.id, updater(tenant));
        successCount += 1;
      } catch {
        errorCount += 1;
      }
    }

    await loadTenants();
    setSelectedTenantIds([]);
    setIsApplyingBulkAction(false);

    if (errorCount === 0) {
      toast({ title: successTitle, description: `${successCount} tenant(s) updated.`, status: 'success' });
      return;
    }

    toast({
      title: partialFailureTitle,
      description: `${successCount} updated, ${errorCount} failed.`,
      status: 'warning'
    });
  };

  const handleBulkSuspend = async () => {
    await applyBulkUpdate(
      () => ({ is_active: false, billing_status: 'suspended' }),
      'Selected tenants suspended',
      'Some tenants could not be suspended'
    );
  };

  const handleBulkMarkOverdue = async () => {
    await applyBulkUpdate(
      () => ({ billing_status: 'overdue' }),
      'Selected tenants marked overdue',
      'Some tenants could not be marked overdue'
    );
  };

  const handleBulkActivate = async () => {
    await applyBulkUpdate(
      () => ({ is_active: true, billing_status: 'active' }),
      'Selected tenants activated',
      'Some tenants could not be activated'
    );
  };

  const handleRunOverdueSweep = async () => {
    try {
      setIsRunningOverdueSweep(true);
      const result = await expireOverdueTenants();
      await loadTenants();
      toast({
        title: 'Overdue sweep completed',
        description: result.message,
        status: 'success'
      });
    } catch (err: any) {
      toast({
        title: 'Overdue sweep failed',
        description: err.response?.data?.detail || err.message,
        status: 'error'
      });
    } finally {
      setIsRunningOverdueSweep(false);
    }
  };

  const handleRunReminderJob = async () => {
    try {
      setIsRunningReminderJob(true);
      const result = await runReminderJobNow();
      toast({
        title: 'Reminder job queued',
        description: `Task ${result.task_id}`,
        status: 'success'
      });
    } catch (err: any) {
      toast({
        title: 'Failed to queue reminder job',
        description: err.response?.data?.detail || err.message,
        status: 'error'
      });
    } finally {
      setIsRunningReminderJob(false);
    }
  };

  const handleRetryFailedReminders = async () => {
    if (!selectedTenant) return;

    try {
      setIsRetryingReminders(true);
      const result = await retryTenantFailedReminders(selectedTenant.id, 24, 20);
      const refreshedHealth = await fetchTenantReminderHealth(selectedTenant.id);
      setTenantReminderHealth(refreshedHealth);

      toast({
        title: 'Retry completed',
        description: `Attempted ${result.attempted}, sent ${result.sent}, failed ${result.failed}.`,
        status: result.failed > 0 ? 'warning' : 'success'
      });
    } catch (err: any) {
      toast({
        title: 'Retry failed',
        description: err.response?.data?.detail || err.message,
        status: 'error'
      });
    } finally {
      setIsRetryingReminders(false);
    }
  };

  return (
    <div className="view-section">
      <Box p={{ base: '2', md: '4' }} bg="white">
        <Flex alignItems="center" justifyContent="space-between" mb="6" flexWrap="wrap" gap="3">
          <Heading as="h1" size="lg" color="gray.700">Tenants</Heading>
          <ChakraButton
            colorScheme="brand"
            leftIcon={<Plus size={16} />}
            onClick={() => {
              resetCreateWizard();
              createModal.onOpen();
            }}
          >
            New Tenant
          </ChakraButton>
        </Flex>

        <Flex mb="4" gap="3" flexWrap="wrap">
          <Input
            placeholder="Search name or subdomain"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            maxW="260px"
          />
          <Select value={statusFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)} maxW="200px">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Select value={billingFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBillingFilter(e.target.value)} maxW="220px">
            <option value="">All billing states</option>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="overdue">Overdue</option>
            <option value="suspended">Suspended</option>
            <option value="due_soon">Due in 7 days</option>
          </Select>
          <HStack spacing="2">
            <ChakraButton
              size="sm"
              variant="outline"
              isLoading={isRunningOverdueSweep}
              onClick={handleRunOverdueSweep}
            >
              Run Overdue Sweep
            </ChakraButton>
            <ChakraButton
              size="sm"
              variant="outline"
              isLoading={isRunningReminderJob}
              onClick={handleRunReminderJob}
            >
              Run Reminder Job
            </ChakraButton>
            <ChakraButton size="sm" variant="outline" isDisabled={selectedCount === 0 || isApplyingBulkAction} onClick={handleBulkActivate}>
              Bulk Activate
            </ChakraButton>
            <ChakraButton size="sm" variant="outline" colorScheme="orange" isDisabled={selectedCount === 0 || isApplyingBulkAction} onClick={handleBulkMarkOverdue}>
              Mark Overdue
            </ChakraButton>
            <ChakraButton size="sm" colorScheme="red" isDisabled={selectedCount === 0 || isApplyingBulkAction} onClick={handleBulkSuspend}>
              Suspend Selected
            </ChakraButton>
          </HStack>
        </Flex>

        {selectedCount > 0 && (
          <Text fontSize="sm" color="gray.500" mb="3">
            {selectedCount} tenant(s) selected
          </Text>
        )}
        <Text fontSize="sm" color="gray.500" mb="3">
          Tip: Recent payments appear in each tenant's details drawer.
        </Text>

        {isLoading && (
          <Center h="240px">
            <Spinner color="brand.500" size="xl" thickness="4px" speed="0.65s" emptyColor="gray.200" />
          </Center>
        )}

        {!isLoading && error && (
          <Text color="red.500" mb="4">{error}</Text>
        )}

        {!isLoading && !error && filteredTenants.length === 0 && (
          <Text>No tenants found.</Text>
        )}

        {!isLoading && !error && filteredTenants.length > 0 && (
          <TableContainer borderWidth="1px" borderColor="gray.200" borderRadius="md">
            <Table variant="simple" size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th>
                    <Checkbox
                      isChecked={areAllVisibleSelected}
                      onChange={handleToggleSelectVisible}
                      aria-label="Select all visible tenants"
                    />
                  </Th>
                  <Th>Name</Th>
                  <Th>Subdomain</Th>
                  <Th>Status</Th>
                  <Th>Billing</Th>
                  <Th>Next Due</Th>
                  <Th>Timezone</Th>
                  <Th>Currency</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredTenants.map((tenant) => {
                  const nextDueAt = tenant.next_due_at ? new Date(tenant.next_due_at) : null;
                  const isOverdue = !!nextDueAt && nextDueAt < new Date();
                  const isDueSoon = !!nextDueAt && !isOverdue && (nextDueAt.getTime() - Date.now()) <= (7 * 24 * 60 * 60 * 1000);

                  return (
                  <Tr key={tenant.id}>
                    <Td>
                      <Checkbox
                        isChecked={selectedTenantIds.includes(tenant.id)}
                        onChange={() => handleToggleTenantSelection(tenant.id)}
                        aria-label={`Select ${tenant.name}`}
                      />
                    </Td>
                    <Td>{tenant.name}</Td>
                    <Td>{tenant.subdomain}</Td>
                    <Td>
                      <Tag size="sm" colorScheme={tenant.is_active ? 'green' : 'red'}>
                        {tenant.is_active ? 'Active' : 'Inactive'}
                      </Tag>
                    </Td>
                    <Td>
                      <Tag
                        size="sm"
                        colorScheme={
                          tenant.billing_status === 'active'
                            ? 'green'
                            : tenant.billing_status === 'overdue'
                              ? 'orange'
                              : tenant.billing_status === 'suspended'
                                ? 'red'
                                : 'gray'
                        }
                      >
                        {tenant.billing_status || 'trial'}
                      </Tag>
                    </Td>
                    <Td>
                      <HStack spacing="2">
                        <Text>{tenant.next_due_at ? new Date(tenant.next_due_at).toLocaleDateString() : '-'}</Text>
                        {isOverdue && <Tag size="sm" colorScheme="red">Overdue</Tag>}
                        {!isOverdue && isDueSoon && <Tag size="sm" colorScheme="orange">Due Soon</Tag>}
                      </HStack>
                    </Td>
                    <Td>{tenant.timezone}</Td>
                    <Td>{tenant.default_currency}</Td>
                    <Td textAlign="right">
                      <HStack justify="flex-end">
                        {tenant.subdomain && baseDomain && (
                          <IconButton
                            aria-label="Open tenant"
                            size="sm"
                            variant="outline"
                            icon={<ExternalLink size={16} />}
                            onClick={() => window.open(`${protocol}//${tenant.subdomain}.${baseDomain}/dashboard`, '_blank')}
                          />
                        )}
                        <IconButton
                          aria-label="Tenant actions"
                          size="sm"
                          variant="ghost"
                          icon={<MoreVertical size={16} />}
                          onClick={() => handleOpenDetails(tenant)}
                        />
                        <ChakraButton size="sm" variant="outline" colorScheme="brand" onClick={() => handleOpenEdit(tenant)}>
                          Edit
                        </ChakraButton>
                        <ChakraButton size="sm" variant="outline" colorScheme={tenant.is_active ? 'red' : 'green'} onClick={() => handleToggleTenantStatus(tenant)}>
                          {tenant.is_active ? 'Suspend' : 'Activate'}
                        </ChakraButton>
                      </HStack>
                    </Td>
                  </Tr>
                );})}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Drawer isOpen={detailDrawer.isOpen} placement="right" onClose={detailDrawer.onClose} size="lg">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerHeader>
            <Flex alignItems="center" justifyContent="space-between" gap="4">
              <Box>
                <Heading size="md">{selectedTenant?.name || 'Tenant'}</Heading>
                <Text color="gray.500" fontSize="sm">{selectedTenant?.subdomain}</Text>
              </Box>
              <HStack>
                <Badge colorScheme={selectedTenant?.is_active ? 'green' : 'red'}>
                  {selectedTenant?.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Badge
                  colorScheme={
                    selectedTenant?.billing_status === 'active'
                      ? 'green'
                      : selectedTenant?.billing_status === 'overdue'
                        ? 'orange'
                        : selectedTenant?.billing_status === 'suspended'
                          ? 'red'
                          : 'gray'
                  }
                >
                  {selectedTenant?.billing_status || 'trial'}
                </Badge>
              </HStack>
            </Flex>
          </DrawerHeader>
          <DrawerBody>
            {isLoadingDetails && (
              <Center h="200px">
                <Spinner color="brand.500" size="lg" />
              </Center>
            )}

            {!isLoadingDetails && selectedTenant && (
              <>
                <Box mb="6">
                  <Heading as="h3" size="sm" mb="3">Overview</Heading>
                  <Flex gap="4" flexWrap="wrap">
                    <Box flex="1" minW="180px" bg="gray.50" p="3" borderRadius="md">
                      <Text fontSize="xs" color="gray.500">Revenue (30 days)</Text>
                      <Text fontSize="lg" fontWeight="bold">{tenantStats?.revenue_last_30_days?.toFixed(2) || '0.00'}</Text>
                    </Box>
                    <Box flex="1" minW="180px" bg="gray.50" p="3" borderRadius="md">
                      <Text fontSize="xs" color="gray.500">Total Revenue</Text>
                      <Text fontSize="lg" fontWeight="bold">{tenantStats?.revenue_total?.toFixed(2) || '0.00'}</Text>
                    </Box>
                    <Box flex="1" minW="180px" bg="gray.50" p="3" borderRadius="md">
                      <Text fontSize="xs" color="gray.500">Appointments</Text>
                      <Text fontSize="lg" fontWeight="bold">{tenantStats?.appointments_total ?? 0}</Text>
                    </Box>
                    <Box flex="1" minW="180px" bg="gray.50" p="3" borderRadius="md">
                      <Text fontSize="xs" color="gray.500">Clients</Text>
                      <Text fontSize="lg" fontWeight="bold">{tenantStats?.clients_total ?? 0}</Text>
                    </Box>
                  </Flex>
                </Box>

                <Divider mb="6" />

                <Box mb="6">
                  <Heading as="h3" size="sm" mb="3">Users & Roles</Heading>
                  {tenantUsers.length === 0 ? (
                    <Text color="gray.500">No users found for this tenant.</Text>
                  ) : (
                    <TableContainer borderWidth="1px" borderColor="gray.200" borderRadius="md">
                      <Table size="sm">
                        <Thead bg="gray.50">
                          <Tr>
                            <Th>Name</Th>
                            <Th>Email</Th>
                            <Th>Role</Th>
                            <Th>Status</Th>
                            <Th></Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {tenantUsers.map((user) => (
                            <Tr key={user.id}>
                              <Td>{user.name}</Td>
                              <Td>{user.email}</Td>
                              <Td>
                                <Select size="sm" value={user.role} onChange={(e) => handleChangeUserRole(user, e.target.value)} maxW="140px">
                                  <option value="admin">Admin</option>
                                  <option value="staff">Staff</option>
                                </Select>
                              </Td>
                              <Td>
                                <Tag size="sm" colorScheme={user.is_active ? 'green' : 'red'}>
                                  {user.is_active ? 'Active' : 'Inactive'}
                                </Tag>
                              </Td>
                              <Td textAlign="right">
                                <ChakraButton size="xs" variant="outline" onClick={() => handleOpenResetPassword(user)}>Reset</ChakraButton>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>

                <Divider mb="6" />

                <Box mb="6">
                  <Heading as="h3" size="sm" mb="3">Billing Summary</Heading>
                  <Text fontSize="sm" color="gray.600">Manual cash/bank workflow for activation and renewals.</Text>
                  <Flex gap="4" flexWrap="wrap" mt="3">
                    <Box flex="1" minW="180px" bg="gray.50" p="3" borderRadius="md">
                      <Text fontSize="xs" color="gray.500">Plan</Text>
                      <Text fontSize="lg" fontWeight="bold">{selectedTenant.billing_plan || 'starter'}</Text>
                    </Box>
                    <Box flex="1" minW="180px" bg="gray.50" p="3" borderRadius="md">
                      <Text fontSize="xs" color="gray.500">Next Due</Text>
                      <Text fontSize="lg" fontWeight="bold">
                        {selectedTenant.next_due_at ? new Date(selectedTenant.next_due_at).toLocaleDateString() : '-'}
                      </Text>
                    </Box>
                    <Box flex="1" minW="180px" bg="gray.50" p="3" borderRadius="md">
                      <Text fontSize="xs" color="gray.500">Last Paid</Text>
                      <Text fontSize="lg" fontWeight="bold">
                        {selectedTenant.last_paid_at ? new Date(selectedTenant.last_paid_at).toLocaleDateString() : '-'}
                      </Text>
                    </Box>
                  </Flex>
                  <HStack mt="4" spacing="3">
                    <ChakraButton size="sm" colorScheme="brand" onClick={handleOpenPaymentModal}>
                      Record Payment
                    </ChakraButton>
                    <ChakraButton
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!selectedTenant) return;
                        try {
                          await updateTenantById(selectedTenant.id, {
                            billing_status: 'active',
                            is_active: true,
                          });
                          toast({ title: 'Tenant activated', status: 'success' });
                          const refreshedTenants = await loadTenants();
                          const updatedTenant = refreshedTenants.find((t: TenantOut) => t.id === selectedTenant.id);
                          if (updatedTenant) setSelectedTenant(updatedTenant);
                        } catch (err: any) {
                          toast({ title: 'Activation failed', description: err.response?.data?.detail || err.message, status: 'error' });
                        }
                      }}
                    >
                      Activate
                    </ChakraButton>
                  </HStack>

                  <Box mt="5">
                    <Text fontSize="xs" color="gray.500" mb="2">Recent Payments</Text>
                    {tenantPayments.length === 0 ? (
                      <Text fontSize="sm" color="gray.500">No payments logged yet.</Text>
                    ) : (
                      <TableContainer borderWidth="1px" borderColor="gray.200" borderRadius="md">
                        <Table size="sm">
                          <Thead bg="gray.50">
                            <Tr>
                              <Th>Date</Th>
                              <Th>Amount</Th>
                              <Th>Method</Th>
                              <Th>Period</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {tenantPayments.map((payment) => (
                              <Tr key={payment.id}>
                                <Td>{new Date(payment.paid_at).toLocaleDateString()}</Td>
                                <Td>{payment.amount.toFixed(2)} {payment.currency}</Td>
                                <Td>{payment.payment_method}</Td>
                                <Td>
                                  {new Date(payment.period_start).toLocaleDateString()} - {new Date(payment.period_end).toLocaleDateString()}
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    )}
                  </Box>
                </Box>

                <Divider mb="6" />

                <Box mb="6">
                  <Heading as="h3" size="sm" mb="3">Reminder Reliability</Heading>
                  {!tenantReminderHealth ? (
                    <Text fontSize="sm" color="gray.500">No reminder telemetry available yet.</Text>
                  ) : (
                    <>
                      <Flex gap="4" flexWrap="wrap" mb="4">
                        <Box flex="1" minW="180px" bg="gray.50" p="3" borderRadius="md">
                          <Text fontSize="xs" color="gray.500">Sent (24h)</Text>
                          <Text fontSize="lg" fontWeight="bold">{tenantReminderHealth.sent_last_24h}</Text>
                        </Box>
                        <Box flex="1" minW="180px" bg="gray.50" p="3" borderRadius="md">
                          <Text fontSize="xs" color="gray.500">Failed (24h)</Text>
                          <Text fontSize="lg" fontWeight="bold">{tenantReminderHealth.failed_last_24h}</Text>
                        </Box>
                        <Box flex="1" minW="180px" bg="gray.50" p="3" borderRadius="md">
                          <Text fontSize="xs" color="gray.500">Due Now</Text>
                          <Text fontSize="lg" fontWeight="bold">{tenantReminderHealth.due_now_count}</Text>
                        </Box>
                      </Flex>
                      <Text fontSize="xs" color="gray.500" mb="3">
                        Last failure: {tenantReminderHealth.last_failure_at ? new Date(tenantReminderHealth.last_failure_at).toLocaleString() : 'none'}
                      </Text>
                    </>
                  )}
                  <HStack spacing="3">
                    <ChakraButton size="sm" variant="outline" isLoading={isRetryingReminders} onClick={handleRetryFailedReminders}>
                      Retry Failed Reminders
                    </ChakraButton>
                    <ChakraButton
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!selectedTenant) return;
                        try {
                          const health = await fetchTenantReminderHealth(selectedTenant.id);
                          setTenantReminderHealth(health);
                          toast({ title: 'Reminder health refreshed', status: 'success' });
                        } catch (err: any) {
                          toast({ title: 'Failed to refresh reminder health', description: err.response?.data?.detail || err.message, status: 'error' });
                        }
                      }}
                    >
                      Refresh
                    </ChakraButton>
                  </HStack>
                </Box>

                <Divider mb="6" />

                <Box>
                  <Heading as="h3" size="sm" mb="3">Data Export</Heading>
                  <Text fontSize="sm" color="gray.600" mb="3">Download a summary snapshot of this tenant.</Text>
                  <ChakraButton
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!tenantStats || !selectedTenant) return;
                      const payload = JSON.stringify({ tenant: selectedTenant, stats: tenantStats }, null, 2);
                      const blob = new Blob([payload], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `${selectedTenant.subdomain}-summary.json`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Export Summary JSON
                  </ChakraButton>
                </Box>
              </>
            )}
          </DrawerBody>
          <DrawerFooter>
            <ChakraButton variant="ghost" mr="3" onClick={detailDrawer.onClose}>Close</ChakraButton>
            {selectedTenant && baseDomain && (
              <ChakraButton colorScheme="brand" onClick={() => window.open(`${protocol}//${selectedTenant.subdomain}.${baseDomain}/dashboard`, '_blank')}>
                Open Tenant
              </ChakraButton>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Modal isOpen={createModal.isOpen} onClose={createModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Tenant Onboarding Wizard</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="sm" color="gray.500" mb="3">Step {createStep} of 4</Text>

            {createStep === 1 && (
              <>
                <FormControl mb="3" isRequired>
                  <FormLabel>Salon Name</FormLabel>
                  <Input value={createForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))} />
                </FormControl>
                <FormControl mb="3" isRequired>
                  <FormLabel>Subdomain</FormLabel>
                  <Input value={createForm.subdomain} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((prev) => ({ ...prev, subdomain: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="example: studio-luxe" />
                </FormControl>
                <FormControl mb="3">
                  <FormLabel>Slogan</FormLabel>
                  <Input value={createForm.slogan} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((prev) => ({ ...prev, slogan: e.target.value }))} placeholder="Experience premium beaute" />
                </FormControl>
                <FormControl>
                  <FormLabel>Logo URL</FormLabel>
                  <Input value={createForm.logo_url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((prev) => ({ ...prev, logo_url: e.target.value }))} placeholder="https://..." />
                </FormControl>
              </>
            )}

            {createStep === 2 && (
              <>
                <FormControl mb="3">
                  <FormLabel>Contact Email</FormLabel>
                  <Input type="email" value={createForm.contact_email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((prev) => ({ ...prev, contact_email: e.target.value }))} />
                </FormControl>
                <FormControl mb="3">
                  <FormLabel>Contact Phone</FormLabel>
                  <Input value={createForm.contact_phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((prev) => ({ ...prev, contact_phone: e.target.value }))} />
                </FormControl>
                <HStack spacing="3" mb="3">
                  <FormControl>
                    <FormLabel>City</FormLabel>
                    <Input value={createForm.address_city} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((prev) => ({ ...prev, address_city: e.target.value }))} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Country</FormLabel>
                    <Input value={createForm.address_country} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((prev) => ({ ...prev, address_country: e.target.value }))} />
                  </FormControl>
                </HStack>
                <HStack spacing="3" mb="3">
                  <FormControl>
                    <FormLabel>Timezone</FormLabel>
                    <Input value={createForm.timezone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((prev) => ({ ...prev, timezone: e.target.value }))} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Currency</FormLabel>
                    <Input value={createForm.default_currency} maxLength={3} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((prev) => ({ ...prev, default_currency: e.target.value.toUpperCase() }))} />
                  </FormControl>
                </HStack>
                <HStack spacing="3" mb="3">
                  <FormControl>
                    <FormLabel>Open (Mon-Sat)</FormLabel>
                    <Input type="time" value={createForm.workday_open} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((prev) => ({ ...prev, workday_open: e.target.value }))} />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Close (Mon-Sat)</FormLabel>
                    <Input type="time" value={createForm.workday_close} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((prev) => ({ ...prev, workday_close: e.target.value }))} />
                  </FormControl>
                </HStack>
                <Checkbox isChecked={createForm.sunday_open} onChange={(e) => setCreateForm((prev) => ({ ...prev, sunday_open: e.target.checked }))}>
                  Open on Sunday
                </Checkbox>
              </>
            )}

            {createStep === 3 && (
              <>
                <FormControl mb="3">
                  <FormLabel>Billing Plan</FormLabel>
                  <Select value={createForm.billing_plan} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCreateForm((prev) => ({ ...prev, billing_plan: e.target.value }))}>
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="pro">Pro</option>
                  </Select>
                </FormControl>
                <FormControl mb="3">
                  <FormLabel>Billing Status</FormLabel>
                  <Select value={createForm.billing_status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCreateForm((prev) => ({ ...prev, billing_status: e.target.value }))}>
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="overdue">Overdue</option>
                    <option value="suspended">Suspended</option>
                  </Select>
                </FormControl>
                <FormControl mb="3" isRequired>
                  <FormLabel>Primary Admin Name</FormLabel>
                  <Input value={createForm.admin_name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((prev) => ({ ...prev, admin_name: e.target.value }))} />
                </FormControl>
                <FormControl mb="3" isRequired>
                  <FormLabel>Primary Admin Email</FormLabel>
                  <Input type="email" value={createForm.admin_email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((prev) => ({ ...prev, admin_email: e.target.value }))} />
                </FormControl>
                <FormControl mb="3" isRequired>
                  <FormLabel>Temporary Password (shared)</FormLabel>
                  <Input type="password" value={createForm.admin_password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((prev) => ({ ...prev, admin_password: e.target.value }))} placeholder="Minimum 8 characters" />
                </FormControl>
                <FormControl>
                  <FormLabel>Additional Team (one per line: Name|Email|Role)</FormLabel>
                  <Textarea
                    value={createForm.staff_payload}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCreateForm((prev) => ({ ...prev, staff_payload: e.target.value }))}
                    placeholder="Sara|sara@salon.ma|staff"
                    rows={4}
                  />
                </FormControl>
              </>
            )}

            {createStep === 4 && (
              <>
                <FormControl mb="3">
                  <FormLabel>Starter Services (Name|Duration Minutes|Price)</FormLabel>
                  <Textarea
                    value={createForm.services_payload}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCreateForm((prev) => ({ ...prev, services_payload: e.target.value }))}
                    rows={6}
                  />
                </FormControl>
                <Text fontSize="sm" color="gray.500">
                  Example: `Brushing|45|180`.
                </Text>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <ChakraButton
              variant="ghost"
              mr="3"
              onClick={() => {
                createModal.onClose();
                resetCreateWizard();
              }}
              isDisabled={isCreatingTenant}
            >
              Cancel
            </ChakraButton>
            {createStep > 1 && (
              <ChakraButton variant="outline" mr="3" onClick={() => setCreateStep((step) => Math.max(1, step - 1))} isDisabled={isCreatingTenant}>
                Back
              </ChakraButton>
            )}
            {createStep < 4 ? (
              <ChakraButton colorScheme="brand" onClick={() => setCreateStep((step) => Math.min(4, step + 1))} isDisabled={isCreatingTenant}>
                Next
              </ChakraButton>
            ) : (
              <ChakraButton colorScheme="brand" onClick={handleCreateTenant} isLoading={isCreatingTenant}>
                Provision Tenant
              </ChakraButton>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={editModal.isOpen} onClose={editModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Tenant</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb="3">
              <FormLabel>Name</FormLabel>
              <Input value={editForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} />
            </FormControl>
            <FormControl mb="3">
              <FormLabel>Subdomain</FormLabel>
              <Input value={editForm.subdomain} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm((prev) => ({ ...prev, subdomain: e.target.value }))} />
            </FormControl>
            <FormControl mb="3">
              <FormLabel>Timezone</FormLabel>
              <Input value={editForm.timezone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm((prev) => ({ ...prev, timezone: e.target.value }))} />
            </FormControl>
            <FormControl mb="3">
              <FormLabel>Currency</FormLabel>
              <Input value={editForm.default_currency} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm((prev) => ({ ...prev, default_currency: e.target.value }))} />
            </FormControl>
            <FormControl mb="3">
              <FormLabel>Contact Email</FormLabel>
              <Input value={editForm.contact_email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm((prev) => ({ ...prev, contact_email: e.target.value }))} />
            </FormControl>
            <FormControl mb="3">
              <FormLabel>Contact Phone</FormLabel>
              <Input value={editForm.contact_phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm((prev) => ({ ...prev, contact_phone: e.target.value }))} />
            </FormControl>
            <FormControl>
              <FormLabel>Status</FormLabel>
              <Select value={editForm.is_active ? 'active' : 'inactive'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditForm((prev) => ({ ...prev, is_active: e.target.value === 'active' }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <ChakraButton variant="ghost" mr="3" onClick={editModal.onClose}>Cancel</ChakraButton>
            <ChakraButton colorScheme="brand" onClick={handleSaveTenant}>Save</ChakraButton>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={resetModal.isOpen} onClose={resetModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Reset Password</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb="3">Reset password for {resetUser?.email}</Text>
            <FormControl>
              <FormLabel>New password</FormLabel>
              <Input type="password" value={resetPasswordValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResetPasswordValue(e.target.value)} />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <ChakraButton variant="ghost" mr="3" onClick={resetModal.onClose}>Cancel</ChakraButton>
            <ChakraButton colorScheme="brand" onClick={handleResetPassword}>Reset</ChakraButton>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={paymentModal.isOpen} onClose={paymentModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Record Payment</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb="3" isRequired>
              <FormLabel>Amount</FormLabel>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </FormControl>

            <FormControl mb="3">
              <FormLabel>Currency</FormLabel>
              <Input
                value={paymentForm.currency}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))}
                maxLength={3}
              />
            </FormControl>

            <FormControl mb="3">
              <FormLabel>Payment Method</FormLabel>
              <Select
                value={paymentForm.payment_method}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPaymentForm((prev) => ({ ...prev, payment_method: e.target.value }))}
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="paypal">PayPal</option>
                <option value="other">Other</option>
              </Select>
            </FormControl>

            <FormControl mb="3" isRequired>
              <FormLabel>Period Start</FormLabel>
              <Input
                type="date"
                value={paymentForm.period_start}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentForm((prev) => ({ ...prev, period_start: e.target.value }))}
              />
            </FormControl>

            <FormControl mb="3" isRequired>
              <FormLabel>Period End</FormLabel>
              <Input
                type="date"
                value={paymentForm.period_end}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentForm((prev) => ({ ...prev, period_end: e.target.value }))}
              />
            </FormControl>

            <FormControl mb="3">
              <FormLabel>Notes</FormLabel>
              <Input
                value={paymentForm.notes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Receipt ref, bank slip note, etc"
              />
            </FormControl>

            <Checkbox
              isChecked={paymentForm.activate_tenant}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentForm((prev) => ({ ...prev, activate_tenant: e.target.checked }))}
            >
              Activate tenant immediately
            </Checkbox>
          </ModalBody>
          <ModalFooter>
            <ChakraButton variant="ghost" mr="3" onClick={paymentModal.onClose}>Cancel</ChakraButton>
            <ChakraButton colorScheme="brand" onClick={handleCreatePayment} isLoading={isSubmittingPayment}>
              Save Payment
            </ChakraButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default TenantsManagementView;
