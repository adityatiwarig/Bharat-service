'use client';

import type { GeoEvidenceMetadata, GeoVerificationStatus } from '@/lib/types';

export type GeoEvidenceDraft = {
  originalFile: File;
  taggedFile: File;
  metadata: GeoEvidenceMetadata;
};

type ReverseGeocodeResponse = {
  address?: string | null;
  city?: string | null;
  area?: string | null;
};

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

function formatTimestamp(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function haversineDistanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

export function buildGeoVerification(
  metadata: GeoEvidenceMetadata,
  complaintLocation?: { latitude?: number | null; longitude?: number | null },
  acceptedRadiusMeters = 300,
) {
  if (
    !metadata.location_available ||
    metadata.latitude === undefined ||
    metadata.latitude === null ||
    metadata.longitude === undefined ||
    metadata.longitude === null
  ) {
    return {
      verification_status: 'not_verified' as GeoVerificationStatus,
      verification_label: 'Not Verified',
      distance_from_complaint_meters: null,
      accepted_radius_meters: acceptedRadiusMeters,
    };
  }

  if (
    complaintLocation?.latitude === undefined ||
    complaintLocation?.latitude === null ||
    complaintLocation?.longitude === undefined ||
    complaintLocation?.longitude === null
  ) {
    return {
      verification_status: 'location_captured' as GeoVerificationStatus,
      verification_label: 'Location Captured',
      distance_from_complaint_meters: null,
      accepted_radius_meters: acceptedRadiusMeters,
    };
  }

  const distance = haversineDistanceMeters(
    metadata.latitude,
    metadata.longitude,
    complaintLocation.latitude,
    complaintLocation.longitude,
  );

  if (distance <= acceptedRadiusMeters) {
    return {
      verification_status: 'geo_verified' as GeoVerificationStatus,
      verification_label: 'Geo Verified',
      distance_from_complaint_meters: Math.round(distance),
      accepted_radius_meters: acceptedRadiusMeters,
    };
  }

  return {
    verification_status: 'location_mismatch' as GeoVerificationStatus,
    verification_label: 'Location Mismatch',
    distance_from_complaint_meters: Math.round(distance),
    accepted_radius_meters: acceptedRadiusMeters,
  };
}

export function buildMapPreviewDataUrl(metadata: Pick<GeoEvidenceMetadata, 'latitude' | 'longitude'>) {
  const latitude = metadata.latitude?.toFixed(5) || '--';
  const longitude = metadata.longitude?.toFixed(5) || '--';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="96" viewBox="0 0 160 96">
      <rect width="160" height="96" rx="12" fill="#0f172a"/>
      <rect x="8" y="8" width="144" height="80" rx="10" fill="#e2e8f0"/>
      <path d="M8 56C28 44 48 62 68 50C88 38 108 54 128 42C138 36 146 36 152 38V88H8Z" fill="#bfdbfe"/>
      <path d="M8 44C26 34 48 48 64 40C86 29 102 44 118 36C132 29 144 32 152 36" stroke="#94a3b8" stroke-width="3" fill="none"/>
      <circle cx="80" cy="46" r="10" fill="#dc2626"/>
      <circle cx="80" cy="46" r="4" fill="#fff"/>
      <path d="M80 58L74 46H86Z" fill="#dc2626"/>
      <rect x="16" y="66" width="128" height="14" rx="7" fill="rgba(15,23,42,0.78)"/>
      <text x="80" y="76" font-size="9" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif">${latitude}, ${longitude}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResponse> {
  try {
    const response = await fetch(`/api/geo/reverse?lat=${latitude}&lon=${longitude}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return {};
    }

    return (await response.json()) as ReverseGeocodeResponse;
  } catch {
    return {};
  }
}

async function captureLocation() {
  if (!navigator.geolocation) {
    return {
      latitude: null,
      longitude: null,
      location_available: false,
    };
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      });
    });

    return {
      latitude: Number(position.coords.latitude.toFixed(6)),
      longitude: Number(position.coords.longitude.toFixed(6)),
      location_available: true,
    };
  } catch {
    return {
      latitude: null,
      longitude: null,
      location_available: false,
    };
  }
}

async function readImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to read the image.'));
    };
    image.src = url;
  });
}

async function stampImage(file: File, metadata: GeoEvidenceMetadata) {
  const image = await readImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Unable to prepare the image canvas.');
  }

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const overlayHeight = Math.max(168, Math.round(canvas.height * 0.23));
  const overlayTop = canvas.height - overlayHeight;
  const mapWidth = Math.min(220, Math.round(canvas.width * 0.24));
  const mapHeight = Math.round(mapWidth * 0.6);
  const padding = Math.max(18, Math.round(canvas.width * 0.018));

  context.fillStyle = 'rgba(0, 0, 0, 0.62)';
  context.fillRect(0, overlayTop, canvas.width, overlayHeight);

  const mapImage = new Image();
  mapImage.src = buildMapPreviewDataUrl(metadata);
  await new Promise((resolve) => {
    mapImage.onload = resolve;
    mapImage.onerror = resolve;
  });
  context.drawImage(mapImage, padding, overlayTop + padding, mapWidth, mapHeight);

  const label = metadata.verification_label || 'Location Captured';
  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.fillRect(padding, overlayTop + padding + mapHeight + 12, 160, 30);
  context.fillStyle = '#ffffff';
  context.font = '600 18px Arial';
  context.fillText(`📍 ${label}`, padding + 12, overlayTop + padding + mapHeight + 33);

  const textLeft = padding + mapWidth + 20;
  let lineTop = overlayTop + padding + 22;
  context.fillStyle = '#ffffff';
  context.font = '600 20px Arial';
  context.fillText([metadata.city, metadata.area].filter(Boolean).join(', ') || 'Location Captured', textLeft, lineTop);

  context.font = '400 16px Arial';
  const lines = [
    metadata.address || 'Location not available',
    `Lat: ${metadata.latitude?.toFixed(6) || 'N/A'}  Long: ${metadata.longitude?.toFixed(6) || 'N/A'}`,
    `Time: ${metadata.captured_at || formatTimestamp(new Date())}`,
  ];

  for (const line of lines) {
    lineTop += 28;
    context.fillText(line, textLeft, lineTop, canvas.width - textLeft - padding);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (!nextBlob) {
          reject(new Error('Unable to save the stamped image.'));
          return;
        }

        resolve(nextBlob);
      },
      'image/jpeg',
      0.92,
    );
  });

  const baseName = file.name.replace(/\.[^.]+$/, '') || `geo-evidence-${Date.now()}`;
  return new File([blob], `${baseName}-geo.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

export async function createGeoEvidenceDraft(
  file: File,
  options?: {
    source?: 'camera' | 'upload';
    complaintLocation?: { latitude?: number | null; longitude?: number | null };
    acceptedRadiusMeters?: number;
  },
) {
  const location = await captureLocation();
  const timestamp = new Date();
  const geocode =
    location.location_available && location.latitude !== null && location.longitude !== null
      ? await reverseGeocode(location.latitude, location.longitude)
      : {};

  const baseMetadata: GeoEvidenceMetadata = {
    latitude: location.latitude,
    longitude: location.longitude,
    address: geocode.address || null,
    city: geocode.city || null,
    area: geocode.area || null,
    captured_at: formatTimestamp(timestamp),
    source: options?.source || 'unknown',
    location_available: location.location_available,
  };

  const verification = buildGeoVerification(
    baseMetadata,
    options?.complaintLocation,
    options?.acceptedRadiusMeters,
  );

  const metadata: GeoEvidenceMetadata = {
    ...baseMetadata,
    ...verification,
  };

  const taggedFile = await stampImage(file, metadata);

  return {
    originalFile: file,
    taggedFile,
    metadata,
  } satisfies GeoEvidenceDraft;
}
