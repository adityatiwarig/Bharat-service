import 'server-only';

import { createHash } from 'node:crypto';

import type {
  PublicWardComplaintDistributionSummary,
  WardHeatmapPoint,
  WardHeatmapResponse,
} from '@/lib/types';
import { getRedisJson, setRedisJson } from '@/lib/server/redis-cache';
import {
  PUBLIC_WARD_DISTRIBUTION_CACHE_KEY,
  PUBLIC_WARD_DISTRIBUTION_CACHE_TTL_SECONDS,
} from '@/lib/server/analytics-cache';
import { query } from '@/lib/server/db';
import { listWards } from '@/lib/server/wards';
import { getWardMapCenter } from '@/lib/ward-map-centers';

type WardComplaintCountRow = {
  ward_id: number;
  ward_name: string;
  count: string;
};

type HeatmapZoomTier = WardHeatmapResponse['zoom_tier'];
type HeatmapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

async function listCanonicalWardCounts() {
  const wards = await listWards();
  const canonicalWardNameById = new Map(wards.map((ward) => [ward.id, ward.name]));
  const countsByWardId = new Map<number, number>();

  try {
    const result = await query<WardComplaintCountRow>(
      `
        SELECT
          c.ward_id,
          w.name AS ward_name,
          COUNT(*)::text AS count
        FROM complaints c
        INNER JOIN wards w ON w.id = c.ward_id
        GROUP BY c.ward_id, w.name
        ORDER BY c.ward_id ASC
      `,
    );

    for (const row of result.rows) {
      const canonicalWardName = canonicalWardNameById.get(row.ward_id);

      if (!canonicalWardName) {
        console.warn('Skipping ward distribution row with unmapped ward id', row);
        continue;
      }

      if (canonicalWardName !== row.ward_name) {
        console.warn('Ward distribution name mismatch detected; canonical ward name will be used.', {
          wardId: row.ward_id,
          aggregatedWardName: row.ward_name,
          canonicalWardName,
        });
      }

      countsByWardId.set(row.ward_id, Number(row.count) || 0);
    }
  } catch (error) {
    console.error('Failed to load public ward complaint distribution', error);
  }

  return wards.map((ward) => {
    const center = getWardMapCenter(ward);

    return {
      ward_id: ward.id,
      ward_name: ward.name,
      zone_id: ward.zone_id ?? null,
      zone_name: ward.zone_name ?? null,
      city: ward.city ?? 'Delhi',
      lat: center.lat,
      lng: center.lng,
      count: countsByWardId.get(ward.id) || 0,
    };
  });
}

function isPublicWardDistributionSummary(
  value: PublicWardComplaintDistributionSummary | null,
): value is PublicWardComplaintDistributionSummary {
  return Boolean(value && Array.isArray(value.wards));
}

async function buildPublicWardComplaintDistribution(): Promise<PublicWardComplaintDistributionSummary> {
  const wardRows = await listCanonicalWardCounts();

  const totalComplaints = wardRows.reduce((sum, ward) => sum + ward.count, 0);
  const activeWards = wardRows.filter((ward) => ward.count > 0).length;
  const maxCount = wardRows.reduce((max, ward) => Math.max(max, ward.count), 0);
  const dataVersion = createHash('sha1')
    .update(
      JSON.stringify(
        wardRows.map((ward) => ({
          ward_id: ward.ward_id,
          count: ward.count,
        })),
      ),
    )
    .digest('hex');

  return {
    wards: wardRows,
    total_complaints: totalComplaints,
    active_wards: activeWards,
    max_count: maxCount,
    data_version: dataVersion,
    generated_at: new Date().toISOString(),
  };
}

function mapWardSummaryToHeatmapPoints(summary: PublicWardComplaintDistributionSummary): WardHeatmapPoint[] {
  return summary.wards.map((ward) => ({
    ward_id: ward.ward_id,
    ward: ward.ward_name,
    count: ward.count,
    lat: ward.lat ?? null,
    lng: ward.lng ?? null,
    zone_name: ward.zone_name ?? null,
    point_count: 1,
    normalized_intensity: ward.count > 0 ? 1 : 0,
    resolution: 'detail',
    kind: 'ward',
  }));
}

export async function getWardHeatmapAnalytics(): Promise<WardHeatmapPoint[]> {
  const summary = await getPublicWardComplaintDistribution();
  return mapWardSummaryToHeatmapPoints(summary);
}

function getZoomTier(zoom?: number | null): HeatmapZoomTier {
  const normalizedZoom = Number.isFinite(zoom) ? Number(zoom) : DEFAULT_HEATMAP_ZOOM;

  if (normalizedZoom <= 6) {
    return 'low';
  }

  if (normalizedZoom <= 9) {
    return 'mid';
  }

  if (normalizedZoom <= 12) {
    return 'high';
  }

  return 'detail';
}

const DEFAULT_HEATMAP_ZOOM = 11;

function getGridStepForTier(tier: HeatmapZoomTier) {
  if (tier === 'low') {
    return 0.45;
  }

  if (tier === 'mid') {
    return 0.22;
  }

  if (tier === 'high') {
    return 0.1;
  }

  return 0;
}

function getBoundsPaddingForTier(tier: HeatmapZoomTier) {
  if (tier === 'low') {
    return 1.2;
  }

  if (tier === 'mid') {
    return 0.65;
  }

  if (tier === 'high') {
    return 0.28;
  }

  return 0.08;
}

function isPointInsideBounds(point: { lat: number | null; lng: number | null }, bounds?: HeatmapBounds | null, padding = 0) {
  if (!bounds || point.lat === null || point.lng === null) {
    return true;
  }

  return (
    point.lat <= bounds.north + padding &&
    point.lat >= bounds.south - padding &&
    point.lng <= bounds.east + padding &&
    point.lng >= bounds.west - padding
  );
}

function percentileCap(values: number[], percentile = 0.92) {
  if (!values.length) {
    return 1;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * percentile)));
  return Math.max(1, sorted[index] || sorted[sorted.length - 1] || 1);
}

function normalizeHeatIntensity(count: number, cap: number) {
  if (count <= 0 || cap <= 0) {
    return 0;
  }

  const clamped = Math.min(count, cap);
  return Number((Math.log1p(clamped) / Math.log1p(cap)).toFixed(4));
}

function aggregateHeatmapPoints(
  points: WardHeatmapPoint[],
  tier: HeatmapZoomTier,
  bounds?: HeatmapBounds | null,
) {
  const filtered = points.filter((point) => isPointInsideBounds(point, bounds, getBoundsPaddingForTier(tier)));

  if (tier === 'detail') {
    return filtered.map((point) => ({
      ...point,
      point_count: point.point_count || 1,
      resolution: 'detail' as const,
      kind: 'ward' as const,
    }));
  }

  const step = getGridStepForTier(tier);
  const cells = new Map<string, {
    count: number;
    weightedLat: number;
    weightedLng: number;
    totalWeight: number;
    point_count: number;
    maxSingleCount: number;
    ward_id: number;
    ward: string;
    zone_name?: string | null;
  }>();

  for (const point of filtered) {
    if (point.lat === null || point.lng === null) {
      continue;
    }

    const cellLat = Math.floor(point.lat / step);
    const cellLng = Math.floor(point.lng / step);
    const key = `${cellLat}:${cellLng}`;
    const existing = cells.get(key);
    const weight = Math.max(1, point.count);

    if (!existing) {
      cells.set(key, {
        count: point.count,
        weightedLat: point.lat * weight,
        weightedLng: point.lng * weight,
        totalWeight: weight,
        point_count: point.point_count || 1,
        maxSingleCount: point.count,
        ward_id: point.ward_id,
        ward: point.ward,
        zone_name: point.zone_name ?? null,
      });
      continue;
    }

    existing.count += point.count;
    existing.weightedLat += point.lat * weight;
    existing.weightedLng += point.lng * weight;
    existing.totalWeight += weight;
    existing.point_count += point.point_count || 1;

    if (point.count > existing.maxSingleCount) {
      existing.maxSingleCount = point.count;
      existing.ward_id = point.ward_id;
      existing.ward = point.ward;
      existing.zone_name = point.zone_name ?? null;
    }
  }

  return [...cells.values()].map((cell) => ({
    ward_id: cell.ward_id,
    ward: cell.ward,
    count: cell.count,
    lat: Number((cell.weightedLat / cell.totalWeight).toFixed(6)),
    lng: Number((cell.weightedLng / cell.totalWeight).toFixed(6)),
    zone_name: cell.zone_name ?? null,
    point_count: cell.point_count,
    resolution: tier,
    kind: 'cell' as const,
  }));
}

export async function getWardHeatmapData(input: {
  zoom?: number | null;
  bounds?: HeatmapBounds | null;
} = {}): Promise<WardHeatmapResponse> {
  const summary = await getPublicWardComplaintDistribution();
  const basePoints = mapWardSummaryToHeatmapPoints(summary);
  const zoomTier = getZoomTier(input.zoom);
  const aggregated = aggregateHeatmapPoints(basePoints, zoomTier, input.bounds)
    .sort((left, right) => right.count - left.count);
  const normalizationCap = percentileCap(aggregated.map((point) => point.count), 0.9);

  return {
    points: aggregated.map((point) => ({
      ...point,
      normalized_intensity: normalizeHeatIntensity(point.count, normalizationCap),
    })),
    zoom_tier: zoomTier,
    normalization_cap: normalizationCap,
    data_version: summary.data_version,
    generated_at: new Date().toISOString(),
  };
}

export async function getPublicWardComplaintDistribution(): Promise<PublicWardComplaintDistributionSummary> {
  const cached = await getRedisJson<PublicWardComplaintDistributionSummary>(PUBLIC_WARD_DISTRIBUTION_CACHE_KEY);

  if (isPublicWardDistributionSummary(cached)) {
    return cached;
  }

  const summary = await buildPublicWardComplaintDistribution();

  await setRedisJson(
    PUBLIC_WARD_DISTRIBUTION_CACHE_KEY,
    summary,
    PUBLIC_WARD_DISTRIBUTION_CACHE_TTL_SECONDS,
  );

  return summary;
}
