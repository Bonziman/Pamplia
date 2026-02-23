// src/hooks/useQueryHooks.ts
// Centralized React Query hooks for all data domains
// These hooks replace manual useState + useEffect + useCallback patterns

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// API imports
import { fetchDashboardStats, fetchRevenueChartData } from '../api/dashboardApi';
import {
  fetchManagedServices, createService, updateService, deleteService,
  type ServiceCreatePayload, type ServiceUpdatePayload,
} from '../api/serviceApi';
import {
  fetchTemplates, createTemplate, updateTemplate, deleteTemplate,
} from '../api/templateApi';
import {
  fetchTags, createTag, updateTag, deleteTag,
  type TagCreatePayload, type TagUpdatePayload,
} from '../api/tagApi';
import { fetchTenantMe, updateTenantMe } from '../api/tenantApi';
import type { TemplateCreatePayload, TemplateUpdatePayload } from '../types/Template';
import type { StatsPeriod } from '../types/Dashboard';
import type { TenantUpdate } from '../types/tenants';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const queryKeys = {
  dashboardStats: (period: StatsPeriod) => ['dashboard', 'stats', period] as const,
  revenueChart: ['dashboard', 'revenue-trend'] as const,
  services: ['services'] as const,
  templates: ['templates'] as const,
  tags: ['tags'] as const,
  tenantMe: ['tenants', 'me'] as const,
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const useDashboardStats = (period: StatsPeriod) =>
  useQuery({
    queryKey: queryKeys.dashboardStats(period),
    queryFn: () => fetchDashboardStats(period),
  });

export const useRevenueChart = () =>
  useQuery({
    queryKey: queryKeys.revenueChart,
    queryFn: fetchRevenueChartData,
  });

// ─── Services ────────────────────────────────────────────────────────────────

export const useServices = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.services,
    queryFn: fetchManagedServices,
    enabled,
  });

export const useCreateService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ServiceCreatePayload) => createService(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.services }),
  });
};

export const useUpdateService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ServiceUpdatePayload }) =>
      updateService(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.services }),
  });
};

export const useDeleteService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteService(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.services }),
  });
};

// ─── Templates ───────────────────────────────────────────────────────────────

export const useTemplates = () =>
  useQuery({
    queryKey: queryKeys.templates,
    queryFn: fetchTemplates,
  });

export const useCreateTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TemplateCreatePayload) => createTemplate(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.templates }),
  });
};

export const useUpdateTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TemplateUpdatePayload }) =>
      updateTemplate(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.templates }),
  });
};

export const useDeleteTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.templates }),
  });
};

// ─── Tags ────────────────────────────────────────────────────────────────────

export const useTags = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.tags,
    queryFn: fetchTags,
    enabled,
  });

export const useCreateTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TagCreatePayload) => createTag(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tags }),
  });
};

export const useUpdateTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TagUpdatePayload }) =>
      updateTag(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tags }),
  });
};

export const useDeleteTag = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteTag(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tags }),
  });
};

// ─── Tenant Settings ─────────────────────────────────────────────────────────

export const useTenantMe = () =>
  useQuery({
    queryKey: queryKeys.tenantMe,
    queryFn: fetchTenantMe,
  });

export const useUpdateTenantMe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TenantUpdate) => updateTenantMe(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tenantMe }),
  });
};
