import type { Ward } from '@/lib/types';

export type WardMapCenter = {
  lat: number;
  lng: number;
};

export const WARD_MAP_CENTERS: Record<number, WardMapCenter> = {
  1: { lat: 28.7376, lng: 77.1177 }, // Rohini Sector 1
  2: { lat: 28.7218, lng: 77.1236 }, // Rohini Sector 7
  3: { lat: 28.7448, lng: 77.1308 }, // Rohini Sector 16
  4: { lat: 28.6519, lng: 77.1894 }, // Dev Nagar
  5: { lat: 28.6506, lng: 77.1909 }, // Karol Bagh Ward
  6: { lat: 28.6434, lng: 77.2163 }, // Paharganj
};

export function getWardMapCenter(ward: Pick<Ward, 'id' | 'name'>) {
  const directMatch = WARD_MAP_CENTERS[ward.id];

  if (directMatch) {
    return directMatch;
  }

  console.warn('Ward map center missing for ward. Falling back to Delhi center.', ward);
  return { lat: 28.6448, lng: 77.216721 };
}
