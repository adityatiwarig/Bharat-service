import 'server-only';

export const PUBLIC_WARD_DISTRIBUTION_CACHE_KEY = 'analytics:public-ward-distribution:v1';
export const PUBLIC_WARD_DISTRIBUTION_CACHE_TTL_SECONDS = 60;

export const COMPLAINT_ANALYTICS_CACHE_KEYS = [
  PUBLIC_WARD_DISTRIBUTION_CACHE_KEY,
] as const;
