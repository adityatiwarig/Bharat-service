import type { Ward } from '@/lib/types';

export type AdminZoneOption = {
  value: string;
  label: string;
};

export function buildAdminZoneOptions(wards: Ward[]): AdminZoneOption[] {
  const zoneMap = new Map<string, string>();

  wards.forEach((ward) => {
    if (ward.zone_id == null) {
      return;
    }

    const key = String(ward.zone_id);
    const label = ward.zone_name?.trim() || `Zone ${ward.zone_id}`;

    if (!zoneMap.has(key)) {
      zoneMap.set(key, label);
    }
  });

  const dynamicZones = Array.from(zoneMap.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return [{ value: 'all', label: 'All zones' }, ...dynamicZones];
}

export function findAdminZoneLabel(zoneOptions: AdminZoneOption[], zoneValue: string) {
  return zoneOptions.find((zone) => zone.value === zoneValue)?.label || 'All zones';
}
