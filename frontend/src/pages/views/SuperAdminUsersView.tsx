// src/pages/views/SuperAdminUsersView.tsx

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button as ChakraButton,
  Center,
  Flex,
  Heading,
  HStack,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
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
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Tag,
} from '@chakra-ui/react';
import { MoreVertical, Plus, ExternalLink } from 'lucide-react';
import { fetchTenants } from '../../api/tenantApi';
import { createUser, fetchUsers, resetUserPassword, updateUser } from '../../api/userApi';
import { TenantOut } from '../../types/tenants';
import { UserOut, UserUpdatePayload } from '../../types/User';
import { useBrandedToast } from '../../hooks/useBrandedToast';

const ITEMS_PER_PAGE = 10;

type PasswordResetState = {
  user: UserOut | null;
  password: string;
};

type CreateUserState = {
  name: string;
  email: string;
  password: string;
  role: string;
  tenant_id: string;
};

const SuperAdminUsersView: React.FC = () => {
  const toast = useBrandedToast();
  const [tenants, setTenants] = useState<TenantOut[]>([]);
  const [users, setUsers] = useState<UserOut[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const resetModal = useDisclosure();
  const createModal = useDisclosure();
  const [passwordResetState, setPasswordResetState] = useState<PasswordResetState>({ user: null, password: '' });
  const [createUserState, setCreateUserState] = useState<CreateUserState>({
    name: '',
    email: '',
    password: '',
    role: 'admin',
    tenant_id: '',
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

  const tenantMap = useMemo(() => {
    const map = new Map<number, TenantOut>();
    tenants.forEach((tenant) => map.set(tenant.id, tenant));
    return map;
  }, [tenants]);

  const loadTenants = useCallback(async () => {
    try {
      const data = await fetchTenants();
      setTenants(data);
    } catch (err: any) {
      toast({ title: 'Failed to load tenants', description: err.response?.data?.detail || err.message, status: 'error' });
    }
  }, [toast]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchUsers({
        page,
        limit: ITEMS_PER_PAGE,
        role: roleFilter || undefined,
        is_active: statusFilter === '' ? undefined : statusFilter === 'active',
        tenant_id_filter: tenantFilter ? Number(tenantFilter) : undefined,
      });
      setUsers(response.items || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users.');
      setUsers([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, roleFilter, statusFilter, tenantFilter]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleUserStatus = async (user: UserOut) => {
    try {
      const payload: UserUpdatePayload = { is_active: !user.is_active };
      await updateUser(user.id, payload);
      toast({ title: `User ${user.is_active ? 'deactivated' : 'activated'}`, status: 'success' });
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Failed to update user', description: err.response?.data?.detail || err.message, status: 'error' });
    }
  };

  const handleRoleChange = async (user: UserOut, role: string) => {
    if (user.role === role) return;
    try {
      await updateUser(user.id, { role });
      toast({ title: 'Role updated', status: 'success' });
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Failed to update role', description: err.response?.data?.detail || err.message, status: 'error' });
    }
  };

  const handleOpenResetPassword = (user: UserOut) => {
    setPasswordResetState({ user, password: '' });
    resetModal.onOpen();
  };

  const handleResetPassword = async () => {
    if (!passwordResetState.user) return;
    if (passwordResetState.password.trim().length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters.', status: 'warning' });
      return;
    }
    try {
      await resetUserPassword(passwordResetState.user.id, passwordResetState.password.trim());
      toast({ title: 'Password reset', status: 'success' });
      resetModal.onClose();
    } catch (err: any) {
      toast({ title: 'Failed to reset password', description: err.response?.data?.detail || err.message, status: 'error' });
    }
  };

  const handleCreateUser = async () => {
    if (!createUserState.tenant_id) {
      toast({ title: 'Tenant required', description: 'Select a tenant for this user.', status: 'warning' });
      return;
    }
    try {
      await createUser({
        name: createUserState.name.trim(),
        email: createUserState.email.trim(),
        password: createUserState.password,
        role: createUserState.role,
        tenant_id: Number(createUserState.tenant_id),
      });
      toast({ title: 'User created', status: 'success' });
      createModal.onClose();
      setCreateUserState({ name: '', email: '', password: '', role: 'admin', tenant_id: '' });
      loadUsers();
    } catch (err: any) {
      toast({ title: 'Failed to create user', description: err.response?.data?.detail || err.message, status: 'error' });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const filteredUsers = useMemo(() => {
    if (!searchInput.trim()) return users;
    const needle = searchInput.trim().toLowerCase();
    return users.filter((user) =>
      [user.name, user.email].some((value) => value?.toLowerCase().includes(needle))
    );
  }, [users, searchInput]);

  return (
    <div className="view-section">
      <Box p={{ base: '2', md: '4' }} bg="white">
        <Flex alignItems="center" justifyContent="space-between" mb="6" flexWrap="wrap" gap="3">
          <Heading as="h1" size="lg" color="gray.700">Users</Heading>
          <ChakraButton colorScheme="brand" leftIcon={<Plus size={16} />} onClick={createModal.onOpen}>
            New User
          </ChakraButton>
        </Flex>

        <Flex mb="4" gap="3" flexWrap="wrap">
          <Input
            placeholder="Search name or email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            maxW="260px"
          />
          <Select value={tenantFilter} onChange={(e) => { setTenantFilter(e.target.value); setPage(1); }} maxW="220px">
            <option value="">All tenants</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
            ))}
          </Select>
          <Select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} maxW="180px">
            <option value="">All roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </Select>
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} maxW="180px">
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

        {!isLoading && !error && filteredUsers.length === 0 && (
          <Text>No users found.</Text>
        )}

        {!isLoading && !error && filteredUsers.length > 0 && (
          <TableContainer borderWidth="1px" borderColor="gray.200" borderRadius="md">
            <Table variant="simple" size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Tenant</Th>
                  <Th>Status</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredUsers.map((user) => {
                  const tenant = tenantMap.get(user.tenant_id);
                  const tenantLabel = tenant ? tenant.name : `Tenant ${user.tenant_id}`;
                  return (
                    <Tr key={user.id}>
                      <Td>{user.name}</Td>
                      <Td>{user.email}</Td>
                      <Td>
                        <Select
                          size="sm"
                          value={user.role}
                          onChange={(e) => handleRoleChange(user, e.target.value)}
                          maxW="140px"
                        >
                          <option value="super_admin">Super Admin</option>
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                        </Select>
                      </Td>
                      <Td>{tenantLabel}</Td>
                      <Td>
                        <Tag colorScheme={user.is_active ? 'green' : 'red'} size="sm">
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Tag>
                      </Td>
                      <Td textAlign="right">
                        <HStack justify="flex-end">
                          {tenant?.subdomain && baseDomain && (
                            <IconButton
                              aria-label="Open tenant"
                              size="sm"
                              variant="outline"
                              icon={<ExternalLink size={16} />}
                              onClick={() => window.open(`${protocol}//${tenant.subdomain}.${baseDomain}/dashboard`, '_blank')}
                            />
                          )}
                          <Menu>
                            <MenuButton
                              as={IconButton}
                              aria-label="User actions"
                              icon={<MoreVertical size={16} />}
                              size="sm"
                              variant="ghost"
                            />
                            <MenuList>
                              <MenuItem onClick={() => handleOpenResetPassword(user)}>Reset password</MenuItem>
                              <MenuItem onClick={() => handleToggleUserStatus(user)}>
                                {user.is_active ? 'Deactivate' : 'Activate'}
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>
        )}

        {!isLoading && !error && totalPages > 1 && (
          <Flex justifyContent="center" mt="6">
            <HStack>
              <ChakraButton size="sm" variant="outline" onClick={() => setPage(Math.max(1, page - 1))} isDisabled={page === 1}>
                Previous
              </ChakraButton>
              <Text fontSize="sm">Page {page} of {totalPages}</Text>
              <ChakraButton size="sm" variant="outline" onClick={() => setPage(Math.min(totalPages, page + 1))} isDisabled={page === totalPages}>
                Next
              </ChakraButton>
            </HStack>
          </Flex>
        )}
      </Box>

      <Modal isOpen={resetModal.isOpen} onClose={resetModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Reset Password</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb="3">Reset password for {passwordResetState.user?.email}</Text>
            <FormControl>
              <FormLabel>New password</FormLabel>
              <Input
                type="password"
                value={passwordResetState.password}
                onChange={(e) => setPasswordResetState((prev) => ({ ...prev, password: e.target.value }))}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <ChakraButton variant="ghost" mr="3" onClick={resetModal.onClose}>Cancel</ChakraButton>
            <ChakraButton colorScheme="brand" onClick={handleResetPassword}>Reset</ChakraButton>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={createModal.isOpen} onClose={createModal.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb="3">
              <FormLabel>Name</FormLabel>
              <Input value={createUserState.name} onChange={(e) => setCreateUserState((prev) => ({ ...prev, name: e.target.value }))} />
            </FormControl>
            <FormControl mb="3">
              <FormLabel>Email</FormLabel>
              <Input value={createUserState.email} onChange={(e) => setCreateUserState((prev) => ({ ...prev, email: e.target.value }))} />
            </FormControl>
            <FormControl mb="3">
              <FormLabel>Password</FormLabel>
              <Input type="password" value={createUserState.password} onChange={(e) => setCreateUserState((prev) => ({ ...prev, password: e.target.value }))} />
            </FormControl>
            <FormControl mb="3">
              <FormLabel>Role</FormLabel>
              <Select value={createUserState.role} onChange={(e) => setCreateUserState((prev) => ({ ...prev, role: e.target.value }))}>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Tenant</FormLabel>
              <Select value={createUserState.tenant_id} onChange={(e) => setCreateUserState((prev) => ({ ...prev, tenant_id: e.target.value }))}>
                <option value="">Select tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                ))}
              </Select>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <ChakraButton variant="ghost" mr="3" onClick={createModal.onClose}>Cancel</ChakraButton>
            <ChakraButton colorScheme="brand" onClick={handleCreateUser}>Create</ChakraButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default SuperAdminUsersView;
