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
} from '@chakra-ui/react';
import { ExternalLink, Plus, MoreVertical } from 'lucide-react';
import { createTenant, fetchTenantStats, fetchTenants, updateTenantById } from '../../api/tenantApi';
import { fetchUsers, resetUserPassword, updateUser } from '../../api/userApi';
import { TenantOut } from '../../types/tenants';
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
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const createModal = useDisclosure();
  const editModal = useDisclosure();
  const detailDrawer = useDisclosure();
  const resetModal = useDisclosure();

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
    setIsLoadingDetails(true);
    detailDrawer.onOpen();
    try {
      const [statsResponse, usersResponse] = await Promise.all([
        fetchTenantStats(tenant.id),
        fetchUsers({ page: 1, limit: 10, tenant_id_filter: tenant.id }),
      ]);
      setTenantStats(statsResponse);
      setTenantUsers(usersResponse.items || []);
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
              <Badge colorScheme={selectedTenant?.is_active ? 'green' : 'red'}>
                {selectedTenant?.is_active ? 'Active' : 'Inactive'}
              </Badge>
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
                  <Text fontSize="sm" color="gray.600">Total revenue is derived from completed appointments.</Text>
                  <Flex gap="4" flexWrap="wrap" mt="3">
                    <Box flex="1" minW="180px" bg="gray.50" p="3" borderRadius="md">
                      <Text fontSize="xs" color="gray.500">Revenue (30 days)</Text>
                      <Text fontSize="lg" fontWeight="bold">{tenantStats?.revenue_last_30_days?.toFixed(2) || '0.00'}</Text>
                    </Box>
                    <Box flex="1" minW="180px" bg="gray.50" p="3" borderRadius="md">
                      <Text fontSize="xs" color="gray.500">Revenue (All time)</Text>
                      <Text fontSize="lg" fontWeight="bold">{tenantStats?.revenue_total?.toFixed(2) || '0.00'}</Text>
                    </Box>
                  </Flex>
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
    </div>
  );
};

export default TenantsManagementView;
