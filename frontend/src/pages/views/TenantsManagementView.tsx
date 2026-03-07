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
} from '@chakra-ui/react';
import { ExternalLink, Plus, MoreVertical } from 'lucide-react';
import { createTenant, createTenantPayment, fetchTenantPayments, fetchTenantStats, fetchTenants, updateTenantById } from '../../api/tenantApi';
import { fetchUsers, resetUserPassword, updateUser } from '../../api/userApi';
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

  const [selectedTenant, setSelectedTenant] = useState<TenantOut | null>(null);
  const [tenantStats, setTenantStats] = useState<any>(null);
  const [tenantUsers, setTenantUsers] = useState<UserOut[]>([]);
  const [tenantPayments, setTenantPayments] = useState<TenantPaymentRecord[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const createModal = useDisclosure();
  const editModal = useDisclosure();
  const detailDrawer = useDisclosure();
  const resetModal = useDisclosure();
  const paymentModal = useDisclosure();

  const [createForm, setCreateForm] = useState({ name: '', subdomain: '' });
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
    return tenants.filter((tenant: TenantOut) => {
      const matchesSearch =
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.subdomain.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter
        ? (statusFilter === 'active' ? tenant.is_active : !tenant.is_active)
        : true;
      return matchesSearch && matchesStatus;
    });
  }, [tenants, searchQuery, statusFilter]);

  const handleOpenDetails = async (tenant: TenantOut) => {
    setSelectedTenant(tenant);
    setTenantStats(null);
    setTenantUsers([]);
    setTenantPayments([]);
    setIsLoadingDetails(true);
    detailDrawer.onOpen();
    try {
      const [statsResponse, usersResponse, paymentsResponse] = await Promise.all([
        fetchTenantStats(tenant.id),
        fetchUsers({ page: 1, limit: 10, tenant_id_filter: tenant.id }),
        fetchTenantPayments(tenant.id, 10),
      ]);
      setTenantStats(statsResponse);
      setTenantUsers(usersResponse.items || []);
      setTenantPayments(paymentsResponse);
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
      toast({ title: 'Name and subdomain required', status: 'warning' });
      return;
    }
    try {
      await createTenant({ name: createForm.name.trim(), subdomain: createForm.subdomain.trim() });
      toast({ title: 'Tenant created', status: 'success' });
      createModal.onClose();
      setCreateForm({ name: '', subdomain: '' });
      loadTenants();
    } catch (err: any) {
      toast({ title: 'Failed to create tenant', description: err.response?.data?.detail || err.message, status: 'error' });
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

  return (
    <div className="view-section">
      <Box p={{ base: '2', md: '4' }} bg="white">
        <Flex alignItems="center" justifyContent="space-between" mb="6" flexWrap="wrap" gap="3">
          <Heading as="h1" size="lg" color="gray.700">Tenants</Heading>
          <ChakraButton colorScheme="brand" leftIcon={<Plus size={16} />} onClick={createModal.onOpen}>
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
        </Flex>

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
                {filteredTenants.map((tenant) => (
                  <Tr key={tenant.id}>
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
                    <Td>{tenant.next_due_at ? new Date(tenant.next_due_at).toLocaleDateString() : '-'}</Td>
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
                ))}
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
          <ModalHeader>Create Tenant</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb="3">
              <FormLabel>Name</FormLabel>
              <Input value={createForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))} />
            </FormControl>
            <FormControl>
              <FormLabel>Subdomain</FormLabel>
              <Input value={createForm.subdomain} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm((prev) => ({ ...prev, subdomain: e.target.value }))} />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <ChakraButton variant="ghost" mr="3" onClick={createModal.onClose}>Cancel</ChakraButton>
            <ChakraButton colorScheme="brand" onClick={handleCreateTenant}>Create</ChakraButton>
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
