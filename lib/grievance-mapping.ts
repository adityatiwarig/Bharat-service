import type {
  ComplaintCategory,
  ComplaintDepartment,
  GrievanceCategoryOption,
  GrievanceDepartmentOption,
  GrievanceMappingResponse,
  Ward,
  Zone,
} from '@/lib/types';

const SOURCE_FILE = 'full_grievance_mapping_complete.csv.xlsx';

const ZONES: Zone[] = [
  { id: 1, name: 'Rohini' },
  { id: 2, name: 'Karol Bagh' },
];

const WARDS: Ward[] = [
  { id: 1, name: 'Rohini Sector 1', city: 'Delhi', zone_id: 1, zone_name: 'Rohini', lat: 28.7376, lng: 77.1177 },
  { id: 2, name: 'Rohini Sector 7', city: 'Delhi', zone_id: 1, zone_name: 'Rohini', lat: 28.7218, lng: 77.1236 },
  { id: 3, name: 'Rohini Sector 16', city: 'Delhi', zone_id: 1, zone_name: 'Rohini', lat: 28.7448, lng: 77.1308 },
  { id: 4, name: 'Dev Nagar', city: 'Delhi', zone_id: 2, zone_name: 'Karol Bagh', lat: 28.6519, lng: 77.1894 },
  { id: 5, name: 'Karol Bagh Ward', city: 'Delhi', zone_id: 2, zone_name: 'Karol Bagh', lat: 28.6506, lng: 77.1909 },
  { id: 6, name: 'Paharganj', city: 'Delhi', zone_id: 2, zone_name: 'Karol Bagh', lat: 28.6434, lng: 77.2163 },
];

const DEPARTMENTS: GrievanceDepartmentOption[] = [
  { id: 1, name: 'Advertisement' },
  { id: 2, name: 'Cleanliness (Swachhta)' },
  { id: 3, name: 'Electrical' },
  { id: 4, name: 'Engineering Works' },
  { id: 5, name: 'General Branch' },
  { id: 6, name: 'Horticulture' },
  { id: 7, name: 'IT Department' },
  { id: 8, name: 'Parking Cell' },
  { id: 9, name: 'Public Health' },
  { id: 10, name: 'Toll Tax' },
  { id: 11, name: 'Veterinary' },
];

const CATEGORIES: GrievanceCategoryOption[] = [
  { id: 1, department_id: 1, name: 'Dangerous Hoarding' },
  { id: 2, department_id: 1, name: 'Dangerous Unipole' },
  { id: 3, department_id: 1, name: 'Illegal Banner' },
  { id: 4, department_id: 1, name: 'Illegal Hoarding' },
  { id: 5, department_id: 1, name: 'Illegal Unipole' },
  { id: 6, department_id: 2, name: 'Burning of Garbage in Open Space' },
  { id: 7, department_id: 2, name: 'Dead Animals' },
  { id: 8, department_id: 2, name: 'Debris Removal / Construction Material' },
  { id: 9, department_id: 2, name: 'Dustbins Not Cleaned' },
  { id: 10, department_id: 2, name: 'Garbage Dumps' },
  { id: 11, department_id: 2, name: 'Garbage Vehicle Not Arrived' },
  { id: 12, department_id: 2, name: 'Improper Disposal of Fecal Waste / Septage' },
  { id: 13, department_id: 2, name: 'No Electricity in Public Toilets' },
  { id: 14, department_id: 2, name: 'No Water Supply in Public Toilets' },
  { id: 15, department_id: 2, name: 'Non-Sanitary Condition' },
  { id: 16, department_id: 2, name: 'Open Manholes or Drains' },
  { id: 17, department_id: 2, name: 'Public Toilet Blockage' },
  { id: 18, department_id: 2, name: 'Public Toilet(s) Cleaning' },
  { id: 19, department_id: 2, name: 'Sewerage / Storm Water Overflow' },
  { id: 20, department_id: 2, name: 'Stagnant Water on Road' },
  { id: 21, department_id: 2, name: 'Sweeping Not Done' },
  { id: 22, department_id: 2, name: 'Toilet Door Locked' },
  { id: 23, department_id: 2, name: 'Urination in Public / Open Defecation' },
  { id: 24, department_id: 3, name: 'High Mast / Street Lights Not Working' },
  { id: 25, department_id: 3, name: 'Repair Electrical Points' },
  { id: 26, department_id: 3, name: 'Request for New Fans' },
  { id: 27, department_id: 3, name: 'Request for New High Mast / Street Lights' },
  { id: 28, department_id: 3, name: 'Request for New Tube Light' },
  { id: 29, department_id: 4, name: 'Covering of Drain' },
  { id: 30, department_id: 4, name: 'Encroachment on Roads / Footpath / Municipal Land' },
  { id: 31, department_id: 4, name: 'Manhole Cover Level Issue' },
  { id: 32, department_id: 4, name: 'Removal of Malba / Debris' },
  { id: 33, department_id: 4, name: 'Removal of Silt from Road' },
  { id: 34, department_id: 4, name: 'Repair of Open Storm Water Drain' },
  { id: 35, department_id: 4, name: 'Repair of Speed Breaker' },
  { id: 36, department_id: 4, name: 'Replacement of Damaged / Missing Manhole Cover' },
  { id: 37, department_id: 4, name: 'Road / Footpath Resurfacing' },
  { id: 38, department_id: 5, name: 'Any Other Illegality' },
  { id: 39, department_id: 5, name: 'Encroachment on Road by Vehicle' },
  { id: 40, department_id: 5, name: 'End-of-Life Vehicles' },
  { id: 41, department_id: 5, name: 'Illegal Rehdi-Patri / Tehbazari' },
  { id: 42, department_id: 5, name: 'Unauthorized Roadside Parking' },
  { id: 43, department_id: 6, name: 'Cutting of Grass' },
  { id: 44, department_id: 6, name: 'Maintenance of Park' },
  { id: 45, department_id: 6, name: 'Park Booking' },
  { id: 46, department_id: 6, name: 'Park Not Cleaned' },
  { id: 47, department_id: 6, name: 'Removal of Dead / Fallen Tree' },
  { id: 48, department_id: 6, name: 'Repair of Tubewell in Park' },
  { id: 49, department_id: 6, name: 'Trimming / Pruning of Trees' },
  { id: 50, department_id: 6, name: 'Watering of Plants' },
  { id: 51, department_id: 7, name: 'Aadhaar Enrollment Centre Issues' },
  { id: 52, department_id: 7, name: 'Birth & Death Certificate Issues' },
  { id: 53, department_id: 7, name: 'Community Hall Booking & Tehbazari' },
  { id: 54, department_id: 7, name: 'Community Service Department' },
  { id: 55, department_id: 7, name: 'Conversion Parking / Cell Tower' },
  { id: 56, department_id: 7, name: 'Factory License' },
  { id: 57, department_id: 7, name: 'General Trade License' },
  { id: 58, department_id: 7, name: 'Health Trade License' },
  { id: 59, department_id: 7, name: 'LMS (Education / Hawking / School Infra / Hospital Hardware)' },
  { id: 60, department_id: 7, name: 'Property Tax' },
  { id: 61, department_id: 7, name: 'Stationery & Contingency' },
  { id: 62, department_id: 7, name: 'Veterinary Trade License' },
  { id: 63, department_id: 8, name: 'Overcharging in Authorized Parking' },
  { id: 64, department_id: 8, name: 'Parking Area Not Maintained' },
  { id: 65, department_id: 8, name: 'Parking Staff Not in Uniform' },
  { id: 66, department_id: 8, name: 'Unauthorized / Illegal Parking' },
  { id: 67, department_id: 9, name: 'Encroachment by Eateries' },
  { id: 68, department_id: 9, name: 'Illegal Dumping of Medical Waste' },
  { id: 69, department_id: 9, name: 'Illegal Food Hawker' },
  { id: 70, department_id: 9, name: 'Illegal Gym' },
  { id: 71, department_id: 9, name: 'Illegal Slaughtering' },
  { id: 72, department_id: 9, name: 'Improper Transport of Meat / Livestock' },
  { id: 73, department_id: 9, name: 'Roadside Eateries' },
  { id: 74, department_id: 9, name: 'Unauthorized Restaurants' },
  { id: 75, department_id: 9, name: 'Unauthorized Sale of Meat' },
  { id: 76, department_id: 10, name: 'ECC Refund Issue' },
  { id: 77, department_id: 10, name: 'Overcharge Toll Fee' },
  { id: 78, department_id: 10, name: 'Tag Recharge Issue' },
  { id: 79, department_id: 10, name: 'Toll Staff Behavior Issue' },
  { id: 80, department_id: 10, name: 'Wrong Deduction from RFID Tag' },
  { id: 81, department_id: 11, name: 'Catching of Stray Dogs' },
  { id: 82, department_id: 11, name: 'Flies Menace' },
  { id: 83, department_id: 11, name: 'Illegal Dairy' },
  { id: 84, department_id: 11, name: 'Illegal Meat Shop' },
  { id: 85, department_id: 11, name: 'Illegal Slaughtering' },
  { id: 86, department_id: 11, name: 'Injured / Sick Animal' },
  { id: 87, department_id: 11, name: 'Removal of Dead Animal' },
  { id: 88, department_id: 11, name: 'Stray Cattle' },
  { id: 89, department_id: 11, name: 'Stray Monkeys' },
];

const WARDS_BY_ZONE = Object.fromEntries(
  ZONES.map((zone) => [String(zone.id), WARDS.filter((ward) => ward.zone_id === zone.id).map((ward) => ward.id)]),
);

const CATEGORIES_BY_DEPARTMENT = Object.fromEntries(
  DEPARTMENTS.map((department) => [
    String(department.id),
    CATEGORIES.filter((category) => category.department_id === department.id).map((category) => category.id),
  ]),
);

export function listZones() {
  return ZONES;
}

export function listMappedWards(zoneId?: number | null) {
  if (!zoneId) {
    return WARDS;
  }

  return WARDS.filter((ward) => ward.zone_id === zoneId);
}

export function listMappedDepartments() {
  return DEPARTMENTS;
}

export function listMappedCategories(departmentId?: number | null) {
  if (!departmentId) {
    return CATEGORIES;
  }

  return CATEGORIES.filter((category) => category.department_id === departmentId);
}

export function getGrievanceMappingResponse(input: { zoneId?: number | null; departmentId?: number | null } = {}): GrievanceMappingResponse {
  return {
    source_file: SOURCE_FILE,
    zones: listZones(),
    wards: listMappedWards(input.zoneId),
    departments: listMappedDepartments(),
    categories: listMappedCategories(input.departmentId),
    relationships: {
      wards_by_zone: WARDS_BY_ZONE,
      categories_by_department: CATEGORIES_BY_DEPARTMENT,
    },
  };
}

function includesAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}

export function inferLegacyComplaintDepartment(
  departmentName: string,
  categoryName: string,
): ComplaintDepartment {
  const combined = `${departmentName} ${categoryName}`.toLowerCase();

  if (includesAny(combined, ['street light', 'street lights', 'high mast', 'tube light'])) {
    return 'streetlight';
  }

  if (includesAny(combined, ['electrical'])) {
    return 'electricity';
  }

  if (includesAny(combined, ['water', 'tubewell'])) {
    return 'water';
  }

  if (includesAny(combined, ['drain', 'manhole', 'storm water', 'sewer'])) {
    return 'drainage';
  }

  if (includesAny(combined, ['garbage', 'dustbin', 'sweeping'])) {
    return 'garbage';
  }

  if (
    includesAny(combined, [
      'sanitary',
      'toilet',
      'fecal',
      'septage',
      'medical waste',
      'slaughter',
      'animal',
      'meat',
      'livestock',
      'public health',
      'veterinary',
      'flies',
      'stray',
    ])
  ) {
    return 'sanitation';
  }

  return 'roads';
}

export function inferLegacyComplaintCategory(categoryName: string): ComplaintCategory {
  const normalized = categoryName.toLowerCase();

  if (includesAny(normalized, ['street light', 'street lights', 'high mast', 'tube light'])) {
    return 'streetlight';
  }

  if (includesAny(normalized, ['water supply', 'tubewell', 'watering of plants'])) {
    return 'water';
  }

  if (normalized.includes('sewer')) {
    return 'sewer';
  }

  if (includesAny(normalized, ['drain', 'manhole', 'storm water', 'stagnant water'])) {
    return 'drainage';
  }

  if (includesAny(normalized, ['garbage', 'dustbin', 'sweeping', 'debris', 'malba'])) {
    return 'waste';
  }

  if (
    includesAny(normalized, [
      'sanitary',
      'toilet',
      'defecation',
      'fecal',
      'septage',
      'medical waste',
      'animal',
      'meat',
      'livestock',
      'slaughter',
      'flies',
      'stray',
      'dead animals',
    ])
  ) {
    return 'sanitation';
  }

  if (includesAny(normalized, ['encroachment', 'banner', 'hoarding', 'unipole', 'parking', 'rehdi', 'tehbazari', 'cell tower'])) {
    return 'encroachment';
  }

  if (includesAny(normalized, ['road', 'footpath', 'speed breaker', 'resurfacing'])) {
    return 'pothole';
  }

  return 'other';
}

export function buildComplaintSiteAddress(input: {
  zoneName: string;
  wardName: string;
  streetAddress?: string | null;
}) {
  const parts = [input.wardName, input.zoneName, input.streetAddress?.trim() || ''].filter(Boolean);
  return parts.join(', ');
}

export function resolveGrievanceSelection(input: {
  zone_id: number;
  ward_id: number;
  department_id: number;
  category_id: number;
}) {
  const zone = ZONES.find((item) => item.id === input.zone_id) || null;
  const ward = WARDS.find((item) => item.id === input.ward_id) || null;
  const department = DEPARTMENTS.find((item) => item.id === input.department_id) || null;
  const category = CATEGORIES.find((item) => item.id === input.category_id) || null;

  if (!zone || !ward || !department || !category) {
    return null;
  }

  if (ward.zone_id !== zone.id || category.department_id !== department.id) {
    return null;
  }

  return {
    zone,
    ward,
    department,
    category,
    legacy_department: inferLegacyComplaintDepartment(department.name, category.name),
    legacy_category: inferLegacyComplaintCategory(category.name),
  };
}
