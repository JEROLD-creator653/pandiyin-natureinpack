/**
 * Weight-based delivery charge calculation
 * 
 * Zones:
 * - Tamil Nadu: Rs.40/kg, FREE above Rs.799
 * - Nearby (Kerala, Karnataka, AP, Telangana): Rs.70/kg
 * - Rest of India: Rs.150/kg
 */

export interface DeliveryZone {
  key: string;
  name: string;
  states: string[];
  perKgRate: number;
  freeAbove: number | null;
}

// All 28 states + 8 UTs
export const ALL_INDIAN_STATES = [
  // Zone 1: Tamil Nadu
  'Tamil Nadu',
  // Zone 2: Nearby
  'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana',
  // Zone 3: Rest of India — States
  'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  // Union Territories
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export const STATE_ZONES: Record<string, string> = {};
// Tamil Nadu zone
STATE_ZONES['Tamil Nadu'] = 'local';
// Nearby zone
['Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana'].forEach(s => STATE_ZONES[s] = 'nearby');
// Everything else is rest_of_india
ALL_INDIAN_STATES.forEach(s => { if (!STATE_ZONES[s]) STATE_ZONES[s] = 'rest_of_india'; });

export interface ShippingZoneConfig {
  local: { perKgRate: number; freeAbove: number | null };
  nearby: { perKgRate: number; freeAbove: number | null };
  rest_of_india: { perKgRate: number; freeAbove: number | null };
}

const DEFAULT_CONFIG: ShippingZoneConfig = {
  local: { perKgRate: 40, freeAbove: 799 },
  nearby: { perKgRate: 70, freeAbove: null },
  rest_of_india: { perKgRate: 150, freeAbove: null },
};

/**
 * Calculate charged weight: always round UP, but Math.ceil(1.0) = 1
 */
export function getChargedWeight(totalWeightKg: number): number {
  if (totalWeightKg <= 0) return 0;
  return Math.ceil(totalWeightKg);
}

/**
 * Calculate delivery charge based on state, weight, and order amount
 */
export function calculateDeliveryCharge(
  state: string | null,
  totalWeightKg: number,
  orderAmount: number,
  config: ShippingZoneConfig = DEFAULT_CONFIG,
): number | null {
  if (!state) return null;
  
  const zone = STATE_ZONES[state];
  if (!zone) return null;

  const chargedWeight = getChargedWeight(totalWeightKg);
  if (chargedWeight === 0) return 0;

  const zoneConfig = config[zone as keyof ShippingZoneConfig];
  if (!zoneConfig) return null;

  // Check free delivery threshold
  if (zoneConfig.freeAbove !== null && orderAmount >= zoneConfig.freeAbove) {
    return 0;
  }

  return chargedWeight * zoneConfig.perKgRate;
}

/**
 * Get zone display info for grouped state dropdown
 */
export const ZONE_GROUPS = [
  {
    label: 'Tamil Nadu',
    zone: 'local',
    states: ['Tamil Nadu'],
  },
  {
    label: 'Nearby States',
    zone: 'nearby', 
    states: ['Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana'],
  },
  {
    label: 'Rest of India',
    zone: 'rest_of_india',
    states: ALL_INDIAN_STATES.filter(s => STATE_ZONES[s] === 'rest_of_india'),
  },
];
