const DEFAULT_BACKEND_PORT = "8085";

export const getApiBaseUrl = (): string => {
  const envUrl = process.env.REACT_APP_API_URL;

  // Always use the configured API URL (e.g. https://api.pamplia.store)
  // Tenant context for authenticated requests is derived from the JWT token,
  // not from the Host header, so all API calls should go through the API gateway.
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/+$/, "");
  }

  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${DEFAULT_BACKEND_PORT}`;
};

export const buildApiUrl = (path: string): string => {
  const baseUrl = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};
