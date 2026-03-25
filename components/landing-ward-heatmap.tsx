'use client';

import { memo, useEffect, useRef } from 'react';

import { useLandingLanguage } from '@/components/landing-language';
import { fetchJson } from '@/lib/client/api';
import { DELHI_WARDS } from '@/lib/constants';
import type { WardHeatmapPoint, WardHeatmapResponse } from '@/lib/types';

const DELHI_CENTER: [number, number] = [28.6448, 77.216721];
const DEFAULT_ZOOM = 11;
const COUNT_BADGE_ZOOM_THRESHOLD = 14;
const LABEL_ZOOM_THRESHOLD = 15;
const MAX_VISIBLE_LABELS = 4;
const HEATMAP_FETCH_DEBOUNCE_MS = 140;
const HEATMAP_AUTO_REFRESH_MS = 20000;

type LeafletModule = typeof import('leaflet');
type LeafletMapInstance = ReturnType<LeafletModule['map']>;
type LeafletLayerGroup = ReturnType<LeafletModule['layerGroup']>;
type WardMarkerRow = WardHeatmapPoint;
type WardCluster =
  | {
      kind: 'ward';
      key: string;
      ward: WardMarkerRow;
    }
  | {
      kind: 'cluster';
      key: string;
      lat: number;
      lng: number;
      count: number;
      wards: WardMarkerRow[];
    };

const FALLBACK_WARD_ROWS: WardMarkerRow[] = DELHI_WARDS.map((ward) => ({
  ward_id: ward.id,
  ward: ward.name,
  zone_name: ward.zone_name ?? null,
  lat: ward.lat ?? null,
  lng: ward.lng ?? null,
  count: 0,
}));

function getMarkerRadius(count: number) {
  if (count >= 10) {
    return 16;
  }

  if (count >= 6) {
    return 13;
  }

  if (count >= 3) {
    return 10;
  }

  return 7;
}

function getMarkerPalette(count: number) {
  if (count >= 10) {
    return {
      fillColor: '#dc2626',
      strokeColor: '#991b1b',
      fillOpacity: 0.84,
    };
  }

  if (count >= 6) {
    return {
      fillColor: '#f97316',
      strokeColor: '#c2410c',
      fillOpacity: 0.82,
    };
  }

  if (count >= 3) {
    return {
      fillColor: '#facc15',
      strokeColor: '#ca8a04',
      fillOpacity: 0.8,
    };
  }

  return {
    fillColor: '#16a34a',
    strokeColor: '#166534',
    fillOpacity: 0.78,
  };
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized
        .split('')
        .map((part) => part + part)
        .join('')
    : normalized;

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getHeatPixelRadius(point: WardMarkerRow, zoom: number) {
  const intensity = point.normalized_intensity ?? 0;
  const resolutionBase = point.resolution === 'low'
    ? 48
    : point.resolution === 'mid'
      ? 40
      : point.resolution === 'high'
        ? 32
        : 24;
  const countBoost = Math.max(0.9, Math.min(1.45, 0.9 + intensity * 0.55));
  const clusterBoost = Math.min(1.3, 1 + ((point.point_count || 1) - 1) * 0.05);
  const zoomFactor = Math.max(0.56, 1 - (zoom - DEFAULT_ZOOM) * 0.08);
  const farZoomCompression = zoom <= 7
    ? 0.72
    : zoom <= 8
      ? 0.82
      : 1;
  const baseRadius = resolutionBase * countBoost;
  return Math.round(baseRadius * zoomFactor * clusterBoost * farZoomCompression);
}

function getHeatAlpha(point: WardMarkerRow, zoom: number) {
  const intensity = point.normalized_intensity ?? 0;
  const resolutionAlpha = point.resolution === 'low'
    ? 0.62
    : point.resolution === 'mid'
      ? 0.72
      : point.resolution === 'high'
        ? 0.82
        : 0.92;
  const clusterBoost = Math.min(1.12, 1 + ((point.point_count || 1) - 1) * 0.025);
  const zoomPenalty = Math.max(0, zoom - DEFAULT_ZOOM) * 0.025;
  return Math.max(0.14, Number((Math.max(0.18, intensity) * resolutionAlpha * clusterBoost - zoomPenalty).toFixed(3)));
}

function getOrganicSeed(value: number) {
  const sine = Math.sin(value * 12.9898) * 43758.5453;
  return sine - Math.floor(sine);
}

function drawSoftHalo(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(88, 226, 178, ${alpha * 0.38})`);
  gradient.addColorStop(0.38, `rgba(110, 232, 196, ${alpha * 0.34})`);
  gradient.addColorStop(0.68, `rgba(68, 190, 255, ${alpha * 0.26})`);
  gradient.addColorStop(1, 'rgba(68, 190, 255, 0)');

  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawHeatCore(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  count: number,
) {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);

  if (count >= 10) {
    gradient.addColorStop(0, `rgba(255, 20, 20, ${alpha})`);
    gradient.addColorStop(0.16, `rgba(255, 80, 0, ${alpha * 0.98})`);
    gradient.addColorStop(0.3, `rgba(255, 208, 0, ${alpha * 0.84})`);
    gradient.addColorStop(0.5, `rgba(92, 227, 174, ${alpha * 0.36})`);
    gradient.addColorStop(0.74, `rgba(63, 180, 255, ${alpha * 0.2})`);
    gradient.addColorStop(1, 'rgba(63, 180, 255, 0)');
  } else if (count >= 6) {
    gradient.addColorStop(0, `rgba(255, 96, 0, ${alpha * 0.96})`);
    gradient.addColorStop(0.2, `rgba(255, 214, 0, ${alpha * 0.82})`);
    gradient.addColorStop(0.46, `rgba(101, 228, 176, ${alpha * 0.34})`);
    gradient.addColorStop(0.72, `rgba(63, 180, 255, ${alpha * 0.18})`);
    gradient.addColorStop(1, 'rgba(63, 180, 255, 0)');
  } else if (count >= 3) {
    gradient.addColorStop(0, `rgba(255, 224, 0, ${alpha * 0.84})`);
    gradient.addColorStop(0.34, `rgba(105, 228, 179, ${alpha * 0.32})`);
    gradient.addColorStop(0.68, `rgba(63, 180, 255, ${alpha * 0.18})`);
    gradient.addColorStop(1, 'rgba(63, 180, 255, 0)');
  } else {
    gradient.addColorStop(0, `rgba(108, 229, 183, ${alpha * 0.62})`);
    gradient.addColorStop(0.48, `rgba(63, 180, 255, ${alpha * 0.18})`);
    gradient.addColorStop(1, 'rgba(63, 180, 255, 0)');
  }

  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function drawSatelliteDots(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  point: WardMarkerRow,
  zoom: number,
) {
  if (zoom > 13) {
    return;
  }

  const seed = getOrganicSeed((point.lat || 0) * 31.3 + (point.lng || 0) * 17.9 + point.count * 0.91);
  const dotCount = zoom <= 10 ? 5 : 3;

  for (let index = 0; index < dotCount; index += 1) {
    const angle = seed * Math.PI * 2 + index * ((Math.PI * 2) / dotCount);
    const distance = radius * (0.92 + ((seed + index * 0.17) % 1) * 0.38);
    const dotRadius = radius * (zoom <= 10 ? 0.19 : 0.14) * (1 - index * 0.08);
    const dotGradient = context.createRadialGradient(
      x + Math.cos(angle) * distance,
      y + Math.sin(angle) * distance,
      0,
      x + Math.cos(angle) * distance,
      y + Math.sin(angle) * distance,
      dotRadius,
    );

    dotGradient.addColorStop(0, `rgba(118, 230, 195, ${alpha * 0.34})`);
    dotGradient.addColorStop(0.52, `rgba(74, 186, 255, ${alpha * 0.18})`);
    dotGradient.addColorStop(1, 'rgba(74, 186, 255, 0)');

    context.fillStyle = dotGradient;
    context.beginPath();
    context.arc(
      x + Math.cos(angle) * distance,
      y + Math.sin(angle) * distance,
      dotRadius,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
}

function drawHeatBlob(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number,
  count: number,
  point: WardMarkerRow,
  zoom: number,
) {
  const isOrganic = zoom <= 12 || point.resolution === 'low' || point.resolution === 'mid';
  const seed = getOrganicSeed((point.lat || 0) * 17.31 + (point.lng || 0) * 9.17 + count * 0.37);
  const elongation = isOrganic ? 1.08 + seed * 0.16 : 1;
  const squeeze = isOrganic ? 0.9 - seed * 0.08 : 1;
  const rotation = seed * Math.PI;

  drawSoftHalo(context, x, y, radius * (isOrganic ? 1.28 : 1.18), alpha * 0.72);

  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.scale(elongation, squeeze);
  drawHeatCore(context, 0, 0, radius, alpha, count);
  context.restore();

  drawSatelliteDots(context, x, y, radius, alpha, point, zoom);

  if (!isOrganic) {
    return;
  }

  const lobeDistance = radius * (0.18 + seed * 0.12);
  const lobeRadius = radius * 0.58;
  const lobeAlpha = alpha * 0.34;
  const angleA = rotation + 0.8;
  const angleB = rotation - 1.15;

  drawHeatCore(
    context,
    x + Math.cos(angleA) * lobeDistance,
    y + Math.sin(angleA) * lobeDistance,
    lobeRadius,
    lobeAlpha,
    count,
  );
  drawHeatCore(
    context,
    x + Math.cos(angleB) * lobeDistance * 0.9,
    y + Math.sin(angleB) * lobeDistance * 0.9,
    lobeRadius * 0.82,
    lobeAlpha * 0.82,
    count,
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createWardTooltipMarkup(ward: WardMarkerRow, complaintsLabel: string) {
  return `
    <div class="ward-heatmap-tooltip-card">
      <div class="ward-heatmap-tooltip-title">${escapeHtml(ward.ward)}</div>
      <div class="ward-heatmap-tooltip-count">${escapeHtml(complaintsLabel)}: ${ward.count}</div>
    </div>
  `;
}

function createWardPopupMarkup(ward: WardMarkerRow, complaintsLabel: string, zoneLabel: string, delhiLabel: string) {
  return `
    <div class="ward-heatmap-popup-card">
      <div class="ward-heatmap-popup-title">${escapeHtml(ward.ward)}</div>
      <div class="ward-heatmap-popup-row">
        <span>${escapeHtml(complaintsLabel)}</span>
        <strong>${ward.count}</strong>
      </div>
      <div class="ward-heatmap-popup-row">
        <span>${escapeHtml(zoneLabel)}</span>
        <strong>${escapeHtml(ward.zone_name || delhiLabel)}</strong>
      </div>
    </div>
  `;
}

function createClusterTooltipMarkup(cluster: Extract<WardCluster, { kind: 'cluster' }>, wardsLabel: string, complaintsLabel: string) {
  return `
    <div class="ward-heatmap-tooltip-card">
      <div class="ward-heatmap-tooltip-title">${cluster.wards.length} ${escapeHtml(wardsLabel)}</div>
      <div class="ward-heatmap-tooltip-count">${escapeHtml(complaintsLabel)}: ${cluster.count}</div>
    </div>
  `;
}

function createClusterPopupMarkup(
  cluster: Extract<WardCluster, { kind: 'cluster' }>,
  wardClusterLabel: string,
  wardsLabel: string,
  totalComplaintsLabel: string,
) {
  const items = [...cluster.wards]
    .sort((left, right) => right.count - left.count || left.ward.localeCompare(right.ward))
    .slice(0, 6)
    .map(
      (ward) => `
        <li class="ward-heatmap-popup-list-item">
          <span>${escapeHtml(ward.ward)}</span>
          <strong>${ward.count}</strong>
        </li>
      `,
    )
    .join('');

  return `
    <div class="ward-heatmap-popup-card">
      <div class="ward-heatmap-popup-title">${escapeHtml(wardClusterLabel)}</div>
      <div class="ward-heatmap-popup-row">
        <span>${escapeHtml(wardsLabel)}</span>
        <strong>${cluster.wards.length}</strong>
      </div>
      <div class="ward-heatmap-popup-row">
        <span>${escapeHtml(totalComplaintsLabel)}</span>
        <strong>${cluster.count}</strong>
      </div>
      <ul class="ward-heatmap-popup-list">${items}</ul>
    </div>
  `;
}

function createCountBadgeMarkup(ward: WardMarkerRow) {
  const palette = getMarkerPalette(ward.count);

  return `
    <div
      class="ward-heatmap-count-badge"
      style="--ward-count-accent:${palette.fillColor}; --ward-count-border:${palette.strokeColor}; --ward-count-soft:${hexToRgba(palette.fillColor, 0.14)};"
    >
      ${ward.count}
    </div>
  `;
}

function createSmartLabelMarkup(ward: WardMarkerRow) {
  return `
    <div class="ward-heatmap-label-card">
      <div class="ward-heatmap-label-title">${escapeHtml(ward.ward)}</div>
      <div class="ward-heatmap-label-count">${ward.count}</div>
    </div>
  `;
}

function getClusterThresholdPx(zoom: number) {
  if (zoom >= 14) {
    return 0;
  }

  if (zoom >= 13) {
    return 18;
  }

  if (zoom >= 12) {
    return 28;
  }

  return 42;
}

function roundCoordinate(value: number) {
  return Math.round(value * 10000) / 10000;
}

function buildWardClusters(
  leaflet: LeafletModule,
  map: LeafletMapInstance,
  wards: WardMarkerRow[],
): WardCluster[] {
  const rows = wards.filter((ward) => typeof ward.lat === 'number' && typeof ward.lng === 'number');
  const hasAggregatedCells = rows.some((ward) => ward.kind === 'cell' && ward.resolution !== 'detail');

  if (hasAggregatedCells) {
    return rows.map((ward) => ({
      kind: 'ward',
      key: `${ward.kind || 'ward'}:${ward.ward_id}:${ward.lat}:${ward.lng}`,
      ward,
    }));
  }

  const threshold = getClusterThresholdPx(map.getZoom());

  if (threshold <= 0) {
    return rows.map((ward) => ({
      kind: 'ward',
      key: `ward:${ward.ward_id}`,
      ward,
    }));
  }

  const projectedRows = rows.map((ward) => ({
    ward,
    point: map.project(leaflet.latLng(ward.lat as number, ward.lng as number), map.getZoom()),
  }));
  const used = new Set<number>();
  const clusters: WardCluster[] = [];

  for (let index = 0; index < projectedRows.length; index += 1) {
    if (used.has(index)) {
      continue;
    }

    const seed = projectedRows[index];
    const members = [seed.ward];
    used.add(index);

    for (let candidateIndex = index + 1; candidateIndex < projectedRows.length; candidateIndex += 1) {
      if (used.has(candidateIndex)) {
        continue;
      }

      const candidate = projectedRows[candidateIndex];

      if (seed.point.distanceTo(candidate.point) <= threshold) {
        members.push(candidate.ward);
        used.add(candidateIndex);
      }
    }

    if (members.length === 1) {
      clusters.push({
        kind: 'ward',
        key: `ward:${seed.ward.ward_id}`,
        ward: seed.ward,
      });
      continue;
    }

    const weighted = members.reduce(
      (result, ward) => {
        const weight = Math.max(1, ward.count);
        return {
          lat: result.lat + (ward.lat as number) * weight,
          lng: result.lng + (ward.lng as number) * weight,
          totalWeight: result.totalWeight + weight,
          totalCount: result.totalCount + ward.count,
        };
      },
      { lat: 0, lng: 0, totalWeight: 0, totalCount: 0 },
    );

    clusters.push({
      kind: 'cluster',
      key: `cluster:${members.map((ward) => ward.ward_id).sort((left, right) => left - right).join('-')}`,
      lat: weighted.lat / weighted.totalWeight,
      lng: weighted.lng / weighted.totalWeight,
      count: weighted.totalCount,
      wards: members,
    });
  }

  return clusters;
}

function selectVisibleLabels(
  leaflet: LeafletModule,
  map: LeafletMapInstance,
  clusters: WardCluster[],
) {
  if (map.getZoom() < LABEL_ZOOM_THRESHOLD) {
    return [] as WardMarkerRow[];
  }

  const candidates = clusters
    .filter((cluster): cluster is Extract<WardCluster, { kind: 'ward' }> => cluster.kind === 'ward')
    .map((cluster) => cluster.ward)
    .filter((ward) => ward.count > 0)
    .sort((left, right) => right.count - left.count || left.ward.localeCompare(right.ward));

  const selected: Array<{ ward: WardMarkerRow; point: { x: number; y: number; distanceTo: (value: { x: number; y: number }) => number } }> = [];

  for (const ward of candidates) {
    const point = map.project(leaflet.latLng(ward.lat as number, ward.lng as number), map.getZoom());
    const overlapsExisting = selected.some((item) => item.point.distanceTo(point) < 90);

    if (overlapsExisting) {
      continue;
    }

    selected.push({ ward, point });

    if (selected.length >= MAX_VISIBLE_LABELS) {
      break;
    }
  }

  return selected.map((item) => item.ward);
}

const WARD_HEATMAP_ENDPOINT = '/api/analytics/ward-heatmap';

function buildHeatmapRequestUrl(map: LeafletMapInstance) {
  const bounds = map.getBounds();
  const params = new URLSearchParams({
    zoom: String(map.getZoom()),
    north: bounds.getNorth().toFixed(6),
    south: bounds.getSouth().toFixed(6),
    east: bounds.getEast().toFixed(6),
    west: bounds.getWest().toFixed(6),
  });

  return `${WARD_HEATMAP_ENDPOINT}?${params.toString()}`;
}

export const LandingWardHeatmap = memo(function LandingWardHeatmap() {
  const { t } = useLandingLanguage();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapInstance | null>(null);
  const heatCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const markerLayerRef = useRef<LeafletLayerGroup | null>(null);
  const countLayerRef = useRef<LeafletLayerGroup | null>(null);
  const labelLayerRef = useRef<LeafletLayerGroup | null>(null);
  const wardsRef = useRef<WardMarkerRow[]>(FALLBACK_WARD_ROWS);
  const renderSignatureRef = useRef<string>('');
  const dataVersionRef = useRef(0);
  const leafletRef = useRef<LeafletModule | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const requestAbortRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);
  const renderFrameRef = useRef<number | null>(null);
  const autoRefreshIntervalRef = useRef<number | null>(null);
  const lastHeatmapDataVersionRef = useRef<string | null>(null);
  const lastHeatmapRequestUrlRef = useRef<string | null>(null);
  const hasLoadedHeatmapRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    
    async function refreshHeatmapData() {
      const map = mapRef.current;

      if (!map || cancelled) {
        return;
      }

      const requestUrl = buildHeatmapRequestUrl(map);
      requestAbortRef.current?.abort();
      const requestId = requestSequenceRef.current + 1;
      requestSequenceRef.current = requestId;
      const controller = new AbortController();
      requestAbortRef.current = controller;

      try {
        const payload = await fetchJson<WardHeatmapResponse>(
          requestUrl,
          {
            signal: controller.signal,
          },
        );

        if (cancelled || controller.signal.aborted || requestSequenceRef.current !== requestId) {
          return;
        }

        const isSameViewRequest = lastHeatmapRequestUrlRef.current === requestUrl;
        const isSameDataVersion = lastHeatmapDataVersionRef.current === payload.data_version;

        if (hasLoadedHeatmapRef.current && isSameViewRequest && isSameDataVersion) {
          return;
        }

        wardsRef.current = payload.points.length ? payload.points : FALLBACK_WARD_ROWS;
        hasLoadedHeatmapRef.current = true;
        lastHeatmapDataVersionRef.current = payload.data_version;
        lastHeatmapRequestUrlRef.current = requestUrl;
        dataVersionRef.current += 1;
        renderSignatureRef.current = '';
        scheduleRender();
      } catch (error) {
        if (controller.signal.aborted || cancelled) {
          return;
        }

        console.warn('Unable to refresh ward heatmap; preserving last successful map data.', error);

        if (!hasLoadedHeatmapRef.current) {
          wardsRef.current = FALLBACK_WARD_ROWS;
          dataVersionRef.current += 1;
          renderSignatureRef.current = '';
          scheduleRender();
        }
      }
    }

    function scheduleHeatmapRefresh() {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(() => {
        refreshTimerRef.current = null;
        void refreshHeatmapData();
      }, HEATMAP_FETCH_DEBOUNCE_MS);
    }

    function startAutoRefresh() {
      if (autoRefreshIntervalRef.current !== null) {
        window.clearInterval(autoRefreshIntervalRef.current);
      }

      autoRefreshIntervalRef.current = window.setInterval(() => {
        if (document.visibilityState !== 'visible') {
          return;
        }

        void refreshHeatmapData();
      }, HEATMAP_AUTO_REFRESH_MS);
    }

    function scheduleRender(invalidateSignature = false) {
      if (invalidateSignature) {
        renderSignatureRef.current = '';
      }

      if (renderFrameRef.current !== null) {
        return;
      }

      renderFrameRef.current = window.requestAnimationFrame(() => {
        renderFrameRef.current = null;
        renderWardMarkers();
      });
    }

    function clearRenderedLayers() {
      markerLayerRef.current?.clearLayers();
      markerLayerRef.current?.remove();
      countLayerRef.current?.clearLayers();
      countLayerRef.current?.remove();
      labelLayerRef.current?.clearLayers();
      labelLayerRef.current?.remove();
    }

    function ensureHeatCanvas(leaflet: LeafletModule, map: LeafletMapInstance) {
      if (heatCanvasRef.current) {
        return heatCanvasRef.current;
      }

      const canvas = leaflet.DomUtil.create('canvas', 'ward-heatmap-canvas') as HTMLCanvasElement;
      canvas.style.position = 'absolute';
      canvas.style.inset = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '250';
      map.getPanes().overlayPane.appendChild(canvas);
      heatCanvasRef.current = canvas;
      return canvas;
    }

    function drawHeatOverlay(leaflet: LeafletModule, map: LeafletMapInstance, clusters: WardCluster[]) {
      const canvas = ensureHeatCanvas(leaflet, map);
      const context = canvas.getContext('2d');

      if (!context) {
        return;
      }

      const size = map.getSize();
      const topLeft = map.containerPointToLayerPoint([0, 0]);
      leaflet.DomUtil.setPosition(canvas, topLeft);

      if (canvas.width !== size.x || canvas.height !== size.y) {
        canvas.width = size.x;
        canvas.height = size.y;
        canvas.style.width = `${size.x}px`;
        canvas.style.height = `${size.y}px`;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.globalCompositeOperation = 'lighter';

      const rows = clusters.flatMap((cluster) =>
        cluster.kind === 'cluster'
          ? [
              {
                ward_id: cluster.wards[0]?.ward_id || 0,
                ward: cluster.wards[0]?.ward || '',
                lat: cluster.lat,
                lng: cluster.lng,
                count: cluster.count,
                point_count: cluster.wards.length,
                normalized_intensity: Math.min(
                  1,
                  Math.max(...cluster.wards.map((ward) => ward.normalized_intensity ?? 0.2)),
                ),
                resolution: cluster.wards[0]?.resolution || 'high',
                kind: 'cell' as const,
              },
            ]
          : [cluster.ward],
      );

      rows.forEach((row) => {
        const point = map.latLngToContainerPoint([row.lat, row.lng]);
        drawHeatBlob(
          context,
          point.x,
          point.y,
          getHeatPixelRadius(row, map.getZoom()),
          getHeatAlpha(row, map.getZoom()),
          row.count,
          row,
          map.getZoom(),
        );
      });

      context.globalCompositeOperation = 'source-over';
    }

    function renderWardMarkers() {
      const leaflet = leafletRef.current;
      const map = mapRef.current;

      if (!leaflet || !map || cancelled) {
        return;
      }

      const bounds = map.getBounds();
      const renderSignature = [
        dataVersionRef.current,
        map.getZoom(),
        roundCoordinate(bounds.getSouth()),
        roundCoordinate(bounds.getWest()),
        roundCoordinate(bounds.getNorth()),
        roundCoordinate(bounds.getEast()),
      ].join(':');

      if (renderSignatureRef.current === renderSignature) {
        return;
      }

      renderSignatureRef.current = renderSignature;
      clearRenderedLayers();

      const clusters = buildWardClusters(leaflet, map, wardsRef.current);
      const markerLayer = leaflet.layerGroup();
      const countLayer = leaflet.layerGroup();
      const labelLayer = leaflet.layerGroup();
      const showSummaryMarkers = map.getZoom() >= 8;
      const showDetailedMarkers = map.getZoom() >= 11;
      drawHeatOverlay(leaflet, map, clusters);

      clusters.forEach((cluster) => {
        if (cluster.kind === 'cluster') {
          if (!showSummaryMarkers) {
            return;
          }

          const clusterPalette = getMarkerPalette(cluster.count);

          const clusterMarker = leaflet.marker([cluster.lat, cluster.lng], {
            icon: leaflet.divIcon({
              className: 'ward-heatmap-cluster-shell',
              html: `
                <div
                  class="ward-heatmap-cluster-bubble"
                  style="--cluster-border:${clusterPalette.strokeColor}; --cluster-soft:${hexToRgba(clusterPalette.fillColor, 0.28)};"
                >
                  ${cluster.count}
                </div>
              `,
              iconSize: [40, 40],
            }),
          });

          clusterMarker.bindTooltip(createClusterTooltipMarkup(cluster, t.map.wards, t.map.complaints), {
            direction: 'top',
            offset: [0, -16],
            opacity: 1,
            className: 'ward-heatmap-tooltip',
          });

          clusterMarker.bindPopup(createClusterPopupMarkup(cluster, t.map.wardCluster, t.map.wards, t.map.totalComplaints), {
            className: 'ward-heatmap-popup',
            closeButton: false,
            autoPanPadding: [24, 24],
          });

          clusterMarker.on('mouseover', () => {
            clusterMarker.openTooltip();
          });

          clusterMarker.on('mouseout', () => {
            clusterMarker.closeTooltip();
          });

          clusterMarker.on('click', () => {
            if (map.getZoom() >= LABEL_ZOOM_THRESHOLD) {
              clusterMarker.openPopup();
              return;
            }

            const latLngBounds = leaflet.latLngBounds(
              cluster.wards.map((ward) => [ward.lat as number, ward.lng as number]),
            );
            map.fitBounds(latLngBounds.pad(0.25), {
              padding: [36, 36],
              maxZoom: Math.min(15, map.getZoom() + 2),
            });
          });

          clusterMarker.addTo(markerLayer);
          return;
        }

        const ward = cluster.ward;

        if (ward.kind === 'cell' && !showDetailedMarkers) {
          return;
        }

        const count = Number(ward.count) || 0;
        const palette = getMarkerPalette(count);
        let popupPinnedByClick = false;

        const marker = leaflet.circleMarker([ward.lat as number, ward.lng as number], {
          radius: getMarkerRadius(count),
          color: palette.strokeColor,
          weight: 2,
          fillColor: palette.fillColor,
          fillOpacity: palette.fillOpacity,
        });

        marker.bindTooltip(createWardTooltipMarkup(ward, t.map.complaints), {
          direction: 'top',
          offset: [0, -14],
          opacity: 1,
          className: 'ward-heatmap-tooltip',
        });

        marker.bindPopup(createWardPopupMarkup(ward, t.map.complaints, t.map.zone, t.map.delhi), {
          className: 'ward-heatmap-popup',
          closeButton: false,
          autoPanPadding: [24, 24],
        });

        marker.on('mouseover', () => {
          marker.openTooltip();
        });

        marker.on('mouseout', () => {
          marker.closeTooltip();

          if (!popupPinnedByClick) {
            marker.closePopup();
          }
        });

        marker.on('click', () => {
          popupPinnedByClick = true;
          marker.openPopup();
        });

        marker.on('popupclose', () => {
          popupPinnedByClick = false;
        });

        marker.addTo(markerLayer);

        if (map.getZoom() >= COUNT_BADGE_ZOOM_THRESHOLD) {
          const countMarker = leaflet.marker([ward.lat as number, ward.lng as number], {
            interactive: false,
            keyboard: false,
            zIndexOffset: 900,
            icon: leaflet.divIcon({
              className: 'ward-heatmap-count-shell',
              html: createCountBadgeMarkup(ward),
              iconSize: [34, 24],
              iconAnchor: [17, 34],
            }),
          });

          countMarker.addTo(countLayer);
        }
      });

      const visibleLabels = selectVisibleLabels(leaflet, map, clusters);

      visibleLabels.forEach((ward) => {
        const labelMarker = leaflet.marker([ward.lat as number, ward.lng as number], {
          interactive: false,
          keyboard: false,
          zIndexOffset: 1000,
          icon: leaflet.divIcon({
            className: 'ward-heatmap-label-shell',
            html: createSmartLabelMarkup(ward),
            iconSize: [96, 32],
            iconAnchor: [-12, 10],
          }),
        });

        labelMarker.addTo(labelLayer);
      });

      markerLayer.addTo(map);
      countLayer.addTo(map);
      labelLayer.addTo(map);
      markerLayerRef.current = markerLayer;
      countLayerRef.current = countLayer;
      labelLayerRef.current = labelLayer;
    }

    async function initializeMap() {
      if (!mapElementRef.current || mapRef.current) {
        return;
      }

      const leaflet = await import('leaflet');
      leafletRef.current = leaflet;

      if (cancelled || !mapElementRef.current) {
        return;
      }

      const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

      const map = leaflet.map(mapElementRef.current, {
        center: DELHI_CENTER,
        zoom: DEFAULT_ZOOM,
        preferCanvas: true,
        scrollWheelZoom: isCoarsePointer ? false : 'center',
        touchZoom: true,
        dragging: true,
        inertia: true,
        inertiaDeceleration: isCoarsePointer ? 2200 : 2600,
        inertiaMaxSpeed: isCoarsePointer ? 1400 : 2000,
        easeLinearity: 0.2,
        bounceAtZoomLimits: false,
        zoomSnap: 0.25,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 160,
        wheelDebounceTime: 80,
        tapTolerance: isCoarsePointer ? 22 : 14,
        zoomControl: true,
        attributionControl: true,
      });

      leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      }).addTo(map);

      mapRef.current = map;

      await refreshHeatmapData();
      startAutoRefresh();
      map.on('zoom', () => {
        scheduleRender(true);
      });
      map.on('zoomend', () => {
        scheduleRender(true);
        scheduleHeatmapRefresh();
      });
      map.on('moveend', () => {
        scheduleRender(true);
        scheduleHeatmapRefresh();
      });

      window.setTimeout(() => {
        map.invalidateSize();
        scheduleRender(true);
      }, 0);
    }

    void initializeMap();

    const handleWindowFocus = () => {
      void refreshHeatmapData();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshHeatmapData();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const resizeObserver = typeof ResizeObserver !== 'undefined' && mapElementRef.current
      ? new ResizeObserver(() => {
          mapRef.current?.invalidateSize();
          scheduleRender(true);
        })
      : null;

    if (resizeObserver && mapElementRef.current) {
      resizeObserver.observe(mapElementRef.current);
    }

    return () => {
      cancelled = true;
      requestAbortRef.current?.abort();
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (autoRefreshIntervalRef.current !== null) {
        window.clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
      if (renderFrameRef.current !== null) {
        window.cancelAnimationFrame(renderFrameRef.current);
        renderFrameRef.current = null;
      }
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      resizeObserver?.disconnect();
      mapRef.current?.off('zoom zoomend moveend');
      clearRenderedLayers();
      heatCanvasRef.current?.remove();

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      heatCanvasRef.current = null;
      markerLayerRef.current = null;
      countLayerRef.current = null;
      labelLayerRef.current = null;
      leafletRef.current = null;
    };
  }, [t]);

  return (
    <div className="relative overflow-hidden rounded-[1rem] border border-[#cfd8e3] bg-white">
      <div className="pointer-events-none absolute left-3 top-3 z-[600] max-w-[13rem] rounded-[0.85rem] border border-[#cfd8e3] bg-white/95 px-3 py-2.5 sm:left-6 sm:top-6 sm:max-w-[16rem] sm:px-4 sm:py-3">
        <div className="text-[11px] font-semibold tracking-[0.2em] text-[#0b3c5d] uppercase">{t.map.title}</div>
        <p className="mt-2 text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">
          {t.map.description}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] text-slate-600 sm:text-[11px]">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
            <span>0-2</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#facc15]" />
            <span>3-5</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
            <span>6-9</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
            <span>10+</span>
          </div>
        </div>
      </div>

      <div
        ref={mapElementRef}
        className="ward-heatmap-surface h-[24rem] w-full sm:h-[28rem] lg:h-[34rem]"
        aria-label={t.map.ariaLabel}
      />
    </div>
  );
});
